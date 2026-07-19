import { createHmac, randomBytes } from "node:crypto";
import {
  PRIVATE_REVIEW_DISCLAIMER,
  type UsStockComputationInput,
  UsStockComputationInputSchema,
  type UsStockComputationResult,
  UsStockComputationResultSchema,
  type UsStockMatchedLot,
  type UsStockOpenLot
} from "@lazytax/core";

export const US_STOCK_RULE_SOURCES = [
  "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-2-online",
  "https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/Step%20by%20Step%20Guide%20FA%20FSI.pdf",
  "https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/rule-115-2",
  "https://wmstatic-prd.incometaxindia.gov.in/documents/20117/42998/Rule-128_2026-01-13_11-37-01_1c629b_en.pdf/145a3343-3b83-7223-7064-8fd9194f161c?download=true&t=1775731788761&version=6.0",
  "https://www.incometaxindia.gov.in/documents/20117/11892059/Section%2B-%2B2_en.pdf/2387617a-a0a4-6d38-9f33-85a0b9e4d18c?download=true&t=1766001046772&version=1.0",
  "https://www.incometaxindia.gov.in/w/section-48-64",
  "https://www.incometaxindia.gov.in/w/section-112-66"
] as const;

const US_STOCK_PRIVATE_SESSION_KEY = randomBytes(32);

function privateToken(prefix: string, value: string): string {
  return `${prefix}_${createHmac("sha256", US_STOCK_PRIVATE_SESSION_KEY)
    .update(value)
    .digest("hex")
    .slice(0, 16)}`;
}

interface MutableLot {
  readonly ticker: string;
  readonly buyTradeId: string;
  readonly sourceRef: string;
  readonly acquiredOn: string;
  remainingQuantity: number;
  remainingCostInr: number;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHmac("sha256", US_STOCK_PRIVATE_SESSION_KEY)
    .update(canonicalize(value))
    .digest("hex");
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysBetween(first: string, second: string): number {
  return Math.floor((parseDate(second).valueOf() - parseDate(first).valueOf()) / 86_400_000);
}

function addUtcMonths(value: string, months: number): Date {
  const date = parseDate(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date;
}

function previousMonthEnd(value: string): string {
  const date = parseDate(value);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
  return end.toISOString().slice(0, 10);
}

function rupee(value: number): number {
  return Math.round(value);
}

function assertInputIntegrity(input: UsStockComputationInput): void {
  const tradeIds = new Set<string>();
  const tradeSourceRefs = new Set<string>();
  for (const trade of input.trades) {
    if (tradeIds.has(trade.trade_id)) {
      throw new Error(`Duplicate US-stock trade ID ${privateToken("trade", trade.trade_id)}.`);
    }
    if (tradeSourceRefs.has(trade.source_ref)) {
      throw new Error(
        `Duplicate US-stock trade source reference ${privateToken("src", trade.source_ref)}.`
      );
    }
    tradeIds.add(trade.trade_id);
    tradeSourceRefs.add(trade.source_ref);
    if (trade.side === "sell") {
      const expectedRateDate = previousMonthEnd(trade.trade_date);
      if (trade.fx_rate_date !== expectedRateDate) {
        throw new Error(
          `Trade ${privateToken("trade", trade.trade_id)} must use the prior-month-end SBI TT buying-rate date ${expectedRateDate}; received ${trade.fx_rate_date}.`
        );
      }
      if (trade.trade_date < "2025-04-01" || trade.trade_date > "2026-03-31") {
        throw new Error(`Sale ${privateToken("trade", trade.trade_id)} is outside FY2025-26.`);
      }
    } else if (trade.trade_date > "2026-03-31") {
      throw new Error(`Purchase ${privateToken("trade", trade.trade_id)} occurs after FY2025-26.`);
    }
  }

  const disclosureIds = new Set<string>();
  for (const disclosure of input.equity_disclosures) {
    if (disclosureIds.has(disclosure.disclosure_id)) {
      throw new Error(
        `Duplicate Schedule FA disclosure ID ${privateToken("disclosure", disclosure.disclosure_id)}.`
      );
    }
    disclosureIds.add(disclosure.disclosure_id);
    if (disclosure.acquired_on > input.schedule_fa_calendar_year_end) {
      throw new Error(
        `Schedule FA row ${privateToken("disclosure", disclosure.disclosure_id)} was acquired after ${input.schedule_fa_calendar_year_end}.`
      );
    }
    if (
      disclosure.peak_value_inr < disclosure.initial_value_inr ||
      disclosure.peak_value_inr < disclosure.closing_value_inr
    ) {
      throw new Error(
        `Schedule FA row ${privateToken("disclosure", disclosure.disclosure_id)} has an invalid peak value.`
      );
    }
  }
  if (input.custodian_disclosure !== undefined) {
    const disclosure = input.custodian_disclosure;
    if (disclosure.opened_on > input.schedule_fa_calendar_year_end) {
      throw new Error("The foreign custodian account opened after the Schedule FA calendar-year end.");
    }
    if (disclosure.peak_balance_inr < disclosure.closing_balance_inr) {
      throw new Error("The foreign custodian peak balance is below its closing balance.");
    }
  }
}

export function computeUsStockInvestments(
  inputValue: UsStockComputationInput
): UsStockComputationResult {
  const input = UsStockComputationInputSchema.parse(inputValue);
  assertInputIntegrity(input);
  const lotsByTicker = new Map<string, MutableLot[]>();
  const matchedLots: UsStockMatchedLot[] = [];
  const sortedTrades = [...input.trades].sort((left, right) => {
    const dateOrder = left.trade_date.localeCompare(right.trade_date);
    if (dateOrder !== 0) return dateOrder;
    const sideOrder = left.side === right.side ? 0 : left.side === "buy" ? -1 : 1;
    return sideOrder !== 0 ? sideOrder : left.trade_id.localeCompare(right.trade_id);
  });

  for (const trade of sortedTrades) {
    const tickerLots = lotsByTicker.get(trade.ticker) ?? [];
    if (!lotsByTicker.has(trade.ticker)) lotsByTicker.set(trade.ticker, tickerLots);
    if (trade.side === "buy") {
      tickerLots.push({
        ticker: trade.ticker,
        buyTradeId: privateToken("trade", trade.trade_id),
        sourceRef: privateToken("src", trade.source_ref),
        acquiredOn: trade.trade_date,
        remainingQuantity: trade.quantity,
        remainingCostInr: trade.documented_acquisition_cost_inr
      });
      continue;
    }

    const grossInr = trade.quantity * trade.price_usd * trade.sbi_tt_buying_rate_inr_per_usd;
    const feesInr = trade.fees_usd * trade.sbi_tt_buying_rate_inr_per_usd;

    const availableQuantity = tickerLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    if (availableQuantity + 1e-9 < trade.quantity) {
      throw new Error(
        `Sale ${privateToken("trade", trade.trade_id)} has quantity ${trade.quantity} but FIFO inventory contains only ${availableQuantity} ${trade.ticker} share(s). Include prior acquisition lots.`
      );
    }
    let quantityToMatch = trade.quantity;
    for (const lot of tickerLots) {
      if (quantityToMatch <= 1e-9) break;
      if (lot.remainingQuantity <= 1e-9) continue;
      const quantity = Math.min(quantityToMatch, lot.remainingQuantity);
      const buyFraction = quantity / lot.remainingQuantity;
      const acquisitionCost = lot.remainingCostInr * buyFraction;
      const saleFraction = quantity / trade.quantity;
      const saleValue = grossInr * saleFraction;
      const transferExpenses = feesInr * saleFraction;
      const twentyFourMonthAnniversary = addUtcMonths(lot.acquiredOn, 24);
      const classification =
        parseDate(trade.trade_date).valueOf() > twentyFourMonthAnniversary.valueOf()
          ? "long_term_section_112"
          : "short_term_normal_rate";
      matchedLots.push({
        ticker: trade.ticker,
        buy_trade_id: lot.buyTradeId,
        sell_trade_id: privateToken("trade", trade.trade_id),
        buy_source_ref: lot.sourceRef,
        sell_source_ref: privateToken("src", trade.source_ref),
        acquired_on: lot.acquiredOn,
        sold_on: trade.trade_date,
        quantity,
        holding_period_days: daysBetween(lot.acquiredOn, trade.trade_date),
        classification,
        acquisition_cost_inr: rupee(acquisitionCost),
        sale_value_inr: rupee(saleValue),
        transfer_expenses_inr: rupee(transferExpenses),
        gain_loss_inr: rupee(saleValue - transferExpenses - acquisitionCost)
      });
      lot.remainingQuantity -= quantity;
      lot.remainingCostInr -= acquisitionCost;
      quantityToMatch -= quantity;
    }
  }

  const openLots: UsStockOpenLot[] = [...lotsByTicker.values()]
    .flatMap((lots) => lots)
    .filter((lot) => lot.remainingQuantity > 1e-9)
    .map((lot) => ({
      ticker: lot.ticker,
      buy_trade_id: lot.buyTradeId,
      source_ref: lot.sourceRef,
      acquired_on: lot.acquiredOn,
      remaining_quantity: lot.remainingQuantity,
      remaining_cost_inr: rupee(lot.remainingCostInr)
    }));

  const shortTerm = matchedLots.filter((lot) => lot.classification === "short_term_normal_rate");
  const longTerm = matchedLots.filter((lot) => lot.classification === "long_term_section_112");
  const sumPositive = (lots: readonly UsStockMatchedLot[]): number =>
    lots.reduce((sum, lot) => sum + Math.max(0, lot.gain_loss_inr), 0);
  const sumLoss = (lots: readonly UsStockMatchedLot[]): number =>
    lots.reduce((sum, lot) => sum + Math.max(0, -lot.gain_loss_inr), 0);
  const shortTermGains = sumPositive(shortTerm);
  const shortTermLosses = sumLoss(shortTerm);
  const longTermGains = sumPositive(longTerm);
  const longTermLosses = sumLoss(longTerm);
  const netShortTerm = shortTermGains - shortTermLosses;
  const netLongTerm = longTermGains - longTermLosses;
  const lossesRequiringReview = shortTermLosses + longTermLosses;
  const readyForTax = lossesRequiringReview === 0;
  const sourceSetHash = hash(input);
  const taxBridgeEntries = readyForTax
    ? [
        ...(netShortTerm > 0
          ? [
              {
                id: `us-${sourceSetHash.slice(0, 16)}-stcg`,
                label: "US stock short-term capital gain",
                category: "foreign_stock_stcg" as const,
                amount_inr: netShortTerm,
                locator: `US-STOCKS-${sourceSetHash.slice(0, 16)}`
              }
            ]
          : []),
        ...(netLongTerm > 0
          ? [
              {
                id: `us-${sourceSetHash.slice(0, 16)}-ltcg`,
                label: "US stock long-term capital gain",
                category: "foreign_stock_ltcg" as const,
                amount_inr: netLongTerm,
                locator: `US-STOCKS-${sourceSetHash.slice(0, 16)}`
              }
            ]
          : [])
      ]
    : [];

  return UsStockComputationResultSchema.parse({
    schema_version: "lazytax.us-stocks.v1",
    data_mode: "local_private",
    assessment_year: "2026-27",
    financial_year: "FY2025-26",
    schedule_fa_calendar_year_end: "2025-12-31",
    country_code: "002",
    currency: "USD",
    lot_method: "FIFO",
    conversion_policy: "documented_inr_cost_and_rule115_sale",
    matched_lots: matchedLots,
    open_lots: openLots,
    totals: {
      short_term_gains_inr: shortTermGains,
      short_term_losses_inr: shortTermLosses,
      long_term_gains_inr: longTermGains,
      long_term_losses_inr: longTermLosses,
      net_short_term_inr: netShortTerm,
      net_long_term_inr: netLongTerm,
      gross_sale_value_inr: matchedLots.reduce((sum, lot) => sum + lot.sale_value_inr, 0),
      transfer_expenses_inr: matchedLots.reduce(
        (sum, lot) => sum + lot.transfer_expenses_inr,
        0
      ),
      acquisition_cost_inr: matchedLots.reduce(
        (sum, lot) => sum + lot.acquisition_cost_inr,
        0
      )
    },
    ready_for_supported_tax_calculation: readyForTax,
    tax_bridge_entries: taxBridgeEntries,
    schedule_cg: {
      short_term_gain_taxed_at_normal_rates_inr: readyForTax ? netShortTerm : 0,
      long_term_section_112_gain_inr: readyForTax ? netLongTerm : 0,
      long_term_rate_percent: 12.5,
      losses_requiring_setoff_review_inr: lossesRequiringReview
    },
    schedule_fsi: {
      head_of_income: "Capital Gains",
      foreign_income_inr: netShortTerm + netLongTerm,
      foreign_tax_paid_inr: 0,
      relief_available_inr: 0,
      treaty_article_review_required: true
    },
    schedule_fa: {
      calendar_year_end: "2025-12-31",
      ...(input.custodian_disclosure === undefined
        ? {}
        : {
            custodian: {
              ...input.custodian_disclosure,
              account_ref: privateToken("account", input.custodian_disclosure.account_ref),
              institution_ref: privateToken(
                "institution",
                input.custodian_disclosure.institution_ref
              ),
              source_ref: privateToken("src", input.custodian_disclosure.source_ref)
            }
          }),
      foreign_equities: input.equity_disclosures.map((disclosure) => ({
        ...disclosure,
        disclosure_id: privateToken("disclosure", disclosure.disclosure_id),
        source_ref: privateToken("src", disclosure.source_ref)
      })),
      requires_raw_identifiers_at_filing: true
    },
    source_set_hash: sourceSetHash,
    warnings: [
      "US-listed shares are treated as foreign investments, not as Indian STT-paid section 111A/112A equity.",
      "Acquisition cost is the caller-supplied documented INR outflow; LazyTax does not manufacture a historical purchase rate or certify that cost basis.",
      "Sale-value SBI TT buying rates are caller-supplied evidence; LazyTax validates the Rule 115 prior-month-end date but does not fetch or certify the rate.",
      "Schedule FA uses the calendar year ending 31 December 2025, while capital gains use FY2025-26.",
      "Raw foreign account, TIN/passport, institution-address and ownership fields remain required in the official ITR but are intentionally absent from this masked artifact.",
      ...(lossesRequiringReview > 0
        ? [
            "Capital losses require cross-source set-off and carry-forward review; no tax bridge entries were emitted."
          ]
        : [])
    ],
    unsupported_items: [
      "RSUs, ESPPs, stock options and other employee equity",
      "short sales, derivatives, margin and securities lending",
      "splits, mergers, spin-offs, return of capital and other corporate actions",
      "specific-identification or average-cost lot methods",
      "foreign tax paid on capital gains",
      "capital-loss set-off or carry-forward across other assets",
      "currencies other than USD and countries other than the United States"
    ],
    official_rule_urls: [...US_STOCK_RULE_SOURCES],
    disclaimer: PRIVATE_REVIEW_DISCLAIMER
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import type { TaxpayerProfile, UsStockComputationInput } from "@lazytax/core";
import { compareTaxRegimes, computeUsStockInvestments } from "../src/index.js";

const baseInput: UsStockComputationInput = {
  data_mode: "local_private",
  assessment_year: "2026-27",
  financial_year: "FY2025-26",
  schedule_fa_calendar_year_end: "2025-12-31",
  country_code: "002",
  currency: "USD",
  is_resident_and_ordinarily_resident: true,
  asset_classification: "investment",
  lot_method: "FIFO",
  conversion_policy: "documented_inr_cost_and_rule115_sale",
  trades: [
    {
      trade_id: "buy-old",
      ticker: "AAPL",
      trade_date: "2023-01-10",
      side: "buy",
      quantity: 10,
      price_usd: 100,
      fees_usd: 1,
      documented_acquisition_cost_inr: 80_080,
      source_ref: "SRC-BUY-OLD"
    },
    {
      trade_id: "sell-long",
      ticker: "AAPL",
      trade_date: "2025-04-11",
      side: "sell",
      quantity: 6,
      price_usd: 150,
      fees_usd: 2,
      sbi_tt_buying_rate_inr_per_usd: 85,
      fx_rate_date: "2025-03-31",
      source_ref: "SRC-SELL-LONG"
    },
    {
      trade_id: "buy-new",
      ticker: "AAPL",
      trade_date: "2025-05-10",
      side: "buy",
      quantity: 5,
      price_usd: 120,
      fees_usd: 1,
      documented_acquisition_cost_inr: 50_484,
      source_ref: "SRC-BUY-NEW"
    },
    {
      trade_id: "sell-mixed",
      ticker: "AAPL",
      trade_date: "2025-06-20",
      side: "sell",
      quantity: 7,
      price_usd: 140,
      fees_usd: 2,
      sbi_tt_buying_rate_inr_per_usd: 85,
      fx_rate_date: "2025-05-31",
      source_ref: "SRC-SELL-MIXED"
    }
  ],
  equity_disclosures: [
    {
      disclosure_id: "fa-aapl-2025",
      ticker: "AAPL",
      entity_name: "Apple Inc.",
      acquired_on: "2023-01-10",
      initial_value_inr: 80_080,
      peak_value_inr: 150_000,
      closing_value_inr: 20_194,
      gross_credits_inr: 500,
      gross_sale_proceeds_inr: 159_800,
      source_ref: "SRC-FA-AAPL"
    }
  ],
  custodian_disclosure: {
    account_ref: "ACCOUNT-MASKED",
    institution_ref: "BROKER-MASKED",
    opened_on: "2023-01-01",
    peak_balance_inr: 200_000,
    closing_balance_inr: 25_000,
    gross_credits_inr: 160_300,
    source_ref: "SRC-FA-CUSTODIAN"
  },
  has_corporate_actions: false,
  has_employee_equity: false,
  has_derivatives: false,
  has_short_sales: false,
  foreign_tax_on_capital_gains_inr: 0
};

test("US-stock engine performs FIFO matching and produces tax/disclosure bridge facts", () => {
  const result = computeUsStockInvestments(baseInput);
  assert.equal(result.matched_lots.length, 3);
  assert.deepEqual(
    result.matched_lots.map((lot) => [lot.classification, lot.quantity, lot.gain_loss_inr]),
    [
      ["long_term_section_112", 6, 28_282],
      ["long_term_section_112", 4, 15_471],
      ["short_term_normal_rate", 3, 5_337]
    ]
  );
  assert.deepEqual(result.totals, {
    short_term_gains_inr: 5_337,
    short_term_losses_inr: 0,
    long_term_gains_inr: 43_753,
    long_term_losses_inr: 0,
    net_short_term_inr: 5_337,
    net_long_term_inr: 43_753,
    gross_sale_value_inr: 159_800,
    transfer_expenses_inr: 340,
    acquisition_cost_inr: 110_370
  });
  assert.equal(result.open_lots.length, 1);
  assert.equal(result.open_lots[0]?.remaining_quantity, 2);
  assert.equal(result.open_lots[0]?.remaining_cost_inr, 20_194);
  assert.equal(result.ready_for_supported_tax_calculation, true);
  assert.deepEqual(
    result.tax_bridge_entries.map((entry) => [entry.category, entry.amount_inr]),
    [
      ["foreign_stock_stcg", 5_337],
      ["foreign_stock_ltcg", 43_753]
    ]
  );
  assert.equal(result.schedule_cg.long_term_rate_percent, 12.5);
  assert.equal(result.schedule_fa.foreign_equities.length, 1);
  assert.match(result.source_set_hash, /^[a-f0-9]{64}$/);
});

test("US-stock bridge amounts flow into the full private regime calculation", () => {
  const result = computeUsStockInvestments(baseInput);
  const profile: TaxpayerProfile = {
    assessment_year: "2026-27",
    residency: "resident",
    entity_type: "individual",
    age: 24,
    has_business_or_professional_income: false,
    has_foreign_income_or_assets: true,
    is_resident_and_ordinarily_resident: true,
    has_foreign_capital_gains: true,
    has_other_foreign_income: false,
    has_foreign_assets_beyond_dividend_source: true,
    has_unsupported_foreign_assets: false,
    has_house_property_income: false,
    has_crypto_or_other_special_rate_income: false,
    claims_deductions_beyond_standard_deduction: false
  };
  const comparison = compareTaxRegimes(
    profile,
    {
      salary_inr: 1_800_000,
      interest_inr: 0,
      dividend_inr: 0,
      listed_equity_stcg_inr: 0,
      listed_equity_ltcg_inr: 0,
      employer_tds_inr: 0,
      foreign_stock_stcg_inr: result.schedule_cg.short_term_gain_taxed_at_normal_rates_inr,
      foreign_stock_ltcg_inr: result.schedule_cg.long_term_section_112_gain_inr
    },
    "local_private"
  );
  assert.equal(comparison.new_regime.foreign_stock_stcg_inr, 5_337);
  assert.equal(comparison.new_regime.foreign_stock_ltcg_inr, 43_753);
  assert.ok(comparison.new_regime.foreign_stock_stcg_tax_inr > 0);
  assert.equal(comparison.new_regime.foreign_stock_ltcg_tax_inr, 5_469);
  assert.equal(comparison.new_regime.ror_confirmation_required, false);

  const { has_unsupported_foreign_assets: _confirmation, ...unconfirmedProfile } = profile;
  assert.throws(
    () =>
      compareTaxRegimes(
        unconfirmedProfile,
        {
          salary_inr: 1_800_000,
          interest_inr: 0,
          dividend_inr: 0,
          listed_equity_stcg_inr: 0,
          listed_equity_ltcg_inr: 0,
          foreign_stock_stcg_inr: 5_337,
          foreign_stock_ltcg_inr: 43_753
        },
        "local_private"
      ),
    /Explicitly confirm that no unsupported foreign assets/
  );
});

test("US-stock engine treats exactly 24 months as short term and more than 24 months as long term", () => {
  const boundaryInput = structuredClone(baseInput);
  boundaryInput.trades = [
    {
      trade_id: "buy-exact-boundary",
      ticker: "MSFT",
      trade_date: "2023-04-11",
      side: "buy",
      quantity: 1,
      price_usd: 100,
      fees_usd: 0,
      documented_acquisition_cost_inr: 8_000,
      source_ref: "SRC-BOUNDARY-BUY"
    },
    {
      trade_id: "sell-exact-boundary",
      ticker: "MSFT",
      trade_date: "2025-04-11",
      side: "sell",
      quantity: 1,
      price_usd: 150,
      fees_usd: 0,
      sbi_tt_buying_rate_inr_per_usd: 85,
      fx_rate_date: "2025-03-31",
      source_ref: "SRC-BOUNDARY-SELL"
    },
    {
      trade_id: "buy-over-boundary",
      ticker: "GOOG",
      trade_date: "2023-04-10",
      side: "buy",
      quantity: 1,
      price_usd: 100,
      fees_usd: 0,
      documented_acquisition_cost_inr: 8_000,
      source_ref: "SRC-OVER-BUY"
    },
    {
      trade_id: "sell-over-boundary",
      ticker: "GOOG",
      trade_date: "2025-04-11",
      side: "sell",
      quantity: 1,
      price_usd: 150,
      fees_usd: 0,
      sbi_tt_buying_rate_inr_per_usd: 85,
      fx_rate_date: "2025-03-31",
      source_ref: "SRC-OVER-SELL"
    }
  ];
  const result = computeUsStockInvestments(boundaryInput);
  assert.deepEqual(
    result.matched_lots
      .map((lot) => [lot.ticker, lot.classification])
      .sort(([left], [right]) => left!.localeCompare(right!)),
    [
      ["GOOG", "long_term_section_112"],
      ["MSFT", "short_term_normal_rate"]
    ]
  );
});

test("US-stock engine can prepare Schedule FA without inventing a capital gain", () => {
  const disclosureOnlyInput = structuredClone(baseInput);
  disclosureOnlyInput.trades = [];
  const result = computeUsStockInvestments(disclosureOnlyInput);
  assert.equal(result.matched_lots.length, 0);
  assert.equal(result.tax_bridge_entries.length, 0);
  assert.equal(result.schedule_fsi.foreign_income_inr, 0);
  assert.equal(result.schedule_fa.foreign_equities.length, 1);
  assert.equal(result.ready_for_supported_tax_calculation, true);
});

test("US-stock engine fails closed on bad FX dates, missing lots, unsupported features and losses", () => {
  const badRate = structuredClone(baseInput);
  badRate.trades[1]!.fx_rate_date = "2025-04-01";
  assert.throws(() => computeUsStockInvestments(badRate), /prior-month-end SBI TT/);

  const missingLot = structuredClone(baseInput);
  missingLot.trades = missingLot.trades.filter((trade) => trade.side === "sell");
  assert.throws(() => computeUsStockInvestments(missingLot), /FIFO inventory/);

  assert.throws(
    () => computeUsStockInvestments({ ...baseInput, has_corporate_actions: true } as never),
    /Invalid literal value/
  );

  const lossCase = structuredClone(baseInput);
  lossCase.trades = [
    {
      ...lossCase.trades[0]!,
      quantity: 1,
      price_usd: 200
    },
    {
      ...lossCase.trades[1]!,
      quantity: 1,
      price_usd: 100
    }
  ];
  const lossResult = computeUsStockInvestments(lossCase);
  assert.equal(lossResult.ready_for_supported_tax_calculation, false);
  assert.equal(lossResult.tax_bridge_entries.length, 0);
  assert.ok(lossResult.schedule_cg.losses_requiring_setoff_review_inr > 0);
});

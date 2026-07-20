import assert from "node:assert/strict";
import test from "node:test";
import type { FixtureDocumentInput, TaxpayerProfile } from "@lazytax/core";
import {
  computeUsStockInvestments,
  normalizeFixtureData,
  prepareFilingGuide,
  reconcileEvidence,
  taxInputsFromReconciliation
} from "../src/index.js";

const profile: TaxpayerProfile = {
  assessment_year: "2026-27",
  residency: "resident",
  entity_type: "individual",
  age: 34,
  has_business_or_professional_income: false,
  has_foreign_income_or_assets: false,
  has_house_property_income: false,
  has_crypto_or_other_special_rate_income: false,
  claims_deductions_beyond_standard_deduction: false
};

const metadata = {
  tax_year: "FY2025-26",
  assessment_year: "AY2026-27",
  taxpayer_ref: "SYNTH-FILING-GUIDE",
  currency: "INR"
} as const;

function reconcile(documents: FixtureDocumentInput[]) {
  return reconcileEvidence(normalizeFixtureData(documents));
}

test("filing guide selects ITR-1 and maps Form 16/AIS amounts to portal schedules", () => {
  const result = reconcile([
    {
      id: "form16",
      kind: "form16",
      display_name: "Synthetic Form 16",
      synthetic: true,
      ...metadata,
      entries: [
        { id: "salary", label: "Gross salary", category: "salary", amount_inr: 1_800_000, locator: "Part B line 1" },
        { id: "tds", label: "Salary TDS", category: "employer_tds", amount_inr: 180_000, locator: "Part A" }
      ]
    },
    {
      id: "ais",
      kind: "ais",
      display_name: "Synthetic AIS",
      synthetic: true,
      ...metadata,
      entries: [
        { id: "salary", label: "Salary", category: "salary", amount_inr: 1_800_000, locator: "Salary row" },
        { id: "interest", label: "Savings interest", category: "interest", amount_inr: 18_500, locator: "Interest row" }
      ]
    }
  ]);
  const guide = prepareFilingGuide({ profile, reconciliation: result });
  assert.equal(guide.itr_form, "ITR-1");
  assert.equal(guide.status, "ready_for_guided_entry");
  assert.equal(
    guide.field_instructions.find((field) => field.instruction_id === "field_salary_gross")?.amount_inr,
    1_800_000
  );
  assert.equal(
    guide.field_instructions.find((field) => field.instruction_id === "field_other_sources_interest")?.amount_inr,
    18_500
  );
  assert.equal(
    guide.field_instructions.find((field) => field.instruction_id === "field_tax_paid_salary_tds")?.amount_inr,
    180_000
  );
  assert.ok(guide.field_instructions.every((field) => field.source_references.length > 0));
});

test("short-term listed-equity gain selects ITR-2 and preserves the broker-detail review boundary", () => {
  const result = reconcile([
    {
      id: "form16",
      kind: "form16",
      display_name: "Synthetic Form 16",
      synthetic: true,
      ...metadata,
      entries: [{ id: "salary", label: "Gross salary", category: "salary", amount_inr: 1_800_000, locator: "Part B" }]
    },
    {
      id: "broker",
      kind: "broker_report",
      display_name: "Synthetic broker tax P&L",
      synthetic: true,
      ...metadata,
      entries: [{ id: "stcg", label: "Section 111A STCG", category: "listed_equity_stcg", amount_inr: 45_000, locator: "Tax P&L STCG" }]
    }
  ]);
  const guide = prepareFilingGuide({ profile, reconciliation: result });
  assert.equal(guide.itr_form, "ITR-2");
  assert.equal(guide.status, "review_required");
  const stcg = guide.field_instructions.find((field) => field.instruction_id === "field_cg_domestic_111a_stcg");
  assert.equal(stcg?.amount_inr, 45_000);
  assert.equal(stcg?.entry_mode, "review");
  assert.match(stcg?.review_note ?? "", /transaction\/date buckets/);
});

test("US-stock computation adds FIFO Schedule CG and calendar-year Schedule FA values", () => {
  const usStockResult = computeUsStockInvestments({
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
        trade_id: "buy-aapl",
        ticker: "AAPL",
        trade_date: "2023-01-10",
        side: "buy",
        quantity: 1,
        price_usd: 100,
        fees_usd: 0,
        documented_acquisition_cost_inr: 8_000,
        source_ref: "BROKER-BUY"
      },
      {
        trade_id: "sell-aapl",
        ticker: "AAPL",
        trade_date: "2025-04-11",
        side: "sell",
        quantity: 1,
        price_usd: 150,
        fees_usd: 0,
        sbi_tt_buying_rate_inr_per_usd: 85,
        fx_rate_date: "2025-03-31",
        source_ref: "BROKER-SELL"
      }
    ],
    equity_disclosures: [
      {
        disclosure_id: "aapl-fa",
        ticker: "AAPL",
        entity_name: "Apple Inc.",
        acquired_on: "2023-01-10",
        initial_value_inr: 8_000,
        peak_value_inr: 12_750,
        closing_value_inr: 0,
        gross_credits_inr: 0,
        gross_sale_proceeds_inr: 12_750,
        source_ref: "BROKER-FA"
      }
    ],
    has_corporate_actions: false,
    has_employee_equity: false,
    has_derivatives: false,
    has_short_sales: false,
    foreign_tax_on_capital_gains_inr: 0
  });
  const privateDataset = normalizeFixtureData([
    {
      data_mode: "local_private",
      id: "private-case",
      kind: "broker_report",
      display_name: "Private source facts",
      synthetic: false,
      tax_year: "FY2025-26",
      assessment_year: "AY2026-27",
      taxpayer_ref: "PRIVATE-TAXPAYER",
      currency: "INR",
      entries: [
        { id: "salary", label: "Salary", category: "salary", amount_inr: 1_800_000, locator: "Form 16" },
        { id: "us-ltcg", label: "US stock LTCG", category: "foreign_stock_ltcg", amount_inr: 4_750, locator: usStockResult.source_set_hash }
      ]
    }
  ]);
  const foreignProfile: TaxpayerProfile = {
    ...profile,
    has_foreign_income_or_assets: true,
    is_resident_and_ordinarily_resident: true,
    has_foreign_capital_gains: true,
    has_other_foreign_income: false,
    has_foreign_assets_beyond_dividend_source: true,
    has_unsupported_foreign_assets: false
  };
  const privateReconciliation = reconcileEvidence(privateDataset);
  assert.equal(taxInputsFromReconciliation(privateReconciliation).foreign_stock_ltcg_inr, 4_750);
  assert.equal(usStockResult.totals.net_long_term_inr, 4_750);
  const guide = prepareFilingGuide({
    profile: foreignProfile,
    reconciliation: privateReconciliation,
    usStockResult
  });
  assert.equal(guide.itr_form, "ITR-2");
  assert.equal(
    guide.field_instructions.find((field) => field.instruction_id === "field_cg_us_ltcg_sale")?.amount_inr,
    12_750
  );
  assert.equal(
    guide.field_instructions.find((field) => field.instruction_id === "field_fa_equity_1_peak")?.amount_inr,
    12_750
  );
  assert.match(
    guide.field_instructions.find((field) => field.instruction_id === "field_fa_equity_1_peak")?.why ?? "",
    /31 December 2025/
  );
});

test("filing guide refuses unresolved evidence and a mismatched US-stock bridge", () => {
  const first = {
    id: "form16",
    kind: "form16" as const,
    display_name: "Synthetic Form 16",
    synthetic: true as const,
    ...metadata,
    entries: [{ id: "salary", label: "Salary", category: "salary" as const, amount_inr: 1_800_000, locator: "line" }]
  };
  const second = {
    ...first,
    id: "ais",
    kind: "ais" as const,
    display_name: "Synthetic AIS",
    entries: [{ ...first.entries[0]!, amount_inr: 1_840_000 }]
  };
  assert.throws(
    () => prepareFilingGuide({ profile, reconciliation: reconcile([first, second]) }),
    /Resolve every material evidence conflict/
  );
});

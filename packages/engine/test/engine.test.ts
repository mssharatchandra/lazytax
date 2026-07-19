import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FixtureDocumentInputSchema,
  type FixtureDocumentInput,
  type TaxpayerProfile
} from "@lazytax/core";
import {
  UnsupportedTaxProfileError,
  compareTaxRegimes,
  generateTaxProofPack,
  normalizeFixtureData,
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

const fixtureMetadata = {
  tax_year: "FY2025-26",
  assessment_year: "AY2026-27",
  taxpayer_ref: "SYNTH-TAXPAYER-001",
  currency: "INR"
} as const;

const documents: FixtureDocumentInput[] = [
  {
    id: "f16",
    kind: "form16",
    display_name: "Synthetic Form 16",
    synthetic: true,
    ...fixtureMetadata,
    entries: [
      { id: "salary", label: "Gross salary", category: "salary", amount_inr: 1_800_000, locator: "box 1" }
    ]
  },
  {
    id: "ais",
    kind: "ais",
    display_name: "Synthetic AIS",
    synthetic: true,
    ...fixtureMetadata,
    entries: [
      { id: "salary", label: "Salary", category: "salary", amount_inr: 1_800_000, locator: "row 1" },
      { id: "interest", label: "Savings interest", category: "interest", amount_inr: 18_500, locator: "row 2" }
    ]
  },
  {
    id: "broker",
    kind: "broker_report",
    display_name: "Synthetic broker report",
    synthetic: true,
    ...fixtureMetadata,
    entries: [
      { id: "stcg", label: "Section 111A STCG", category: "listed_equity_stcg", amount_inr: 45_000, locator: "row 7" }
    ]
  }
];

test("golden path reconciles sources and calculates both regimes", () => {
  const dataset = normalizeFixtureData(documents);
  const reconciliation = reconcileEvidence(dataset);
  assert.equal(reconciliation.ready_for_calculation, true);
  assert.equal(reconciliation.items.find((item) => item.category === "salary")?.status, "matched");

  const inputs = taxInputsFromReconciliation(reconciliation);
  const comparison = compareTaxRegimes(profile, inputs);
  assert.deepEqual(inputs, {
    salary_inr: 1_800_000,
    interest_inr: 18_500,
    dividend_inr: 0,
    listed_equity_stcg_inr: 45_000,
    listed_equity_ltcg_inr: 0
  });
  assert.equal(comparison.old_regime.total_tax_inr, 366_132);
  assert.equal(comparison.new_regime.total_tax_inr, 164_008);
  assert.equal(comparison.lower_estimated_regime, "new");
  assert.equal(comparison.estimated_difference_inr, 202_124);

  const proof = generateTaxProofPack({
    profile,
    dataset,
    reconciliation,
    calculation: comparison,
    generatedAt: "2026-07-19T12:00:00.000Z"
  });
  assert.equal(proof.integrity.canonical_payload_hash.length, 64);
  assert.match(proof.integrity.dataset_hash, /^[a-f0-9]{64}$/);
  assert.match(proof.integrity.reconciliation_hash, /^[a-f0-9]{64}$/);
  assert.match(proof.integrity.calculation_hash, /^[a-f0-9]{64}$/);
  assert.equal(proof.synthetic, true);
});

test("conflicts block calculation until the user confirms", () => {
  const dataset = normalizeFixtureData([
    documents[0]!,
    {
      id: "ais",
      kind: "ais",
      display_name: "Synthetic AIS",
      synthetic: true,
      ...fixtureMetadata,
      entries: [
        { id: "salary", label: "Salary including bonus", category: "salary", amount_inr: 1_840_000, locator: "row 1" }
      ]
    }
  ]);
  const unresolved = reconcileEvidence(dataset);
  assert.equal(unresolved.ready_for_calculation, false);
  assert.throws(() => taxInputsFromReconciliation(unresolved), /Confirm each conflict/);
  const resolved = reconcileEvidence(dataset, { salary: 1_840_000 });
  assert.equal(taxInputsFromReconciliation(resolved).salary_inr, 1_840_000);
});

test("surcharge-range profiles are explicitly rejected", () => {
  assert.throws(
    () =>
      compareTaxRegimes(profile, {
        salary_inr: 5_100_000,
        interest_inr: 0,
        dividend_inr: 0,
        listed_equity_stcg_inr: 0,
        listed_equity_ltcg_inr: 0
      }),
    UnsupportedTaxProfileError
  );
});

test("bundled fixture v1 golden scenario produces the documented estimate", async () => {
  const fixtureNames = ["form16.synthetic.json", "ais.synthetic.json", "broker-pnl.synthetic.json"];
  const fixtureDocuments = await Promise.all(
    fixtureNames.map(async (name) => {
      const contents = await readFile(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8");
      return FixtureDocumentInputSchema.parse(JSON.parse(contents) as unknown);
    })
  );
  const dataset = normalizeFixtureData(fixtureDocuments);
  assert.ok(dataset.warnings.some((warning) => warning.includes("does not compute balance payable or refund")));
  const unresolved = reconcileEvidence(dataset);
  assert.deepEqual(unresolved.unresolved_categories, ["salary"]);

  const resolved = reconcileEvidence(dataset, { salary: 1_840_000 });
  const inputs = taxInputsFromReconciliation(resolved);
  assert.deepEqual(inputs, {
    salary_inr: 1_840_000,
    interest_inr: 18_500,
    dividend_inr: 0,
    listed_equity_stcg_inr: 45_000,
    listed_equity_ltcg_inr: 0
  });
  const comparison = compareTaxRegimes(profile, inputs);
  assert.equal(comparison.new_regime.normal_rate_income_inr, 1_783_500);
  assert.equal(comparison.new_regime.slab_tax_inr, 156_700);
  assert.equal(comparison.new_regime.stcg_tax_inr, 9_000);
  assert.equal(comparison.new_regime.tax_before_cess_inr, 165_700);
  assert.equal(comparison.new_regime.health_education_cess_inr, 6_628);
  assert.equal(comparison.new_regime.total_tax_inr, 172_328);
});

test("identical repeated documents are processed once", () => {
  const dataset = normalizeFixtureData([documents[0]!, documents[0]!]);
  assert.equal(dataset.evidence.length, 1);
  assert.deepEqual(dataset.warnings, [
    "Deduplicated repeated document f16; its evidence was processed once."
  ]);
  assert.equal(reconcileEvidence(dataset).items[0]?.selected_amount_inr, 1_800_000);
});

test("document ID collisions and duplicate evidence identifiers are rejected", () => {
  const collision = {
    ...documents[0]!,
    display_name: "Different content under the same ID"
  };
  assert.throws(
    () => normalizeFixtureData([documents[0]!, collision]),
    /Document ID collision/
  );

  const form16Fixture = {
    schema_version: "lazytax.fixture.v1" as const,
    synthetic: true as const,
    notice: "FICTIONAL DEMO DATA",
    document_id: "FORM16-A",
    document_type: "form16_like" as const,
    tax_year: "FY2025-26" as const,
    assessment_year: "AY2026-27" as const,
    taxpayer_ref: "SYNTH-TAXPAYER-001",
    taxpayer_display_name: "Demo Taxpayer (fictional)",
    issuer: "Demo Employer",
    currency: "INR" as const,
    records: [
      {
        source_id: "DUPLICATE-SOURCE",
        line_id: "LINE-1",
        category: "salary" as const,
        subtype: "gross_salary",
        description: "Synthetic salary",
        amount_inr: 1_800_000,
        match_key: "salary:demo"
      }
    ]
  };
  assert.throws(
    () =>
      normalizeFixtureData([
        form16Fixture,
        { ...form16Fixture, document_id: "FORM16-B" }
      ]),
    /Duplicate source ID/
  );
});

test("mixed taxpayer and period inputs are rejected", () => {
  assert.throws(
    () =>
      normalizeFixtureData([
        documents[0]!,
        { ...documents[1]!, taxpayer_ref: "DEID-TAXPAYER-002" }
      ]),
    /same synthetic taxpayer_ref/
  );

  const wrongPeriod = {
    ...documents[0]!,
    tax_year: "FY2024-25"
  } as unknown as FixtureDocumentInput;
  assert.throws(() => normalizeFixtureData([wrongPeriod]), /Invalid literal value/);
});

test("synthetic mode rejects common direct identifiers", () => {
  const piiCases = [
    ["ABCDE1234F", "PAN"],
    ["1234 5678 9012", "Aadhaar"],
    ["taxpayer@example.com", "email address"],
    ["+91 9876543210", "Indian mobile number"],
    ["HDFC0123456", "IFSC code"],
    ["account: 1234567890123", "bank account number"]
  ] as const;
  for (const [value, expectedType] of piiCases) {
    assert.throws(
      () =>
        normalizeFixtureData([
          { ...documents[0]!, display_name: `Synthetic Form 16 ${value}` }
        ]),
      new RegExp(`possible ${expectedType}`)
    );
  }
});

test("reconciliation rejects duplicate evidence in a directly supplied dataset", () => {
  const dataset = normalizeFixtureData(documents);
  const duplicateDataset = structuredClone(dataset);
  duplicateDataset.evidence.push(structuredClone(duplicateDataset.evidence[0]!));
  assert.throws(
    () => reconcileEvidence(duplicateDataset),
    /duplicate evidence ID/
  );
});

test("proof generation rejects calculations or reconciliations not bound to the dataset", () => {
  const dataset = normalizeFixtureData(documents);
  const reconciliation = reconcileEvidence(dataset);
  const calculation = compareTaxRegimes(profile, taxInputsFromReconciliation(reconciliation));

  const unrelatedCalculation = compareTaxRegimes(profile, {
    salary_inr: 2_500_000,
    interest_inr: 0,
    dividend_inr: 0,
    listed_equity_stcg_inr: 0,
    listed_equity_ltcg_inr: 0
  });
  assert.throws(
    () =>
      generateTaxProofPack({
        profile,
        dataset,
        reconciliation,
        calculation: unrelatedCalculation
      }),
    /Calculation integrity check failed/
  );

  const tamperedReconciliation = structuredClone(reconciliation);
  const salaryItem = tamperedReconciliation.items.find((item) => item.category === "salary");
  if (!salaryItem) throw new Error("Test setup failed: salary item missing");
  salaryItem.selected_amount_inr = 1_900_000;
  assert.throws(
    () =>
      generateTaxProofPack({
        profile,
        dataset,
        reconciliation: tamperedReconciliation,
        calculation
      }),
    /Reconciliation integrity check failed/
  );
});

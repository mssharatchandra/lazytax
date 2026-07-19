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
    /same taxpayer reference/
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

test("local_private mode masks identifiers, stays local-only, and retains proof lineage", () => {
  const privateDocuments: FixtureDocumentInput[] = [
    {
      data_mode: "local_private",
      id: "form16-ABCDE1234F",
      kind: "form16",
      display_name: "Form 16 for Sharat taxpayer@example.com",
      synthetic: false,
      tax_year: "FY2025-26",
      assessment_year: "AY2026-27",
      taxpayer_ref: "ABCDE1234F",
      currency: "INR",
      entries: [
        {
          id: "salary-ABCDE1234F",
          label: "Salary for Sharat",
          category: "salary",
          amount_inr: 1_800_000,
          locator: "PAN ABCDE1234F",
          notes: "Phone +91 9876543210"
        }
      ]
    },
    {
      data_mode: "local_private",
      id: "broker-account-1234567890123",
      kind: "broker_report",
      display_name: "Private broker account 1234567890123",
      synthetic: false,
      tax_year: "FY2025-26",
      assessment_year: "AY2026-27",
      taxpayer_ref: "ABCDE1234F",
      currency: "INR",
      entries: [
        {
          id: "trade-taxpayer@example.com",
          label: "Listed equity STCG",
          category: "listed_equity_stcg",
          amount_inr: 45_000,
          locator: "Account 1234567890123"
        }
      ]
    }
  ];
  const dataset = normalizeFixtureData(privateDocuments);
  assert.equal(dataset.data_mode, "local_private");
  assert.equal(dataset.synthetic, false);
  assert.match(dataset.taxpayer_ref, /^PRIVATE-[a-f0-9]{16}$/);
  assert.match(dataset.source_set_hash, /^[a-f0-9]{64}$/);
  if (dataset.data_mode !== "local_private") throw new Error("Expected local_private dataset");
  assert.deepEqual(dataset.privacy_guarantees, {
    processing: "local_only",
    persistence: "none",
    network: "none",
    identifiers: "masked"
  });
  for (const item of dataset.evidence) {
    assert.match(item.document_id, /^doc_[a-f0-9]{16}$/);
    assert.match(item.evidence_id, /^ev_[a-f0-9]{16}$/);
    assert.match(item.entry_id, /^line_[a-f0-9]{16}$/);
    assert.match(item.locator, /^line_[a-f0-9]{16}$/);
    assert.match(item.document_name, /^Private .* evidence$/);
    assert.match(item.label, /^Private .* evidence$/);
    assert.equal(item.notes, undefined);
  }

  const reconciliation = reconcileEvidence(dataset);
  const calculation = compareTaxRegimes(
    profile,
    taxInputsFromReconciliation(reconciliation),
    "local_private"
  );
  const proof = generateTaxProofPack({
    profile,
    dataset,
    reconciliation,
    calculation,
    generatedAt: "2026-07-19T12:00:00.000Z"
  });
  assert.equal(proof.data_mode, "local_private");
  assert.equal(proof.synthetic, false);
  assert.equal(proof.integrity.source_set_hash, dataset.source_set_hash);
  assert.match(proof.integrity.dataset_hash, /^[a-f0-9]{64}$/);

  const serializedOutputs = JSON.stringify({ dataset, reconciliation, calculation, proof });
  for (const privateValue of [
    "ABCDE1234F",
    "Sharat",
    "taxpayer@example.com",
    "9876543210",
    "1234567890123"
  ]) {
    assert.equal(serializedOutputs.includes(privateValue), false, `Leaked private value: ${privateValue}`);
  }
});

test("local_private mode deduplicates safely and rejects mixed identity, period, or mode", () => {
  const privateDocument: FixtureDocumentInput = {
    data_mode: "local_private",
    id: "private-document-ABCDE1234F",
    kind: "form16",
    display_name: "Private Form 16",
    synthetic: false,
    tax_year: "FY2025-26",
    assessment_year: "AY2026-27",
    taxpayer_ref: "ABCDE1234F",
    currency: "INR",
    entries: [
      {
        id: "salary-line",
        label: "Gross salary",
        category: "salary",
        amount_inr: 1_800_000,
        locator: "line 1"
      }
    ]
  };
  const deduplicated = normalizeFixtureData([privateDocument, structuredClone(privateDocument)]);
  assert.equal(deduplicated.evidence.length, 1);
  assert.match(deduplicated.warnings[0] ?? "", /^Deduplicated repeated document doc_[a-f0-9]{16}/);
  assert.equal((deduplicated.warnings[0] ?? "").includes("ABCDE1234F"), false);

  assert.throws(
    () =>
      normalizeFixtureData([
        privateDocument,
        { ...privateDocument, id: "private-document-two", taxpayer_ref: "FGHIJ5678K" }
      ]),
    /same taxpayer reference/
  );

  const wrongPeriod = {
    ...privateDocument,
    tax_year: "FY2024-25"
  } as unknown as FixtureDocumentInput;
  assert.throws(() => normalizeFixtureData([wrongPeriod]), /Invalid literal value/);
  assert.throws(
    () => normalizeFixtureData([privateDocument, documents[0]!]),
    /cannot be mixed/
  );
});

test("local_private foreign-dividend profile computes conservative FTC, TDS, balance/refund, and proof lineage", () => {
  const privateProfile: TaxpayerProfile = {
    ...profile,
    has_foreign_income_or_assets: true,
    is_resident_and_ordinarily_resident: true,
    has_foreign_capital_gains: false,
    has_other_foreign_income: false,
    has_foreign_assets_beyond_dividend_source: false
  };
  const privateDocument: FixtureDocumentInput = {
    data_mode: "local_private",
    id: "private-tax-records",
    kind: "other",
    display_name: "Private tax records",
    synthetic: false,
    tax_year: "FY2025-26",
    assessment_year: "AY2026-27",
    taxpayer_ref: "PRIVATE-RAW-TAXPAYER",
    currency: "INR",
    entries: [
      { id: "salary", label: "Salary", category: "salary", amount_inr: 1_800_000, locator: "1" },
      { id: "domestic-dividend", label: "Domestic dividend", category: "dividend", amount_inr: 20_000, locator: "2" },
      { id: "foreign-dividend", label: "Foreign dividend", category: "foreign_dividend", amount_inr: 100_000, locator: "3" },
      { id: "stcg", label: "Domestic 111A gain", category: "listed_equity_stcg", amount_inr: 45_000, locator: "4" },
      { id: "ltcg", label: "Domestic 112A gain", category: "listed_equity_ltcg", amount_inr: 200_000, locator: "5" },
      { id: "tds", label: "Employer TDS", category: "employer_tds", amount_inr: 250_000, locator: "6" },
      { id: "foreign-tax", label: "Foreign tax withheld", category: "foreign_tax_withheld", amount_inr: 25_000, locator: "7" }
    ]
  };
  const dataset = normalizeFixtureData([privateDocument]);
  const reconciliation = reconcileEvidence(dataset);
  const inputs = taxInputsFromReconciliation(reconciliation);
  assert.deepEqual(inputs, {
    salary_inr: 1_800_000,
    interest_inr: 0,
    dividend_inr: 20_000,
    listed_equity_stcg_inr: 45_000,
    listed_equity_ltcg_inr: 200_000,
    foreign_dividend_inr: 100_000,
    employer_tds_inr: 250_000,
    foreign_tax_withheld_inr: 25_000
  });

  const comparison = compareTaxRegimes(privateProfile, inputs, "local_private");
  assert.equal(comparison.new_regime.total_tax_inr, 194_870);
  assert.equal(comparison.new_regime.gross_tax_inr, 194_870);
  assert.equal(comparison.new_regime.foreign_tax_credit_cap_inr, 20_800);
  assert.equal(comparison.new_regime.foreign_tax_credit_inr, 20_800);
  assert.equal(comparison.new_regime.employer_tds_inr, 250_000);
  assert.equal(comparison.new_regime.net_tax_after_credits_inr, -75_930);
  assert.equal(comparison.new_regime.estimated_balance_payable_inr, 0);
  assert.equal(comparison.new_regime.estimated_refund_inr, 75_930);
  assert.equal(comparison.new_regime.form67_required_for_ftc_claim, true);
  assert.equal(comparison.new_regime.ror_confirmation_required, false);
  assert.ok(comparison.new_regime.warnings.some((warning) => warning.includes("Form 67")));
  assert.ok(comparison.new_regime.warnings.some((warning) => warning.includes("ROR")));
  assert.ok(comparison.new_regime.source_urls.some((url) => url.includes("form67")));
  assert.equal(comparison.old_regime.gross_tax_inr, 407_550);
  assert.equal(comparison.old_regime.foreign_tax_credit_cap_inr, 31_200);
  assert.equal(comparison.old_regime.foreign_tax_credit_inr, 25_000);
  assert.equal(comparison.old_regime.estimated_balance_payable_inr, 132_550);
  assert.equal(comparison.old_regime.estimated_refund_inr, 0);
  assert.equal(comparison.lower_estimated_regime, "new");
  assert.equal(comparison.estimated_difference_inr, 208_480);

  const proof = generateTaxProofPack({
    profile: privateProfile,
    dataset,
    reconciliation,
    calculation: comparison,
    generatedAt: "2026-07-19T12:00:00.000Z"
  });
  assert.equal(proof.calculation.new_regime.foreign_tax_credit_inr, 20_800);
  assert.equal(proof.calculation.new_regime.estimated_refund_inr, 75_930);
  assert.match(proof.integrity.canonical_payload_hash, /^[a-f0-9]{64}$/);
});

test("foreign-income scope fails closed outside the explicit local ROR dividend-only profile", () => {
  const privateForeignProfile: TaxpayerProfile = {
    ...profile,
    has_foreign_income_or_assets: true,
    is_resident_and_ordinarily_resident: true,
    has_foreign_capital_gains: false,
    has_other_foreign_income: false,
    has_foreign_assets_beyond_dividend_source: false
  };
  const supportedInputs = {
    salary_inr: 1_800_000,
    interest_inr: 0,
    dividend_inr: 0,
    listed_equity_stcg_inr: 0,
    listed_equity_ltcg_inr: 0,
    foreign_dividend_inr: 100_000,
    employer_tds_inr: 100_000,
    foreign_tax_withheld_inr: 10_000
  };

  assert.throws(
    () => compareTaxRegimes(privateForeignProfile, supportedInputs),
    /only in local_private mode/
  );
  assert.throws(
    () =>
      compareTaxRegimes(
        { ...privateForeignProfile, is_resident_and_ordinarily_resident: false },
        supportedInputs,
        "local_private"
      ),
    /Resident and Ordinarily Resident/
  );
  assert.throws(
    () =>
      compareTaxRegimes(
        privateForeignProfile,
        { ...supportedInputs, foreign_capital_gains_inr: 1 },
        "local_private"
      ),
    /Foreign capital gains/
  );
  assert.throws(
    () =>
      compareTaxRegimes(
        privateForeignProfile,
        { ...supportedInputs, other_foreign_income_inr: 1 },
        "local_private"
      ),
    /other foreign income/
  );
});

test("actual-case-shaped private estimate stays conditional without ROR confirmation and reconciles FTC", () => {
  const conditionalRorProfile: TaxpayerProfile = {
    ...profile,
    has_foreign_income_or_assets: true,
    has_foreign_capital_gains: false,
    has_other_foreign_income: false,
    has_foreign_assets_beyond_dividend_source: false
  };
  const inputs = {
    salary_inr: 2_487_983,
    interest_inr: 0,
    dividend_inr: 720,
    foreign_dividend_inr: 378,
    listed_equity_stcg_inr: 7_798,
    listed_equity_ltcg_inr: 0,
    employer_tds_inr: 316_051,
    foreign_tax_withheld_inr: 92
  };

  const withFtc = compareTaxRegimes(conditionalRorProfile, inputs, "local_private");
  assert.equal(withFtc.new_regime.gross_tax_inr, 318_015);
  assert.equal(withFtc.new_regime.foreign_tax_credit_cap_inr, 118);
  assert.equal(withFtc.new_regime.foreign_tax_credit_inr, 92);
  assert.equal(withFtc.new_regime.net_tax_after_credits_inr, 1_872);
  assert.equal(withFtc.new_regime.estimated_balance_payable_inr, 1_870);
  assert.equal(withFtc.new_regime.estimated_refund_inr, 0);
  assert.equal(withFtc.new_regime.ror_confirmation_required, true);
  assert.ok(withFtc.new_regime.warnings.some((warning) => warning.includes("not been confirmed")));

  const withoutFtc = compareTaxRegimes(
    conditionalRorProfile,
    { ...inputs, foreign_tax_withheld_inr: 0 },
    "local_private"
  );
  assert.equal(withoutFtc.new_regime.foreign_tax_credit_inr, 0);
  assert.equal(withoutFtc.new_regime.net_tax_after_credits_inr, 1_964);
  assert.equal(withoutFtc.new_regime.estimated_balance_payable_inr, 1_960);
});

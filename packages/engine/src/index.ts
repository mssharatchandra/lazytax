import { createHash } from "node:crypto";
import {
  ASSESSMENT_YEAR,
  DISCLAIMER,
  type DocumentKind,
  type EvidenceItem,
  type FixtureDocumentInput,
  FixtureDocumentInputSchema,
  type IncomeCategory,
  type NormalizedDataset,
  NormalizedDatasetSchema,
  type ReconciliationItem,
  type ReconciliationResult,
  ReconciliationResultSchema,
  type RegimeComparison,
  RegimeComparisonSchema,
  type SourceTotal,
  type SyntheticFixtureDocument,
  type TaxCalculation,
  type TaxInputs,
  TaxInputsSchema,
  type TaxProofPack,
  TaxProofPackSchema,
  type TaxpayerProfile,
  TaxpayerProfileSchema
} from "@lazytax/core";

export const OFFICIAL_RULE_SOURCES = [
  "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
  "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-2-online",
  "https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-05/CBDT__e-Filing_ITR%202_Validation%20Rules_AY%202026-27_V1.0.pdf"
] as const;

export class UnsupportedTaxProfileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UnsupportedTaxProfileError";
  }
}

function isSyntheticFixture(document: FixtureDocumentInput): document is SyntheticFixtureDocument {
  return "schema_version" in document;
}

function fixtureKind(kind: SyntheticFixtureDocument["document_type"]): DocumentKind {
  if (kind === "form16_like") return "form16";
  if (kind === "ais_like") return "ais";
  return "broker_report";
}

function supportedRecordCategory(
  record: SyntheticFixtureDocument["records"][number]
): IncomeCategory | undefined {
  if (record.category === "salary" && ["gross_salary", "performance_bonus"].includes(record.subtype)) {
    return "salary";
  }
  if (record.category === "other_income" && record.subtype === "savings_interest") {
    return "interest";
  }
  if (record.category === "other_income" && record.subtype === "dividend") {
    return "dividend";
  }
  if (record.category === "capital_gains" && record.subtype === "section_111a_short_term_gain") {
    return "listed_equity_stcg";
  }
  if (record.category === "capital_gains" && record.subtype === "section_112a_long_term_gain") {
    return "listed_equity_ltcg";
  }
  return undefined;
}

export function normalizeFixtureData(documentsInput: readonly FixtureDocumentInput[]): NormalizedDataset {
  if (documentsInput.length === 0) {
    throw new Error("At least one synthetic fixture document is required.");
  }
  const documents = documentsInput.map((document) => FixtureDocumentInputSchema.parse(document));
  const evidence: EvidenceItem[] = [];
  const warnings: string[] = [];

  for (const document of documents) {
    if (isSyntheticFixture(document)) {
      const kind = fixtureKind(document.document_type);
      for (const record of document.records) {
        const category = supportedRecordCategory(record);
        if (!category) {
          if (record.category === "tax_credit") {
            warnings.push(
              `Tax-credit record ${record.source_id} reports ₹${record.amount_inr.toLocaleString("en-IN")} and is retained only as a review warning; this MVP does not compute balance payable or refund.`
            );
            continue;
          }
          warnings.push(
            `Ignored unsupported or derived record ${record.source_id} (${record.category}/${record.subtype}); it was not used as taxable income.`
          );
          continue;
        }
        evidence.push({
          evidence_id: record.source_id,
          document_id: document.document_id,
          document_kind: kind,
          document_name: `${document.issuer} — ${document.document_type}`,
          entry_id: record.line_id,
          label: record.description,
          category,
          amount_inr: record.amount_inr,
          locator: record.line_id,
          ...(record.calculation ? { notes: `Fixture calculation: ${record.calculation}` } : {})
        });
      }
      continue;
    }

    for (const entry of document.entries) {
      evidence.push({
        evidence_id: `${document.id}:${entry.id}`,
        document_id: document.id,
        document_kind: document.kind,
        document_name: document.display_name,
        entry_id: entry.id,
        label: entry.label,
        category: entry.category,
        amount_inr: entry.amount_inr,
        locator: entry.locator,
        ...(entry.notes ? { notes: entry.notes } : {})
      });
    }
  }

  if (evidence.length === 0) {
    throw new Error(
      "No supported taxable-income records were found. Supply synthetic salary, savings-interest, dividend, section 111A STCG, or section 112A LTCG records."
    );
  }

  return NormalizedDatasetSchema.parse({
    assessment_year: ASSESSMENT_YEAR,
    synthetic: true,
    evidence,
    warnings,
    disclaimer: DISCLAIMER
  });
}

const CATEGORY_ORDER: readonly IncomeCategory[] = [
  "salary",
  "interest",
  "dividend",
  "listed_equity_stcg",
  "listed_equity_ltcg"
];

function aggregateSources(items: readonly EvidenceItem[]): SourceTotal[] {
  const sources = new Map<string, SourceTotal>();
  for (const item of items) {
    const existing = sources.get(item.document_id);
    if (existing) {
      existing.amount_inr += item.amount_inr;
      existing.evidence_ids.push(item.evidence_id);
    } else {
      sources.set(item.document_id, {
        document_id: item.document_id,
        document_kind: item.document_kind,
        document_name: item.document_name,
        amount_inr: item.amount_inr,
        evidence_ids: [item.evidence_id]
      });
    }
  }
  return [...sources.values()].sort((a, b) => a.document_id.localeCompare(b.document_id));
}

export function reconcileEvidence(
  datasetInput: NormalizedDataset,
  confirmations: Partial<Record<IncomeCategory, number>> = {},
  toleranceInr = 1
): ReconciliationResult {
  const dataset = NormalizedDatasetSchema.parse(datasetInput);
  if (!Number.isInteger(toleranceInr) || toleranceInr < 0 || toleranceInr > 10_000) {
    throw new Error("tolerance_inr must be a whole number from 0 to 10,000.");
  }
  const items: ReconciliationItem[] = [];

  for (const category of CATEGORY_ORDER) {
    const categoryEvidence = dataset.evidence.filter((item) => item.category === category);
    if (categoryEvidence.length === 0) continue;
    const sourceTotals = aggregateSources(categoryEvidence);
    const confirmedAmount = confirmations[category];
    const allEvidenceIds = categoryEvidence.map((item) => item.evidence_id);

    if (confirmedAmount !== undefined) {
      if (!Number.isFinite(confirmedAmount) || confirmedAmount < 0) {
        throw new Error(`Confirmation for ${category} must be a non-negative INR amount.`);
      }
      items.push({
        category,
        status: "confirmed",
        source_totals: sourceTotals,
        selected_amount_inr: confirmedAmount,
        selected_evidence_ids: allEvidenceIds,
        explanation: `The user explicitly confirmed ₹${confirmedAmount.toLocaleString("en-IN")} after reviewing the source evidence.`,
        action_required: null
      });
      continue;
    }

    if (sourceTotals.length === 1) {
      const onlySource = sourceTotals[0];
      if (!onlySource) throw new Error("Internal reconciliation error: missing source total.");
      items.push({
        category,
        status: "single_source",
        source_totals: sourceTotals,
        selected_amount_inr: onlySource.amount_inr,
        selected_evidence_ids: onlySource.evidence_ids,
        explanation: "Only one source reports this category; the value is usable but has not been independently corroborated.",
        action_required: null
      });
      continue;
    }

    const amounts = sourceTotals.map((source) => source.amount_inr);
    const spread = Math.max(...amounts) - Math.min(...amounts);
    if (spread <= toleranceInr) {
      const preferred = sourceTotals[0];
      if (!preferred) throw new Error("Internal reconciliation error: missing preferred source.");
      items.push({
        category,
        status: "matched",
        source_totals: sourceTotals,
        selected_amount_inr: preferred.amount_inr,
        selected_evidence_ids: allEvidenceIds,
        explanation: `All source totals agree within the ₹${toleranceInr.toLocaleString("en-IN")} tolerance.`,
        action_required: null
      });
    } else {
      items.push({
        category,
        status: "conflict",
        source_totals: sourceTotals,
        selected_amount_inr: null,
        selected_evidence_ids: [],
        explanation: `Source totals differ by ₹${spread.toLocaleString("en-IN")}; LazyTax will not guess which value is correct.`,
        action_required: `Review the evidence for ${category} and call reconciliation again with an explicit confirmed amount.`
      });
    }
  }

  const unresolvedCategories = items
    .filter((item) => item.status === "conflict")
    .map((item) => item.category);
  return ReconciliationResultSchema.parse({
    assessment_year: ASSESSMENT_YEAR,
    ready_for_calculation: unresolvedCategories.length === 0,
    items,
    unresolved_categories: unresolvedCategories,
    disclaimer: DISCLAIMER
  });
}

export function taxInputsFromReconciliation(resultInput: ReconciliationResult): TaxInputs {
  const result = ReconciliationResultSchema.parse(resultInput);
  if (!result.ready_for_calculation) {
    throw new Error(
      `Reconciliation is unresolved for: ${result.unresolved_categories.join(", ")}. Confirm each conflict before calculating.`
    );
  }
  const amount = (category: IncomeCategory): number =>
    result.items.find((item) => item.category === category)?.selected_amount_inr ?? 0;
  return TaxInputsSchema.parse({
    salary_inr: amount("salary"),
    interest_inr: amount("interest"),
    dividend_inr: amount("dividend"),
    listed_equity_stcg_inr: amount("listed_equity_stcg"),
    listed_equity_ltcg_inr: amount("listed_equity_ltcg")
  });
}

interface Slab {
  readonly lower: number;
  readonly upper: number | null;
  readonly rate: number;
}

const OLD_SLABS: readonly Slab[] = [
  { lower: 0, upper: 250_000, rate: 0 },
  { lower: 250_000, upper: 500_000, rate: 0.05 },
  { lower: 500_000, upper: 1_000_000, rate: 0.2 },
  { lower: 1_000_000, upper: null, rate: 0.3 }
];

const NEW_SLABS: readonly Slab[] = [
  { lower: 0, upper: 400_000, rate: 0 },
  { lower: 400_000, upper: 800_000, rate: 0.05 },
  { lower: 800_000, upper: 1_200_000, rate: 0.1 },
  { lower: 1_200_000, upper: 1_600_000, rate: 0.15 },
  { lower: 1_600_000, upper: 2_000_000, rate: 0.2 },
  { lower: 2_000_000, upper: 2_400_000, rate: 0.25 },
  { lower: 2_400_000, upper: null, rate: 0.3 }
];

function slabTax(income: number, slabs: readonly Slab[]): number {
  return slabs.reduce((tax, slab) => {
    if (income <= slab.lower) return tax;
    const upper = slab.upper ?? income;
    return tax + Math.max(0, Math.min(income, upper) - slab.lower) * slab.rate;
  }, 0);
}

function rupee(value: number): number {
  return Math.round(value);
}

function assertSupported(profileInput: TaxpayerProfile, inputsInput: TaxInputs): {
  profile: TaxpayerProfile;
  inputs: TaxInputs;
} {
  const profile = TaxpayerProfileSchema.parse(profileInput);
  const inputs = TaxInputsSchema.parse(inputsInput);
  if (inputs.salary_inr === 0) {
    throw new UnsupportedTaxProfileError(
      "This MVP requires positive salary income; it does not support a capital-gains-only or other-income-only return."
    );
  }
  const taxableLtcg = Math.max(0, inputs.listed_equity_ltcg_inr - 125_000);
  const conservativeMaximum =
    inputs.salary_inr +
    inputs.interest_inr +
    inputs.dividend_inr +
    inputs.listed_equity_stcg_inr +
    taxableLtcg;
  if (conservativeMaximum > 5_000_000) {
    throw new UnsupportedTaxProfileError(
      "This MVP stops at ₹50 lakh because surcharge and marginal-relief calculations are not implemented. Use a supported synthetic fixture below that threshold."
    );
  }
  if (conservativeMaximum > 1_200_000 && conservativeMaximum <= 1_300_000) {
    throw new UnsupportedTaxProfileError(
      "This MVP does not calculate the AY 2026-27 new-regime marginal-relief band just above ₹12 lakh. Use a supported synthetic fixture at or below ₹12 lakh or above ₹13 lakh."
    );
  }
  return { profile, inputs };
}

function calculateRegime(
  regime: "old" | "new",
  profileInput: TaxpayerProfile,
  inputsInput: TaxInputs
): TaxCalculation {
  const { inputs } = assertSupported(profileInput, inputsInput);
  const standardDeduction = Math.min(inputs.salary_inr, regime === "new" ? 75_000 : 50_000);
  const normalIncome = Math.max(
    0,
    inputs.salary_inr - standardDeduction + inputs.interest_inr + inputs.dividend_inr
  );
  const taxableStcg = inputs.listed_equity_stcg_inr;
  const taxableLtcg = Math.max(0, inputs.listed_equity_ltcg_inr - 125_000);
  const totalTaxableIncome = normalIncome + taxableStcg + taxableLtcg;
  const calculatedSlabTax = slabTax(normalIncome, regime === "new" ? NEW_SLABS : OLD_SLABS);
  const stcgTax = taxableStcg * 0.2;
  const ltcgTax = taxableLtcg * 0.125;
  const rebate =
    regime === "new" && totalTaxableIncome <= 1_200_000
      ? Math.min(60_000, calculatedSlabTax)
      : regime === "old" && totalTaxableIncome <= 500_000
        ? Math.min(12_500, calculatedSlabTax)
        : 0;
  const taxBeforeCess = calculatedSlabTax - rebate + stcgTax + ltcgTax;
  const cess = taxBeforeCess * 0.04;
  const totalTax = rupee(taxBeforeCess + cess);
  return {
    regime,
    standard_deduction_inr: rupee(standardDeduction),
    normal_rate_income_inr: rupee(normalIncome),
    taxable_stcg_inr: rupee(taxableStcg),
    taxable_ltcg_inr: rupee(taxableLtcg),
    total_taxable_income_inr: rupee(totalTaxableIncome),
    slab_tax_inr: rupee(calculatedSlabTax),
    stcg_tax_inr: rupee(stcgTax),
    ltcg_tax_inr: rupee(ltcgTax),
    rebate_87a_inr: rupee(rebate),
    tax_before_cess_inr: rupee(taxBeforeCess),
    health_education_cess_inr: rupee(cess),
    total_tax_inr: totalTax,
    effective_rate_percent:
      totalTaxableIncome === 0 ? 0 : Math.round((totalTax / totalTaxableIncome) * 10_000) / 100,
    assumptions: [
      "Resident individual under age 60 for AY 2026-27; no business, profession, foreign, house-property, crypto, or other special-rate income.",
      "Only the standard deduction is applied: up to ₹50,000 under old regime and ₹75,000 under new regime.",
      "Section 111A listed-equity STCG is estimated at 20%; section 112A listed-equity LTCG is estimated at 12.5% above the aggregate ₹1,25,000 threshold.",
      "Section 87A rebate, when eligible, reduces normal slab-rate tax only; it does not reduce special-rate capital-gains tax.",
      "Health and Education Cess is estimated at 4%. Surcharge, marginal relief above ₹12 lakh, losses, set-off, rounding under section 288B, interest, and tax credits are outside this MVP."
    ],
    source_urls: [...OFFICIAL_RULE_SOURCES],
    disclaimer: DISCLAIMER
  };
}

export function compareTaxRegimes(
  profileInput: TaxpayerProfile,
  inputsInput: TaxInputs
): RegimeComparison {
  const profile = TaxpayerProfileSchema.parse(profileInput);
  const inputs = TaxInputsSchema.parse(inputsInput);
  const oldRegime = calculateRegime("old", profile, inputs);
  const newRegime = calculateRegime("new", profile, inputs);
  const lowerEstimatedRegime =
    oldRegime.total_tax_inr <= newRegime.total_tax_inr ? "old" : "new";
  return RegimeComparisonSchema.parse({
    assessment_year: ASSESSMENT_YEAR,
    old_regime: oldRegime,
    new_regime: newRegime,
    lower_estimated_regime: lowerEstimatedRegime,
    estimated_difference_inr: Math.abs(oldRegime.total_tax_inr - newRegime.total_tax_inr),
    recommendation_limit:
      "This mechanical comparison is not a filing recommendation. It excludes deductions beyond the standard deduction and all unsupported income, relief, loss, credit, and surcharge cases.",
    disclaimer: DISCLAIMER
  });
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

export function generateTaxProofPack(args: {
  readonly profile: TaxpayerProfile;
  readonly dataset: NormalizedDataset;
  readonly reconciliation: ReconciliationResult;
  readonly calculation: RegimeComparison;
  readonly generatedAt?: string;
}): TaxProofPack {
  const profile = TaxpayerProfileSchema.parse(args.profile);
  const dataset = NormalizedDatasetSchema.parse(args.dataset);
  const reconciliation = ReconciliationResultSchema.parse(args.reconciliation);
  const calculation = RegimeComparisonSchema.parse(args.calculation);
  if (!reconciliation.ready_for_calculation) {
    throw new Error("Cannot generate a final Tax Proof Pack while reconciliation conflicts remain unresolved.");
  }
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const payload = {
    schema_version: "0.1.0" as const,
    generated_at: generatedAt,
    assessment_year: ASSESSMENT_YEAR,
    synthetic: true as const,
    supported_profile: profile,
    reconciliation,
    calculation,
    evidence_index: dataset.evidence,
    unresolved_actions: reconciliation.items.flatMap((item) =>
      item.action_required ? [item.action_required] : []
    ),
    disclaimer: DISCLAIMER
  };
  const canonicalPayloadHash = createHash("sha256").update(canonicalize(payload)).digest("hex");
  return TaxProofPackSchema.parse({
    ...payload,
    integrity: {
      algorithm: "SHA-256",
      canonical_payload_hash: canonicalPayloadHash
    }
  });
}

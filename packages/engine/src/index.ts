import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  ASSESSMENT_YEAR,
  DISCLAIMER,
  PRIVATE_REVIEW_DISCLAIMER,
  type DataMode,
  type DocumentKind,
  type EvidenceItem,
  type FixtureDocumentInput,
  FixtureDocumentInputSchema,
  type IncomeCategory,
  type LocalPrivateFixtureDocument,
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

export const FOREIGN_TAX_CREDIT_SOURCES = [
  "https://www.incometax.gov.in/iec/foportal/help/statutory-forms/popular-form/form67-um",
  "https://www.incometaxindia.gov.in/w/form-67",
  "https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/schedule_fsi",
  "https://wmstatic-prd.incometaxindia.gov.in/documents/20117/42998/Rule-128_2026-01-13_11-37-01_1c629b_en.pdf/145a3343-3b83-7223-7064-8fd9194f161c?download=true&t=1775731788761&version=6.0"
] as const;

// Process-local only: pseudonyms remain stable for one MCP session and cannot be
// reversed or correlated across restarts. The key is never persisted or sent.
const LOCAL_PRIVATE_SESSION_KEY = randomBytes(32);

function disclaimerFor(dataMode: DataMode): string {
  return dataMode === "local_private" ? PRIVATE_REVIEW_DISCLAIMER : DISCLAIMER;
}

export class UnsupportedTaxProfileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UnsupportedTaxProfileError";
  }
}

const SYNTHETIC_PII_PATTERNS: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: "PAN", pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i },
  { name: "Aadhaar", pattern: /\b[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}\b/ },
  { name: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { name: "Indian mobile number", pattern: /\b(?:\+?91[ -]?)?[6-9][0-9]{9}\b/ },
  { name: "IFSC code", pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/i },
  {
    name: "bank account number",
    pattern: /\b(?:account|a\/c|bank)[\s:#-]*(?:[0-9][ -]?){9,18}\b/i
  }
];

function assertNoSyntheticPii(value: unknown): void {
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string") {
      const detected = SYNTHETIC_PII_PATTERNS.find(({ pattern }) => pattern.test(candidate));
      if (detected) {
        throw new Error(
          `Synthetic-mode input contains a possible ${detected.name}. Remove or replace all real identifiers with clearly synthetic values before continuing.`
        );
      }
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (candidate !== null && typeof candidate === "object") {
      for (const nested of Object.values(candidate as Record<string, unknown>)) visit(nested);
    }
  };
  visit(value);
}

function assertNormalizedDatasetIntegrity(dataset: NormalizedDataset): void {
  if (dataset.data_mode === "local_private") {
    if (
      dataset.synthetic ||
      !/^PRIVATE-[a-f0-9]{16}$/.test(dataset.taxpayer_ref) ||
      dataset.privacy_guarantees?.processing !== "local_only" ||
      dataset.privacy_guarantees.persistence !== "none" ||
      dataset.privacy_guarantees.network !== "none" ||
      dataset.privacy_guarantees.identifiers !== "masked"
    ) {
      throw new Error("Local-private dataset metadata is invalid or missing its privacy guarantees.");
    }
  } else if (
    !dataset.synthetic ||
    !/^(?:SYNTH|DEID|DEMO)[A-Za-z0-9_-]{0,100}$/i.test(dataset.taxpayer_ref) ||
    dataset.privacy_guarantees !== undefined
  ) {
    throw new Error("Synthetic-demo dataset metadata is inconsistent with synthetic mode.");
  }
  const evidenceIds = new Set<string>();
  const documentMetadata = new Map<string, { kind: DocumentKind; name: string }>();
  for (const item of dataset.evidence) {
    if (
      dataset.data_mode === "local_private" &&
      (!/^ev_[a-f0-9]{16}$/.test(item.evidence_id) ||
        !/^doc_[a-f0-9]{16}$/.test(item.document_id) ||
        !/^line_[a-f0-9]{16}$/.test(item.entry_id) ||
        !/^line_[a-f0-9]{16}$/.test(item.locator) ||
        !/^Private (?:form16|ais|broker_report|other) evidence$/.test(item.document_name) ||
        !/^Private (?:salary|interest|dividend|foreign_dividend|listed_equity_stcg|listed_equity_ltcg|employer_tds|foreign_tax_withheld|foreign_capital_gains|other_foreign_income) evidence$/.test(
          item.label
        ) ||
        item.notes !== undefined)
    ) {
      throw new Error(
        "Local-private dataset contains unmasked evidence metadata. Re-run local-private normalization."
      );
    }
    if (evidenceIds.has(item.evidence_id)) {
      throw new Error(
        `Normalized dataset contains duplicate evidence ID ${item.evidence_id}. Re-run normalization from the original synthetic documents.`
      );
    }
    evidenceIds.add(item.evidence_id);
    const prior = documentMetadata.get(item.document_id);
    if (
      prior !== undefined &&
      (prior.kind !== item.document_kind || prior.name !== item.document_name)
    ) {
      throw new Error(
        `Normalized dataset contains inconsistent metadata for document ${item.document_id}. Re-run normalization from the original synthetic documents.`
      );
    }
    documentMetadata.set(item.document_id, {
      kind: item.document_kind,
      name: item.document_name
    });
  }
}

function isSyntheticFixture(document: FixtureDocumentInput): document is SyntheticFixtureDocument {
  return "schema_version" in document;
}

function isLocalPrivateFixture(
  document: FixtureDocumentInput
): document is LocalPrivateFixtureDocument {
  return "data_mode" in document && document.data_mode === "local_private";
}

function inputDataMode(document: FixtureDocumentInput): DataMode {
  return isLocalPrivateFixture(document) ? "local_private" : "synthetic_demo";
}

function rawDocumentId(document: FixtureDocumentInput): string {
  return isSyntheticFixture(document) ? document.document_id : document.id;
}

function privateToken(prefix: "PRIVATE" | "doc" | "ev" | "line", value: string): string {
  const digest = createHmac("sha256", LOCAL_PRIVATE_SESSION_KEY).update(value).digest("hex").slice(0, 16);
  return `${prefix}-${digest}`.replace("doc-", "doc_").replace("ev-", "ev_").replace("line-", "line_");
}

function safeInputIdentifier(dataMode: DataMode, prefix: "doc" | "ev" | "line", raw: string): string {
  return dataMode === "local_private" ? privateToken(prefix, raw) : raw;
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
  const parsedDocuments = documentsInput.map((document) => FixtureDocumentInputSchema.parse(document));
  const dataModes = new Set(parsedDocuments.map(inputDataMode));
  if (dataModes.size !== 1) {
    throw new Error("Synthetic-demo and local-private documents cannot be mixed in one normalization request.");
  }
  const dataMode = [...dataModes][0];
  if (!dataMode) throw new Error("Unable to determine the document data mode.");
  if (dataMode === "synthetic_demo") assertNoSyntheticPii(parsedDocuments);
  const taxpayerRefs = new Set(parsedDocuments.map((document) => document.taxpayer_ref));
  const taxYears = new Set(parsedDocuments.map((document) => document.tax_year));
  const assessmentYears = new Set(parsedDocuments.map((document) => document.assessment_year));
  if (taxpayerRefs.size !== 1) {
    throw new Error("All documents in one normalization request must use the same taxpayer reference.");
  }
  if (taxYears.size !== 1 || assessmentYears.size !== 1) {
    throw new Error("All documents in one normalization request must use the same FY2025-26 / AY2026-27 period.");
  }

  const documents: FixtureDocumentInput[] = [];
  const documentFingerprints = new Map<string, string>();
  const warnings: string[] = [];
  for (const document of parsedDocuments) {
    const documentId = rawDocumentId(document);
    const safeDocumentId = safeInputIdentifier(dataMode, "doc", documentId);
    const fingerprint = canonicalize(document);
    const priorFingerprint = documentFingerprints.get(documentId);
    if (priorFingerprint !== undefined) {
      if (priorFingerprint !== fingerprint) {
        throw new Error(
          `Document ID collision for ${safeDocumentId}. Two different documents cannot share an identifier.`
        );
      }
      warnings.push(`Deduplicated repeated document ${safeDocumentId}; its evidence was processed once.`);
      continue;
    }
    documentFingerprints.set(documentId, fingerprint);
    documents.push(document);
  }

  const evidence: EvidenceItem[] = [];
  const evidenceIds = new Set<string>();
  const fixtureSourceIds = new Set<string>();

  const appendEvidence = (item: EvidenceItem): void => {
    if (evidenceIds.has(item.evidence_id)) {
      throw new Error(
        `Duplicate evidence ID ${item.evidence_id}. Source and line identifiers must be unique within a fixture set.`
      );
    }
    evidenceIds.add(item.evidence_id);
    evidence.push(item);
  };

  for (const document of documents) {
    if (isSyntheticFixture(document)) {
      const kind = fixtureKind(document.document_type);
      const lineIds = new Set<string>();
      for (const record of document.records) {
        if (fixtureSourceIds.has(record.source_id)) {
          throw new Error(
            `Duplicate source ID ${record.source_id}. Source identifiers must be unique across the fixture set.`
          );
        }
        fixtureSourceIds.add(record.source_id);
        if (lineIds.has(record.line_id)) {
          throw new Error(
            `Duplicate line ID ${record.line_id} in document ${document.document_id}. Each source row must be unique.`
          );
        }
        lineIds.add(record.line_id);
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
        appendEvidence({
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

    if (isLocalPrivateFixture(document)) {
      const documentId = privateToken("doc", document.id);
      for (const entry of document.entries) {
        const entryToken = privateToken("line", `${document.id}:${entry.id}`);
        appendEvidence({
          evidence_id: privateToken("ev", `${document.id}:${entry.id}`),
          document_id: documentId,
          document_kind: document.kind,
          document_name: `Private ${document.kind} evidence`,
          entry_id: entryToken,
          label: `Private ${entry.category} evidence`,
          category: entry.category,
          amount_inr: entry.amount_inr,
          locator: entryToken
        });
      }
      continue;
    }

    for (const entry of document.entries) {
      appendEvidence({
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

  const rawTaxpayerRef = [...taxpayerRefs][0];
  if (!rawTaxpayerRef) throw new Error("Unable to establish one taxpayer reference.");
  const sourceMaterial = canonicalize(documents);
  const sourceSetHash =
    dataMode === "local_private"
      ? createHmac("sha256", LOCAL_PRIVATE_SESSION_KEY).update(sourceMaterial).digest("hex")
      : createHash("sha256").update(sourceMaterial).digest("hex");
  if (dataMode === "local_private") {
    return NormalizedDatasetSchema.parse({
      data_mode: dataMode,
      assessment_year: ASSESSMENT_YEAR,
      tax_year: "FY2025-26",
      taxpayer_ref: privateToken("PRIVATE", rawTaxpayerRef),
      synthetic: false,
      evidence,
      warnings,
      source_set_hash: sourceSetHash,
      privacy_guarantees: {
        processing: "local_only",
        persistence: "none",
        network: "none",
        identifiers: "masked"
      },
      disclaimer: PRIVATE_REVIEW_DISCLAIMER
    });
  }
  return NormalizedDatasetSchema.parse({
    data_mode: dataMode,
    assessment_year: ASSESSMENT_YEAR,
    tax_year: "FY2025-26",
    taxpayer_ref: rawTaxpayerRef,
    synthetic: true,
    evidence,
    warnings,
    source_set_hash: sourceSetHash,
    disclaimer: DISCLAIMER
  });
}

const CATEGORY_ORDER: readonly IncomeCategory[] = [
  "salary",
  "interest",
  "dividend",
  "foreign_dividend",
  "listed_equity_stcg",
  "listed_equity_ltcg",
  "employer_tds",
  "foreign_tax_withheld",
  "foreign_capital_gains",
  "other_foreign_income"
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
  assertNoSyntheticPii(dataset);
  assertNormalizedDatasetIntegrity(dataset);
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
    data_mode: dataset.data_mode,
    assessment_year: ASSESSMENT_YEAR,
    taxpayer_ref: dataset.taxpayer_ref,
    tolerance_inr: toleranceInr,
    ready_for_calculation: unresolvedCategories.length === 0,
    items,
    unresolved_categories: unresolvedCategories,
    disclaimer: disclaimerFor(dataset.data_mode)
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
  const optionalAmount = (category: IncomeCategory, field: string): Record<string, number> =>
    result.items.some((item) => item.category === category) ? { [field]: amount(category) } : {};
  return TaxInputsSchema.parse({
    salary_inr: amount("salary"),
    interest_inr: amount("interest"),
    dividend_inr: amount("dividend"),
    listed_equity_stcg_inr: amount("listed_equity_stcg"),
    listed_equity_ltcg_inr: amount("listed_equity_ltcg"),
    ...optionalAmount("foreign_dividend", "foreign_dividend_inr"),
    ...optionalAmount("employer_tds", "employer_tds_inr"),
    ...optionalAmount("foreign_tax_withheld", "foreign_tax_withheld_inr"),
    ...optionalAmount("foreign_capital_gains", "foreign_capital_gains_inr"),
    ...optionalAmount("other_foreign_income", "other_foreign_income_inr")
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

type NormalizedTaxInputs = TaxInputs & {
  foreign_dividend_inr: number;
  employer_tds_inr: number;
  foreign_tax_withheld_inr: number;
  foreign_capital_gains_inr: number;
  other_foreign_income_inr: number;
};

function assertSupported(
  profileInput: TaxpayerProfile,
  inputsInput: TaxInputs,
  dataMode: DataMode
): {
  profile: TaxpayerProfile;
  inputs: NormalizedTaxInputs;
} {
  const profile = TaxpayerProfileSchema.parse(profileInput);
  const parsedInputs = TaxInputsSchema.parse(inputsInput);
  const inputs: NormalizedTaxInputs = {
    ...parsedInputs,
    foreign_dividend_inr: parsedInputs.foreign_dividend_inr ?? 0,
    employer_tds_inr: parsedInputs.employer_tds_inr ?? 0,
    foreign_tax_withheld_inr: parsedInputs.foreign_tax_withheld_inr ?? 0,
    foreign_capital_gains_inr: parsedInputs.foreign_capital_gains_inr ?? 0,
    other_foreign_income_inr: parsedInputs.other_foreign_income_inr ?? 0
  };
  if (inputs.salary_inr === 0) {
    throw new UnsupportedTaxProfileError(
      "This MVP requires positive salary income; it does not support a capital-gains-only or other-income-only return."
    );
  }
  if (
    inputs.foreign_capital_gains_inr > 0 ||
    inputs.other_foreign_income_inr > 0 ||
    profile.has_foreign_capital_gains === true ||
    profile.has_other_foreign_income === true ||
    profile.has_foreign_assets_beyond_dividend_source === true
  ) {
    throw new UnsupportedTaxProfileError(
      "This MVP supports foreign dividends only. Foreign capital gains, other foreign income, and additional foreign assets must be reviewed outside this deterministic profile."
    );
  }
  const hasForeignDividendCase =
    inputs.foreign_dividend_inr > 0 || inputs.foreign_tax_withheld_inr > 0;
  if (hasForeignDividendCase) {
    if (dataMode !== "local_private") {
      throw new UnsupportedTaxProfileError(
        "Foreign dividend and foreign-tax-credit calculations are available only in local_private mode."
      );
    }
    if (!profile.has_foreign_income_or_assets) {
      throw new UnsupportedTaxProfileError(
        "The taxpayer profile must explicitly declare foreign income or assets for a foreign-dividend calculation."
      );
    }
    if (profile.is_resident_and_ordinarily_resident === false) {
      throw new UnsupportedTaxProfileError(
        "This foreign-dividend profile does not support a taxpayer who is explicitly not Resident and Ordinarily Resident (ROR)."
      );
    }
    if (
      profile.has_foreign_capital_gains !== false ||
      profile.has_other_foreign_income !== false ||
      profile.has_foreign_assets_beyond_dividend_source !== false
    ) {
      throw new UnsupportedTaxProfileError(
        "Confirm that foreign capital gains, other foreign income, and foreign assets beyond the dividend source are all absent before using this narrow profile."
      );
    }
    if (inputs.foreign_dividend_inr === 0) {
      throw new UnsupportedTaxProfileError(
        "Foreign tax withheld cannot be credited without a positive foreign dividend included in Indian taxable income."
      );
    }
  } else if (profile.has_foreign_income_or_assets) {
    throw new UnsupportedTaxProfileError(
      "The profile declares foreign income or assets, but this calculation contains no supported foreign dividend."
    );
  }
  const taxableLtcg = Math.max(0, inputs.listed_equity_ltcg_inr - 125_000);
  const conservativeMaximum =
    inputs.salary_inr +
    inputs.interest_inr +
    inputs.dividend_inr +
    inputs.foreign_dividend_inr +
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

interface GrossTaxCalculation {
  readonly standardDeduction: number;
  readonly normalIncome: number;
  readonly taxableStcg: number;
  readonly taxableLtcg: number;
  readonly totalTaxableIncome: number;
  readonly calculatedSlabTax: number;
  readonly stcgTax: number;
  readonly ltcgTax: number;
  readonly rebate: number;
  readonly taxBeforeCess: number;
  readonly cess: number;
  readonly totalTax: number;
}

function calculateGrossTax(
  regime: "old" | "new",
  inputs: NormalizedTaxInputs
): GrossTaxCalculation {
  const standardDeduction = Math.min(inputs.salary_inr, regime === "new" ? 75_000 : 50_000);
  const normalIncome = Math.max(
    0,
    inputs.salary_inr -
      standardDeduction +
      inputs.interest_inr +
      inputs.dividend_inr +
      inputs.foreign_dividend_inr
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
  return {
    standardDeduction,
    normalIncome,
    taxableStcg,
    taxableLtcg,
    totalTaxableIncome,
    calculatedSlabTax,
    stcgTax,
    ltcgTax,
    rebate,
    taxBeforeCess,
    cess,
    totalTax: rupee(taxBeforeCess + cess)
  };
}

function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}

function calculateRegime(
  regime: "old" | "new",
  profileInput: TaxpayerProfile,
  inputsInput: TaxInputs,
  dataMode: DataMode
): TaxCalculation {
  const { profile, inputs } = assertSupported(profileInput, inputsInput, dataMode);
  const gross = calculateGrossTax(regime, inputs);
  const withoutForeignDividend = calculateGrossTax(regime, {
    ...inputs,
    foreign_dividend_inr: 0,
    foreign_tax_withheld_inr: 0
  });
  const foreignTaxCreditCap = Math.max(0, gross.totalTax - withoutForeignDividend.totalTax);
  const foreignTaxCredit = Math.min(inputs.foreign_tax_withheld_inr, foreignTaxCreditCap);
  const netTaxAfterCredits = gross.totalTax - foreignTaxCredit - inputs.employer_tds_inr;
  const estimatedBalancePayable =
    netTaxAfterCredits > 0 ? roundToNearestTen(netTaxAfterCredits) : 0;
  const estimatedRefund = netTaxAfterCredits < 0 ? roundToNearestTen(-netTaxAfterCredits) : 0;
  const hasForeignDividend = inputs.foreign_dividend_inr > 0;
  const warnings = hasForeignDividend
    ? [
        profile.is_resident_and_ordinarily_resident === true
          ? "The profile records ROR confirmation, but residential status must still be re-checked before filing."
          : "ROR status has not been confirmed. This estimate is conditional; confirm Resident and Ordinarily Resident status before relying on foreign-dividend treatment.",
        "Any FTC estimate is conditional on eligible, undisputed foreign tax, INR conversion, supporting evidence, Schedule FSI/TR disclosures, and timely Form 67 compliance.",
        ...(inputs.foreign_tax_withheld_inr > foreignTaxCredit
          ? [
              `₹${rupee(inputs.foreign_tax_withheld_inr - foreignTaxCredit).toLocaleString("en-IN")} of reported foreign tax withheld is not included in this conservative FTC estimate.`
            ]
          : [])
      ]
    : [];
  return {
    regime,
    standard_deduction_inr: rupee(gross.standardDeduction),
    normal_rate_income_inr: rupee(gross.normalIncome),
    taxable_stcg_inr: rupee(gross.taxableStcg),
    taxable_ltcg_inr: rupee(gross.taxableLtcg),
    total_taxable_income_inr: rupee(gross.totalTaxableIncome),
    slab_tax_inr: rupee(gross.calculatedSlabTax),
    stcg_tax_inr: rupee(gross.stcgTax),
    ltcg_tax_inr: rupee(gross.ltcgTax),
    rebate_87a_inr: rupee(gross.rebate),
    tax_before_cess_inr: rupee(gross.taxBeforeCess),
    health_education_cess_inr: rupee(gross.cess),
    total_tax_inr: gross.totalTax,
    gross_tax_inr: gross.totalTax,
    foreign_dividend_income_inr: inputs.foreign_dividend_inr,
    foreign_tax_credit_cap_inr: foreignTaxCreditCap,
    foreign_tax_credit_inr: foreignTaxCredit,
    employer_tds_inr: inputs.employer_tds_inr,
    net_tax_after_credits_inr: netTaxAfterCredits,
    estimated_balance_payable_inr: estimatedBalancePayable,
    estimated_refund_inr: estimatedRefund,
    rounding_unit_inr: 10,
    form67_required_for_ftc_claim: foreignTaxCredit > 0,
    ror_confirmation_required:
      hasForeignDividend && profile.is_resident_and_ordinarily_resident !== true,
    effective_rate_percent:
      gross.totalTaxableIncome === 0
        ? 0
        : Math.round((gross.totalTax / gross.totalTaxableIncome) * 10_000) / 100,
    assumptions: [
      hasForeignDividend && profile.is_resident_and_ordinarily_resident === true
        ? "Resident and Ordinarily Resident individual under age 60 for AY 2026-27; foreign income is limited to dividends, with no foreign capital gains, other foreign income, or additional foreign assets."
        : hasForeignDividend
          ? "Conditional resident-individual estimate under age 60 for AY 2026-27; ROR is not yet confirmed, and foreign income is limited to dividends with all other foreign categories explicitly absent."
          : "Resident individual under age 60 for AY 2026-27; no business, profession, foreign, house-property, crypto, or other special-rate income.",
      "Only the standard deduction is applied: up to ₹50,000 under old regime and ₹75,000 under new regime.",
      "Section 111A listed-equity STCG is estimated at 20%; section 112A listed-equity LTCG is estimated at 12.5% above the aggregate ₹1,25,000 threshold.",
      "Section 87A rebate, when eligible, reduces normal slab-rate tax only; it does not reduce special-rate capital-gains tax.",
      hasForeignDividend
        ? "FTC is conservatively limited to the lower of reported foreign tax withheld and the incremental gross Indian tax produced by the foreign dividend; treaty-specific rates, disputed tax, and carry-forward are not computed."
        : "No foreign tax credit is computed because no foreign dividend or foreign tax withheld was supplied.",
      "Health and Education Cess is estimated at 4%. Surcharge, marginal relief above ₹12 lakh, losses, set-off, and interest are outside this MVP; the final balance or refund estimate is rounded to the nearest ₹10."
    ],
    warnings,
    source_urls: hasForeignDividend
      ? [...OFFICIAL_RULE_SOURCES, ...FOREIGN_TAX_CREDIT_SOURCES]
      : [...OFFICIAL_RULE_SOURCES],
    disclaimer: disclaimerFor(dataMode)
  };
}

export function compareTaxRegimes(
  profileInput: TaxpayerProfile,
  inputsInput: TaxInputs,
  dataMode: DataMode = "synthetic_demo"
): RegimeComparison {
  const profile = TaxpayerProfileSchema.parse(profileInput);
  const inputs = TaxInputsSchema.parse(inputsInput);
  const oldRegime = calculateRegime("old", profile, inputs, dataMode);
  const newRegime = calculateRegime("new", profile, inputs, dataMode);
  const lowerEstimatedRegime =
    oldRegime.net_tax_after_credits_inr <= newRegime.net_tax_after_credits_inr ? "old" : "new";
  return RegimeComparisonSchema.parse({
    assessment_year: ASSESSMENT_YEAR,
    old_regime: oldRegime,
    new_regime: newRegime,
    lower_estimated_regime: lowerEstimatedRegime,
    estimated_difference_inr: Math.abs(
      oldRegime.net_tax_after_credits_inr - newRegime.net_tax_after_credits_inr
    ),
    recommendation_limit:
      "This mechanical comparison is not a filing recommendation. It excludes deductions beyond the standard deduction and all unsupported income, relief, loss, treaty-specific credit, and surcharge cases.",
    disclaimer: disclaimerFor(dataMode)
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
  assertNoSyntheticPii(dataset);
  if (!reconciliation.ready_for_calculation) {
    throw new Error("Cannot generate a final Tax Proof Pack while reconciliation conflicts remain unresolved.");
  }
  const confirmations: Partial<Record<IncomeCategory, number>> = {};
  for (const item of reconciliation.items) {
    if (item.status === "confirmed") {
      if (item.selected_amount_inr === null) {
        throw new Error(`Confirmed reconciliation item ${item.category} is missing its selected amount.`);
      }
      confirmations[item.category] = item.selected_amount_inr;
    }
  }
  const recomputedReconciliation = reconcileEvidence(
    dataset,
    confirmations,
    reconciliation.tolerance_inr
  );
  if (canonicalize(recomputedReconciliation) !== canonicalize(reconciliation)) {
    throw new Error(
      "Reconciliation integrity check failed. The supplied reconciliation is not reproducible from the source evidence and recorded confirmations."
    );
  }
  const recomputedCalculation = compareTaxRegimes(
    profile,
    taxInputsFromReconciliation(recomputedReconciliation),
    dataset.data_mode
  );
  if (canonicalize(recomputedCalculation) !== canonicalize(calculation)) {
    throw new Error(
      "Calculation integrity check failed. The supplied calculation is not reproducible from the bound reconciliation and taxpayer profile."
    );
  }
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const payload = {
    schema_version: "0.1.0" as const,
    generated_at: generatedAt,
    data_mode: dataset.data_mode,
    assessment_year: ASSESSMENT_YEAR,
    taxpayer_ref: dataset.taxpayer_ref,
    synthetic: dataset.synthetic,
    supported_profile: profile,
    reconciliation: recomputedReconciliation,
    calculation: recomputedCalculation,
    evidence_index: dataset.evidence,
    unresolved_actions: recomputedReconciliation.items.flatMap((item) =>
      item.action_required ? [item.action_required] : []
    ),
    ...(dataset.data_mode === "local_private"
      ? { privacy_guarantees: dataset.privacy_guarantees }
      : {}),
    disclaimer: disclaimerFor(dataset.data_mode)
  };
  const datasetHash = createHash("sha256").update(canonicalize(dataset)).digest("hex");
  const reconciliationHash = createHash("sha256")
    .update(canonicalize(recomputedReconciliation))
    .digest("hex");
  const calculationHash = createHash("sha256")
    .update(canonicalize(recomputedCalculation))
    .digest("hex");
  const canonicalPayloadHash = createHash("sha256").update(canonicalize(payload)).digest("hex");
  return TaxProofPackSchema.parse({
    ...payload,
    integrity: {
      algorithm: "SHA-256",
      source_set_hash: dataset.source_set_hash,
      dataset_hash: datasetHash,
      reconciliation_hash: reconciliationHash,
      calculation_hash: calculationHash,
      canonical_payload_hash: canonicalPayloadHash
    }
  });
}

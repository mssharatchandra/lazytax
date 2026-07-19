import { z } from "zod";

export const ASSESSMENT_YEAR = "2026-27" as const;
export const DISCLAIMER =
  "Synthetic Build Week demonstration only. LazyTax does not file a return and is not tax, legal, or financial advice. Verify all figures against official records and a qualified professional before acting.";

export const IncomeCategorySchema = z.enum([
  "salary",
  "interest",
  "dividend",
  "listed_equity_stcg",
  "listed_equity_ltcg"
]);
export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;

export const DocumentKindSchema = z.enum(["form16", "ais", "broker_report", "other"]);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const SyntheticTaxpayerReferenceSchema = z
  .string()
  .regex(
    /^(?:SYNTH|DEID|DEMO)[A-Za-z0-9_-]{0,100}$/i,
    "Synthetic taxpayer references must start with SYNTH, DEID, or DEMO and contain no real identifier."
  );

export const FixtureEntrySchema = z
  .object({
    id: z.string().min(1).max(120).describe("Stable row or field identifier within the synthetic document."),
    label: z.string().min(1).max(200).describe("Human-readable source label."),
    category: IncomeCategorySchema,
    amount_inr: z.number().int().nonnegative().max(50_000_000).describe("Non-negative whole-rupee income or gain amount."),
    locator: z.string().min(1).max(300).describe("Source location such as page 1, box 6, or CSV row 4."),
    notes: z.string().max(500).optional()
  })
  .strict();
export type FixtureEntry = z.infer<typeof FixtureEntrySchema>;

export const FixtureDocumentSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]+$/).max(80),
    kind: DocumentKindSchema,
    display_name: z.string().min(1).max(160),
    synthetic: z.literal(true).describe("Must be true; the MVP accepts synthetic demo data only."),
    tax_year: z.literal("FY2025-26"),
    assessment_year: z.literal("AY2026-27"),
    taxpayer_ref: SyntheticTaxpayerReferenceSchema,
    currency: z.literal("INR"),
    entries: z.array(FixtureEntrySchema).min(1).max(200)
  })
  .strict();
export type FixtureDocument = z.infer<typeof FixtureDocumentSchema>;

export const SyntheticFixtureRecordSchema = z
  .object({
    source_id: z.string().min(1).max(160),
    line_id: z.string().min(1).max(120),
    category: z.enum(["salary", "other_income", "capital_gains", "deduction", "tax_credit"]),
    subtype: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    amount_inr: z.number().int().nonnegative().max(50_000_000),
    match_key: z.string().min(1).max(200),
    calculation: z.string().max(200).optional()
  })
  .strict();

export const SyntheticFixtureDocumentSchema = z
  .object({
    schema_version: z.literal("lazytax.fixture.v1"),
    synthetic: z.literal(true),
    notice: z.string().min(1).max(500),
    document_id: z.string().min(1).max(120),
    document_type: z.enum(["form16_like", "ais_like", "broker_pnl_like"]),
    tax_year: z.literal("FY2025-26"),
    assessment_year: z.literal("AY2026-27"),
    taxpayer_ref: SyntheticTaxpayerReferenceSchema,
    taxpayer_display_name: z.string().min(1).max(160),
    issuer: z.string().min(1).max(200),
    currency: z.literal("INR"),
    records: z.array(SyntheticFixtureRecordSchema).min(1).max(200)
  })
  .strict();
export type SyntheticFixtureDocument = z.infer<typeof SyntheticFixtureDocumentSchema>;

export const FixtureDocumentInputSchema = z.union([FixtureDocumentSchema, SyntheticFixtureDocumentSchema]);
export type FixtureDocumentInput = z.infer<typeof FixtureDocumentInputSchema>;

export const EvidenceItemSchema = z
  .object({
    evidence_id: z.string(),
    document_id: z.string(),
    document_kind: DocumentKindSchema,
    document_name: z.string(),
    entry_id: z.string(),
    label: z.string(),
    category: IncomeCategorySchema,
    amount_inr: z.number().nonnegative(),
    locator: z.string(),
    notes: z.string().optional()
  })
  .strict();
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const NormalizedDatasetSchema = z
  .object({
    assessment_year: z.literal(ASSESSMENT_YEAR),
    tax_year: z.literal("FY2025-26"),
    taxpayer_ref: SyntheticTaxpayerReferenceSchema,
    synthetic: z.literal(true),
    evidence: z.array(EvidenceItemSchema),
    warnings: z.array(z.string()),
    disclaimer: z.string()
  })
  .strict();
export type NormalizedDataset = z.infer<typeof NormalizedDatasetSchema>;

export const ReconciliationStatusSchema = z.enum(["matched", "single_source", "conflict", "confirmed"]);
export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;

export const SourceTotalSchema = z
  .object({
    document_id: z.string(),
    document_kind: DocumentKindSchema,
    document_name: z.string(),
    amount_inr: z.number().nonnegative(),
    evidence_ids: z.array(z.string()).min(1)
  })
  .strict();
export type SourceTotal = z.infer<typeof SourceTotalSchema>;

export const ReconciliationItemSchema = z
  .object({
    category: IncomeCategorySchema,
    status: ReconciliationStatusSchema,
    source_totals: z.array(SourceTotalSchema).min(1),
    selected_amount_inr: z.number().nonnegative().nullable(),
    selected_evidence_ids: z.array(z.string()),
    explanation: z.string(),
    action_required: z.string().nullable()
  })
  .strict();
export type ReconciliationItem = z.infer<typeof ReconciliationItemSchema>;

export const ReconciliationResultSchema = z
  .object({
    assessment_year: z.literal(ASSESSMENT_YEAR),
    tolerance_inr: z.number().int().min(0).max(10_000),
    ready_for_calculation: z.boolean(),
    items: z.array(ReconciliationItemSchema),
    unresolved_categories: z.array(IncomeCategorySchema),
    disclaimer: z.string()
  })
  .strict();
export type ReconciliationResult = z.infer<typeof ReconciliationResultSchema>;

export const TaxpayerProfileSchema = z
  .object({
    assessment_year: z.literal(ASSESSMENT_YEAR),
    residency: z.literal("resident"),
    entity_type: z.literal("individual"),
    age: z.number().int().min(18).max(59).describe("MVP supports resident individuals under 60 only."),
    has_business_or_professional_income: z.literal(false),
    has_foreign_income_or_assets: z.literal(false),
    has_house_property_income: z.literal(false),
    has_crypto_or_other_special_rate_income: z.literal(false),
    claims_deductions_beyond_standard_deduction: z.literal(false)
  })
  .strict();
export type TaxpayerProfile = z.infer<typeof TaxpayerProfileSchema>;

export const TaxInputsSchema = z
  .object({
    salary_inr: z.number().int().nonnegative().max(50_000_000),
    interest_inr: z.number().int().nonnegative().max(50_000_000),
    dividend_inr: z.number().int().nonnegative().max(50_000_000),
    listed_equity_stcg_inr: z.number().int().nonnegative().max(50_000_000),
    listed_equity_ltcg_inr: z.number().int().nonnegative().max(50_000_000)
  })
  .strict();
export type TaxInputs = z.infer<typeof TaxInputsSchema>;

export const TaxRegimeSchema = z.enum(["old", "new"]);
export type TaxRegime = z.infer<typeof TaxRegimeSchema>;

export const TaxCalculationSchema = z
  .object({
    regime: TaxRegimeSchema,
    standard_deduction_inr: z.number(),
    normal_rate_income_inr: z.number(),
    taxable_stcg_inr: z.number(),
    taxable_ltcg_inr: z.number(),
    total_taxable_income_inr: z.number(),
    slab_tax_inr: z.number(),
    stcg_tax_inr: z.number(),
    ltcg_tax_inr: z.number(),
    rebate_87a_inr: z.number(),
    tax_before_cess_inr: z.number(),
    health_education_cess_inr: z.number(),
    total_tax_inr: z.number(),
    effective_rate_percent: z.number(),
    assumptions: z.array(z.string()),
    source_urls: z.array(z.string()),
    disclaimer: z.string()
  })
  .strict();
export type TaxCalculation = z.infer<typeof TaxCalculationSchema>;

export const RegimeComparisonSchema = z
  .object({
    assessment_year: z.literal(ASSESSMENT_YEAR),
    old_regime: TaxCalculationSchema,
    new_regime: TaxCalculationSchema,
    lower_estimated_regime: TaxRegimeSchema,
    estimated_difference_inr: z.number().nonnegative(),
    recommendation_limit: z.string(),
    disclaimer: z.string()
  })
  .strict();
export type RegimeComparison = z.infer<typeof RegimeComparisonSchema>;

export const TaxProofPackSchema = z
  .object({
    schema_version: z.literal("0.1.0"),
    generated_at: z.string().datetime(),
    assessment_year: z.literal(ASSESSMENT_YEAR),
    synthetic: z.literal(true),
    supported_profile: TaxpayerProfileSchema,
    reconciliation: ReconciliationResultSchema,
    calculation: RegimeComparisonSchema,
    evidence_index: z.array(EvidenceItemSchema),
    unresolved_actions: z.array(z.string()),
    integrity: z.object({
      algorithm: z.literal("SHA-256"),
      dataset_hash: z.string().regex(/^[a-f0-9]{64}$/),
      reconciliation_hash: z.string().regex(/^[a-f0-9]{64}$/),
      calculation_hash: z.string().regex(/^[a-f0-9]{64}$/),
      canonical_payload_hash: z.string().regex(/^[a-f0-9]{64}$/)
    }),
    disclaimer: z.string()
  })
  .strict();
export type TaxProofPack = z.infer<typeof TaxProofPackSchema>;

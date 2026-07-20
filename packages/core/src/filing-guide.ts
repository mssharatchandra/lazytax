import { z } from "zod";

const FilingSourceCategorySchema = z.enum([
  "salary",
  "interest",
  "dividend",
  "foreign_dividend",
  "listed_equity_stcg",
  "listed_equity_ltcg",
  "employer_tds",
  "foreign_tax_withheld",
  "foreign_capital_gains",
  "other_foreign_income",
  "foreign_stock_stcg",
  "foreign_stock_ltcg"
]);
const FilingTaxRegimeSchema = z.enum(["old", "new"]);

export const ItrFormSchema = z.enum(["ITR-1", "ITR-2"]);
export type ItrForm = z.infer<typeof ItrFormSchema>;

export const FilingGuideStatusSchema = z.enum(["ready_for_guided_entry", "review_required"]);

export const FilingScheduleSchema = z.enum([
  "Part A - General",
  "Schedule Salary",
  "Schedule Other Sources",
  "Schedule CG",
  "Schedule 112A",
  "Schedule FSI",
  "Schedule TR",
  "Schedule FA",
  "Tax Paid",
  "Part B-TTI"
]);

export const FilingFieldInstructionSchema = z
  .object({
    instruction_id: z.string().regex(/^field_[a-z0-9_]+$/),
    schedule: FilingScheduleSchema,
    portal_field_label: z.string().min(1).max(240),
    entry_mode: z.enum(["enter", "verify_prefilled", "portal_calculated", "review"]),
    amount_inr: z.number().int().nullable(),
    source_categories: z.array(FilingSourceCategorySchema),
    source_references: z.array(z.string().min(1)).min(1),
    calculation_node: z.string().regex(/^AY2026_27\.[A-Za-z0-9_.-]+$/),
    why: z.string().min(1).max(700),
    review_note: z.string().min(1).max(700).nullable()
  })
  .strict();
export type FilingFieldInstruction = z.infer<typeof FilingFieldInstructionSchema>;

export const FilingStepSchema = z
  .object({
    step_number: z.number().int().positive().max(20),
    title: z.string().min(1).max(180),
    why: z.string().min(1).max(700),
    instruction_ids: z.array(z.string().regex(/^field_[a-z0-9_]+$/)),
    requires_user_action: z.boolean()
  })
  .strict();

export const FilingGuideSchema = z
  .object({
    schema_version: z.literal("lazytax.filing-guide.v1"),
    assessment_year: z.literal("2026-27"),
    itr_form: ItrFormSchema,
    status: FilingGuideStatusSchema,
    form_reason: z.string().min(1).max(1_000),
    selected_regime: FilingTaxRegimeSchema,
    regime_reason: z.string().min(1).max(700),
    field_instructions: z.array(FilingFieldInstructionSchema).min(1).max(100),
    steps: z.array(FilingStepSchema).min(1).max(20),
    calculation_summary: z
      .object({
        total_tax_inr: z.number().int().nonnegative(),
        employer_tds_inr: z.number().int().nonnegative(),
        foreign_tax_credit_inr: z.number().int().nonnegative(),
        estimated_balance_payable_inr: z.number().int().nonnegative(),
        estimated_refund_inr: z.number().int().nonnegative()
      })
      .strict(),
    open_review_items: z.array(z.string().min(1).max(700)).max(20),
    official_source_urls: z.array(z.string().url()).min(1),
    filing_boundary: z.literal(
      "Guided preparation only. Verify each entry in the official AY 2026-27 utility; this guide does not generate, validate, submit, pay, or e-verify a return."
    )
  })
  .strict();
export type FilingGuide = z.infer<typeof FilingGuideSchema>;

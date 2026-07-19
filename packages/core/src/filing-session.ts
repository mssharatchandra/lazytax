import { z } from "zod";

const OpaqueSessionRefSchema = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);

export const FilingEvidenceKindSchema = z.enum([
  "form16",
  "ais",
  "tis",
  "form26as",
  "itd_prefill",
  "bank_interest",
  "domestic_broker",
  "foreign_broker",
  "crypto_exchange_or_wallet",
  "house_property",
  "deduction_proof",
  "other"
]);
export type FilingEvidenceKind = z.infer<typeof FilingEvidenceKindSchema>;

export const FilingIncomeCategorySchema = z.enum([
  "salary",
  "interest",
  "dividends",
  "domestic_securities",
  "foreign_assets_or_income",
  "crypto",
  "house_property",
  "business_or_professional",
  "deductions",
  "other"
]);
export type FilingIncomeCategory = z.infer<typeof FilingIncomeCategorySchema>;

export const FilingSessionInputSchema = z
  .object({
    session_ref: OpaqueSessionRefSchema,
    assessment_year: z.literal("2026-27"),
    intent: z.enum(["prepare_only", "file_with_me"]),
    portal_mode: z.enum(["disconnected", "guided_local_browser", "eri"]),
    portal_authenticated_by_user: z.boolean(),
    age_band: z.enum(["unknown", "under_60", "age_60_to_79", "age_80_plus"]),
    residential_status: z.enum([
      "unknown",
      "resident_unspecified",
      "resident_and_ordinarily_resident",
      "resident_but_not_ordinarily_resident",
      "non_resident"
    ]),
    authorized_evidence: z.array(FilingEvidenceKindSchema).max(50),
    present_income_categories: z.array(FilingIncomeCategorySchema).max(20),
    evidence_gaps: z.array(FilingIncomeCategorySchema).max(20),
    documents_extracted: z.boolean(),
    income_categories_classified: z.boolean(),
    residual_user_check_completed: z.boolean(),
    reconciliation_completed: z.boolean(),
    unresolved_material_conflicts: z.number().int().min(0).max(10_000),
    calculation_completed: z.boolean(),
    return_draft_prepared: z.boolean(),
    review_confirmed: z.boolean(),
    submission_confirmed: z.boolean(),
    submission_completed: z.boolean(),
    e_verification_completed: z.boolean()
  })
  .strict()
  .superRefine((value, context) => {
    const present = new Set(value.present_income_categories);
    for (const gap of value.evidence_gaps) {
      if (!present.has(gap)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidence_gaps"],
          message: `Evidence gap ${gap} must also appear in present_income_categories.`
        });
      }
    }
    if (value.portal_mode === "disconnected" && value.portal_authenticated_by_user) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["portal_authenticated_by_user"],
        message: "A disconnected portal cannot have an authenticated user session."
      });
    }
    if (value.submission_completed && !value.submission_confirmed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["submission_completed"],
        message: "Submission cannot be complete without explicit submission confirmation."
      });
    }
    if (value.e_verification_completed && !value.submission_completed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["e_verification_completed"],
        message: "E-verification cannot be complete before submission."
      });
    }
  });
export type FilingSessionInput = z.infer<typeof FilingSessionInputSchema>;

export const FilingActionSchema = z
  .object({
    action_id: z.enum([
      "extract_documents",
      "connect_portal",
      "authenticate_portal",
      "collect_authoritative_sources",
      "classify_income",
      "residual_income_check",
      "collect_missing_evidence",
      "reconcile_sources",
      "resolve_material_conflicts",
      "confirm_profile",
      "calculate_return",
      "prepare_return_draft",
      "review_return",
      "confirm_submission",
      "submit_return",
      "e_verify_return",
      "complete"
    ]),
    owner: z.enum(["agent", "user", "shared"]),
    title: z.string().min(1).max(180),
    reason: z.string().min(1).max(500),
    requires_user_input: z.boolean(),
    requires_consequential_action_approval: z.boolean(),
    blocks_complete_liability_only: z.boolean()
  })
  .strict();
export type FilingAction = z.infer<typeof FilingActionSchema>;

export const FilingSessionPlanSchema = z
  .object({
    schema_version: z.literal("lazytax.filing-session.v1"),
    session_ref: z.string().regex(/^session_[a-f0-9]{16}$/),
    assessment_year: z.literal("2026-27"),
    phase: z.enum([
      "intake",
      "source_collection",
      "discovery",
      "reconciliation",
      "calculation",
      "drafting",
      "review",
      "submission",
      "e_verification",
      "complete"
    ]),
    progress_percent: z.number().int().min(0).max(100),
    next_best_action: FilingActionSchema,
    can_agent_continue_without_user: z.boolean(),
    partial_progress_allowed: z.literal(true),
    authoritative_source_status: z
      .object({
        ais_or_tis_present: z.boolean(),
        form26as_present: z.boolean(),
        itd_prefill_present: z.boolean(),
        collection_complete: z.boolean()
      })
      .strict(),
    open_items: z.array(z.string().min(1).max(300)).max(20),
    questions_for_user: z.array(z.string().min(1).max(500)).max(3),
    security_promises: z.tuple([
      z.literal("Credentials, OTPs, EVCs, private keys and seed phrases never belong in chat or tool inputs."),
      z.literal("The taxpayer authenticates directly in the official portal or approved ERI consent flow."),
      z.literal("Submission, payment and e-verification always require a contextual user approval.")
    ])
  })
  .strict();
export type FilingSessionPlan = z.infer<typeof FilingSessionPlanSchema>;

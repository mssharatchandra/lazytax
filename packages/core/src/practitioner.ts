import { z } from "zod";

export const PractitionerActorReferenceSchema = z
  .string()
  .regex(/^actor_[a-f0-9]{16}$/, "Use a pseudonymous actor_[16 hex] reference; names and contact details are not accepted.");

export const PractitionerCaseReferenceSchema = z
  .string()
  .regex(/^case_[a-f0-9]{16}$/, "Use a pseudonymous case_[16 hex] reference; taxpayer identifiers are not accepted.");

export const SharedCaseRoleSchema = z.enum(["taxpayer", "preparer", "reviewer"]);
export type SharedCaseRole = z.infer<typeof SharedCaseRoleSchema>;

export const PractitionerRoleSchema = z.enum(["preparer", "reviewer"]);
export type PractitionerRole = z.infer<typeof PractitionerRoleSchema>;

export const PractitionerCaseStatusSchema = z.enum([
  "intake",
  "evidence_collection",
  "reconciliation",
  "calculation",
  "preparer_review",
  "reviewer_review",
  "changes_requested",
  "ready_to_file",
  "filed",
  "blocked",
  "closed"
]);
export type PractitionerCaseStatus = z.infer<typeof PractitionerCaseStatusSchema>;

export const PractitionerCasePrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type PractitionerCasePriority = z.infer<typeof PractitionerCasePrioritySchema>;

export const PractitionerReviewStateSchema = z.enum([
  "not_started",
  "preparer_in_progress",
  "awaiting_reviewer",
  "changes_requested",
  "approved"
]);
export type PractitionerReviewState = z.infer<typeof PractitionerReviewStateSchema>;

export const PractitionerBlockerKindSchema = z.enum([
  "none",
  "taxpayer_evidence",
  "taxpayer_decision",
  "portal_access",
  "technical",
  "other_practitioner"
]);
export type PractitionerBlockerKind = z.infer<typeof PractitionerBlockerKindSchema>;

export const SharedTaxCaseSchema = z
  .object({
    case_ref: PractitionerCaseReferenceSchema,
    assessment_year: z.literal("2026-27"),
    role_assignments: z
      .object({
        taxpayer: PractitionerActorReferenceSchema,
        preparer: PractitionerActorReferenceSchema,
        reviewer: PractitionerActorReferenceSchema
      })
      .strict(),
    status: PractitionerCaseStatusSchema,
    priority: PractitionerCasePrioritySchema,
    evidence_item_count: z.number().int().min(0).max(100_000),
    missing_item_count: z.number().int().min(0).max(10_000),
    material_conflict_count: z.number().int().min(0).max(10_000),
    review_state: PractitionerReviewStateSchema,
    blocker_kind: PractitionerBlockerKindSchema
  })
  .strict()
  .superRefine((value, context) => {
    const actors = Object.values(value.role_assignments);
    if (new Set(actors).size !== actors.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["role_assignments"],
        message: "Taxpayer, preparer, and reviewer must use three distinct pseudonymous actor references."
      });
    }
    const terminalOrReady = ["ready_to_file", "filed", "closed"].includes(value.status);
    if (terminalOrReady && (value.missing_item_count > 0 || value.material_conflict_count > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "A ready, filed, or closed case cannot retain missing items or material conflicts."
      });
    }
    if (["ready_to_file", "filed"].includes(value.status) && value.review_state !== "approved") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_state"],
        message: "A ready-to-file or filed case requires approved review state."
      });
    }
    if (
      ["awaiting_reviewer", "approved"].includes(value.review_state) &&
      (value.missing_item_count > 0 || value.material_conflict_count > 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_state"],
        message: "Reviewer handoff or approval requires zero missing items and zero material conflicts."
      });
    }
    if (
      value.review_state === "approved" &&
      !["ready_to_file", "filed", "closed"].includes(value.status)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Approved review state requires ready-to-file, filed, or closed case status."
      });
    }
    if (value.status === "reviewer_review" && value.review_state !== "awaiting_reviewer") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_state"],
        message: "Reviewer-review status requires awaiting_reviewer review state."
      });
    }
    if (value.status === "changes_requested" && value.review_state !== "changes_requested") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_state"],
        message: "Changes-requested status requires changes_requested review state."
      });
    }
    if (value.status === "blocked" && value.blocker_kind === "none") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocker_kind"],
        message: "A blocked case must identify a privacy-safe blocker kind."
      });
    }
    if (value.status !== "blocked" && value.blocker_kind !== "none") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocker_kind"],
        message: "Only a blocked case may carry a blocker kind."
      });
    }
  });
export type SharedTaxCase = z.infer<typeof SharedTaxCaseSchema>;

export const PractitionerQueueInputSchema = z
  .object({
    practitioner_ref: PractitionerActorReferenceSchema,
    acting_roles: z.array(PractitionerRoleSchema).min(1).max(2),
    cases: z.array(SharedTaxCaseSchema).min(1).max(500)
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.acting_roles).size !== value.acting_roles.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acting_roles"],
        message: "acting_roles cannot contain duplicates."
      });
    }
    const caseRefs = value.cases.map((taxCase) => taxCase.case_ref);
    if (new Set(caseRefs).size !== caseRefs.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cases"],
        message: "Each case_ref may appear only once in a practitioner queue request."
      });
    }
  });
export type PractitionerQueueInput = z.infer<typeof PractitionerQueueInputSchema>;

export const PractitionerActionSchema = z
  .object({
    action_id: z.enum([
      "start_intake",
      "request_missing_evidence",
      "resolve_material_conflicts",
      "reconcile_evidence",
      "calculate_case",
      "complete_preparer_review",
      "review_case",
      "address_review_changes",
      "obtain_taxpayer_decision",
      "restore_portal_access",
      "resolve_technical_blocker",
      "await_other_practitioner",
      "await_taxpayer",
      "ready_for_filing_handoff",
      "no_action"
    ]),
    owner: SharedCaseRoleSchema,
    title: z.string().min(1).max(180),
    reason: z.string().min(1).max(500),
    requires_taxpayer_input: z.boolean(),
    is_actionable_for_practitioner: z.boolean()
  })
  .strict();
export type PractitionerAction = z.infer<typeof PractitionerActionSchema>;

export const PractitionerQueueItemSchema = z
  .object({
    queue_rank: z.number().int().positive(),
    case_ref: PractitionerCaseReferenceSchema,
    assigned_role: PractitionerRoleSchema,
    status: PractitionerCaseStatusSchema,
    priority: PractitionerCasePrioritySchema,
    evidence_item_count: z.number().int().nonnegative(),
    missing_item_count: z.number().int().nonnegative(),
    material_conflict_count: z.number().int().nonnegative(),
    review_state: PractitionerReviewStateSchema,
    attention_score: z.number().int().min(0).max(1_000),
    next_best_action: PractitionerActionSchema
  })
  .strict();

export const PractitionerQueueSummarySchema = z
  .object({
    total_input_cases: z.number().int().nonnegative(),
    total_assigned_cases: z.number().int().nonnegative(),
    actionable_now: z.number().int().nonnegative(),
    blocked_by_taxpayer: z.number().int().nonnegative(),
    awaiting_other_practitioner: z.number().int().nonnegative(),
    ready_for_reviewer: z.number().int().nonnegative(),
    approved_or_complete: z.number().int().nonnegative(),
    evidence_items: z.number().int().nonnegative(),
    missing_items: z.number().int().nonnegative(),
    material_conflicts: z.number().int().nonnegative(),
    by_priority: z
      .object({
        urgent: z.number().int().nonnegative(),
        high: z.number().int().nonnegative(),
        normal: z.number().int().nonnegative(),
        low: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();

export const PractitionerQueuePlanSchema = z
  .object({
    schema_version: z.literal("lazytax.practitioner-queue.v1"),
    practitioner_ref: PractitionerActorReferenceSchema,
    acting_roles: z.array(PractitionerRoleSchema).min(1).max(2),
    summary: PractitionerQueueSummarySchema,
    queue: z.array(PractitionerQueueItemSchema).max(500),
    next_best_action: z
      .object({
        case_ref: PractitionerCaseReferenceSchema,
        assigned_role: PractitionerRoleSchema,
        action: PractitionerActionSchema
      })
      .strict()
      .nullable(),
    privacy_boundary: z.literal(
      "Only pseudonymous case and actor references plus operational counts are accepted or returned; no taxpayer names, PAN, Aadhaar, contact details, account identifiers, credentials, document contents, or free-text notes."
    )
  })
  .strict();
export type PractitionerQueuePlan = z.infer<typeof PractitionerQueuePlanSchema>;

import assert from "node:assert/strict";
import test from "node:test";
import {
  PractitionerQueueInputSchema,
  SharedTaxCaseSchema,
  type SharedTaxCase
} from "@lazytax/core";
import { planPractitionerQueue } from "../src/index.js";

const PREPARER = "actor_1111111111111111";
const REVIEWER = "actor_2222222222222222";
const TAXPAYER = "actor_3333333333333333";
const OTHER = "actor_4444444444444444";

function taxCase(overrides: Partial<SharedTaxCase> & Pick<SharedTaxCase, "case_ref">): SharedTaxCase {
  return {
    case_ref: overrides.case_ref,
    assessment_year: "2026-27",
    role_assignments: {
      taxpayer: TAXPAYER,
      preparer: PREPARER,
      reviewer: REVIEWER
    },
    status: "reconciliation",
    priority: "normal",
    evidence_item_count: 5,
    missing_item_count: 0,
    material_conflict_count: 0,
    review_state: "not_started",
    blocker_kind: "none",
    ...overrides
  };
}

test("practitioner queue is role-aware, summarized, and deterministically prioritized", () => {
  const plan = planPractitionerQueue({
    practitioner_ref: PREPARER,
    acting_roles: ["preparer", "reviewer"],
    cases: [
      taxCase({
        case_ref: "case_aaaaaaaaaaaaaaaa",
        priority: "high",
        material_conflict_count: 2
      }),
      taxCase({
        case_ref: "case_bbbbbbbbbbbbbbbb",
        priority: "urgent",
        status: "reviewer_review",
        review_state: "awaiting_reviewer",
        role_assignments: {
          taxpayer: TAXPAYER,
          preparer: OTHER,
          reviewer: PREPARER
        }
      }),
      taxCase({
        case_ref: "case_cccccccccccccccc",
        priority: "urgent",
        status: "blocked",
        blocker_kind: "taxpayer_evidence",
        missing_item_count: 1
      }),
      taxCase({
        case_ref: "case_dddddddddddddddd",
        role_assignments: {
          taxpayer: TAXPAYER,
          preparer: OTHER,
          reviewer: REVIEWER
        }
      })
    ]
  });

  assert.equal(plan.schema_version, "lazytax.practitioner-queue.v1");
  assert.equal(plan.summary.total_input_cases, 4);
  assert.equal(plan.summary.total_assigned_cases, 3);
  assert.equal(plan.summary.actionable_now, 2);
  assert.equal(plan.summary.blocked_by_taxpayer, 1);
  assert.equal(plan.summary.awaiting_other_practitioner, 0);
  assert.equal(plan.summary.ready_for_reviewer, 1);
  assert.equal(plan.summary.evidence_items, 15);
  assert.equal(plan.summary.missing_items, 1);
  assert.equal(plan.summary.material_conflicts, 2);
  assert.deepEqual(plan.summary.by_priority, { urgent: 2, high: 1, normal: 0, low: 0 });
  assert.deepEqual(
    plan.queue.map((item) => [item.case_ref, item.assigned_role, item.next_best_action.action_id]),
    [
      ["case_bbbbbbbbbbbbbbbb", "reviewer", "review_case"],
      ["case_aaaaaaaaaaaaaaaa", "preparer", "resolve_material_conflicts"],
      ["case_cccccccccccccccc", "preparer", "await_taxpayer"]
    ]
  );
  assert.equal(plan.next_best_action?.case_ref, "case_bbbbbbbbbbbbbbbb");
  assert.equal(plan.next_best_action?.action.action_id, "review_case");
  assert.match(plan.privacy_boundary, /no taxpayer names/);

  const repeated = planPractitionerQueue({
    practitioner_ref: PREPARER,
    acting_roles: ["preparer", "reviewer"],
    cases: [
      taxCase({ case_ref: "case_cccccccccccccccc", priority: "urgent", status: "blocked", blocker_kind: "taxpayer_evidence", missing_item_count: 1 }),
      taxCase({ case_ref: "case_aaaaaaaaaaaaaaaa", priority: "high", material_conflict_count: 2 }),
      taxCase({
        case_ref: "case_bbbbbbbbbbbbbbbb",
        priority: "urgent",
        status: "reviewer_review",
        review_state: "awaiting_reviewer",
        role_assignments: { taxpayer: TAXPAYER, preparer: OTHER, reviewer: PREPARER }
      })
    ]
  });
  assert.deepEqual(repeated.queue, plan.queue);
});

test("practitioner schemas reject PII-shaped references and inconsistent case states", () => {
  const validCase = taxCase({ case_ref: "case_eeeeeeeeeeeeeeee" });
  assert.equal(
    PractitionerQueueInputSchema.safeParse({
      practitioner_ref: "Sharat",
      acting_roles: ["preparer"],
      cases: [validCase]
    }).success,
    false
  );
  assert.equal(
    SharedTaxCaseSchema.safeParse({
      ...validCase,
      case_ref: "ABCDE1234F"
    }).success,
    false
  );
  assert.equal(
    SharedTaxCaseSchema.safeParse({
      ...validCase,
      status: "ready_to_file",
      review_state: "approved",
      missing_item_count: 1
    }).success,
    false
  );
  assert.equal(
    SharedTaxCaseSchema.safeParse({
      ...validCase,
      status: "reviewer_review",
      review_state: "awaiting_reviewer",
      material_conflict_count: 1
    }).success,
    false
  );
  assert.equal(
    SharedTaxCaseSchema.safeParse({
      ...validCase,
      role_assignments: {
        taxpayer: TAXPAYER,
        preparer: PREPARER,
        reviewer: PREPARER
      }
    }).success,
    false
  );
});

test("queue returns no cross-role work when the practitioner is not assigned", () => {
  const plan = planPractitionerQueue({
    practitioner_ref: OTHER,
    acting_roles: ["reviewer"],
    cases: [taxCase({ case_ref: "case_ffffffffffffffff" })]
  });
  assert.equal(plan.summary.total_input_cases, 1);
  assert.equal(plan.summary.total_assigned_cases, 0);
  assert.deepEqual(plan.queue, []);
  assert.equal(plan.next_best_action, null);
});

test("terminal cases remain visible but never become practitioner work", () => {
  const plan = planPractitionerQueue({
    practitioner_ref: PREPARER,
    acting_roles: ["preparer"],
    cases: [
      taxCase({
        case_ref: "case_1234567890abcdef",
        status: "closed",
        priority: "urgent"
      }),
      taxCase({
        case_ref: "case_abcdef1234567890",
        status: "calculation",
        priority: "low"
      })
    ]
  });
  assert.equal(plan.queue[0]?.case_ref, "case_abcdef1234567890");
  assert.equal(plan.queue[1]?.attention_score, 0);
  assert.equal(plan.queue[1]?.next_best_action.is_actionable_for_practitioner, false);
  assert.equal(plan.summary.actionable_now, 1);
  assert.equal(plan.next_best_action?.case_ref, "case_abcdef1234567890");
});

import assert from "node:assert/strict";
import test from "node:test";
import type { FilingSessionInput } from "@lazytax/core";
import { planFilingSession } from "../src/index.js";

const baseSession: FilingSessionInput = {
  session_ref: "private-filing-session",
  assessment_year: "2026-27",
  intent: "file_with_me",
  portal_mode: "disconnected",
  portal_authenticated_by_user: false,
  age_band: "unknown",
  residential_status: "resident_unspecified",
  authorized_evidence: ["form16"],
  present_income_categories: ["salary"],
  evidence_gaps: [],
  documents_extracted: false,
  income_categories_classified: false,
  residual_user_check_completed: false,
  reconciliation_completed: false,
  unresolved_material_conflicts: 0,
  calculation_completed: false,
  return_draft_prepared: false,
  review_confirmed: false,
  submission_confirmed: false,
  submission_completed: false,
  e_verification_completed: false
};

test("filing planner completes safe work before asking the taxpayer", () => {
  const intake = planFilingSession(baseSession);
  assert.equal(intake.next_best_action.action_id, "extract_documents");
  assert.equal(intake.next_best_action.owner, "agent");
  assert.equal(intake.can_agent_continue_without_user, true);
  assert.deepEqual(intake.questions_for_user, []);
  assert.match(intake.session_ref, /^session_[a-f0-9]{16}$/);

  const sourceCollection = planFilingSession({ ...baseSession, documents_extracted: true });
  assert.equal(sourceCollection.next_best_action.action_id, "connect_portal");
  assert.equal(sourceCollection.next_best_action.blocks_complete_liability_only, true);
  assert.equal(sourceCollection.partial_progress_allowed, true);
  assert.equal(sourceCollection.questions_for_user.length, 1);

  const authenticated = planFilingSession({
    ...baseSession,
    documents_extracted: true,
    portal_mode: "guided_local_browser",
    portal_authenticated_by_user: true
  });
  assert.equal(authenticated.next_best_action.action_id, "collect_authoritative_sources");
  assert.equal(authenticated.can_agent_continue_without_user, true);
});

test("filing planner asks one residual check only after authoritative collection and classification", () => {
  const result = planFilingSession({
    ...baseSession,
    authorized_evidence: ["form16", "ais", "form26as", "itd_prefill"],
    documents_extracted: true,
    income_categories_classified: true
  });
  assert.equal(result.phase, "discovery");
  assert.equal(result.next_best_action.action_id, "residual_income_check");
  assert.equal(result.questions_for_user.length, 1);
  assert.match(result.questions_for_user[0]!, /private crypto wallet/);
});

test("filing planner reserves approvals for review, submission and e-verification", () => {
  const ready = {
    ...baseSession,
    portal_mode: "guided_local_browser" as const,
    portal_authenticated_by_user: true,
    age_band: "under_60" as const,
    residential_status: "resident_and_ordinarily_resident" as const,
    authorized_evidence: ["form16", "ais", "form26as", "itd_prefill"] as FilingSessionInput["authorized_evidence"],
    documents_extracted: true,
    income_categories_classified: true,
    residual_user_check_completed: true,
    reconciliation_completed: true,
    calculation_completed: true,
    return_draft_prepared: true,
    review_confirmed: true
  };
  const confirm = planFilingSession(ready);
  assert.equal(confirm.next_best_action.action_id, "confirm_submission");
  assert.equal(confirm.next_best_action.requires_consequential_action_approval, true);

  const noRail = planFilingSession({
    ...ready,
    portal_mode: "disconnected",
    portal_authenticated_by_user: false,
    submission_confirmed: true
  });
  assert.equal(noRail.next_best_action.action_id, "connect_portal");
  assert.equal(noRail.next_best_action.requires_consequential_action_approval, true);

  const submit = planFilingSession({ ...ready, submission_confirmed: true });
  assert.equal(submit.next_best_action.action_id, "submit_return");
  assert.equal(submit.next_best_action.requires_consequential_action_approval, true);

  const verify = planFilingSession({
    ...ready,
    submission_confirmed: true,
    submission_completed: true
  });
  assert.equal(verify.next_best_action.action_id, "e_verify_return");
  assert.equal(verify.next_best_action.owner, "user");
});

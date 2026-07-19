import {
  type PractitionerAction,
  type PractitionerCasePriority,
  type PractitionerQueueInput,
  PractitionerQueueInputSchema,
  type PractitionerQueuePlan,
  PractitionerQueuePlanSchema,
  type PractitionerRole,
  type SharedTaxCase
} from "@lazytax/core";

const PRIORITY_SCORE: Record<PractitionerCasePriority, number> = {
  urgent: 400,
  high: 300,
  normal: 200,
  low: 100
};

function assignedRole(
  taxCase: SharedTaxCase,
  practitionerRef: string,
  actingRoles: ReadonlySet<PractitionerRole>
): PractitionerRole | undefined {
  if (taxCase.role_assignments.preparer === practitionerRef && actingRoles.has("preparer")) {
    return "preparer";
  }
  if (taxCase.role_assignments.reviewer === practitionerRef && actingRoles.has("reviewer")) {
    return "reviewer";
  }
  return undefined;
}

function action(
  assigned: PractitionerRole,
  actionId: PractitionerAction["action_id"],
  owner: PractitionerAction["owner"],
  title: string,
  reason: string,
  requiresTaxpayerInput = false
): PractitionerAction {
  return {
    action_id: actionId,
    owner,
    title,
    reason,
    requires_taxpayer_input: requiresTaxpayerInput,
    is_actionable_for_practitioner: actionId !== "no_action" && owner === assigned
  };
}

function nextCaseAction(taxCase: SharedTaxCase, assigned: PractitionerRole): PractitionerAction {
  if (taxCase.status === "blocked") {
    if (taxCase.blocker_kind === "taxpayer_evidence") {
      return action(
        assigned,
        "await_taxpayer",
        "taxpayer",
        "Await requested taxpayer evidence",
        "The case cannot advance until the already-requested evidence is supplied through an authorized channel.",
        true
      );
    }
    if (taxCase.blocker_kind === "taxpayer_decision") {
      return action(
        assigned,
        "obtain_taxpayer_decision",
        "taxpayer",
        "Obtain the outstanding taxpayer decision",
        "A taxpayer-controlled judgment or approval is the current blocking dependency.",
        true
      );
    }
    if (taxCase.blocker_kind === "portal_access") {
      return action(
        assigned,
        "restore_portal_access",
        "taxpayer",
        "Restore taxpayer-controlled portal access",
        "Authentication and OTP handling must remain with the taxpayer at the official origin.",
        true
      );
    }
    if (taxCase.blocker_kind === "other_practitioner") {
      const owner = assigned === "preparer" ? "reviewer" : "preparer";
      return action(
        assigned,
        "await_other_practitioner",
        owner,
        "Await the other assigned practitioner",
        "The next case transition belongs to the other assigned practitioner."
      );
    }
    return action(
      assigned,
      "resolve_technical_blocker",
      assigned,
      "Resolve the operational blocker",
      "A privacy-safe technical blocker is recorded and can be investigated without taxpayer document contents."
    );
  }

  if (taxCase.status === "filed" || taxCase.status === "closed") {
    return action(
      assigned,
      "no_action",
      assigned,
      "No practitioner action required",
      "The case is already filed or closed."
    );
  }
  if (taxCase.material_conflict_count > 0) {
    return action(
      assigned,
      "resolve_material_conflicts",
      "preparer",
      `Resolve ${taxCase.material_conflict_count} material conflict${taxCase.material_conflict_count === 1 ? "" : "s"}`,
      "Material source conflicts must be resolved or explicitly escalated before review can be completed."
    );
  }
  if (taxCase.review_state === "changes_requested") {
    return action(
      assigned,
      "address_review_changes",
      "preparer",
      "Address reviewer-requested changes",
      "The independent review identified changes that must return to the preparer before approval."
    );
  }
  if (taxCase.missing_item_count > 0) {
    return action(
      assigned,
      "request_missing_evidence",
      "preparer",
      `Collect ${taxCase.missing_item_count} missing item${taxCase.missing_item_count === 1 ? "" : "s"}`,
      "Known evidence gaps block a complete case; request only the missing categories through an authorized channel.",
      true
    );
  }
  if (taxCase.review_state === "awaiting_reviewer") {
    return action(
      assigned,
      "review_case",
      "reviewer",
      "Perform independent case review",
      "The preparer work is complete and the case is waiting for its assigned reviewer."
    );
  }
  if (taxCase.status === "intake" || taxCase.status === "evidence_collection") {
    return action(
      assigned,
      "start_intake",
      "preparer",
      "Advance case intake and evidence inventory",
      "The preparer should establish the evidence inventory and identify missing categories before calculation."
    );
  }
  if (taxCase.status === "reconciliation") {
    return action(
      assigned,
      "reconcile_evidence",
      "preparer",
      "Reconcile the collected evidence",
      "The source inventory is ready for deterministic reconciliation and duplicate/conflict checks."
    );
  }
  if (taxCase.status === "calculation") {
    return action(
      assigned,
      "calculate_case",
      "preparer",
      "Run the supported deterministic calculation",
      "Evidence is complete and reconciled, so the calculation can proceed."
    );
  }
  if (taxCase.status === "preparer_review" || taxCase.review_state === "preparer_in_progress") {
    return action(
      assigned,
      "complete_preparer_review",
      "preparer",
      "Complete preparer review and hand off",
      "The preparer must finish source-linked checks before independent reviewer handoff."
    );
  }
  if (taxCase.status === "ready_to_file" || taxCase.review_state === "approved") {
    return action(
      assigned,
      "ready_for_filing_handoff",
      "preparer",
      "Present the approved case for taxpayer-controlled filing",
      "Review is approved; filing, payment, and verification remain separate taxpayer-controlled actions.",
      true
    );
  }
  return action(
    assigned,
    "complete_preparer_review",
    "preparer",
    "Begin preparer review",
    "The evidence and calculation are ready for preparer-level source and reasonableness checks."
  );
}

function attentionScore(
  taxCase: SharedTaxCase,
  nextAction: PractitionerAction
): number {
  if (nextAction.action_id === "no_action") return 0;
  const actionScore: Record<PractitionerAction["action_id"], number> = {
    resolve_material_conflicts: 95,
    address_review_changes: 90,
    review_case: 85,
    request_missing_evidence: 80,
    resolve_technical_blocker: 75,
    complete_preparer_review: 70,
    calculate_case: 65,
    reconcile_evidence: 60,
    start_intake: 55,
    ready_for_filing_handoff: 50,
    obtain_taxpayer_decision: 45,
    restore_portal_access: 40,
    await_taxpayer: 35,
    await_other_practitioner: 30,
    no_action: 0
  };
  const actionableBoost = nextAction.is_actionable_for_practitioner ? 200 : 0;
  return (
    PRIORITY_SCORE[taxCase.priority] +
    actionableBoost +
    actionScore[nextAction.action_id] +
    Math.min(20, taxCase.missing_item_count) +
    Math.min(50, taxCase.material_conflict_count * 5)
  );
}

export function planPractitionerQueue(inputValue: PractitionerQueueInput): PractitionerQueuePlan {
  const input = PractitionerQueueInputSchema.parse(inputValue);
  const actingRoles = new Set(input.acting_roles);
  const planned = input.cases.flatMap((taxCase) => {
    const assigned = assignedRole(taxCase, input.practitioner_ref, actingRoles);
    if (!assigned) return [];
    const nextBestAction = nextCaseAction(taxCase, assigned);
    return [
      {
        taxCase,
        assigned,
        nextBestAction,
        attentionScore: attentionScore(taxCase, nextBestAction)
      }
    ];
  });

  planned.sort(
    (left, right) =>
      right.attentionScore - left.attentionScore ||
      left.taxCase.case_ref.localeCompare(right.taxCase.case_ref)
  );
  const queue = planned.map((item, index) => ({
    queue_rank: index + 1,
    case_ref: item.taxCase.case_ref,
    assigned_role: item.assigned,
    status: item.taxCase.status,
    priority: item.taxCase.priority,
    evidence_item_count: item.taxCase.evidence_item_count,
    missing_item_count: item.taxCase.missing_item_count,
    material_conflict_count: item.taxCase.material_conflict_count,
    review_state: item.taxCase.review_state,
    attention_score: item.attentionScore,
    next_best_action: item.nextBestAction
  }));
  const firstActionable = queue.find((item) => item.next_best_action.is_actionable_for_practitioner);

  const priorityCounts = { urgent: 0, high: 0, normal: 0, low: 0 };
  for (const item of planned) priorityCounts[item.taxCase.priority] += 1;
  return PractitionerQueuePlanSchema.parse({
    schema_version: "lazytax.practitioner-queue.v1",
    practitioner_ref: input.practitioner_ref,
    acting_roles: input.acting_roles,
    summary: {
      total_input_cases: input.cases.length,
      total_assigned_cases: planned.length,
      actionable_now: planned.filter((item) => item.nextBestAction.is_actionable_for_practitioner).length,
      blocked_by_taxpayer: planned.filter((item) => item.nextBestAction.owner === "taxpayer").length,
      awaiting_other_practitioner: planned.filter(
        (item) =>
          (item.nextBestAction.owner === "preparer" || item.nextBestAction.owner === "reviewer") &&
          item.nextBestAction.owner !== item.assigned
      ).length,
      ready_for_reviewer: planned.filter(
        (item) => item.taxCase.review_state === "awaiting_reviewer"
      ).length,
      approved_or_complete: planned.filter(
        (item) =>
          item.taxCase.review_state === "approved" ||
          item.taxCase.status === "filed" ||
          item.taxCase.status === "closed"
      ).length,
      evidence_items: planned.reduce((sum, item) => sum + item.taxCase.evidence_item_count, 0),
      missing_items: planned.reduce((sum, item) => sum + item.taxCase.missing_item_count, 0),
      material_conflicts: planned.reduce(
        (sum, item) => sum + item.taxCase.material_conflict_count,
        0
      ),
      by_priority: priorityCounts
    },
    queue,
    next_best_action: firstActionable
      ? {
          case_ref: firstActionable.case_ref,
          assigned_role: firstActionable.assigned_role,
          action: firstActionable.next_best_action
        }
      : null,
    privacy_boundary:
      "Only pseudonymous case and actor references plus operational counts are accepted or returned; no taxpayer names, PAN, Aadhaar, contact details, account identifiers, credentials, document contents, or free-text notes."
  });
}

import { createHmac, randomBytes } from "node:crypto";
import {
  type FilingAction,
  type FilingIncomeCategory,
  type FilingSessionInput,
  FilingSessionInputSchema,
  type FilingSessionPlan,
  FilingSessionPlanSchema
} from "@lazytax/core";

const SESSION_KEY = randomBytes(32);

function sessionToken(value: string): string {
  return `session_${createHmac("sha256", SESSION_KEY)
    .update(value)
    .digest("hex")
    .slice(0, 16)}`;
}

function action(
  actionId: FilingAction["action_id"],
  owner: FilingAction["owner"],
  title: string,
  reason: string,
  options: {
    readonly requiresUserInput?: boolean;
    readonly requiresApproval?: boolean;
    readonly blocksCompleteLiabilityOnly?: boolean;
  } = {}
): FilingAction {
  return {
    action_id: actionId,
    owner,
    title,
    reason,
    requires_user_input: options.requiresUserInput ?? owner !== "agent",
    requires_consequential_action_approval: options.requiresApproval ?? false,
    blocks_complete_liability_only: options.blocksCompleteLiabilityOnly ?? false
  };
}

function missingAuthoritativeSources(input: FilingSessionInput): string[] {
  const present = new Set(input.authorized_evidence);
  const missing: string[] = [];
  if (!present.has("ais") && !present.has("tis")) missing.push("AIS/TIS");
  if (!present.has("form26as")) missing.push("Form 26AS");
  if (!present.has("itd_prefill")) missing.push("Income Tax prefill");
  return missing;
}

function evidenceGapLabels(categories: readonly FilingIncomeCategory[]): string[] {
  const labels: Record<FilingIncomeCategory, string> = {
    salary: "salary evidence",
    interest: "bank interest evidence",
    dividends: "dividend evidence",
    domestic_securities: "domestic broker tax report",
    foreign_assets_or_income: "foreign broker/account evidence",
    crypto: "exchange and self-custody wallet history",
    house_property: "rent/home-loan/property evidence",
    business_or_professional: "business or freelance books/evidence",
    deductions: "deduction proofs",
    other: "other income evidence"
  };
  return [...new Set(categories)].map((category) => labels[category]);
}

export function planFilingSession(inputValue: FilingSessionInput): FilingSessionPlan {
  const input = FilingSessionInputSchema.parse(inputValue);
  const evidence = new Set(input.authorized_evidence);
  const missingSources = missingAuthoritativeSources(input);
  const authoritativeStatus = {
    ais_or_tis_present: evidence.has("ais") || evidence.has("tis"),
    form26as_present: evidence.has("form26as"),
    itd_prefill_present: evidence.has("itd_prefill"),
    collection_complete: missingSources.length === 0
  };
  const openItems: string[] = [];
  const questions: string[] = [];
  let phase: FilingSessionPlan["phase"] = "intake";
  let nextAction: FilingAction;

  if (!input.documents_extracted && input.authorized_evidence.length > 0) {
    nextAction = action(
      "extract_documents",
      "agent",
      "Extract and consolidate the authorized documents",
      "Useful work can continue immediately without asking the taxpayer to retype document facts."
    );
    openItems.push("Document extraction and duplicate detection");
  } else if (missingSources.length > 0) {
    phase = "source_collection";
    openItems.push(`Collect ${missingSources.join(", ")}`);
    if (input.portal_mode === "disconnected") {
      nextAction = action(
        "connect_portal",
        "shared",
        "Connect the official Income Tax source flow",
        "AIS/TIS, Form 26AS and prefill should be collected before asking the taxpayer to remember every possible income item.",
        { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
      );
      questions.push(
        "Please open the official Income Tax portal in the guided local browser and sign in yourself; do not paste your password or OTP into chat."
      );
    } else if (!input.portal_authenticated_by_user) {
      nextAction = action(
        "authenticate_portal",
        "user",
        "Sign in directly on the official portal",
        "The taxpayer must authenticate at the official origin; LazyTax must not receive or retain credentials or OTPs.",
        { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
      );
      questions.push(
        "Sign in in the portal window and tell me when the dashboard is visible; keep the password and OTP inside that window."
      );
    } else {
      nextAction = action(
        "collect_authoritative_sources",
        "agent",
        `Collect ${missingSources.join(", ")}`,
        "The authenticated, user-authorized source can supply likely income and credit records without manual retyping.",
        { blocksCompleteLiabilityOnly: true }
      );
    }
  } else if (!input.income_categories_classified) {
    phase = "discovery";
    nextAction = action(
      "classify_income",
      "agent",
      "Classify income and filing schedules from collected evidence",
      "The agent should exhaust authoritative evidence before asking residual questions."
    );
    openItems.push("Income-head classification from collected sources");
  } else if (!input.residual_user_check_completed) {
    phase = "discovery";
    nextAction = action(
      "residual_income_check",
      "user",
      "Confirm only income that authoritative sources may miss",
      "AIS and prefill may be incomplete for private wallets, overseas accounts, cash/property activity, freelance work and privately paid deductions.",
      { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
    );
    questions.push(
      "Outside the collected records, did you have any private crypto wallet or exchange, foreign account/RSU, freelance or business income, house property or rent, or deduction proof? Reply ‘none’ or list only the categories that apply."
    );
    openItems.push("Residual income and deduction confirmation");
  } else if (input.evidence_gaps.length > 0) {
    phase = "source_collection";
    const labels = evidenceGapLabels(input.evidence_gaps);
    nextAction = action(
      "collect_missing_evidence",
      "shared",
      `Collect ${labels.join(", ")}`,
      "These categories are known to exist but still lack enough evidence for a complete calculation.",
      { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
    );
    questions.push(`Please connect or attach: ${labels.join(", ")}. I will extract the details; do not retype every transaction.`);
    openItems.push(...labels.map((label) => `Missing ${label}`));
  } else if (!input.reconciliation_completed) {
    phase = "reconciliation";
    nextAction = action(
      "reconcile_sources",
      "agent",
      "Reconcile all collected sources",
      "Duplicate documents, double-counted deductions and conflicting source totals can be resolved or isolated before calculation."
    );
    openItems.push("Source reconciliation");
  } else if (input.unresolved_material_conflicts > 0) {
    phase = "reconciliation";
    nextAction = action(
      "resolve_material_conflicts",
      "shared",
      `Resolve ${input.unresolved_material_conflicts} material conflict${input.unresolved_material_conflicts === 1 ? "" : "s"}`,
      "Only material source conflicts that cannot be resolved from stronger evidence need taxpayer judgment.",
      { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
    );
    questions.push("Review the grouped material conflicts and confirm the correct source or amount for each highlighted item.");
    openItems.push(`${input.unresolved_material_conflicts} material reconciliation conflict(s)`);
  } else if (input.age_band === "unknown" || input.residential_status === "unknown" || input.residential_status === "resident_unspecified") {
    phase = "calculation";
    nextAction = action(
      "confirm_profile",
      "user",
      "Confirm the remaining tax-profile facts",
      "Age band and precise residential status can change tax rules and foreign-income reporting.",
      { requiresUserInput: true, blocksCompleteLiabilityOnly: true }
    );
    if (input.age_band === "unknown") questions.push("What was your age on 31 March 2026?");
    if (input.residential_status === "unknown" || input.residential_status === "resident_unspecified") {
      questions.push("Were you Resident and Ordinarily Resident, Resident but Not Ordinarily Resident, or Non-Resident for FY 2025-26?");
    }
    openItems.push("Taxpayer age/residential-status confirmation");
  } else if (!input.calculation_completed) {
    phase = "calculation";
    nextAction = action(
      "calculate_return",
      "agent",
      "Calculate the supported return and compare regimes",
      "The evidence and material profile facts are ready for deterministic calculation."
    );
    openItems.push("Deterministic tax calculation");
  } else if (!input.return_draft_prepared) {
    phase = "drafting";
    nextAction = action(
      "prepare_return_draft",
      "agent",
      "Prepare the ITR draft and proof-linked review",
      "A draft should be assembled before asking the taxpayer for filing approval."
    );
    openItems.push("ITR draft and schedule review");
  } else if (!input.review_confirmed) {
    phase = "review";
    nextAction = action(
      "review_return",
      "shared",
      "Review the completed return draft",
      "The taxpayer should see income, deductions, credits, regime, balance/refund and open caveats together before submission.",
      { requiresUserInput: true }
    );
    questions.push("Please review the draft summary and flag anything that looks unfamiliar; I will explain every number from its source.");
    openItems.push("Taxpayer review of the ITR draft");
  } else if (input.intent === "prepare_only") {
    phase = "complete";
    nextAction = action(
      "complete",
      "agent",
      "Preparation complete",
      "The requested reviewed draft is complete; no government submission was requested."
    );
  } else if (!input.submission_confirmed) {
    phase = "submission";
    nextAction = action(
      "confirm_submission",
      "user",
      "Approve submission of this exact return draft",
      "Submission is consequential and requires a distinct approval tied to the reviewed draft.",
      { requiresUserInput: true, requiresApproval: true }
    );
    questions.push("Do you approve submitting this exact reviewed draft to the Income Tax Department?");
    openItems.push("Explicit submission approval");
  } else if (input.portal_mode === "disconnected") {
    phase = "submission";
    nextAction = action(
      "connect_portal",
      "shared",
      "Connect an authorized filing rail",
      "The draft is approved, but LazyTax cannot submit without a supported user-supervised portal or registered ERI connection.",
      { requiresUserInput: true, requiresApproval: true }
    );
    questions.push("Open the official Income Tax portal in the guided local browser and sign in yourself; keep the password and OTP out of chat.");
    openItems.push("Authorized filing-rail connection");
  } else if (!input.portal_authenticated_by_user) {
    phase = "submission";
    nextAction = action(
      "authenticate_portal",
      "user",
      "Authenticate directly with the filing rail",
      "The taxpayer must authenticate or complete the official ERI consent flow before the approved draft can be submitted.",
      { requiresUserInput: true, requiresApproval: true }
    );
    questions.push("Authenticate in the official portal or ERI consent window and tell me when the filing session is ready; do not paste credentials or OTPs into chat.");
    openItems.push("Taxpayer authentication or ERI consent");
  } else if (!input.submission_completed) {
    phase = "submission";
    nextAction = action(
      "submit_return",
      "agent",
      "Submit the approved return through the authorized filing rail",
      "The taxpayer approved this exact draft; the action must still use a supported guided-browser or ERI rail.",
      { requiresApproval: true }
    );
    openItems.push("Government submission");
  } else if (!input.e_verification_completed) {
    phase = "e_verification";
    nextAction = action(
      "e_verify_return",
      "user",
      "Complete e-verification on the official portal",
      "The taxpayer must control the OTP, EVC, DSC or other official verification method.",
      { requiresUserInput: true, requiresApproval: true }
    );
    questions.push("Complete e-verification in the official portal window; keep the OTP/EVC out of chat, then confirm when the acknowledgement appears.");
    openItems.push("Taxpayer e-verification and acknowledgement");
  } else {
    phase = "complete";
    nextAction = action(
      "complete",
      "agent",
      "Filing journey complete",
      "Submission and taxpayer-controlled e-verification are recorded as complete."
    );
  }

  const phaseProgress: Record<FilingSessionPlan["phase"], number> = {
    intake: 10,
    source_collection: 25,
    discovery: 40,
    reconciliation: 55,
    calculation: 70,
    drafting: 80,
    review: 88,
    submission: 94,
    e_verification: 98,
    complete: 100
  };

  return FilingSessionPlanSchema.parse({
    schema_version: "lazytax.filing-session.v1",
    session_ref: sessionToken(input.session_ref),
    assessment_year: "2026-27",
    phase,
    progress_percent: phaseProgress[phase],
    next_best_action: nextAction,
    can_agent_continue_without_user: !nextAction.requires_user_input,
    partial_progress_allowed: true,
    authoritative_source_status: authoritativeStatus,
    open_items: openItems,
    questions_for_user: questions,
    security_promises: [
      "Credentials, OTPs, EVCs, private keys and seed phrases never belong in chat or tool inputs.",
      "The taxpayer authenticates directly in the official portal or approved ERI consent flow.",
      "Submission, payment and e-verification always require a contextual user approval."
    ]
  });
}

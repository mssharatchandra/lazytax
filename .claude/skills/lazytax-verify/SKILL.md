---
name: lazytax-verify
description: Definition-of-Done checklist and verification protocol for every LazyTax ticket/PR. Fable (PM) runs this on every review; implementing agents run it before requesting review.
---

# LazyTax DoD & verification protocol

A ticket is **Done** only when every line below is checked with evidence in the PR. "Code written" is not a state we recognize.

## Universal checklist (every PR)
- [ ] `pnpm -F <pkg> typecheck && lint && test` output pasted — green, no skipped tests without a linked ticket.
- [ ] Stayed in-package: diff touches only the owning package + its tests (grep the diff paths). Cross-package = reject, split the PR.
- [ ] No contract drift: `packages/core` untouched, or the PR carries the contract-change flag + DECISIONS.md entry + PM sign-off.
- [ ] Acceptance criteria from TICKETS.md quoted and individually evidenced (output, screenshot, or recording).
- [ ] New user-facing surface ⇒ `lz_*` events added per `lazytax-analytics` skill, listed in PR.
- [ ] PII sweep: no PAN/Aadhaar/email in fixtures, logs, analytics payloads, or screenshots (`git grep -E '[A-Z]{5}[0-9]{4}[A-Z]'` on the diff).
- [ ] No bare floats for currency; `Money` used for every displayed/stored amount.
- [ ] Conventional commit; ticket linked; README of the package updated if public API changed.

## Package-specific gates
| Package | Extra gate |
|---|---|
| engine | Golden suite green; branch coverage ≥95%; new tax logic has a named test per trap case touched (see `itr-ay2026-27-rules`); zero I/O imports (lint rule). |
| ingest | Fixture accuracy ≥98% overall and not regressed per-field; new real-world failure ⇒ new scrubbed fixture + regression test in same PR. |
| agent | `pnpm -F agent eval` ≥90% tool accuracy, 100% guardrails; prompt changes include before/after eval report; no tool bypasses Zod validation. |
| itr-json | Schema validation green; snapshot diffs explained line-by-line in PR; determinism test (same profile ⇒ identical bytes). |
| filing | Contract tests green against recorded Sandbox responses; no provider types exported. |
| web | e2e green; screenshots light+dark, mobile+desktop; Lighthouse a11y ≥95 on new pages; events verified in PostHog debugger. |
| db | Migration up+down tested; encryption round-trip test for any new PII column; delete-cascade covered. |

## Reviewer (Fable) protocol
1. Read ticket AC → read diff → run the universal checklist against evidence, not claims.
2. Boundary check (rule 1), contract check (rule 2), determinism check (rule 3/8 of CLAUDE.md).
3. One round of findings max where possible: batch all findings, ranked by severity, each with file:line.
4. Merge only when: CI green + checklist complete + no unexplained snapshot/golden diffs.
5. Append notable gotchas to DECISIONS.md ("what didn't work" is memory, not noise).

## Escalation triggers (stop and flag to Sharat)
- Any request to weaken a gate (coverage, eval threshold, fixture accuracy).
- Engine-vs-Sandbox calculator mismatch that isn't a documented Sandbox bug.
- Anything touching real user PII outside the encrypted path.
- Scope creep beyond PLAN.md Wave 1 before Jul 31.

# DECISIONS.md — LazyTax persistent memory

> Append-only. Every agent reads this at session start and appends at session end.
> Format: `## YYYY-MM-DD · <who> · <topic>` then decision / gotcha / what-didn't-work.

## 2026-07-19 · Fable (PM) · Scope lock v1.0
- All D1–D10 decisions locked; see PLAN.md §13. Open: D11 (extraction model tiering — after evals), D12 (domain/TM — Sharat), D13 (PostHog region/masking — LZ-19).
- Verify-before-lock flag: surcharge cap on capital-gains income (15% vs 25%) — engine owner (LZ-4/5) must confirm against ITD calculator and update `itr-ay2026-27-rules` skill.
- Linear MCP not connected in planning session; tickets live in TICKETS.md pending import to team CUR.

## 2026-07-19 · Codex · Security + multi-interface MVP update
- The standalone web app remains the canonical consent, case, review and filing-handoff surface. LazyTax MCP, Codex and Claude Code clients moved into MVP as thin capability-scoped experiments; none may calculate independently or file/submit.
- Security posture is “DPDP-ready” until qualified Indian counsel approves stronger public wording. LZ-47–LZ-59 add data mapping, consent/rights, encryption/KMS, model egress, retention/deletion, vendor governance, canonical audit API, client adapters, incident response and release gates.
- Linear project is connected through the signed-in workspace and synchronized: project scope increased from 46 to 59 issues across W0/W1/W2/W3.
- Channel winner will be selected using verified Tax Proof Pack/JSON completion, trust, error, support and privacy guardrails—not installs or message volume.

## 2026-07-19 · Codex · Build Week plugin-first scope override
- Build Week submission is now `LazyTax for Codex` in Apps for Your Life: an installable plugin, verification skill, local stdio MCP server, deterministic narrow engine, three synthetic evidence sources, Tax Proof Pack, evals and judge/demo path.
- Supported public-demo profile is AY 2026-27 resident individual with one salary source, savings interest/dividends and domestic listed-equity gains. Unsupported profiles fail closed.
- Standalone web, Claude Code plugin, real PDF ingestion, broad ITR coverage and filing/ERI are deferred until after submission. The minimal viewer exists only to inspect evidence and proof-pack output.
- GPT-5.6 is the host reasoning/explanation layer; typed deterministic tools own all calculations. The product prepares/verifies and does not submit returns.

## 2026-07-19 · Codex agent team · Build Week MVP implementation
- Plugin, verification skill, repo marketplace, local stdio launcher, core schemas, deterministic engine, four MCP tools, three synthetic fixtures, ten read-only evals, evidence viewer, judge guide and 2:55 demo script are implemented.
- End-to-end public-tool smoke passes: 3 fixtures → 5 supported evidence records + 7 warnings → unresolved ₹40,000 salary spread → explicit ₹18,40,000 confirmation → ₹1,72,328 new-regime estimate / ₹3,78,612 old-regime estimate → SHA-256 Tax Proof Pack.
- Plugin and skill validators pass; real stdio handshake through the plugin launcher exposes exactly the four documented tools. Root `npm run check` passes.
- Remaining human-owned release items: record/upload the public video, capture the `/feedback` session ID, choose public/private repository submission path, and complete the Devpost form.
- Installation testing found and fixed a cache-boundary issue: Codex copies plugins into its cache, so the bundle can no longer depend on repository-relative packages. `npm run build` now embeds the MCP server and three fixtures inside the plugin; a real stdio smoke test passes from the installed cache path.

## 2026-07-19 · Codex · Production analytics, publication and coverage strategy
- The Build Week local plugin remains zero-telemetry and local-first. PostHog is approved only as a future opt-in hosted-product destination through a first-party allowlisting gateway; no autocapture, session replay, person profiles, PII, IP/GeoIP, case/evidence identifiers, tax categories, amounts, outcomes, prompts or free text.
- Public distribution is sequenced as skills-only submission first, then an app-plus-skills submission after a production HTTPS MCP endpoint, verified publisher/domain, public legal/support pages, authentication, CSP, reviewer access and security gates exist.
- LazyTax will not claim “all Indian tax laws.” The near-term right to win is more proof per supported personal-income-tax filing: source-linked claims, conflict-first reconciliation, deterministic rupee calculations, portable proof packs, user-chosen agent interfaces and privacy-minimized processing.
- ClearTax breadth is treated as a benchmark, not immediate scope. Coverage expands through a versioned official-source rule registry, government-utility cross-checks, golden/property tests and named CA/legal approval before each capability is declared supported.

## 2026-07-19 · Codex agent team · Practitioner distribution direction lock
- LazyTax is now one shared tax-case product for two roles: a CA-style taxpayer
  concierge and a practitioner AI-junior cockpit. The practitioner is the
  trust/distribution wedge; LazyTax augments rather than replaces CAs and
  interoperates with existing filing software.
- `AGENTS.md` is the canonical operating contract. It locks the product thesis,
  role/maker-checker/security invariants, truthful progress, execution order and
  Definition of Done.
- The live Linear project was renamed `LazyTax — AI Tax Caseworker for CAs +
  Taxpayers`; LZ-60–81 were added as CUR-94–115. LZ-69/CUR-103 is Done;
  LZ-74/CUR-108 and LZ-75/CUR-109 are In Progress. Broad legacy tickets remain
  open until their full acceptance criteria pass.
- The local product now has strict pseudonymous taxpayer/preparer/reviewer case
  contracts, deterministic role-aware queue planning, an eighth read-only MCP
  tool, a synthetic practitioner cockpit and maker-checker/role-leak evals.
- The practitioner viewer is explicitly a synthetic demonstration. Durable
  tenancy/authentication, encrypted real-file storage, consent transport, CA
  verification, official ITR breadth and ERI filing remain production gates.

## 2026-07-20 · Codex · Executable differentiation and judge signal
- The claim “Codex supplies intelligence; LazyTax supplies evidence,
  determinism, controls and authorized rails” is now executable rather than a
  slide. The local Trust Lab runs the real MCP proof workflow twice and checks
  11 evidence, determinism, privacy, scope and maker-checker controls.
- No fake “Codex-only” benchmark is presented. The product measures its own
  enforceable properties and states that process isolation is not an OS,
  container, compliance or production-security certification.
- The full release gate now includes four Playwright journeys across taxpayer,
  practitioner and Trust Lab surfaces. Build Week remains synthetic and
  read-only; production real-taxpayer and filing gates are unchanged.

## 2026-07-20 - Codex - Evidence-linked filing guidance slice
- Added a ninth read-only MCP capability, `lazytax_prepare_filing_guide`, as a partial LZ-65 implementation. It deterministically chooses ITR-1 or ITR-2 for the currently supported AY 2026-27 profile and maps reconciled Form 16, AIS, domestic broker and supported US-stock facts to ordered schedule-level instructions.
- Every suggested rupee value carries source references and a calculation node. Entry modes distinguish direct entry, prefill verification, portal-calculated cross-checks and review boundaries.
- The guide deliberately does not claim official ITR JSON generation or filing. Aggregate domestic broker gains remain subject to transaction/date-bucket and Schedule 112A review; foreign guidance preserves ROR, treaty, Form 67 and raw-account-identifier boundaries.
## 2026-07-21 · Codex · Build Week session provenance
- The primary `/feedback` task is
  `019f7a12-3155-7fc2-bcd9-7cc5f2078de6`; it contains the majority of LazyTax's
  strategy, implementation, testing and release work.
- Two private Form 16 validation tasks are recorded as supporting evidence in
  `docs/CODEX_SESSION_LEDGER.md`.
- Raw task transcripts are not public artifacts because they contain private
  filenames, tax facts and a password-like identifier. The public ledger keeps
  every input's product intent while withholding secrets, identifiers, local
  paths, amounts and document contents.

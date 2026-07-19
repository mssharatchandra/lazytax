# LazyTax — Ticket Backlog (Linear-ready)

> **Build Week execution override — 19 Jul 2026.** BW tickets below are P0 and
> supersede the prior Wave 0–6 order until submission. Existing LZ tickets are
> preserved as the post-hackathon backlog; LZ-54/LZ-55 are absorbed into this
> tighter implementation, and LZ-56 is deferred.

## BW-P0 — Plugin-first submission

### BW-1 · Lock supported profile and typed contracts
`pkg:core` · owner: primary/MCP · status: **Complete** · deps: none
Define schemas for synthetic documents, evidence references, normalized income,
reconciliation findings, supported-case result, tax computation and proof pack.
Reject unsupported profile fields explicitly.
**AC:** strict schemas are shared by engine/MCP; supported and unsupported cases
have tests; no untyped money or source-less material amount.

### BW-2 · Scaffold valid LazyTax plugin and marketplace
`pkg:plugin` · owner: plugin agent · status: **Complete** · deps: none
Create `.codex-plugin/plugin.json`, repo marketplace metadata, local MCP config
and real install-surface copy.
**AC:** plugin validator passes; component paths exist; no placeholder metadata;
judge can install from the repo marketplace.

### BW-3 · Tax-verification skill and guardrails
`pkg:plugin` · owner: plugin agent · status: **Complete** · deps: BW-1
Implement the repeatable evidence-first workflow, supported-case gate, tool
sequence, confirmation points, refusals and Tax Proof Pack completion contract.
**AC:** the skill never asks the model to calculate tax or claim filing; it
requires source-linked results and explicit resolution of material conflicts.

### BW-4 · Deterministic AY 2026-27 demo engine
`pkg:engine` · owner: MCP/engine agent · status: **Complete** · deps: BW-1
Implement the deliberately narrow salaried + interest/dividend + domestic
listed-equity profile with integer money and explainable calculation steps.
**AC:** named golden tests pass; out-of-scope profiles fail closed; rules and
demo limitations are documented.

### BW-5 · Source normalizer and reconciliation engine
`pkg:core` `pkg:engine` · owner: MCP/engine agent · status: **Complete** · deps: BW-1
Normalize the three fixture shapes, preserve source/line provenance and produce
exact-match, tolerance and material-conflict findings without model arithmetic.
**AC:** deliberate fixture discrepancies are detected with stable IDs; accepted
resolution produces an auditable normalized profile.

### BW-6 · Local TypeScript MCP server
`pkg:mcp` · owner: MCP/engine agent · status: **Complete** · deps: BW-4, BW-5
Expose focused `lazytax_*` stdio tools using modern MCP registration, Zod input
validation, structured outputs, annotations and actionable errors.
**AC:** strict build passes; server starts with no stdout logging; tool smoke
tests cover happy, malformed and unsupported cases.

### BW-7 · Three synthetic tax-document fixtures
`pkg:fixtures` · owner: demo/evals agent · status: **Complete** · deps: BW-1
Create Form-16-like, AIS-like and generic-broker source documents for one
fictional taxpayer, with deliberate but resolvable discrepancies.
**AC:** no real PII/logos; every record has a stable source and line ID; expected
reconciliation and calculation facts are documented.

### BW-8 · Tax Proof Pack and minimal evidence viewer
`pkg:viewer` · owner: demo/evals agent · status: **Complete** · deps: BW-5, BW-6
Render taxpayer-safe synthetic summary, evidence ledger, mismatch decisions,
calculation trace, limitations and completion state from proof-pack data.
**AC:** viewer is locally runnable and readable; every amount is traceable; it
contains no filing-complete claim.

### BW-9 · Golden tests and MCP evaluations
`pkg:engine` `pkg:evals` · owner: MCP + demo/evals agents · status: **Complete** · deps: BW-4..BW-7
Add unit/golden coverage and ten independent, stable, read-only evaluation
questions with single verifiable answers.
**AC:** local test suite passes; malformed/unsupported/guardrail cases included;
evaluation XML validates.

### BW-10 · Judge installation and smoke-test path
`pkg:root` · owner: primary agent · status: **Complete** · deps: BW-2, BW-6..BW-9
Provide clean-checkout setup, plugin install, new-thread invocation, synthetic
scenario prompts, expected outputs and troubleshooting.
**AC:** full procedure succeeds on the current machine without secrets or real
data; judge can see value in under five minutes.

### BW-11 · Three-minute demo and submission narrative
`type:submission` · owner: Sharat + primary agent · status: **Ready for recording** · deps: BW-10
Record a <=2:55 narrated golden path covering the user problem, working plugin,
evidence reconciliation, deterministic result, proof pack, Codex build workflow
and GPT-5.6 runtime role.
**AC:** public YouTube URL; no third-party marks/music; claims match the build.

### BW-12 · Build Week release gate
`pkg:root` · owner: primary agent · status: **Code gates complete; submission gate pending** · deps: BW-1..BW-11
Run clean install/build/test/plugin validation, inspect repo for secrets/PII,
verify README and sample data, capture `/feedback` session ID and complete the
Devpost checklist.
**AC:** all gates green or every exception disclosed in the submission.

---

## Post-hackathon backlog (prior execution order)

> Import target: Linear team **CUR**, new project **"LazyTax — Wave 1 (Jul 31)"**.
> Each ticket: Package owner · Dependencies · Acceptance criteria (AC) · Verification (V).
> Labels: `wave:0..5`, `pkg:<name>`, `type:{build,test,design,growth,ops}`. Priority = wave order.
> Fable (PM/TM) reviews every PR against skill `lazytax-verify` before merge. Estimates in ideal agent-hours.

---

## Wave 0 — Foundation (Day 1, sequential)

### LZ-1 · Repo scaffold + toolchain
`pkg:root` · deps: none · 3h
Monorepo: pnpm + turbo; packages `core, engine, ingest, agent, itr-json, filing, db, config`, `apps/web` (Next.js 15, React 19, TS strict, Tailwind, shadcn). ESLint (incl. no-float-currency rule stub), Prettier, vitest, Playwright installed. `.env.example` with all keys. `.claude/skills` copied from planning repo.
**AC:** `pnpm i && pnpm typecheck && pnpm lint && pnpm test && pnpm build` green on empty packages; `pnpm dev` serves a hello page.
**V:** paste command output.

### LZ-2 · Core contracts (FROZEN after merge)
`pkg:core` · deps: LZ-1 · 4h
Zod schemas + types: `Money {paise:int, source:SourceRef, explanation:string}`, `TaxProfile` (assessee, salary, capitalGains[], otherIncome[], deductions, regimeChoice, confirmations), `IncomeItem`, `SourceRef` (doc type + locator), `ReconciliationDiff`, `AgentToolParams` for the 8 tools, `ParsedDocument`, ITR-1/ITR-2 JSON type stubs. JSON-serializable, no functions.
**AC:** schemas round-trip serialize; exhaustive unit tests; README documents every type; zero dependencies.
**V:** `pnpm -F core test` + coverage report.

### LZ-3 · CI pipeline + PR template
`pkg:root` · deps: LZ-1 · 2h
GitHub Actions: per-package typecheck/lint/test matrix, golden/fixture/eval jobs (skippable until suites exist), build, e2e on web changes. PR template: what changed, verification output, screenshots, contract-change flag, ticket link. Branch protection on `main`.
**AC:** a dummy PR shows all gates; red on intentional type error.
**V:** link to green + red CI runs.

---

## Wave 1 — Parallel core build (Days 1–4)

### LZ-4 · Tax engine: slabs, regimes, cess, surcharge, 87A
`pkg:engine` · deps: LZ-2 · 6h
Pure functions on integer paise. `rules/AY2026_27.ts`: new-regime slabs (0–4L nil … >24L 30%, std ded ₹75k, §87A ₹60k→nil to ₹12L), old regime (slabs, ₹50k std ded, §87A ₹12.5k, 80C/80D/HRA/home-loan interest), 4% cess, surcharge 10/15/25/37 with marginal relief, ITD rounding (§288A/288B).
**AC:** golden table (≥30 cases from ITD old-vs-new calculator incl. 12L rebate cliff, surcharge boundaries) passes exactly; property tests (monotonicity, rounding invariants) pass; zero I/O, no Date.now().
**V:** `pnpm -F engine test:golden` + coverage ≥95% branch.

### LZ-5 · Tax engine: capital gains
`pkg:engine` · deps: LZ-4 · 6h
§111A STCG 20%; §112A LTCG 12.5% over combined ₹1.25L exemption; FIFO lot matching; grandfathering (pre-31-Jan-2018 FMV step-up) + pre/post-23-Jul-2024 rate split; property/gold/unlisted election (12.5% no-index vs 20% indexed); debt MF (post-1-Apr-2023) at slab; intra-head set-off rules; **special-rate income excluded from §87A** (explicit named test).
**AC:** ≥25 golden CG cases incl. the 87A trap, exemption boundary (₹1,25,000 vs ₹1,25,001), mixed ST/LT set-offs.
**V:** `pnpm -F engine test:golden` (CG suite).

### LZ-6 · Regime comparison + explanation payload
`pkg:engine` · deps: LZ-4, LZ-5 · 3h
`compareRegimes(profile) → {winner, deltaPaise, lineByLine[]}` where each line carries plain-language `explanation` strings (template-generated, deterministic — the agent may rephrase but numbers come from here).
**AC:** property test: winner is true minimum; explanations reference actual rule constants.
**V:** `pnpm -F engine test`.

### LZ-7 · Ingest: fixture corpus + harness
`pkg:ingest` · deps: LZ-2 · 4h
Collect/scrub ≥10 Zerodha Tax P&L, ≥10 Groww, ≥5 Form 16, ≥5 AIS files (synthetic/anonymized — no real PAN). Fixture harness asserting field-level expected extractions with per-field accuracy scoring.
**AC:** corpus committed (PII-scrubbed, verified by grep for PAN patterns); harness runs red (no parsers yet).
**V:** `pnpm -F ingest test:fixtures` output showing scored fields.

### LZ-8 · Ingest: Zerodha + Groww Tax P&L parsers
`pkg:ingest` · deps: LZ-7 · 8h
Deterministic XLSX/CSV parsers first; Claude structured-output (strict schema) fallback for PDF variants. Output: `IncomeItem[]` with lot-level CG data + per-field confidence. Confidence <0.9 ⇒ flagged for conversational confirmation.
**AC:** ≥98% field accuracy on fixtures; graceful typed error on unknown format (never a crash, never a guess).
**V:** `pnpm -F ingest test:fixtures`.

### LZ-9 · Ingest: Form 16 + AIS parsers
`pkg:ingest` · deps: LZ-7 · 8h
Form 16 (salary, TDS, allowances, 80C declared) and AIS (SFT interest, dividends, securities transactions) → `IncomeItem[]`. AIS JSON preferred; PDF via structured extraction.
**AC:** ≥98% on fixtures; TDS totals cross-checked against Part A; per-field confidence.
**V:** `pnpm -F ingest test:fixtures`.

### LZ-10 · Reconciler: AIS ↔ broker ↔ Form 16 diff engine
`pkg:ingest` · deps: LZ-8, LZ-9 · 6h
Pure function: sources → `ReconciliationDiff[]` (matched, missing-in-AIS, missing-in-broker, amount-mismatch w/ delta) + recommended resolution per diff (broker-first for CG per D6, AIS-first for interest).
**AC:** unit tests for all diff classes; deterministic ordering; recommendations carry explanations.
**V:** `pnpm -F ingest test`.

### LZ-11 · Design direction + system
`pkg:web` `type:design` · deps: LZ-1 · 4h
Per PLAN §9: propose **4 distinct visual directions** (bg/accent/type, one-liner each — no generic Inter-on-white), pick one with Sharat, then tokenize: palette (light+dark), type scale (tabular-figure numerals), spacing, motion primitives (number count-up, card pulse), shadcn theme.
**AC:** direction picked and recorded in DECISIONS.md; tokens in Tailwind config; Storybook-style demo page of money-card, chat bubble, tool-activity chip.
**V:** screenshots in PR (light+dark, mobile+desktop).

### LZ-12 · Web shell: chat + live dashboard hybrid
`pkg:web` · deps: LZ-2, LZ-11 · 8h
Split layout (chat left / dashboard right; mobile pull-up sheet). Zustand store keyed on `TaxProfile`. SSE streaming chat with tool-activity chips ("reading your Zerodha P&L…"). Dashboard money-cards animate on store change. File upload (drag/drop + picker) into chat.
**AC:** with a mocked agent, uploading a file streams a reply and updates a dashboard card with count-up animation; responsive; dark mode.
**V:** `pnpm -F web e2e` smoke + screen recording in PR.

### LZ-13 · Onboarding, consent & trust surface
`pkg:web` · deps: LZ-12 · 4h
Landing → consent (DPDP-compliant copy, what we store/why/delete-anytime) → chat start. "Where this came from" sheet on every dashboard number (source doc, rule, explanation from `Money`). Delete-my-data action wired to API stub.
**AC:** consent blocking before any upload; source sheet renders for every card; copy reviewed.
**V:** e2e covers consent gate; screenshots.

### LZ-14 · Agent: orchestrator loop + tool wiring
`pkg:agent` · deps: LZ-2 · 8h
Claude SDK tool runner, `claude-opus-4-8`, adaptive thinking, streaming, frozen cached system prompt. Tools: `parse_document`, `reconcile_sources`, `compute_tax`, `compare_regimes`, `explain_line_item`, `generate_itr_json`, `update_dashboard`, `ask_user` — all Zod-validated, engine/ingest called through public APIs. Server-side compaction for long sessions. Session state persisted as `TaxProfile`.
**AC:** scripted conversation (fixture salaried user) reaches computed tax with correct tool sequence; zero numbers in agent text that don't originate from tool results (asserted by eval harness tagging).
**V:** `pnpm -F agent test` integration run transcript.

### LZ-15 · Agent: system prompt, persona & guardrails
`pkg:agent` · deps: LZ-14 · 5h
LazyTax voice (calm, funny-but-precise); hard rails: never invent amounts, never advise evasion, never generate JSON without confirmed review, always cite sources, escalate to "talk to a CA" on out-of-scope (audit cases, foreign income beyond capture). Refusal test set.
**AC:** guardrail eval subset 100%; tone spot-check approved by Sharat.
**V:** `pnpm -F agent eval -- --suite guardrails`.

### LZ-16 · Agent: eval harness + golden conversation set
`pkg:agent` · deps: LZ-14 · 6h
≥40 scenarios: happy paths (ITR-1, ITR-2, mismatch resolution), adversarial (evasion asks, garbage files, contradictory data), edge (12L cliff, LTCG boundary). Scores tool-accuracy, number-provenance, refusal correctness. Runs in CI on agent changes.
**AC:** gate wired: ≥90% tool accuracy, 100% guardrails; report artifact in CI.
**V:** `pnpm -F agent eval` report.

### LZ-17 · DB + auth + PII encryption
`pkg:db` · deps: LZ-2 · 5h
Prisma + Neon: User, Session, TaxProfile (JSONB), Document (R2/S3 pointer), AuditLog. Auth.js (email OTP + Google). AES-GCM app-layer encryption for PII columns; PAN stored masked + encrypted-full separately; delete-my-data cascade.
**AC:** migrations + seed; encryption round-trip test; delete cascade test.
**V:** `pnpm -F db test && pnpm -F db migrate:dev`.

### LZ-18 · Config + observability
`pkg:config` · deps: LZ-1 · 3h
Fail-fast env validation (Zod). Sentry (server+client, PII scrubbing beforeSend), structured logger `{traceId, sessionId, event}`, trace propagation through agent tool calls.
**AC:** boot fails loudly on missing key; Sentry test event received with PAN-pattern scrubbing verified.
**V:** unit tests + Sentry screenshot.

### LZ-19 · PostHog instrumentation
`pkg:web`+`pkg:config` · deps: LZ-12 · 4h
Implement the contract in `.telemetry/tracking-plan.yaml` only after LZ-60's
vendor/region and consent gates. Use a typed registry, no-op default sink and
first-party server gateway; no direct client delivery from tax surfaces. No
autocapture, pageviews, replay, heatmaps, surveys, person profiles, IP/GeoIP,
PII, case/evidence IDs, tax categories, amounts, outcomes, prompts or free text.
**AC:** consent absent/withdrawn produces zero SDK initialization and requests;
unknown/forbidden properties fail tests; all nine target events are canonical,
non-blocking and production/synthetic separated; dashboards exclude internal traffic.
**V:** privacy payload suite + synthetic PostHog debugger capture + withdrawal/deletion test.

---

## Wave 2 — Product completion (Days 4–7)

### LZ-20 · ITR JSON generator (ITR-1 + ITR-2)
`pkg:itr-json` · deps: LZ-5, LZ-6 · 8h
`TaxProfile → ITR-1/ITR-2 JSON` per ITD published schema for AY 2026-27; form-router (CG ⇒ ITR-2); deterministic byte-stable output; schedule completeness checks (defective-return preflight).
**AC:** fixture profiles validate against ITD JSON schema; snapshot tests; round-trip loads in ITD offline utility (manual check documented with screenshots).
**V:** `pnpm -F itr-json validate`.

### LZ-21 · Sandbox.co.in cross-check + filing adapter seam
`pkg:filing` · deps: LZ-20 · 5h
`FilingProvider` interface (prepare, validate, calc). `SandboxProvider` using their Calculator + Prepare-ITR APIs behind `x-api-key` auth; engine-vs-Sandbox liability cross-check job over the golden table; contract tests recorded (nock) for CI, live smoke script for pre-launch.
**AC:** all golden fixtures match Sandbox calculator (or documented, justified deltas); interface has zero Sandbox types leaking.
**V:** `pnpm -F filing test` + live smoke output.

### LZ-22 · Reconciliation UX (conversational diff resolution)
`pkg:web`+`pkg:agent` · deps: LZ-10, LZ-14 · 6h
Agent presents diffs as cards-in-chat with recommended resolution; one-tap accept / edit / "explain"; dashboard updates live; resolution stored in profile confirmations.
**AC:** fixture mismatch user resolves 3 diff types end-to-end in e2e; every resolution audited in AuditLog.
**V:** e2e + recording.

### LZ-23 · Review screen (the trust moment)
`pkg:web` · deps: LZ-12, LZ-6 · 6h
Full-screen summary before JSON: every income head, deduction, regime choice with source chips; explicit per-section confirm; regime toggle with live delta; "explain this" inline. Confirmation state gates `generate_itr_json`.
**AC:** JSON generation impossible without all confirms (unit + e2e); beautiful (design review by Sharat).
**V:** e2e + screenshots.

### LZ-24 · Guided portal handoff + e-verify flow
`pkg:web` · deps: LZ-20 · 6h
Stepper: download JSON → incometax.gov.in walkthrough (annotated visuals per step: login, upload, verify, Aadhaar-OTP e-verify) → "I'm done" check-in → ack-number capture (optional) → celebration + share-card prompt. Each step emits `lz_handoff_step_completed`.
**AC:** a non-tax-savvy tester completes the real portal flow using only our screens (documented test); resume-later works.
**V:** moderated-test notes + e2e of the stepper.

### LZ-25 · Refund flex card + share flow
`pkg:web` · deps: LZ-11 · 4h
OG-image/canvas share card (sloth mascot, refund amount w/ blur toggle, time-to-file stat, lazytax.in); X/WhatsApp/IG-story sizes; referral param on shared link.
**AC:** card renders server-side <1s; no PII beyond opted-in amount; share events tracked.
**V:** generated samples in PR.

### LZ-26 · Landing page + countdown
`pkg:web` · deps: LZ-11 · 4h
Hero (live product recording), "how it works" in 3 steps, trust section (deterministic engine, sources, DPDP), Jul-31 countdown, FAQ (is this legal? what do you store? what does it cost?), waitlist fallback toggle if we need to gate load.
**AC:** Lighthouse ≥95 perf/a11y; countdown correct in IST; copy approved.
**V:** Lighthouse report + screenshots.

### LZ-27 · Foreign stocks capture (guidance-only)
`pkg:web`+`pkg:agent` · deps: LZ-14 · 2h
Detect foreign-stock mention/upload → capture intent, explain Schedule FA obligation plainly, mark profile "needs CA review", email them the guide. No computation.
**AC:** agent never attempts FA computation (eval case); guide email sends.
**V:** eval case + test email.

---

## Wave 1/2 additions — Indian-salary depth (scope expansion, 19 Jul)

### LZ-41 · Multi-employer Form 16 consolidation (2–3 employers)
`pkg:ingest`+`pkg:engine` · deps: LZ-9 · 6h
Job-switchers are a huge July cohort. Parse each Form 16 separately, then consolidate: aggregate gross salary and TDS across employers; apply standard deduction **once** (detect when both employers applied it — the classic underpaid-TDS trap); detect slab shortfall (each employer taxed as if sole income) and warn "you likely owe ₹X, not a refund" early, not at review; detect overlapping employment periods; arrears → flag relief u/s 89 + Form 10E as guided-CA path (computation deferred to Wave 2).
**AC:** golden fixtures for 2-employer and 3-employer cases incl. double-std-ded and shortfall; consolidation is pure + deterministic; agent explains the shortfall in plain language (eval case).
**V:** `pnpm -F ingest test:fixtures && pnpm -F engine test:golden` (multi-employer suite).

### LZ-42 · Salary component engine (exemptions & perquisites)
`pkg:engine` · deps: LZ-4 · 8h
Component-level treatment, regime-aware: **HRA §10(13A)** (old regime: min of actual HRA, rent − 10% of basic+DA, 50%/40% metro; disallowed in new regime); **leave encashment §10(10AA)** (govt: fully exempt; non-govt: min of ₹25L lifetime cap, actual received, 10-month average salary, unutilized-leave formula); **gratuity §10(10)** (₹20L cap, formula per Payment of Gratuity Act coverage); **LTA §10(5)** (old regime, proof-flagged); bonus/joining bonus fully taxable (clawback edge flagged); employer PF+NPS+superannuation contribution >₹7.5L perquisite warning; professional tax §16(iii).
**AC:** named golden test per component incl. metro/non-metro HRA, leave-encashment lifetime-cap tracking, gratuity cap; regime matrix test (which exemptions survive in new regime).
**V:** `pnpm -F engine test:golden` (salary-components suite).

### LZ-43 · House property head + home-loan claims
`pkg:engine`+`pkg:web` · deps: LZ-4 · 6h
Self-occupied: §24(b) interest cap ₹2L (old regime; disallowed for self-occupied in new regime — agent must explain this clearly, it's the #1 regime-choice surprise); let-out: rent − 30% standard deduction − full interest, HP loss set-off against other heads capped ₹2L, excess carried forward 8 yrs; pre-construction interest in 5 installments; home-loan principal → 80C bucket (old regime); conversational capture flow for loan statement upload.
**AC:** golden tests for SO/let-out/pre-construction; regime-interaction tests; eval case where new-vs-old flips because of home-loan interest.
**V:** `pnpm -F engine test:golden` (HP suite) + eval case.

### LZ-44 · Deduction basket completeness (Chapter VI-A)
`pkg:engine`+`pkg:agent` · deps: LZ-4 · 5h
Old regime: 80C ₹1.5L basket (EPF, PPF, ELSS, LIC, home-loan principal, tuition, SSY), 80D tiers (self ₹25k / senior ₹50k, parents separate, preventive-checkup ₹5k sub-limit), 80CCD(1B) NPS ₹50k, 80TTA ₹10k / 80TTB, 80G (with 50%/100% + qualifying-limit warning, ARN capture), 80E education-loan interest. New regime: only 80CCD(2) + std deduction survive — agent proactively explains what the user *loses* by regime. Proof checklist generated per claimed deduction.
**AC:** cap/tier boundary tests per section; regime-survival matrix test; eval: agent never lets a deduction exceed its cap and never invents one.
**V:** `pnpm -F engine test:golden` (VI-A suite) + eval subset.

### LZ-45 · Tax Summary Document + personalized filing guide
`pkg:web`+`pkg:itr-json` · deps: LZ-20, LZ-23 · 6h
Server-rendered, beautiful, downloadable **PDF/HTML report** alongside the JSON: (1) every income head with source + computation walkthrough in plain language, (2) regime comparison table, (3) deductions claimed + proof checklist, (4) **personalized step-by-step portal filing guide** — login → e-File → upload JSON → verify prefill deltas → submit → Aadhaar-OTP e-verify → download ITR-V ack, with troubleshooting ("portal shows different prefill than my JSON — what now?"), (5) post-filing: refund timeline, intimation u/s 143(1) explainer, what a mismatch notice looks like. This doc is also the CA-shareable artifact.
**AC:** renders <2s; zero unexplained numbers (every figure links a source); copy reviewed; PDF passes a print test on mobile; guide validated against the live portal during concierge beta.
**V:** sample PDFs in PR + beta validation note.

### LZ-46 · Edge-case golden + eval expansion (robustness pass)
`pkg:engine`+`pkg:agent` · deps: LZ-41..44 · 6h
Codify the long tail as regression suites: job switch mid-year (with/without overlap), 3 employers, double std-deduction, TDS shortfall → "you owe, not refund" messaging, HRA claimed without rent receipts (>₹1L rent needs landlord PAN — warn), CG net loss + carry-forward schedule, exact boundary incomes (₹12,00,000 / ₹12,00,010 / ₹50,00,000), leave-encashment lifetime cap exceeded, gratuity over ₹20L, belated-filing messaging after Jul 31 (interest u/s 234A/B/C estimate), graceful refusals: NRI status, agricultural income >₹5k + slab income (partial integration), audit cases, crypto/VDA (flag → Wave 2), foreign RSUs → CA escalation.
**AC:** every case is a named golden or eval test; refusal cases 100%; suite wired into CI gates.
**V:** `pnpm -F engine test:golden && pnpm -F agent eval` full report.

---

## Wave 3 — Hardening (Days 7–9)

### LZ-28 · Full E2E suite (3 fixture users)
`pkg:web` · deps: LZ-22, LZ-23, LZ-24 · 6h
Playwright: (a) pure salaried ITR-1, (b) salaried+equity ITR-2, (c) ITR-2 with AIS mismatch — chat → parse → reconcile → review → JSON download → handoff stepper → share card. Runs headless in CI, artifacts on failure.
**AC:** all three green 5× consecutively (flake check).
**V:** CI run link.

### LZ-29 · Load, cost & failure drills
`pkg:root` `type:ops` · deps: LZ-28 · 5h
k6 burst test (deadline-day shape: 200 concurrent sessions); Claude API rate-limit/backoff behavior verified; parse-failure and Claude-outage degradation paths (queued "we'll email your JSON" fallback); per-session token cost measured and dashboarded; Vercel/Neon limits reviewed.
**AC:** p95 chat-turn <6s at load; graceful degradation demonstrated; cost/session ≤ target recorded in DECISIONS.md.
**V:** k6 report + drill transcript.

### LZ-30 · Security & privacy pass
`pkg:root` `type:ops` · deps: LZ-17, LZ-19 · 4h
/security-review run; checklist: authz on every route, upload limits + content sniffing, prompt-injection hardening on parsed docs (documents are data, not instructions — asserted in agent evals), PII grep of logs/analytics/fixtures, delete-my-data verified end-to-end, dependency audit.
**AC:** zero highs; mediums ticketed; report committed.
**V:** review report.

---

## Wave 4 — Concierge beta (Days 9–11)

### LZ-31 · Concierge beta with 15–20 real users
`type:growth` · deps: LZ-28 · 2 days elapsed
Recruit from X/mutuals; watch them file (calls/replays); founder-fix bugs same-day; capture testimonials + first refund cards; measure unaided handoff completion.
**AC:** ≥80% complete handoff unaided; top-10 issues fixed or ticketed; ≥5 testimonials.
**V:** beta report in DECISIONS.md with funnel numbers.

### LZ-32 · Polish sprint from beta findings
`pkg:web`+`pkg:agent` · deps: LZ-31 · 1 day
Fix the observed drop-offs; copy/UX friction; parser gaps discovered in the wild feed the fixture corpus (regression tests added for each).
**AC:** re-run of funnel on remaining beta users shows improvement; no new e2e regressions.
**V:** before/after funnel screenshot.

---

## Wave 5 — Launch (Days 11–12)

### LZ-33 · Launch assets + thread
`type:growth` · deps: LZ-32 · 4h
X thread (recording-led), Reddit value-post (LTCG ₹1.25L trap explainer), PH draft, press-kit page. Referral param live. Support channel (X DMs + support@) staffed.
**AC:** assets reviewed; scheduled; tracking UTMs verified in PostHog.
**V:** links.

### LZ-34 · Launch ops & deadline-week watch
`type:ops` · deps: LZ-33 · Jul 28–31
On-call rotation (Sharat + Fable session); dashboards on TV; hourly funnel checks; hotfix lane (skip-wave CI). Daily standup note in DECISIONS.md.
**AC:** uptime ≥99.5% Jul 28–31; every parse-fail triaged <2h.
**V:** post-mortem doc Aug 1.

---

## Wave 6 — The F&O drop (post-Jul-31, target Aug 31)

### LZ-35 · ITR-3 engine: F&O, intraday, set-offs & carry-forward
`pkg:engine` · deps: LZ-5, LZ-20 · 8h · due Aug 20
Model exchange-traded F&O as non-speculative business income (nature code 21010) and equity intraday as speculative business income (21009). Implement turnover calculation, expense capture with evidence status, head-wise set-off ordering, speculative-loss isolation and four-year carry-forward, non-speculative business-loss carry-forward, and the minimum P&L/balance-sheet fields needed by ITR-3. Route audit-triggering or unsupported books cases to a CA instead of producing JSON.
**AC:** deterministic golden cases for F&O profit/loss, intraday loss isolation, mixed capital-gains + F&O, eligible/ineligible expenses, carry-forward schedules, and audit/refusal boundaries; no ITR-2 output when business income exists.
**V:** `pnpm -F engine test:golden -- itr3-business` + ITD utility cross-check report for every golden fixture.

### LZ-36 · ITR-3 disclosures, Form 10-IEA & relief u/s 89 / Form 10E
`pkg:engine`+`pkg:agent`+`pkg:itr-json` · deps: LZ-35 · 8h · due Aug 25
Generate Trading Account, P&L and applicable balance-sheet disclosures consistently with the computed business-income result. Add regime eligibility and Form 10-IEA guidance for users with business income, including due-date and opt-out/re-entry constraints. Upgrade salary-arrears handling from a warning to deterministic relief u/s 89 computation plus a personalized Form 10E filing checklist that must precede the return.
**AC:** mismatched Trading Account totals fail preflight; 10-IEA state machine prevents impossible choices; relief computation covers at least three prior-year patterns; agent never claims Form 10E or 10-IEA was filed; ITR-3 JSON validates in the official utility.
**V:** `pnpm -F engine test:golden -- itr3-disclosures relief-89 && pnpm -F itr-json test -- itr3 && pnpm -F agent eval -- forms`.

### LZ-37 · Upstox + Angel One parsers and fallback promotion
`pkg:ingest` · deps: LZ-7, LZ-8 · 6h · due Aug 20
Promote Upstox and Angel One Tax P&L exports from manual fallback to first-class deterministic adapters. Normalize delivery, intraday, F&O, charges, dates, ISINs and realized P&L into the frozen ingestion contract; detect template/version changes; retain the confidence-scored extraction fallback and human-review path.
**AC:** at least five PII-scrubbed fixtures per broker across two template versions; ≥98% field accuracy on supported rows; unsupported/version-changed files fail safely with an actionable export guide; no LLM-derived amount is accepted without review.
**V:** `pnpm -F ingest test:fixtures -- upstox angel-one` + accuracy report committed with fixture provenance.

### LZ-38 · ITR-3 presumptive-income flow for freelancers (44ADA)
`pkg:engine`+`pkg:agent`+`pkg:itr-json` · deps: LZ-35 · 8h · due Aug 25
Add a conversational ITR-3 flow for eligible resident professionals under §44ADA: profession eligibility, gross-receipts capture, ₹75L threshold only when cash receipts are within the statutory limit (otherwise ₹50L), deemed 50% income floor, optional higher declared profit, TDS/26AS reconciliation, GST-registration warning, advance-tax/interest estimate, and opt-out/books/audit escalation.
**AC:** eligibility and cash-receipt boundary tests; below-50% declarations refuse assisted filing and explain books/audit implications; mixed salary + freelance income computes correctly; 44ADA schedule and ITR-3 JSON validate; agent does not treat every freelancer as eligible.
**V:** `pnpm -F engine test:golden -- 44ada && pnpm -F agent eval -- 44ada && pnpm -F itr-json test -- itr3-44ada`.

### LZ-39 · Public calculator distribution hardening (post-season)
`pkg:mcp` · deps: LZ-54 · 5h · due Aug 27
Harden and distribute the public, non-identifying calculator subset of the MVP MCP service for developer discovery. Keep `compute_tax` and `compare_regimes` stateless; reject PAN, Aadhaar, names, addresses and documents; return calculation trace, tax-year/ruleset, caveats and citations. This extends LZ-48 rather than creating a second server.
**AC:** public rate/abuse controls load-tested; zero persistence and PII; engine parity; versioned package/docs/examples and explicit non-filing disclaimer.
**V:** `pnpm -F mcp test:public && pnpm -F mcp test:load && pnpm -F mcp test:security`.

### LZ-40 · Sandbox full e-file adapter behind a production-killed feature flag
`pkg:filing`+`pkg:web` · deps: LZ-20, LZ-21, LZ-24, LZ-30 · 8h · due Aug 31
Implement the future full-file provider flow—prepare, validate, explicit user authorization, submit, obtain acknowledgement/ITR-V status, and e-verification handoff—through the existing FilingProvider seam. Keep production submission hard-disabled until legal/ERI, provider-contract, security and live sandbox certification gates are signed off. Enforce idempotency, immutable consent receipts and retry-safe status polling.
**AC:** mock/sandbox end-to-end passes for success, duplicate submit, timeout, rejection and partial outage; no submission without a fresh review hash + explicit consent; kill switch is server-side and defaults off; audit log contains no raw PII; production readiness checklist requires named human approval.
**V:** `pnpm -F filing test && pnpm -F web test:e2e -- full-file-sandbox` + signed go/no-go checklist; production flag remains OFF.

---

## Wave 1 addendum — security protocol + user-driven interfaces (MVP)

These are MVP scope. The standalone web app remains the canonical consent, case, review and handoff surface. MCP/Codex/Claude Code are thin clients of the same secure platform; none may calculate independently or file/submit a return.

### LZ-47 · Data map, threat model & DPDP readiness baseline
`type:security`+`type:legal` · deps: LZ-1 · W0/blocking
Inventory every personal-data flow and processor; classify restricted tax/identity data; document purposes, consent, regions, retention and deletion; produce ROPA, trust boundaries, STRIDE register, high-risk privacy assessment and DPDP/CERT-In readiness matrix. Public wording stays “DPDP-ready” until counsel approves otherwise.
**AC:** every flow has owner/purpose/class/processor/region/retention/deletion; all high/critical risks have owners; Indian privacy/cyber counsel review recorded; no real data enters staging first.
**V:** security walkthrough + repository PAN/Aadhaar/secret scan.

### LZ-48 · Tenant isolation, encryption, KMS & privileged access
`pkg:db`+`pkg:platform` · deps: LZ-17, LZ-47 · W1
Deny-by-default server authorization; private object storage; short-lived signed URLs; TLS; AES-256-GCM application encryption; envelope keys in managed KMS with environment separation/rotation; MFA, least privilege and audited just-in-time break glass.
**AC:** full cross-tenant matrix returns 403/404; restricted data absent from logs/client payloads; key rotation and encrypted backup restore succeed; production access reviewed.
**V:** authz integration suite + rotation/restore drill + IaC review.

### LZ-49 · PII redaction gateway & model-provider egress controls
`pkg:agent`+`pkg:ingest` · deps: LZ-6..8, LZ-47 · W1
Route every model call through an allowlisted gateway; deterministic/local parsing first; redact identity/account/address fields; neutralize document prompt injection; block direct SDK calls; record metadata-only purpose/model/redaction events; fail closed.
**AC:** 100% leak/injection guardrail corpus; no direct provider SDK outside gateway; no full PAN/Aadhaar in prompts; provider no-training/retention settings evidenced.
**V:** DLP canaries + egress contract tests + `rg` import gate.

### LZ-50 · Consent, privacy notice, rights & grievance ledger
`pkg:web`+`pkg:db` · deps: LZ-14, LZ-17, LZ-47 · W1
Plain-language collection notice; separate versioned receipts for filing, model parsing, analytics and research; consent/preference ledger; access/export/correct/withdraw/delete/grievance flows with proportionate identity verification and SLAs.
**AC:** no upload/plugin case grant before notice/consent; every job references purpose and authorization; optional analytics independent of filing; counsel and accessibility review recorded.
**V:** Playwright rights/withdrawal flows + audit assertions.

### LZ-51 · Retention, deletion, backup expiry & data export
`pkg:db`+`pkg:ingest`+`pkg:platform` · deps: LZ-48, LZ-50 · W1
Enforce lifecycle defaults in code: temporary parser files ≤24h, inactive unsubmitted uploads 7d, completed cases/documents user-deletable with proposed 30d maximum unless counsel confirms retention, shortest queue/cache/signed-URL TTLs and encrypted backup expiry.
**AC:** delete cascades through DB/storage/cache/queue/analytics/processors and returns receipt; legal holds narrow; export machine-readable; backup deletion behavior documented.
**V:** lifecycle clock tests + vendor deletion mocks + restore/deletion drill.

### LZ-52 · Vendor, subprocessor & data-location approval gate
`type:security`+`type:legal` · deps: LZ-47 · W1
Approve hosting, DB, object storage, model, analytics, error, auth/email and support vendors with purpose/fields/role/region/retention/training/security/incident/deletion/subprocessor records, DPAs and kill switches. Prefer India-region restricted-data storage; document cross-border decisions.
**AC:** no restricted egress without approval/config/contract evidence; analytics/error payloads pseudonymous; subprocessor register reflected in notice; annual/material-change review owner.
**V:** egress inventory reconciliation + staging vendor kill-switch test.

### LZ-53 · Canonical case API, audit ledger & capability scopes
`pkg:platform` · deps: LZ-2, LZ-48, LZ-50 · W2
Versioned service layer over engine/ingest/reconciliation/ITR JSON; scopes `calculator:read`, `case:read`, `document:upload`, `reconcile:write`, `itr:generate`; OAuth 2.1/PKCE or device flow for external clients; idempotency/case versions; review hashes; append-only actor/client/purpose/consent/ruleset/input-output-hash audit ledger.
**AC:** identical outputs across clients; no case enumeration; revocation and kill switches; replay reproducible without raw PII logs; OpenAPI/typed SDK published.
**V:** contract/authz/replay/revocation suites.

### LZ-54 · LazyTax MCP server MVP
`pkg:mcp` · deps: LZ-4..6, LZ-53 · W2
Expose public no-PII `compute_tax`, `compare_regimes`, `explain_rule`; scoped `list_my_cases`, `get_case_summary`, `list_mismatches`, `resolve_mismatch`, `generate_tax_proof_pack`. Disable upload/ITR generation unless an approved explicit-consent/review surface exists; never expose filing/submission.
**AC:** MCP Inspector/contract tests; engine parity; tenant/scope enforcement; zero raw PII in adapter logs/errors; threat model/setup/revocation/non-filing docs; feature flag and kill switch.
**V:** `pnpm -F mcp test && pnpm -F mcp test:contract && pnpm -F mcp test:security`.

### LZ-55 · LazyTax Codex plugin MVP
`plugins:codex` · deps: LZ-53, LZ-54, LZ-25 · W2
Installable skills/config/MCP bundle for estimates, authorized case inspection, source-linked mismatch work, Tax Proof Pack and deep-link to web review. No local arithmetic, secrets, independent upload or submission.
**AC:** clean install/uninstall + OAuth/revocation; 10 evals including injection/wrong-case/expired grant/unsupported profile; every answer shows source/ruleset and estimate status; PII-safe channel telemetry; kill switch/runbook.
**V:** clean-environment install test + shared client eval suite.

### LZ-56 · LazyTax Claude Code plugin MVP
`plugins:claude-code` · deps: LZ-53, LZ-54 · W2
Thin Claude Code skill/plugin over MCP with the same guarded journeys and web handoff as Codex; least-privilege visible permissions and no independent tax arithmetic, direct DB access or submission.
**AC:** install/auth/revoke/update tested cleanly; shared cross-client eval corpus produces identical engine/audit results; malicious-document tests fail closed; compatibility policy and kill switch.
**V:** clean-environment plugin test + shared client eval suite.

### LZ-57 · Cross-interface activation, trust & completion experiment
`pkg:analytics` · deps: LZ-19, LZ-54..56 · W2/W4
Compare web/MCP/Codex/Claude Code on verified Tax Proof Pack or JSON completion, time, trust, accuracy, support and privacy/security guardrails. Capture only consented pseudonymous client/version/funnel metadata and record surface switching.
**AC:** shared allowlisted event schema; decision rule/minimum sample pre-registered; dashboard by channel; independent channel disable; weekly qualitative template and interview consent.
**V:** synthetic funnel test proves no amounts, PAN, names or case content in analytics.

### LZ-58 · CERT-In & DPDP breach-response playbook
`type:security`+`type:ops`+`type:legal` · deps: LZ-18, LZ-47, LZ-52, LZ-53 · W3
Severity/command roles, containment, evidence, key rotation, restoration, vendor escalation and counsel-owned CERT-In/DPDP regulator/user decision trees. Tabletop cross-tenant exposure, provider leakage, admin compromise, malicious upload and corrupt ITR output.
**AC:** named 24×7 escalation; metadata-only evidence chain; two pre-beta table-tops; upload/model/MCP/plugin kill switches tested; gaps ticketed.
**V:** timed tabletop evidence bundle and action log.

### LZ-59 · Automated security gates & independent pre-launch review
`type:security` · deps: LZ-30, LZ-48..56 · W3/blocking
CI secret/SBOM/SCA/SAST/IaC/container scans, malicious-file corpus, authz matrix, API fuzz/abuse/CSRF/XSS/SSRF/polyglot tests, prompt-injection evals and PII canaries; independent penetration test or qualified review; signed go/no-go memo.
**AC:** zero open critical/high findings; 100% authz/agent guardrails; medium risks owned; residual risks/rollback/approvers recorded; gates rerun on sensitive changes.
**V:** CI artifacts + remediation evidence + signed security release record.

---

## Production moat, analytics and public distribution addendum

### LZ-60 · Privacy-safe telemetry foundation and vendor gate
`pkg:analytics`+`type:security`+`type:legal` · deps: LZ-47, LZ-50, LZ-52 · P0/blocking
Approve PostHog region/DPA/subprocessors/retention/deletion/cross-border treatment;
implement separate analytics consent, typed event registry generated from
`.telemetry/tracking-plan.yaml`, no-op default sink, first-party allowlisting
gateway and processor deletion. Keep the local plugin zero-telemetry by default.
**AC:** zero network/identifier before opt-in; replay/autocapture/person profiles
and IP/GeoIP are disabled; forbidden and unknown properties are rejected; tax
workflow succeeds during telemetry outage; withdrawal stops capture and deletes.
**V:** packet-level consent test + DLP/property suite + vendor approval record + deletion receipt.

### LZ-61 · OpenAI Plugins Directory skills-only submission
`pkg:plugin`+`type:growth` · deps: BW-9, BW-10, BW-12 · P0
Prepare production listing copy/logo/site/support/privacy/terms, verified
publisher identity, final skill ZIP, starter prompts, release notes, country
availability and exactly five positive/three negative reviewer cases. Submit
the narrow synthetic verification skill without live-filing claims.
**AC:** Apps Management write access and identity verified; all public URLs
match publisher; final skill tree passes validation/security scan; eight tests
are reproducible without private context; submission status is in review.
**V:** portal draft export/screenshots + validator output + reviewer-case transcript.

### LZ-62 · Public production MCP and app-plus-skills submission
`pkg:mcp`+`pkg:platform`+`pkg:plugin` · deps: LZ-48..55, LZ-59, LZ-60 · P1/blocking
Deploy the capability-scoped MCP over HTTPS with OAuth/reviewer account, domain
verification challenge, exact CSP, rate/abuse limits and truthful tool schemas/
annotations. Submit the MCP from scratch as an app-plus-skills plugin after all
production security gates pass.
**AC:** public MCP/domain scan green; reviewer credentials need no MFA/SMS/email;
all tool annotations match side effects; responses contain no undisclosed user
data; kill switch/revocation/load/security drills pass; submission is in review.
**V:** portal tool scan + domain verification + MCP/security/load transcripts.

### LZ-63 · Versioned official-source tax rule registry
`pkg:rules`+`type:legal` · deps: LZ-2 · P0/blocking for breadth
Create a signed registry for Act/Finance Act/Rules/notifications/circulars/ITR
schemas and validation utilities with authority, URL/hash, effective dates,
assessment/tax year, supersession, implementation mapping and reviewer state.
Generate a machine-readable coverage matrix and release manifest from it.
**AC:** no engine constant lacks an authoritative source/version/effective date;
stale/superseded sources fail CI; ruleset hash appears in every calculation and
proof pack; named CA/legal approval is required before `supported=true`.
**V:** registry schema tests + source integrity job + signed release manifest.

### LZ-64 · Deterministic engine production hardening
`pkg:core`+`pkg:engine` · deps: LZ-63 · P0
Replace floating-point rupees with integer paise/decimal arithmetic; inject time
for byte-stable proof artifacts; retain all tax-credit and excluded-source
evidence; add official rounding, calculation DAG, invariant/property/metamorphic
tests, fuzzing, boundary tables and differential checks against government
utilities/independent calculators.
**AC:** zero float currency paths; identical inputs/ruleset produce identical
canonical bytes; every output number maps to inputs and rule nodes; ≥95% branch
coverage; boundary/fuzz corpus green; unexplained differential is release-blocking.
**V:** golden/property/fuzz/differential reports + reproducibility hash check.

### LZ-65 · Personal-income-tax coverage matrix: ITR-1 and ITR-2
`pkg:engine`+`pkg:ingest`+`pkg:itr-json` · deps: LZ-41..46, LZ-63, LZ-64 · P1
Complete salary/multiple employers, house property, other sources, Chapter VI-A,
capital assets, losses, tax credits, interest/fees, surcharge/marginal relief,
advance/self-assessment tax, AIS/TIS/26AS/bank/broker reconciliation and official
ITR-1/2 JSON schedules. Route valuation/treaty/judgment cases to human review.
**AC:** every matrix row has sources, supported inputs, eligibility boundary,
engine rule, JSON schedule, golden fixtures, official-utility cross-check, safe
failure behavior and named reviewer; no partial row is marketed as supported.
**V:** generated coverage report + ITR utility round-trip corpus + CA sign-off.

### LZ-66 · Complex individual/professional coverage: ITR-3 and ITR-4
`pkg:engine`+`pkg:ingest`+`pkg:itr-json` · deps: LZ-35..38, LZ-63..65 · P2
Add F&O/intraday, presumptive income, books boundaries, ESOP/RSU, VDA/crypto,
gaming, NRI/RNOR, foreign income/assets/FTC/DTAA, clubbing, relief, brought-
forward losses and revised/belated/updated-return flows with professional review
for audit, valuation, treaty and ambiguity.
**AC:** same capability-matrix gate as LZ-65; ITR-3/4 official utility validation;
100% safe escalation on audit/treaty/unsupported cases; no silent defaulting.
**V:** full ITR-3/4 corpus + government-utility report + reviewer approvals.

### LZ-67 · Filing, verification and post-filing evidence lifecycle
`pkg:filing`+`pkg:platform`+`pkg:web` · deps: LZ-40, LZ-53, LZ-59, LZ-65 · P2
Qualify an ERI/approved filing provider; require immutable review hash and fresh
purpose-specific consent; implement retry-safe submit/payment/e-verify/status,
acknowledgement, revision/rectification, 143(1) reconciliation and notice-proof
workflows with maker-checker review and kill switches.
**AC:** duplicate/timeout/rejection/revision scenarios are idempotent; submission
is impossible without current review/consent; acknowledgement and post-filing
events extend the proof ledger; production enablement requires named approval.
**V:** sandbox/provider certification + failure drills + signed filing go/no-go.

### LZ-68 · Separate adjacent-tax product discovery
`type:product`+`type:legal` · deps: LZ-63 · P3
Treat GST, TDS/TCS, corporate income tax, transfer pricing and litigation as
separate products. For each, produce persona/JTBD, statutory/source inventory,
data/permission model, filing schemas, reconciliation moat, professional-review
requirements, market proof and independent security/legal launch gate.
**AC:** no adjacent vertical reuses personal-tax claims or permissions by default;
each receives a separate scope lock and ruleset; build starts only after the
personal-tax proof kernel meets its reliability and retention targets.
**V:** approved discovery briefs and explicit go/no-go per vertical.

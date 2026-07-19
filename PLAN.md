# LazyTax — Master Plan (Build Week Scope Lock v2.0)

> **CA-babysitter pivot — effective 19 Jul 2026.** The product outcome is now a
> secure filing companion, not a verification report. The deterministic proof
> kernel remains the trust foundation, but the agent must extract and collect
> evidence proactively, calculate supported portions immediately, maintain one
> open-items checklist, guide the government-portal journey and reserve pauses
> for facts only the taxpayer knows or consequential approvals. The architecture,
> compliance position and trust claims are locked in
> [`docs/CA_BABYSITTER_PIVOT.md`](docs/CA_BABYSITTER_PIVOT.md).

> **Build Week override — effective 19 Jul 2026.** This section supersedes the
> v1 execution order below until the OpenAI Build Week submission is complete.
> The v1 standalone-product plan is preserved as the post-hackathon roadmap.
>
> **Submission:** Apps for Your Life · **Deadline:** 21 Jul 2026, 5:00 PM PDT
> (22 Jul, 5:30 AM IST) · **Status:** MVP CODE COMPLETE; SUBMISSION ASSETS PENDING

## Production robustness and distribution addendum — 19 Jul 2026

The plugin-first thesis remains locked, but production breadth follows a gated
sequence: (1) make the narrow proof kernel release-grade, (2) publish a
skills-only plugin, (3) deploy and submit a secured public MCP-backed plugin,
(4) expand personal income-tax coverage rule-by-rule, and only then (5) build
separate GST/TDS/corporate verticals. “All Indian tax laws” is not an MVP claim.

Four source-of-truth documents now govern this path:

- [`docs/ROBUSTNESS_AUDIT.md`](docs/ROBUSTNESS_AUDIT.md) — current strengths,
  production blockers, and hardening definition.
- [`docs/ANALYTICS_AND_PRIVACY.md`](docs/ANALYTICS_AND_PRIVACY.md) — opt-in,
  metadata-only PostHog protocol; no replay/autocapture on tax surfaces.
- [`docs/PLUGIN_DIRECTORY_RELEASE.md`](docs/PLUGIN_DIRECTORY_RELEASE.md) —
  skills-only and public MCP submission gates for the OpenAI Plugins Directory.
- [`docs/TAX_COVERAGE_STRATEGY.md`](docs/TAX_COVERAGE_STRATEGY.md) — ClearTax
  benchmark, right-to-win thesis, rules supply chain, and sequenced tax coverage.
- [`docs/CA_BABYSITTER_PIVOT.md`](docs/CA_BABYSITTER_PIVOT.md) — proactive
  filing experience, secure real-data architecture, portal rails and compliance
  gates.

The Build Week local plugin remains zero-telemetry and local-first. No PostHog
SDK is added until consent, privacy notice, vendor/region approval, allowlisted
gateway, deletion, and payload tests exist. The target contract lives in
`.telemetry/tracking-plan.yaml`.

## Build Week outcome

Ship **LazyTax for Codex**, a real installable Codex/ChatGPT plugin that turns a
user's existing agent surface into a proactive, evidence-backed Indian tax
filing companion. The submission must demonstrate that GPT-5.6 organizes the
journey and explains evidence while typed local tools select the next action,
reconcile sources, compute deterministically, and generate a Tax Proof Pack.
The Build Week build guides rather than silently submits; production submission
is gated on a secure browser rail or official ERI integration.

**Winning line:** *Give Codex your tax documents. Get back a return that proves
every number.*

**Product thesis:** Tax filing is a provenance and reconciliation problem, not
a form-filling problem. General intelligence becomes trustworthy in a
high-stakes workflow when it is constrained by domain skills, deterministic
tools, source evidence, supported-case checks, and explicit human approval.

## Build Week scope lock

### Must ship

1. Valid Codex/ChatGPT plugin manifest and repo-local marketplace entry.
2. One excellent `verify-tax-return` skill with safety and approval boundaries.
3. Local TypeScript MCP server over stdio with modern, typed, discoverable tools.
4. Deterministic AY 2026-27 engine for one supported taxpayer profile.
5. Three synthetic source documents with deliberate, resolvable discrepancies.
6. Source-linked reconciliation with stable evidence IDs and line references.
7. Tax Proof Pack structured output plus a minimal local evidence viewer.
8. Golden engine/reconciliation tests and ten stable read-only MCP evals.
9. Judge installation/testing guide requiring no real taxpayer data.
10. Public demo script/video under 3 minutes covering Codex and GPT-5.6.

### Supported demo profile

- Resident individual, AY 2026-27.
- One salaried employer.
- Savings interest and domestic dividends.
- Domestic listed-equity STCG/LTCG from one generic broker report.
- Synthetic inputs only for the public demo and repository.

Every tool must fail closed with an actionable unsupported-case result for
business/F&O income, crypto/VDA, foreign assets, NRI status, house property,
multiple employers, loss carry-forward, surcharge/marginal-relief cases, or any
case outside the implemented golden tests.

### Explicitly deferred until after submission

- Standalone Next.js SaaS, authentication, billing, analytics and production DB.
- Claude Code plugin and provider abstraction.
- Real PDF/OCR ingestion and production broker integrations.
- ITR JSON upload claims, direct filing, ERI, portal automation and e-verification.
- ITR-1/2/3 breadth, complex deductions, house property and foreign schedules beyond the supported US-common-stock preparation slice.
- Public marketplace review; judges receive local install instructions.

## Build Week architecture

```text
Codex / ChatGPT Work mode (GPT-5.6)
  -> LazyTax plugin
       -> verify-tax-return skill (workflow + guardrails)
       -> local MCP server over stdio (typed tools)
            -> source normalizer and reconciler
            -> deterministic AY 2026-27 demo engine
            -> Tax Proof Pack generator
       -> local evidence viewer (human inspection)
```

The host model may interpret, summarize, choose tools and explain conflicts. It
must never invent or directly calculate tax amounts. Only deterministic engine
results may be presented as computed values, and every material amount must
carry evidence or calculation provenance.

## Execution plan

| Workstream | Owner | Status | Exit condition |
|---|---|---|---|
| Plugin manifest, marketplace and verification skill | Plugin agent | Complete | Plugin validator passes and skill invokes the correct tools safely |
| Core contracts, deterministic engine and MCP tools | MCP/engine agent | Complete | Strict TS build and golden tests pass; stdio server starts cleanly |
| Fixtures, evals, proof viewer and judge/demo docs | Demo/evals agent | Complete | Three synthetic documents, ten evals and a complete judge path exist |
| Roadmap, integration, install test and code release gate | Primary Codex agent | Complete | Clean install, end-to-end golden path, README and safety checks pass |
| Video, `/feedback` ID and Devpost submission | Sharat | Pending | Public <=2:55 video and complete Devpost form submitted before deadline |

### Release gates

- `npm test` and `npm run build` pass from a clean checkout.
- Plugin manifest passes the official local validator.
- MCP server emits no logs on stdout and exposes only the documented tools.
- A judge can install and complete the synthetic scenario from the README.
- Every displayed amount links to evidence or a deterministic calculation step.
- Unsupported cases are refused, not guessed.
- No secrets, real PAN, taxpayer PII, third-party logos, or real financial data.
- Demo is at most 2:55 and explicitly shows meaningful Codex/GPT-5.6 use.

## Inputs that may require Sharat

Development proceeds without blocking on these. Before final submission Sharat
must provide or confirm: public repository URL and license choice, final plugin
publisher/contact metadata, YouTube upload, Devpost account/submission access,
the `/feedback` Codex Session ID, and final narration/brand approval.

---

## Post-hackathon standalone roadmap (archived v1 execution order)

> **"Taxes for the gloriously lazy."** File your ITR by texting a hyper-competent tax nerd who already read your AIS.
>
> Status: **LOCKED** · Owner: Sharat Chandra MS (PM/TM: Fable orchestrator) · Date: 19 Jul 2026
> Companions: [CLAUDE.md](CLAUDE.md) (agent operating manual) · [TICKETS.md](TICKETS.md) (Linear-ready backlog) · `.claude/skills/` (domain skills)

---

## 0. The clock (non-negotiable reality)

| Date | Event |
|---|---|
| **Jul 19** | Today. Day 0. |
| **Jul 31, 2026** | ITR-1/2/4 non-audit due date for AY 2026-27. **No extension expected** (utilities released early). Peak panic-filing window = Jul 25–31. |
| **Aug 31, 2026** | ITR-3 non-audit due date → natural Wave-2 launch for F&O traders. |
| **Dec 31, 2026** | Belated return window → long tail of stragglers. |

**Implication:** we have ~8 build days + 2 hardening days + 2 launch days. Everything below is scoped to that. ITR-3/F&O is deliberately deferred to the Aug 31 wave — that's a feature, not a cut: "the F&O drop" is a second launch moment.

---

## 1. Name & brand (LOCKED)

**LazyTax** — `lazytax.in` (verify availability at purchase; fallbacks: `lazytax.club`, `filelazy.in`).

- Collision check (researched 19 Jul): an inactive open-source React calculator on GitHub (`rvndbalaji/lazy-tax`), a US-domain `lazytax.net`, and an unrelated info-product. **No commercial Indian tax-filing product uses the name.** Low risk; do a formal TM search before spending on brand.
- Tagline candidates: *"Taxes for the gloriously lazy."* / *"File your ITR without opening a single form."* / *"Your refund called. It said you're lazy. Perfect."*
- Voice: self-deprecating Gen-Z humor on the outside, **boring institutional precision on the inside**. Every number cites its source. The jokes stop at the money.
- Mascot direction: a sloth CA with reading glasses. Share cards feature it.
- Backup names (if TM fails): **TaxSloth**, **ChillarTax**, **JhatpatTax**.

## 2. Form factor decision (LOCKED): canonical web product + MVP client experiments

The question was standalone vs ChatGPT/Claude plugin vs MCP server. Decision matrix:

| Criterion | Standalone web app | GPT/Claude plugin | MCP server |
|---|---|---|---|
| Immersive UX (live dashboard, share cards, animations) | ✅ full control | host-constrained; deep-link to web review | protocol only; client supplies UX |
| Security/DPDP (PAN, AIS, bank data) | ✅ canonical consent/storage boundary | viable only through scopes, redaction and controlled handoff | viable with OAuth, audience-bound tokens, least privilege and no raw-PII defaults |
| Analytics (PostHog funnels, replay) | ✅ full | limited to PII-safe server events | limited to PII-safe server events |
| Audience size (Indian filers who'd actually use it in July) | ✅ everyone with a browser | technical early adopters | developers/agent clients |
| Virality (shareable links, refund flex cards) | ✅ | ❌ | ❌ |
| Skill showcase (product + design + agents + infra) | ✅ full stack | partial | agents only |

**Locked:** the standalone Next.js web app is the canonical taxpayer record, consent surface, document-review experience and filing handoff. A shared capability-scoped API powers three **thin MVP client experiments**: a LazyTax MCP server, a Codex plugin and a Claude Code plugin. All four surfaces reuse the same engine, case state and audit ledger.

The clients may calculate with structured inputs, inspect an explicitly authorized case, explain/resolve mismatches and request a Tax Proof Pack. They do **not** compute independently, hold database credentials or submit a return. Sensitive upload, consent and final review stay in a controlled LazyTax surface unless a host can meet the same controls. Each client has independent feature flags, scope revocation and a server-side kill switch.

## 3. Vision & principles (LOCKED, inherited from Taxly doc)

One-liner: *Tax filing that feels like texting a calm, hyper-competent tax expert who already knows your data.*

Seven principles (all locked):
1. **Conversation first, forms never.**
2. **Accuracy over magic** — deterministic engine + reconciliation; the LLM never computes tax.
3. **Radical simplicity at the end** — the official-portal handoff is a 2-minute guided formality.
4. **Trust through transparency** — every number shows its source (AIS vs broker vs Form 16) and a plain-language explanation.
5. **Delight is a feature** — live dashboard, refund reveal moment, shareable summary cards.
6. **Agent-native** — multi-agent orchestration (planning, tools, memory) on the Claude API, not chatbot + rules.
7. **Compliance-aware** — assisted-JSON model now; architecture leaves a clean seam for ERI later.

Primary persona (locked): **"Arjun, 27, SWE + Zerodha investor, files ITR-2, hates forms, will post the refund card."**

## 4. Scope lock

### Wave 1 — MVP, live by Jul 27, peak Jul 28–31

**In:**
- Chat-first interface + live tax summary dashboard (income, deductions, tax, refund — updates in real time as data lands).
- **ITR-1 and ITR-2** for AY 2026-27: salary (Form 16), equity capital gains (§111A STCG 20%, §112A LTCG 12.5% over ₹1.25L combined exemption, grandfathering election for pre-23-Jul-2024 assets), dividends, savings/FD interest, 80C/80D/HRA/home-loan deductions.
- Ingestion: **Form 16 PDF**, **AIS JSON/PDF**, **Zerodha + Groww Tax P&L** (deep, tested against real fixtures). Upstox/Angel One = graceful "email us the file" fallback, not parsers.
- Reconciliation agent: AIS ↔ broker P&L diff with conversational mismatch resolution ("AIS says ₹42,180 dividends, Zerodha says ₹41,900 — here's the difference, here's what I recommend").
- New vs Old regime comparison with an explainable recommendation.
- **Portal-ready JSON generation** that validates against the ITD schema + offline utility, plus **guided handoff**: step-by-step screenshots-style walkthrough of upload → verify → e-verify (Aadhaar OTP).
- Post-generation: e-verification checklist + "did it work?" check-in.
- **Refund flex card** — beautiful, shareable, no PII (amount optional/blurrable) — the viral artifact.
- PostHog analytics wired end-to-end; Sentry; structured logs.
- **Tax Proof Pack** — source map, reconciliations, user decisions, ruleset and ITR-field trace in a CA-shareable artifact.
- MVP interface experiments: hosted LazyTax MCP server, Codex plugin and Claude Code plugin, all backed by the canonical case API. No filing/submission tool is exposed.

**Out of Wave 1 (explicitly):**
- ITR-3 / F&O / intraday (Wave 2, Aug), ITR-4/44ADA (Wave 2), foreign employee equity/corporate actions/loss set-off beyond the supported US-common-stock engine, direct broker API logins, full ERI e-filing, notice management, voice/WhatsApp, multi-PAN/family, year-round planning, native mobile app.

### Wave 2 — "The F&O Drop", target Aug 10–31
ITR-3: F&O as non-speculative business income (code 21010), intraday speculative (21009), Trading-Account disclosure (defective-return trap), Form 10-IEA regime opt-out, 44ADA presumptive for freelancers, Upstox/Angel One parsers.

### Wave 3 — post-season
Sandbox ERI full e-file (file-from-chat), notice tracking, public calculator distribution, year-round tax planner, WhatsApp.

## 5. Architecture (LOCKED)

```
apps/web (Next.js 15 / React 19 / TS strict / Tailwind + shadcn)
  Chat pane ⟷ Live dashboard pane (Zustand store, one source of truth: TaxProfile)
        │ REST + SSE (streaming agent turns)
        ▼
API service (Next.js route handlers → extract to Fastify only if needed; keep it boring)
  ├─ packages/core     — Zod contracts: TaxProfile, IncomeItem, ReconciliationDiff,
  │                      AgentToolParams, ITRJson types. FROZEN. Depends on nothing.
  ├─ packages/engine   — PURE deterministic tax engine, AY-versioned (rules/AY2026_27.ts),
  │                      integer paise, ITD rounding. Zero I/O. The crown jewel.
  ├─ packages/ingest   — Form16/AIS/broker parsers → normalized IncomeItems.
  │                      pdf parsing + Claude structured-output extraction w/ Zod validation.
  ├─ packages/agent    — Orchestrator loop (Claude API tool runner) + subagent prompts
  │                      + eval harness. The Director never computes tax; it calls engine tools.
  ├─ packages/itr-json — TaxProfile → ITR-1/ITR-2 portal JSON + ITD schema validation.
  ├─ packages/filing   — filing-provider adapter interface; SandboxProvider (dev/test);
  │                      future ITDEriProvider. Wave 1 uses it for validation/calculator only.
  ├─ packages/platform — canonical case API, capability scopes, idempotency, review hashes,
  │                      append-only audit ledger and typed client SDK.
  ├─ packages/mcp      — hosted MCP adapter; public calculator tools + scoped case tools.
  ├─ plugins/codex     — Codex skills/config over MCP; never computes or files.
  ├─ plugins/claude-code — Claude Code skills/config over MCP; never computes or files.
  ├─ packages/db       — Prisma + Neon Postgres. Encrypted PII columns (AES-GCM, key in env/KMS).
  └─ packages/config   — env validation (fail fast), PostHog/Sentry init helpers.
```

**Agent design** (single orchestrator + tools, not five chat personas — cheaper, more testable):
- **Orchestrator** — `claude-opus-4-8`, adaptive thinking, SDK tool runner. Owns the conversation, plans, calls tools.
- Tools (all typed, Zod-validated, pure where possible): `parse_document`, `reconcile_sources`, `compute_tax` (engine), `compare_regimes` (engine), `explain_line_item`, `generate_itr_json`, `update_dashboard`, `ask_user`.
- Document extraction inside `parse_document` uses Claude structured outputs (`output_config.format` with strict schemas) so parser output is guaranteed-shape; deterministic CSV/XLSX paths for Zerodha/Groww first, LLM extraction as fallback for PDFs.
- (Cost note: extraction calls could run on `claude-haiku-4-5`; defaulting everything to Opus 4.8 for launch quality — downgrade only after evals prove parity. Your call, flagged.)
- **Memory/context:** conversation state persists as the `TaxProfile` (DB) — the chat can always be reconstructed from it; server-side compaction (`compact-2026-01-12` beta) for long sessions; prompt-cached frozen system prompt.

**Determinism rule (golden):** LLM output never becomes a tax number without passing through Zod validation → user confirmation (for parsed amounts) → the deterministic engine. The engine is the only thing that produces liability figures.

**Client rule (golden):** web, MCP, Codex and Claude Code are clients of the same capability-scoped platform API. Every mutation carries actor, client, purpose, consent reference, idempotency key and case version. ITR JSON generation requires a current review hash and explicit confirmation. MVP clients cannot file or submit.

## 6. Domain rules to encode (AY 2026-27) — engine + test spec

Already researched and locked (see [itr plan](../../itr-efiling-build-and-test-plan.md) and skill `itr-ay2026-27-rules`):
- New regime slabs 0/5/10/15/20/25/30 (4L bands to 24L), std ded ₹75k, §87A ₹60k → nil to ₹12L; old regime slabs, std ded ₹50k, §87A ₹12.5k.
- 4% cess; surcharge 10/15/25/37% with 25% cap on cap-gains.
- §111A 20%; §112A 12.5% over ₹1.25L; property/gold election 12.5%-no-index vs 20%-indexed for pre-23-Jul-2024; debt MF at slab.
- **Special-rate gains get NO §87A rebate** — the classic bug; explicit golden test.
- Due dates and belated/revised windows.

## 7. Testing, evals, verifiability (the backbone)

| Layer | What | Gate |
|---|---|---|
| Engine golden tests | Table of (profile → expected liability) built from the ITD old-vs-new calculator + worked examples; rebate cliff at 12L, surcharge boundaries, ₹1.25L exemption edge, no-87A-on-special-rate | 100% pass, ≥95% branch coverage on engine |
| Property tests (fast-check) | Liability monotonic in income; regime-compare picks true minimum; paise rounding invariants | pass in CI |
| Parser fixture tests | ≥10 real Zerodha + ≥10 real Groww P&L files, ≥5 Form 16s, ≥5 AIS files → exact expected extractions | ≥98% field accuracy; hard fail below |
| Agent evals | Golden conversation set (≥40 scenarios): correct tool calls, no hallucinated numbers, correct refusals (e.g. "can I hide income?") | ≥90% tool accuracy, 100% on guardrail set |
| ITR-JSON schema tests | Generated JSON validates vs ITD published schema + round-trips the offline utility; defective-return trap checks | 100% |
| Sandbox.co.in integration | Calculator cross-check (our engine vs their calculator API on fixture table), Prepare-ITR contract tests | match on all fixtures |
| E2E (Playwright) | 3 fixture users (salaried; salaried+CG; salaried+CG+mismatch) drive chat → JSON download → handoff screen | green on every PR touching web |
| Regression snapshots | Every fixture's computed liability + generated JSON snapshotted; any diff must be explained in the PR | CI diff gate |
| Manual concierge QA | Days 9–10: 15–20 real users file with us watching (Founder QA) | ≥80% complete handoff unaided |

**Guardrails (product):**
- The agent shows a "Review screen" before JSON generation; user must confirm every income head. Confirmation state is stored.
- Refusal rails: no advice on evasion, no fabricated deductions, no filing without user confirmation; eval set covers these.
- Money is integer paise everywhere; floats banned by lint rule in engine/itr-json.
- Every displayed number carries `{value, source, explanation}` — enforced by the `Money` type in core.
- Plain-language, purpose-specific, versioned consent at onboarding; delete/export/correct/withdraw/grievance workflows from day 1; PII encrypted at rest; **no PAN/PII in PostHog, Sentry, logs or model prompts beyond an approved parsing purpose** (PAN masked to last 4 in UI and omitted from telemetry).

### Security and data-protection protocol

Launch posture is **DPDP-ready**, not a self-certified claim of compliance. Indian privacy/cyber counsel must approve the notice, retention schedule, vendor contracts, incident decision trees and public wording. The main DPDP processing, consent, security, rights and breach provisions are in phased commencement; we build to their target state now while meeting currently applicable CERT-In and contractual duties.

1. **Know the data:** version-controlled data inventory/ROPA, trust-boundary diagram, processor and region register, STRIDE-style threat model and high-risk privacy assessment before production data.
2. **Minimize and bind purpose:** collect only supported filing inputs; record purpose and consent/authorization on every job; local/deterministic parsing first; optional analytics consent is separate from filing.
3. **Control model egress:** all model calls pass through one allowlisted gateway that redacts identity, blocks direct SDK use, records metadata-only audit events, neutralizes document prompt injection and fails closed.
4. **Isolate and encrypt:** deny-by-default tenant authorization on every route/tool; private object storage and short-lived signed URLs; TLS 1.2+ in transit; AES-256-GCM application encryption for restricted fields with envelope keys in managed KMS; separate environments and rotation.
5. **Restrict people and clients:** MFA and least privilege for production, audited just-in-time break-glass access, OAuth/capability scopes for MCP/plugins, short-lived grants, revocation, rate limits and independent kill switches.
6. **Govern vendors:** no restricted egress without an approved processor record, DPA, training/retention configuration, subprocessor disclosure, incident SLA, deletion path and documented data-location/cross-border decision.
7. **Expire and delete:** proposed defaults: temporary parser data ≤24h, inactive unsubmitted uploads 7d, completed cases/documents user-deletable with 30d default maximum unless counsel confirms a retention duty; encrypted backups expire on schedule; deletion returns a receipt and propagates to processors.
8. **Detect and respond:** metadata-only security logs retained for the applicable CERT-In period, synchronized clocks, 24×7 escalation contacts, regulator/user decision trees, evidence preservation, vendor escalation and pre-beta tabletop drills.
9. **Prove it:** secret/SAST/SCA/IaC scanning, malicious-file and API fuzz tests, cross-tenant matrices, PII canaries, prompt-injection evals, restore/deletion/rotation drills and independent pre-launch review. Zero open critical/high findings at release.

## 8. Analytics — consented metadata, not taxpayer surveillance

PostHog is a future hosted-product destination, not a dependency of the Build
Week local plugin. Capture is opt-in and disabled by default. Tax surfaces never
use autocapture, pageviews, session replay, heatmaps, surveys, device
fingerprinting, or prompt tracing. Events carry no PII, IP/GeoIP, identifiers
linked to a case, filenames/paths, document content, evidence IDs, tax heads,
deductions, amounts, outcomes, regime winner, prompts, model responses, or free
text. PostHog person profiles are disabled.

The nine-event allowlist, forbidden properties, funnels, consent behavior,
deletion path, and implementation order are defined in
`.telemetry/tracking-plan.yaml` and `docs/ANALYTICS_AND_PRIVACY.md`. The
north-star is the rate of opted-in verification starts that produce a
user-approved Tax Proof Pack. Channel choice uses completion and safe failure
rates by client/ruleset, plus separately consented qualitative research.

## 9. Design language (LOCKED direction)

- **Layout:** split hybrid — chat left, live dashboard right (mobile: dashboard as a pull-up sheet over chat). Dashboard = stacked "money cards": Income, Deductions, Tax, **Refund** (hero card, animated count-up on change).
- **Feel:** calm fintech, not meme UI. Warm off-white light theme + rich dark theme; one accent (electric green for refunds, amber for "needs you"); big numerals (tabular figures); micro-animations on every number change (this is the "live" magic); confetti exactly once — at JSON generation.
- **Typography:** a distinctive display face for numbers/headlines + clean grotesk for chat. **No Inter-on-white default.** (Per design-skill guidance: propose 4 concrete directions in the design ticket before building; pick one.)
- **Trust surface:** every dashboard number has a tap-target → "where this came from" sheet (source doc, line, rule applied, plain-language why).
- **Shareable artifact:** refund flex card — sloth mascot, "LazyTax did my taxes in 7 minutes", optional blurred amount, `lazytax.in` watermark. One-tap share to X/WhatsApp/IG story sizes.
- Streaming agent replies with tool-activity chips ("reading your Zerodha P&L…") — visible competence is the immersion.

## 10. Build plan — the agent swarm

**Roles:** Fable = PM + tech manager + reviewer (this session; never writes product code). Sub-agents own packages exclusively (CLAUDE.md rule 1). Parallelism follows the dependency DAG:

```
W0 (sequential, Day 1): LZ-1 repo scaffold → LZ-2 core contracts → LZ-3 CI + skills → security/data map baseline
W1 (parallel, Days 1–4):
  A: engine (LZ-4..6)          B: ingest (LZ-7..10)
  C: web shell + design (LZ-11..13)   D: agent orchestrator (LZ-14..16)
  E: db/config/analytics (LZ-17..19)   K: secure data plane, egress, consent, retention, vendors
W2 (parallel, Days 4–7):
  F: itr-json + validation (LZ-20..21)   G: reconciliation + review UX (LZ-22..23)
  H: handoff flow (LZ-24)   I: share card + landing (LZ-25..26)   J: filing adapter/Sandbox (LZ-27)
  L: canonical case API → MCP → Codex/Claude Code thin clients + interface experiment
W3 (Days 7–9): E2E + evals + guardrails + perf + incident/security release gates (LZ-28..30 + addendum)
W4 (Days 9–11): concierge beta, bugfix, dashboards (LZ-31..32)
W5 (Days 11–12): launch (LZ-33..34)
```

Every ticket in [TICKETS.md](TICKETS.md) carries acceptance criteria + a verification command; Fable reviews each PR against the DoD skill (`lazytax-verify`) and the boundary rules before merge. Integration risk is retired early: LZ-2 (contracts) merges before any W1 work starts, and a daily "walking skeleton" check (chat → hardcoded engine call → dashboard) runs from Day 2.

## 11. Risks (top 5, with mitigations)

1. **Timeline** (H): 12 days is brutal and the three interface experiments add work → web + engine + security gates remain launch-critical; each plugin is a thin adapter and may launch invite-only; no duplicated tax logic or filing ability; concierge fallback if parsers slip.
2. **Accuracy → notices** (H): deterministic engine + Sandbox calculator cross-check + mandatory review screen + golden tests. Public accuracy claim only after eval table is green.
3. **Parser variance in the wild** (M-H): confidence scores; anything <0.9 confidence becomes a conversational confirmation, never a silent number; "email us the file" fallback feeds the fixture set.
4. **Trust/legal/security** (H): assisted model = user files their own return; DPDP-ready protocol, CERT-In playbook, vendor approvals, independent security review and qualified Indian tax/privacy counsel sign-off before real-user beta.
5. **Launch flop** (M): virality plan is concrete (below), and the Aug 31 ITR-3 wave is a built-in second shot.

## 12. GTM & virality

- **Seed (Days 9–11):** 20 concierge users from X/IN fintech mutuals + office Slack; each produces a testimonial + refund card.
- **Launch (Jul 27–28):** X thread — "I built an AI that files your ITR while you eat maggi. 4 days left. Here's how it works 🧵" with dashboard screen-recording; Reddit r/IndiaInvestments + r/personalfinanceindia (value-first post about the ₹1.25L LTCG exemption trap, product in footer); Product Hunt optional Jul 29.
- **Deadline-week engine:** countdown banner on landing ("X days till Jul 31"); refund flex cards carry the link; referral hook "skip the queue" (cosmetic priority).
- **Second wave (Aug):** "F&O bros, your turn" — ITR-3 launch to the loudest trader community on X.
- Success (season 1): 500 completed handoffs, 25% share-card rate, 1 viral thread (>100k views), NPS >50 from concierge cohort.

## 13. Decisions log (all LOCKED unless marked)

| # | Decision | Status |
|---|---|---|
| D1 | Name: LazyTax | ✅ |
| D2 | Standalone web app is canonical; MCP + Codex + Claude Code are thin, capability-scoped MVP client experiments | ✅ |
| D3 | Assisted-JSON + guided handoff (no ERI in MVP) | ✅ |
| D4 | Wave 1 = ITR-1 + ITR-2; ITR-3 = Aug wave | ✅ |
| D5 | Brokers: Zerodha + Groww deep; others fallback | ✅ |
| D6 | Broker-P&L-first for capital gains, AIS as cross-check (AIS CG data is unreliable) | ✅ |
| D7 | Deterministic engine only for numbers; LLM orchestrates + explains | ✅ |
| D8 | Stack: pnpm/Turborepo, Next.js 15/React 19/TS strict/Tailwind+shadcn/Zustand/Zod, Prisma+Neon, private S3-compatible storage, managed KMS, provider-gated Claude API, MCP TS SDK, PostHog/Sentry | ✅ |
| D9 | Sandbox.co.in as test/validation backend; filing-adapter seam for future ERI | ✅ |
| D10 | Single orchestrator + typed tools (not 5 chat personas) | ✅ |
| D11 | Extraction model tiering (Opus→Haiku) | ⏳ decide after evals |
| D12 | Domain purchase + TM search | ⏳ Sharat, Day 1 |
| D13 | PostHog vendor/region gated; replay/autocapture prohibited on tax surfaces; metadata-only opt-in contract locked | ⏳ vendor decision in LZ-60 |
| D14 | Security posture: DPDP-ready until counsel approval; canonical data map/consent/audit/deletion/incident protocol | ✅ |
| D15 | No MVP MCP/plugin filing tool; current review hash + explicit web-controlled confirmation required for JSON | ✅ |
| D16 | Interface winner chosen by verified completion, trust and guardrail metrics, not installs | ✅ |

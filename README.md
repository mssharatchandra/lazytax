# LazyTax for Codex

[![Verify LazyTax](https://github.com/mssharatchandra/lazytax/actions/workflows/verify.yml/badge.svg)](https://github.com/mssharatchandra/lazytax/actions/workflows/verify.yml)

> Give LazyTax your documents. It does the filing legwork and asks only what it
> cannot safely discover.

LazyTax is an installable Codex/ChatGPT plugin that behaves like a proactive,
CA-style Indian tax-filing companion and an AI junior for existing CAs and tax
professionals. It consolidates synthetic fixtures or
explicitly authorized real documents, deterministically plans the next filing
action, collects likely missing authoritative sources before interrogating the
taxpayer, reconciles evidence, delegates supported calculations to a local
engine, masks private identifiers in tool outputs, and produces a source-
indexed Tax Proof Pack.

The product uses one canonical case with two role-aware surfaces: a taxpayer
concierge and a practitioner cockpit. It augments CAs; it does not impersonate
or replace professional judgment.

**OpenAI Build Week track:** Apps for Your Life  
**Status:** CA-companion pivot shipped locally; synthetic judge mode and private
preparation mode work. Secure portal concierge and official ERI submission are
roadmap-gated.

**Important:** The current local build prepares and guides; it does not claim an
automatic government submission. Never provide tax-portal credentials or OTPs
in chat. Private files are handled only when the user explicitly asks Codex to
work on those exact files.

## Why this exists

Taxpayers do not want a verification report; they want someone competent to
stay with them until filing is done. The hard part is assembling fragmented
sources, discovering what is missing, reconciling disagreements and preserving
proof—not merely filling fields.

LazyTax treats GPT-5.6 as the interpretation and orchestration layer and local
typed tools as the numeric authority:

```text
Codex / ChatGPT Work mode (GPT-5.6)
  -> LazyTax CA-companion skill
  -> deterministic next-best-action planner
  -> local MCP tools over stdio
  -> deterministic AY 2026-27 engine
  -> source-indexed Tax Proof Pack
  -> minimal local evidence viewer
```

The model may inventory evidence, explain discrepancies and choose the next
tool. It may not invent tax facts or calculate liability in free-form text.

## Build Week supported profile

The deterministic calculation deliberately supports only:

- AY 2026-27 resident individual under 60.
- One domestic salary source.
- Savings interest and dividends.
- STT-paid domestic listed-equity STCG/LTCG.
- Ordinary USD US common-stock investments with FIFO lots, documented INR
  acquisition costs, evidenced prior-month-end SBI TT sale rates, Schedule
  CG/FSI/FA preparation, and no unsupported corporate actions or capital-loss
  set-off.
- Income below the surcharge threshold and outside the unsupported marginal-
  relief band.
- No deduction beyond the regime's standard deduction.
- The three committed synthetic JSON fixtures, or explicitly authorized private
  facts normalized with identifiers pseudonymized.

Business/professional income, multiple employers, house property, crypto,
F&O/intraday, foreign employee equity, corporate actions, foreign capital-loss
set-off, surcharge cases and filing actions fail closed. Private documents do
not fail merely because they contain PII; unsupported tax categories are
surfaced as review flags.

## What works

- Installable Codex/ChatGPT plugin and `verify-tax-return` skill.
- Local TypeScript MCP server using stdio and structured tool outputs.
- Deterministic CA-style filing-session planner that prioritizes safe work and
  authoritative source collection before residual user questions.
- Strict pseudonymous taxpayer/preparer/reviewer contracts and a deterministic
  materiality-ranked practitioner queue exposed through MCP.
- Separate synthetic and private normalization tools so real data cannot be
  accidentally relabelled as demo data.
- Source normalization with stable evidence IDs and locators.
- Conflict-preserving reconciliation with explicit user confirmation.
- Deterministic old/new regime comparison for the supported profile.
- Deterministic US-stock FIFO matching, Rule 115 FX-date validation, foreign
  STCG/LTCG tax bridge, and Schedule CG/FSI/FA preparation.
- Evidence index, decisions, assumptions, rule sources and SHA-256 integrity in
  a structured Tax Proof Pack.
- Three synthetic source documents, golden tests, MCP/practitioner evals, a
  taxpayer evidence viewer and a separate synthetic practitioner cockpit.
- An executable Trust Lab that reruns the live MCP workflow twice and checks 11
  governance claims inside a constrained child process, plus Chromium E2E tests
  across all three judge-visible surfaces.

It does **not** produce official ITR JSON, submit to the government portal,
handle credentials/OTPs, or certify legal correctness.

## Setup and run locally

Requirements: Node.js 20+ and a current Codex CLI/desktop installation.

For a clean, lockfile-reproducible checkout:

```sh
npm ci
npm run check
npm run test:e2e:install
npm run check:full
npm run install:plugin
```

`npm run check:full` is the complete local gate: strict TypeScript builds,
unit/integration/viewer tests, plugin validation, source and isolated-copy MCP
smoke tests, and four Chromium journeys. The `npm install` sequence below is
the equivalent incremental-development path.

```sh
npm install
npm run check
npm run test:e2e:install
npm run check:full
npm run install:plugin
```

`npm run check` builds the self-contained plugin, validates its marketplace and
manifest wiring, and runs the complete synthetic workflow from both the source
tree and an isolated copy that behaves like Codex's install cache. The install
command safely registers this repository's `personal` marketplace, installs or
refreshes `lazytax@personal`, and refuses to overwrite a different marketplace
with the same name.

Start a new Codex task after installation, select GPT-5.6, and ask:

> Use $verify-tax-return with the bundled `build_week_demo` fixtures. Inventory
> the evidence, show every discrepancy, and stop for my confirmation before
> resolving anything.

### Synthetic sample data

The `build_week_demo` shortcut loads three fictional, PII-free FY2025-26 /
AY2026-27 sources committed in the repository:

```text
fixtures/form16.synthetic.json
fixtures/ais.synthetic.json
fixtures/broker-pnl.synthetic.json
```

They deliberately contain one resolvable salary discrepancy. This lets judges
see that LazyTax preserves conflicting evidence and waits for confirmation
instead of guessing. After confirming the salary, ask LazyTax to calculate both
regimes, call `lazytax_prepare_filing_guide`, and generate the Tax Proof Pack
only after final approval.

When asked to resolve the salary conflict, the intended synthetic-demo choice
is ₹18,40,000, representing ₹18,00,000 regular salary plus the separately
reported ₹40,000 bonus. Review the evidence IDs before confirming it.

See [JUDGE_GUIDE.md](JUDGE_GUIDE.md) for the complete judge path and
[DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the <=2:55 submission narrative.
The public-safe Build Week provenance and recommended `/feedback` value are in
[docs/CODEX_SESSION_LEDGER.md](docs/CODEX_SESSION_LEDGER.md).

### Run the local interfaces

```sh
npm run viewer
```

Open `http://127.0.0.1:4173` for the taxpayer evidence flow,
`http://127.0.0.1:4173/practitioner.html` for the synthetic practitioner
cockpit, and `http://127.0.0.1:4173/trust-lab.html` for the executable Trust
Lab. The default judge paths are synthetic; never enter portal credentials,
OTPs or EVCs.

## MCP tools

| Tool | Purpose |
|---|---|
| `lazytax_plan_filing_session` | Select one privacy-safe next filing action and keep partial progress moving |
| `lazytax_plan_practitioner_queue` | Build a role-aware, PII-free assigned-case queue and next practitioner action |
| `lazytax_normalize_fixture_data` | Load/validate the bundled demo or supplied synthetic fixture objects and preserve provenance |
| `lazytax_normalize_private_tax_facts` | Pseudonymize tax facts from explicitly authorized private documents and return masked evidence |
| `lazytax_compute_us_stock_investments` | Match supported US-stock lots and prepare source-linked CG/FSI/FA bridge facts |
| `lazytax_reconcile_evidence` | Compare source totals, surface conflicts and apply explicit confirmations |
| `lazytax_calculate_compare_regimes` | Deterministically calculate the supported old/new-regime estimates |
| `lazytax_prepare_filing_guide` | Choose ITR-1/ITR-2 and map reconciled Form 16, AIS and broker amounts to ordered portal schedules and fields |
| `lazytax_generate_tax_proof_pack` | Generate the structured evidence and calculation artifact |

All nine tools are read-only and non-destructive. Planning, normalization, reconciliation
and calculation are idempotent; proof-pack generation is timestamped and
therefore marked non-idempotent despite having no side effects. The local stdio
server logs only failures to stderr.

## Development commands

```sh
npm install       # install workspace dependencies
npm run build     # strict TypeScript build: core -> engine -> MCP
npm test          # schema, golden-engine and MCP smoke tests
npm run check     # build + unit/integration tests + plugin smoke paths
npm run test:e2e  # real Chromium journeys across taxpayer, CA, and Trust Lab surfaces
npm run check:full # standard release gate plus Playwright
npm run preflight:plugin # validate portable bundle and marketplace wiring
npm run smoke:plugin # full source + isolated-copy MCP workflow
npm run verify:plugin # rebuild and run both plugin-only checks
npm run install:plugin # verify, register marketplace and install/refresh
npm run mcp       # start the stdio server (normally launched by the plugin)
```

To inspect the evidence UI without a web framework, serve the repository root:

```sh
npm run viewer
```

Then open `http://127.0.0.1:4173` and click **Run synthetic MCP workflow**.
The loopback-only viewer runs the canonical fixture set through the real MCP
tools in memory, renders their structured output, and exports the generated Tax
Proof Pack. It rejects cross-origin generation and accepts no uploaded data.
Open `http://127.0.0.1:4173/practitioner.html` for the synthetic practitioner
queue. That surface demonstrates risk ordering and maker-checker handoff; it is
not authentication, tenancy or a production case store.

Open `http://127.0.0.1:4173/trust-lab.html` and click **Run isolated synthetic
trust suite** for the highest-signal judge view. It executes the real MCP chain
twice and verifies conflict gating, stable replay hashes, 100% material evidence
coverage, deduplication, mixed-taxpayer rejection, PII canary containment,
unsupported-profile rejection, maker-checker separation, least-privilege tool
annotations, and Tax Proof Pack integrity. The worker accepts only a fixed suite
identifier, inherits no parent environment, and has time/output ceilings. This
is process isolation, not an OS/container security boundary.

## How Codex and GPT-5.6 were used

### What existed before the Submission Period

- Product-scope documents and a standalone HTML interaction prototype.
- A broad, pre-implementation standalone tax-product backlog.

### What was built during Build Week

- The plugin-first strategy and narrowed supported-case contract.
- Installable plugin manifest, marketplace, verification skill and launcher.
- Strict TypeScript core schemas, deterministic engine and MCP server.
- Synthetic evidence fixtures, reconciliation workflow and Tax Proof Pack.
- Golden tests, MCP evals, judge instructions and evidence viewer.

### How Codex accelerated the build

Codex turned the product thesis into an executable repository under the Build
Week deadline. It decomposed work into plugin, deterministic engine/MCP,
privacy/security, practitioner workflow and demo/evaluation streams;
implemented strict contracts, calculation paths and regression tests; checked
the narrow tax assumptions against official sources; kept the self-contained
installed plugin synchronized; and repeatedly ran the build, isolated-copy
smoke, Trust Lab and browser gates. This shortened the loop from product
decision to typed implementation to adversarial verification while preserving
human review at scope and release boundaries.

### Key human decisions

Sharat Chandra MS chose the Indian tax-reconciliation problem, evidence-first
product thesis, Apps for Your Life track, plugin-first distribution, supported
demo persona and explicit decision to prohibit automated filing. The human also
owns final scope, brand, demo narration and submission claims. The decisions to
make practitioners the trust/distribution wedge, preserve one canonical case,
support ordinary US shares narrowly, and prioritize secure intake before a
real-taxpayer beta are recorded in [DECISIONS.md](DECISIONS.md) and the
canonical [AGENTS.md](AGENTS.md).

### GPT-5.6's product role

In the demonstrated workflow GPT-5.6 runs inside Codex/ChatGPT and follows the
installed verification skill. It interprets the user's request, inventories
the returned evidence, selects typed MCP tools, explains conflicts and requests
confirmation. It is intentionally prevented from becoming the numeric source
of truth; all displayed calculations, supported ITR-form choices and filing
field amounts come back from the deterministic engine. Codex was the
engineering environment; GPT-5.6 is also the runtime orchestration and
explanation layer shown in the product demo.

### `/feedback` submission provenance

The Codex session containing the majority of the product strategy, core
implementation, verification and release work is:

```text
019f7a12-3155-7fc2-bcd9-7cc5f2078de6
```

Use that value in the submission field requesting the **“/feedback Session ID
where the majority of your project was worked on.”** Before submitting, return
to that primary Codex task and run `/feedback` as a standalone command. The
repository can record the task ID but cannot submit task feedback on the user's
behalf. The sanitized provenance and supporting-session rationale are in
[docs/CODEX_SESSION_LEDGER.md](docs/CODEX_SESSION_LEDGER.md); raw task exports
are intentionally excluded because supporting sessions contain private tax
document context.

## Tax-rule sources and limitations

The narrow engine encodes AY 2026-27 slabs, standard deductions, section 87A
treatment, 4% cess and the supported section 111A/112A rates based on official
Income Tax Department material linked from the engine output. It is not a
complete implementation of Indian tax law. Its guardrails are part of the
product, not a promise of production readiness.

## Production planning

- [Robustness audit](docs/ROBUSTNESS_AUDIT.md)
- [Analytics and privacy](docs/ANALYTICS_AND_PRIVACY.md)
- [OpenAI Plugins Directory release](docs/PLUGIN_DIRECTORY_RELEASE.md)
- [Tax coverage and competitive strategy](docs/TAX_COVERAGE_STRATEGY.md)
- [Telemetry product model and target contract](.telemetry/README.md)

## Repository map

```text
plugins/lazytax/      installable CA-companion bundle, skill, launcher and MCP config
packages/core/        strict schemas and shared contracts
packages/engine/      deterministic normalization/reconciliation/tax/proof logic
packages/mcp/         modern TypeScript MCP server and nine focused tools
scripts/              plugin bundler and real stdio smoke test
sandbox/              allowlisted process-isolated synthetic Trust Lab runner
fixtures/             three fictional source documents
evals/                stable read-only evaluation questions
viewer/               taxpayer proof, practitioner queue, and executable Trust Lab
e2e/                  Playwright journeys over all judge-visible surfaces
docs/                 production analytics, distribution and coverage plans
.telemetry/            product model, current-state audit and target event contract
PLAN.md               Build Week scope lock plus archived standalone roadmap
TICKETS.md            BW-P0 execution backlog plus post-hackathon backlog
AGENTS.md             canonical product direction, progress and engineering contract
```

## License

MIT. See [LICENSE](LICENSE).

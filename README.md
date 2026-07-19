# LazyTax for Codex

> Give Codex your tax documents. Get back a return that proves every number.

LazyTax is an installable Codex/ChatGPT plugin for an evidence-backed Indian
tax-verification workflow. It reconciles synthetic Form 16-like, AIS-like and
broker records, refuses to guess through conflicts, delegates all calculations
to a deterministic local engine, and produces a source-indexed Tax Proof Pack.

**OpenAI Build Week track:** Apps for Your Life  
**Status:** Build Week MVP using synthetic data only  
**Important:** LazyTax does not file a return and is not tax, legal or financial
advice. Never use this build with real PAN, Aadhaar, credentials, OTPs or
taxpayer documents.

## Why this exists

Tax filing is often a provenance and reconciliation problem rather than a
form-filling problem. Several plausible records can disagree, and a fast answer
is not useful if the taxpayer cannot establish where every amount came from.

LazyTax treats GPT-5.6 as the interpretation and orchestration layer and local
typed tools as the numeric authority:

```text
Codex / ChatGPT Work mode (GPT-5.6)
  -> LazyTax verification skill
  -> local MCP tools over stdio
  -> deterministic AY 2026-27 demo engine
  -> source-indexed Tax Proof Pack
  -> minimal local evidence viewer
```

The model may inventory evidence, explain discrepancies and choose the next
tool. It may not invent tax facts or calculate liability in free-form text.

## Build Week supported profile

The public demo deliberately supports only:

- AY 2026-27 resident individual under 60.
- One domestic salary source.
- Savings interest and dividends.
- STT-paid domestic listed-equity STCG/LTCG.
- Income below the surcharge threshold and outside the unsupported marginal-
  relief band.
- No deduction beyond the regime's standard deduction.
- The three committed synthetic JSON fixtures.

Business/professional income, multiple employers, house property, foreign
income/assets, crypto, F&O/intraday, loss carry-forward, surcharge cases,
production documents and filing actions fail closed.

## What works

- Installable Codex/ChatGPT plugin and `verify-tax-return` skill.
- Local TypeScript MCP server using stdio and structured tool outputs.
- Source normalization with stable evidence IDs and locators.
- Conflict-preserving reconciliation with explicit user confirmation.
- Deterministic old/new regime comparison for the supported profile.
- Evidence index, decisions, assumptions, rule sources and SHA-256 integrity in
  a structured Tax Proof Pack.
- Three synthetic source documents, golden tests, ten MCP evals and an evidence
  viewer.

It does **not** produce official ITR JSON, submit to the government portal,
handle credentials/OTPs, or certify legal correctness.

## Quick start

Requirements: Node.js 20+ and a current Codex CLI/desktop installation.

```sh
npm install
npm run check
codex plugin marketplace add .
codex plugin add lazytax@personal
```

Start a new Codex task after installation, select GPT-5.6, and ask:

> Use $verify-tax-return with the bundled `build_week_demo` fixtures. Inventory
> the evidence, show every discrepancy, and stop for my confirmation before
> resolving anything.

When asked to resolve the salary conflict, the intended synthetic-demo choice
is ₹18,40,000, representing ₹18,00,000 regular salary plus the separately
reported ₹40,000 bonus. Review the evidence IDs before confirming it.

See [JUDGE_GUIDE.md](JUDGE_GUIDE.md) for the complete judge path and
[DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the <=2:55 submission narrative.

## MCP tools

| Tool | Purpose |
|---|---|
| `lazytax_normalize_fixture_data` | Load/validate the bundled demo or supplied synthetic fixture objects and preserve provenance |
| `lazytax_reconcile_evidence` | Compare source totals, surface conflicts and apply explicit confirmations |
| `lazytax_calculate_compare_regimes` | Deterministically calculate the supported old/new-regime estimates |
| `lazytax_generate_tax_proof_pack` | Generate the structured evidence and calculation artifact |

All four tools are read-only, non-destructive and idempotent. The local stdio
server logs only failures to stderr.

## Development commands

```sh
npm install       # install workspace dependencies
npm run build     # strict TypeScript build: core -> engine -> MCP
npm test          # schema, golden-engine and MCP smoke tests
npm run check     # build + all tests
npm run mcp       # start the stdio server (normally launched by the plugin)
```

To inspect the evidence UI without a web framework, serve the repository root:

```sh
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/viewer/`.

## Codex and GPT-5.6 collaboration

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

Codex decomposed the deadline-critical work into parallel plugin, engine/MCP and
demo/evaluation workstreams; implemented typed contracts and tests; checked the
narrow tax assumptions against official sources; integrated the workstreams;
and ran the build, plugin validation, MCP smoke tests and repository safety
checks. The primary build task's `/feedback` Session ID is supplied separately
in the Devpost form.

### Key human decisions

Sharat Chandra MS chose the Indian tax-reconciliation problem, evidence-first
product thesis, Apps for Your Life track, plugin-first distribution, supported
demo persona and explicit decision to prohibit automated filing. The human also
owns final scope, brand, demo narration and submission claims.

### GPT-5.6's product role

In the demonstrated workflow GPT-5.6 runs inside Codex/ChatGPT and follows the
installed verification skill. It interprets the user's request, inventories
the returned evidence, selects typed MCP tools, explains conflicts and requests
confirmation. It is intentionally prevented from becoming the numeric source
of truth; all displayed calculations come back from the deterministic engine.

## Tax-rule sources and limitations

The narrow engine encodes AY 2026-27 slabs, standard deductions, section 87A
treatment, 4% cess and the supported section 111A/112A rates based on official
Income Tax Department material linked from the engine output. It is not a
complete implementation of Indian tax law. Its guardrails are part of the
product, not a promise of production readiness.

## Repository map

```text
plugins/lazytax/      installable bundle, skill, launcher and MCP config
packages/core/        strict schemas and shared contracts
packages/engine/      deterministic normalization/reconciliation/tax/proof logic
packages/mcp/         modern TypeScript MCP server and four focused tools
fixtures/             three fictional source documents
evals/                stable read-only evaluation questions
viewer/               static evidence/proof viewer
PLAN.md               Build Week scope lock plus archived standalone roadmap
TICKETS.md            BW-P0 execution backlog plus post-hackathon backlog
```

## License

MIT. See [LICENSE](LICENSE).

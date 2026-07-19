# CLAUDE.md — LazyTax

> Read automatically at session start. Operating manual for every agent in this repo.
> Companions: `PLAN.md` (locked scope + architecture), `TICKETS.md` (backlog + acceptance criteria), `.claude/skills/` (domain skills — use them).

## Build Week override (effective 19 Jul 2026)

Until the OpenAI Build Week submission is complete, `PLAN.md` v2 and BW-1…BW-12
in `TICKETS.md` supersede the standalone roadmap and commands below.

- Product: installable `LazyTax for Codex` plugin + local stdio MCP server.
- Runtime reasoning: GPT-5.6 in Codex/ChatGPT; no Claude runtime in the submission.
- Supported inputs: synthetic AY 2026-27 resident-individual demo data only.
- Supported calculation: one employer, interest/dividend, domestic listed-equity
  STCG/LTCG, below surcharge thresholds, with no deductions beyond the standard
  deduction. Anything else must fail closed.
- Never file, submit, request portal credentials/OTP, or claim government validation.
- Package manager/build gate: `npm install && npm run check` at the repo root.
- Plugin gate: run the plugin-creator validator against `plugins/lazytax`.
- Current dependency flow: `core <- engine <- mcp <- plugin`; fixtures/evals/viewer
  are synthetic demonstration and verification assets.
- Every model-visible amount must originate in source evidence or a deterministic
  engine result. The model may explain; it may not calculate.

The material below remains authoritative for the post-hackathon standalone build
only where it does not conflict with this override.

## What this is
LazyTax = chat-first agentic ITR filing for India ("TurboTax that texts back"). Upload Form 16 / AIS / broker P&L → agent reconciles → live dashboard → perfect portal-ready ITR JSON → guided 2-minute official-portal handoff. Deadline-driven: ITR-1/2 live before **Jul 31, 2026**; ITR-3 wave by Aug 31.

## Golden rules for agents
1. **Stay in your package.** You own the package named in your ticket. Edit only it (+ its tests). Consume other packages only via exported public API. No sideways imports.
2. **`packages/core` is law.** `TaxProfile`, tool param schemas, and the `Money` type are frozen contracts. Contract changes require a proposal in `DECISIONS.md` and Fable (PM) sign-off — never silent edits.
3. **The LLM never computes tax.** All tax math lives in `packages/engine` as pure functions on integer paise. Agent tools call the engine; agent text explains its output. If you find yourself asking the model for a number, stop.
4. **Contracts → tests → code.** Zod schema and failing test first; code makes it pass.
5. **Every number is a `Money`** = `{ paise, source, explanation }`. No bare floats for currency anywhere — lint enforces it in `engine` and `itr-json`.
6. **Rules are AY-versioned.** All rates/slabs/dates live in `packages/engine/rules/AY2026_27.ts`. Never hardcode "current year". Consult skill `itr-ay2026-27-rules` before touching tax logic — it lists the trap cases (87A-on-special-rate, grandfathering split date, ₹1.25L combined exemption).
7. **PII discipline.** PAN masked to last-4 in UI and omitted from logs/telemetry. No PII in PostHog, Sentry, committed fixtures, model logs or error payloads. PII columns use application-layer envelope encryption. All model calls go through the approved redaction/egress gateway; direct provider SDK imports outside it fail CI.
8. **Determinism.** Same `TaxProfile` ⇒ identical JSON output, byte-for-byte. Inject dates; seed anything stochastic.
9. **Track everything.** New user-facing surface ⇒ add the `lz_*` events per skill `lazytax-analytics`. A feature without events is not Done.
10. **Prove it.** Run your ticket's verification command and paste output in the PR. "Done" = verification passes + DoD checklist (skill `lazytax-verify`), not "code written".
11. **Security controls are release gates.** Never bypass tenant authz, consent/purpose checks, review hashes, retention/deletion, vendor kill switches or audit events to make a demo work. Use synthetic data until LZ-47 is approved.
12. **One platform, four clients.** Web is the canonical case/review/handoff. MCP, Codex and Claude Code use `packages/platform` scopes and typed contracts; they never access the DB directly, compute tax themselves or expose filing/submission.

## Commands
```bash
pnpm i                       # install (root)
pnpm dev                     # web app + watchers
pnpm -F <pkg> typecheck      # strict TS, no `any`
pnpm -F <pkg> lint
pnpm -F <pkg> test           # vitest; engine ≥95% branch, others ≥80%
pnpm -F engine test:golden   # golden liability table vs ITD calculator values
pnpm -F ingest test:fixtures # parser accuracy vs real-file fixtures (≥98%)
pnpm -F agent eval           # conversation evals (gate ≥90% tool accuracy, 100% guardrails)
pnpm -F itr-json validate    # generated JSON vs ITD schema
pnpm -F web e2e              # Playwright fixture users
pnpm build                   # turbo build all
```
Before any PR: `pnpm typecheck && pnpm lint && pnpm test` green for your package.

## Repo map & dependency rule
`core` (contracts, depends on nothing) ← `engine` · `ingest` · `itr-json` · `filing` · `db` · `config` ← `agent` + `platform` ← `apps/web` + `mcp` ← `plugins/codex` + `plugins/claude-code`. Clients never import DB internals; `agent` uses only public engine/ingest/itr-json APIs.

## Conventions
- TS strict; no `any` (use `unknown` + narrow); explicit return types on public fns.
- Validate all external input (HTTP, model output, file metadata) with Zod at the boundary. Claude structured outputs use `output_config.format` with strict schemas.
- Model calls: `claude-opus-4-8`, adaptive thinking, SDK tool runner, streaming. Frozen system prompt first + `cache_control` breakpoint; volatile context after.
- Errors typed, never swallowed. Structured logs `{ traceId, sessionId, event }`; no `console.log` committed.
- Conventional Commits; branch `lz-<ticket>/<slug>`; small PRs, one ticket each.
- CI gates to merge: typecheck · lint · unit (coverage) · golden/fixture suites for touched packages · `agent eval` on agent changes · build · e2e on web changes.
- `DECISIONS.md` is persistent memory: decisions, gotchas, "what didn't work". Read at session start, append at session end.

## When unsure
Simplest thing that satisfies the contract. If it's not covered here or in PLAN.md, write question + proposed answer in `DECISIONS.md`, flag it in the PR, and proceed — don't block, don't silently diverge.

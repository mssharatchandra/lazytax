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

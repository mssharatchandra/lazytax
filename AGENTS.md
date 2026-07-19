# LazyTax operating contract

> Direction lock: 19 July 2026. This is the canonical product and engineering
> contract for this repository. If an older plan, ticket, prompt or document
> conflicts with this file, follow this file and record the correction in
> `DECISIONS.md`.

## Product we are building

LazyTax is the agentic tax casework layer for Indian CAs, tax professionals and
their clients.

**Positioning:** every practitioner gets an AI junior; every taxpayer gets
CA-style filing support. Existing tax software prepares a return. LazyTax
prepares, proves and coordinates the case.

There is one versioned tax case with two role-aware surfaces:

- **Taxpayer concierge:** secure intake, source collection, missing-income
  discovery, short plain-language questions, progress, review and consent.
- **Practitioner cockpit:** assigned-client queue, materiality-ranked work,
  evidence lineage, AI-junior follow-ups, maker-checker review, overrides and
  filing-system handoff.

Both surfaces use the same evidence ledger, deterministic engine, review hash
and Tax Proof Pack. Never create separate consumer and professional sources of
tax truth.

## Right-to-win thesis

Tax arithmetic is necessary but not sufficient. The costly, failure-prone work
is reconstructing a taxpayer's financial year from fragmented evidence,
discovering omissions, resolving conflicts, communicating with the client and
preserving review proof. Models are useful for orchestration and explanation;
typed deterministic tools must own calculations, state transitions and release
gates. Practitioners retain judgment and accountability.

Do not position LazyTax as an “AI CA,” a CA replacement, a generic chatbot, or a
full ClearTax clone. The practitioner is the trust/distribution wedge and the
taxpayer concierge is the experience layer.

## Product and trust invariants

1. Extract and collect before asking the taxpayer to retype facts.
2. Continue every safe task; an unknown blocks only the result it can change.
3. Ask at most three grouped questions and explain their tax impact.
4. Every material amount must trace to evidence and a versioned rule/calculation
   node. The model never invents or calculates money in prose.
5. Preparers may propose. A distinct reviewer approves or escalates. A stale
   review hash invalidates approval.
6. Submission, payment and e-verification require fresh contextual taxpayer
   approval for the exact reviewed draft.
7. Credentials, OTPs, EVCs, private keys and seed phrases never enter chat,
   prompts, tool inputs, logs or storage.
8. Raw documents remain inside an approved encrypted processing boundary. MCP
   and model surfaces receive minimum necessary structured facts and
   pseudonymous references.
9. MCP/plugin tools are least-privilege and task-specific. Do not expose a
   generic filesystem, shell, database or unrestricted browser capability.
10. Unsupported law is surfaced as a precise review boundary; it does not erase
    supported work or trigger a generic refusal.

## Architecture lock

```text
Taxpayer concierge ─┐
                    ├─> canonical versioned tax case
Practitioner cockpit┘      ├─ encrypted evidence + consent ledger
                           ├─ deterministic rules/reconciliation engine
                           ├─ maker-checker review + audit hashes
                           └─ Tax Proof Pack / ITR / filing-provider adapters

Codex/ChatGPT skill ─┐
Claude Code skill ───┼─> capability-scoped MCP/API ─> same canonical case
Web application ─────┘
```

- Current runtime: npm workspaces, strict TypeScript, Zod, deterministic engine,
  MCP TypeScript SDK, static loopback viewer and self-contained Codex plugin.
- Target hosted plane: TypeScript web/API, Postgres, private object storage,
  tenant authorization, envelope encryption with managed KMS, OAuth/PKCE,
  immutable audit events and provider/ERI adapters.
- The local encrypted vault and supervised official-domain browser rail precede
  real-taxpayer beta. Registered ERI APIs are the production filing path.
- PostHog/Sentry remain absent from private local processing. Hosted analytics
  requires separate opt-in and a typed metadata-only first-party gateway; never
  enable replay, autocapture, prompts, tax content, amounts or identifiers.

## Current verified progress

Verified on 19 July 2026:

- Build Week: 10 of 12 execution tickets complete. Demo recording and final
  submission remain human-owned.
- Installable self-contained Codex/ChatGPT plugin and dual taxpayer/practitioner
  skill.
- Eight read-only MCP tools, including taxpayer filing-session planning and the
  role-aware `lazytax_plan_practitioner_queue`.
- Strict pseudonymous taxpayer/preparer/reviewer case contracts with
  deterministic assignment filtering, priority and next-best action.
- Deterministic supported AY 2026-27 engine, domestic reconciliation and scoped
  US-common-stock preparation.
- Source-linked Tax Proof Pack, synthetic fixtures, taxpayer evidence viewer,
  synthetic practitioner cockpit and evaluator suites.
- Full `npm run check` passes: runtime build; core 2/2; engine 27/27; MCP 3/3;
  viewer 11/11; plugin validation; source and isolated-copy smoke paths.

This is **not production-ready for public real-taxpayer filing**. The current
practitioner viewer is synthetic and the local role gate is demonstrative, not
authentication. There is no durable multi-tenant case store, encrypted document
vault, verified consent transport, CA credential verification, official ITR
JSON breadth, filing provider or ERI production connection.

## Execution order

### Now — release-blocking

1. LZ-70 encrypted local vault and safe real-file intake.
2. LZ-74/LZ-75 shared case persistence and authenticated practitioner cockpit.
3. LZ-77/LZ-80 maker-checker, firm tenancy and staff access controls.
4. LZ-63/LZ-64 official-source rule registry and deterministic hardening.
5. LZ-47–LZ-59 consent, deletion, vendor, model-egress, incident and security
   gates.
6. Connect the practitioner viewer directly to the practitioner-queue MCP
   contract; do not preserve a second demo-only queue schema in production.

### Next

- LZ-65 complete ITR-1/2 evidence-to-rule-to-JSON coverage.
- LZ-71 supervised official-portal concierge using a dedicated allowed profile.
- LZ-76 secure AI-junior document chase and follow-up workflow.
- LZ-78 interoperability with official JSON and existing practitioner tools.
- LZ-73/LZ-81 taxpayer and CA-firm private pilots.

### Later

- LZ-72 registered Type-2 ERI integration and production certification.
- LZ-66 ITR-3/4 breadth after the ITR-1/2 reliability gate.
- Adjacent GST/TDS/corporate products only after separate scope and legal locks.

## Linear synchronization record

- Project: `LazyTax — AI Tax Caseworker for CAs + Taxpayers`
- URL: https://linear.app/curiousstardust/project/lazytax-ai-tax-caseworker-for-cas-taxpayers-8147b5b6095e/overview
- Live scope after this update: 81 issues.
- LZ-60 through LZ-81 were added as CUR-94 through CUR-115.
- LZ-69 / CUR-103 is **Done** because its MVP acceptance tests pass.
- LZ-74 / CUR-108 and LZ-75 / CUR-109 are **In Progress**.
- Broad legacy tickets remain open until their stated acceptance criteria pass;
  partial Build Week work is not enough to mark a production ticket complete.

`TICKETS.md` is the repository mirror. Update it and Linear together whenever
scope, status or acceptance criteria change.

## Definition of done

A ticket is Done only when all of the following are true:

- Its acceptance criteria are implemented, not merely designed or partially
  demonstrated.
- Strict build, targeted tests and the full relevant smoke path pass.
- Money/state outputs are deterministic and source/rule linked.
- Role, tenant, consent, PII-egress and consequential-action boundaries have
  negative tests proportional to risk.
- Public claims match the implemented stage and limitations.
- Documentation, plugin bundle and installed-cache artifact agree.
- The Linear status and this progress ledger are updated with verification
  evidence.

Production filing additionally requires named tax, security and legal approval,
zero open critical/high findings, deletion/restore/incident drills, an active
server-side kill switch and official provider/ERI certification.

## Working rules for agents

- Read this file, `TICKETS.md` and the relevant public contracts before editing.
- Preserve user changes and avoid unrelated rewrites.
- Keep currency deterministic; do not introduce unchecked floating-point money.
- Use strict schemas at every trust boundary and reject raw PII in
  pseudonymous queue/session contracts.
- Prefer additive contract evolution and keep the self-contained plugin bundle
  synchronized through `npm run build:plugin`/`npm run verify:plugin`.
- Add regression tests for every bug, refusal regression, role leak and
  unsupported-tax edge.
- Never weaken a security/review gate to make a demo pass.
- Never claim “unhackable,” “DPDP certified,” “bank-grade,” “fully compliant,”
  “all Indian taxes supported,” or “filed” without the required evidence.

## Verification commands

```sh
npm run check
npm run verify:plugin
npm run install:plugin
```

After reinstalling the local plugin, test it in a new Codex task so the updated
skill and eight-tool MCP contract are loaded.

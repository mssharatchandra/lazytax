# Product: LazyTax

**Last updated:** 2026-07-19
**Method:** codebase scan + user conversation

## Product Identity

- **One-liner:** Individuals ask their existing AI agent to reconcile tax records, calculate a supported Indian income-tax return deterministically, and produce a source-linked proof pack for human review.
- **Category:** consumer fintech / agentic tax verification
- **Product type:** B2C, with a future professional-review channel
- **Collaboration:** single-player with explicit sharing to a tax professional

## Business Model

- **Monetization:** open-source local plugin with a planned paid hosted filing and expert-review offering
- **Pricing tiers:** local verification free; hosted and assisted tiers are planned but not implemented
- **Billing integration:** none detected

## Tech Stack

- **Primary language:** TypeScript
- **Framework:** MCP TypeScript SDK; static HTML/CSS/JavaScript evidence viewer
- **Database:** none in the Build Week plugin; PostgreSQL is planned for the hosted product
- **Background jobs:** none detected
- **HTTP client patterns:** none in the local plugin; the MCP transport is stdio
- **Module organization:** npm workspaces for contracts, deterministic engine, MCP server, plugin bundle, fixtures, tests, and evals

## Value Mapping

### Primary Value Action

**Verified Tax Proof Pack generated** — a supported tax case reaches a user-approved, evidence-linked, deterministic result. If this drops to zero, the product has failed.

### Core Features (directly deliver value)

1. **Evidence normalization** — turns supported records into stable source references.
2. **Source reconciliation** — exposes conflicts and blocks guessing.
3. **Deterministic calculation** — computes supported tax outcomes outside the language model.
4. **Tax Proof Pack** — preserves evidence, decisions, ruleset, limitations, and integrity hash.

### Supporting Features (enable core actions)

1. **Codex/ChatGPT skill** — guides the agent through the safe tool sequence.
2. **MCP server** — exposes typed, inspectable tool contracts.
3. **Evidence viewer** — gives the user a minimal human-review surface.
4. **Golden tests and evals** — prevent regressions and unsupported-case guessing.

## Entity Model

### Users

- **ID format:** optional anonymous installation identifier `ins_*`, created only after analytics opt-in
- **Roles:** taxpayer; reviewer is a future, separately authorized role
- **Multi-account:** no

### Accounts

- No account or organization entity exists in the local plugin.

## Group Hierarchy

No group hierarchy — events are anonymous installation/session level only. A tax
case is deliberately not an analytics group because that would create an
unnecessary link to financial data.

**Default event level:** anonymous installation/session
**Admin actions at:** not applicable

## Current State

- **Existing tracking:** none
- **Documentation:** proposed taxonomy exists in project planning documents
- **Known issues:** the previous proposal included session replay and tax-outcome-derived properties; neither is acceptable on tax workflows

## Integration Targets

| Destination | Purpose | Priority |
|---|---|---|
| PostHog | Opt-in product funnels, reliability, and channel comparison | Primary after privacy/vendor approval |
| Sentry | Redacted operational errors, separate from product analytics | Secondary after privacy/vendor approval |
| First-party audit ledger | Consent, security, and tax-case evidence; never exported as analytics | Required for hosted product |

## Codebase Observations

- **Feature areas inferred:** normalize, reconcile, calculate/compare, proof-pack generation, plugin installation, evidence review
- **Entity model inferred:** stateless synthetic fixture workflow with no accounts, authentication, database, or real taxpayer records


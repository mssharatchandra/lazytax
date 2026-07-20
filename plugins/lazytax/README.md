# LazyTax Codex plugin

LazyTax is a Build Week MVP for secure, CA-style Indian tax preparation. It
packages a proactive filing-companion skill and a local deterministic MCP
server. It consolidates authorized private documents, plans the next best
filing action, and keeps working until only taxpayer decisions or approvals
remain. The current local build guides filing but does not claim an automatic
government submission.

## Current scope

- AY 2026-27 resident salaried individual.
- Delivery-based domestic listed-equity transactions accepted by the deterministic engine.
- Ordinary USD US common-stock investments accepted by the FIFO/FX evidence engine, excluding losses, employee equity, derivatives and corporate actions.
- Two isolated modes: synthetic judge fixtures and explicitly authorized private taxpayer documents.
- Private mode masks identifiers in deterministic outputs, retains no raw document text, and makes no network calls from the LazyTax MCP process.
- Evidence inventory, reconciliation, deterministic regime comparison/calculation, evidence-linked ITR-1/ITR-2 field guidance, and Tax Proof Pack.

The filing guide tells the user which supported return form and portal schedule
to use, the reconciled rupee amount to enter or verify, the source references,
and why the field matters. It preserves review boundaries for transaction-level
broker schedules, residential status, foreign-tax relief, and unsupported law;
it is not official ITR JSON and does not submit a return.

The implementation is demonstration software, not tax or legal advice and not a production filing service.

## Repository integration

The local marketplace entry is in `.agents/plugins/marketplace.json` at the
repository root. The repository build creates a self-contained server bundle
and copies the three synthetic fixtures into the plugin at:

```text
plugins/lazytax/mcp-server/index.mjs
plugins/lazytax/fixtures/
```

That bundle continues to work after Codex copies the plugin into its install
cache. During source development the launcher can also fall back to
`packages/mcp/dist/index.js`; `LAZYTAX_MCP_ENTRY` remains available as an
explicit development override.

## Install for judging

From the repository root:

1. Install dependencies, run the full repository check, and use the safe local installer:

   ```sh
   npm install
   npm run check
   npm run install:plugin
   ```

   The check runs the complete synthetic MCP workflow from an isolated plugin
   copy before installation. The installer registers this repository's
   marketplace only when necessary and refreshes the plugin.

2. Alternatively, register and install manually:

   ```sh
   codex plugin marketplace add .
   codex plugin add lazytax@personal
   ```

3. Start a new Codex task so the skill and MCP tools are loaded.
4. Invoke `$verify-tax-return` with the included synthetic fixtures.

The canonical judge workflow uses only synthetic fixtures. Private mode accepts the exact real taxpayer documents the user asks Codex to review; never provide portal credentials or OTPs. Codex document handling remains governed by the user's Codex data controls.

## Judge smoke test

Ask:

> Use $verify-tax-return to verify the three included synthetic tax documents. Show every mismatch and wait for my confirmation before resolving it.

A passing run must show source locators, preserve conflicting evidence, use deterministic tools for all numeric results, pause at confirmation gates, and produce no filing claim.

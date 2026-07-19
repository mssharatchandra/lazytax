# LazyTax Codex plugin

LazyTax is a Build Week MVP for evidence-first verification of a narrowly supported **synthetic** Indian tax-return scenario. It packages a verification skill and a local MCP server entry point. It never files a return.

## Current scope

- AY 2026-27 resident salaried individual.
- Delivery-based domestic listed-equity transactions accepted by the deterministic engine.
- Synthetic or fully de-identified demonstration documents only.
- Evidence inventory, reconciliation, deterministic regime comparison/calculation, and Tax Proof Pack.

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

Do not use real taxpayer records, credentials, OTPs, or identifying information in this MVP.

## Judge smoke test

Ask:

> Use $verify-tax-return to verify the three included synthetic tax documents. Show every mismatch and wait for my confirmation before resolving it.

A passing run must show source locators, preserve conflicting evidence, use deterministic tools for all numeric results, pause at confirmation gates, and produce no filing claim.

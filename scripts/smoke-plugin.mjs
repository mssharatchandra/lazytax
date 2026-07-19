import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const launcher = resolve(
  process.env.LAZYTAX_PLUGIN_LAUNCHER ?? "plugins/lazytax/scripts/run-mcp.mjs"
);
const pluginRoot = dirname(dirname(launcher));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [launcher],
  cwd: pluginRoot
});
const client = new Client({ name: "lazytax-plugin-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((tool) => tool.name).sort(),
    [
      "lazytax_calculate_compare_regimes",
      "lazytax_generate_tax_proof_pack",
      "lazytax_normalize_fixture_data",
      "lazytax_reconcile_evidence"
    ]
  );
  const normalized = await client.callTool({
    name: "lazytax_normalize_fixture_data",
    arguments: { fixture_set: "build_week_demo", response_format: "json" }
  });
  assert.equal(normalized.isError, undefined);
  assert.equal(
    (normalized.structuredContent?.evidence ?? []).length,
    5
  );
  process.stdout.write(`LazyTax plugin smoke passed: ${pluginRoot}\n`);
} finally {
  await client.close();
}

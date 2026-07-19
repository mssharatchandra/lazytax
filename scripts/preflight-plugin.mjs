import assert from "node:assert/strict";
import { access, lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = resolve(repositoryRoot, "plugins", "lazytax");
const marketplacePath = resolve(repositoryRoot, ".agents", "plugins", "marketplace.json");
const requiredFiles = [
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "README.md",
  "mcp-server/index.mjs",
  "scripts/run-mcp.mjs",
  "skills/verify-tax-return/SKILL.md",
  "skills/verify-tax-return/agents/openai.yaml",
  "skills/verify-tax-return/references/safety-and-scope.md",
  "skills/verify-tax-return/references/tool-contract.md",
  "fixtures/form16.synthetic.json",
  "fixtures/ais.synthetic.json",
  "fixtures/broker-pnl.synthetic.json"
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function assertPortableTree(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const stat = await lstat(path);
    assert.equal(stat.isSymbolicLink(), false, `Plugin must not contain symlink: ${path}`);
    if (stat.isDirectory()) await assertPortableTree(path);
  }
}

for (const relativePath of requiredFiles) {
  await access(resolve(pluginRoot, relativePath));
}
await assertPortableTree(pluginRoot);

const manifest = await readJson(resolve(pluginRoot, ".codex-plugin", "plugin.json"));
assert.equal(manifest.name, "lazytax");
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
assert.equal(manifest.skills, "./skills/");
assert.equal(manifest.mcpServers, "./.mcp.json");
assert.ok(manifest.interface?.defaultPrompt?.length > 0);
assert.ok(
  manifest.interface.defaultPrompt.length <= 3,
  "Plugin starter prompts must fit the three-prompt Codex display limit"
);

const filingSkill = await readFile(
  resolve(pluginRoot, "skills", "verify-tax-return", "SKILL.md"),
  "utf8"
);
assert.match(filingSkill, /Progress before questions/);
assert.match(filingSkill, /lazytax_plan_filing_session/);
assert.match(filingSkill, /Collect before interrogating/);
for (const retiredContract of [
  "Use these headings for every substantive run",
  "Approval required — one explicit decision at a time",
  "State the selected mode and that LazyTax never files automatically"
]) {
  assert.equal(
    filingSkill.includes(retiredContract),
    false,
    `Retired refusal-first behavior returned: ${retiredContract}`
  );
}

const mcpConfig = await readJson(resolve(pluginRoot, ".mcp.json"));
assert.deepEqual(mcpConfig.mcpServers?.lazytax, {
  command: "node",
  args: ["./scripts/run-mcp.mjs"],
  cwd: "."
});

const marketplace = await readJson(marketplacePath);
const marketplaceEntry = marketplace.plugins?.find((entry) => entry.name === "lazytax");
assert.ok(marketplaceEntry, "Marketplace is missing the lazytax entry");
assert.equal(marketplaceEntry.source?.source, "local");
assert.equal(marketplaceEntry.source?.path, "./plugins/lazytax");
assert.equal(marketplaceEntry.policy?.installation, "AVAILABLE");
assert.equal(marketplaceEntry.policy?.authentication, "ON_INSTALL");
assert.equal(
  await realpath(resolve(repositoryRoot, marketplaceEntry.source.path)),
  await realpath(pluginRoot),
  "Marketplace source does not resolve to the plugin"
);

for (const filename of [
  "form16.synthetic.json",
  "ais.synthetic.json",
  "broker-pnl.synthetic.json"
]) {
  const fixture = await readJson(resolve(pluginRoot, "fixtures", filename));
  assert.equal(fixture.synthetic, true, `${filename} must remain explicitly synthetic`);
  assert.equal(fixture.assessment_year, "AY2026-27");
}

const bundle = await lstat(resolve(pluginRoot, "mcp-server", "index.mjs"));
assert.ok(bundle.size > 100_000, "Bundled MCP server is unexpectedly small or missing dependencies");

const pluginText = await Promise.all(
  requiredFiles
    .filter((path) => /\.(?:json|md|mjs|yaml)$/.test(path))
    .map((path) => readFile(resolve(pluginRoot, path), "utf8"))
);
assert.equal(pluginText.some((text) => text.includes("[TODO")), false, "Plugin contains TODO placeholders");

process.stdout.write(
  `LazyTax plugin preflight passed: ${requiredFiles.length} required files, portable bundle, marketplace and synthetic fixtures.\n`
);

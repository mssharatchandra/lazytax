import assert from "node:assert/strict";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const expectedTools = [
  "lazytax_calculate_compare_regimes",
  "lazytax_generate_tax_proof_pack",
  "lazytax_normalize_fixture_data",
  "lazytax_normalize_private_tax_facts",
  "lazytax_reconcile_evidence"
];

const supportedProfile = {
  assessment_year: "2026-27",
  residency: "resident",
  entity_type: "individual",
  age: 31,
  has_business_or_professional_income: false,
  has_foreign_income_or_assets: false,
  has_house_property_income: false,
  has_crypto_or_other_special_rate_income: false,
  claims_deductions_beyond_standard_deduction: false
};

async function callStructured(client, name, arguments_) {
  const result = await client.callTool({
    name,
    arguments: { ...arguments_, response_format: "json" }
  });
  assert.notEqual(result.isError, true, `${name} returned an MCP error`);
  assert.ok(result.structuredContent, `${name} omitted structuredContent`);
  return result.structuredContent;
}

async function runHappyPath(pluginRoot, label) {
  const launcher = resolve(pluginRoot, "scripts", "run-mcp.mjs");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [launcher],
    cwd: pluginRoot
  });
  const client = new Client({ name: `lazytax-${label}-smoke`, version: "0.1.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name).sort(),
      expectedTools
    );

    const privateDataset = await callStructured(client, "lazytax_normalize_private_tax_facts", {
      local_private_processing_consent: true,
      documents: [
        {
          data_mode: "local_private",
          id: "test-form16-ABCDE1234F",
          kind: "form16",
          display_name: "Test Form 16 for Private Person",
          synthetic: false,
          tax_year: "FY2025-26",
          assessment_year: "AY2026-27",
          taxpayer_ref: "ABCDE1234F",
          currency: "INR",
          entries: [
            { id: "salary", label: "Salary", category: "salary", amount_inr: 2_487_983, locator: "page 3" },
            { id: "tds", label: "Employer TDS", category: "employer_tds", amount_inr: 316_051, locator: "page 1" }
          ]
        },
        {
          data_mode: "local_private",
          id: "test-report-private@example.com",
          kind: "broker_report",
          display_name: "Test private consolidated report",
          synthetic: false,
          tax_year: "FY2025-26",
          assessment_year: "AY2026-27",
          taxpayer_ref: "ABCDE1234F",
          currency: "INR",
          entries: [
            { id: "dividend", label: "Domestic dividend", category: "dividend", amount_inr: 720, locator: "Dividend total" },
            { id: "foreign-dividend", label: "Foreign dividend", category: "foreign_dividend", amount_inr: 378, locator: "FSI total" },
            { id: "stcg", label: "Domestic STCG", category: "listed_equity_stcg", amount_inr: 7_798, locator: "STCG total" },
            { id: "ltcg", label: "Domestic LTCG", category: "listed_equity_ltcg", amount_inr: 0, locator: "LTCG total" },
            { id: "foreign-tax", label: "Foreign tax withheld", category: "foreign_tax_withheld", amount_inr: 92, locator: "TR total" }
          ]
        }
      ]
    });
    assert.equal(privateDataset.data_mode, "local_private");
    assert.equal(privateDataset.synthetic, false);
    const serializedPrivateDataset = JSON.stringify(privateDataset);
    for (const privateValue of ["ABCDE1234F", "Private Person", "private@example.com"]) {
      assert.equal(serializedPrivateDataset.includes(privateValue), false);
    }

    const privateReconciliation = await callStructured(client, "lazytax_reconcile_evidence", {
      dataset: privateDataset
    });
    assert.equal(privateReconciliation.ready_for_calculation, true);
    const privateCalculation = await callStructured(client, "lazytax_calculate_compare_regimes", {
      profile: {
        ...supportedProfile,
        age: 24,
        has_foreign_income_or_assets: true,
        has_foreign_capital_gains: false,
        has_other_foreign_income: false,
        has_foreign_assets_beyond_dividend_source: false
      },
      reconciliation: privateReconciliation
    });
    assert.equal(privateCalculation.new_regime.gross_tax_inr, 318_015);
    assert.equal(privateCalculation.new_regime.foreign_tax_credit_inr, 92);
    assert.equal(privateCalculation.new_regime.estimated_balance_payable_inr, 1_870);
    assert.equal(privateCalculation.new_regime.ror_confirmation_required, true);

    const dataset = await callStructured(client, "lazytax_normalize_fixture_data", {
      fixture_set: "build_week_demo"
    });
    assert.equal(dataset.synthetic, true);
    assert.equal(dataset.evidence.length, 5);

    const blocked = await callStructured(client, "lazytax_reconcile_evidence", {
      dataset
    });
    assert.equal(blocked.ready_for_calculation, false);
    assert.deepEqual(blocked.unresolved_categories, ["salary"]);

    const reconciliation = await callStructured(client, "lazytax_reconcile_evidence", {
      dataset,
      confirmed_amounts_inr: { salary: 1_840_000 }
    });
    assert.equal(reconciliation.ready_for_calculation, true);
    assert.deepEqual(reconciliation.unresolved_categories, []);

    const calculation = await callStructured(client, "lazytax_calculate_compare_regimes", {
      profile: supportedProfile,
      reconciliation
    });
    assert.equal(calculation.old_regime.total_tax_inr, 378_612);
    assert.equal(calculation.new_regime.total_tax_inr, 172_328);
    assert.equal(calculation.lower_estimated_regime, "new");
    assert.equal(calculation.estimated_difference_inr, 206_284);

    const proof = await callStructured(client, "lazytax_generate_tax_proof_pack", {
      profile: supportedProfile,
      dataset,
      reconciliation,
      calculation,
      user_confirmed: true
    });
    assert.equal(proof.synthetic, true);
    assert.equal(proof.evidence_index.length, 5);
    assert.deepEqual(proof.unresolved_actions, []);
    assert.match(proof.integrity.canonical_payload_hash, /^[a-f0-9]{64}$/);

    process.stdout.write(
      `LazyTax ${label} plugin smoke passed: 5 tools, masked private settlement, conflict gate, deterministic comparison and proof pack.\n`
    );
  } finally {
    await client.close();
  }
}

const configuredLauncher = process.env.LAZYTAX_PLUGIN_LAUNCHER;
if (configuredLauncher) {
  await runHappyPath(dirname(dirname(resolve(configuredLauncher))), "configured");
} else {
  const sourcePluginRoot = resolve("plugins", "lazytax");
  await runHappyPath(sourcePluginRoot, "source");

  const sandboxRoot = await mkdtemp(join(tmpdir(), "lazytax-plugin-smoke-"));
  const isolatedPluginRoot = join(sandboxRoot, "lazytax");
  try {
    await cp(sourcePluginRoot, isolatedPluginRoot, { recursive: true, errorOnExist: true });
    await runHappyPath(isolatedPluginRoot, "isolated-copy");
  } finally {
    assert.ok(
      sandboxRoot.startsWith(join(tmpdir(), "lazytax-plugin-smoke-")),
      "Refusing to clean an unexpected path"
    );
    await rm(sandboxRoot, { recursive: true, force: true });
  }
}

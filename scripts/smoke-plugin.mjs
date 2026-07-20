import assert from "node:assert/strict";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const expectedTools = [
  "lazytax_calculate_compare_regimes",
  "lazytax_compute_us_stock_investments",
  "lazytax_generate_tax_proof_pack",
  "lazytax_normalize_fixture_data",
  "lazytax_normalize_private_tax_facts",
  "lazytax_plan_filing_session",
  "lazytax_plan_practitioner_queue",
  "lazytax_prepare_filing_guide",
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
    arguments:
      name === "lazytax_compute_us_stock_investments" ||
      name === "lazytax_plan_filing_session" ||
      name === "lazytax_plan_practitioner_queue" ||
      name === "lazytax_prepare_filing_guide"
        ? arguments_
        : { ...arguments_, response_format: "json" }
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

    const filingPlan = await callStructured(client, "lazytax_plan_filing_session", {
      session_ref: "smoke-filing-session",
      assessment_year: "2026-27",
      intent: "file_with_me",
      portal_mode: "disconnected",
      portal_authenticated_by_user: false,
      age_band: "under_60",
      residential_status: "resident_unspecified",
      authorized_evidence: ["form16"],
      present_income_categories: ["salary"],
      evidence_gaps: [],
      documents_extracted: false,
      income_categories_classified: false,
      residual_user_check_completed: false,
      reconciliation_completed: false,
      unresolved_material_conflicts: 0,
      calculation_completed: false,
      return_draft_prepared: false,
      review_confirmed: false,
      submission_confirmed: false,
      submission_completed: false,
      e_verification_completed: false
    });
    assert.equal(filingPlan.next_best_action.action_id, "extract_documents");
    assert.equal(filingPlan.can_agent_continue_without_user, true);

    const practitionerPlan = await callStructured(client, "lazytax_plan_practitioner_queue", {
      practitioner_ref: "actor_1111111111111111",
      acting_roles: ["preparer"],
      cases: [
        {
          case_ref: "case_aaaaaaaaaaaaaaaa",
          assessment_year: "2026-27",
          role_assignments: {
            taxpayer: "actor_2222222222222222",
            preparer: "actor_1111111111111111",
            reviewer: "actor_3333333333333333"
          },
          status: "reconciliation",
          priority: "high",
          evidence_item_count: 8,
          missing_item_count: 0,
          material_conflict_count: 1,
          review_state: "not_started",
          blocker_kind: "none"
        }
      ]
    });
    assert.equal(practitionerPlan.summary.total_assigned_cases, 1);
    assert.equal(practitionerPlan.summary.actionable_now, 1);
    assert.equal(
      practitionerPlan.next_best_action.action.action_id,
      "resolve_material_conflicts"
    );

    const usStockResult = await callStructured(client, "lazytax_compute_us_stock_investments", {
      data_mode: "local_private",
      assessment_year: "2026-27",
      financial_year: "FY2025-26",
      schedule_fa_calendar_year_end: "2025-12-31",
      country_code: "002",
      currency: "USD",
      is_resident_and_ordinarily_resident: true,
      asset_classification: "investment",
      lot_method: "FIFO",
      conversion_policy: "documented_inr_cost_and_rule115_sale",
      trades: [
        {
          trade_id: "smoke-buy",
          ticker: "AAPL",
          trade_date: "2023-01-10",
          side: "buy",
          quantity: 1,
          price_usd: 100,
          fees_usd: 0,
          documented_acquisition_cost_inr: 8_000,
          source_ref: "SRC-SMOKE-BUY"
        },
        {
          trade_id: "smoke-sell",
          ticker: "AAPL",
          trade_date: "2025-04-11",
          side: "sell",
          quantity: 1,
          price_usd: 150,
          fees_usd: 0,
          sbi_tt_buying_rate_inr_per_usd: 85,
          fx_rate_date: "2025-03-31",
          source_ref: "SRC-SMOKE-SELL"
        }
      ],
      equity_disclosures: [
        {
          disclosure_id: "smoke-fa-aapl",
          ticker: "AAPL",
          entity_name: "Apple Inc.",
          acquired_on: "2023-01-10",
          initial_value_inr: 8_000,
          peak_value_inr: 12_750,
          closing_value_inr: 0,
          gross_credits_inr: 0,
          gross_sale_proceeds_inr: 12_750,
          source_ref: "SRC-SMOKE-FA"
        }
      ],
      has_corporate_actions: false,
      has_employee_equity: false,
      has_derivatives: false,
      has_short_sales: false,
      foreign_tax_on_capital_gains_inr: 0
    });
    assert.equal(usStockResult.ready_for_supported_tax_calculation, true);
    assert.equal(usStockResult.schedule_cg.long_term_section_112_gain_inr, 4_750);
    assert.match(usStockResult.matched_lots[0].buy_trade_id, /^trade_[a-f0-9]{16}$/);
    assert.match(usStockResult.matched_lots[0].buy_source_ref, /^src_[a-f0-9]{16}$/);

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

    const filingGuide = await callStructured(client, "lazytax_prepare_filing_guide", {
      profile: supportedProfile,
      reconciliation
    });
    assert.equal(filingGuide.itr_form, "ITR-2");
    assert.equal(
      filingGuide.field_instructions.find(
        (field) => field.instruction_id === "field_cg_domestic_111a_stcg"
      ).amount_inr,
      45_000
    );

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
      `LazyTax ${label} plugin smoke passed: 9 tools, taxpayer and practitioner next actions, evidence-linked ITR guidance, US-stock FIFO/FX bridge, masked private settlement, deterministic comparison and proof pack.\n`
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

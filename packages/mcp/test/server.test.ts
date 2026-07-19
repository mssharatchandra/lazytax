import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLazyTaxServer } from "../src/server.js";

test("server exposes eight focused tools and completes the bundled proof-pack workflow", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLazyTaxServer();
  const client = new Client({ name: "lazytax-test-client", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name).sort(),
      [
        "lazytax_calculate_compare_regimes",
        "lazytax_compute_us_stock_investments",
        "lazytax_generate_tax_proof_pack",
        "lazytax_normalize_fixture_data",
        "lazytax_normalize_private_tax_facts",
        "lazytax_plan_filing_session",
        "lazytax_plan_practitioner_queue",
        "lazytax_reconcile_evidence"
      ]
    );
    for (const tool of listed.tools) {
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
      assert.equal(
        tool.annotations?.idempotentHint,
        tool.name === "lazytax_generate_tax_proof_pack" ? false : true
      );
      assert.ok(tool.outputSchema);
    }

    const filingPlan = await client.callTool({
      name: "lazytax_plan_filing_session",
      arguments: {
        session_ref: "mcp-filing-test",
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
      }
    });
    assert.equal(filingPlan.isError, undefined);
    assert.equal(
      (filingPlan.structuredContent as { next_best_action?: { action_id?: string } })
        .next_best_action?.action_id,
      "extract_documents"
    );

    const practitionerPlan = await client.callTool({
      name: "lazytax_plan_practitioner_queue",
      arguments: {
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
      }
    });
    assert.equal(practitionerPlan.isError, undefined);
    assert.equal(
      (practitionerPlan.structuredContent as { summary?: { actionable_now?: number } }).summary
        ?.actionable_now,
      1
    );
    assert.equal(
      (
        practitionerPlan.structuredContent as {
          next_best_action?: { action?: { action_id?: string } };
        }
      ).next_best_action?.action?.action_id,
      "resolve_material_conflicts"
    );

    const normalized = await client.callTool({
      name: "lazytax_normalize_fixture_data",
      arguments: {
        fixture_set: "build_week_demo",
        response_format: "json"
      }
    });
    assert.equal(normalized.isError, undefined);
    assert.equal((normalized.structuredContent as { synthetic?: boolean } | undefined)?.synthetic, true);
    assert.equal(
      (normalized.structuredContent as { evidence?: unknown[] }).evidence?.length,
      5
    );
    assert.equal(
      (normalized.structuredContent as { warnings?: string[] }).warnings?.length,
      7
    );

    const dataset = normalized.structuredContent as Record<string, unknown>;
    const unresolved = await client.callTool({
      name: "lazytax_reconcile_evidence",
      arguments: { dataset, response_format: "json" }
    });
    assert.equal(unresolved.isError, undefined);
    assert.deepEqual(
      (unresolved.structuredContent as { unresolved_categories?: string[] }).unresolved_categories,
      ["salary"]
    );

    const resolved = await client.callTool({
      name: "lazytax_reconcile_evidence",
      arguments: {
        dataset,
        confirmed_amounts_inr: { salary: 1_840_000 },
        response_format: "json"
      }
    });
    assert.equal(resolved.isError, undefined);
    assert.equal(
      (resolved.structuredContent as { ready_for_calculation?: boolean }).ready_for_calculation,
      true
    );

    const profile = {
      assessment_year: "2026-27",
      residency: "resident",
      entity_type: "individual",
      age: 34,
      has_business_or_professional_income: false,
      has_foreign_income_or_assets: false,
      has_house_property_income: false,
      has_crypto_or_other_special_rate_income: false,
      claims_deductions_beyond_standard_deduction: false
    };
    const calculated = await client.callTool({
      name: "lazytax_calculate_compare_regimes",
      arguments: {
        profile,
        reconciliation: resolved.structuredContent as Record<string, unknown>,
        response_format: "json"
      }
    });
    assert.equal(calculated.isError, undefined);
    assert.equal(
      (calculated.structuredContent as { new_regime?: { total_tax_inr?: number } }).new_regime
        ?.total_tax_inr,
      172_328
    );
    assert.equal(
      (calculated.structuredContent as { old_regime?: { total_tax_inr?: number } }).old_regime
        ?.total_tax_inr,
      378_612
    );
    assert.equal(
      (calculated.structuredContent as { estimated_difference_inr?: number })
        .estimated_difference_inr,
      206_284
    );

    const proof = await client.callTool({
      name: "lazytax_generate_tax_proof_pack",
      arguments: {
        profile,
        dataset,
        reconciliation: resolved.structuredContent as Record<string, unknown>,
        calculation: calculated.structuredContent as Record<string, unknown>,
        user_confirmed: true,
        response_format: "json"
      }
    });
    assert.equal(proof.isError, undefined);
    assert.match(
      (proof.structuredContent as { integrity?: { canonical_payload_hash?: string } }).integrity
        ?.canonical_payload_hash ?? "",
      /^[a-f0-9]{64}$/
    );
    assert.equal(
      (proof.structuredContent as { integrity?: { algorithm?: string } }).integrity?.algorithm,
      "SHA-256"
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("US-stock MCP tool emits bridge entries that flow into private tax calculation", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLazyTaxServer();
  const client = new Client({ name: "lazytax-us-stock-test", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const computed = await client.callTool({
      name: "lazytax_compute_us_stock_investments",
      arguments: {
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
            trade_id: "buy-aapl",
            ticker: "AAPL",
            trade_date: "2023-01-10",
            side: "buy",
            quantity: 1,
            price_usd: 100,
            fees_usd: 0,
            documented_acquisition_cost_inr: 8_000,
            source_ref: "SRC-BUY-AAPL"
          },
          {
            trade_id: "sell-aapl",
            ticker: "AAPL",
            trade_date: "2025-04-11",
            side: "sell",
            quantity: 1,
            price_usd: 150,
            fees_usd: 0,
            sbi_tt_buying_rate_inr_per_usd: 85,
            fx_rate_date: "2025-03-31",
            source_ref: "SRC-SELL-AAPL"
          }
        ],
        equity_disclosures: [
          {
            disclosure_id: "fa-aapl",
            ticker: "AAPL",
            entity_name: "Apple Inc.",
            acquired_on: "2023-01-10",
            initial_value_inr: 8_000,
            peak_value_inr: 12_750,
            closing_value_inr: 0,
            gross_credits_inr: 0,
            gross_sale_proceeds_inr: 12_750,
            source_ref: "SRC-FA-AAPL"
          }
        ],
        has_corporate_actions: false,
        has_employee_equity: false,
        has_derivatives: false,
        has_short_sales: false,
        foreign_tax_on_capital_gains_inr: 0
      }
    });
    assert.equal(computed.isError, undefined);
    const usResult = computed.structuredContent as {
      ready_for_supported_tax_calculation?: boolean;
      tax_bridge_entries?: Array<Record<string, unknown>>;
      schedule_cg?: { long_term_section_112_gain_inr?: number };
    };
    assert.equal(usResult.ready_for_supported_tax_calculation, true);
    assert.equal(usResult.schedule_cg?.long_term_section_112_gain_inr, 4_750);
    assert.equal(usResult.tax_bridge_entries?.length, 1);

    const normalized = await client.callTool({
      name: "lazytax_normalize_private_tax_facts",
      arguments: {
        local_private_processing_consent: true,
        response_format: "json",
        documents: [
          {
            data_mode: "local_private",
            id: "private-us-tax",
            kind: "other",
            display_name: "Private supported US tax facts",
            synthetic: false,
            tax_year: "FY2025-26",
            assessment_year: "AY2026-27",
            taxpayer_ref: "PRIVATE-TEST-REFERENCE",
            currency: "INR",
            entries: [
              { id: "salary", label: "Salary", category: "salary", amount_inr: 1_800_000, locator: "SRC-SALARY" },
              { id: "us-ltcg", label: "US stock LTCG", category: "foreign_stock_ltcg", amount_inr: 4_750, locator: "SRC-US-RESULT" }
            ]
          }
        ]
      }
    });
    assert.equal(normalized.isError, undefined);
    const reconciliation = await client.callTool({
      name: "lazytax_reconcile_evidence",
      arguments: { dataset: normalized.structuredContent, response_format: "json" }
    });
    assert.equal(reconciliation.isError, undefined);
    const calculation = await client.callTool({
      name: "lazytax_calculate_compare_regimes",
      arguments: {
        profile: {
          assessment_year: "2026-27",
          residency: "resident",
          entity_type: "individual",
          age: 24,
          has_business_or_professional_income: false,
          has_foreign_income_or_assets: true,
          is_resident_and_ordinarily_resident: true,
          has_foreign_capital_gains: true,
          has_other_foreign_income: false,
          has_foreign_assets_beyond_dividend_source: true,
          has_unsupported_foreign_assets: false,
          has_house_property_income: false,
          has_crypto_or_other_special_rate_income: false,
          claims_deductions_beyond_standard_deduction: false
        },
        reconciliation: reconciliation.structuredContent,
        response_format: "json"
      }
    });
    assert.equal(calculation.isError, undefined);
    assert.equal(
      (calculation.structuredContent as { new_regime?: { foreign_stock_ltcg_inr?: number } })
        .new_regime?.foreign_stock_ltcg_inr,
      4_750
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("private normalization accepts authorized PII but never returns it", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLazyTaxServer();
  const client = new Client({ name: "lazytax-private-test", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const privateDocument = {
    data_mode: "local_private",
    id: "form16-ABCDE1234F",
    kind: "form16",
    display_name: "Form 16 for Private Person",
    synthetic: false,
    tax_year: "FY2025-26",
    assessment_year: "AY2026-27",
    taxpayer_ref: "ABCDE1234F",
    currency: "INR",
    entries: [
      {
        id: "salary-ABCDE1234F",
        label: "Salary for Private Person",
        category: "salary",
        amount_inr: 2_487_983,
        locator: "PAN ABCDE1234F",
        notes: "private@example.com"
      }
    ]
  };
  try {
    const rejectedByDemoTool = await client.callTool({
      name: "lazytax_normalize_fixture_data",
      arguments: { documents: [privateDocument], response_format: "json" }
    });
    assert.equal(rejectedByDemoTool.isError, true);

    const normalized = await client.callTool({
      name: "lazytax_normalize_private_tax_facts",
      arguments: {
        documents: [privateDocument],
        local_private_processing_consent: true,
        response_format: "json"
      }
    });
    assert.equal(normalized.isError, undefined);
    const output = normalized.structuredContent as {
      data_mode?: string;
      synthetic?: boolean;
      privacy_guarantees?: Record<string, string>;
    };
    assert.equal(output.data_mode, "local_private");
    assert.equal(output.synthetic, false);
    assert.deepEqual(output.privacy_guarantees, {
      processing: "local_only",
      persistence: "none",
      network: "none",
      identifiers: "masked"
    });
    const serialized = JSON.stringify(normalized);
    for (const privateValue of ["ABCDE1234F", "Private Person", "private@example.com"]) {
      assert.equal(serialized.includes(privateValue), false, `Leaked private value: ${privateValue}`);
    }
  } finally {
    await client.close();
    await server.close();
  }
});

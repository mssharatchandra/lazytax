import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLazyTaxServer } from "../src/server.js";

test("server exposes four focused tools and completes the bundled proof-pack workflow", async () => {
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
        "lazytax_generate_tax_proof_pack",
        "lazytax_normalize_fixture_data",
        "lazytax_reconcile_evidence"
      ]
    );
    for (const tool of listed.tools) {
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
      assert.ok(tool.outputSchema);
    }

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

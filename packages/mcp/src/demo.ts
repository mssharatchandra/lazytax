import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  NormalizedDatasetSchema,
  ReconciliationResultSchema,
  RegimeComparisonSchema,
  TaxProofPackSchema,
  TaxpayerProfileSchema,
  type NormalizedDataset,
  type ReconciliationResult,
  type RegimeComparison,
  type TaxProofPack,
  type TaxpayerProfile
} from "@lazytax/core";
import { createLazyTaxServer } from "./server.js";

export const BUILD_WEEK_CONFIRMED_SALARY_INR = 1_840_000 as const;

export const BUILD_WEEK_PROFILE: TaxpayerProfile = TaxpayerProfileSchema.parse({
  assessment_year: "2026-27",
  residency: "resident",
  entity_type: "individual",
  age: 34,
  has_business_or_professional_income: false,
  has_foreign_income_or_assets: false,
  has_house_property_income: false,
  has_crypto_or_other_special_rate_income: false,
  claims_deductions_beyond_standard_deduction: false
});

export interface SyntheticDemoWorkflow {
  readonly synthetic: true;
  readonly generated_via: "mcp";
  readonly tool_calls: readonly [
    "lazytax_normalize_fixture_data",
    "lazytax_reconcile_evidence",
    "lazytax_reconcile_evidence",
    "lazytax_calculate_compare_regimes",
    "lazytax_generate_tax_proof_pack"
  ];
  readonly normalized: NormalizedDataset;
  readonly initial_reconciliation: ReconciliationResult;
  readonly reconciliation: ReconciliationResult;
  readonly calculation: RegimeComparison;
  readonly proof_pack: TaxProofPack;
}

function structuredContent(result: Awaited<ReturnType<Client["callTool"]>>, toolName: string): unknown {
  if (result.isError) {
    throw new Error(`${toolName} returned an MCP tool error.`);
  }
  if (result.structuredContent === undefined) {
    throw new Error(`${toolName} returned no structured content.`);
  }
  return result.structuredContent;
}

/** Runs the canonical synthetic workflow through the same MCP boundary used by Codex. */
export async function runSyntheticDemoWorkflow(args: {
  readonly confirmedSalaryInr: number;
  readonly approveFinalProofPack: true;
}): Promise<SyntheticDemoWorkflow> {
  if (args.confirmedSalaryInr !== BUILD_WEEK_CONFIRMED_SALARY_INR) {
    throw new Error(
      `The locked synthetic demo confirmation must be INR ${BUILD_WEEK_CONFIRMED_SALARY_INR.toLocaleString("en-IN")}.`
    );
  }

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLazyTaxServer();
  const client = new Client({ name: "lazytax-viewer", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const normalizedResult = await client.callTool({
      name: "lazytax_normalize_fixture_data",
      arguments: { fixture_set: "build_week_demo", response_format: "json" }
    });
    const normalized = NormalizedDatasetSchema.parse(
      structuredContent(normalizedResult, "lazytax_normalize_fixture_data")
    );

    const initialResult = await client.callTool({
      name: "lazytax_reconcile_evidence",
      arguments: { dataset: normalized, response_format: "json" }
    });
    const initialReconciliation = ReconciliationResultSchema.parse(
      structuredContent(initialResult, "lazytax_reconcile_evidence")
    );

    const resolvedResult = await client.callTool({
      name: "lazytax_reconcile_evidence",
      arguments: {
        dataset: normalized,
        confirmed_amounts_inr: { salary: args.confirmedSalaryInr },
        response_format: "json"
      }
    });
    const reconciliation = ReconciliationResultSchema.parse(
      structuredContent(resolvedResult, "lazytax_reconcile_evidence")
    );

    const calculationResult = await client.callTool({
      name: "lazytax_calculate_compare_regimes",
      arguments: { profile: BUILD_WEEK_PROFILE, reconciliation, response_format: "json" }
    });
    const calculation = RegimeComparisonSchema.parse(
      structuredContent(calculationResult, "lazytax_calculate_compare_regimes")
    );

    const proofResult = await client.callTool({
      name: "lazytax_generate_tax_proof_pack",
      arguments: {
        profile: BUILD_WEEK_PROFILE,
        dataset: normalized,
        reconciliation,
        calculation,
        user_confirmed: args.approveFinalProofPack,
        response_format: "json"
      }
    });
    const proofPack = TaxProofPackSchema.parse(
      structuredContent(proofResult, "lazytax_generate_tax_proof_pack")
    );

    return {
      synthetic: true,
      generated_via: "mcp",
      tool_calls: [
        "lazytax_normalize_fixture_data",
        "lazytax_reconcile_evidence",
        "lazytax_reconcile_evidence",
        "lazytax_calculate_compare_regimes",
        "lazytax_generate_tax_proof_pack"
      ],
      normalized,
      initial_reconciliation: initialReconciliation,
      reconciliation,
      calculation,
      proof_pack: proofPack
    };
  } finally {
    await client.close();
    await server.close();
  }
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  DISCLAIMER,
  FixtureDocumentInputSchema,
  IncomeCategorySchema,
  NormalizedDatasetSchema,
  ReconciliationResultSchema,
  RegimeComparisonSchema,
  TaxProofPackSchema,
  TaxpayerProfileSchema
} from "@lazytax/core";
import {
  UnsupportedTaxProfileError,
  compareTaxRegimes,
  generateTaxProofPack,
  normalizeFixtureData,
  reconcileEvidence,
  taxInputsFromReconciliation
} from "@lazytax/engine";

const ResponseFormatSchema = z.enum(["summary", "json"]).default("summary");

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const ConfirmationSchema = z
  .object({
    salary: z.number().int().nonnegative().max(50_000_000).optional(),
    interest: z.number().int().nonnegative().max(50_000_000).optional(),
    dividend: z.number().int().nonnegative().max(50_000_000).optional(),
    listed_equity_stcg: z.number().int().nonnegative().max(50_000_000).optional(),
    listed_equity_ltcg: z.number().int().nonnegative().max(50_000_000).optional()
  })
  .strict();

const BUILD_WEEK_FIXTURE_FILES = [
  "form16.synthetic.json",
  "ais.synthetic.json",
  "broker-pnl.synthetic.json"
] as const;

async function loadBuildWeekFixtures(): Promise<z.infer<typeof FixtureDocumentInputSchema>[]> {
  const candidates = [
    resolve(process.cwd(), "fixtures"),
    fileURLToPath(new URL("../../../fixtures/", import.meta.url))
  ].filter((value, index, all) => all.indexOf(value) === index);
  const failures: string[] = [];
  for (const fixturesDirectory of candidates) {
    try {
      return await Promise.all(
        BUILD_WEEK_FIXTURE_FILES.map(async (filename) => {
          const json = await readFile(resolve(fixturesDirectory, filename), "utf8");
          return FixtureDocumentInputSchema.parse(JSON.parse(json) as unknown);
        })
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown fixture-loading error";
      failures.push(`${fixturesDirectory}: ${detail}`);
    }
  }
  throw new Error(
    `Could not load the build_week_demo fixture set. Checked ${failures.join(" | ")}. Run the repository build or pass documents directly.`
  );
}

function textResult<T extends Record<string, unknown>>(
  output: T,
  responseFormat: "summary" | "json",
  summary: string
): { content: [{ type: "text"; text: string }]; structuredContent: T } {
  return {
    content: [
      {
        type: "text",
        text: responseFormat === "json" ? JSON.stringify(output, null, 2) : `${summary}\n\n${DISCLAIMER}`
      }
    ],
    structuredContent: output
  };
}

function actionableError(error: unknown, nextStep: string): {
  isError: true;
  content: [{ type: "text"; text: string }];
} {
  const detail =
    error instanceof UnsupportedTaxProfileError
      ? error.message
      : error instanceof Error
        ? error.message
        : "An unexpected validation error occurred.";
  return {
    isError: true,
    content: [{ type: "text", text: `LazyTax could not complete this step: ${detail} Next step: ${nextStep}` }]
  };
}

export function createLazyTaxServer(): McpServer {
  const server = new McpServer({
    name: "lazytax-mcp-server",
    version: "0.1.0"
  });

  server.registerTool(
    "lazytax_normalize_fixture_data",
    {
      title: "Normalize Synthetic Tax Fixtures",
      description:
        "Validate and normalize supplied synthetic AY 2026-27 Form 16-like, AIS-like, and broker P&L-like JSON into source-linked evidence. This tool accepts synthetic demo data only, ignores derived/non-taxable fixture rows with warnings, performs no OCR, reads only the three bundled demo fixtures when fixture_set is selected, and does not file a return. Use it before reconciliation.",
      inputSchema: z
        .object({
          documents: z
            .array(FixtureDocumentInputSchema)
            .min(1)
            .max(10)
            .optional()
            .describe("One to ten supplied synthetic documents; real taxpayer documents are intentionally rejected."),
          fixture_set: z
            .literal("build_week_demo")
            .optional()
            .describe("Load the three bundled root fixtures/*.synthetic.json files read-only."),
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: NormalizedDatasetSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ documents, fixture_set, response_format }) => {
      try {
        if ((documents === undefined) === (fixture_set === undefined)) {
          throw new Error("Provide exactly one of documents or fixture_set='build_week_demo'.");
        }
        const selectedDocuments = documents ?? (await loadBuildWeekFixtures());
        const output = normalizeFixtureData(selectedDocuments);
        return textResult(
          output,
          response_format,
          `Normalized ${selectedDocuments.length} synthetic document(s) into ${output.evidence.length} source-linked evidence item(s). ${output.warnings.length} record warning(s) require review.`
        );
      } catch (error) {
        return actionableError(
          error,
          "Supply fixtures marked synthetic=true using the lazytax.fixture.v1 schema and AY2026-27/FY2025-26."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_reconcile_evidence",
    {
      title: "Reconcile Source-Linked Tax Evidence",
      description:
        "Aggregate evidence per source and compare salary, interest, dividend, domestic listed-equity STCG, and domestic listed-equity LTCG. Conflicting source totals are left unresolved—never guessed—and require an explicit user-confirmed amount. Returns a calculation readiness flag and evidence IDs for every decision.",
      inputSchema: z
        .object({
          dataset: NormalizedDatasetSchema,
          confirmed_amounts_inr: ConfirmationSchema.default({}).describe(
            "Amounts the user explicitly confirmed after inspecting conflicts. Omit categories that were not explicitly confirmed."
          ),
          tolerance_inr: z.number().int().min(0).max(10_000).default(1),
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: ReconciliationResultSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ dataset, confirmed_amounts_inr, tolerance_inr, response_format }) => {
      try {
        const confirmations: Partial<Record<z.infer<typeof IncomeCategorySchema>, number>> = {};
        for (const category of IncomeCategorySchema.options) {
          const value = confirmed_amounts_inr[category];
          if (value !== undefined) confirmations[category] = value;
        }
        const output = reconcileEvidence(dataset, confirmations, tolerance_inr);
        const conflictText = output.ready_for_calculation
          ? "Evidence is ready for the supported calculation."
          : `Calculation is blocked by: ${output.unresolved_categories.join(", ")}.`;
        return textResult(output, response_format, `Reconciled ${output.items.length} income categories. ${conflictText}`);
      } catch (error) {
        return actionableError(
          error,
          "Run lazytax_normalize_fixture_data first, then confirm only values you verified against the returned evidence IDs."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_calculate_compare_regimes",
    {
      title: "Calculate and Compare Supported Tax Regimes",
      description:
        "Deterministically estimate old- and new-regime tax for the narrow AY 2026-27 demo profile: resident individual under 60 with salary, interest, dividends, and domestic STT-paid listed-equity gains only. It uses standard deductions, verified slabs, section 111A/112A rates, section 87A rules, and 4% cess. It rejects unresolved evidence, surcharge cases above ₹50 lakh, the unsupported marginal-relief band, and every unsupported profile. It does not account for tax credits or file a return.",
      inputSchema: z
        .object({
          profile: TaxpayerProfileSchema,
          reconciliation: ReconciliationResultSchema,
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: RegimeComparisonSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ profile, reconciliation, response_format }) => {
      try {
        const inputs = taxInputsFromReconciliation(reconciliation);
        const output = compareTaxRegimes(profile, inputs);
        return textResult(
          output,
          response_format,
          `Estimated ${output.lower_estimated_regime}-regime tax is lower by ₹${output.estimated_difference_inr.toLocaleString("en-IN")} for this supported synthetic scenario. This is a mechanical comparison, not a filing recommendation.`
        );
      } catch (error) {
        return actionableError(
          error,
          "Resolve every evidence conflict, or use the documented supported profile without surcharge, marginal-relief, loss, or non-standard-deduction cases."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_generate_tax_proof_pack",
    {
      title: "Generate Structured Tax Proof Pack",
      description:
        "Generate an evidence-indexed, SHA-256-integrity-stamped JSON proof artifact from an already normalized, reconciled, and calculated synthetic case. The artifact records sources, decisions, assumptions, official-rule URLs, and limitations. It is not an ITR JSON, is not valid for filing, and is blocked while conflicts remain unresolved.",
      inputSchema: z
        .object({
          profile: TaxpayerProfileSchema,
          dataset: NormalizedDatasetSchema,
          reconciliation: ReconciliationResultSchema,
          calculation: RegimeComparisonSchema,
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: TaxProofPackSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ profile, dataset, reconciliation, calculation, response_format }) => {
      try {
        const output = generateTaxProofPack({ profile, dataset, reconciliation, calculation });
        return textResult(
          output,
          response_format,
          `Generated synthetic Tax Proof Pack ${output.integrity.canonical_payload_hash.slice(0, 12)}… with ${output.evidence_index.length} indexed evidence item(s). It is not a filing artifact.`
        );
      } catch (error) {
        return actionableError(
          error,
          "Pass outputs from the normalize, reconcile, and calculate tools without modification, and resolve all conflicts first."
        );
      }
    }
  );

  return server;
}

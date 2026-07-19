import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  DISCLAIMER,
  FixtureDocumentSchema,
  IncomeCategorySchema,
  LocalPrivateFixtureDocumentSchema,
  NormalizedDatasetSchema,
  ReconciliationResultSchema,
  RegimeComparisonSchema,
  SyntheticFixtureDocumentSchema,
  TaxProofPackSchema,
  TaxpayerProfileSchema,
  UsStockComputationInputSchema,
  UsStockComputationResultSchema
} from "@lazytax/core";
import {
  UnsupportedTaxProfileError,
  compareTaxRegimes,
  computeUsStockInvestments,
  generateTaxProofPack,
  normalizeFixtureData,
  reconcileEvidence,
  taxInputsFromReconciliation
} from "@lazytax/engine";

const SyntheticDocumentInputSchema = z.union([
  FixtureDocumentSchema,
  SyntheticFixtureDocumentSchema
]);

const ResponseFormatSchema = z.enum(["summary", "json"]).default("summary");

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const READ_ONLY_TIMESTAMPED_ANNOTATIONS = {
  ...READ_ONLY_ANNOTATIONS,
  idempotentHint: false
} as const;

const ConfirmationSchema = z
  .object({
    salary: z.number().int().nonnegative().max(50_000_000).optional(),
    interest: z.number().int().nonnegative().max(50_000_000).optional(),
    dividend: z.number().int().nonnegative().max(50_000_000).optional(),
    foreign_dividend: z.number().int().nonnegative().max(50_000_000).optional(),
    listed_equity_stcg: z.number().int().nonnegative().max(50_000_000).optional(),
    listed_equity_ltcg: z.number().int().nonnegative().max(50_000_000).optional(),
    employer_tds: z.number().int().nonnegative().max(50_000_000).optional(),
    foreign_tax_withheld: z.number().int().nonnegative().max(50_000_000).optional(),
    foreign_capital_gains: z.number().int().nonnegative().max(50_000_000).optional(),
    other_foreign_income: z.number().int().nonnegative().max(50_000_000).optional(),
    foreign_stock_stcg: z.number().int().nonnegative().max(50_000_000).optional(),
    foreign_stock_ltcg: z.number().int().nonnegative().max(50_000_000).optional()
  })
  .strict();

const BUILD_WEEK_FIXTURE_FILES = [
  "form16.synthetic.json",
  "ais.synthetic.json",
  "broker-pnl.synthetic.json"
] as const;

async function loadBuildWeekFixtures(): Promise<z.infer<typeof SyntheticDocumentInputSchema>[]> {
  const candidates = [
    resolve(process.cwd(), "fixtures"),
    fileURLToPath(new URL("../fixtures/", import.meta.url)),
    fileURLToPath(new URL("../../../fixtures/", import.meta.url))
  ].filter((value, index, all) => all.indexOf(value) === index);
  const failures: string[] = [];
  for (const fixturesDirectory of candidates) {
    try {
      return await Promise.all(
        BUILD_WEEK_FIXTURE_FILES.map(async (filename) => {
          const json = await readFile(resolve(fixturesDirectory, filename), "utf8");
          return SyntheticDocumentInputSchema.parse(JSON.parse(json) as unknown);
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
  const boundary = typeof output.disclaimer === "string" ? output.disclaimer : DISCLAIMER;
  return {
    content: [
      {
        type: "text",
        text: responseFormat === "json" ? JSON.stringify(output, null, 2) : `${summary}\n\n${boundary}`
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
            .array(SyntheticDocumentInputSchema)
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
    "lazytax_normalize_private_tax_facts",
    {
      title: "Normalize Private Local Tax Facts",
      description:
        "Normalize structured tax facts extracted read-only from only the private documents the user explicitly authorized. This local, in-process tool accepts real identifiers solely to bind one taxpayer and deduplicate sources, then HMAC-pseudonymizes every taxpayer, document, evidence, and line identifier before returning data. It does not open files, persist inputs, use the network, log PII, calculate tax, or file a return. Pass only tax-relevant facts and never pass passwords, OTPs, portal credentials, Aadhaar, signatures, addresses, or contact details.",
      inputSchema: z
        .object({
          documents: z
            .array(LocalPrivateFixtureDocumentSchema)
            .min(1)
            .max(10)
            .describe("One to ten explicitly authorized FY2025-26 private documents represented as structured tax facts."),
          local_private_processing_consent: z
            .literal(true)
            .describe("True only when the user explicitly asked LazyTax to process these named documents for this tax task."),
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: NormalizedDatasetSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ documents, local_private_processing_consent, response_format }) => {
      try {
        if (local_private_processing_consent !== true) {
          throw new Error("Explicit authorization for the named private documents is required.");
        }
        const output = normalizeFixtureData(documents);
        return textResult(
          output,
          response_format,
          `Normalized ${documents.length} private document(s) into ${output.evidence.length} masked, source-bound tax evidence item(s). Raw identifiers were not returned.`
        );
      } catch (error) {
        return actionableError(
          error,
          "Use only the exact documents the user authorized, keep one FY2025-26 taxpayer per request, and exclude secrets or non-tax personal fields."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_compute_us_stock_investments",
    {
      title: "Compute US Stock Investment Tax Facts",
      description:
        "Deterministically match ordinary US common-stock investment trades using FIFO, use documented INR acquisition costs, validate prior-month-end SBI TT buying-rate dates for sales, classify gains as short-term normal-rate or long-term section 112, prepare masked Schedule CG/FSI/FA facts, and emit source-bound bridge entries for the private tax workflow. Supports USD investment trades for an Indian ROR individual in FY2025-26 only. It rejects missing lots or cost/rate evidence, incorrect FX dates, RSUs/ESPPs/options, shorts, derivatives, corporate actions, foreign capital-gains tax, and loss cases requiring cross-asset set-off. It never files a return or fetches exchange rates.",
      inputSchema: UsStockComputationInputSchema,
      outputSchema: UsStockComputationResultSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      try {
        const output = computeUsStockInvestments(input);
        return textResult(
          output,
          "summary",
          `Matched ${output.matched_lots.length} US-stock lot(s), retained ${output.open_lots.length} open lot(s), and produced ${output.tax_bridge_entries.length} tax bridge entr${output.tax_bridge_entries.length === 1 ? "y" : "ies"}. ${output.ready_for_supported_tax_calculation ? "The supported gain result is ready for private tax reconciliation." : "Loss/set-off review is required before tax calculation."}`
        );
      } catch (error) {
        return actionableError(
          error,
          "Provide complete FIFO acquisition history with documented INR costs, exact broker source references, verified prior-month-end SBI TT buying rates for FY2025-26 sales, and calendar-2025 Schedule FA rows for ordinary USD common-stock investments."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_reconcile_evidence",
    {
      title: "Reconcile Source-Linked Tax Evidence",
      description:
        "Aggregate evidence per source and compare supported income and credit categories, including salary, domestic/foreign dividends, domestic listed-equity gains, employer TDS, and foreign tax withheld. Conflicting source totals are left unresolved—never guessed—and require an explicit user-confirmed amount. Returns a calculation readiness flag and evidence IDs for every decision.",
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
          "Run the synthetic or private normalization tool first, then confirm only values you verified against the returned evidence IDs."
        );
      }
    }
  );

  server.registerTool(
    "lazytax_calculate_compare_regimes",
    {
      title: "Calculate and Compare Supported Tax Regimes",
      description:
        "Deterministically estimate old- and new-regime tax and, in private mode, supported TDS/FTC settlement for the narrow AY 2026-27 profile: resident individual under 60 with salary, interest, domestic/foreign dividends, and domestic STT-paid listed-equity gains. It uses standard deductions, verified slabs, section 111A/112A rates, section 87A rules, 4% cess, and a conservative foreign-tax-credit cap. It rejects unresolved evidence, unsupported foreign gains/income, surcharge cases above ₹50 lakh, the unsupported marginal-relief band, and every unsupported profile. It never files a return.",
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
        const output = compareTaxRegimes(profile, inputs, reconciliation.data_mode);
        return textResult(
          output,
          response_format,
          `Estimated ${output.lower_estimated_regime}-regime tax is lower by ₹${output.estimated_difference_inr.toLocaleString("en-IN")} for this supported ${reconciliation.data_mode === "local_private" ? "private" : "synthetic"} scenario. This is a mechanical comparison, not a filing recommendation.`
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
        "Generate an evidence-indexed, SHA-256-integrity-stamped JSON proof artifact from an already normalized, reconciled, and calculated synthetic or private case. The artifact records masked sources, decisions, assumptions, official-rule URLs, and limitations. It is not an ITR JSON, is not valid for filing, and is blocked while conflicts remain unresolved.",
      inputSchema: z
        .object({
          profile: TaxpayerProfileSchema,
          dataset: NormalizedDatasetSchema,
          reconciliation: ReconciliationResultSchema,
          calculation: RegimeComparisonSchema,
          user_confirmed: z
            .literal(true)
            .describe("Set true only after the user explicitly approved the final evidence and calculation summary."),
          response_format: ResponseFormatSchema
        })
        .strict(),
      outputSchema: TaxProofPackSchema,
      annotations: READ_ONLY_TIMESTAMPED_ANNOTATIONS
    },
    async ({ profile, dataset, reconciliation, calculation, user_confirmed, response_format }) => {
      try {
        if (user_confirmed !== true) {
          throw new Error("Explicit final user confirmation is required before proof-pack generation.");
        }
        const output = generateTaxProofPack({ profile, dataset, reconciliation, calculation });
        return textResult(
          output,
          response_format,
          `Generated ${output.data_mode === "local_private" ? "private" : "synthetic"} Tax Proof Pack ${output.integrity.canonical_payload_hash.slice(0, 12)}… with ${output.evidence_index.length} indexed evidence item(s). It is not a filing artifact.`
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

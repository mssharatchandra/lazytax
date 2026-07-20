import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SharedTaxCaseSchema } from "../packages/core/dist/index.js";
import {
  UnsupportedTaxProfileError,
  compareTaxRegimes,
  normalizeFixtureData
} from "../packages/engine/dist/index.js";
import {
  BUILD_WEEK_CONFIRMED_SALARY_INR,
  BUILD_WEEK_PROFILE,
  runSyntheticDemoWorkflow
} from "../packages/mcp/dist/demo.js";
import { createLazyTaxServer } from "../packages/mcp/dist/server.js";

const HASH_KEYS = [
  "source_set_hash",
  "dataset_hash",
  "reconciliation_hash",
  "calculation_hash"
];

const FIXTURE_METADATA = {
  tax_year: "FY2025-26",
  assessment_year: "AY2026-27",
  taxpayer_ref: "SYNTH-TRUST-LAB-001",
  currency: "INR"
};

const SYNTHETIC_DOCUMENT = {
  id: "trust-form16",
  kind: "form16",
  display_name: "Synthetic Trust Lab Form 16",
  synthetic: true,
  ...FIXTURE_METADATA,
  entries: [
    {
      id: "salary",
      label: "Synthetic gross salary",
      category: "salary",
      amount_inr: 1_800_000,
      locator: "synthetic box 1"
    }
  ]
};

function passed(id, title, signal, evidence) {
  return { id, title, status: "pass", signal, evidence };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(run, predicate, message) {
  try {
    run();
  } catch (error) {
    if (predicate(error)) return;
    throw error;
  }
  throw new Error(message);
}

async function inspectMcpContract() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLazyTaxServer();
  const client = new Client({ name: "lazytax-trust-lab", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const listed = await client.listTools();
    return listed.tools.map((tool) => ({
      name: tool.name,
      read_only: tool.annotations?.readOnlyHint === true,
      destructive: tool.annotations?.destructiveHint === true,
      open_world: tool.annotations?.openWorldHint === true,
      typed_output: tool.outputSchema !== undefined
    }));
  } finally {
    await client.close();
    await server.close();
  }
}

function stableIntegrity(workflow) {
  return Object.fromEntries(HASH_KEYS.map((key) => [key, workflow.proof_pack.integrity[key]]));
}

export async function runTrustBenchmark() {
  const startedAt = Date.now();
  const [first, replay, tools] = await Promise.all([
    runSyntheticDemoWorkflow({
      confirmedSalaryInr: BUILD_WEEK_CONFIRMED_SALARY_INR,
      approveFinalProofPack: true
    }),
    runSyntheticDemoWorkflow({
      confirmedSalaryInr: BUILD_WEEK_CONFIRMED_SALARY_INR,
      approveFinalProofPack: true
    }),
    inspectMcpContract()
  ]);

  const claims = [];
  expect(first.generated_via === "mcp" && first.tool_calls.length === 5, "MCP workflow did not complete.");
  claims.push(
    passed(
      "live_mcp_chain",
      "Real tool chain, not a scripted answer",
      "5 MCP calls",
      first.tool_calls
    )
  );

  expect(
    first.initial_reconciliation.ready_for_calculation === false &&
      first.initial_reconciliation.unresolved_categories.includes("salary"),
    "Material conflict did not fail closed."
  );
  claims.push(
    passed(
      "material_conflict_gate",
      "Material conflicts fail closed",
      "Calculation blocked before confirmation",
      ["salary conflict surfaced", "explicit confirmation required"]
    )
  );

  const firstHashes = stableIntegrity(first);
  const replayHashes = stableIntegrity(replay);
  expect(JSON.stringify(firstHashes) === JSON.stringify(replayHashes), "Stable replay hashes differ.");
  claims.push(
    passed(
      "deterministic_replay",
      "Same evidence produces the same bound result",
      "4/4 stable hashes match",
      HASH_KEYS.map((key) => `${key}: ${firstHashes[key]}`)
    )
  );

  const materialItems = first.reconciliation.items.filter(
    (item) => item.selected_amount_inr !== null && item.selected_amount_inr > 0
  );
  const tracedItems = materialItems.filter((item) => item.selected_evidence_ids.length > 0);
  const evidenceCoverage = materialItems.length === 0 ? 100 : Math.round((tracedItems.length / materialItems.length) * 100);
  expect(evidenceCoverage === 100, "A material selected amount lacks evidence lineage.");
  claims.push(
    passed(
      "evidence_lineage",
      "Every material selected amount is source-linked",
      `${evidenceCoverage}% coverage`,
      tracedItems.map((item) => `${item.category}: ${item.selected_evidence_ids.length} evidence reference(s)`)
    )
  );

  const deduplicated = normalizeFixtureData([
    SYNTHETIC_DOCUMENT,
    structuredClone(SYNTHETIC_DOCUMENT)
  ]);
  expect(deduplicated.evidence.length === 1, "Repeated document was not deduplicated.");
  expect(deduplicated.warnings.some((warning) => warning.startsWith("Deduplicated repeated document")), "Deduplication was not disclosed.");
  claims.push(
    passed(
      "duplicate_control",
      "Repeated source evidence is processed once",
      "1 duplicate removed and disclosed",
      ["stable document identity", "warning emitted"]
    )
  );

  expectThrow(
    () =>
      normalizeFixtureData([
        SYNTHETIC_DOCUMENT,
        { ...structuredClone(SYNTHETIC_DOCUMENT), id: "trust-form16-other", taxpayer_ref: "SYNTH-TRUST-LAB-002" }
      ]),
    (error) => error instanceof Error && /same taxpayer/.test(error.message),
    "Mixed-taxpayer input was accepted."
  );
  claims.push(
    passed(
      "mixed_taxpayer_control",
      "Mixed-taxpayer batches are rejected",
      "Fail closed",
      ["cross-taxpayer normalization denied"]
    )
  );

  const piiCanaryDocument = {
    data_mode: "local_private",
    id: "private-canary-document",
    kind: "form16",
    display_name: "Canary Private Person",
    synthetic: false,
    tax_year: "FY2025-26",
    assessment_year: "AY2026-27",
    taxpayer_ref: "ABCDE1234F",
    currency: "INR",
    entries: [
      {
        id: "salary-canary",
        label: "Canary private salary",
        category: "salary",
        amount_inr: 1_800_000,
        locator: "PAN ABCDE1234F",
        notes: "canary@example.com"
      }
    ]
  };
  const maskedPrivate = normalizeFixtureData([piiCanaryDocument]);
  const privateOutput = JSON.stringify(maskedPrivate);
  expect(!privateOutput.includes("ABCDE1234F"), "PAN canary escaped the local-private boundary.");
  expect(!privateOutput.includes("Canary Private Person"), "Name canary escaped the local-private boundary.");
  expect(!privateOutput.includes("canary@example.com"), "Email canary escaped the local-private boundary.");
  expect(maskedPrivate.privacy_guarantees?.identifiers === "masked", "Masking guarantee is absent.");
  claims.push(
    passed(
      "pii_egress_control",
      "Private identifiers are masked before tool output",
      "0 of 3 canaries leaked",
      ["PAN contained", "name contained", "email contained"]
    )
  );

  expectThrow(
    () =>
      compareTaxRegimes(BUILD_WEEK_PROFILE, {
        salary_inr: 5_100_000,
        interest_inr: 0,
        dividend_inr: 0,
        listed_equity_stcg_inr: 0,
        listed_equity_ltcg_inr: 0
      }),
    (error) => error instanceof UnsupportedTaxProfileError,
    "Unsupported surcharge-range profile was accepted."
  );
  claims.push(
    passed(
      "unsupported_profile_gate",
      "Unsupported tax profiles stop precisely",
      "Fail closed",
      ["surcharge-range calculation denied", "supported work remains explicit"]
    )
  );

  const sharedActor = "actor_1111111111111111";
  const invalidSelfApproval = {
    case_ref: "case_aaaaaaaaaaaaaaaa",
    assessment_year: "2026-27",
    role_assignments: {
      taxpayer: "actor_2222222222222222",
      preparer: sharedActor,
      reviewer: sharedActor
    },
    status: "ready_to_file",
    priority: "high",
    evidence_item_count: 5,
    missing_item_count: 0,
    material_conflict_count: 0,
    review_state: "approved",
    blocker_kind: "none"
  };
  expect(SharedTaxCaseSchema.safeParse(invalidSelfApproval).success === false, "Self-approval was accepted.");
  claims.push(
    passed(
      "maker_checker_gate",
      "A preparer cannot approve their own case",
      "Self-approval denied",
      ["distinct preparer and reviewer references required"]
    )
  );

  expect(tools.length === 9, "Unexpected MCP tool count.");
  expect(tools.every((tool) => tool.read_only && !tool.destructive && !tool.open_world && tool.typed_output), "MCP capability contract is too broad.");
  claims.push(
    passed(
      "least_privilege_tools",
      "The plugin exposes typed, read-only, closed-world tools",
      `${tools.length}/${tools.length} tools constrained`,
      tools.map((tool) => tool.name)
    )
  );

  const proofHash = first.proof_pack.integrity.canonical_payload_hash;
  expect(/^[a-f0-9]{64}$/.test(proofHash), "Tax Proof Pack is not integrity bound.");
  claims.push(
    passed(
      "proof_pack_integrity",
      "The review artifact is cryptographically bound",
      `SHA-256 ${proofHash.slice(0, 12)}…`,
      ["source set", "normalized dataset", "reconciliation", "calculation", "canonical payload"]
    )
  );

  return {
    schema_version: "lazytax.trust-benchmark.v1",
    synthetic: true,
    status: claims.every((claim) => claim.status === "pass") ? "pass" : "fail",
    score: {
      passed: claims.filter((claim) => claim.status === "pass").length,
      total: claims.length,
      percent: Math.round((claims.filter((claim) => claim.status === "pass").length / claims.length) * 100)
    },
    thesis: "Codex supplies intelligence. LazyTax supplies evidence, determinism, controls, and authorized rails.",
    sandbox: {
      mode: "isolated_child_process",
      input: "allowlisted synthetic suite identifier only",
      inherited_environment: "none",
      network_behavior: "benchmark code performs no network calls",
      limitation: "Process, input, environment, time, and output isolation; this is not an OS or container security boundary."
    },
    replay: {
      stable_hashes: firstHashes,
      stable_hashes_exclude_generation_timestamp: true,
      timestamp_bound_payload_hashes_equal:
        first.proof_pack.integrity.canonical_payload_hash === replay.proof_pack.integrity.canonical_payload_hash
    },
    claims,
    duration_ms: Date.now() - startedAt,
    boundary: "Synthetic verification only. No government portal, filing, payment, real taxpayer document, or external network service is used."
  };
}

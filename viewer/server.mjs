#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BUILD_WEEK_CONFIRMED_SALARY_INR,
  runSyntheticDemoWorkflow
} from "../packages/mcp/dist/demo.js";

const VIEWER_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/practitioner.html", ["practitioner.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/viewer.js", ["viewer.js", "text/javascript; charset=utf-8"]],
  ["/practitioner.js", ["practitioner.js", "text/javascript; charset=utf-8"]]
]);

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-LazyTax-Data-Boundary": "synthetic-only"
};

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(value)}\n`);
}

function isAllowedBrowserOrigin(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  const host = request.headers.host;
  if (host === undefined || (!host.startsWith("127.0.0.1:") && !host.startsWith("localhost:"))) {
    return false;
  }
  return origin === `http://${host}`;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4_096) throw new Error("Request body exceeds the 4 KB synthetic-demo limit.");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body === "" ? {} : JSON.parse(body);
}

async function serveStatic(response, pathname) {
  const selected = STATIC_FILES.get(pathname);
  if (!selected) return false;
  const [filename, contentType] = selected;
  const absolutePath = resolve(VIEWER_DIRECTORY, filename);
  const file = await stat(absolutePath);
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "Cache-Control": "no-cache",
    "Content-Length": file.size,
    "Content-Type": contentType
  });
  createReadStream(absolutePath).pipe(response);
  return true;
}

export function buildPractitionerQueue(workflow) {
  const proofHash = workflow.proof_pack.integrity.canonical_payload_hash;
  const initialConflictCount = workflow.initial_reconciliation.unresolved_categories.length;
  const warningCount = workflow.normalized.warnings.length;
  const evidenceCount = workflow.normalized.evidence.length;
  const unresolvedProofActions = workflow.proof_pack.unresolved_actions.length;
  const sharedRuntime = {
    algorithm: workflow.proof_pack.integrity.algorithm,
    artifact_hash: proofHash,
    generated_via: workflow.generated_via
  };
  const reviewerControl = (makerRef, checkerRef) => ({
    maker: { actor_ref: makerRef, role: "tax_preparer" },
    checker: { actor_ref: checkerRef, role: "chartered_accountant" },
    self_approval_allowed: false
  });
  const handoff = (state) => ({
    from_role: "taxpayer",
    to_role: "chartered_accountant",
    state,
    shared_artifact_hash: proofHash
  });

  const cases = [
    {
      case_ref: "SYN-CASE-RECON-001",
      case_label: "Synthetic reconciliation review",
      workflow_stage: "blocked_on_taxpayer_confirmation",
      risk: {
        score: Math.min(100, 88 + initialConflictCount * 4),
        level: "high",
        reasons: [
          `${initialConflictCount} material source conflict requires explicit confirmation`,
          `${warningCount} excluded context rows require review before expansion`
        ]
      },
      counts: { evidence: evidenceCount, warnings: warningCount, blocking_items: initialConflictCount },
      review_control: reviewerControl("synthetic-preparer-01", "synthetic-checker-01"),
      handoff: handoff("awaiting_taxpayer_confirmation")
    },
    {
      case_ref: "SYN-CASE-CHECK-002",
      case_label: "Synthetic checker review",
      workflow_stage: "ready_for_checker",
      risk: {
        score: 58,
        level: "medium",
        reasons: [
          "A material conflict was resolved by explicit synthetic confirmation",
          `${warningCount} unsupported or contextual rows remain isolated`
        ]
      },
      counts: { evidence: evidenceCount, warnings: warningCount, blocking_items: unresolvedProofActions },
      review_control: reviewerControl("synthetic-preparer-02", "synthetic-checker-02"),
      handoff: handoff("accepted_for_checker_review")
    },
    {
      case_ref: "SYN-CASE-SHARE-003",
      case_label: "Synthetic taxpayer handback",
      workflow_stage: "ready_for_taxpayer_review",
      risk: {
        score: 18,
        level: "low",
        reasons: [
          "Deterministic calculation completed",
          `${unresolvedProofActions} unresolved proof-pack actions remain`
        ]
      },
      counts: { evidence: evidenceCount, warnings: warningCount, blocking_items: unresolvedProofActions },
      review_control: reviewerControl("synthetic-preparer-03", "synthetic-checker-03"),
      handoff: handoff("returned_to_taxpayer_for_review")
    }
  ];

  cases.sort((left, right) => right.risk.score - left.risk.score);
  return {
    schema_version: "lazytax.practitioner-viewer-projection.v1",
    synthetic: true,
    projection_note:
      "Three synthetic case states projected from one canonical live MCP workflow; they are not independent taxpayer computations.",
    role_context: {
      active_role: "practitioner",
      permissions: ["view_synthetic_case_summary", "request_taxpayer_confirmation", "perform_checker_review"],
      denied: ["view_raw_documents", "approve_own_work", "file_return", "view_other_organization_cases"]
    },
    source_runtime: sharedRuntime,
    cases
  };
}

export function createViewerHttpServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(response, 200, { ok: true, synthetic_only: true, service: "lazytax-evidence-viewer" });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/synthetic-proof-pack") {
        if (!isAllowedBrowserOrigin(request)) {
          sendJson(response, 403, { error: "Cross-origin proof generation is not allowed." });
          return;
        }
        const body = await readJsonBody(request);
        if (
          body === null ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          body.confirmed_salary_inr !== BUILD_WEEK_CONFIRMED_SALARY_INR ||
          body.approve_final_proof_pack !== true
        ) {
          sendJson(response, 400, {
            error:
              "This endpoint accepts only the locked synthetic confirmation: confirmed_salary_inr=1840000 and approve_final_proof_pack=true."
          });
          return;
        }
        const workflow = await runSyntheticDemoWorkflow({
          confirmedSalaryInr: body.confirmed_salary_inr,
          approveFinalProofPack: true
        });
        sendJson(response, 200, workflow);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/practitioner-queue") {
        if (!isAllowedBrowserOrigin(request)) {
          sendJson(response, 403, { error: "Cross-origin practitioner access is not allowed." });
          return;
        }
        const body = await readJsonBody(request);
        if (body?.role !== "practitioner") {
          sendJson(response, 403, { error: "The synthetic practitioner queue requires the practitioner role." });
          return;
        }
        if (body.include_synthetic_cases !== true) {
          sendJson(response, 400, { error: "The local viewer exposes synthetic cases only." });
          return;
        }
        const workflow = await runSyntheticDemoWorkflow({
          confirmedSalaryInr: BUILD_WEEK_CONFIRMED_SALARY_INR,
          approveFinalProofPack: true
        });
        sendJson(response, 200, buildPractitionerQueue(workflow));
        return;
      }

      if (request.method === "GET" && (await serveStatic(response, requestUrl.pathname))) return;
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown viewer error";
      sendJson(response, 500, { error: message });
    }
  });
}

export async function main() {
  const configuredPort = Number.parseInt(process.env.LAZYTAX_VIEWER_PORT ?? "4173", 10);
  if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
    throw new Error("LAZYTAX_VIEWER_PORT must be a whole number from 1 to 65535.");
  }
  const server = createViewerHttpServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(configuredPort, "127.0.0.1", resolveListen);
  });
  process.stdout.write(`LazyTax live evidence viewer: http://127.0.0.1:${configuredPort}\n`);
  process.stdout.write("Synthetic fixtures only. Press Ctrl+C to stop.\n");
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    process.stderr.write(`LazyTax viewer failed to start: ${message}\n`);
    process.exitCode = 1;
  });
}

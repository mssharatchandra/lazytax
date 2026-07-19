import assert from "node:assert/strict";
import test from "node:test";
import { createViewerHttpServer } from "../server.mjs";

async function withServer(run) {
  const server = createViewerHttpServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("viewer health check declares its synthetic-only boundary", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-lazytax-data-boundary"), "synthetic-only");
    assert.deepEqual(await response.json(), {
      ok: true,
      synthetic_only: true,
      service: "lazytax-evidence-viewer"
    });
  });
});

test("viewer page contains no embedded proof result and loads the live API client", async () => {
  await withServer(async (baseUrl) => {
    const [pageResponse, scriptResponse] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/viewer.js`)
    ]);
    const page = await pageResponse.text();
    const script = await scriptResponse.text();
    assert.equal(pageResponse.status, 200);
    assert.equal(scriptResponse.status, 200);
    assert.match(page, /Run synthetic MCP workflow/);
    assert.doesNotMatch(page, /₹1,72,328|LTX-SYN-2026-001/);
    assert.match(script, /fetch\("\/api\/synthetic-proof-pack"/);
    assert.doesNotMatch(script, /expectedProofPack|viewer_projection/);
  });
});

test("viewer rejects any workflow other than the locked synthetic confirmation", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/synthetic-proof-pack`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ confirmed_salary_inr: 1, approve_final_proof_pack: true })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /locked synthetic confirmation/);
  });
});

test("viewer rejects cross-origin proof generation", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/synthetic-proof-pack`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.com" },
      body: JSON.stringify({
        confirmed_salary_inr: 1_840_000,
        approve_final_proof_pack: true
      })
    });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Cross-origin/);
  });
});

test("viewer runs the real MCP workflow and returns the generated proof pack", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/synthetic-proof-pack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed_salary_inr: 1_840_000, approve_final_proof_pack: true })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-lazytax-data-boundary"), "synthetic-only");
    const workflow = await response.json();
    assert.equal(workflow.generated_via, "mcp");
    assert.equal(workflow.normalized.evidence.length, 5);
    assert.equal(workflow.normalized.warnings.length, 7);
    assert.deepEqual(workflow.initial_reconciliation.unresolved_categories, ["salary"]);
    assert.equal(workflow.reconciliation.ready_for_calculation, true);
    assert.equal(workflow.calculation.new_regime.total_tax_inr, 172_328);
    assert.equal(workflow.proof_pack.evidence_index.length, 5);
    assert.match(workflow.proof_pack.integrity.canonical_payload_hash, /^[a-f0-9]{64}$/);
  });
});

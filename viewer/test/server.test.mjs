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

test("practitioner page is a separate live client with no embedded case queue", async () => {
  await withServer(async (baseUrl) => {
    const [pageResponse, scriptResponse] = await Promise.all([
      fetch(`${baseUrl}/practitioner.html`),
      fetch(`${baseUrl}/practitioner.js`)
    ]);
    const page = await pageResponse.text();
    const script = await scriptResponse.text();
    assert.equal(pageResponse.status, 200);
    assert.equal(scriptResponse.status, 200);
    assert.match(page, /Load live practitioner queue/);
    assert.match(script, /fetch\("\/api\/practitioner-queue"/);
    assert.doesNotMatch(page, /SYN-CASE-RECON-001|SYN-CASE-CHECK-002|SYN-CASE-SHARE-003/);
  });
});

test("role isolation rejects taxpayer access to the practitioner queue", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/practitioner-queue`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ role: "taxpayer", include_synthetic_cases: true })
    });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /requires the practitioner role/);
  });
});

async function fetchPractitionerQueue(baseUrl) {
  const response = await fetch(`${baseUrl}/api/practitioner-queue`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ role: "practitioner", include_synthetic_cases: true })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-lazytax-data-boundary"), "synthetic-only");
  return response.json();
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.push(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

test("practitioner queue is synthetic, MCP-linked, and excludes direct PII fields", async () => {
  await withServer(async (baseUrl) => {
    const queue = await fetchPractitionerQueue(baseUrl);
    assert.equal(queue.schema_version, "lazytax.practitioner-viewer-projection.v1");
    assert.equal(queue.synthetic, true);
    assert.equal(queue.source_runtime.generated_via, "mcp");
    assert.match(queue.source_runtime.artifact_hash, /^[a-f0-9]{64}$/);
    assert.equal(queue.cases.length, 3);
    assert.match(queue.projection_note, /not independent taxpayer computations/);

    const serialized = JSON.stringify(queue);
    assert.doesNotMatch(serialized, /[A-Z]{5}[0-9]{4}[A-Z]/);
    assert.doesNotMatch(serialized, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    const forbiddenKeys = collectKeys(queue).filter((key) =>
      /^(pan|email|mobile|phone|password|taxpayer_id|taxpayer_name|raw_documents?)$/i.test(key)
    );
    assert.deepEqual(forbiddenKeys, []);
  });
});

test("maker-checker regression forbids self approval and separates actors", async () => {
  await withServer(async (baseUrl) => {
    const queue = await fetchPractitionerQueue(baseUrl);
    assert.ok(queue.role_context.denied.includes("approve_own_work"));
    for (const item of queue.cases) {
      assert.equal(item.review_control.self_approval_allowed, false);
      assert.notEqual(item.review_control.maker.actor_ref, item.review_control.checker.actor_ref);
      assert.notEqual(item.review_control.maker.role, item.review_control.checker.role);
    }
  });
});

test("risk prioritization keeps the highest-risk blocked case first", async () => {
  await withServer(async (baseUrl) => {
    const queue = await fetchPractitionerQueue(baseUrl);
    const scores = queue.cases.map((item) => item.risk.score);
    assert.deepEqual(scores, [...scores].sort((left, right) => right - left));
    assert.equal(queue.cases[0].case_ref, "SYN-CASE-RECON-001");
    assert.equal(queue.cases[0].risk.level, "high");
    assert.equal(queue.cases[0].workflow_stage, "blocked_on_taxpayer_confirmation");
    assert.ok(queue.cases.every((item) => item.risk.reasons.length > 0));
  });
});

test("taxpayer-to-CA handoff preserves one shared runtime artifact", async () => {
  await withServer(async (baseUrl) => {
    const queue = await fetchPractitionerQueue(baseUrl);
    for (const item of queue.cases) {
      assert.equal(item.handoff.from_role, "taxpayer");
      assert.equal(item.handoff.to_role, "chartered_accountant");
      assert.equal(item.handoff.shared_artifact_hash, queue.source_runtime.artifact_hash);
    }
    assert.ok(queue.cases.some((item) => item.handoff.state === "accepted_for_checker_review"));
    assert.ok(queue.cases.some((item) => item.handoff.state === "returned_to_taxpayer_for_review"));
  });
});

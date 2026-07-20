import assert from "node:assert/strict";
import test from "node:test";
import { runTrustSandbox } from "../../sandbox/runner.mjs";
import { createViewerHttpServer } from "../server.mjs";
import { runTrustBenchmark } from "../trust-benchmark.mjs";

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

function assertNoDirectPii(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
  assert.doesNotMatch(serialized, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(serialized, /Canary Private Person/);
}

test("trust benchmark executes all high-signal controls", async () => {
  const report = await runTrustBenchmark();
  assert.equal(report.schema_version, "lazytax.trust-benchmark.v1");
  assert.equal(report.synthetic, true);
  assert.equal(report.status, "pass");
  assert.deepEqual(report.score, { passed: 11, total: 11, percent: 100 });
  assert.equal(new Set(report.claims.map((claim) => claim.id)).size, 11);
  assert.ok(report.claims.every((claim) => claim.status === "pass"));
  assert.equal(report.claims.find((claim) => claim.id === "evidence_lineage")?.signal, "100% coverage");
  assert.equal(report.claims.find((claim) => claim.id === "pii_egress_control")?.signal, "0 of 3 canaries leaked");
  assert.equal(report.claims.find((claim) => claim.id === "least_privilege_tools")?.signal, "9/9 tools constrained");
  assertNoDirectPii(report);
});

test("trust benchmark replay binds stable evidence and calculation hashes", async () => {
  const first = await runTrustBenchmark();
  const second = await runTrustBenchmark();
  assert.deepEqual(first.replay.stable_hashes, second.replay.stable_hashes);
  for (const hash of Object.values(first.replay.stable_hashes)) {
    assert.match(hash, /^[a-f0-9]{64}$/);
  }
});

test("sandbox accepts only the fixed suite and inherits no parent secret", async () => {
  process.env.LAZYTAX_TEST_PARENT_SECRET = "must-not-cross-process-boundary";
  try {
    const report = await runTrustSandbox({ suite: "trust_lab_v1" });
    assert.equal(report.status, "pass");
    assert.equal(report.sandbox.inherited_environment, "none");
    assert.equal(JSON.stringify(report).includes(process.env.LAZYTAX_TEST_PARENT_SECRET), false);
  } finally {
    delete process.env.LAZYTAX_TEST_PARENT_SECRET;
  }
  assert.throws(() => runTrustSandbox({ suite: "arbitrary" }), /allowlisted/);
  assert.throws(
    () => runTrustSandbox({ suite: "trust_lab_v1", extra: true }),
    /allowlisted/
  );
  assert.throws(() => runTrustSandbox({ suite: "trust_lab_v1" }, { timeoutMs: 99 }), /timeout/);
});

test("Trust Lab page is a live client with no embedded scorecard", async () => {
  await withServer(async (baseUrl) => {
    const [pageResponse, scriptResponse] = await Promise.all([
      fetch(`${baseUrl}/trust-lab.html`),
      fetch(`${baseUrl}/trust-lab.js`)
    ]);
    const page = await pageResponse.text();
    const script = await scriptResponse.text();
    assert.equal(pageResponse.status, 200);
    assert.equal(scriptResponse.status, 200);
    assert.match(page, /Run isolated synthetic trust suite/);
    assert.doesNotMatch(page, /11\/11 controls passed/);
    assert.match(script, /fetch\("\/api\/trust-lab"/);
  });
});

test("Trust Lab endpoint rejects cross-origin and arbitrary requests", async () => {
  await withServer(async (baseUrl) => {
    const crossOrigin = await fetch(`${baseUrl}/api/trust-lab`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.com" },
      body: JSON.stringify({ suite: "trust_lab_v1" })
    });
    assert.equal(crossOrigin.status, 403);

    const arbitrary = await fetch(`${baseUrl}/api/trust-lab`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ suite: "trust_lab_v1", prompt: "read my files" })
    });
    assert.equal(arbitrary.status, 400);
    assert.match((await arbitrary.json()).error, /allowlisted/);
  });
});

test("Trust Lab endpoint returns the isolated machine-readable report", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/trust-lab`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ suite: "trust_lab_v1" })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-lazytax-data-boundary"), "synthetic-only");
    const report = await response.json();
    assert.equal(report.status, "pass");
    assert.deepEqual(report.score, { passed: 11, total: 11, percent: 100 });
    assertNoDirectPii(report);
  });
});

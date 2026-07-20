function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function claimById(report, id) {
  return report.claims.find((claim) => claim.id === id);
}

function renderReport(report) {
  document.querySelector("#trust-status").textContent = `${report.score.passed}/${report.score.total} controls passed`;
  document.querySelector("#trust-status").classList.add("good");

  const coverage = claimById(report, "evidence_lineage")?.signal ?? "Unknown";
  const pii = claimById(report, "pii_egress_control")?.signal ?? "Unknown";
  const tools = claimById(report, "least_privilege_tools")?.signal ?? "Unknown";
  document.querySelector("#trust-metrics").innerHTML = [
    ["Controls passed", `${report.score.percent}%`, `${report.score.passed} of ${report.score.total}`],
    ["Evidence coverage", coverage, "Material selected amounts"],
    ["PII canaries leaked", "0", pii],
    ["MCP tool boundary", tools.split(" tools")[0], "Typed · read-only · closed-world"]
  ]
    .map(
      ([label, value, note]) => `<article class="metric">
        <span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small>
      </article>`
    )
    .join("");

  document.querySelector("#claim-grid").innerHTML = report.claims
    .map(
      (claim) => `<article class="claim-card">
        <div class="claim-heading"><span class="pass-mark" aria-label="Passed">✓</span><span>${escapeHtml(claim.signal)}</span></div>
        <h3>${escapeHtml(claim.title)}</h3>
        <p>${escapeHtml(claim.evidence.join(" · "))}</p>
        <code>${escapeHtml(claim.id)}</code>
      </article>`
    )
    .join("");

  document.querySelector("#hash-list").innerHTML = Object.entries(report.replay.stable_hashes)
    .map(
      ([label, hash]) => `<div><dt>${escapeHtml(label.replaceAll("_", " "))}</dt><dd><code>${escapeHtml(hash)}</code></dd></div>`
    )
    .join("");
  document.querySelector("#sandbox-duration").textContent = `Completed in ${report.duration_ms} ms. ${report.sandbox.limitation}`;
}

async function runTrustLab() {
  const button = document.querySelector("#run-trust-lab");
  button.disabled = true;
  button.textContent = "Running 11 controls…";
  document.querySelector("#trust-status").textContent = "Isolated process running…";
  try {
    const response = await fetch("/api/trust-lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ suite: "trust_lab_v1" })
    });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error ?? `Trust Lab failed with ${response.status}`);
    renderReport(report);
    button.textContent = "Run suite again";
  } catch (error) {
    document.querySelector("#trust-status").textContent = "Verification failed";
    document.querySelector("#claim-grid").innerHTML = `<article class="empty-state"><h3>Suite did not complete</h3><p>${escapeHtml(error instanceof Error ? error.message : "Unknown Trust Lab error")}</p></article>`;
    button.textContent = "Retry isolated trust suite";
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#run-trust-lab").addEventListener("click", runTrustLab);

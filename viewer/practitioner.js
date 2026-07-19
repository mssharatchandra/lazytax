function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function riskLabel(risk) {
  return `${risk.level[0].toUpperCase()}${risk.level.slice(1)} · ${risk.score}`;
}

function renderQueue(queue) {
  const counts = queue.cases.reduce(
    (result, item) => ({ ...result, [item.risk.level]: (result[item.risk.level] ?? 0) + 1 }),
    {}
  );
  document.querySelector("#queue-summary").innerHTML = [
    ["Cases", queue.cases.length],
    ["High risk", counts.high ?? 0],
    ["Ready for checker", queue.cases.filter((item) => item.workflow_stage === "ready_for_checker").length],
    ["Self-approval", "Denied"]
  ]
    .map(([label, value]) => `<article class="queue-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");

  document.querySelector("#case-queue").innerHTML = queue.cases
    .map(
      (item) => `<article class="case-card risk-${escapeHtml(item.risk.level)}">
        <div class="case-heading">
          <div>
            <p class="case-ref">${escapeHtml(item.case_ref)}</p>
            <h3>${escapeHtml(item.case_label)}</h3>
          </div>
          <span class="risk-pill ${escapeHtml(item.risk.level)}">${escapeHtml(riskLabel(item.risk))}</span>
        </div>
        <p class="stage">${escapeHtml(item.workflow_stage.replaceAll("_", " "))}</p>
        <ul class="reason-list">${item.risk.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
        <dl class="case-meta">
          <div><dt>Evidence</dt><dd>${escapeHtml(item.counts.evidence)}</dd></div>
          <div><dt>Blocking</dt><dd>${escapeHtml(item.counts.blocking_items)}</dd></div>
          <div><dt>Maker</dt><dd>${escapeHtml(item.review_control.maker.role)}</dd></div>
          <div><dt>Checker</dt><dd>${escapeHtml(item.review_control.checker.role)}</dd></div>
        </dl>
        <div class="handoff">
          <span>${escapeHtml(item.handoff.from_role)} → ${escapeHtml(item.handoff.to_role)}</span>
          <strong>${escapeHtml(item.handoff.state.replaceAll("_", " "))}</strong>
          <code>${escapeHtml(item.handoff.shared_artifact_hash.slice(0, 12))}…</code>
        </div>
      </article>`
    )
    .join("");

  document.querySelector("#queue-status").textContent = `${queue.cases.length} synthetic cases · MCP-linked`;
  document.querySelector("#queue-status").classList.add("good");
}

async function loadQueue() {
  const button = document.querySelector("#load-queue");
  button.disabled = true;
  document.querySelector("#queue-status").textContent = "Running MCP workflow…";
  try {
    const response = await fetch("/api/practitioner-queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "practitioner", include_synthetic_cases: true })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `Queue request failed with ${response.status}`);
    renderQueue(result);
    button.textContent = "Refresh from MCP";
  } catch (error) {
    document.querySelector("#queue-status").textContent = "Queue unavailable";
    document.querySelector("#case-queue").textContent = error instanceof Error ? error.message : "Unknown viewer error";
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#load-queue").addEventListener("click", loadQueue);

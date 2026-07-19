const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const categoryLabels = {
  salary: "Gross salary",
  interest: "Savings interest",
  dividend: "Dividend income",
  listed_equity_stcg: "Short-term listed-equity gain",
  listed_equity_ltcg: "Long-term listed-equity gain"
};

const documentLabels = {
  form16: ["Form 16-like", "mint"],
  ais: ["AIS-like", "violet"],
  broker_report: ["Broker P&L-like", "amber"],
  other: ["Other", "mint"]
};

let generatedWorkflow = null;

function text(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedAmount(reconciliation, category) {
  return reconciliation.items.find((item) => item.category === category)?.selected_amount_inr ?? 0;
}

function renderMetrics(workflow) {
  const reconciliation = workflow.reconciliation;
  const calculation = workflow.calculation.new_regime;
  const metrics = [
    ["Gross salary", selectedAmount(reconciliation, "salary"), "User-confirmed synthetic resolution"],
    ["Other income", selectedAmount(reconciliation, "interest") + selectedAmount(reconciliation, "dividend"), "Source-linked interest and dividends"],
    ["Short-term gain", selectedAmount(reconciliation, "listed_equity_stcg"), "Section 111A fixture evidence"],
    ["Estimated tax", calculation.total_tax_inr, "New regime · including cess"]
  ];
  document.querySelector("#metric-grid").innerHTML = metrics
    .map(
      ([label, value, note]) => `
        <article class="metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(money.format(value))}</strong>
          <small>${escapeHtml(note)}</small>
        </article>`
    )
    .join("");
}

function renderEvidence(workflow) {
  const evidenceById = new Map(
    workflow.proof_pack.evidence_index.map((item) => [item.evidence_id, item])
  );
  document.querySelector("#evidence-list").innerHTML = workflow.reconciliation.items
    .map((item) => {
      const references = item.selected_evidence_ids.length > 0
        ? item.selected_evidence_ids
        : item.source_totals.flatMap((source) => source.evidence_ids);
      const sourceDescriptions = references
        .map((reference) => evidenceById.get(reference)?.label)
        .filter(Boolean)
        .join(" · ");
      return `
        <article class="evidence-row">
          <div>
            <h3>${escapeHtml(categoryLabels[item.category] ?? item.category)}</h3>
            <p>${escapeHtml(item.explanation)}${sourceDescriptions ? ` ${escapeHtml(sourceDescriptions)}.` : ""}</p>
          </div>
          <div class="sources" aria-label="Source references">
            ${references.map((reference) => `<span class="source-ref">${escapeHtml(reference)}</span>`).join("")}
          </div>
          <div class="evidence-value">${escapeHtml(money.format(item.selected_amount_inr ?? 0))}</div>
        </article>`;
    })
    .join("");
}

function renderCalculation(workflow) {
  const calculation = workflow.calculation.new_regime;
  const rows = [
    ["Normal-rate income after standard deduction", calculation.normal_rate_income_inr],
    ["Section 111A short-term gain", calculation.taxable_stcg_inr],
    ["Section 112A long-term gain", calculation.taxable_ltcg_inr],
    ["Total taxable income", calculation.total_taxable_income_inr],
    ["Ordinary-income slab tax", calculation.slab_tax_inr],
    ["Tax on short-term gain", calculation.stcg_tax_inr],
    ["Tax on long-term gain", calculation.ltcg_tax_inr],
    ["Section 87A rebate", -calculation.rebate_87a_inr],
    ["Health and education cess", calculation.health_education_cess_inr],
    ["Estimated total tax", calculation.total_tax_inr, "total"]
  ];
  document.querySelector("#calculation-table").innerHTML = rows
    .map(
      ([label, value, type]) => `
        <div class="calculation-row ${type ?? ""}">
          <span>${escapeHtml(label)}</span>
          <strong>${value < 0 ? "−" : ""}${escapeHtml(money.format(Math.abs(value)))}</strong>
        </div>`
    )
    .join("");
  text("#ruleset-label", `AY ${workflow.calculation.assessment_year} · deterministic`);
}

function renderSourceCoverage(workflow) {
  const groups = new Map();
  for (const evidence of workflow.normalized.evidence) {
    const existing = groups.get(evidence.document_kind) ?? new Set();
    existing.add(evidence.evidence_id);
    groups.set(evidence.document_kind, existing);
  }
  const documentCount = new Set(workflow.normalized.evidence.map((item) => item.document_id)).size;
  const observedRows = workflow.normalized.evidence.length + workflow.normalized.warnings.length;
  text("#source-coverage", `${documentCount} of 3 documents loaded`);
  text("#source-line-count", `${observedRows} rows inventoried`);
  document.querySelector("#source-list").innerHTML = [...groups.entries()]
    .map(([kind, ids]) => {
      const [label, color] = documentLabels[kind] ?? documentLabels.other;
      return `<li><span class="source-dot ${escapeHtml(color)}"></span><span>${escapeHtml(label)}</span><strong>${ids.size} used</strong></li>`;
    })
    .join("") + `<li><span class="source-dot amber"></span><span>Warnings excluded</span><strong>${workflow.normalized.warnings.length}</strong></li>`;
}

function renderAuditTrail(workflow) {
  const initialConflict = workflow.initial_reconciliation.items.find((item) => item.category === "salary");
  const resolvedSalary = workflow.reconciliation.items.find((item) => item.category === "salary");
  const proof = workflow.proof_pack;
  const events = [
    ["1", "Synthetic fixtures normalized", `${workflow.normalized.evidence.length} supported evidence records retained and ${workflow.normalized.warnings.length} context or unsupported records isolated.`],
    ["2", "Salary conflict surfaced", initialConflict?.explanation ?? "The initial reconciliation blocked calculation."],
    ["3", "Locked demo confirmation applied", resolvedSalary?.explanation ?? "The synthetic salary resolution was confirmed."],
    ["4", "Deterministic comparison completed", `${money.format(workflow.calculation.new_regime.total_tax_inr)} new-regime tax versus ${money.format(workflow.calculation.old_regime.total_tax_inr)} old-regime tax.`],
    ["5", "Tax Proof Pack generated", `${proof.integrity.algorithm} ${proof.integrity.canonical_payload_hash}; generated ${new Date(proof.generated_at).toLocaleString()}.`]
  ];
  document.querySelector("#audit-list").innerHTML = events
    .map(
      ([step, title, detail]) => `
        <li>
          <time>Step ${escapeHtml(step)}</time>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(detail)}</p>
        </li>`
    )
    .join("");
  text("#proof-id", `SHA-256 ${proof.integrity.canonical_payload_hash.slice(0, 12)}…`);
}

function renderWorkflow(workflow) {
  const proof = workflow.proof_pack;
  const newTax = workflow.calculation.new_regime.total_tax_inr;
  const oldTax = workflow.calculation.old_regime.total_tax_inr;
  const maxTax = Math.max(newTax, oldTax, 1);
  const initialConflict = workflow.initial_reconciliation.items.find((item) => item.category === "salary");

  renderMetrics(workflow);
  renderEvidence(workflow);
  renderCalculation(workflow);
  renderSourceCoverage(workflow);
  renderAuditTrail(workflow);

  text("#demo-badge", "Live MCP output · synthetic only · not tax advice");
  text("#status-icon", "✓");
  text("#status-title", "Ready for review");
  text("#status-detail", `${workflow.tool_calls.length} MCP calls completed · ${proof.unresolved_actions.length} blocking mismatches`);
  text("#summary-eyebrow", "Lower mechanical estimate");
  text("#summary-title", `${workflow.calculation.lower_estimated_regime === "new" ? "New" : "Old"} regime · ${money.format(Math.min(newTax, oldTax))} estimated tax`);
  text("#conflict-copy", `${initialConflict?.explanation ?? "A salary conflict was detected"} The locked synthetic amount of ${money.format(selectedAmount(workflow.reconciliation, "salary"))} was then explicitly applied. ${workflow.normalized.warnings.length} context, deduction, derived, or tax-credit rows remain warnings and do not silently enter taxable income.`);
  text("#regime-difference", `${money.format(workflow.calculation.estimated_difference_inr)} lower`);
  text("#lower-regime", `${workflow.calculation.lower_estimated_regime === "new" ? "New" : "Old"} regime`);
  document.querySelector("#lower-regime").classList.add("good");
  text("#new-tax", money.format(newTax));
  text("#old-tax", money.format(oldTax));
  document.querySelector("#new-bar").style.width = `${(newTax / maxTax) * 100}%`;
  document.querySelector("#old-bar").style.width = `${(oldTax / maxTax) * 100}%`;
  text("#evidence-status", "All blocking conflicts resolved");
  document.querySelector("#evidence-status").classList.add("good");
  text("#generate-proof", "Regenerate from MCP");
  document.querySelector("#download-proof").disabled = false;
}

async function generateProof() {
  const button = document.querySelector("#generate-proof");
  button.disabled = true;
  text("#status-icon", "…");
  text("#status-title", "Running local MCP tools");
  text("#status-detail", "Normalizing, reconciling, calculating, and hashing the synthetic proof pack.");
  try {
    const response = await fetch("/api/synthetic-proof-pack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirmed_salary_inr: 1_840_000,
        approve_final_proof_pack: true
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `Viewer request failed with ${response.status}`);
    generatedWorkflow = result;
    renderWorkflow(result);
  } catch (error) {
    text("#status-icon", "!");
    text("#status-title", "Could not generate proof");
    text("#status-detail", error instanceof Error ? error.message : "Unknown viewer error");
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
      item.setAttribute("aria-selected", String(item === tab));
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tab.dataset.panel);
    });
  });
});

document.querySelector("#generate-proof").addEventListener("click", generateProof);

document.querySelector("#download-proof").addEventListener("click", () => {
  if (!generatedWorkflow) return;
  const blob = new Blob([JSON.stringify(generatedWorkflow.proof_pack, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `lazytax-synthetic-tax-proof-pack-${generatedWorkflow.proof_pack.integrity.canonical_payload_hash.slice(0, 12)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

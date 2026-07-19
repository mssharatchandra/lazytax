/*
 * This embedded object is a deterministic viewer projection of the expected MCP
 * result for the three synthetic fixtures. The full generated proof pack also
 * includes generated_at, the complete typed objects, and a dynamic SHA-256 hash.
 * See JUDGE_GUIDE.md for the authoritative input/output contracts.
 */
const expectedProofPack = {
  schema_version: "0.1.0",
  viewer_projection: true,
  proof_pack_id: "LTX-SYN-2026-001",
  synthetic: true,
  taxpayer_ref: "SYNTH-TAXPAYER-001",
  assessment_year: "AY2026-27",
  status: "ready_for_review",
  sources: ["FORM16-SYN-001", "AIS-SYN-001", "BROKER-SYN-001"],
  observed_source_line_count: 12,
  normalized_evidence_count: 5,
  normalization_warning_count: 7,
  reconciled: {
    gross_salary_inr: 1840000,
    taxable_salary_new_regime_inr: 1765000,
    savings_interest_inr: 18500,
    section_111a_stcg_inr: 45000,
    total_income_new_regime_inr: 1828500
  },
  calculation: {
    ruleset: "FY2025-26-demo-v1",
    regime: "new",
    slab_tax_inr: 156700,
    stcg_tax_inr: 9000,
    tax_before_cess_inr: 165700,
    health_education_cess_inr: 6628,
    total_tax_inr: 172328,
    old_regime_total_tax_inr: 378612,
    estimated_saving_inr: 206284
  },
  resolutions: [
    {
      resolution_id: "RES-SALARY-001",
      field: "gross_salary_inr",
      decision: "include_separately_reported_bonus",
      amount_inr: 40000,
      sources: ["FORM16-SYN-001:F16-L05", "AIS-SYN-001:AIS-L06"],
      confirmation: "synthetic_user_confirmed"
    }
  ],
  blocking_mismatch_count: 0
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const metrics = [
  ["Gross salary", expectedProofPack.reconciled.gross_salary_inr, "₹40,000 reconciled"],
  ["Other income", expectedProofPack.reconciled.savings_interest_inr, "Savings interest"],
  ["Short-term gain", expectedProofPack.reconciled.section_111a_stcg_inr, "Section 111A fixture line"],
  ["Estimated tax", expectedProofPack.calculation.total_tax_inr, "New regime · including cess"]
];

const evidence = [
  {
    label: "Gross salary",
    detail: "Regular salary plus the separately reported performance bonus.",
    value: 1840000,
    refs: ["FORM16-SYN-001:F16-L05", "AIS-SYN-001:AIS-L05", "AIS-SYN-001:AIS-L06"]
  },
  {
    label: "Savings interest",
    detail: "Income outside the employer statement, found in the AIS-like fixture.",
    value: 18500,
    refs: ["AIS-SYN-001:AIS-L07"]
  },
  {
    label: "Short-term listed-equity gain",
    detail: "The broker fixture's section 111A gain is retained; proceeds and cost-basis context rows are normalization warnings, not duplicate income.",
    value: 45000,
    refs: ["BROKER-SYN-001:BRK-L07"]
  }
];

const calculationRows = [
  ["Taxable salary after ₹75,000 standard deduction", 1765000],
  ["Savings interest", 18500],
  ["Ordinary income", 1783500],
  ["Section 111A short-term gain", 45000],
  ["Total income", 1828500],
  ["Ordinary-income tax", 156700],
  ["Tax on short-term gain", 9000],
  ["Health and education cess", 6628],
  ["Estimated total tax", 172328, "total"]
];

const auditEvents = [
  ["00:00", "Three synthetic documents normalized", "12 source lines inventoried; 5 supported calculation-evidence records retained with stable identifiers."],
  ["00:01", "Salary coverage gap detected", "A ₹40,000 bonus appears only in AIS-SYN-001:AIS-L06."],
  ["00:02", "Bonus confirmed", "Synthetic user confirmation recorded; gross salary reconciled to ₹18,40,000."],
  ["00:03", "Unsupported calculation rows isolated", "Seven context, deduction and tax-credit records are warnings and do not silently enter taxable income."],
  ["00:04", "Broker gain retained", "The fixture's source-linked section 111A short-term gain is ₹45,000."],
  ["00:05", "Deterministic comparison completed", "The new-regime estimate is mechanically lower for the demo; no recommendation or filing claim is made."]
];

document.querySelector("#metric-grid").innerHTML = metrics.map(([label, value, note]) => `
  <article class="metric">
    <span>${label}</span>
    <strong>${money.format(value)}</strong>
    <small>${note}</small>
  </article>
`).join("");

document.querySelector("#evidence-list").innerHTML = evidence.map(item => `
  <article class="evidence-row">
    <div>
      <h3>${item.label}</h3>
      <p>${item.detail}</p>
    </div>
    <div class="sources" aria-label="Source references">
      ${item.refs.map(ref => `<span class="source-ref">${ref}</span>`).join("")}
    </div>
    <div class="evidence-value">${money.format(item.value)}</div>
  </article>
`).join("");

document.querySelector("#calculation-table").innerHTML = calculationRows.map(([label, value, type]) => `
  <div class="calculation-row ${type || ""}">
    <span>${label}</span>
    <strong>${value < 0 ? "−" : ""}${money.format(Math.abs(value))}</strong>
  </div>
`).join("");

document.querySelector("#audit-list").innerHTML = auditEvents.map(([time, title, detail]) => `
  <li>
    <time>${time}</time>
    <strong>${title}</strong>
    <p>${detail}</p>
  </li>
`).join("");

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => {
      item.classList.toggle("active", item === tab);
      item.setAttribute("aria-selected", String(item === tab));
    });
    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === tab.dataset.panel);
    });
  });
});

document.querySelector("#download-proof").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(expectedProofPack, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lazytax-synthetic-viewer-projection.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

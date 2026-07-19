# LazyTax judge guide

LazyTax is a local-first Codex/ChatGPT plugin that verifies one narrowly supported **synthetic** Indian tax scenario. It reconciles source-linked evidence, refuses to choose conflicting numbers without confirmation, compares regimes with deterministic code, and emits a hashed Tax Proof Pack. It does not file a return.

> Synthetic Build Week demonstration only. Do not provide real taxpayer records, identity numbers, credentials, or OTPs. This software is not tax, legal, or financial advice.

## Fast path (about three minutes)

### Prerequisites

- Node.js 20 or newer
- npm
- A current Codex client with local plugin and MCP support

### Install and verify

From the repository root:

```sh
npm install
npm run check
codex plugin marketplace add .
codex plugin add lazytax@personal
```

Start a new Codex task after installation so the skill and MCP server are loaded. No API key, tax-portal account, network integration, or test login is required for the deterministic demo.

### Canonical judge prompt

```text
Use $verify-tax-return on the bundled build_week_demo fixture set. First normalize and reconcile all three documents without guessing. Show me the salary conflict and its exact source references, then wait for confirmation.
```

When Codex pauses, respond:

```text
For this synthetic demo, confirm salary income at INR 1,840,000. Continue with the supported resident-individual profile, compare both regimes, and generate the Tax Proof Pack. Do not calculate a refund or balance due, and do not file anything.
```

Expected checkpoints:

1. Exactly three explicitly synthetic documents are loaded.
2. Initial reconciliation flags only `salary`, because the Form 16-like source totals INR 1,800,000 and the AIS-like source totals INR 1,840,000.
3. Codex cites `AIS-SYN-001:AIS-L06` as the separate INR 40,000 bonus and does not silently choose a value.
4. After explicit confirmation, deterministic calculation reports:
   - salary: INR 1,840,000;
   - savings interest: INR 18,500;
   - section 111A short-term gain: INR 45,000;
   - new-regime total tax including cess: INR 172,328;
   - old-regime total tax including cess: INR 378,612;
   - estimated difference: INR 206,284, with the new regime lower.
5. The proof pack includes an evidence index, the user-confirmed reconciliation, both calculations, zero unresolved income actions, and a SHA-256 integrity hash.
6. The response repeats the product boundary: no filing, no tax advice, no payable/refund result, and no use of the observed TDS records in calculation.

## Evidence viewer

The viewer is a zero-build, read-only projection of the expected demo result:

```sh
python3 -m http.server 4173 --directory viewer
```

Open `http://localhost:4173`. The page embeds only fictional data and can export its synthetic projection as JSON. It makes no network calls and uses no external fonts, scripts, images, brands, or analytics.

## MCP tool contract

All four tools are local, read-only, non-destructive, side-effect-free, and closed-world. Calculation results are stable for the same inputs; proof-pack `generated_at` and its dependent integrity hash vary by generation. The tools never access government portals or external services.

### `lazytax_normalize_fixture_data`

Purpose: validate synthetic fixtures and retain supported, source-addressable evidence.

Accepted MVP input:

```json
{ "fixture_set": "build_week_demo" }
```

The fixture-set shortcut loads, read-only, the three files in `fixtures/`. The lower-level contract accepts a `documents` array with the same `lazytax.fixture.v1` schema. Supply exactly one of `fixture_set` or `documents`; every document must contain `synthetic: true`. Expected output is a `NormalizedDataset` containing `assessment_year`, `synthetic`, `evidence`, `warnings`, and `disclaimer`.

Each normalized evidence item preserves:

- `evidence_id`: stable `<document_id>:<line_id>` source reference;
- `document_id`, `document_kind`, and `document_name`;
- `entry_id` and human-readable `locator`;
- normalized `category` and non-negative `amount_inr`.

Unsupported or derived lines are warning-only and are never silently added to taxable income.

### `lazytax_reconcile_evidence`

Purpose: compare source totals by normalized income category and block calculation on disagreements.

Conceptual input:

```json
{
  "dataset": { "...": "NormalizedDataset from the previous tool" },
  "confirmed_amounts_inr": { "salary": 1840000 },
  "tolerance_inr": 1
}
```

Omit `confirmed_amounts_inr` on the first pass. A conflicting category returns `selected_amount_inr: null`, no selected evidence, and an explicit `action_required`. Confirmation is a user decision represented as a category-to-INR map; it is not an LLM inference.

### `lazytax_calculate_compare_regimes`

Purpose: derive tax inputs from a calculation-ready reconciliation and compare deterministic old/new-regime estimates.

Conceptual input:

```json
{
  "reconciliation": { "...": "ready ReconciliationResult" },
  "profile": {
    "assessment_year": "2026-27",
    "residency": "resident",
    "entity_type": "individual",
    "age": 31,
    "has_business_or_professional_income": false,
    "has_foreign_income_or_assets": false,
    "has_house_property_income": false,
    "has_crypto_or_other_special_rate_income": false,
    "claims_deductions_beyond_standard_deduction": false
  }
}
```

The tool rejects unresolved evidence and unsupported profiles. Output contains `old_regime`, `new_regime`, `lower_estimated_regime`, `estimated_difference_inr`, assumptions, official-rule source URLs, and the non-advice boundary.

### `lazytax_generate_tax_proof_pack`

Purpose: bundle the exact evidence, confirmed reconciliation, supported profile, and deterministic comparison into one integrity-protected artifact.

Conceptual input:

```json
{
  "dataset": { "...": "NormalizedDataset" },
  "reconciliation": { "...": "ready ReconciliationResult" },
  "profile": { "...": "supported TaxpayerProfile" },
  "calculation": { "...": "RegimeComparison" }
}
```

Output schema version is `0.1.0`. The integrity block uses SHA-256 over a canonicalized payload. `generated_at` and the hash are expected to vary; evaluation questions intentionally avoid comparing either value.

Every tool also accepts optional `response_format: "summary" | "json"`; structured content is returned in either mode and is the value passed to the next tool.

## Fixture assumptions

- One fictional resident individual, age 31, for AY 2026-27 / FY 2025-26.
- No business/professional, foreign, house-property, crypto, or unsupported special-rate income.
- No deduction beyond the regime-specific standard deduction.
- Form 16-like salary is INR 1,800,000.
- AIS-like salary is INR 1,840,000 because of a separately reported INR 40,000 bonus.
- Savings interest is INR 18,500 from one source.
- Broker short-term listed-equity gain is INR 45,000, arithmetically supported by INR 300,000 proceeds less INR 255,000 cost.
- TDS lines are present to demonstrate explicit exclusion: normalization emits source-addressable warnings, while tax credits and payable/refund calculation remain outside the engine scope.
- Source identifiers and line identifiers are stable contracts; file-system line numbers are not.

## Run the stable MCP evaluations

The ten questions in `evals/mcp-evaluation.xml` are independent, read-only, and use only the bundled closed fixture set. They avoid dynamic timestamps and proof hashes.

At minimum, verify the repository test suite before judging:

```sh
npm run check
```

If using an MCP evaluation harness, launch the compiled stdio server with the repository's `npm run mcp` entry point and supply `evals/mcp-evaluation.xml`. Do not run two stdio server processes against one evaluator session.

## Security and privacy boundary

- Synthetic-only schema gate: `synthetic` must be literal `true`.
- Local stdio transport; no listening network port in the default flow.
- No authentication secrets, portal credentials, OTPs, remote uploads, or retained taxpayer data.
- No filing or external write tool exists.
- Structured tool outputs preserve provenance and repeat disclaimers.
- GPT‑5.6 may choose tools and explain results; deterministic code owns all arithmetic.
- Human confirmation is required before any conflicting amount enters calculation.

## Troubleshooting

- **Plugin tools are missing:** confirm `npm run build` succeeds, reinstall the local plugin, and start a new Codex task.
- **MCP process exits:** run `npm run mcp` from the repository root to see the actionable stderr message.
- **Calculation is blocked:** run reconciliation once without confirmations, inspect the salary conflict, then explicitly confirm `salary: 1840000`.
- **Viewer does not load:** serve the `viewer/` directory or open `viewer/index.html` directly. No build step is required.

## What not to test

Do not supply real documents, alter tax-year rules, try to file a return, or extrapolate the result to another taxpayer. Those actions are intentionally outside the Build Week MVP.

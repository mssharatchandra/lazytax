---
name: verify-tax-return
description: Verify and reconcile a synthetic Indian individual income-tax return using source-linked evidence and LazyTax deterministic MCP tools. Use for AY 2026-27 demo workflows involving a resident salaried taxpayer with delivery-based domestic listed-equity transactions; comparing source documents, investigating discrepancies, calculating or comparing regimes, or producing a Tax Proof Pack. Do not use for real taxpayer data, automatic filing, unsupported profiles, or tax/legal advice.
---

# Verify Tax Return

Use the LazyTax MCP server to produce a reproducible, evidence-backed verification. Treat this Build Week MVP as demonstration software, not tax advice or a filing service.

## Non-negotiable boundaries

1. Accept only synthetic or fully de-identified demonstration data. If a user supplies real PAN, Aadhaar, bank, address, contact, or account data, stop and ask them to remove it and use a synthetic copy.
2. Confirm that the case fits the supported profile before extracting or calculating. Read [safety-and-scope.md](references/safety-and-scope.md) for the complete boundary.
3. Never calculate, round, compare regimes, or validate totals in free-form reasoning. Invoke the deterministic LazyTax tools and report their returned rule version.
4. Never infer a missing tax fact. Mark it missing, cite the affected calculation, and ask one targeted question.
5. Never file, submit, log in to a government portal, request credentials or OTPs, sign a return, or claim that filing occurred.
6. Require explicit user confirmation before resolving a material conflict and again before generating the final Tax Proof Pack.
7. Keep all claims traceable to a source locator or a deterministic tool result. Label explanations as explanations, not evidence.
8. Fail closed. If a required LazyTax tool is unavailable, returns an error, or does not support the case, stop the affected workflow and state what remains unverified.

## Verification workflow

### 1. Establish scope and consent

- State: “LazyTax Build Week MVP uses synthetic demo data, supports a narrow AY 2026-27 profile, provides no tax/legal advice, and never files a return.”
- Ask the user to confirm that the documents are synthetic or fully de-identified.
- Establish assessment year, residency, income categories, and transaction types.
- Compare them with [safety-and-scope.md](references/safety-and-scope.md). Refuse unsupported calculations while still offering a clearly labelled evidence inventory when safe.
- List the exact files the user authorized. Do not search unrelated folders.

### 2. Normalize the evidence

- Invoke `lazytax_normalize_fixture_data` once for the explicitly authorized synthetic fixture set.
- Require every normalized fact to retain a stable evidence ID and source locator.
- Preserve contradictory values as separate evidence records. Never silently overwrite one source with another.
- Present the evidence inventory before beginning reconciliation.

### 3. Reconcile sources

- Invoke `lazytax_reconcile_evidence` with normalized evidence, not manually retyped amounts.
- Group results into matched, conflicting, missing, and unsupported.
- For every conflict, show both values and locators, materiality if the tool returns it, and the consequence of leaving it unresolved.
- Ask the user to select or supply a resolution. Do not choose on their behalf.
- Record the resolution, the user's exact confirmation, affected evidence IDs, and any remaining assumption.

### 4. Calculate deterministically

- Invoke `lazytax_calculate_compare_regimes` only after required material conflicts are resolved or explicitly marked unresolved.
- Pass normalized evidence plus explicit resolutions. Do not pass hidden assumptions.
- Report assessment year, rule-set version, input lineage, both supported regime results, warnings, unsupported fields, and status.
- Never reconstruct, adjust, or “sanity-correct” a numeric result in prose. Do not describe the lower result as a recommendation.
- Do not call a return “verified,” “ready,” or “complete” while a blocking issue, unsupported field, or material unresolved discrepancy remains.

### 5. Generate the Tax Proof Pack

- Present the final evidence, reconciliation, and calculation summary, then obtain explicit confirmation.
- Invoke `lazytax_generate_tax_proof_pack` only after that final confirmation.
- Require the pack to contain the scope/disclaimer, document inventory, evidence ledger, mismatch ledger, user decisions, deterministic calculation trace, rule-set version, unsupported cases, unresolved items, and generation timestamp.
- Describe the output as a verification and preparation artifact for review. Do not describe it as proof of filing, a validated government return, or professional certification.

## Response contract

Use these headings for every substantive run:

1. **Scope status** — supported, unsupported, or blocked, with reasons.
2. **Evidence inventory** — authorized synthetic sources and locators.
3. **Reconciliation ledger** — matches, conflicts, missing facts, and resolutions.
4. **Deterministic results** — tool-returned totals, rule version, and lineage.
5. **Unresolved blockers** — never bury warnings.
6. **Approval required** — one explicit decision at a time.
7. **Next safe action** — the smallest non-filing step.

Use “according to the provided synthetic document” for source claims and “the deterministic engine returned” for calculations. Never say “I filed,” “the government accepted,” “this is filing-ready,” or “this is legally correct.”

## Tool contract

Read [tool-contract.md](references/tool-contract.md) before invoking LazyTax tools. Codex hosts may prefix the exact tool names with an MCP namespace. Do not substitute shell arithmetic, spreadsheets, web calculators, or model reasoning for a missing deterministic tool.

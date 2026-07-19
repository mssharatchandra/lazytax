---
name: verify-tax-return
description: Verify and reconcile an Indian individual income-tax return using source-linked evidence and LazyTax deterministic MCP tools. Use for a synthetic Build Week demo or an explicitly authorized private tax-document review; comparing source documents, investigating discrepancies, calculating supported amounts, or producing a Tax Proof Pack. Never file automatically or claim legal correctness.
---

# Verify Tax Return

Use the LazyTax MCP server to produce a reproducible, evidence-backed verification. Treat every result as preparation for taxpayer review, not tax advice or a filing service.

## Choose the data mode

- **Synthetic demo**: use the bundled fictional fixtures. The synthetic schema must reject real identifiers.
- **Private local review**: use only the exact attachments or paths the user explicitly supplied for the requested tax task. Real identifiers may be read when necessary, but must be masked in responses and excluded from deterministic tool inputs unless a field is legally required for the calculation.

An explicit request such as “calculate my tax from these files” authorizes read-only processing of those named files. Do not make the user redact documents or repeat a separate consent phrase. Do not search nearby folders or unrelated files.

## Non-negotiable boundaries

1. Classify the run as synthetic demo or private local review. PII in synthetic mode is an error; PII in private local mode is protected data, not a reason to refuse the task.
2. Confirm that the tax facts fit the deterministic engine before calculating. Read [safety-and-scope.md](references/safety-and-scope.md) for the complete boundary. An unsupported income category blocks only claims of a complete liability; it does not block safe evidence extraction or calculation of clearly separable supported components.
3. Never calculate, round, compare regimes, or validate totals in free-form reasoning. Invoke the deterministic LazyTax tools and report their returned rule version.
4. Never infer a missing tax fact. Mark it missing, cite the affected calculation, and ask one targeted question.
5. Never file, submit, log in to a government portal, request credentials or OTPs, sign a return, or claim that filing occurred.
6. Require explicit user confirmation before resolving a material conflict and again before generating the final Tax Proof Pack.
7. Keep all claims traceable to a source locator or a deterministic tool result. Label explanations as explanations, not evidence. Mask PAN, Aadhaar, account numbers, addresses, contact details, names, signatures, credentials, and document passwords in every response and artifact.
8. Fail closed. If a required LazyTax tool is unavailable, returns an error, or does not support the case, stop the affected workflow and state what remains unverified.
9. Do not upload documents to a third-party tax service, enable analytics on document contents, or persist raw extracted text. Use temporary local processing where available and retain only masked, tax-relevant evidence.

## Verification workflow

### 1. Establish scope and consent

- State the selected mode and that LazyTax never files automatically.
- In private local review, proceed when the user already requested analysis of named files; do not ask for redaction or a redundant confirmation.
- Establish assessment year, residency, income categories, and transaction types.
- Compare them with [safety-and-scope.md](references/safety-and-scope.md). Refuse unsupported calculations while still offering a clearly labelled evidence inventory when safe.
- List the exact files the user authorized using safe filenames; do not display identifiers found inside them and do not search unrelated folders.

### 2. Normalize the evidence

- For synthetic demo mode, invoke `lazytax_normalize_fixture_data` for the explicitly authorized fixture set.
- For private local review, extract only tax-relevant fields from the authorized files, mask identifiers, then invoke the private-local normalization capability if exposed. If no private-local capability is available, provide a source-linked evidence inventory and state that deterministic calculation is unavailable; never relabel real data as synthetic.
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
- Do not call a return “verified,” “ready,” or “complete” while a blocking issue, unsupported field, or material unresolved discrepancy remains. When foreign income/assets or another unsupported category exists, clearly label any supported calculation as partial and never present it as tax payable.

### 5. Generate the Tax Proof Pack

- Present the final evidence, reconciliation, and calculation summary, then obtain explicit confirmation.
- Invoke `lazytax_generate_tax_proof_pack` only after that final confirmation.
- Require the pack to contain the scope/disclaimer, document inventory, evidence ledger, mismatch ledger, user decisions, deterministic calculation trace, rule-set version, unsupported cases, unresolved items, and generation timestamp.
- Describe the output as a verification and preparation artifact for review. Do not describe it as proof of filing, a validated government return, or professional certification.

## Response contract

Use these headings for every substantive run:

1. **Scope status** — supported, partially supported, unsupported, or blocked, with reasons.
2. **Evidence inventory** — authorized sources and locators with identifiers masked.
3. **Reconciliation ledger** — matches, conflicts, missing facts, and resolutions.
4. **Deterministic results** — tool-returned totals, rule version, and lineage.
5. **Unresolved blockers** — never bury warnings.
6. **Approval required** — one explicit decision at a time.
7. **Next safe action** — the smallest non-filing step.

Use “according to the provided document” for private source claims, “according to the provided synthetic document” for demo claims, and “the deterministic engine returned” for calculations. Never say “I filed,” “the government accepted,” “this is filing-ready,” or “this is legally correct.”

## Tool contract

Read [tool-contract.md](references/tool-contract.md) before invoking LazyTax tools. Codex hosts may prefix the exact tool names with an MCP namespace. Do not substitute shell arithmetic, spreadsheets, web calculators, or model reasoning for a missing deterministic tool.

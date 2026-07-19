# LazyTax deterministic MCP contract

Use the exact capability names below. Codex hosts may add a server namespace prefix.

## `lazytax_normalize_fixture_data`

Input: the explicitly authorized synthetic fixture set or supported fixture payload.

Expected output: normalized taxpayer facts and evidence records with stable evidence IDs and source locators, plus scope warnings. This tool must not calculate tax.

## `lazytax_reconcile_evidence`

Input: normalized evidence and optional user-confirmed resolution records.

Expected output: matched, conflicting, missing, and unsupported groups; materiality/consequences when deterministically available; stable reconciliation identifiers.

## `lazytax_calculate_compare_regimes`

Input: normalized evidence plus explicit user resolutions.

Expected output: AY 2026-27 rule-set version, calculation trace, both supported regime results, input lineage, warnings, unsupported fields, and status. Repeat numbers exactly as returned.

## `lazytax_generate_tax_proof_pack`

Input: normalized evidence, reconciliation output, calculation output, explicit final confirmation, and any unresolved or unsupported items.

Expected output: an artifact path or content, generation timestamp, included sections, and remaining warnings. It must describe verification/preparation only and must never report filing, government validation, acknowledgement, or professional certification.

## Failure behavior

- On schema failure, show invalid field names without exposing sensitive content.
- On a tool error, preserve prior evidence and label the affected stage incomplete.
- On rule-set or assessment-year mismatch, stop numeric work.
- On missing lineage or confirmation, reject proof-pack generation.
- Never emulate a failed deterministic capability through model reasoning.

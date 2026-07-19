# LazyTax deterministic MCP contract

Use the exact capability names below. Codex hosts may add a server namespace prefix.

## `lazytax_plan_filing_session`

Input: privacy-safe workflow state only—opaque session reference, evidence-type
inventory, income-category labels, workflow milestones, portal mode and approval
state. Never include names, PAN, Aadhaar, account data, amounts, document text,
credentials, OTPs, EVCs, private keys or seed phrases.

Expected output: the single deterministic next-best action, owner, progress,
authoritative-source status, open items and at most three questions. Perform the
action before questioning the taxpayer whenever
`can_agent_continue_without_user` is true. A flag that an item
`blocks_complete_liability_only` never blocks safe partial progress.

## `lazytax_normalize_fixture_data`

Input: the explicitly authorized synthetic fixture set or supported fixture payload.

Expected output: normalized taxpayer facts and evidence records with stable evidence IDs and source locators, plus scope warnings. This tool must not calculate tax.

## `lazytax_normalize_private_tax_facts`

Pass only tax-relevant facts extracted from the user-authorized documents. Use one stable opaque per-session taxpayer reference when possible. The engine accepts protected identifiers only when needed to bind sources, then replaces taxpayer, document, evidence, and line identifiers before returning. Never pass Aadhaar, addresses, contact details, credentials, OTPs, signatures, or document passwords. Real data must remain labelled `local_private`; never set `synthetic: true` to bypass a schema boundary.

## `lazytax_reconcile_evidence`

Input: normalized evidence and optional user-confirmed resolution records.

Expected output: matched, conflicting, missing, and unsupported groups across supported income and credit categories; materiality/consequences when deterministically available; stable reconciliation identifiers.

## `lazytax_compute_us_stock_investments`

Input: complete FIFO acquisition and FY2025-26 sale facts for ordinary USD common-stock investments; documented INR acquisition cost for every buy; a verified SBI TT buying rate and prior-month-end rate date for every sale; calendar-2025 Schedule FA A2/A3 values; explicit ROR, investment-classification, and unsupported-feature gates. Use opaque trade, account and source references.

Expected output: masked matched/open lots, short-term normal-rate gain, long-term section 112 gain, Schedule CG/FSI/FA preparation facts, warnings, a source-set hash, and `tax_bridge_entries`. Never invent or fetch a missing FX rate. If `ready_for_supported_tax_calculation` is false, do not pass bridge entries into the tax workflow.

To continue, add the returned `tax_bridge_entries` unchanged to a private derived-evidence document, normalize it with `lazytax_normalize_private_tax_facts`, then reconcile normally. This preserves the dedicated engine's output hash as the aggregate source locator.

## `lazytax_calculate_compare_regimes`

Input: a calculation-ready reconciliation plus the supported taxpayer profile.

Expected output: AY 2026-27 calculation trace, both supported regime results, TDS/conditional FTC settlement, supported US-stock STCG/LTCG treatment in private mode, input lineage, warnings, unsupported fields, and status. Repeat numbers exactly as returned.

## `lazytax_generate_tax_proof_pack`

Input: normalized evidence, reconciliation output, calculation output,
`user_confirmed: true` after a distinct final approval, and any unresolved or
unsupported items.

Expected output: an artifact path or content, generation timestamp, included sections, and remaining warnings. It must describe verification/preparation only and must never report filing, government validation, acknowledgement, or professional certification.

## Failure behavior

- On schema failure, show invalid field names without exposing sensitive content.
- On a tool error, preserve prior evidence and label the affected stage incomplete.
- On rule-set or assessment-year mismatch, stop numeric work.
- On missing lineage or confirmation, reject proof-pack generation.
- Never emulate a failed deterministic capability through model reasoning.

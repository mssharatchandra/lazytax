# MCP evaluation notes

`mcp-evaluation.xml` contains exactly ten independent questions for the fixed `build_week_demo` fixture set.

Evaluation properties:

- read-only and non-destructive;
- no dependence on previous questions or stored state;
- stable because every question names a versioned, bundled fixture set;
- single-value answers suitable for direct string comparison;
- multi-step questions exercise normalization, reconciliation, deterministic comparison, and proof-pack generation;
- no answer depends on `generated_at` or the dynamic canonical-payload hash.

The expected values were verified against the MCP server through its public tool interface:

| Check | Stable result |
|---|---:|
| Supported normalized evidence records | 5 |
| Warning-only source records | 7 |
| Initial salary spread | 40000 |
| Sole unresolved category | salary |
| Ready after salary confirmation | true |
| Selected interest | 18500 |
| Selected section 111A STCG | 45000 |
| New-regime total tax | 172328 |
| Regime estimate difference | 206284 |
| Proof integrity algorithm | SHA-256 |

The evaluation contract assumes `lazytax_normalize_fixture_data` supports `{ "fixture_set": "build_week_demo" }`. Every later tool consumes the `structuredContent` returned by its predecessor. Use `response_format: "json"` when the evaluator benefits from fully visible textual output; structured content is returned in both response modes.

## Practitioner viewer regression suite

`practitioner-viewer-evaluation.xml` adds six stable checks for the separate synthetic practitioner surface. It covers role isolation, risk ordering, maker-checker separation, taxpayer-to-CA handoff direction, and the number of projected cases.

This is deliberately a viewer contract rather than an MCP tool evaluation. The queue is a read-only presentation projection built from the canonical live MCP demo workflow; it is not a claim that production identity, tenancy, assignment, or case persistence exists. Dynamic proof hashes are excluded from exact-match answers.

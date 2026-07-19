# Robustness audit — 19 July 2026

## Verdict

The repository is a strong hackathon proof and a deliberately unsafe place to
accept real taxpayer data. Its most important robustness property already
works: unsupported cases and unresolved conflicts fail closed, and the LLM is
not the numeric authority. Production readiness still requires the gates below.

## Current strengths

- Strict schemas at every MCP boundary and four narrowly described tools.
- Synthetic-only input contract with real-document rejection.
- Explicit user confirmation before proof-pack generation.
- Stable evidence IDs, source totals, conflict blocking, ruleset sources, and
  an integrity hash in the proof artifact.
- Self-contained installed plugin bundle; no repository-relative runtime dependency.
- No network telemetry, database, authentication, filing, or destructive tool.
- Tool annotations are present and contract-tested.
- Clean TypeScript build and seven passing unit/integration tests.

## Release blockers

| Priority | Finding | Required control |
|---|---|---|
| P0 | Currency is represented as JavaScript `number` in whole rupees | Integer paise or an exact decimal type; lint rule forbidding float currency |
| P0 | Only one narrow tax profile and seven tests | Boundary/golden/property/metamorphic/fuzz/differential corpus with coverage gate |
| P0 | Tax-credit rows are reduced to warning text | Preserve excluded/credit evidence structurally and implement tax-paid/refund reconciliation |
| P0 | Rules are constants with URLs, not a governed rules supply chain | Versioned source registry, effective dates, source hashes, supersession and reviewer sign-off |
| P0 | No production parser isolation | File type/size/content sniffing, malware/polyglot defenses, sandboxing, prompt-injection separation and resource limits |
| P0 | No auth, tenant isolation, consent ledger, deletion, or audit service | Hosted capability API with OAuth, deny-by-default authz, purpose/consent receipts and append-only audit ledger |
| P1 | Proof packs default to wall-clock time | Inject time/canonical serialization for byte-stable replay; separate created-at metadata from calculation identity |
| P1 | No CI/release supply-chain controls | Multi-OS/Node matrix, SBOM, SCA/SAST, secret scan, signed artifacts and provenance |
| P1 | No abuse/load/timeout behavior | Request limits, bounded parsing, rate limits, cancellation, backpressure and failure drills |
| P1 | Public plugin lacks hosted MCP and legal/support URLs | Complete `PLUGIN_DIRECTORY_RELEASE.md` gates |
| P2 | No operational observability | Redacted structured logs/Sentry plus opt-in metadata-only PostHog after vendor and consent approval |

## Robustness definition

A production release must be reproducible, exact, source-versioned, fail-closed,
bounded under hostile input, tenant-isolated, revocable, independently reviewed,
and observable without collecting taxpayer content. Passing happy-path tax
examples is necessary but insufficient.

The implementation work is tracked in LZ-47–LZ-68, especially LZ-59
(automated security), LZ-60 (telemetry/privacy), LZ-63 (rule registry), and
LZ-64 (engine hardening).


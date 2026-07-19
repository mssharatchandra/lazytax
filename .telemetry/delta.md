# Delta: Current → Target

The codebase is greenfield: no analytics SDK, capture call, identify call, group
call, or session replay integration exists.

## Add

| Work item | Target |
|---|---|
| Typed event registry | Nine allowlisted `lz_*` lifecycle, value, and reliability events |
| Consent gate | Separate, versioned opt-in before the SDK or identifier is initialized |
| First-party telemetry gateway | Validate schema, drop forbidden properties, remove IP/GeoIP, set no-person-profile mode |
| PostHog server adapter | Non-blocking batches from the hosted product only; local plugin remains no-op by default |
| Privacy tests | Reject PAN/Aadhaar patterns, amounts, paths, prompts, free text, tax categories, and unknown properties |
| Funnel dashboard | verification started → reconciliation completed → proof pack generated → workflow completed |
| Reliability dashboard | safe failure rate by stage/client/ruleset version |
| Channel experiment | completion and failure by web/MCP/Codex/Claude Code, with a pre-registered decision rule |
| Deletion path | Rotate local analytics ID and propagate processor deletion after withdrawal |

## Remove

Nothing is implemented. Before implementation, retire the older proposal to
capture session replay, exact tax deltas, regime winners, document types, tax
heads, and free-text referral values.

## Rename

None; there is no historical production dataset to migrate.

## Keep

None; target event count is 9 and all 9 are additions.

## Release order

1. Approve processor, cloud region, DPA, retention, deletion, and cross-border treatment.
2. Publish analytics notice and implement separate consent/withdrawal receipts.
3. Implement typed registry, no-op default sink, gateway, and privacy property tests.
4. Enable PostHog only for a synthetic/staging project and verify raw payloads.
5. Enable a production cohort after security/privacy review; keep replay and autocapture disabled.


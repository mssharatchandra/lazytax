---
name: lazytax-analytics
description: Privacy-safe PostHog event contract and instrumentation checklist for LazyTax. Consult before adding or reviewing telemetry on any surface.
---

# LazyTax analytics conventions

The source of truth is `.telemetry/tracking-plan.yaml`. Analytics is optional
product telemetry, not the tax audit ledger.

## Hard rules

1. Capture is **OFF by default**. Do not initialize an SDK or identifier before
   separate, versioned analytics consent.
2. Use only events and properties defined in the typed registry generated from
   `.telemetry/tracking-plan.yaml`; unknown fields are rejected, not dropped silently.
3. No PAN, Aadhaar, PII, IP/GeoIP, filenames, paths, document/evidence/case IDs,
   prompts, responses, free text, tax heads, deductions, amounts, refund/payable,
   regime winner, or source content.
4. No autocapture, pageviews, session replay, heatmaps, surveys, or LLM tracing
   on tax workflows. Synthetic public marketing pages require a separate review.
5. Use a random analytics-only `ins_*` identifier after opt-in. Never fingerprint
   a device or hash personal data. Set `$process_person_profile=false`.
6. Route hosted-product events through the first-party telemetry gateway. The
   local plugin uses a no-op sink unless the user explicitly enables disclosed telemetry.
7. Analytics is non-blocking. A capture failure cannot affect a tax workflow.
8. Withdrawal stops capture immediately, rotates/deletes the identifier, and
   propagates processor deletion.

## Canonical events

- `lz_session_started`
- `lz_verification_started`
- `lz_normalization_completed`
- `lz_reconciliation_completed`
- `lz_calculation_completed`
- `lz_proof_pack_generated`
- `lz_workflow_completed`
- `lz_workflow_failed`
- `lz_surface_switched`

## Dashboards

- Activation: verification started → reconciliation completed.
- Core value: proof pack generated / verification started.
- Completion: workflow completed / verification started.
- Reliability: safe failure rate by stage, client, and ruleset version.
- Channel fit: completion and failure across web/MCP/Codex/Claude Code.

## Pull-request checklist

- [ ] Event and every property exist in the canonical typed registry.
- [ ] Event fires after the outcome, at one canonical call site.
- [ ] Consent absent/withdrawn produces zero initialization and zero requests.
- [ ] Forbidden-field tests include PAN/Aadhaar patterns, amounts, paths, prompts,
      free text, tax categories, and unknown properties.
- [ ] Production traffic is separated from synthetic, CI, reviewer, and internal traffic.
- [ ] Raw synthetic payload inspected in the PostHog debugger before production enablement.

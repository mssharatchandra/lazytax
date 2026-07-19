---
name: lazytax-analytics
description: PostHog event taxonomy, naming rules, and instrumentation checklist for LazyTax. Consult when adding any user-facing surface, and during PR review to verify tracking coverage.
---

# LazyTax analytics conventions (PostHog)

## Rules
1. Event names: `lz_` prefix, snake_case, past-tense verb (`lz_json_generated`, not `lz_generate_json`).
2. **No PII in properties.** Never: PAN, name, email, amounts tied to identity by default. Amounts allowed only as bucketed ranges (`refund_bucket: "10k-50k"`) unless the user opted into the share card. CI type-checks event payloads against `packages/config/analytics.ts` — add new events there first.
3. Every event carries auto-context: `session_id` (anon), `wave`, `itr_type` (when known), `app_version`.
4. Client events via posthog-js; money-moment events (json generated, handoff completed) ALSO captured server-side (source of truth for the north-star).
5. Session replay: ON, `maskAllInputs: true`, upload areas additionally masked by class `.ph-no-capture`.

## Canonical event list (Wave 1)
Funnel order:
1. `lz_landing_viewed {ref, utm_*}`
2. `lz_chat_started`
3. `lz_consent_given`
4. `lz_doc_upload_started {doc_type: form16|ais|zerodha_pnl|groww_pnl|other}`
5. `lz_doc_parsed {doc_type, confidence_bucket, duration_ms}` / `lz_doc_parse_failed {doc_type, reason}`
6. `lz_dashboard_first_paint`
7. `lz_reconciliation_shown {diff_count}` → `lz_reconciliation_resolved {resolution: accept|edit|explain_first}`
8. `lz_regime_compared {winner, delta_bucket}`
9. `lz_line_item_explained {head}`
10. `lz_review_screen_viewed` → `lz_review_confirmed`
11. `lz_json_generated {itr_type, duration_total_ms}` → `lz_json_downloaded`
12. `lz_handoff_started` → `lz_handoff_step_completed {step: portal_login|upload|verify|everify}` → `lz_handoff_completed`
13. `lz_everify_confirmed {ack_captured: bool}`
14. `lz_share_card_created {amount_shown: bool}` → `lz_share_card_shared {channel}`
15. `lz_referral_landed {ref}`
Support/health: `lz_agent_error {tool, error_class}`, `lz_fallback_engaged {kind}`, `lz_data_deleted`.

## Dashboards (create before launch, LZ-19)
- **Activation funnel:** 1→6 (landing → dashboard first paint), split by doc_type and device.
- **Completion funnel:** 6→12 (north-star: `lz_handoff_completed`, weekly).
- **Parse health:** parse success rate by doc_type + confidence distribution; alert if fail-rate >10% over 1h.
- **Virality:** share-card creation rate per completion; referral-landed → chat conversion.
- Alert: any funnel step with >30% hour-over-hour drop during Jul 28–31.

## Instrumentation checklist (per PR)
- [ ] New surface's events exist in `analytics.ts` typed registry.
- [ ] Fired at the right moment (after success, not on click, unless intent-tracking).
- [ ] Verified live in PostHog event debugger (screenshot in PR).
- [ ] No new property carries free-text user content.

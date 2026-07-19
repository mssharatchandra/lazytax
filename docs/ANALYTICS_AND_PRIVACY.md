# Analytics and privacy release protocol

## Decision

Use PostHog for opt-in, metadata-only product analytics in the future hosted
product. Do not embed live PostHog capture in the Build Week local plugin. The
plugin's no-network/local-first property is part of the product thesis and must
remain true unless the user separately opts in and the listing discloses the
egress.

The canonical event contract is [`.telemetry/tracking-plan.yaml`](../.telemetry/tracking-plan.yaml).

## Architecture

```text
LazyTax client
  -> consent gate (default OFF)
  -> typed event builder
  -> forbidden-field/DLP check
  -> first-party /v1/telemetry gateway
  -> schema allowlist + IP/GeoIP removal
  -> PostHog server SDK ($process_person_profile=false)
```

The tax workflow never waits for this path. A telemetry outage must have no
effect on reconciliation, calculation, proof generation, or filing handoff.

## Non-negotiable controls

- Separate, versioned analytics consent; filing cannot be conditioned on it.
- No initialization, identifier, queue, or network request before opt-in.
- No PAN, Aadhaar, name, email, phone, address, IP, location, filenames, paths,
  document/evidence/case IDs, prompts, model output, tax heads, deductions,
  amounts, regime winner, or free text.
- No autocapture, session replay, heatmaps, surveys, or prompt/LLM tracing on
  upload, case, reconciliation, review, proof-pack, or handoff surfaces.
- Anonymous random installation IDs only; never device fingerprints or hashes
  of personal data. No PostHog person profiles.
- Server-side property allowlist and CI tests that fail on unknown properties.
- Production, staging, CI, internal, and synthetic traffic are explicitly
  separated. Synthetic/internal events do not enter product KPIs.
- Withdrawal immediately stops capture, rotates the local identifier, and
  triggers processor deletion where an identifier has already been sent.
- Processor approval must cover cloud region, DPA, subprocessors, retention,
  deletion, security, breach notice, and cross-border treatment.

PostHog supports opt-out-by-default, IP controls, client-side sanitization, and
anonymous events without person profiles, but LazyTax remains responsible for
deciding and disclosing what is collected. See the official
[privacy controls](https://posthog.com/docs/product-analytics/privacy),
[privacy compliance guidance](https://posthog.com/docs/privacy), and
[Node SDK documentation](https://posthog.com/docs/libraries/node).

## Metrics that matter

- **Activation:** verification started → reconciliation completed.
- **Core value:** proof pack generated / verification started.
- **Completion:** workflow completed / verification started.
- **Reliability:** safe failure rate by stage, client, ruleset version.
- **Channel fit:** completion and failure across web, MCP, Codex, and Claude Code.
- **Guardrails:** telemetry payload rejection count, consent withdrawals, and
  unsupported-case rate. Guardrail events remain aggregate and metadata-only.

Do not optimize for messages, tool calls, installs, time in product, or tax
outcomes. Those are either vanity metrics or dangerously close to taxpayer data.

## Go-live gate

PostHog can be enabled only after all of the following are true:

1. Public privacy notice and versioned consent/withdrawal UI exist.
2. Vendor, region, retention, DPA, deletion, and cross-border review are signed.
3. The allowlist/DLP tests prove every forbidden field is rejected.
4. Raw synthetic/staging payloads have been manually inspected.
5. Session replay and autocapture are demonstrably disabled on all tax surfaces.
6. Dashboard definitions and a channel decision rule are frozen before beta.


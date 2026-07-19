# LazyTax: safety and supported scope

## Data modes

### Synthetic demo

The public Build Week workflow uses fictional fixtures and rejects real identifiers.

### Private local review

When a user explicitly asks LazyTax to analyze named attachments or file paths, process only those files read-only. Real identifiers are permitted as input but must be masked in conversation, logs, deterministic inputs, and generated artifacts unless a field is strictly required for a tax rule. Do not require user-created redacted copies. Do not search adjacent folders, upload the files to a third-party tax service, enable content analytics, or retain raw extracted text.

## Supported demonstration profile

All conditions must hold:

- Assessment year: AY 2026-27 (financial year 2025-26).
- Taxpayer: resident individual.
- Income: salary from domestic employment, plus only ancillary fields explicitly accepted by the deterministic engine.
- Investments: delivery-based domestic listed equity plus ordinary USD-denominated US common-stock investments that the dedicated engine explicitly accepts.
- Documents: bundled synthetic fixtures, or explicitly authorized private documents after masked tax-fact extraction.
- Purpose: evidence normalization, reconciliation, deterministic regime comparison/calculation, and proof-pack generation.

Treat the engine's machine-readable result as authoritative if it is narrower than this document.

## Unsupported in the MVP

Stop calculation when the case includes any unsupported item, including:

- Non-resident or resident-but-not-ordinarily-resident status.
- Business or professional income, partnership income, presumptive income, or director/unlisted-share complexity.
- Intraday, derivatives, futures and options, short selling, cryptoassets, margin, securities lending, or non-US foreign securities.
- US-stock support requires ROR status, investment classification, complete FIFO acquisition history with documented INR costs, verified prior-month-end SBI TT buying rates for sales, ordinary cash-purchased common stock, USD, no capital losses requiring cross-asset set-off, no foreign tax on capital gains, and no corporate actions.
- RSUs, ESPPs, employee stock options, splits, mergers, spin-offs, return of capital, gifts, inheritance, multiple currencies, treaty-specific capital-gains relief, foreign capital-loss carry-forward, and overseas employment remain outside the deterministic engine. Their presence must produce a partial-support result and an exact list of missing calculations; it must not prevent evidence inventory.
- Agricultural-income interactions, trusts, estates, clubbing/minor income, carry-forward losses, or other cases the engine does not declare supported.
- Amended, revised, belated, defective, notice-response, assessment, appeal, audit, or litigation workflows.
- Direct filing, portal automation, credential handling, OTP handling, signatures, payments, refunds, or representation before an authority.

Do not improvise a partial numeric answer for an unsupported case. Return the supported evidence findings separately and identify what requires a qualified tax professional.

## Data boundary

The public judge fixture remains synthetic-only. Private local review may accept real taxpayer documents when the user explicitly authorizes the named files for the requested task.

Authorize files by explicit path or attachment. Do not recursively inspect user directories. Do not upload to third-party tax services, persist raw extracted text, or echo identifiers. Prefer record IDs, masked labels, and source locators. Never request portal credentials or OTPs. A protected-document password may be used only through a local secret-entry mechanism and must not be repeated in conversation or artifacts.

## Human approval gates

Require affirmative confirmation at these points:

1. Each material discrepancy resolution accurately reflects the user's selected source or correction.
2. The final evidence and calculation summary may be used to generate a Tax Proof Pack.

Silence, document presence, or a prior broad request is not confirmation.

## Required disclaimer

State prominently:

> LazyTax provides evidence-backed tax preparation for review. It does not provide tax or legal advice and does not submit anything to a tax authority.

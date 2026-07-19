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

## Partial-support boundaries in the MVP

An item below stops only its affected deterministic calculation or filing
claim. Continue inventory, authoritative-source collection, reconciliation and
every separable supported calculation:

- Non-resident or resident-but-not-ordinarily-resident status.
- Business or professional income, partnership income, presumptive income, or director/unlisted-share complexity.
- Intraday, derivatives, futures and options, short selling, cryptoassets, margin, securities lending, or non-US foreign securities.
- US-stock support requires ROR status, investment classification, complete FIFO acquisition history with documented INR costs, verified prior-month-end SBI TT buying rates for sales, ordinary cash-purchased common stock, USD, no capital losses requiring cross-asset set-off, no foreign tax on capital gains, and no corporate actions.
- RSUs, ESPPs, employee stock options, splits, mergers, spin-offs, return of capital, gifts, inheritance, multiple currencies, treaty-specific capital-gains relief, foreign capital-loss carry-forward, and overseas employment remain outside the deterministic engine. Their presence must produce a partial-support result and an exact list of missing calculations; it must not prevent evidence inventory.
- Agricultural-income interactions, trusts, estates, clubbing/minor income, carry-forward losses, or other cases the engine does not declare supported.
- Amended, revised, belated, defective, notice-response, assessment, appeal, audit, or litigation workflows.
- Unsupervised filing, credential or OTP collection, signatures, payments,
  refunds, or representation before an authority. User-supervised navigation
  and collection on the official portal is allowed when an approved browser
  capability is available. Submission and e-verification require distinct
  taxpayer approval and a supported browser or registered ERI rail.

Do not improvise a numeric answer for an unsupported component. Return supported
figures separately, quantify the open item's potential effect when a
deterministic bound exists, and prepare a CA-ready evidence packet for what
requires specialist review.

## Data boundary

The public judge fixture remains synthetic-only. Private local review may accept real taxpayer documents when the user explicitly authorizes the named files for the requested task.

Authorize files by explicit path or attachment. Do not recursively inspect user
directories. Do not upload to third-party tax services, persist raw extracted
text, or echo identifiers. Prefer record IDs, masked labels, and source
locators. Never request portal credentials or OTPs in chat or tool inputs.
Authentication occurs directly at the official origin or through an approved
ERI consent flow. A protected-document password may be used only through a
local secret-entry mechanism and must not be repeated in conversation or
artifacts.

## Human approval gates

Require affirmative confirmation at these points:

1. A material discrepancy truly requiring taxpayer judgment.
2. The final evidence and calculation summary may be used to generate a Tax Proof Pack.
3. Submission of the exact reviewed return draft.
4. Payment, profile change, e-verification, deletion or another consequential action.

Silence, document presence, or a prior broad request is not confirmation.

## Required disclaimer

State once when material:

> LazyTax is tax-preparation software, not a chartered accountant or law firm.
> It submits only through a supported filing rail after the taxpayer approves
> the exact reviewed return; credentials and verification secrets remain with
> the taxpayer.

# LazyTax Build Week MVP: safety and supported scope

## Supported demonstration profile

All conditions must hold:

- Assessment year: AY 2026-27 (financial year 2025-26).
- Taxpayer: resident individual.
- Income: salary from domestic employment, plus only ancillary fields explicitly accepted by the deterministic engine.
- Investments: delivery-based transactions in domestic listed equity that the engine explicitly accepts.
- Documents: synthetic or fully de-identified Form 16-like statement, AIS-like statement, and broker trade/P&L fixture.
- Purpose: evidence normalization, reconciliation, deterministic regime comparison/calculation, and proof-pack generation.

Treat the engine's machine-readable result as authoritative if it is narrower than this document.

## Unsupported in the MVP

Stop calculation when the case includes any unsupported item, including:

- Non-resident or resident-but-not-ordinarily-resident status.
- Business or professional income, partnership income, presumptive income, or director/unlisted-share complexity.
- Intraday, derivatives, futures and options, short selling, cryptoassets, or foreign securities.
- Foreign income, foreign assets, tax treaties, foreign tax credit, or overseas employment.
- Agricultural-income interactions, trusts, estates, clubbing/minor income, carry-forward losses, or other cases the engine does not declare supported.
- Amended, revised, belated, defective, notice-response, assessment, appeal, audit, or litigation workflows.
- Direct filing, portal automation, credential handling, OTP handling, signatures, payments, refunds, or representation before an authority.

Do not improvise a partial numeric answer for an unsupported case. Return the supported evidence findings separately and identify what requires a qualified tax professional.

## Data boundary

This hackathon build is tested with synthetic fixtures only. Do not accept or retain real taxpayer secrets or identifiers. Never request PAN, Aadhaar, passwords, OTPs, complete bank/account identifiers, signatures, or government-portal access.

Authorize files by explicit path or attachment. Do not recursively inspect user directories. Do not upload, persist, or echo identifiers. Prefer record IDs and masked labels in the conversation and proof pack.

## Human approval gates

Require affirmative confirmation at these points:

1. The data is synthetic or fully de-identified and the profile is in scope.
2. Each material discrepancy resolution accurately reflects the user's selected source or correction.
3. The final evidence and calculation summary may be used to generate a Tax Proof Pack.

Silence, document presence, or a prior broad request is not confirmation.

## Required disclaimer

State prominently:

> LazyTax Build Week MVP is demonstration software using synthetic data. It does not provide tax or legal advice, does not support production filing, and does not submit anything to a tax authority.

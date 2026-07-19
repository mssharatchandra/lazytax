# Tax coverage and competitive strategy

## The honest target

LazyTax should not claim to cover “all Indian tax laws.” That phrase includes
personal and corporate income tax, GST, TDS/TCS, transfer pricing, international
tax, DTAAs, customs, litigation, state levies, annual Finance Acts, rules,
notifications, circulars, schemas, validation utilities, and changing case law.
No safe product reaches that scope by putting statutes into an LLM prompt.

The product can become stronger than ClearTax for a chosen job: **proving a
personal income-tax return from source evidence inside the user's preferred AI
agent**. Breadth follows only after that trust loop is excellent.

## Competitive reality

ClearTax already supports broad consumer filing, Form 16 import, multiple Form
16s, house property, stocks and mutual funds, broker imports, F&O, crypto,
foreign income/assets, NRI/RNOR, business, freelance, HUF, revised returns,
AI assistance, CA-assisted filing, and notice management. Its public site also
claims millions of users and many filing surfaces. Current references:
[filing product](https://cleartax.in/income-tax-efiling/?slug=isc),
[filing workflow](https://cleartax.in/s/how-to-e-file-your-income-tax-return/),
[AI assistance](https://cleartax.in/s/ai-assisted-filing/), and
[assisted plans](https://cleartax.in/s/pricing).

Trying to match this checklist immediately would produce a wider but less safe
demo. LazyTax's wedge is a different trust architecture.

## Right-to-win thesis

1. **Every number is a claim with evidence.** The primary object is not a form
   field; it is an evidence-linked, reconciled claim with source, rule, decision,
   confidence, and calculation trace.
2. **The agent is an interface, not the calculator.** LLMs interpret and explain;
   versioned deterministic tools own every rupee and every eligibility boundary.
3. **Conflicts are first-class.** The product shows disagreement between Form 16,
   AIS, 26AS, brokers, banks, and user records and blocks until it is resolved.
4. **The output is portable proof.** A reproducible Tax Proof Pack can be reviewed
   by the taxpayer, CA, employer, or another agent instead of trapping trust in a
   vendor dashboard.
5. **The user chooses the interface.** Codex, ChatGPT, Claude Code, MCP clients,
   and the web app call the same scoped engine and audit ledger.
6. **Privacy is part of correctness.** Local verification and minimal, consented
   telemetry create a credible alternative to uploading all records by default.

## Coverage architecture

Treat tax knowledge as a signed, versioned rules supply chain:

```text
Official Act / Finance Act / Rules / notification / circular / ITR schema
  -> normalized source registry with effective dates and authority
  -> machine-readable rule module + examples
  -> deterministic engine implementation
  -> government-utility and independent worked-example cross-checks
  -> golden/property/metamorphic tests
  -> CA/legal reviewer approval
  -> signed ruleset release + migration notes
```

For AY 2026-27, the official portal currently publishes a common utility for
ITR-1 through ITR-4 and versioned validation/schema documents. Those artifacts,
not a blog or model memory, must be release inputs. See the official
[downloads](https://www.incometax.gov.in/iec/foportal/downloads),
[salaried-individual applicability guide](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1),
and [CBDT circulars](https://incometaxindia.gov.in/Pages/communications/circulars.aspx?c=25).

## Sequenced coverage

### Phase 0 — current Build Week proof

One resident salaried AY 2026-27 profile, savings interest/dividends, domestic
listed-equity gains, private foreign dividends/FTC, and an initial ROR US
common-stock investment slice with FIFO matching, documented INR acquisition
costs, evidenced prior-month-end SBI TT sale-rate dates and Schedule CG/FSI/FA
preparation. Synthetic judge documents remain the public
demo; private evidence is separately pseudonymized. No filing.

### Phase 1 — production individual filing foundation

- Integer paise/decimal arithmetic, official rounding, surcharge and marginal relief.
- Tax credits, interest/fees, refund/payable, advance/self-assessment tax.
- Secure Form 16, AIS/TIS, 26AS, bank, and broker ingestion.
- ITR-1 and ITR-2 JSON validation against official schemas/utilities.
- Multiple employers, house property, deductions, HRA, capital-loss set-off and carry-forward.
- Versioned source/rule registry and independent CA approval for each release.

### Phase 2 — complex individuals and professionals

- ITR-3/ITR-4, F&O/intraday, books/presumptive income, 44AD/44ADA/44AE.
- ESOP/RSU, crypto/VDA, gaming, property/gold/debt assets.
- NRI/RNOR and foreign income/assets beyond ordinary US common-stock investments; complete DTAA/TRC/FTC workflows beyond the current dividend credit and CG/FSI/FA preparation path.
- Clubbing, agricultural-income integration, relief, brought-forward losses,
  revised/belated/updated returns, and defective-return preflight.
- Human-review routing for audit, valuation, treaty, and judgment-heavy cases.

### Phase 3 — filing and post-filing

- ERI or approved provider integration with explicit review hash and consent.
- Payment/e-verification status, acknowledgements, revisions, rectifications,
  notices, 143(1) reconciliation, and evidence-preserving responses.
- Tax-professional workspace with maker-checker approval.

### Phase 4 — adjacent Indian tax products

GST, TDS/TCS, corporate income tax, transfer pricing, and litigation are separate
products with separate rules, schemas, permissions, reviewer expertise, and
release gates. GST alone has distinct returns, ledgers, invoices, ITC, e-invoice,
e-way-bill, notification, and reconciliation systems; see the official
[GST returns guidance](https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm)
and [CBIC notifications](https://cbic-gst.gov.in/hindi/central-tax-notifications.html).

## Capability scorecard

LazyTax should declare coverage at the rule-and-fixture level, not with a single
marketing checkbox. A capability is “supported” only when its sources, input
formats, eligibility boundaries, engine rules, JSON schedules, golden tests,
government-utility cross-check, failure modes, and named reviewer are all green.

The near-term win is not “more tax law than ClearTax.” It is **more proof per
supported filing**. Once that trust kernel is measurable, breadth becomes a
repeatable engineering process instead of a collection of fragile prompts.

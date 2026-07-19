---
name: itr-ay2026-27-rules
description: Authoritative AY 2026-27 (FY 2025-26) Indian income-tax rules, rates, and trap cases. Consult before writing or reviewing ANY code in packages/engine, packages/itr-json, or agent explanations that touch tax logic.
---

# AY 2026-27 tax rules — single source of truth for LazyTax

All amounts in ₹; engine stores integer **paise**. Every constant below must live in `packages/engine/rules/AY2026_27.ts` — never inline elsewhere.

## Regimes

**New regime (default):**
- Slabs: 0–4L nil · 4–8L 5% · 8–12L 10% · 12–16L 15% · 16–20L 20% · 20–24L 25% · >24L 30%
- Standard deduction ₹75,000 (salary/pension)
- §87A rebate up to ₹60,000 ⇒ nil tax up to ₹12L **taxable** income; marginal relief just above the cliff.

**Old regime (opt-in):**
- Slabs: 0–2.5L nil · 2.5–5L 5% · 5–10L 20% · >10L 30% (senior-citizen thresholds differ — out of MVP scope, assert age <60)
- Standard deduction ₹50,000; §87A ₹12,500 up to ₹5L taxable
- Deductions: 80C (cap 1.5L), 80D, HRA exemption, home-loan interest (24b cap 2L self-occupied).

**Both:** 4% health & education cess on tax+surcharge. Surcharge 10% >50L, 15% >1cr, 25% >2cr, 37% >5cr (37% only old regime; 25% cap in new) — **surcharge on §111A/112A/dividend income capped at 15%… verify: capped at 25% overall for cap-gains per current plan doc; engine ticket must confirm against ITD calculator before locking constant.** Marginal relief applies at every surcharge threshold.

## Capital gains (equity)
- §111A STCG (STT-paid equity/equity-MF, held ≤12m): **20%**.
- §112A LTCG (>12m): **12.5%** on gains above **₹1,25,000 combined** exemption (ST+LT share the single LTCG exemption? No — the ₹1.25L applies to 112A LTCG only; combined across all 112A assets). No indexation.
- Grandfathering: FMV as on 31-Jan-2018 step-up for pre-2018 acquisitions.
- Rate split at **23-Jul-2024**: transfers before that date in FY use pre-Budget rates (STCG 15%, LTCG 10% over ₹1L equivalent rules per transitional provisions) — for AY 2026-27 (FY 2025-26) all transfers are post-split, so flat 20/12.5 applies. Keep the split logic anyway (property election below reuses the date).
- Property/gold/unlisted LTCG: 12.5% no-index; **election** for land/building acquired before 23-Jul-2024: 12.5% no-index vs 20% with indexation, whichever lower.
- Debt MF units acquired on/after 1-Apr-2023: always slab rate (no LTCG treatment).
- FIFO lot matching for demat holdings.

## ⚠️ Trap cases (every one needs a named golden test)
1. **§87A does NOT apply to special-rate income** (111A/112A). A ₹11L salary + ₹1L STCG person pays STCG tax even though slab tax is rebated. Most common bug in Indian tax software.
2. **₹1,25,000 boundary**: gains of exactly 1,25,000 ⇒ zero 112A tax; 1,25,001 ⇒ tax on ₹1 (12.5 paise → rounding rules).
3. **Rebate cliff at 12L** + marginal relief just above.
4. Surcharge marginal relief at 50L/1cr boundaries.
5. LTCL set-off: LT loss offsets LT gains only; ST loss offsets both; carry-forward 8 years (report even if unused — schedule CFL).
6. TDS from Form 16 Part A must reconcile with 26AS/AIS; mismatch ⇒ warn, use AIS/26AS figure for credit claims.
7. Rounding: total income to nearest ₹10 (§288A), tax to nearest ₹1 (§288B). Round at the mandated points only — never intermediate.

## Salary heads & exemptions (regime-aware — LZ-42)
- **HRA §10(13A)** — old regime only: exempt = min(actual HRA, rent paid − 10% of basic+DA, 50% metro / 40% non-metro of basic+DA). Rent >₹1L/yr needs landlord PAN. Disallowed entirely in new regime.
- **Leave encashment §10(10AA)** — govt employees: fully exempt. Non-govt: min(₹25,00,000 lifetime cap, amount received, 10-month average salary, unutilized leave (≤30 days/yr of service) × avg monthly salary). Applies in BOTH regimes. Track lifetime cap usage.
- **Gratuity §10(10)** — ₹20L cap; formula differs by Payment of Gratuity Act coverage (15/26 × last salary × years vs half-month average). Both regimes.
- **LTA §10(5)** — old regime only; 2 journeys per block; proof-flagged.
- **Bonus / joining bonus** — fully taxable as salary in year of receipt; clawback = messy edge, flag to CA.
- **Employer PF+NPS+superannuation >₹7.5L/yr** — excess is a taxable perquisite (+ accretions). Warn, compute simple case.
- **Professional tax §16(iii)** — deductible (old regime).
- **Standard deduction is per PERSON, not per employer** — ₹75k (new) / ₹50k (old) applied exactly once.

## Multi-employer consolidation traps (LZ-41)
1. Both employers apply the standard deduction and the nil slab → aggregate TDS is short; user expects a refund but OWES tax. Detect and warn early.
2. Aggregate salary pushes the user into a higher slab/surcharge band than either employer withheld for.
3. Overlapping employment periods → duplicate months of salary; ask, don't assume.
4. Salary arrears → relief u/s 89 requires Form 10E filed BEFORE the return; MVP flags + guides, doesn't compute.
5. TDS credits must match 26AS/AIS per-TAN; claim per Form 16 Part A entries.

## House property (LZ-43)
- Self-occupied: §24(b) interest deduction cap ₹2,00,000 — **old regime only** (new regime disallows for self-occupied; the #1 regime-choice surprise).
- Let-out: NAV = rent − municipal taxes; deduct 30% standard + full interest; HP loss set-off against other heads capped at ₹2L/yr, excess c/f 8 years (only against HP income). Let-out interest is deductible in new regime too (up to the rental income / set-off cap).
- Pre-construction interest: aggregate, claim in 5 equal installments from completion year.
- Home-loan principal + stamp duty → 80C bucket (old regime).

## Chapter VI-A quick matrix (LZ-44)
Old regime: 80C ₹1.5L · 80CCD(1B) ₹50k · 80D ₹25k/₹50k(senior) self + separate parents tier + ₹5k preventive sub-limit · 80TTA ₹10k (80TTB ₹50k seniors) · 80G (50/100%, qualifying limit, ARN required) · 80E (no cap, 8 yrs).
New regime survivors: standard deduction, 80CCD(2) employer NPS, 80JJAA. Everything else gone — agent must state this when comparing regimes.
Interest u/s 234A/B/C applies on shortfall/belated filing — estimate, don't hide.

## Filing facts
- Due dates AY 2026-27: ITR-1/2/4 non-audit **31-Jul-2026**; ITR-3 non-audit **31-Aug-2026**; audit 31-Oct-2026. Belated/revised until 31-Dec-2026.
- Form router: any capital gains ⇒ ITR-2 minimum; business/F&O ⇒ ITR-3 (Wave 2); >₹50L total income disqualifies ITR-1.
- New regime is the default; old regime for salaried = choose in return each year; business income opt-out needs Form 10-IEA (Wave 2).
- Special-rate incomes and their schedules (CG, OS, VIA, TDS) must be internally consistent or the return is defective u/s 139(9) — itr-json runs a completeness preflight.

## Agent-explanation rules
- Numbers come only from engine tool results; the agent may simplify language but must not recompute or round differently.
- Always name the section (§111A, §87A…) once, then use plain language.
- When a constant here is marked "verify", the engine ticket owner must confirm against the ITD calculator and update this file + DECISIONS.md before shipping.

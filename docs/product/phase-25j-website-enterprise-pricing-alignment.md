# Phase 25J — Website Enterprise Pricing Alignment

**Date:** 2026-06-09
**Companion:** `phase-25j-enterprise-pricing-recommendation.md` §12 and §16.
**Scope:** Recommendation for the `sourcedeck-site` repo when website alignment runs in a future phase. This phase does **not** edit the website repo.

---

## 1. What the website should show

The public pricing card should display **five tiers** in this order:

```
Solo Capture — $149/mo

GovCon Operator — $499/mo or $4,990/yr

Operator Plus — $997/mo or $9,970/yr

Team 5 — starts at $1,997/mo or $19,970/yr

Enterprise — custom
```

Each card should display:
- Tier name
- Price (monthly with annual where applicable)
- Audience one-liner
- 4–6 included surfaces (bullet list, not exhaustive)
- Primary CTA: **Request Access** (links to `/request-access/`)

Annual prices may be displayed where they exist; "Save 17%" or similar discount math should **not** be displayed publicly.

## 2. What the website should NOT show

- ❌ Capture Team 10 / GovCon Enterprise 25 / Enterprise Command as separate cards with prices.
- ❌ Setup-fee grid ($7,497 / $9,997 / $14,997 / $24,997+).
- ❌ Add-on standard user ($249/user/mo) or power user ($399/user/mo) prices.
- ❌ Additional office price ($997/mo).
- ❌ Additional onboarding workshop ($2,500/session).
- ❌ Annual savings math or percentage.
- ❌ Per-seat multipliers.
- ❌ Pilot-to-enterprise conversion offer.
- ❌ Deprecated V2 prices ($79 / $349 / $999) anywhere.
- ❌ V1 legacy prices ($49 / $149) anywhere except server-side `STRIPE_PRICES_LEGACY`.
- ❌ "Free demo," "Try now," "Download now," "Get started free," or "Start free" CTAs (Phase 25C invariant).
- ❌ Public download CTA (Phase 25C invariant).
- ❌ Self-serve checkout for Enterprise tier.
- ❌ Compliance certifications (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001) — no certified claim without evidence (Phase 25A invariant).
- ❌ Guaranteed-award / guaranteed-revenue claims.

## 3. Recommended Team 5 card copy

> **Team 5**
>
> *Starts at $1,997/mo or $19,970/yr*
>
> Built for a 5-person GovCon office running multiple concurrent pursuits.
>
> Includes:
> - Everything in Operator Plus
> - Up to 5 user accounts
> - Shared Capture Command Center, Calendar, and Today's Work Plan
> - Coordinated proposal-section workflow
> - Vendor / subcontractor workspace
> - FAR Reference + AI FAQ + Compliance Review
> - Submission Readiness Gate + Submission Package Export
> - Word + PDF proposal export
> - Onboarding included
>
> **Request Access**

## 4. Recommended Enterprise card copy

> **Enterprise**
>
> *Custom*
>
> Built for capture teams, proposal teams, and multi-office GovCon operators. Includes shared capture workspace, proposal coordination, vendor/subcontractor management, FAR Reference, calendar coordination, pipeline visibility, onboarding, and support.
>
> Custom-scoped to your number of users, offices, pursuit volume, governance requirements, and security expectations.
>
> **Request Enterprise Access**

## 5. Why detailed quote-sheet pricing should stay internal

| Reason | Detail |
|---|---|
| **Scoping leverage** | Enterprise deals are signal-rich. Published numbers strip the operator's ability to scope to the customer's actual scope (users × offices × pursuit volume × governance × support). |
| **Conversion psychology** | Published per-seat multipliers cause customers to do the math themselves, find a number they like, and ignore the scope conversation. |
| **Negotiation latitude** | Setup fees published as a grid can't be bundled into the annual to close a deal. Keeping them internal preserves the operator's ability to absorb setup into year 1 in exchange for a multi-year commit. |
| **Tier-comparison framing** | Five public tiers (Solo → Operator → Plus → Team 5 → Enterprise) give the buyer a clean ladder. Eight public tiers (adding Team 10, Enterprise 25, Enterprise Command) cause decision paralysis. |

## 6. Request Access posture (preserved)

Phase 25C master delivery method is unchanged:

> Website → Request Access → Manual Qualification → Approved Onboarding → Secure Web App / PWA

The website **must not**:
- Add public checkout for Enterprise tier.
- Add self-serve signup for Team 5 or Enterprise.
- Add free-trial flow.
- Add direct Stripe checkout link for any Enterprise quote.

**Acceptable Enterprise tier CTAs:**
- `Request Enterprise Access` (routes to `/request-access/?tier=enterprise`)
- `Schedule an Enterprise Call` (routes to calendar booking)
- `Get a Custom Quote` (routes to `/quote/operator/`)

## 7. Implementation services (one-time) — public display

The pricing-source-of-truth one-time SKUs may be displayed on the public site as the existing matrix:

```
Self-Install Implementation — $1,497
Guided Implementation — $3,497
DFY Implementation — $5,997
```

The Enterprise Onboarding ($7,497), Capture Team Deployment ($9,997), and Multi-Office Deployment ($14,997+) tiers are **operator-quoted only** and must not appear as fixed line items on the public site. See `phase-25j-enterprise-onboarding-support-matrix.md` §6 for the rationale.

## 8. Stripe Price ID guidance (operator action)

| Tier | Public Stripe Product needed? | Action |
|---|---|---|
| Solo Capture $149/mo | Yes (existing) | No change |
| GovCon Operator $499/mo or $4,990/yr | Yes (existing) | No change |
| Operator Plus $997/mo or $9,970/yr | Yes (existing) | No change |
| **Team 5 starts at $1,997/mo or $19,970/yr** | Yes — **new** Product needed | Operator must create the Stripe Product + Price ID at the V3 amounts before the site card can route a self-serve checkout. **Phase 25J does not create the Stripe Product.** |
| Enterprise custom | No public Stripe Product | Quote-led; invoice issued out-of-band |
| Capture Team 10 / Enterprise 25 / Enterprise Command | No public Stripe Product | Quote-led; invoice issued out-of-band |
| Add-on standard / power user | No public Stripe Product | Quote-led; invoice issued out-of-band |

**Phase 25J does not edit Stripe configuration, Stripe products, Stripe Price IDs, or `sourcedeck-site/assets/sd-config.js`.** All Stripe work is operator-managed in the Stripe dashboard.

## 9. Currency / locale guidance

- All prices in **USD**, displayed with comma thousands separator (`$1,997/mo`).
- Annual prices use `$19,970/yr` form (not `$19,970 per year`).
- Tier names are not translated; pricing is not translated. The Spanish i18n dictionary already carries the Spanish translation of the V3 pricing copy from the Phase 25A site PR #6; the Team 5 tier will need a Spanish translation when the website alignment phase runs.

## 10. No pricing change in this phase

| Surface | Status |
|---|---|
| `docs/product/pricing-source-of-truth.md` (this repo) | ✅ Unchanged |
| `sourcedeck-site/pricing/index.html` | ✅ Unchanged (separate repo, separate phase) |
| `sourcedeck-site/invoice/index.html` | ✅ Unchanged |
| `sourcedeck-site/assets/sd-i18n-dict.js` | ✅ Unchanged |
| `sourcedeck-site/assets/sd-config.js` Stripe Price IDs | ✅ Unchanged |
| `sourcedeck-site/CLAUDE.md` rule 3 | ✅ Unchanged |

The current V3 alignment from the Phase 25A site PR #6 holds: Solo Capture $149/mo · GovCon Operator $499/mo or $4,990/yr · Operator Plus $997/mo or $9,970/yr · Enterprise custom. Team 5 tier addition requires a follow-up site PR — not part of this phase.

---

## Signature

This document records the website pricing alignment recommendation for the day the owner approves Phase 25J. No website change is made in this phase. The Request Access posture is preserved. No public checkout. No self-serve Enterprise signup.

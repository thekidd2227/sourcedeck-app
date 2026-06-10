# Phase 25J — Enterprise Pricing Recommendation

**Phase:** 25J — Enterprise Pricing Architecture + Team Licensing Recommendation.
**Date:** 2026-06-09.
**Branch:** `docs/phase-25j-enterprise-pricing`.
**Base:** `main` (post-Phase-25I).

---

## What this phase delivered

A docs-only enterprise pricing recommendation for SourceDeck — public pricing tier addition (Team 5) + internal quote sheet (Capture Team 10 / GovCon Enterprise 25 / Enterprise Command) + onboarding/support matrix + website alignment guidance.

**Pricing source-of-truth (`docs/product/pricing-source-of-truth.md`) is UNCHANGED.** Owner approval required per `phase-25j-enterprise-pricing-recommendation.md` §18 items 1–8 before any source-of-truth update.

## Recommended enterprise tiers

### Public pricing card (5 tiers)

```
Solo Capture — $149/mo
GovCon Operator — $499/mo or $4,990/yr
Operator Plus — $997/mo or $9,970/yr
Team 5 — starts at $1,997/mo or $19,970/yr        [NEW]
Enterprise — custom
```

### Internal quote sheet (operator-managed, NOT published)

```
Team 5                 — 3–5 users      — $1,997/mo or $19,970/yr  — $7,497 setup
Capture Team 10        — 6–10 users     — $3,997/mo or $39,970/yr  — $9,997 setup
GovCon Enterprise 25   — 11–25 users    — starts at $6,997/mo      — $14,997 setup
Enterprise Command     — 26+ multi-off  — custom                   — $24,997+ setup

Additional standard user      — $249/user/mo
Additional power user         — $399/user/mo
Additional office             — $997/mo
Additional onboarding workshop — $2,500/session
```

### Onboarding / support SKUs

```
Self-Install                        — $1,497         (existing)
Guided                              — $3,497         (existing)
Enterprise Onboarding (Team 5)      — $7,497         (NEW, included w/ Team 5)
Capture Team Deployment (Team 10)   — $9,997         (NEW, included w/ Capture Team 10)
Multi-Office Deployment (Enterprise 25) — $14,997    (NEW, included w/ Enterprise 25)
Multi-Office Deployment (Enterprise Command) — $24,997+   (NEW, included w/ Enterprise Command)
```

## Docs added (5 new docs)

| Doc | Role |
|---|---|
| `docs/product/phase-25j-enterprise-pricing-recommendation.md` | Full pricing-strategy recommendation: executive summary, baseline, philosophy, public table, internal quote table, add-ons, onboarding pricing, support packages, feature-value matrix, buyer-segment analysis, website display, sales positioning, underpricing risks, overcomplicating risks, do-not-publish list, final recommended model, 8 items requiring owner approval. |
| `docs/product/phase-25j-website-enterprise-pricing-alignment.md` | Recommended Team 5 + Enterprise card copy for the website when site alignment runs in a future phase. What to publish, what NOT to publish, Stripe Price ID guidance (operator action), no website change in this phase. |
| `docs/sales/phase-25j-enterprise-quote-sheet-draft.md` | Internal-only quote sheet: 4 enterprise tiers with line items, plan inclusions, setup fees, add-ons, support packages, annual discount logic, pilot-to-enterprise conversion (ARCG-approval-required), multi-office terms, seat expansion terms, renewal note, operator hand-off workflow. |
| `docs/product/phase-25j-enterprise-onboarding-support-matrix.md` | Onboarding SKU matrix, onboarding phases (Week 1 → Hand-off + Quarterly review), support tier matrix, optional add-ons, onboarding-included matrix, why setup fees are quote-led, renewal-time onboarding deltas, bundling levers, hand-off process, onboarding metrics. |
| `docs/release-notes/phase-25j-enterprise-pricing-recommendation.md` (this file) | Release note. |

## What did NOT change

- ✅ `docs/product/pricing-source-of-truth.md` — **unchanged.**
- ✅ `sourcedeck.html` — not touched.
- ✅ `package.json` — not touched.
- ✅ `sourcedeck-site` (website repo) — not touched (separate phase, separate repo).
- ✅ Stripe Products / Price IDs — not touched (operator-managed in Stripe dashboard).
- ✅ Payment / checkout flow — not touched.
- ✅ `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js` — not touched.
- ✅ Phase 22A-P V3 baseline ($149 / $499 / $997 / Enterprise custom + $1,497 / $3,497 / $5,997 implementation) remains the published, authoritative pricing until owner approves Phase 25J §18 items.

## Stale pricing scan

| Pattern | Active UI hits | Notes |
|---|---|---|
| `$79` / `$349` / `$999` (V2 deprecated) | 0 in `sourcedeck.html` / `services/` / `scripts/` | Acceptable historical references remain in `docs/product/pricing-source-of-truth.md` §3 deprecation table, Phase 22A audit docs (historical record), Phase 25A site-PR audit doc. |
| V1 legacy `$49` / `$149` Price IDs | Server-side only (Stripe `STRIPE_PRICES_LEGACY`) | Not re-exposed in UI per pricing-source-of-truth §3. |
| `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` | 0 active | Phase 25A invariant preserved. |
| `Free demo` / `Try now` / `Download now` | 0 active | Phase 25C invariant preserved. |

## Safety / boundary confirmations

- ✅ Pricing source-of-truth unchanged. **No price changes implemented.**
- ✅ No website change. Site alignment runs in a future phase in `sourcedeck-site` repo.
- ✅ No Stripe / payment / checkout change.
- ✅ No public checkout introduced.
- ✅ No self-serve Enterprise signup introduced.
- ✅ No guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No compliance-certification claim introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing re-exposed.
- ✅ No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized claim introduced.
- ✅ `.env` not touched.
- ✅ Stashes untouched.
- ✅ No `.env` / `services/**` / `scripts/**` / `test/**` / `main.js` / `preload.js` / `sourcedeck.html` / `package.json` change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / `.qa/` / media committed.
- ✅ Request Access posture preserved (Phase 25C master delivery method intact).
- ✅ All Phase 24-series + Phase 25A/B/C/D + Phase 25E.1–25E.8 + Phase 25F + Phase 25H + Phase 25I invariants preserved.

## Owner decision required

Before any of the following can advance to a source-of-truth update:

1. Confirm Team 5 tier addition at $1,997/mo or $19,970/yr.
2. Confirm GovCon Operator repositioning from "up to 3 users" → "1–2 users."
3. Confirm Operator Plus repositioning from "up to 5 users" → "up to 3 users."
4. Confirm setup-fee schedule ($1,497 → $24,997+) is operator-managed only.
5. Confirm add-on user prices ($249 / $399) are operator-managed only.
6. Confirm add-on office price ($997/mo) is operator-managed only.
7. Confirm pilot-to-enterprise conversion offer requires ARCG-approval per deal.
8. Confirm `test/govcon-pricing-positioning.test.js` and Phase 22A audit doc references will be updated together in a follow-up phase.

See `phase-25j-enterprise-pricing-recommendation.md` §18 for full detail.

## Status

Unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

## Next operator action

Review the four Phase 25J docs:
1. `docs/product/phase-25j-enterprise-pricing-recommendation.md`
2. `docs/product/phase-25j-website-enterprise-pricing-alignment.md`
3. `docs/sales/phase-25j-enterprise-quote-sheet-draft.md`
4. `docs/product/phase-25j-enterprise-onboarding-support-matrix.md`

Decide whether to:
- Approve the recommendation as-is and authorize a follow-up phase to update the source-of-truth + the website + the Stripe Price IDs.
- Counter-propose specific numbers (e.g., Team 5 at a different anchor price).
- Defer the Team 5 public tier; ship the internal quote sheet only.
- Reject and stay on the current V3 baseline (Solo / Operator / Plus / Enterprise custom).

This phase ships docs only. The downstream phases require explicit owner approval.

---

## Signature

Phase 25J is a pricing strategy recommendation. The pricing source-of-truth is unchanged. The website is unchanged. The Stripe configuration is unchanged. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

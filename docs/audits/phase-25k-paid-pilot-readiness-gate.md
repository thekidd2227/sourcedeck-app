# Phase 25K — Paid Pilot Readiness Gate

**Date:** 2026-06-10
**Companion:** `phase-25k-website-app-parity-audit.md`, `phase-25k-paid-pilot-delivery-posture.md`.
**Status:** Gate — checklist that must pass before paid-pilot buyer onboarding begins.

---

## 1. Purpose

A binary checklist. Every box must be ✅ before the operator initiates outreach to a paying pilot buyer. If any box is ❌, the operator either fixes it (and re-runs the gate) or pauses paid-pilot outreach.

This gate is **separate** from the Phase 25B 7-day internal trial gate. The internal trial validated the product surface. This gate validates that the buyer-facing claims (website, sales material, contracts) match what ships on `main`.

## 2. Gate items

### 2.1 Pricing / config clean

| Check | Pass condition | Status (2026-06-10) |
|---|---|---|
| Website `pricing/index.html` matches V3 source-of-truth | Solo Capture $149 / GovCon Operator $499 / Operator Plus $997 / Enterprise custom | ✅ |
| Website `invoice/index.html` matches V3 | $499/mo or $4,990/yr; $997/mo or $9,970/yr | ✅ |
| Website `assets/sd-i18n-dict.js` matches V3 (EN + ES) | V3 amounts in both languages | ✅ |
| Website `assets/sd-config.js` Stripe IDs do not claim "LIVE pricing" at V2 | V2 IDs explicitly marked grandfathered server-side only; not "LIVE" | ❌ (Phase 25K site PR fixes) |
| Website `assets/social/capture.html` no V2 pricing in active markup | Replace `$79/$349/$999` with V3 | ❌ (Phase 25K site PR fixes) |
| App `docs/product/pricing-source-of-truth.md` unchanged in this phase | No edit | ✅ |

### 2.2 Compliance / security copy clean

| Check | Pass condition | Status (2026-06-10) |
|---|---|---|
| Website `security/index.html` posture (not SOC 2 / HIPAA / FedRAMP / ISO / CMMC / HITRUST certified) | One unified language | ✅ |
| Website `compliance/index.html` aligns with security/index.html | Same "not certified" voice; no "in progress" claims | ❌ (Phase 25K site PR fixes) |
| No "guaranteed award / guaranteed revenue" claim | Absent from both repos | ✅ |
| No "definitively FAR compliant" / "certified compliant" / "legally sufficient" claim | Absent from both repos | ✅ |

### 2.3 Website ↔ app feature parity

| Check | Pass condition | Status (2026-06-10) |
|---|---|---|
| Phase 25I (FAR Reference, AI FAQ, Compliance Review, Word/PDF export) is on `main` | `git log` shows Phase 25I merge into `main`; `test/phase-25i-*` exist | ❌ (Phase 25I merge mis-targeted; recovery phase needed) |
| No website copy claims FAR AI FAQ as shipped | Public site does not advertise FAR AI FAQ as available today | ⚠ Verify — the website does not currently market FAR features; safe today |
| No website copy claims Word/PDF export as shipped | Public site Proposal Workspace claim, if any, lists Markdown only | ⚠ Verify — the website does not currently market export formats |
| No public download CTA | Phase 25C invariant | ✅ |
| No free demo / try-now / get-started-free CTA | Phase 25C invariant | ✅ |
| Request Access posture preserved | `/request-access/`, `/quote/operator/`, `/quote/pro/` are the public CTAs | ✅ |

### 2.4 Delivery artifact named

| Check | Pass condition | Status |
|---|---|---|
| Paid-pilot delivery artifact is named in writing | One of: web/PWA pilot access, or controlled desktop RC pilot | ⚠ Documented in `phase-25k-paid-pilot-delivery-posture.md` (this phase). Operator chooses per-customer at qualification time. |
| Buyer sees a clear path | Buyer letter cites the chosen artifact + the Phase 25B trial framework | ⚠ Pending operator templating |
| No "public signed release" claim attached to the pilot | Phase 25A invariant | ✅ |

### 2.5 No unsupported public claims

| Check | Pass condition | Status |
|---|---|---|
| No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certified claim | Both repos clean | ✅ in app; ❌ in compliance/index.html ("SOC 2 Type II · in progress") |
| No Apple-notarized / signed-and-notarized / production-signed claim | Phase 25A invariant | ✅ |
| No guaranteed-award / guaranteed-revenue claim | Phase 25A invariant | ✅ |

### 2.6 No public checkout contradiction

| Check | Pass condition | Status |
|---|---|---|
| Public pricing page CTAs route to Request Access / quote, not direct Stripe Checkout | `pricing/index.html` CTAs route to `/quote/operator/`, `/quote/pro/` | ✅ |
| `assets/sd-config.js` does not expose V2 Stripe Price IDs as active selection | After Phase 25K fix: V2 IDs commented as grandfathered server-side | Currently ❌; fixed by Phase 25K |
| No "Buy now" / "Subscribe now" public button | Phase 25C invariant | ✅ |

### 2.7 No public download

| Check | Pass condition | Status |
|---|---|---|
| `/download/app/` and `/download/html/` routes remain unlinked from public nav | Phase 25C invariant | ✅ |
| No `Download now` / `Free download` CTA on `pricing/` or marketing landing | Phase 25C invariant | ✅ |
| Desktop ZIP package remains internal trial only | Phase 25C delivery boundary | ✅ |

### 2.8 Trial package regeneration sequencing

| Check | Pass condition | Status |
|---|---|---|
| Phase 25I recovery PR is merged | `main` contains the Phase 25I commit + tests | ❌ (separate recovery phase) |
| Phase 25K website fix PR is merged | Site `main` contains the Phase 25K commit | ❌ (this phase) |
| Phase 25K app docs PR is merged | App `main` contains this gate doc | ❌ (this phase) |
| After 1, 2, 3 are merged, **regenerate the Day 0 trial package** | `rm -rf dist && npm run pack:mac && bash ~/sd-day0-refresh.sh` | Pending |
| **Only after** the regeneration completes successfully, paid-pilot buyer outreach may begin | Buyer letter explicitly references the named delivery artifact + Phase 25B trial | Pending |

## 3. Current gate state

**❌ FAIL** as of 2026-06-10. Specifically:

- **Phase 25I is not on main.** Recovery phase required.
- **`compliance/index.html` overclaims "SOC 2 Type II · in progress" / "HIPAA BAA · in progress" / "FedRAMP-ready."** Phase 25K website PR fixes.
- **`assets/sd-config.js` describes V2 Stripe IDs as "LIVE pricing."** Phase 25K website PR fixes.
- **`assets/social/capture.html` displays V2 pricing in active markup.** Phase 25K website PR fixes.

After the Phase 25K + Phase 25I-recovery PRs land, every box above flips ✅ except 2.8 which requires the operator to run the trial-package regeneration on their Mac.

## 4. What this gate does NOT cover

- The Phase 25B 7-day internal trial gate. That validates the product surface end-to-end on the operator's machine. Run it independently.
- The pilot buyer qualification gate (Phase 25A pilot launch plan §4 Buyer Persona). That validates the buyer fit.
- The Phase 25J enterprise pricing recommendation owner-approval gate. That governs whether Team 5 / quote-sheet pricing becomes policy.

## 5. Sign-off

The operator initials this gate after every box is ✅ AND after the buyer letter cites the named delivery artifact + Phase 25B trial.

```
Operator: ____________________ Date: __________
ARCG countersign: ____________________ Date: __________
```

Without both signatures, **no paid-pilot buyer outreach may begin.**

---

## Signature

This is the canonical paid-pilot readiness gate. Today's state is **❌ FAIL** until the Phase 25K + Phase 25I-recovery PRs land and the operator regenerates the Day 0 trial package against the refreshed `main`.

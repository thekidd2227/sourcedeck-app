# SourceDeck Master Delivery Method

**Phase:** 25C — Master Delivery Method Finalization.
**Date:** 2026-06-09.
**Status:** READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD (unchanged from Phase 25A).

---

## 1. Official model

> **Website → Request Access → Manual Qualification → Approved Onboarding → Secure Web App / PWA Access**

This is the canonical mass-delivery path for SourceDeck. Every public-facing CTA, every buyer-facing artifact, and every operator script must conform to this model.

## 2. Channel matrix

| # | Channel | Status |
|---|---|---|
| 1 | **Public website (`sourcedeck.app`)** | The front door. Explains the product, the V3 pricing source-of-truth, the qualification posture, and the Request Access CTA. **No public download. No open app access.** |
| 2 | **Buyer access** | Request → ARCG/operator manually qualifies → approved buyer is onboarded manually → buyer receives controlled secure web app / PWA access. |
| 3 | **Secure web app / PWA** | **Default mass-delivery target.** Controlled access. No public anonymous usage. No open self-serve signup unless explicitly authorized in a future phase. Buyer may save to Dock / Home Screen where supported. |
| 4 | **Desktop installer** | **Optional future channel only.** Requires signed build + notarization + checksum + Gatekeeper assessment + release evidence. No public claim until the Phase 25F evidence binder is captured. |
| 5 | **Desktop ZIP** | **Internal testing only.** Buyer-style simulation only. **Not** mass delivery. **Not** public distribution. |

## 3. Approved buyer flow

1. Buyer visits `sourcedeck.app`.
2. Buyer selects **Request Access**.
3. Buyer submits inquiry (form → Basin → operator) or contacts ARCG directly.
4. ARCG/operator manually qualifies the buyer.
5. Buyer receives approved onboarding (operator-led kickoff per the Phase 25B trial framework).
6. Buyer receives controlled access to the SourceDeck secure web app / PWA.
7. Buyer can save the app to Dock / Home Screen where supported.
8. Buyer operates under the no-send / no-submit / no-upload boundaries (Phase 25A / Phase 25B).

## 4. Forbidden flow (FORBIDDEN)

> Website → Public Download ZIP → Run unsigned app publicly.

**FORBIDDEN.** Public download is forbidden. Free demo / try-now / download-now CTAs are forbidden. SourceDeck is not public self-serve. Unsigned Desktop ZIP must **never** be used as mass delivery.

## 5. Forbidden CTAs (verbatim)

The following CTAs are **forbidden** anywhere on the public website or in any buyer-facing artifact:

- ❌ `Free demo`
- ❌ `Try now`
- ❌ `Download now`
- ❌ `Download app`
- ❌ `Get started free`
- ❌ `Start free`
- ❌ `Free download`
- ❌ `Demo download`
- ❌ `Public download`
- ❌ `Self-serve signup`

Permitted CTAs:

- ✅ `Request Access`
- ✅ `Contact ARCG`
- ✅ `Request a Quote` (routes to `/quote/operator/` or `/quote/pro/`)
- ✅ `Schedule a Call` (routes to calendar booking)

## 6. Desktop ZIP boundary

The buyer-style Desktop ZIP package (Phase 25B-Day0B / Day0C) is **internal trial only**. It exists to let Jean-Max / ARCG run the 7-day internal burn-in under a simulated buyer-delivery feel.

- ❌ The ZIP is never sent to a buyer during this pilot phase.
- ❌ The ZIP is never posted to a public artifact registry, public S3, public GitHub Release, or any public mirror.
- ❌ The ZIP is never linked from `sourcedeck.app`.
- ❌ The ZIP does not appear in any sales material.
- ✅ The ZIP is built on the operator's Mac, lives only on the operator's Desktop, and is opened only by the operator.

## 7. Future signed installer path

When the operator pursues a public desktop installer channel, the following must be true **before** any public claim:

1. Apple Developer ID Application identity is provisioned (operator's Keychain only — never in this repo).
2. Apple notarization credentials (App-Specific Password trio OR Apple API Key trio) are present locally only.
3. `electron-builder` produces a signed `.app` and `.dmg`.
4. Apple notarization request is submitted and accepted.
5. Stapling is verified (`xcrun stapler validate`).
6. Gatekeeper assessment passes (`spctl --assess`).
7. SHA-256 checksum is captured.
8. Release evidence binder is updated (Phase 24N / Phase 25F).

Only after **all eight** items are true may the website say "signed and notarized" / "Apple notarized" / "production signed." Until then, the prohibition holds.

## 8. Boundary preservation

This document does **not** change pricing, payment flow, Stripe configuration, runtime behavior, signing posture, or any Phase 24 / Phase 25A / Phase 25B invariant. It is a delivery-method finalization document only.

---

## Signature

This is the canonical SourceDeck master delivery method as of Phase 25C. Future phases must conform to this model. Any deviation (public download, self-serve signup, unsigned ZIP as mass delivery, "Free demo" / "Try now" / "Download now" CTA) is a Phase 25C bounding-condition violation and requires Tier 2 escalation.

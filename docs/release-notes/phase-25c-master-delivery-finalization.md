# Phase 25C — Master Delivery Method Finalization

**Phase:** 25C — SourceDeck Master Delivery Method Finalization.
**Date:** 2026-06-09.
**Branch:** `docs/phase-25c-master-delivery-method`.
**Base:** `main @ 3920090` (post-PR #99 — Phase 25B 7-day internal trial).

---

## What this phase delivered

This is a **docs-only phase**. It finalizes and locks SourceDeck's official mass-delivery model.

**No runtime change.** **No website deploy.** **No public download.** **No public self-serve signup.** **No pricing change.** **No payment / Stripe change.** **No signed/notarized claim.** **No new buyer outreach.**

## The model (locked)

> **Website → Request Access → Manual Qualification → Approved Onboarding → Secure Web App / PWA Access**

| Channel | Status |
|---|---|
| Public website (`sourcedeck.app`) | Front door. Marketing + Request Access. No public download. |
| Buyer access | Manual qualification → manual onboarding → controlled access. |
| Secure web app / PWA | **Default mass-delivery target.** |
| Desktop installer | **Optional future channel.** Gated on the Phase 25F notarization evidence binder. |
| Desktop ZIP | **Internal trial only.** Never mass delivery. Never public distribution. |

## Docs added

| Doc | Role |
|---|---|
| `docs/product/phase-25c-master-delivery-method.md` | The official model, the channel matrix, the buyer flow, the forbidden flow, the forbidden CTAs, the Desktop ZIP boundary, the future signed-installer path. |
| `docs/audits/phase-25c-delivery-method-guardrail-audit.md` | Canonical greps for app + website repos. Acceptable-hit classes. App audit result (no blocker). Website audit result (no blocker; no edit required). Forbidden-CTA matrix. |
| `docs/product/phase-25c-secure-web-pwa-delivery-contract.md` | Delivery expectations, PWA specifics, onboarding, API key rules, no-public-anonymous-usage rule, no-public-self-serve-signup rule, audit log + internal-review posture, future engineering requirements. |
| `docs/product/phase-25c-desktop-delivery-boundary.md` | Desktop channel matrix, ZIP boundary, buyer-style ZIP boundary, unsigned dev/RC boundary, signed-installer 8-item gating requirements, repository hygiene. |
| `docs/release-notes/phase-25c-master-delivery-finalization.md` | This release note. |

## Website status

`thekidd2227/sourcedeck-site` `main @ 8a4a863` is **already aligned** with the Phase 25C master delivery method per the Phase 25C guardrail audit. Zero positive active hits for forbidden CTAs, deprecated pricing, unsupported certification claims, or signed-release claims in user-facing files. **No website edit required by this phase. No website PR opened.**

## Tests / gates

| Command | Result |
|---|---|
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/sam-opportunity-sprint.test.js` | ✅ 62/0 PASS |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/0 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `node scripts/release-check.js` | ✅ privacy clean; signing env MISSING (expected unsigned-dev posture) |

## Status (unchanged)

**READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD.**

Public signed release remains NO-GO until Phase 25F.

## Safety / boundary confirmations

- ✅ No runtime code changes.
- ✅ No website changes.
- ✅ No `.env` files touched.
- ✅ Stashes untouched.
- ✅ No secrets printed.
- ✅ No payment / Stripe / checkout changes.
- ✅ No outreach sent.
- ✅ No live SAM Sprint run.
- ✅ No public download CTA introduced.
- ✅ No "Free demo" / "Try now" / "Download now" / "Get started free" CTA introduced.
- ✅ No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / Apple-notarized / production-signed / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No build artifacts / dist / release / out / reports / media / `.qa/` output committed.
- ✅ No certificate / provisioning profile / private key committed.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.

## Next step

After this PR merges:

1. Continue the Phase 25B 7-day internal trial (Day 0 baseline complete; Day 1 onwards on operator's Mac).
2. A future phase enables the secure web app / PWA delivery channel per the contract in `docs/product/phase-25c-secure-web-pwa-delivery-contract.md`.
3. A future phase pursues the signed desktop installer per the 8-item gating requirements in `docs/product/phase-25c-desktop-delivery-boundary.md`.

---

## Signature

Phase 25C master delivery method is **finalized and locked**. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**. Mass delivery flows through the secure web app / PWA only. Desktop ZIP is internal-only.

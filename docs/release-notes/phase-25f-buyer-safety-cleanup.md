# Phase 25F — Buyer Safety Cleanup

**Phase:** 25F — Outreach Defaults + GovCon Section IA + Buyer-Safe Navigation Sentinel.
**Date:** 2026-06-09.
**Branch:** `fix/phase-25f-buyer-safety-cleanup`.
**Base:** `main @ 06d48f1` (post-PR #104 — Phase 25E.8 bundle-contents hotfix).
**Companion audit:** `docs/audits/phase-25f-buyer-safety-cleanup-audit.md`.
**Companion IA:** `docs/product/phase-25f-govcon-information-architecture.md`.

---

## What this phase delivered

Day 0 GUI testing of the freshly rebuilt Phase 25E bundle surfaced four buyer-facing issues. Phase 25F resolves them:

1. **Outreach pane is blank on cold open.** Three input placeholders are now neutral (no operator-vertical hints). 18 hardcoded Outreach sample rows are hidden by default; the GovCon Demo Mode toggle reveals/hides them in unison with its banner.
2. **GovCon Pipeline empty-state retired the Airtable copy.** "Loading GovCon opportunities from Airtable..." is replaced with "No GovCon opportunities loaded yet. Configure your profile or run an approved opportunity search."
3. **GovCon pane has in-pane section navigation.** Sticky pill-bar with 7 anchor pills at the top of the GovCon pane. Smooth-scrolls to each canonical section without a structural rebuild.
4. **Buyer-safe navigation sentinel.** New `phase-25f-buyer-safe-navigation.test.js` pins Clinical/EHR hidden by default, Help/FAQ always-on, approved gold mark present, and every Phase 25A/C invariant (no Send/Submit/Upload control, no public-download CTA, no certification claim, no deprecated pricing) so they can't regress.

## Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | Outreach NAICS/keywords/place placeholders neutralized; 18 sample rows hidden via inline `display:none`; GovCon empty-state copy rewritten; sticky pill-bar nav added at top of GovCon pane; `gcScrollTo()` smooth-scroll handler added; `gcSetSampleRowVisibility()` helper added and wired into `gcDemoLoadSample()` / `gcDemoClearSample()` / `init()`. |
| `package.json` | Three new sentinels wired into `scripts.test`. |
| `test/phase-25f-outreach-defaults-clean.test.js` (new) | 7 assertions. |
| `test/phase-25f-govcon-sections.test.js` (new) | 5 assertions. |
| `test/phase-25f-buyer-safe-navigation.test.js` (new) | 8 assertions. |
| `docs/audits/phase-25f-buyer-safety-cleanup-audit.md` (new) | Full audit. |
| `docs/product/phase-25f-govcon-information-architecture.md` (new) | IA spec. |
| `docs/release-notes/phase-25f-buyer-safety-cleanup.md` (new) | This release note. |

## Tests / gates

| Command | Result |
|---|---|
| 3 Phase 25F sentinels (20 assertions) | ✅ all PASS |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy clean; signing env MISSING (expected) |
| `first-run-safety.test.js` | ✅ 7/7 — white-label invariant preserved |
| `govcon-primary-navigation.test.js` | ✅ 23/23 — Phase 23C nav invariant preserved |
| `renderer-boot.test.js` | ✅ 7/7 |
| `sourcedeck-logo-standardization.test.js` | ✅ 8/8 |

## Safety / boundary confirmations

- ✅ No tabs/panes removed from DOM.
- ✅ No `data-tab` IDs renamed.
- ✅ No `<section>` IDs renamed.
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / portal-upload control introduced.
- ✅ No signed/notarized / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying email or string in the renderer.
- ✅ No `.env` change. Stashes untouched.
- ✅ No payment / Stripe / checkout change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / media / `.qa/` committed.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method preserved.
- ✅ Phase 25D approved brand mark preserved.
- ✅ Phase 25E.1 – 25E.8 invariants preserved.

## Status

Unchanged from Phase 25A: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**. Phase 25C delivery model preserved.

## Next operator action after merge

```sh
cd ~/sourcedeck-app
git checkout main && git pull origin main
rm -rf dist
npm run pack:mac
bash ~/sd-day0-refresh.sh
```

The new bundle will boot with the clean Outreach pane, the sticky GovCon section nav, and the buyer-safe navigation sentinel actively guarding the boundary. Restart Day 0 GUI checks against the refreshed bundle.

---

## Signature

Phase 25F closes the buyer-safety gaps surfaced during Day 0 GUI testing. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

# Phase 25E.1 — Buyer Nav Default Collapsed + Logo Sentinel

**Phase:** 25E.1 — Buyer Nav Default Collapsed + Phase 25D Logo Sentinel Backfill.
**Date:** 2026-06-09.
**Branch:** `feat/phase-25e1-buyer-nav-default-collapsed`.
**Base:** `main @ 7b0695e` (post-PR #101 — Phase 25D).

---

## What this phase delivered

A tight, reversible buyer-nav cleanup plus the missing Phase 25D sentinel test:

1. **"Other business tools" defaults to collapsed.** On cold open, the renderer presents only the GovCon Capture OS nav section. Operators reveal the 17 commercial-mode tabs with one click on **Other business tools — Hidden**. All tabs and panels remain in the DOM and remain functional.
2. **Phase 25D logo sentinel test backfilled.** `test/sourcedeck-logo-standardization.test.js` (8 assertions) guards the approved gold geometric SourceDeck mark against regression to the old `S` fallback or the deprecated `sourcedeck-logo.png` reference.

This is Phase 25E sub-phase 1 of 7. The remaining 6 sub-phases (Proposal Workspace rebuild, Airtable removal, Help/FAQ + manual, Pilot Tracker, Daily Ops PROD cleanup, Lead workspace merge) each get their own focused PR — keeping reviewability, testability, and rollback simple.

## Files changed

| File | Lines | Change |
|---|---|---|
| `sourcedeck.html` | 3 | `data-tools-collapsed` default flipped to `true`; state label swapped to `Hidden`; `applyState(false)` → `applyState(true)` on cold-open initializer. |
| `test/sourcedeck-logo-standardization.test.js` (new) | ~95 | 8-assertion sentinel — approved mark present, deprecated PNG absent, `textContent='S'` absent, topbar `.logo-mark` img is the approved mark, CSS uses `object-fit:contain`. |
| `package.json` | 1 | New sentinel wired into `scripts.test` after `setup-wizard-first-run.test.js`. |
| `docs/audits/phase-25e1-buyer-nav-default-collapsed-audit.md` (new) | — | Full audit. |
| `docs/release-notes/phase-25e1-buyer-nav-default-collapsed.md` (new) | — | This release note. |

## Stale-bundle clarification

The Phase 25E mission cited "old `S` logo still visible" and "System Flow still in navigation" complaints. Verification on current main shows both are already fixed at the source level (Phase 25D for the logo; Phase 24A for System Flow removal — guarded by `remove-system-readiness-tab.test.js`). The screenshots referenced a stale `dist/mac/SourceDeck.app` bundle built before Phase 25D #101 merged. To see the corrected renderer on the operator's Mac:

```sh
cd ~/sourcedeck-app
rm -rf dist
npm run pack:mac
# then re-run the Day 0 refresh script
bash ~/sd-day0-refresh.sh
```

The new bundle picks up Phase 25D's `sourcedeck-mark.svg` reference at `sourcedeck.html:744`.

## Test / gate results

| Command | Result |
|---|---|
| `node test/sourcedeck-logo-standardization.test.js` (new) | ✅ PASS 8/8 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `node scripts/release-check.js` | ✅ privacy clean; signing env MISSING (expected unsigned-dev posture) |

## Safety / boundary confirmations

- ✅ No tab/panel removed from the DOM (Phase 23C invariant: every commercial tab + pane remains; toggle hides via `display:none` only).
- ✅ No nav button renamed.
- ✅ No `data-tab` ID added or renamed.
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / portal-upload control introduced.
- ✅ No `signed and notarized` / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No `.env` change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No payment / Stripe / checkout change.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `.qa/` / `reports/` / media committed.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method invariants preserved.
- ✅ Phase 25D approved brand mark preserved (now guarded by sentinel).

## Status

Unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

## Next step

Operator rebuilds the Mac bundle (`rm -rf dist && npm run pack:mac`) and re-runs the Day 0 refresh script. Subsequent Phase 25E sub-phases (25E.2 onwards) follow as separate PRs per the decomposition table in the audit doc.

---

## Signature

Phase 25E.1 ships the smallest, lowest-risk buyer-nav cleanup and backfills the Phase 25D logo sentinel. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

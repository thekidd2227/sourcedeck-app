# Phase 25F — Buyer Safety Cleanup Audit

**Date:** 2026-06-09
**Repo:** `thekidd2227/sourcedeck-app`
**Branch:** `fix/phase-25f-buyer-safety-cleanup`
**Base:** `main @ 06d48f1` (post-PR #104 — Phase 25E.8 bundle-contents hotfix).

---

## 1. Why this phase

Day 0 GUI testing of the freshly rebuilt Phase 25E bundle surfaced buyer-facing privacy and product issues on cold open:

- **Outreach inputs prefilled** with operator-flavored placeholder text: `561710 561720`, `janitorial, pest`, `MD or 20782` — readable as if they were the buyer's own settings.
- **Outreach sample rows auto-rendered** on every cold open regardless of the GovCon Demo Mode toggle — 18 hardcoded `data-or-source="sample"` rows under "Pre-RFP Intelligence," "Agency Targeting Insights," and other Outreach-pane sections.
- **GovCon Pipeline empty state read "Loading GovCon opportunities from Airtable..."** — implies Airtable is a required dependency, which contradicts Phase 25E.3's "Airtable is optional legacy integration" posture.
- **GovCon pane is long** — buyer scrolls through a single workspace with no in-pane navigation.

The original Phase 25E mission deferred these surfaces to a future phase. Phase 25F closes the gap.

## 2. Scope

| # | Concern | Resolution |
|---|---|---|
| 1 | Outreach NAICS placeholder `561710 561720` | → `NAICS codes (e.g. 541330)` |
| 2 | Outreach keywords placeholder `janitorial, pest` | → `keywords (e.g. facility services)` |
| 3 | Outreach place-of-performance placeholder `MD or 20782` | → `state or ZIP` |
| 4 | 18 Outreach sample rows auto-rendered | Hidden by default via inline `style="display:none"` + `data-phase-25f="sample-hidden-by-default"` marker; visibility now toggles in unison with `gcDemoLoadSample()` / `gcDemoClearSample()` |
| 5 | GovCon Pipeline empty state "Loading GovCon opportunities from Airtable..." | → "No GovCon opportunities loaded yet. Configure your profile or run an approved opportunity search." |
| 6 | GovCon pane has no in-pane section navigation | Added sticky pill-bar at top of GovCon pane with 7 anchor pills routing via `gcScrollTo()` smooth-scroll |
| 7 | Clinical / EHR visibility | Verified: `nav-capabilities` already ships `style="display:none"` (Phase 24E invariant). Backstopped by Phase 25F sentinel. |
| 8 | System Flow visibility | Verified: `data-tab="sysflow"` absent (Phase 24A removal preserved). Backstopped by `remove-system-readiness-tab.test.js`. |

## 3. What was REMOVED from buyer-visible markup

| Surface | Pre-Phase-25F | Post-Phase-25F |
|---|---|---|
| Outreach NAICS input | `placeholder="561710 561720"` | `placeholder="NAICS codes (e.g. 541330)"` |
| Outreach keywords input | `placeholder="janitorial, pest"` | `placeholder="keywords (e.g. facility services)"` |
| Outreach place-of-performance input | `placeholder="MD or 20782"` | `placeholder="state or ZIP"` |
| GovCon Pipeline empty-state copy | "Loading GovCon opportunities from Airtable..." | "No GovCon opportunities loaded yet. Configure your profile or run an approved opportunity search." |
| 18 Outreach sample rows | Auto-rendered on every cold open | Hidden by default; only revealed when the operator explicitly loads demo data via the GovCon Demo Mode toggle |

## 4. What was ADDED

| Surface | Description |
|---|---|
| GovCon section nav (`<nav id="gc-section-nav">`) | Sticky pill-bar at the top of the GovCon pane (`position:sticky;top:0`). 7 pills route via `href="#…"` + `onclick="gcScrollTo(event, '…')"` to: Overview · Operating Rhythm · Solicitation · Vendor & Pricing · Past Performance · Capability · Prime · Submission Readiness · Audit Log. Each pill anchors to an existing `<section>` already in the DOM (Phase 22–24 sections preserved). |
| `gcScrollTo(ev, targetId)` global handler | Smooth-scrolls to the target section. Updates active-pill styling so the buyer sees which section they're on. Pure browser code — `scrollIntoView({behavior:'smooth'})`. No `fetch()`. No `XMLHttpRequest`. |
| `gcSetSampleRowVisibility(visible)` helper | New helper in the Phase 23A GovCon Demo Mode script. Toggles `display` on every `[data-phase-25f="sample-hidden-by-default"]` row in unison. Invoked from `gcDemoLoadSample()` (reveal), `gcDemoClearSample()` (hide), and the cold-open `init()` (sync with persisted demo flag). |

## 5. Sentinel tests added

| Test | Assertions | Role |
|---|---|---|
| `test/phase-25f-outreach-defaults-clean.test.js` | 7 | All 3 input placeholders are neutral; all 18 sample rows carry the Phase 25F marker + inline `display:none`; demo toggle wires the helper; GovCon Pipeline empty state retired the Airtable copy. Defense-in-depth: every `gc-or-row[data-or-source="sample"]` must carry the marker (catches a future contributor adding a new sample row that auto-renders). |
| `test/phase-25f-govcon-sections.test.js` | 5 | Section nav exists in the GovCon pane; all 7 canonical pills are present; every pill target exists as a `<section>`; `gcScrollTo()` is defined globally; no `fetch`/`XMLHttpRequest` in the handler. |
| `test/phase-25f-buyer-safe-navigation.test.js` | 8 | Clinical/EHR stays `display:none`; Help/FAQ always-on; approved gold mark present; no old "S" fallback; no public-download/free-demo/try-now/get-started-free CTA; no Send Email/Submit Bid/Submit Quote/portal-upload control; no signed-notarized/FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO 27001/guaranteed-award/guaranteed-revenue claim; no deprecated `$79`/`$349`/`$999` pricing. |

## 6. Test / gate results

| Command | Result |
|---|---|
| `node test/phase-25f-outreach-defaults-clean.test.js` (new) | ✅ PASS 7/7 |
| `node test/phase-25f-govcon-sections.test.js` (new) | ✅ PASS 5/5 |
| `node test/phase-25f-buyer-safe-navigation.test.js` (new) | ✅ PASS 8/8 |
| `node test/sourcedeck-logo-standardization.test.js` | ✅ PASS 8/8 |
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/sam-opportunity-sprint.test.js` | ✅ 62/0 PASS |
| `node test/first-run-safety.test.js` | ✅ PASS 7/7 (white-label invariant preserved) |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected) |

## 7. Safety scan result

Per Phase 25F mission Step 10. Zero positive active-UI hits for:

- `Loading GovCon opportunities from Airtable` — retired.
- `placeholder="561710 561720"` / `placeholder="janitorial, pest"` / `placeholder="MD or 20782"` — retired.
- `Free demo` / `Download now` / `Try now` / `Start free` / `Get started free` — verified absent (Phase 25C invariant).
- `Submit Bid` / `Submit Quote` / `Send Email` / `Export and submit` / portal-upload — verified absent (Phase 25A invariant).
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — verified absent (Phase 25A invariant).
- `$79` / `$349` / `$999` — verified absent in active app UI (Phase 22A-P V3 source-of-truth preserved).

Acceptable hits remain inside Phase 25F sentinel tests (negative assertions), Phase 25C delivery boundary docs, and the docs/manuals/4th-grade manual (boundary recitation).

## 8. Boundary preservation

- ✅ No tabs/panes removed from DOM.
- ✅ No `data-tab` IDs renamed.
- ✅ No nav buttons renamed.
- ✅ No `<section>` IDs renamed (all 7 section nav targets pre-existed).
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / portal-upload control introduced.
- ✅ No signed/notarized / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying email or string in the renderer (`first-run-safety.test.js` 7/7 preserved).
- ✅ No `.env` change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change (other than `release-check.js` already covered in Phase 25E.8).
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No payment / Stripe / checkout change.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / `.qa/` / media committed.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method preserved.
- ✅ Phase 25D approved brand mark preserved.
- ✅ Phase 25E.1 – 25E.8 invariants preserved.

## 9. Status

Unchanged from Phase 25A: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

---

## Signature

Phase 25F closes the buyer-safety gaps surfaced during Day 0 GUI testing of the Phase 25E bundle. The Outreach pane is now blank on cold open, the GovCon pane has in-pane section navigation, and the buyer-facing safety invariants are now backstopped by 20 new sentinel assertions.

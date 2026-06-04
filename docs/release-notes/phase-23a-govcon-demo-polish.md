# Release Note — Phase 23A GovCon Demo Polish

**Branch:** `feat/phase-23a-govcon-demo-polish`
**Base:** `main @ 842bb52` (post-PR #66 — Phase 22G GovCon buyer demo QA + sellability audit merged).
**Posture:** Buyer-demo polish. No new feature surfaces. **Sample data is clearly labeled SAMPLE / DEMO ONLY and never implies real agency, vendor, CPARS, award, submission status, or solicitation data.** SourceDeck does not submit bids, quotes, or government responses. No portal upload. No email transmission. Operator must clear sample data and replace with their own before any proposal use.

---

## Summary

Closes five demo-perception gaps identified in the Phase 22G audit (`docs/audits/phase-22g-govcon-buyer-demo-qa.md` §2.10) without changing the Phase 22 safety posture:

1. **Demo Mode / Sample Data Loader** — explicit `Load Sample GovCon Demo Data` and `Clear Sample Demo Data` controls at the top of `tab-govcon`. Activates a warn-tinted banner: *"SAMPLE DEMO DATA — Replace before proposal use."* Sample data writes to the existing Phase 22B-22F localStorage keys with redactable placeholder values. Every sample row visibly carries `SAMPLE`, `Demo only`, or `Replace before proposal use`.
2. **Duplicate Vendor Needs card disambiguated** — Phase 22B Capture Command Center card relabeled to **`Vendor Needs (capture board)`** with copy that explicitly points to the Phase 22D Vendor Quote Room below for detailed quote rows.
3. **Stale Phase 22C placeholder toast fixed** — `gcCaptureSolicitationPlaceholder()` now emits *"Open the Solicitation Workspace below to extract instructions, requirements, deadlines, risks, and a compliance matrix."* and smoothly scrolls into view.
4. **Submission Readiness empty state polished** — default score `0%` → `—%`; default status `Not Ready` → `No package started`; new `isUntouched()` branch in `renderSummary()` keeps the polished defaults until the operator interacts. Phase 22F scoring rules unchanged once any item is touched.
5. **Structured CPARS rating dropdown** — new `Not entered` / `Exceptional` / `Very Good` / `Satisfactory` / `Marginal` / `Unsatisfactory` select on Past Performance, persisted as `cparsRating` on each record. Existing free-text CPARS notes textarea preserved.

---

## What changed

### Renderer

- `sourcedeck.html`:
  - New `<section id="gc-demo-mode" data-section="govcon-demo-mode">` block at the top of `tab-govcon`.
  - Phase 22B Vendor Needs card label and empty-state copy updated.
  - Stale Phase 22C placeholder toast replaced; smooth scroll-into-view added.
  - Submission Readiness HTML defaults changed to `—%` / `No package started`.
  - New `isUntouched()` helper + branch inside `renderSummary()` (Phase 22F renderer).
  - Past Performance form gains a structured `gc-pp-f-cpars-rating` select; `gcPpAddRecord()` persists `cparsRating`.
  - New inline `<script>` block implementing `gcDemoLoadSample`, `gcDemoClearSample`, 7 sample-data builders, banner toggle, and re-render dispatch into the existing Phase 22B-22F renderers.

### Tests

- `test/govcon-demo-polish.test.js` — 27 static + VM-based assertions covering: Demo Mode + Load Sample + Clear Sample controls, banner copy, every sample builder carries SAMPLE / Demo only / Replace labels, sample data does not imply real submitted/completed/awarded status (final-approval row pinned to `Not started`), Phase 22B Vendor Needs card disambiguated, stale Phase 22C toast gone, current Solicitation Workspace open copy present, Submission Readiness `—%` / `No package started` defaults, structured CPARS rating dropdown, no Send Email / Submit Bid / Submit Quote buttons, no auto-send / auto-submit / Export-and-submit / fake submitted-status, System Readiness/Flow remains removed, Phase 22B/22C/22D/22E/22F all preserved, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, every inline `<script>` block still parses, `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.
- `test/govcon-submission-readiness.test.js` — tests #2 and #3 widened to accept either the Phase 22F baseline (`0%` / `Not Ready`) OR the Phase 23A polish (`—%` / `No package started`). Phase 22F count remains **30/30**. Net: 0 new assertions, 0 removed, 2 widened regex patterns.

### Docs

- `docs/audits/phase-23a-govcon-demo-polish-audit.md` — audit, sample data safety contract, safety/non-claims block, Phase 23B deferral list.
- `docs/release-notes/phase-23a-govcon-demo-polish.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-demo-polish.test.js`. No new dependency. No build script change.

---

## What did NOT change

- **No new feature surfaces.** All Phase 22 surfaces preserved verbatim except the targeted polish edits documented above.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.** No new IPC bridge. No new dependency.
- **No live SAM call.** Sample data is constructed entirely in-renderer with hardcoded placeholder strings.
- **No bid / quote / government-response submission.**
- **No portal upload. No email transmission.**
- **No auto-send / no auto-submit. No `auto_send:true`. No `auto_submit:true`.**
- **No fake submitted / completed / awarded status.** Sample submission state pins `final_human_approval_recorded` to `Not started`, so the surface cannot display `Ready for Human Review` from sample data alone.
- **No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim added.**
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID. No `assets/sd-config.js` (site repo) touched.
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **System Readiness / System Flow tab remains removed.**
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.**
- **Phase 20G `.btn-gold` guard preserved.**

---

## Tests run / results — all green

- `node test/govcon-demo-polish.test.js` — **27/27 PASS**
- `node test/govcon-submission-readiness.test.js` — **30/30 PASS** (Phase 22F preserved with widened defaults regex)
- `node test/govcon-past-performance-prime.test.js` — **24/24 PASS**
- `node test/govcon-vendor-pricing.test.js` — **25/25 PASS**
- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS**
- `node test/govcon-capture-command-center.test.js` — **15/15 PASS**
- `node test/remove-system-readiness-tab.test.js` — **9/9 PASS**
- `node test/renderer-boot.test.js` — **7/7 PASS**
- `node test/response-desk-email-import.test.js` — **20/20 PASS**
- `node test/response-desk.test.js` — **24/24 PASS**
- `node test/default-state-policy.test.js` — **22/22 PASS**
- `node test/sam-opportunity-sprint.test.js` — PASS
- `node test/troubleshooting-agent.test.js` — **95/95 PASS**
- `npm test` — all suites PASS
- `npm run release:evidence` — state `packaged_unsigned`
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## Rollback

Additive. Revert this PR's single commit to roll back. Phases 22B-22F and 22G remain intact on `main`. No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Remaining Phase 23B items

- **23B-A** GovCon Mode primary-nav demotion of Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Create Lead / Daily Ops / Delivery behind a Show all toggle.
- **23B-B** Signed-build demo path so the troubleshooting tour doesn't expose `code object is not signed at all`.
- **23B-C** Local-only "Export as Markdown" download wired to the Phase 22F Export Placeholder action.
- **23B-D** "Last updated" timestamps per phase section.

All four remain compatible with the Phase 22 safety posture: no auto-send, no auto-submit, no portal upload, no email transmission, no compliance certification claim.

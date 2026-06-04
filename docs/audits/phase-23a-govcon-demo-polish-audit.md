# Phase 23A — GovCon Demo Polish — Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-23a-govcon-demo-polish`
**Base:** `main @ 842bb52` (post-PR #66 — Phase 22G buyer demo QA + sellability audit merged).
**Scope:** Buyer-demo polish only. Implements items 1, 2, 5, 6, 7 from Phase 22G `docs/audits/phase-22g-govcon-buyer-demo-qa.md` §2.10 priority list.
**Posture:** No new feature surfaces. No safety-posture changes. **Sample data is clearly labeled SAMPLE / DEMO ONLY and never implies real agency, vendor, CPARS, award, submission status, or solicitation data.** SourceDeck does not submit bids, quotes, or government responses. No portal upload. No email transmission. The operator must clear sample data and replace with their own before any proposal use.

---

## 0. Purpose

Phase 22G found the Phase 22 GovCon workflow structurally complete but with five demo-perception gaps that hurt sellability:

1. **Empty-everywhere first impression** — all six surfaces blank on cold open.
2. **Duplicate "Vendor / Subcontractor Needs" stat card** in Phase 22B Capture Command Center vs. Phase 22D Vendor Quote Room.
3. **`Solicitation Workspace placeholder — Phase 22C ships the full surface`** toast that lies on `main` now (Phase 22C has shipped).
4. **Submission Readiness score reading `0%` / `Not Ready` on cold open** before the operator has touched anything — looks like a failed score.
5. **CPARS captured only as free-text notes** — no structured rating dropdown for buyers expecting a 1–5 / Exceptional-to-Unsatisfactory rating.

Phase 23A closes all five gaps without changing the safety posture.

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — Phase 22B-22F GovCon surfaces. Edited only to: insert the new Phase 23A Demo Mode block at the top of `tab-govcon` (immediately after the existing Outreach OS helper), rename the Phase 22B Vendor card label, fix the stale Phase 22C placeholder toast, change the Submission Readiness score default + add an `isUntouched()` empty-state branch, and add the structured CPARS rating dropdown to the Past Performance form. No other surface modified.
- `docs/audits/phase-22g-govcon-buyer-demo-qa.md` — source of truth for Phase 23A scope.
- `docs/demo/phase-22g-govcon-buyer-demo-script.md` — verified the demo script remains accurate after the polish.
- All Phase 22 service modules (`services/govcon/**`, `services/response-desk.js`, `services/default-state-policy.js`) — **not edited**. Their guards continue to pass.

### 1.2 What was deliberately not done

- **No GovCon Mode primary-nav demotion** of Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Create Lead / Daily Ops / Delivery. The Phase 22A audit called for this but the task spec for Phase 23A explicitly defers it to Phase 23B if the change risks breaking navigation. Documented as Phase 23B-A below.
- **No signed-demo-build path.** Documented as Phase 23B-B.
- **No local-only Markdown export.** Documented as Phase 23B-C.
- **No "Last updated" timestamps per phase section.** Documented as Phase 23B-D.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `.env*`, `.gitignore`, `reports/`.**
- **No new dependency, no new IPC bridge.**
- **No pricing change. No compliance certification claim.** No `watsonx-live`. No `signed-and-notarized`. No guaranteed contract / award / revenue / ROI / unlimited-AI claim.

---

## 2. What was built

### 2.1 Renderer change — `sourcedeck.html`

Six minimal edits:

1. **Demo Mode block** (new `<section id="gc-demo-mode" data-section="govcon-demo-mode">`) inserted between the existing GovCon Outreach OS helper and the Phase 22B Capture Command Center. Carries:
   - A "GovCon Mode · Demo Controls" header.
   - A live status line (`#gc-demo-state`): "Demo data not loaded. Working with operator-entered data only." when inactive; "SAMPLE DEMO DATA loaded. Every row is operator-loaded SAMPLE / DEMO ONLY data. Clear before proposal use." when active.
   - `Load Sample GovCon Demo Data` button (`#gc-demo-load-btn`) → `gcDemoLoadSample()`.
   - `Clear Sample Demo Data` button (`#gc-demo-clear-btn`) → `gcDemoClearSample()`.
   - A hidden warn-tinted banner (`#gc-demo-banner`, default `hidden`) that surfaces when demo data is loaded: *"SAMPLE DEMO DATA — Replace before proposal use. The GovCon workspace below is currently populated with operator-loaded SAMPLE / DEMO ONLY data. No row reflects a real agency, real solicitation, real vendor, real CPARS rating, real submission status, or real award. SourceDeck does not submit bids, quotes, or government responses. The user must clear sample data and replace with their own before any proposal use."*
   - A safety microcopy footer.

2. **Phase 22B Vendor card disambiguation** — label changed from `Vendor / Subcontractor Needs` to **`Vendor Needs (capture board)`** and empty-state copy updated to *"Capture-board count of opportunities flagged as needing a vendor or subcontractor. Detailed vendor quote rows live in the Vendor Quote Room below. Vendor outreach requires human approval."* This makes the difference between the Phase 22B capture-board count (operator-flagged opportunities) and the Phase 22D Vendor Quote Room (detailed quote rows) explicit.

3. **Stale Phase 22C placeholder toast fix** — `gcCaptureSolicitationPlaceholder()` previously emitted `'Solicitation Workspace placeholder — Phase 22C ships the full surface.'` That copy was true while Phase 22C was in flight and lies on `main` now. Replaced with **`'Open the Solicitation Workspace below to extract instructions, requirements, deadlines, risks, and a compliance matrix.'`** plus a smooth scroll-into-view of `#gc-sol-workspace`.

4. **Submission Readiness empty-state polish:**
   - HTML default for `#gc-sub-score` changed from `0%` → `—%`.
   - HTML default for `#gc-sub-status` changed from `Not Ready` → `No package started`.
   - `renderSummary(state)` now calls a new `isUntouched(state)` helper. When every checklist item is `Not started` AND every notes field is empty, the renderer displays `—%` / `No package started`. As soon as the operator touches anything, the renderer reverts to the Phase 22F scoring rules (`Reviewed=1.0 / In progress=0.5 / Not started=0 / Blocked=0+forces Not Ready`; `Ready for Human Review` requires every required item Reviewed AND `final_human_approval_recorded=Reviewed`). The cold-open looked like a failed score; now it doesn't.

5. **Structured CPARS rating dropdown** added to the Past Performance intake form:
   - New `<select id="gc-pp-f-cpars-rating">` with options: `Not entered` (default) / `Exceptional` / `Very Good` / `Satisfactory` / `Marginal` / `Unsatisfactory`. The existing free-text CPARS notes textarea is preserved.
   - `gcPpAddRecord()` persists `cparsRating` on the record alongside the existing `cpars` notes.

6. **New inline `<script>` block** appended at end of file implements `gcDemoLoadSample`, `gcDemoClearSample`, sample data builders (`buildSampleCaptureBoard`, `buildSampleSolWorkspace`, `buildSampleVendorQuotes`, `buildSamplePastPerformance`, `buildSamplePrimePartners`, `buildSampleCapabilityStatement`, `buildSampleSubmissionState`), banner toggling, and re-render dispatch into the existing Phase 22B-22F renderers (`gcCaptureRender`, `gcSolRender`, `gcVendorPricingRender`, `gcPePerformanceRender`, `gcSubRender`). State is local-only via `window.localStorage` under the existing Phase 22B-22F keys plus a new `sd.govcon.demoMode.v1` flag.

### 2.2 Sample data safety contract

Every sample row written by the demo loader carries at least one of `SAMPLE` / `Demo only` / `Replace before proposal use` in its visible text fields. Specifically:

| Sample target | Visible labels in payload |
|---|---|
| Capture Board opportunity | title: *"SAMPLE — Demo Only Opportunity (Replace before proposal use)"*; agency: *"Sample Agency (Demo Only)"*; setAside: *"Demo only"*; notes: *"SAMPLE / DEMO ONLY — Replace before proposal use. Not a real opportunity."* |
| Solicitation Workspace summary | *"SAMPLE solicitation summary — Demo only. Replace before proposal use. Not a real solicitation excerpt."* |
| Solicitation Workspace lines | Every Section L / M / PWS / Forms / Deadlines / Risks line prefixed with `(Sample — Demo only)` |
| Compliance matrix rows | Requirement text starts with `SAMPLE — Demo only:` ; status `Draft — Not Reviewed` for all rows; notes: `Sample — Demo only` |
| Vendor Quote row | vendor: *"Sample Vendor LLC (Demo Only)"*; contact: *"Sample Contact (Demo Only)"*; email: `operator-replace-before-use@example.invalid`; status: `Requested manually`; certNotes: *"SAMPLE / DEMO ONLY — verify all certifications against vendor source before proposal use."* |
| Past Performance record | title: *"SAMPLE Past Performance Project — Demo Only"*; agency: *"Sample Agency (Demo Only)"*; cparsRating: `Not entered`; cpars notes: *"SAMPLE / DEMO ONLY — operator must verify CPARS rating against source before proposal use."* |
| Prime Partner row | prime: *"Sample Prime Co. (Demo Only)"*; status: `Research`; contactNotes: *"SAMPLE — SourceDeck does not send partner outreach. Demo only."* |
| Capability Statement state | agency: *"Sample Agency (Demo Only)"*; sol: `SAMPLE-SOL-DEMO-0001`; core/diff capabilities marked `(demo only)` |
| Submission Readiness state | Partial: a few items `Reviewed` or `In progress`; **`final_human_approval_recorded` stays `Not started`** so the surface CANNOT show `Ready for Human Review`. Notes are prefixed with `SAMPLE — Demo only`. |

The sample data **never** implies:

- a real agency, real solicitation number, real PWS, real CPARS rating, or real vendor;
- a `Ready for Human Review` submission status (final approval row pinned to `Not started`);
- a `submitted` / `awarded` / `completed` flag of any kind (none exist in the schema; test #5 enforces);
- a positive FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / watsonx-live / signed-and-notarized claim (test #17 enforces).

### 2.3 Test added — `test/govcon-demo-polish.test.js`

27 static + VM-based assertions; never executes app code or touches the network. Wired into `npm test` after `govcon-submission-readiness.test.js`.

### 2.4 Test updated — `test/govcon-submission-readiness.test.js`

Tests #2 and #3 (Submission Readiness defaults) widened to accept either the Phase 22F baseline (`0%` / `Not Ready`) OR the Phase 23A polish (`—%` / `No package started`). Documents the polish in the test rationale. **Net change: 0 new assertions, 0 removed assertions, 2 widened regex patterns.** Phase 22F test count remains 30/30.

### 2.5 Package wiring — `package.json`

`test` script chain appends `node test/govcon-demo-polish.test.js`. No new dependency. No build script change.

### 2.6 Docs added

- `docs/audits/phase-23a-govcon-demo-polish-audit.md` (this file).
- `docs/release-notes/phase-23a-govcon-demo-polish.md`.

---

## 3. Safety / non-claims

- **No live SAM call.** Sample data is constructed entirely in-renderer with hardcoded placeholder strings.
- **No bid / quote / government-response submission.** No connection wired anywhere.
- **No portal upload.** No SAM / PIEE / eBuy / GSA / agency-portal interaction.
- **No email transmission.** The sample vendor email field literally writes `operator-replace-before-use@example.invalid` so there is no real address even in the sample payload.
- **No auto-send / no auto-submit.** No `auto_send:true`. No `auto_submit:true`. Sample data does not contain a `Reviewed` final-approval row — the surface cannot show `Ready for Human Review` from sample data alone.
- **No `Send Email` / `Submit Bid` / `Submit Quote` button.** Verified at runtime + static assertions across multiple test files.
- **No fake submitted / completed / awarded status.** Sample submission state pins `final_human_approval_recorded` to `Not started` and uses only `In progress` / `Reviewed` for a subset of upstream items. Test #5 enforces.
- **No compliance certification claim added.** Test #17 enforces.
- **No watsonx-live / signed-and-notarized / guaranteed-outcome claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Phase 22E Past Performance + Capability + Prime Partner preserved** (24/24).
- **Phase 22F Submission Readiness Gate preserved** (30/30 after the test-widening update).
- **Renderer boot preserved** (7/7 — every inline `<script>` block parses; 7 inline blocks now).
- **System Readiness / System Flow tab remains removed** (9/9).

---

## 4. Validation

The following gates passed on the branch HEAD prior to commit:

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
- `npm run release:evidence` — state `packaged_unsigned` (expected non-release env)
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## 5. Remaining Phase 23B recommendations

Carried over from the Phase 22G audit and deferred from Phase 23A:

| ID | Recommendation | Why deferred from 23A |
|---|---|---|
| **23B-A** | GovCon Mode primary-nav demotion of Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Create Lead / Daily Ops / Delivery into a "Show all" toggle. | Touches the sidebar and tab-switching logic across the renderer — non-trivial navigation refactor. The task spec for 23A explicitly defers if implementation risks breaking navigation. |
| **23B-B** | Signed-build demo path so the troubleshooting tour doesn't expose `code object is not signed at all`. | Requires real Apple signing credentials and is gated by Phase 17A signing readiness + Phase 17B release evidence flow. Operator decision. |
| **23B-C** | Local-only "Export as Markdown" download wired to the Phase 22F Export Placeholder action. Still no submission, still no email — just a portable internal-review artifact for the operator's own use. | Cleanly scoped to a single phase; out of 23A budget. |
| **23B-D** | "Last updated" timestamps per phase section. | Cosmetic polish; out of 23A budget. |

---

## 6. Rollback

Additive. Revert the single phase commit to roll back. Phases 22B-22F (and 22G docs) remain intact on `main`. The existing GovCon tab returns to its post-Phase-22G state: empty-everywhere cold open, duplicate vendor card, stale Phase 22C placeholder toast, `0%` / `Not Ready` Submission Readiness defaults, free-text-only CPARS field. All safety guarantees still hold post-rollback.

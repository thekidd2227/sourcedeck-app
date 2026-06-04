# Release Note — Phase 22F Submission Readiness Gate + Human-Approved Package Export

**Branch:** `feat/phase-22f-submission-readiness-package-export`
**Base:** `main @ 3e439fc` (post-PR #64 — Phase 22E Past Performance + Capability + Prime merged).
**Posture:** Manual intake only. Local advisory readiness scoring. **SourceDeck does not submit bids, quotes, or government responses.** **SourceDeck does not submit, upload, email, or transmit this package.** Package export prepares internal review materials only. The user must complete official submission outside SourceDeck.

---

## Summary

Phase 22F closes the GovCon capture workflow with a final readiness-control surface and an internal-review package preview. A government contractor opens the GovCon area and now sees, after Phase 22E:

- **Submission Readiness Score** (advisory, default `0%`).
- **Readiness Status** (`Not Ready` / `Needs Review` / `Ready for Human Review` — the last appears only when every required checklist item is `Reviewed` **and** the final human approval row is `Reviewed`).
- **Submission Package Checklist** with 13 spec'd items, each settable to one of four statuses (Not started / In progress / Reviewed / Blocked).
- **Section-status rollup grid** (Compliance Matrix / Pricing Worksheet / Vendor Quote / Past Performance / Capability Statement / Forms / Risk / Human Approval), each computed read-only from upstream Phase 22B-22E localStorage.
- **Human-Approved Package Export** with package name / solicitation / notes form, 10-item included-sections checklist, `Build Package Preview` and `Export Package Placeholder` actions, and an in-page preview container.
- Final **Human Review Required** oxblood notice restating all non-submission boundaries.

Implements **F23 FAR / Set-Aside Guardrails (advisory checklist)**, **F24 Submission Readiness Gate**, **F25 Human-Approved Submission Package Export** from the canonical Phase 22A-1 roadmap.

**SourceDeck does not submit bids, quotes, or government responses. SourceDeck does not submit, upload, email, or transmit this package.**

---

## What changed

### Renderer

- `sourcedeck.html` — added a single `<section id="gc-sub-gate" data-section="govcon-submission-readiness-gate">` block inside `tab-govcon`, immediately after Phase 22E. The block contains:
  - Score + Status + Final Package Status cards with defaults `0%` / `Not Ready` / `No package prepared`.
  - Submission Package Checklist with 13 items (status dropdown + operator notes per row); default = all `Not started`.
  - Section-status rollup grid driven from upstream localStorage keys (read-only).
  - Human-Approved Package Export with 3 text fields, 10 included-section checkboxes, `Build Package Preview` / `Export Package Placeholder` / `Clear Preview` actions, in-page preview container.
  - Shared oxblood Human Review Required notice.
- A new inline `<script>` block implements `gcSubSetStatus`, `gcSubSetNote`, `gcSubRender`, `gcPkgSave`, `gcPkgBuildPreview`, `gcPkgExportPlaceholder`, `gcPkgClearPreview`. State is local-only via `window.localStorage` under keys `sd.govcon.submissionReadiness.v1` (Phase 22F's only writable state) and `sd.govcon.packageExport.v1`. Upstream phase keys are read-only.

### Local advisory scoring

```
weight = { Reviewed: 1, "In progress": 0.5, "Not started": 0, Blocked: 0 }
score  = round( sum(weights) / total_items * 100 )

if any item is Blocked              → status = "Not Ready"
else if every item is Reviewed
     AND final_human_approval=Reviewed → status = "Ready for Human Review"
else if score >= 25                  → status = "Needs Review"
else                                 → status = "Not Ready"
```

No fake completion. Final human approval is its own required checklist row.

### Tests

- `test/govcon-submission-readiness.test.js` — 30 static + VM-based assertions covering: Submission Readiness Gate exists, score surface, readiness status surface, checklist table, all 13 spec checklist items, four status options, defaults (Not started; no fake completion), Human Approval status, Human-Approved Package Export, package form fields, 10 included-section checkboxes, Build Preview action, Export Placeholder action, "SourceDeck does not submit bids, quotes, or government responses" (≥2), "SourceDeck does not submit, upload, email, or transmit this package" (≥3), no Send Email / Submit Bid / Submit Quote buttons, no auto-send / auto-submit / Export-and-submit, no fake submitted-status defaults, System Readiness/Flow remains removed, Phase 22B/C/D/E all preserved, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, every inline `<script>` block still parses (renderer boot guard), `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

### Docs

- `docs/audits/phase-22f-submission-readiness-package-export-audit.md` — audit + reuse inventory + scoring + safety/non-claims block.
- `docs/release-notes/phase-22f-submission-readiness-package-export.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-submission-readiness.test.js` after `govcon-past-performance-prime.test.js`. No new dependency. No build script change. No publish flag change.

---

## What did NOT change

- **No bid, quote, or government-response submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No portal upload.** No SAM-/PIEE-/eBuy-/GSA-specific upload wired.
- **No email transmission.** No `Send Email` button anywhere in the renderer.
- **No `Submit Bid` button. No `Submit Quote` button.** No `Export and submit` language.
- **No auto-send / no auto-submit.** No `auto_send:true`. No `auto_submit:true`.
- **No fake submitted / completed / uploaded status.** Defaults render `0%` / `Not Ready` / `No package prepared` / all checklist items `Not started`.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.** No new IPC bridge. No new dependency.
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID. No `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **System Readiness / System Flow tab remains removed.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Phase 22E Past Performance + Capability + Prime Partner preserved** (24/24).
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.**
- **Phase 20G `.btn-gold` guard preserved.**

---

## Tests run / results — all green

- `node test/govcon-submission-readiness.test.js` — **30/30 PASS**
- `node test/govcon-past-performance-prime.test.js` — **24/24 PASS** (Phase 22E preserved)
- `node test/govcon-vendor-pricing.test.js` — **25/25 PASS** (Phase 22D preserved)
- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS** (Phase 22C preserved)
- `node test/govcon-capture-command-center.test.js` — **15/15 PASS** (Phase 22B preserved)
- `node test/remove-system-readiness-tab.test.js` — **9/9 PASS**
- `node test/renderer-boot.test.js` — **7/7 PASS**
- `node test/response-desk-email-import.test.js` — **20/20 PASS**
- `node test/response-desk.test.js` — **24/24 PASS**
- `node test/default-state-policy.test.js` — **22/22 PASS**
- `node test/sam-opportunity-sprint.test.js` — PASS
- `npm test` — all suites PASS (incl. watsonx-runtime-evidence 17/17, watsonx-runtime-context 18/18, release-evidence 20/20, troubleshooting-agent 95/95, troubleshooting-email-alerts 18/18, macos-signing-readiness 19/19)
- `npm run release:evidence` — state `packaged_unsigned`
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## Rollback

Additive. Revert this PR's single commit to roll back. Phases 22B, 22C, 22D, and 22E remain intact on `main`. No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Phase 22 series — completion

Phase 22F closes the Phase 22A-1 canonical 25-feature GovCon Capture and Submission Readiness OS roadmap. Subsequent work (pricing reconciliation, signed-release readiness, watsonx-live verification, marketing) is out of scope for the Phase 22 series and tracked under separate phases.

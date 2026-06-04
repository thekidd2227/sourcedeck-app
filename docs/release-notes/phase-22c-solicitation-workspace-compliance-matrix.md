# Release Note — Phase 22C Solicitation Workspace + Compliance Matrix

**Branch:** `feat/phase-22c-solicitation-workspace-compliance-matrix`
**Base:** `main @ 8b2463a` (post-PR #61 — Phase 22B Capture Command Center merged).
**Posture:** Manual paste/import only. Local deterministic extraction. No live SAM call. No outreach drafted, sent, or queued. No bid submission. Every extraction output is a draft and requires human review against the source document.

---

## Summary

Phase 22C makes SourceDeck *useful after a contractor finds an opportunity*. A contractor pastes solicitation text into the new **Solicitation Workspace** and immediately sees:

- a **Solicitation Summary**,
- **Section L — Instructions to Offerors**,
- **Section M — Evaluation Criteria**,
- **PWS / SOW Requirements**,
- **Required Forms / Attachments**,
- **Deadlines**,
- **Risks / Deal Killers**,

and can then build a **Compliance Matrix** with the 10 spec'd columns (Requirement ID, Source section/page, Requirement text, Mandatory / optional, Proposal section, Owner, Evidence needed, Status, Risk / deal-killer flag, Notes).

Implements **F04 Solicitation Workspace**, **F05 Section L/M/C/PWS Extractor**, **F07 Amendment Monitor (placeholder via extraction)**, **F08 Compliance Matrix Builder**, **F09 Evaluation Criteria Mapper**, and **F10 Requirement Owner / Evidence Tracker** from the canonical Phase 22A-1 roadmap.

Every matrix row defaults to `Draft — Not Reviewed`, and the operator owns the verification gate via the built-in `Mark Requirement Reviewed` action. **SourceDeck does not submit bids and does not auto-send outreach.**

---

## What changed

### Renderer

- `sourcedeck.html` — added a single `<section id="gc-sol-workspace" data-section="govcon-solicitation-workspace">` block inside `tab-govcon`, immediately after the Phase 22B Capture Command Center. The block contains:
  - a header with title, civic-ledger sub-label, and a one-line safety microcopy ("Draft extraction — verify against source document. SourceDeck does not submit bids. All outputs require human review. No outreach is drafted, sent, or queued.");
  - an intake card with a `Linked opportunity` selector (read-only — populated from the Phase 22B Capture Board localStorage), a `Paste solicitation text` textarea, and four actions: `Extract Requirements`, `Build Compliance Matrix`, `Mark Requirement Reviewed`, `Export Matrix Placeholder`;
  - seven extraction panels (`#gc-sol-summary`, `#gc-sol-section-l`, `#gc-sol-section-m`, `#gc-sol-pws`, `#gc-sol-forms`, `#gc-sol-deadlines`, `#gc-sol-risks`) with explicit empty-state copy by default;
  - a Compliance Matrix table (`#gc-sol-matrix-table` with `#gc-sol-matrix-body`) with the 10 spec'd columns and an empty-state default row;
  - an oxblood-tinted "Human Review Required" notice.
- A new inline `<script>` block at the end of `sourcedeck.html` implements `gcSolExtract`, `gcSolBuildMatrix`, `gcSolMarkReviewed`, `gcSolExportPlaceholder`, plus the renderer and the deterministic in-renderer extraction. State is local-only via `window.localStorage` under key `sd.govcon.solWorkspace.v1`. The Capture Board store is read for the opportunity selector and never written.

### Local extraction heuristics

The renderer-side heuristic is deliberately small and deterministic. It scans operator-pasted text line by line and buckets lines by Section L start, Section M start, PWS/SOW marker, requirement verb (`shall|must|will provide|is required|are required|provide|submit|describe|address|demonstrate|deliver`), required form (`SF-### | DD Form | Attachment N | Exhibit X | Appendix X`), deadline marker (`due|deadline|Q&A|questions due|proposal due|site visit|intent to bid|industry day`), or risk marker (`insurance|bonding|security clearance|background check|site visit|past performance|small business|set-aside`). Mandatory classification is verb-driven. Proposal section mapping is source-driven (L → Volume I; M → Volume IV; PWS/SOW → Volume II; else → TBD). Every output is labeled draft.

### Tests

- `test/govcon-solicitation-workspace.test.js` — 19 static + VM-based assertions covering: workspace exists, intake field exists, Section L / M / PWS panels exist, Required Forms panel exists, Compliance Matrix table exists with all 10 columns, empty states present and no fake solicitation / agency / deadline data, Human Review Required copy, "SourceDeck does not submit bids" copy, no Send Email button, no auto-submit, System Readiness/Flow remains removed, Phase 22B Capture Command Center remains intact, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, every inline `<script>` block still parses (renderer boot guard), `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

### Docs

- `docs/audits/phase-22c-solicitation-workspace-compliance-matrix-audit.md` — audit + reuse inventory + safety/non-claims block.
- `docs/release-notes/phase-22c-solicitation-workspace-compliance-matrix.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-solicitation-workspace.test.js` after the existing `govcon-capture-command-center.test.js`. No new dependency. No build script change. No publish flag change.

---

## What did NOT change

- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No new IPC bridge.** Renderer does its own deterministic extraction. The Node-side `solicitation-analysis.js`, `compliance-matrix.js`, and `deadline-extraction.js` modules are not called across preload.
- **No live SAM.gov call from the workspace.** No fetch from this surface.
- **No outreach drafted, sent, or queued.** No `Send Email` button anywhere in the app.
- **No bid submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No auto-send / no auto-submit.** No `auto_send:true`. No `auto_submit:true`.
- **No fake solicitation data.** Every panel renders empty-state copy until the operator pastes real text. Test #9 enforces this.
- **System Readiness / System Flow tab remains removed.** No `tab-sysflow`, no `data-tab="sysflow"`, no Readiness/Flow label.
- **Phase 22B Capture Command Center preserved.** All 15 of its checks continue to pass.
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.** `Free users: 1 NAICS` copy intact. SAM Sprint runner not edited.
- **Phase 20G `.btn-gold` guard preserved.** Defensive cool-gold rule and Phase 20G guard comment intact.
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID mentioned. No `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**

---

## Tests run / results — all green

- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS**
- `node test/govcon-capture-command-center.test.js` — **15/15 PASS** (Phase 22B preserved)
- `node test/remove-system-readiness-tab.test.js` — **9/9 PASS**
- `node test/renderer-boot.test.js` — **7/7 PASS**
- `node test/response-desk-email-import.test.js` — **20/20 PASS**
- `node test/response-desk.test.js` — **24/24 PASS**
- `node test/default-state-policy.test.js` — **22/22 PASS**
- `node test/sam-opportunity-sprint.test.js` — PASS
- `npm test` — all suites PASS (incl. watsonx-runtime-evidence 17/17, watsonx-runtime-context 18/18, release-evidence 20/20, troubleshooting-agent 95/95, troubleshooting-email-alerts 18/18, macos-signing-readiness 19/19)
- `npm run release:evidence` — state `packaged_unsigned` (expected non-release env)
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## Rollback

Additive. Revert this PR's single commit to roll back. Phase 22B Capture Command Center remains intact on `main`. The existing GovCon tab returns to its post-Phase-22B state. No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Next phases

- **22D** Vendor Quote Room + Vendor Risk + Credential Checklist + Pricing Worksheet / Margin Builder + Subcontractor Quote Comparison.
- **22E** Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

The Phase 22C Solicitation Workspace becomes the upstream input for the Phase 22F Submission Readiness Gate.

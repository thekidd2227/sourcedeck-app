# Release Note — Phase 22B GovCon Capture Command Center

**Branch:** `feat/phase-22b-govcon-capture-command-center`
**Base:** `main @ 58dfdbf` (post-PR #59 — Phase 22A GovCon product-market fit audit merged).
**Posture:** Buyer-facing GovCon operating surface. Manual intake only. No live SAM run. No auto-send. No auto-submit.

---

## Summary

Phase 22B adds the **GovCon Capture Command Center** as the first thing a buyer sees inside the existing `tab-govcon` pane. It implements three items from the canonical Phase 22A-1 roadmap: **F01 GovCon Capture Command Center**, **F03 Bid/No-Bid Engine (overview)**, and **F06 Deadline + Q&A Calendar**.

A government contractor opening SourceDeck now lands on a coherent GovCon operating surface that shows:

- active pursuits,
- deadlines this week,
- Q&A and amendment windows,
- bid/no-bid review,
- solicitation readiness,
- vendor / subcontractor needs,
- proposal package status,
- and pending human approvals.

Empty by default. Populated only by manual operator action through a 12-field intake form. Every recommendation is advisory. Every action requires human approval. **SourceDeck does not auto-submit bids and does not auto-send outreach.**

---

## What changed

### Renderer

- `sourcedeck.html` — added a single `<section id="gc-capture-cc" data-section="govcon-capture-command-center">` block inside `tab-govcon`, immediately after the existing GovCon Outreach OS helper. The block contains:
  - eight stat cards (Active Pursuits, Deadlines This Week, Q&A / Amendment Watch, Bid/No-Bid Review, Solicitation Readiness, Vendor / Subcontractor Needs, Proposal Package Status, Human Approval Required), each with an explicit empty-state copy;
  - a `<details>`-collapsed Manual Opportunity Intake form (12 fields: title, solicitation number, agency, office, NAICS, set-aside, due date, Q&A due date, place of performance, estimated value, link/source URL, notes) with four actions (Add to Capture Board, Run Bid/No-Bid Review, Extract Deadlines, Prepare Solicitation Workspace);
  - a Bid/No-Bid Review advisory surface with an opportunity selector and an 8-row advisory scorecard;
  - a Deadline + Q&A Calendar list surface.
- A new inline `<script>` block at the end of `sourcedeck.html` implements `gcCaptureRender`, `gcCaptureAddOpportunity`, `gcCaptureRunBidNoBid`, `gcCaptureExtractDeadlines`, `gcCaptureSolicitationPlaceholder`, and `gcCaptureRenderBidNoBid`. State is local-only via `window.localStorage` under the key `sd.govcon.captureBoard.v1`. No network call, no fetch, no preload-bridge change.

### Tests

- `test/govcon-capture-command-center.test.js` — 15 static + VM-based assertions covering the 8 cards, empty-state copy, intake form fields, intake actions, Bid/No-Bid Review surface, Deadline + Q&A Calendar surface, human-approval invariant, no Send Email button, no auto-submit, no fake active pursuits, no fake deadlines, System Readiness / Flow remains removed, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, renderer boot still passes, `.btn-gold` Phase 20G guard intact. Wired into `npm test`.

### Docs

- `docs/audits/phase-22b-govcon-capture-command-center-audit.md` — audit + reuse inventory + safety/non-claims block.
- `docs/release-notes/phase-22b-govcon-capture-command-center.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-capture-command-center.test.js` after the existing `remove-system-readiness-tab.test.js`. No new dependency. No build script change. No publish flag change.

---

## What did NOT change

- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No new service module added.** The Command Center surfaces existing GovCon backend conceptually (`sam-opportunity-sprint`, `govcon-pursuit-profile*`, `sam-sprint-entitlements`, `compliance-matrix`, `solicitation-analysis`, `deadline-extraction`, `past-performance`, `prime-partner-finder`, `subcontractor-sourcing`, `capability-statement-extractor`, `pre-rfp`, `email-compliance`, `incumbent-research`) but does not wire new calls to them; deeper assembly ships in Phases 22C–22F per the canonical roadmap.
- **No live SAM.gov call from the Command Center.** The "Search SAM.gov" button already present in the surrounding GovCon pane is unchanged.
- **No outreach drafted, sent, or queued.** No `Send Email` button anywhere in the app.
- **No bid submission anywhere.** No connection to SAM.gov submit endpoints, PIEE, eBuy, GSA, agency portals, or email.
- **No auto-send. No auto-submit.** No `auto_send: true`. No `auto_submit: true`.
- **System Readiness / System Flow tab remains removed.** No `tab-sysflow`, no `data-tab="sysflow"`, no System Readiness/Flow nav label reintroduced.
- **Response Desk preserved.** Import Email control intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.** `Free users: 1 NAICS` copy intact. SAM Sprint runner not edited.
- **Phase 20G `.btn-gold` guard preserved.** Defensive cool-gold rule and Phase 20G guard comment intact.
- **No pricing changed.** `docs/pricing/sourceDeck-pricing-packaging.md` not edited. No Stripe Price ID mentioned. No `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**

---

## Existing GovCon modules surfaced more coherently

Phase 22B does not duplicate logic. It assembles the existing modules into a buyer-visible workflow:

- The SAM Opportunity Sprint runner stays where it is; the Command Center's "Active Pursuits" empty-state copy points the operator to it ("Run a SAM Sprint or add an opportunity manually").
- The Pursuit Profile remains the single source of truth for scoring; the Command Center's Bid/No-Bid Fit-score row is labeled as advisory and pending Pursuit Profile completion.
- Compliance Matrix, Solicitation Analysis, and Deadline Extraction stay backend-only in this phase; their rows in the Bid/No-Bid scorecard are explicitly labeled as deferred to Phases 22C–22F.
- Past Performance and Capability Statement remain backend-only in this phase; their rows are labeled as deferred to Phase 22E.
- Vendor / Subcontractor surfaces (`prime-partner-finder`, `subcontractor-sourcing`) remain backend-only; vendor dependency is captured as an operator-set flag for now (Vendor Quote Room ships in Phase 22D).

The result is the first buyer-facing screen that *looks* like a GovCon operating surface, without changing any backend module behavior.

---

## Human approval boundaries

- Every recommendation in the Bid/No-Bid scorecard is labeled **advisory**.
- Every action in the intake form is local-only and requires the operator to click.
- The Bid/No-Bid recommendation badge (Bid / Team / Sub / Watch / Kill) always carries the suffix *"advisory; human approval required; SourceDeck does not auto-submit bids and does not auto-send outreach."*
- The "Human Approval Required" stat card's empty state reads *"No pending approvals. Human approval required for every outreach, quote, and submission action."*
- The Solicitation Workspace action is a labeled placeholder for Phase 22C; clicking it emits a toast that says so. It does not call any backend.

---

## Tests run / results — all green

- `node test/govcon-capture-command-center.test.js` — **15/15 PASS**
- `node test/remove-system-readiness-tab.test.js` — **9/9 PASS**
- `node test/renderer-boot.test.js` — **7/7 PASS**
- `node test/response-desk-email-import.test.js` — **20/20 PASS**
- `node test/response-desk.test.js` — **24/24 PASS**
- `node test/default-state-policy.test.js` — **22/22 PASS**
- `node test/sam-opportunity-sprint.test.js` — PASS
- `npm test` — all suites PASS
- `npm run release:evidence` — state `packaged_unsigned` (expected non-release env)
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## Rollback

Additive. Revert this PR's single commit to roll back. Phase 22A canonical docs remain intact on `main`. The existing GovCon tab returns to its pre-Phase-22B state (Pursuit Profile card, SAM Sprint controls, opportunities table — all unchanged). No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Next phases

- **22C** Solicitation Workspace + Section L/M/C/PWS Extractor + Amendment Monitor + Compliance Matrix Builder + Evaluation Criteria Mapper + Requirement Owner / Evidence Tracker.
- **22D** Vendor Quote Room + Vendor Risk + Credential Checklist + Pricing Worksheet / Margin Builder + Subcontractor Quote Comparison.
- **22E** Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

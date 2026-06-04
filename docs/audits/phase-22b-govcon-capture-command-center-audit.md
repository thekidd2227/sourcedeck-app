# Phase 22B — GovCon Capture Command Center — Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-22b-govcon-capture-command-center`
**Base:** `main @ 58dfdbf` (post-PR #59 — Phase 22A GovCon product-market fit audit merged).
**Scope:** First buyer-facing GovCon operating surface (Phase 22B per the canonical 22A-1 roadmap).
**Posture:** Manual intake only. No live SAM call. No auto-send. No auto-submit. Every recommendation advisory; human approval required before any outreach, quote request, or submission.

---

## 0. Purpose

Phase 22A's audit (PR #59) said it plainly: SourceDeck has more GovCon backend than UI. The PMF gap is assembly, proof, and workflow reachability. A government contractor opens SourceDeck today and sees commercial-CRM surfaces before they see anything that says *"this knows my world."*

Phase 22B closes the first step of that gap. It adds the **GovCon Capture Command Center** as the top section inside the existing `tab-govcon` pane, so the buyer's first GovCon click immediately lands on a GovCon operating surface — not a generic dashboard.

The Command Center surfaces eight buyer-facing signals:

1. **Active Pursuits**
2. **Deadlines This Week**
3. **Q&A / Amendment Watch**
4. **Bid/No-Bid Review**
5. **Solicitation Readiness**
6. **Vendor / Subcontractor Needs**
7. **Proposal Package Status**
8. **Human Approval Required**

…plus a **Manual Opportunity Intake** form, a **Bid/No-Bid Review** advisory surface, and a **Deadline + Q&A Calendar** list. Empty by default; populated only by manual operator action.

This phase **does not** build new GovCon backend modules. It assembles existing concepts into a coherent buyer-facing first impression. Phases 22C–22F (per `docs/product/phase-22a-govcon-feature-opportunity-map.md`) extend the workflow into Solicitation Workspace + Compliance Matrix, Vendor Quote Room + Pricing Worksheet, Past Performance + Capability + Teaming, and Submission Readiness.

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — single-file Electron renderer. The existing `tab-govcon` pane (lines 2004–~2220 pre-edit) already contains the GovCon Pursuit Profile and GovCon Outreach OS helper. The Command Center is inserted between the helper and the existing cards so the buyer sees it first.
- `services/govcon/sam-opportunity-sprint.js` — SAM Sprint runner with plan-tier entitlement gating (Free=1 NAICS / paid=many). Not edited.
- `services/govcon/sam-search.js`, `scheduled-sam-search.js`, `sam-sprint-entitlements.js`, `govcon-pursuit-profile.js`, `govcon-pursuit-profile-store.js`, `compliance-matrix.js`, `solicitation-analysis.js`, `deadline-extraction.js`, `past-performance.js`, `prime-partner-finder.js`, `subcontractor-sourcing.js`, `capability-statement-extractor.js`, `fed-agent.js`, `incumbent-research.js`, `opportunity-outreach.js`, `email-compliance.js`, `pre-rfp.js`, `clarification-strategy.js` — all existing services-side. None edited by Phase 22B.
- `services/response-desk.js` (24/24 tests) and `services/default-state-policy.js` (22/22 tests) — left untouched; their guards in `test/response-desk*.test.js`, `test/default-state-policy.test.js`, `test/renderer-boot.test.js`, and `test/remove-system-readiness-tab.test.js` continue to pass.
- `docs/product/phase-22a-govcon-product-market-fit-audit.md` and `docs/product/phase-22a-govcon-feature-opportunity-map.md` — canonical Phase 22A package merged in PR #59. Phase 22B implements F01 (GovCon Capture Command Center), F03 (Bid/No-Bid overview), F06 (Deadline + Q&A Calendar) per that roadmap.

### 1.2 What was deliberately not done

- **No live SAM.gov search executed.** The Command Center is a manual-intake-only surface. The "Search SAM.gov" button already wired in the surrounding pane is unchanged; this PR does not wire a new live SAM call.
- **No outreach drafted, sent, or queued.**
- **No quote requests sent.**
- **No bid submitted anywhere** (SAM.gov, PIEE, eBuy, GSA, agency portals, email).
- **No `Send Email` button anywhere in the app.** The existing renderer guard tests (`renderer-boot.test.js`, `remove-system-readiness-tab.test.js`, `response-desk.test.js`) enforce this; the new `govcon-capture-command-center.test.js` reasserts it.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No edits to `.env`, no API keys printed, no secrets exposed, no stashes touched.**
- **No pricing changed.** No claim added about compliance certification, watsonx-live, signed-and-notarized macOS build, guaranteed contract/award/revenue/ROI/unlimited-AI, autonomous submission, or auto-send.

---

## 2. What was built

### 2.1 Renderer change — `sourcedeck.html`

A single new `<section id="gc-capture-cc" data-section="govcon-capture-command-center">` block inserted inside `tab-govcon`, immediately after the GovCon Outreach OS helper. The block contains:

- **An 8-card stat grid** with `id="gc-cc-{active|deadlines|qa|bidnobid|solready|vendor|proposal|approval}-count"` numeric badges and matching `id="gc-cc-{key}-empty"` empty-state copy.
- **A `<details>`-collapsed manual opportunity intake form** (`#gc-cc-intake-form`) with 12 fields: title, solicitation number, agency, office, NAICS, set-aside, due date, Q&A due date, place of performance, estimated value, link/source URL, notes.
- **Intake actions**: "Add to Capture Board", "Run Bid/No-Bid Review", "Extract Deadlines", "Prepare Solicitation Workspace". All local-only. The Bid/No-Bid and Extract Deadlines actions scroll to the respective surfaces; the Solicitation Workspace action is a labeled placeholder for Phase 22C and emits a toast saying so.
- **A Bid/No-Bid Review surface** (`#gc-cc-bidnobid`) with an opportunity selector, a per-opportunity advisory scorecard (Fit score, Deadline risk, NAICS match, Set-aside match, Past performance fit, Vendor dependency, Pricing complexity, Compliance risk), and a recommendation badge (Bid / Team / Sub / Watch / Kill). Every row explicitly labeled advisory; every recommendation accompanied by "human approval required; SourceDeck does not auto-submit bids."
- **A Deadline + Q&A Calendar surface** (`#gc-cc-calendar`) with a chronological list of proposal-due and Q&A-due dates from manually-entered opportunities. Empty state default.

A new inline `<script>` block at the end of the file implements the renderer (`gcCaptureRender`, `gcCaptureAddOpportunity`, `gcCaptureRunBidNoBid`, `gcCaptureExtractDeadlines`, `gcCaptureSolicitationPlaceholder`, `gcCaptureRenderBidNoBid`). State is local-only via `window.localStorage` under key `sd.govcon.captureBoard.v1`. No network call. No fetch. No IPC outside the existing preload bridge. No auto-send. No auto-submit.

### 2.2 Test added — `test/govcon-capture-command-center.test.js`

15 static + VM-based assertions; never executes app code or touches the network. Wired into `npm test` after the existing `remove-system-readiness-tab.test.js`.

### 2.3 Package wiring — `package.json`

The new test is appended to the `test` script chain. No dependencies added. No build script changed. No publish flag changed.

### 2.4 Docs added

- `docs/audits/phase-22b-govcon-capture-command-center-audit.md` (this file).
- `docs/release-notes/phase-22b-govcon-capture-command-center.md`.

---

## 3. What was reused, not duplicated

| Existing module / surface | Reused by Phase 22B | How |
|---|---|---|
| `services/govcon/sam-opportunity-sprint.js` | SAM Sprint button already in the surrounding GovCon pane; Command Center references "Run a SAM Sprint" in its empty state | Empty-state copy points the operator to the existing SAM Sprint flow |
| `services/govcon/govcon-pursuit-profile*.js` | Bid/No-Bid Fit score row labeled "populated when Pursuit Profile completes" | No new profile schema, no new store |
| `services/govcon/sam-sprint-entitlements.js` | Free=1 NAICS plan gate preserved (regression-tested) | No edit; the protected `Free users: 1 NAICS` copy in the renderer remains intact |
| `services/govcon/compliance-matrix.js`, `solicitation-analysis.js`, `deadline-extraction.js` | Bid/No-Bid scorecard labels these explicitly as "Phase 22C" | No call wired; placeholders only |
| `services/govcon/past-performance.js`, `capability-statement-extractor.js` | Past performance fit row labeled "Phase 22E" | No call wired |
| `services/govcon/prime-partner-finder.js`, `subcontractor-sourcing.js` | Vendor dependency row uses operator-provided flags only | No call wired |
| `services/response-desk.js`, Response Desk renderer | Untouched; Import Email control preserved; no Send Email | Reasserted in `govcon-capture-command-center.test.js` test 12 |
| `services/default-state-policy.js`, `FORBIDDEN_SEED_TERMS` | Empty-state defaults guarantee no seed contamination | The Command Center renders 0 counts and empty-state copy when storage is empty |

---

## 4. Safety / non-claims

- **No live SAM run.** No HTTP call from the Command Center.
- **No outreach drafted, sent, or queued.** No `Send Email` button anywhere.
- **No auto-submit.** No bid submission to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No auto-send.** No outreach automatically sent.
- **Manual intake only.** Opportunity data is operator-entered into the form.
- **Every recommendation is advisory.** The Bid/No-Bid scorecard always carries a "human approval required; SourceDeck does not auto-submit bids" disclaimer.
- **No fake active pursuits, deadlines, vendor quotes, submissions, or agency contacts in default state.** The 8 cards render 0 / empty-state on first paint.
- **Response Desk preserved.** Import Email control intact. `never auto-sends, never auto-submits` copy intact. 24/24 response-desk tests still pass.
- **SAM Sprint Free=1 NAICS preserved.** `Free users: 1 NAICS` copy intact. SAM Sprint runner not edited.
- **Renderer boot preserved.** Every inline `<script>` block parses (`renderer-boot.test.js` 7/7 still pass).
- **Removed System Readiness / System Flow tab remains removed.** `remove-system-readiness-tab.test.js` 9/9 still pass. No `tab-sysflow`, no `data-tab="sysflow"`, no System Readiness/Flow label reintroduced.
- **`.btn-gold` Phase 20G guard preserved.** Defensive cool-gold rule intact.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit, no Stripe ID, no `assets/sd-config.js` (site repo) touched.
- **No stashes touched. No `.env` touched. No API key printed.**

---

## 5. Validation

The following gates passed on the branch HEAD prior to commit:

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

## 6. Rollback

Additive. Revert the single phase commit to roll back. Phase 22A canonical docs remain intact on `main`. The existing GovCon tab returns to its pre-Phase-22B state (Pursuit Profile card, SAM Sprint controls, opportunities table — all unchanged).

---

## 7. Next phases

Per the canonical Phase 22A-1 roadmap (in `docs/product/phase-22a-govcon-product-market-fit-audit.md`):

- **22C** — Solicitation Workspace + Section L/M/C/PWS Extractor + Amendment Monitor + Compliance Matrix Builder + Evaluation Criteria Mapper + Requirement Owner / Evidence Tracker.
- **22D** — Vendor Quote Room + Vendor Risk + Credential Checklist + Pricing Worksheet / Margin Builder + Subcontractor Quote Comparison.
- **22E** — Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** — FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

Phase 22B places the F01 / F03 / F06 surfaces. Each subsequent phase extends the assembly without changing the safety posture established here.

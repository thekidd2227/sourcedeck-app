# Phase 22C — Solicitation Workspace + Compliance Matrix — Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-22c-solicitation-workspace-compliance-matrix`
**Base:** `main @ 8b2463a` (post-PR #61 — Phase 22B GovCon Capture Command Center merged).
**Scope:** Second buyer-facing GovCon operating surface. Implements **F04 Solicitation Workspace**, **F05 Section L/M/C/PWS Extractor**, **F07 Amendment Monitor (placeholder rows in extraction)**, **F08 Compliance Matrix Builder**, **F09 Evaluation Criteria Mapper**, and **F10 Requirement Owner / Evidence Tracker** from the canonical Phase 22A-1 roadmap.
**Posture:** Manual paste/import only. Local heuristic extraction. No live SAM call. No outreach drafted, sent, or queued. No bid submission. Every extracted row is a **draft** and requires human review against the source document.

---

## 0. Purpose

Phase 22B made SourceDeck feel like a GovCon product *immediately*. Phase 22C makes SourceDeck *useful after a contractor finds an opportunity*. A government contractor can now paste solicitation text, see it parsed into:

- a **Solicitation Summary**,
- **Section L — Instructions to Offerors**,
- **Section M — Evaluation Criteria**,
- **PWS / SOW Requirements**,
- **Required Forms / Attachments**,
- **Deadlines**,
- **Risks / Deal Killers**,

and then build a **Compliance Matrix** with the ten spec-required columns (Requirement ID, Source section/page, Requirement text, Mandatory / optional, Proposal section, Owner, Evidence needed, Status, Risk / deal-killer flag, Notes). Every matrix row defaults to `Draft — Not Reviewed` and ships with a built-in `Mark Requirement Reviewed` action so the operator owns the verification gate.

The whole surface is local. The renderer extraction is a deterministic JavaScript heuristic that scans operator-pasted text only — no fetch, no IPC bridge change, no external call.

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — single-file Electron renderer. Phase 22C inserts the Solicitation Workspace section immediately after the Phase 22B Capture Command Center (between lines 2148 and the existing GovCon Pursuit Profile card), so the buyer's GovCon click lands on Capture Command Center → Solicitation Workspace → Pursuit Profile in that order.
- `services/govcon/solicitation-analysis.js` — Node-side; exports `analyzeSolicitation`, `extractFields`, `mapDecision`. Phase 22C **does not** wire a new IPC bridge to call it from the renderer (out of scope per spec); the renderer-side heuristic mirrors the same field intent (Section L / M / PWS / forms / deadlines / risks) without duplicating the service's full regex tree.
- `services/govcon/compliance-matrix.js` — Node-side; exports `generateComplianceMatrix` plus `SECTION_L_RE`, `SECTION_M_RE`, `REQ_VERBS`, `RISK_KEYWORDS`, `OWNER_HEURISTICS`, `EVIDENCE_HEURISTICS`. Phase 22C's renderer matrix uses the **same intent** (one row per requirement, mandatory/optional classification, risk flagging) but a smaller in-renderer heuristic so no new dependency is pulled into the browser process and no new IPC bridge is required.
- `services/govcon/deadline-extraction.js` — Node-side; same posture as above. Phase 22C surfaces deadlines via in-renderer scanning of the pasted text and keeps the Phase 22B Capture Command Center Calendar untouched; deadline integration into a single calendar across both surfaces is left for a later phase.
- `services/govcon/proposal-workspace.js` — does **not** exist as a standalone module yet; tests reference proposal-workspace behaviour elsewhere. Phase 22C uses a renderer-side proposal-section mapping ("Volume I — Technical" / "Volume II — Management / PWS Response" / "Volume IV — Evaluation Alignment" / "TBD — operator assigns") so the operator can immediately see how requirements would route into a future proposal workspace.
- `services/govcon/subcontractor-sourcing.js`, `prime-partner-finder.js`, `past-performance.js`, `capability-statement-extractor.js`, `incumbent-research.js`, `email-compliance.js`, `pre-rfp.js`, `clarification-strategy.js`, `sam-search.js`, `sam-opportunity-sprint.js`, `sam-sprint-entitlements.js`, `scheduled-sam-search.js`, `govcon-pursuit-profile*.js` — **none edited**.
- `services/response-desk.js` (24/24) and `services/default-state-policy.js` (22/22) — left untouched; their guards in `test/response-desk*.test.js`, `test/default-state-policy.test.js`, `test/renderer-boot.test.js`, `test/remove-system-readiness-tab.test.js`, and `test/govcon-capture-command-center.test.js` continue to pass.
- `docs/product/phase-22a-govcon-product-market-fit-audit.md`, `phase-22a-govcon-feature-opportunity-map.md`, `docs/audits/phase-22b-govcon-capture-command-center-audit.md` — referenced; not edited.

### 1.2 What was deliberately not done

- **No live SAM.gov call.** No fetch from the Solicitation Workspace. No agency-portal submission, no email send, no outbound network call from this surface.
- **No bid submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No outreach drafted, sent, or queued.**
- **No `Send Email` button** anywhere in the app. The existing renderer guard tests reassert this; the new `govcon-solicitation-workspace.test.js` reasserts it.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No new IPC bridge.** The renderer does its own deterministic heuristic extraction; the Node-side `solicitation-analysis.js`, `compliance-matrix.js`, and `deadline-extraction.js` modules are intentionally not called across the preload bridge in this phase.
- **No new dependency added.** No `package.json` `dependencies` / `devDependencies` change.
- **No edits to `.env`, no API keys printed, no secrets exposed, no stashes touched.**
- **No pricing changed.** No compliance-certification claim, no `watsonx-live` / `signed-and-notarized` claim, no guaranteed contract / award / revenue / ROI / unlimited-AI claim added.
- **No fake solicitation data.** No hardcoded solicitation number, agency, deadline, or requirement row anywhere in the workspace section. All panels render empty-state copy until the operator pastes real text.

---

## 2. What was built

### 2.1 Renderer change — `sourcedeck.html`

A single new `<section id="gc-sol-workspace" data-section="govcon-solicitation-workspace">` block inserted inside `tab-govcon`, immediately after the Phase 22B Capture Command Center. The block contains:

- **A header** with the title "Solicitation Workspace", a civic-ledger sub-label ("Section L · Section M · PWS/SOW · Required forms · Deadlines · Risks · Compliance matrix"), and a one-line safety microcopy ("Draft extraction — verify against source document. SourceDeck does not submit bids. All outputs require human review. No outreach is drafted, sent, or queued.").
- **An intake block** with:
  - A `Linked opportunity` selector (`#gc-sol-opp-select`) populated from the Phase 22B Capture Board localStorage (read-only — no write to that store).
  - A `Paste solicitation text` textarea (`#gc-sol-text`) with explicit "No text leaves this device" placeholder.
  - Four actions: `Extract Requirements`, `Build Compliance Matrix`, `Mark Requirement Reviewed`, `Export Matrix Placeholder`.
  - A safety microcopy line.
- **Seven extraction panels** with IDs `#gc-sol-summary`, `#gc-sol-section-l`, `#gc-sol-section-m`, `#gc-sol-pws`, `#gc-sol-forms`, `#gc-sol-deadlines`, `#gc-sol-risks`. Each renders an explicit empty-state copy by default ("No solicitation loaded yet…", "No Section L instructions extracted yet…", etc.).
- **A Compliance Matrix table** (`#gc-sol-matrix-table` with `#gc-sol-matrix-body`) with the 10 spec'd columns. Default empty-state row: "No requirements extracted yet. Paste solicitation text and run extraction. SourceDeck does not submit bids. All outputs require human review."
- **A "Human Review Required" oxblood-tinted notice** with the explicit safety statement.

A new inline `<script>` block at the end of `sourcedeck.html` implements `gcSolExtract`, `gcSolBuildMatrix`, `gcSolMarkReviewed`, `gcSolExportPlaceholder`, plus the renderer and the deterministic extraction. State is local-only via `window.localStorage` under key `sd.govcon.solWorkspace.v1`. The Capture Board store (`sd.govcon.captureBoard.v1`) is read for the opportunity selector and never written.

### 2.2 Local extraction heuristics

The renderer-side heuristic is deliberately small and deterministic:

| Signal | Pattern | Output |
|---|---|---|
| Section L start | `^(?:L\.?\s*\d+(?:\.\d+)*|Section\s+L\b)` (per-line) | Begins Section L bucket |
| Section M start | `^(?:M\.?\s*\d+(?:\.\d+)*|Section\s+M\b)` (per-line) | Begins Section M bucket |
| PWS / SOW marker | `(PWS|SOW|Performance Work Statement|Statement of Work)` | Begins PWS bucket |
| Requirement verb | `\b(shall|must|will provide|is required|are required|provide|submit|describe|address|demonstrate|deliver)\b` | Promotes the line into the active bucket |
| Required form | `\b(SF[-\s]?\d{1,4}[A-Z]?|DD[-\s]?Form|Attachment \d+|Exhibit [A-Z]|Appendix [A-Z])\b` | Forms / Attachments bucket |
| Deadline marker | `\b(due|deadline|Q&A|questions due|proposal due|site visit|intent to bid|industry day)\b` | Deadlines bucket |
| Risk marker | `\b(insurance|bonding|security clearance|background check|site visit|past performance|small business|set-aside)\b` | Risks / Deal Killers bucket |

Mandatory / optional classification is verb-driven: `shall|must|is required|are required` → `Mandatory`; everything else → `Optional`. Proposal section mapping is source-driven: Section L → Volume I (Technical); Section M → Volume IV (Evaluation Alignment); PWS/SOW → Volume II (Management / PWS Response); other → `TBD — operator assigns`. Risk classification surfaces a comma-separated list of matched risk keywords or `—`.

Every row's `status` defaults to `Draft — Not Reviewed`. `Owner`, `Evidence needed`, and `Notes` default to `TBD — operator assigns` so the operator can iterate row-by-row without seeing fabricated owners.

### 2.3 Test added — `test/govcon-solicitation-workspace.test.js`

19 static + VM-based assertions; never executes app code or touches the network. Wired into `npm test` after `govcon-capture-command-center.test.js`.

### 2.4 Package wiring — `package.json`

The new test is appended to the `test` script chain. No dependencies added. No build script changed.

### 2.5 Docs added

- `docs/audits/phase-22c-solicitation-workspace-compliance-matrix-audit.md` (this file).
- `docs/release-notes/phase-22c-solicitation-workspace-compliance-matrix.md`.

---

## 3. What was reused, not duplicated

| Existing surface / module | Reused by Phase 22C | How |
|---|---|---|
| Phase 22B Capture Command Center localStorage (`sd.govcon.captureBoard.v1`) | Read-only — feeds the `Linked opportunity` selector | No write; Phase 22B store remains the source of truth for opportunities |
| `services/govcon/solicitation-analysis.js` | Conceptual reuse — the renderer extraction mirrors the field intent (L / M / PWS / forms / deadlines / risks) | No IPC bridge added; no service call from renderer |
| `services/govcon/compliance-matrix.js` | Conceptual reuse — same row schema (Requirement ID, source, text, mandatory, proposal section, owner, evidence, status, risk, notes) | No IPC bridge added; no service call from renderer |
| `services/govcon/deadline-extraction.js` | Conceptual reuse — same deadline / Q&A markers | No IPC bridge added; deadlines surface inline in the workspace |
| Phase 21F / PR #58 System Readiness removal | Preserved | `tab-sysflow`, `data-tab="sysflow"`, "System Readiness" / "System Flow" remain absent |
| Phase 20G `.btn-gold` guard | Preserved | Cool-gold gradient rule + Phase 20G guard comment intact |
| Response Desk safety (Phase 51 / PR #56) | Preserved | `Import Email` intact; no Send Email; `never auto-sends, never auto-submits` intact |
| SAM Sprint Free=1 NAICS plan gate | Preserved | `Free users: 1 NAICS` copy intact |

---

## 4. Safety / non-claims

- **No live SAM call from the workspace.** No fetch. No IPC bridge change.
- **No bid submission anywhere.** No connection wired to SAM.gov / PIEE / eBuy / GSA / agency portals / email.
- **No outreach drafted, sent, or queued.** No `Send Email` button anywhere.
- **No auto-submit. No auto-send.** No `auto_submit:true`. No `auto_send:true`. The renderer extraction labels every output as draft.
- **No fake solicitation data.** Every panel renders empty-state copy until the operator pastes real text. Test #9 confirms no fake solicitation numbers, agencies, or deadlines exist in the workspace section.
- **Every extraction output is draft.** Both the panel renderer and the matrix renderer carry "Draft extraction — verify against source document" copy. Matrix rows default to `Draft — Not Reviewed`.
- **Human review required.** Oxblood-tinted "Human Review Required" notice at the bottom of the workspace restates: *"SourceDeck does not submit bids. All extraction outputs are draft and require human review against the source document. No outreach is drafted, sent, or queued by this surface. No bid is submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email. Every advisory recommendation requires human approval before any further action."*
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit, no Stripe ID, no `assets/sd-config.js` (site repo) touched.
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **Phase 22B Capture Command Center preserved.** All 15 of its checks continue to pass.
- **Phase 21F System Readiness / System Flow tab remains removed.** All 9 of its checks continue to pass.
- **Renderer boot preserved.** Every inline `<script>` block parses (7/7).

---

## 5. Validation

The following gates passed on the branch HEAD prior to commit:

- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS**
- `node test/govcon-capture-command-center.test.js` — **15/15 PASS** (Phase 22B preserved)
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

Additive. Revert the single phase commit to roll back. Phase 22B Capture Command Center remains intact on `main`. The existing GovCon tab returns to its post-Phase-22B state.

---

## 7. Next phases

Per the canonical Phase 22A-1 roadmap:

- **22D** — Vendor Quote Room + Vendor Risk + Credential Checklist + Pricing Worksheet / Margin Builder + Subcontractor Quote Comparison.
- **22E** — Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** — FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

Each subsequent phase extends the assembly without changing the safety posture established here. The Phase 22C Solicitation Workspace becomes the upstream input for the Phase 22F Submission Readiness Gate.

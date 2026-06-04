# Phase 22D — Vendor Quote Room + Pricing Worksheet — Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-22d-vendor-quote-room-pricing-worksheet`
**Base:** `main @ d75d70f` (post-PR #62 — Phase 22C Solicitation Workspace + Compliance Matrix merged).
**Scope:** Third buyer-facing GovCon operating surface. Implements **F11 Vendor Quote Room**, **F12 Vendor Risk + Credential Checklist**, **F21 Pricing Worksheet / Margin Builder**, and **F22 Subcontractor Quote Comparison** from the canonical Phase 22A-1 roadmap.
**Posture:** Manual intake only. Local advisory pricing. **SourceDeck does not send vendor outreach.** *"Requested manually"* means the operator requested the quote outside SourceDeck — SourceDeck does not send the request. **SourceDeck does not submit bids or quotes.** No outreach drafted, sent, or queued. No bid submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.

---

## 0. Purpose

Phase 22C made SourceDeck useful *after a contractor finds an opportunity*. Phase 22D makes SourceDeck useful *after requirements are extracted*. A government contractor pastes solicitation text into the Phase 22C workspace, identifies vendor/subcontractor needs, then opens Phase 22D to:

- track **vendor / subcontractor needs**, quote intake, and credential / insurance / license posture;
- log quote rows with one of six statuses (Needed / Requested manually / Received / Missing / Expired / Excluded);
- run a **Pricing Worksheet** with labor, materials, subcontractor/vendor, travel, equipment, overhead %, profit %, contingency %;
- compute an **advisory estimated price** and **margin**;
- surface a **quote comparison** table that highlights Δ vs. lowest per category;
- catch missing cost inputs and out-of-band margin (< 5% or > 35%) before bid submission.

Every row is manual. Every output is advisory. **SourceDeck does not send quote requests. SourceDeck does not submit bids or quotes.** Human approval is required for every outreach, quote, and submission action.

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — single-file Electron renderer. Phase 22D inserts the Vendor Quote Room + Pricing Worksheet surface immediately after the Phase 22C Solicitation Workspace (between the Phase 22C `</section>` and the existing GovCon Pursuit Profile card), so the buyer's GovCon click order is now: Capture Command Center → Solicitation Workspace → **Vendor Quote Room + Pricing Worksheet** → Pursuit Profile.
- `services/govcon/subcontractor-sourcing.js` — Node-side; exports a sourcing API (201 lines). **Not** wired across the preload bridge in this phase; the renderer keeps its local-only manual-intake posture.
- `services/govcon/middleman-fit.js` — Node-side; 543 lines, exports a middleman-fit analyzer. **Not** wired across the preload bridge in this phase.
- `services/govcon/prime-partner-finder.js` — Node-side; 1,038 lines. **Not** wired across the preload bridge in this phase.
- `services/govcon/solicitation-analysis.js`, `compliance-matrix.js`, `deadline-extraction.js` — Phase 22C's Solicitation Workspace upstream; **not edited** in Phase 22D.
- `services/response-desk.js` (24/24) and `services/default-state-policy.js` (22/22) — left untouched; their guards in `test/response-desk*.test.js`, `test/default-state-policy.test.js`, `test/renderer-boot.test.js`, `test/remove-system-readiness-tab.test.js`, `test/govcon-capture-command-center.test.js`, and `test/govcon-solicitation-workspace.test.js` continue to pass.
- `docs/product/phase-22a-govcon-product-market-fit-audit.md`, `phase-22a-govcon-feature-opportunity-map.md`, `docs/audits/phase-22b-*.md`, `docs/audits/phase-22c-*.md` — referenced; not edited.

### 1.2 What was deliberately not done

- **No vendor outreach sent.** No `Send Email` button anywhere. No automatic email, no SMS, no portal post.
- **No live SAM call from this surface.**
- **No bid or quote submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No new IPC bridge added.** The renderer does its own local persistence in `window.localStorage` (`sd.govcon.vendorQuotes.v1`, `sd.govcon.pricingWorksheet.v1`); the Node-side `subcontractor-sourcing`, `middleman-fit`, and `prime-partner-finder` modules are intentionally not called across preload.
- **No new dependency added.**
- **No edits to `.env`, no API keys printed, no secrets exposed, no stashes touched.**
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit, no Stripe ID mentioned, no `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim. No watsonx-live, no signed-and-notarized, no guaranteed contract / award / revenue / ROI / unlimited-AI claim.
- **No fake vendor data.** No hardcoded vendor names, agencies, deadlines, or quote rows. All panels render empty-state copy until the operator enters real data manually.
- **No fake pricing.** Default estimated price renders `$0.00` and default margin renders `—`; the quote comparison table renders empty-state by default.

---

## 2. What was built

### 2.1 Renderer change — `sourcedeck.html`

A single new `<section id="gc-vqr-pricing" data-section="govcon-vendor-pricing">` outer block inserted inside `tab-govcon`, immediately after the Phase 22C Solicitation Workspace. The block contains:

- **Vendor Quote Room** (`<section id="gc-vqr" data-section="govcon-vendor-quote-room">`):
  - Header with title, civic-ledger sub-label, and a one-line safety microcopy ("No quote requests are sent from SourceDeck. Vendor outreach requires human approval. *Requested manually* means the operator requested the quote outside SourceDeck — SourceDeck does not send the request.").
  - Three stat cards (Vendor / Subcontractor Needs, Quotes Received, Missing / Expired) with explicit empty-state copy.
  - `<details>`-collapsed Manual Vendor Quote Intake form with fields: required trade / service category, vendor name, contact name, contact email, phone, quote amount, status dropdown (Needed / Requested manually / Received / Missing / Expired / Excluded), 7-checkbox credential checklist (License / Insurance / Bonding / W-9 / SAM.gov / CAGE/UEI / Clearance), Insurance / license / certification notes textarea, Risk notes textarea, Add Vendor Quote Row + Refresh actions, and a safety microcopy footer.
  - Vendor Quotes table with seven columns (Category, Vendor, Contact, Amount, Status, Credentials, Risk) rendering an empty-state default row.
- **Pricing Worksheet** (`<section id="gc-pricing" data-section="govcon-pricing-worksheet">`):
  - Header with title, civic-ledger sub-label, and the required advisory copy ("Pricing output is advisory and must be reviewed before bid submission. SourceDeck does not submit bids or quotes.").
  - Eight pricing input fields (Labor / Materials / Subcontractor-vendor / Travel-logistics / Equipment costs in USD; Overhead %, Profit %, Contingency %), each wired with `oninput="gcPricingRecalc()"`.
  - Two computed advisory output cards (Estimated Price defaulting to `$0.00`, Estimated Margin defaulting to `—`), each carrying explicit "advisory only — review every assumption before bid submission" copy.
  - A `gc-pr-missing-warn` warning surface that flags missing cost inputs (labor, materials/equipment, overhead %, profit %).
  - A `gc-pr-margin-warn` warning surface that flags below-5% or above-35% advisory margin.
  - Quote Comparison table (Category, Vendor, Amount, Status, Δ vs. lowest) rendering an empty-state default row.
  - Pricing Assumptions textarea (persisted to `localStorage`) for operator-documented escalation, labor mix, materials index, contingency rationale, vendor lead-time risk.
- **Shared "Human Review Required" oxblood-tinted notice** at the bottom restating: *"SourceDeck does not submit bids or quotes. SourceDeck does not send vendor outreach. No quote request is sent automatically. All vendor entries, credential rows, risk notes, and pricing fields are manual. Pricing output is advisory and must be reviewed before bid submission. No bid is submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email. Human approval required for every action."*

A new inline `<script>` block at the end of `sourcedeck.html` implements `gcVqrAddQuote`, `gcVqrRender`, `gcPricingRecalc`, `gcPricingSaveAssumptions`, `gcPricingRender`, and a combined `gcVendorPricingRender`. State is local-only via `window.localStorage` under keys `sd.govcon.vendorQuotes.v1` and `sd.govcon.pricingWorksheet.v1`.

### 2.2 Local advisory pricing math

The renderer-side pricing math is deliberately small and deterministic:

```
direct      = labor + materials + vendor + travel + equipment
overhead    = direct × (overhead% / 100)
burdened    = direct + overhead
contingency = burdened × (contingency% / 100)
pre-profit  = burdened + contingency
profit      = pre-profit × (profit% / 100)
price       = pre-profit + profit
margin      = price > 0 ? (profit / price) × 100 : 0
```

Missing-cost flags fire when labor=0, materials+equipment=0, overhead%=0, or profit%=0. Margin warnings fire when margin < 5% (below acceptable) or > 35% (sanity-check). Every output is labeled advisory; the worksheet does not submit bids or quotes anywhere.

### 2.3 Test added — `test/govcon-vendor-pricing.test.js`

25 static + VM-based assertions; never executes app code or touches the network. Wired into `npm test` after `govcon-solicitation-workspace.test.js`.

### 2.4 Package wiring — `package.json`

The new test is appended to the `test` script chain. No dependencies added. No build script changed.

### 2.5 Docs added

- `docs/audits/phase-22d-vendor-quote-room-pricing-worksheet-audit.md` (this file).
- `docs/release-notes/phase-22d-vendor-quote-room-pricing-worksheet.md`.

---

## 3. What was reused, not duplicated

| Existing surface / module | Reused by Phase 22D | How |
|---|---|---|
| Phase 22B Capture Command Center | Untouched; Vendor / Subcontractor Needs counter on the CC remains driven by Capture Board entries (no double-counting with Phase 22D's new `gc-vqr-needs-count`) | Phase 22D state lives in `sd.govcon.vendorQuotes.v1`; Phase 22B Capture Board state lives in `sd.govcon.captureBoard.v1` |
| Phase 22C Solicitation Workspace | Untouched | Phase 22D consumes solicitation-extracted vendor needs informally via operator copy/paste; no new IPC |
| `services/govcon/subcontractor-sourcing.js` | Conceptual reuse — same intent (vendor/sub sourcing) | No IPC bridge added; no service call from renderer |
| `services/govcon/prime-partner-finder.js` | Conceptual reuse — covers prime/team-up role, separate from vendor quote room | No IPC bridge added |
| `services/govcon/middleman-fit.js` | Conceptual reuse — vendor-fit signal | No IPC bridge added |
| Phase 21F / PR #58 System Readiness removal | Preserved | `tab-sysflow`, `data-tab="sysflow"`, "System Readiness" / "System Flow" remain absent |
| Phase 20G `.btn-gold` guard | Preserved | Cool-gold gradient rule + Phase 20G guard comment intact |
| Response Desk safety | Preserved | Import Email intact; no Send Email; `never auto-sends, never auto-submits` intact |
| SAM Sprint Free=1 NAICS plan gate | Preserved | `Free users: 1 NAICS` copy intact |

---

## 4. Safety / non-claims

- **No vendor outreach sent.** No `Send Email` button anywhere. The Vendor Quote Room intake form explicitly labels its email field with "SourceDeck does not send mail". The "Requested manually" status is reserved for the operator's own out-of-app outreach.
- **No bid or quote submission anywhere.** No connection wired to SAM.gov / PIEE / eBuy / GSA / agency portals / email.
- **No live SAM call** from this surface.
- **No auto-send. No auto-submit.** No `auto_send:true`. No `auto_submit:true`. The renderer explicitly states "does not send vendor outreach" and "does not submit bids or quotes" (multiple places).
- **Pricing is advisory.** Every output card and every pricing surface restates "advisory only — review every assumption before bid submission". Below-5% and above-35% advisory margins surface a warning.
- **No fake vendor data.** Test #14 enforces that no hardcoded vendor identifiers appear outside `placeholder=` attribute context.
- **No fake pricing.** Test #15 enforces default `$0.00` price / `—` margin / empty quote comparison.
- **Human review required.** Oxblood notice + "human approval required" copy across the surface (≥4 mentions; test #6 enforces).
- **No compliance certification claim added.**
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No pricing changed.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **Phase 22B Capture Command Center preserved.** All 15 of its checks continue to pass.
- **Phase 22C Solicitation Workspace preserved.** All 19 of its checks continue to pass.
- **Renderer boot preserved.** Every inline `<script>` block parses (now 4 inline blocks; 7/7).
- **System Readiness / System Flow tab remains removed.** 9/9.

---

## 5. Validation

The following gates passed on the branch HEAD prior to commit:

- `node test/govcon-vendor-pricing.test.js` — **25/25 PASS**
- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS** (Phase 22C preserved)
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

Additive. Revert the single phase commit to roll back. Phases 22B and 22C remain intact on `main`. The existing GovCon tab returns to its post-Phase-22C state.

---

## 7. Next phases

Per the canonical Phase 22A-1 roadmap:

- **22E** — Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** — FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

Each subsequent phase extends the assembly without changing the safety posture established here. The Phase 22D Vendor Quote Room + Pricing Worksheet becomes upstream input for the Phase 22F Submission Readiness Gate.

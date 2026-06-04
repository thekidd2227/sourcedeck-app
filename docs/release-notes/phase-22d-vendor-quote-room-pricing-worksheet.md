# Release Note — Phase 22D Vendor Quote Room + Pricing Worksheet

**Branch:** `feat/phase-22d-vendor-quote-room-pricing-worksheet`
**Base:** `main @ d75d70f` (post-PR #62 — Phase 22C Solicitation Workspace + Compliance Matrix merged).
**Posture:** Manual intake only. Local advisory pricing. SourceDeck does not send vendor outreach. SourceDeck does not submit bids or quotes. No bid submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.

---

## Summary

Phase 22D adds **Vendor Quote Room + Pricing Worksheet** to the GovCon tab, immediately below the Phase 22C Solicitation Workspace. A government contractor can now identify vendor/subcontractor needs, log credentials and risk, capture quote inputs (with one of six statuses including the explicit *"Requested manually"* — i.e., the operator requested the quote outside SourceDeck), compute an **advisory** estimated price and margin, compare received quotes per category, and surface missing-cost / out-of-band-margin warnings — all without sending any vendor email, submitting any bid, or making any external call.

Implements **F11 Vendor Quote Room**, **F12 Vendor Risk + Credential Checklist**, **F21 Pricing Worksheet / Margin Builder**, and **F22 Subcontractor Quote Comparison** from the canonical Phase 22A-1 roadmap.

---

## What changed

### Renderer

- `sourcedeck.html` — added a single `<section id="gc-vqr-pricing" data-section="govcon-vendor-pricing">` outer block inside `tab-govcon`, immediately after the Phase 22C Solicitation Workspace. The block contains:
  - **Vendor Quote Room** (`gc-vqr`):
    - Header + safety microcopy ("No quote requests are sent from SourceDeck. Vendor outreach requires human approval. *Requested manually* means the operator requested the quote outside SourceDeck — SourceDeck does not send the request.").
    - 3 stat cards (Vendor / Subcontractor Needs, Quotes Received, Missing / Expired) with empty-state copy.
    - `<details>`-collapsed Manual Vendor Quote Intake form (required trade/service category, vendor name, contact name, contact email, phone, quote amount, status dropdown with the six required values, 7-checkbox credential checklist for License / Insurance / Bonding / W-9 / SAM.gov / CAGE-UEI / Clearance, insurance/license/certification notes, risk notes, Add + Refresh actions).
    - Vendor Quotes table (Category, Vendor, Contact, Amount, Status, Credentials, Risk) with empty-state default.
  - **Pricing Worksheet** (`gc-pricing`):
    - Header + advisory copy ("Pricing output is advisory and must be reviewed before bid submission. SourceDeck does not submit bids or quotes.").
    - 8 pricing fields (Labor / Materials / Subcontractor-vendor / Travel-logistics / Equipment in USD; Overhead %, Profit %, Contingency %), each wired with `oninput="gcPricingRecalc()"`.
    - Estimated Price (advisory) + Estimated Margin (advisory) output cards (default `$0.00` / `—`).
    - Missing-cost warning + Margin warning surfaces (margin < 5% or > 35%).
    - Quote Comparison table (Category, Vendor, Amount, Status, Δ vs. lowest) with empty-state default.
    - Pricing Assumptions textarea persisted to `localStorage`.
  - Shared **"Human Review Required"** oxblood-tinted notice at the bottom.
- A new inline `<script>` block at the end of `sourcedeck.html` implements `gcVqrAddQuote`, `gcVqrRender`, `gcPricingRecalc`, `gcPricingSaveAssumptions`, `gcPricingRender`, `gcVendorPricingRender`. State is local-only via `window.localStorage` (`sd.govcon.vendorQuotes.v1`, `sd.govcon.pricingWorksheet.v1`). No network, no fetch, no IPC bridge change.

### Tests

- `test/govcon-vendor-pricing.test.js` — 25 static + VM-based assertions covering: Vendor Quote Room exists, Needs panel, vendor manual fields, six required quote statuses, 7-credential checklist, human-approval copy, no-quote-requests-sent / no-vendor-outreach-sent copy, Pricing Worksheet, 8 pricing fields, Quote Comparison table, margin warning + missing-cost warning surfaces, pricing advisory copy, "SourceDeck does not submit bids or quotes" copy, no fake vendor rows by default, no fake pricing rows by default, no Send Email button, no auto-send, no auto-submit, System Readiness / Flow remains removed, Phase 22B Capture Command Center remains intact, Phase 22C Solicitation Workspace remains intact, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, every inline `<script>` block still parses (renderer boot guard), `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

### Docs

- `docs/audits/phase-22d-vendor-quote-room-pricing-worksheet-audit.md` — audit + reuse inventory + safety/non-claims block.
- `docs/release-notes/phase-22d-vendor-quote-room-pricing-worksheet.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-vendor-pricing.test.js` after the existing `govcon-solicitation-workspace.test.js`. No new dependency. No build script change. No publish flag change.

---

## What did NOT change

- **No vendor outreach sent.** No `Send Email` button anywhere in the renderer. The intake email field explicitly says "SourceDeck does not send mail".
- **No bid submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No live SAM call.** No fetch from this surface.
- **No auto-send. No auto-submit.** No `auto_send:true`. No `auto_submit:true`. No `quote request sent`. No `vendor outreach sent`.
- **No fake vendor data.** Default state renders only empty-state copy. Test #14 enforces this.
- **No fake pricing.** Default estimated price = `$0.00`, default margin = `—`, quote comparison renders empty state. Test #15 enforces this.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.** No new IPC bridge. No new dependency.
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID mentioned. No `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **System Readiness / System Flow tab remains removed.** No `tab-sysflow`, no `data-tab="sysflow"`, no Readiness/Flow label.
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.** `Free users: 1 NAICS` copy intact. SAM Sprint runner not edited.
- **Phase 20G `.btn-gold` guard preserved.**

---

## Tests run / results — all green

- `node test/govcon-vendor-pricing.test.js` — **25/25 PASS**
- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS** (Phase 22C preserved)
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

Additive. Revert this PR's single commit to roll back. Phases 22B and 22C remain intact on `main`. No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Next phases

- **22E** Past Performance Library + Capability Statement Tailoring + Prime Partner Finder + Incumbent / Recompete Intelligence + Pre-RFP Capture Tracker.
- **22F** FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

The Phase 22D Vendor Quote Room + Pricing Worksheet becomes upstream input for the Phase 22F Submission Readiness Gate.

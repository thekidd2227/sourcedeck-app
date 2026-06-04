# Release Note — Phase 22E Past Performance + Capability Statement + Prime Partner Finder

**Branch:** `feat/phase-22e-past-performance-capability-prime`
**Base:** `main @ d1a9bb2` (post-PR #63 — Phase 22D Vendor Quote Room + Pricing Worksheet merged).
**Posture:** Manual intake only. Local advisory outputs. SourceDeck does not send capability statements or outreach. SourceDeck does not send partner outreach. SourceDeck does not submit bids or quotes. No bid or quote submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.

---

## Summary

Phase 22E adds three buyer-facing surfaces to the GovCon tab, immediately after the Phase 22D Vendor Quote Room + Pricing Worksheet:

- **Past Performance Library** — manual project intake (title, agency, NAICS, contract number, period of performance, value, role, scope, relevance tags, CPARS notes, evidence notes) + records table.
- **Capability Statement Studio** — target agency / solicitation / NAICS / certifications / core capabilities / differentiators + multi-select from the Past Performance Library, producing a **draft outline** that renders inline and explicitly says "draft — review before sending".
- **Prime Partner Finder** — manual prime intake with the six required statuses (Research / Shortlist / Contacted manually / Interested / Not a fit / Follow up later) + partner rows table.
- Labeled placeholder cards for **Incumbent / Recompete Intelligence**, **Pre-RFP Capture Tracker**, and **Teaming Outreach Draft**.

Implements **F16 Past Performance Library**, **F17 Capability Statement Tailoring**, **F13 Prime Partner Finder** from the canonical Phase 22A-1 roadmap, plus three placeholder surfaces (**F14**, **F15**, teaming draft) labeled "wired in a later phase" / "human-approved only".

---

## What changed

### Renderer

- `sourcedeck.html` — added a single `<section id="gc-pp-cs-pp" data-section="govcon-past-performance-capability-prime">` outer block inside `tab-govcon`, immediately after the Phase 22D Vendor Quote Room + Pricing Worksheet. The block contains:
  - **Past Performance Library** (`gc-pp`) — `<details>`-collapsed intake form (11 fields), Past Performance Records table (8 columns) with empty-state default.
  - **Capability Statement Studio** (`gc-cs`) — form with 6 text fields + multi-select linked to the Past Performance Library, `Build Capability Statement Outline (draft)` + `Clear Outline` actions, tailored outline output container with empty-state default + "draft — review before sending" footer on every generated outline.
  - **Prime Partner Finder** (`gc-ppf`) — `<details>`-collapsed intake form (8 fields including all 6 required statuses), Prime Partner Rows table (7 columns) with empty-state default.
  - Three labeled placeholder cards (Incumbent / Recompete Intelligence, Pre-RFP Capture Tracker, Teaming Outreach Draft) each carrying explicit safety microcopy.
  - Shared oxblood **Human Review Required** notice restating no-submit / no-capability-statement-sent / no-partner-outreach-sent / no-agency-portal-post / no-email-send rules.
- A new inline `<script>` block implements `gcPpAddRecord`, `gcPpRender`, `gcCsSave`, `gcCsBuildOutline`, `gcCsClearOutline`, `gcPpfAddPartner`, `gcPpfRender`, `gcPePerformanceRender`. State is local-only via `window.localStorage` under keys `sd.govcon.pastPerformance.v1`, `sd.govcon.capabilityStatement.v1`, `sd.govcon.primePartners.v1`. No fetch, no network, no IPC bridge change.

### Tests

- `test/govcon-past-performance-prime.test.js` — 24 static + VM-based assertions covering: Past Performance Library, manual intake fields, empty state, Capability Statement Studio, fields, draft+review copy, "SourceDeck does not send capability statements or outreach", Prime Partner Finder, fields, six required partner statuses, "Partner outreach is not sent from SourceDeck", no fake past performance rows by default, no fake prime partner rows by default, no Send Email button, no auto-send, no auto-submit, System Readiness/Flow remains removed, Phase 22B Capture Command Center remains intact, Phase 22C Solicitation Workspace remains intact, Phase 22D Vendor Quote Room + Pricing Worksheet remains intact, Response Desk Import Email intact, SAM Sprint Free=1 NAICS intact, every inline `<script>` block still parses (renderer boot guard), `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

### Docs

- `docs/audits/phase-22e-past-performance-capability-prime-audit.md` — audit + reuse inventory + safety/non-claims block.
- `docs/release-notes/phase-22e-past-performance-capability-prime.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-past-performance-prime.test.js` after `govcon-vendor-pricing.test.js`. No new dependency. No build script change. No publish flag change.

---

## What did NOT change

- **No capability statement sent.** No `Send Email` button anywhere. The Capability Statement Studio produces an in-page draft outline only.
- **No partner outreach sent.** Prime Partner Finder is manual entry only. "Contacted manually" is operator-recorded; SourceDeck does not send the contact.
- **No teaming outreach drafted, sent, or queued.** Placeholder only.
- **No bid or quote submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No live SAM call.**
- **No auto-send / no auto-submit.** No `auto_send:true`. No `auto_submit:true`. No `capability statement sent`. No `partner outreach sent`. No `teaming outreach sent`.
- **No fake past performance / prime partner data.** Default state renders only empty-state copy. Tests #12 and #13 enforce this.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.** No new IPC bridge. No new dependency.
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID. No `assets/sd-config.js` (site repo) touched.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim.
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **System Readiness / System Flow tab remains removed.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.**
- **Phase 20G `.btn-gold` guard preserved.**

---

## Tests run / results — all green

- `node test/govcon-past-performance-prime.test.js` — **24/24 PASS**
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

Additive. Revert this PR's single commit to roll back. Phases 22B, 22C, and 22D remain intact on `main`. No service module behaviour changes when the commit is reverted, since none was changed forward.

---

## Next phase

- **22F** FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders. The Phase 22E surfaces become upstream inputs to the Phase 22F Submission Readiness Gate.

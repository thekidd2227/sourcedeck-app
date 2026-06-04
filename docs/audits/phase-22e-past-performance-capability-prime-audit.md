# Phase 22E — Past Performance + Capability Statement + Prime Partner Finder — Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-22e-past-performance-capability-prime`
**Base:** `main @ d1a9bb2` (post-PR #63 — Phase 22D Vendor Quote Room + Pricing Worksheet merged).
**Scope:** Fourth buyer-facing GovCon operating surface. Implements **F16 Past Performance Library**, **F17 Capability Statement Tailoring**, **F13 Prime Partner Finder**, plus three labeled placeholder cards for **F14 Incumbent / Recompete Intelligence**, **F15 Pre-RFP Capture Tracker**, and a **Teaming Outreach Draft** placeholder.
**Posture:** Manual intake only. Local advisory outputs. **SourceDeck does not send capability statements or outreach.** **SourceDeck does not send partner outreach.** *"Contacted manually"* means the operator recorded outside activity — SourceDeck does not send the contact. **SourceDeck does not submit bids or quotes.** No outreach drafted, sent, or queued. No bid or quote submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.

---

## 0. Purpose

Phase 22D made SourceDeck useful *after requirements are extracted* (vendor sourcing + pricing). Phase 22E makes SourceDeck help contractors *prove they can do the work, tailor positioning, and find teaming paths*.

A government contractor opens the GovCon area and now sees, after the Phase 22D Vendor Quote Room + Pricing Worksheet:

- a **Past Performance Library** with manual project intake (title, agency, NAICS, contract number, period of performance, contract value, role, scope, relevance tags, CPARS notes, evidence notes);
- a **Capability Statement Studio** that combines target agency / solicitation / NAICS / certifications / core capabilities / differentiators / selected past performance into a **draft outline** (advisory, not sent);
- a **Prime Partner Finder** with manual prime intake (target NAICS / agency / location, prime name, partner status, fit notes, contact notes, teaming angle);
- labeled **Incumbent / Recompete Intelligence** placeholder card;
- labeled **Pre-RFP Capture Tracker** placeholder card;
- labeled **Teaming Outreach Draft** placeholder card.

Every entry is manual. Every output is a draft. **SourceDeck does not send capability statements or outreach. SourceDeck does not send partner outreach. SourceDeck does not submit bids or quotes.** Human approval is required for every action.

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — single-file Electron renderer. Phase 22E inserts the Past Performance + Capability + Prime surface immediately after the Phase 22D Vendor Quote Room + Pricing Worksheet (line 2432), so the buyer's GovCon click order is now: Capture Command Center → Solicitation Workspace → Vendor Quote Room + Pricing Worksheet → **Past Performance Library + Capability Statement Studio + Prime Partner Finder** → Pursuit Profile.
- `services/govcon/past-performance.js` — Node-side; 160 lines. **Not** wired across the preload bridge in this phase.
- `services/govcon/capability-statement-extractor.js` — Node-side; 187 lines. **Not** wired across the preload bridge in this phase.
- `services/govcon/prime-partner-finder.js` — Node-side; 1,038 lines. **Not** wired across the preload bridge in this phase.
- `services/govcon/incumbent-research.js` — Node-side; 150 lines. Surfaced as a labeled placeholder card only.
- `services/govcon/pre-rfp.js` — Node-side; 170 lines. Surfaced as a labeled placeholder card only.
- `services/govcon/stakeholder-graph.js`, `middleman-fit.js` — Node-side. Not wired.
- `services/response-desk.js` (24/24), `services/default-state-policy.js` (22/22) — untouched. Their guard tests continue to pass.
- `docs/product/phase-22a-govcon-product-market-fit-audit.md`, `phase-22a-govcon-feature-opportunity-map.md`, `docs/audits/phase-22b-*.md`, `docs/audits/phase-22c-*.md`, `docs/audits/phase-22d-*.md` — referenced; not edited.

### 1.2 What was deliberately not done

- **No capability statement sent.** No `Send Email` button. The Capability Statement Studio produces an in-page **draft outline** only — no email transport, no upload, no external POST.
- **No partner outreach sent.** The Prime Partner Finder is manual entry only. The "Contacted manually" status is operator-recorded; SourceDeck does not send the contact.
- **No teaming outreach drafted, sent, or queued.** The Teaming Outreach Draft surface is a labeled placeholder; no drafting wired.
- **No bid or quote submitted** to SAM.gov, PIEE, eBuy, GSA, agency portals, or email.
- **No live SAM call from this surface.**
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.**
- **No new IPC bridge added.** The renderer does its own local persistence (`sd.govcon.pastPerformance.v1`, `sd.govcon.capabilityStatement.v1`, `sd.govcon.primePartners.v1`).
- **No new dependency added.**
- **No edits to `.env`, no API keys printed, no secrets exposed, no stashes touched.**
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe ID. No `assets/sd-config.js` (site repo) touched.
- **No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim added.** No `watsonx-live`, no `signed and notarized`, no guaranteed contract / award / revenue / ROI / unlimited-AI claim.
- **No fake contracts, agencies, primes, or CPARS data.** All panels render empty-state copy until the operator enters real data. Tests #12 and #13 enforce this.

---

## 2. What was built

### 2.1 Renderer change — `sourcedeck.html`

A single new `<section id="gc-pp-cs-pp" data-section="govcon-past-performance-capability-prime">` outer block inserted inside `tab-govcon` immediately after the Phase 22D section. The block contains:

- **Past Performance Library** (`<section id="gc-pp">`)
  - Header + advisory copy.
  - `<details>`-collapsed manual intake form with 11 fields: project title, agency / customer, NAICS, contract number, period of performance, contract value (USD), role (Prime / Sub / Teaming Partner), scope summary, relevance tags, CPARS / performance notes, evidence file notes; plus Add + Refresh actions.
  - Past Performance Records table with 8 columns (Project, Agency / customer, NAICS, PoP, Value, Role, CPARS notes, Evidence) rendering an explicit empty-state default row.
- **Capability Statement Studio** (`<section id="gc-cs">`)
  - Header + draft/review copy ("Capability statement output is a draft. Review before sending. SourceDeck does not send capability statements or outreach.").
  - Form with: target agency, target opportunity / solicitation number, target NAICS, certifications / set-asides, core capabilities (CSV), differentiators (CSV), and a multi-select linked to the Past Performance Library.
  - Two actions: `Build Capability Statement Outline (draft)` and `Clear Outline`.
  - Tailored outline output container rendering an explicit empty-state default + "Draft — review before sending" suffix on every generated outline.
- **Prime Partner Finder** (`<section id="gc-ppf">`)
  - Header + safety copy ("Partner outreach is not sent from SourceDeck. *Contacted manually* means the user records outside activity. Human approval required for every action.").
  - `<details>`-collapsed manual intake form with 8 fields: target NAICS, target agency, target location, prime name, partner status (Research / Shortlist / Contacted manually / Interested / Not a fit / Follow up later), prime role / fit notes, contact notes, teaming angle.
  - Prime Partner Rows table with 7 columns rendering an explicit empty-state default row.
- **Three labeled placeholder cards** for Incumbent / Recompete Intelligence, Pre-RFP Capture Tracker, and Teaming Outreach Draft — each carrying a "Placeholder — wired in a later phase" / "Placeholder — human-approved only" mono label and a safety-microcopy line.
- **Shared "Human Review Required"** oxblood-tinted notice restating: *"SourceDeck does not submit bids or quotes. SourceDeck does not send capability statements or outreach. SourceDeck does not send partner outreach. No outreach is drafted, sent, or queued by these surfaces. No bid is submitted to SAM.gov, PIEE, eBuy, GSA, agency portals, or email. Past performance suggestions and capability statement outlines are advisory and require human review before proposal use. Human approval required for every action."*

A new inline `<script>` block at the end of `sourcedeck.html` implements `gcPpAddRecord`, `gcPpRender`, `gcCsSave`, `gcCsBuildOutline`, `gcCsClearOutline`, `gcPpfAddPartner`, `gcPpfRender`, and `gcPePerformanceRender`. State is local-only via `window.localStorage` under keys `sd.govcon.pastPerformance.v1`, `sd.govcon.capabilityStatement.v1`, `sd.govcon.primePartners.v1`. No fetch, no network, no IPC bridge change.

### 2.2 Capability Statement Outline composition

The draft outline is composed deterministically from operator-entered fields:

```
Target agency → Solicitation / opportunity → Target NAICS → Certifications / set-asides (operator confirms)
Core capabilities (CSV → bullets)
Differentiators (CSV → bullets)
Relevant past performance (selected from library → bullet list with CPARS notes)
Footer: "Draft outline. Capability statement output is a draft. Review before sending. SourceDeck does not send capability statements or outreach. Every claim above is operator-supplied — verify before proposal use."
```

No content is fetched, generated by an external service, or sent anywhere.

### 2.3 Test added — `test/govcon-past-performance-prime.test.js`

24 static + VM-based assertions; never executes app code or touches the network. Wired into `npm test` after `govcon-vendor-pricing.test.js`.

### 2.4 Package wiring — `package.json`

The new test is appended to the `test` script chain. No dependencies added. No build script changed.

### 2.5 Docs added

- `docs/audits/phase-22e-past-performance-capability-prime-audit.md` (this file).
- `docs/release-notes/phase-22e-past-performance-capability-prime.md`.

---

## 3. What was reused, not duplicated

| Existing surface / module | Reused by Phase 22E | How |
|---|---|---|
| Phase 22B Capture Command Center | Untouched; counters unchanged | Phase 22E state in separate localStorage keys |
| Phase 22C Solicitation Workspace | Untouched; downstream link via operator copy/paste only | No IPC |
| Phase 22D Vendor Quote Room + Pricing Worksheet | Untouched | Independent state |
| `services/govcon/past-performance.js` | Conceptual reuse — same intent (past-performance reuse for proposals) | No IPC bridge added; renderer holds operator-supplied records locally |
| `services/govcon/capability-statement-extractor.js` | Conceptual reuse — same intent | No IPC bridge added; renderer composes draft outline locally |
| `services/govcon/prime-partner-finder.js` | Conceptual reuse — same intent (prime partner sourcing) | No IPC bridge added |
| `services/govcon/incumbent-research.js` | Labeled placeholder card | No IPC wired |
| `services/govcon/pre-rfp.js` | Labeled placeholder card | No IPC wired |
| Phase 21F System Readiness removal | Preserved | `tab-sysflow` / Readiness/Flow labels remain absent |
| Phase 20G `.btn-gold` guard | Preserved | Cool-gold gradient + guard comment intact |
| Response Desk safety | Preserved | Import Email intact; no Send Email; `never auto-sends, never auto-submits` intact |
| SAM Sprint Free=1 NAICS plan gate | Preserved | `Free users: 1 NAICS` copy intact |

---

## 4. Safety / non-claims

- **No capability statement sent.** Capability Statement Studio produces a **draft outline** only; the outline renders inside the page, with explicit "draft — review before sending" suffix.
- **No partner outreach sent.** Prime Partner Finder is manual entry only. "Contacted manually" is operator-recorded; SourceDeck does not send the contact.
- **No teaming outreach sent.** Teaming Outreach Draft placeholder has no drafting wired.
- **No bid or quote submission.**
- **No auto-send. No auto-submit. No `auto_send:true`. No `auto_submit:true`. No `capability statement sent`. No `partner outreach sent`. No `teaming outreach sent`. No `submit automatically`. No `send automatically`.**
- **No fake past performance data.** All panels render empty-state copy until operator entry. Test #12 enforces no hardcoded fake markers (`W912DY-26-R-*`, `SP4701-26-R-*`, Department-of-Army/Navy/Air-Force `<td>` cells) inside the section.
- **No fake prime partner data.** Test #13 enforces zero hits for common real prime names inside the Prime Partner Finder section block.
- **Human review required.** Oxblood notice + per-surface advisory copy + draft-outline footer.
- **No compliance certification claim added.**
- **No watsonx-live / signed-and-notarized claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No pricing changed.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Renderer boot preserved** (7/7 — every inline `<script>` parses; 5 inline blocks now).
- **System Readiness / System Flow tab remains removed** (9/9).

---

## 5. Validation

The following gates passed on the branch HEAD prior to commit:

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
- `npm test` — all suites PASS
- `npm run release:evidence` — state `packaged_unsigned` (expected non-release env)
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected)

---

## 6. Rollback

Additive. Revert the single phase commit to roll back. Phases 22B, 22C, and 22D remain intact on `main`. The existing GovCon tab returns to its post-Phase-22D state.

---

## 7. Next phases

Per the canonical Phase 22A-1 roadmap:

- **22F** — FAR / Set-Aside Guardrails + Submission Readiness Gate + Human-Approved Submission Package Export + Proposal Outline / Technical Approach / Management+Staffing Plan Builders.

The Phase 22E Past Performance Library, Capability Statement Studio, and Prime Partner Finder become upstream inputs for the Phase 22F Submission Readiness Gate.

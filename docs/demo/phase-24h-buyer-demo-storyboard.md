# Phase 24H-PREP — Buyer Demo Storyboard (GovCon Capture OS, End-to-End)

**Date:** 2026-06-08
**Base:** `main @ a4fc8b6` (post-PR #89 — Stakeholder Graph runtime merged).
**Posture:** Docs / demo only. **No runtime change. No video. No screenshots.** Reflects the current shipped GovCon capture workflow.
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md` (unchanged).
**Companions:** `phase-24h-govcon-demo-walkthrough-script.md`, `phase-24h-demo-qa-checklist.md`, `docs/product/phase-24h-demo-refresh-positioning.md`.

---

## 1. Demo purpose

Show SourceDeck as a **GovCon Capture OS** for internal pursuit planning:

> *"Opportunity discovery to internal-review submission package, with human-approved outreach and no autonomous submission."*

The demo proves the **end-to-end capture workflow** is real and that the **no-send / no-submit / no-upload** boundary is enforced at every surface. The user decides, approves, sends, uploads, and submits **outside** SourceDeck.

---

## 2. Demo audience

- Small GovCon contractor (SMB prime / emerging small business).
- Capture manager running multiple pursuits.
- Owner-led SDVOSB / HUBZone / 8(a)-style business.
- Service contractor needing **qualification, compliance, vendors, past performance, and a review package** — wanting a human-in-the-loop workspace, not autopilot.

---

## 3. Demo narrative (sequence)

GovCon cold open → Capture Command Center → Daily Operating Rhythm → Deadline & Q&A Calendar → Pre-RFP Intelligence → Agency Targeting Insights → Solicitation Workspace → Compliance Matrix → Vendor Quote Room → Pricing Worksheet → Past Performance Library → Capability Statement Studio → Prime Partner Finder → Stakeholder Graph → Submission Readiness Gate → Internal Review Markdown Export → Audit Log / local-only evidence → closeout CTA (request access / paid pilot).

Runtime anchors (for the operator's reference; do not read aloud): `#gc-capture-cc`, `#gc-daily-rhythm`, `#gc-deadline-calendar`, `#gc-agency-targeting`, `#gc-sol-workspace` / `#gc-sol-matrix-table`, `#gc-vqr`, `#gc-pricing`, `#gc-pp`, `#gc-cs`, `#gc-ppf`, `#gc-stakeholder-graph`, `govcon-submission-readiness-gate`, `#gc-pkg-export`, `#gc-audit-log`.

---

## 4. Scenes

> **Global safety frame (state once at the open, reinforce as noted):** "Everything you see is sample demo data on my machine. SourceDeck helps me organize, draft, and review. It never sends email, never submits a bid, and never uploads to a portal — I do that myself, outside the app."

### Scene 0 — GovCon cold open
- **Purpose:** Establish that SourceDeck opens GovCon-primary, not as a generic CRM.
- **Talking points:** "This is a GovCon capture workspace. It opens straight into my pursuit board — the work, not a marketing screen."
- **Show:** GovCon-primary home; the `SAMPLE DEMO DATA` banner; the Mode indicator.
- **Buyer value:** Purpose-built for federal capture.
- **Safety boundary:** "Sample data only — nothing here is a live agency record."
- **Don't show:** Legacy commercial lead tools (keep "Show All Tools" collapsed).
- **Acceptance:** GovCon home loads; banner visible; no SyntaxError.

### Scene 1 — Capture Command Center
- **Purpose:** One board for all active pursuits + counts (active, deadlines, Q&A, bid/no-bid, sol-ready, vendors, proposals, approvals).
- **Talking points:** "Every pursuit and its state in one place — what's active, what's due, what's waiting on my approval."
- **Show:** `#gc-capture-cc` cards/counts; the bid/no-bid advisory.
- **Buyer value:** Nothing falls through the cracks.
- **Safety boundary:** "Bid/no-bid is advisory — I decide."
- **Don't show:** Real solicitation numbers or PII.
- **Acceptance:** Command Center populated from sample data; counts render.

### Scene 2 — Daily Operating Rhythm
- **Purpose:** A daily cadence of the next capture actions.
- **Talking points:** "This is my daily standup — the next moves across pursuits."
- **Show:** `#gc-daily-rhythm` list.
- **Buyer value:** Turns a pipeline into a routine.
- **Safety boundary:** "These are planning prompts, not automated actions."
- **Don't show:** Any auto-action toggles (there are none).
- **Acceptance:** Rhythm list renders from sample data.

### Scene 3 — Deadline & Q&A Calendar
- **Purpose:** Track response deadlines, Q&A windows, amendment dates.
- **Talking points:** "Q&A windows and deadlines are visible so I never miss a cutoff."
- **Show:** `#gc-deadline-calendar` entries.
- **Buyer value:** Deadline discipline.
- **Safety boundary:** "Dates are operator-entered; verify against the live SAM.gov posting."
- **Don't show:** Live SAM fetch.
- **Acceptance:** Calendar renders sample deadlines.

### Scene 4 — Pre-RFP Intelligence
- **Purpose:** Sources Sought / RFI / Industry Day context before the RFP drops.
- **Talking points:** "Capture starts before the RFP — this is where I track the early signals."
- **Show:** Pre-RFP cards.
- **Buyer value:** Earlier positioning.
- **Safety boundary:** "Reference only — advisory."
- **Don't show:** Any "contact the agency" automation (there is none).
- **Acceptance:** Pre-RFP cards render.

### Scene 5 — Agency Targeting Insights
- **Purpose:** Which agencies/offices fit my NAICS and capabilities.
- **Talking points:** "Targeting reads from my Pursuit Profile and NAICS — it's not a baked-in list."
- **Show:** `#gc-agency-targeting` list; note profile-driven NAICS (`#gc-naics-filter`).
- **Buyer value:** Focused targeting.
- **Safety boundary:** "Driven by my profile; advisory."
- **Don't show:** Real targeting data for a real buyer.
- **Acceptance:** Targeting renders from profile.

### Scene 6 — Solicitation Workspace
- **Purpose:** Shred a solicitation into Section L / M / B / C / H / K, PWS, forms, deadlines, risks.
- **Talking points:** "I break the solicitation into the sections that matter and map what's required."
- **Show:** `#gc-sol-workspace` sections.
- **Buyer value:** Faster, more complete read of the RFP.
- **Safety boundary:** "Advisory shred — I verify against the official document."
- **Don't show:** A real client solicitation.
- **Acceptance:** Workspace sections render.

### Scene 7 — Compliance Matrix
- **Purpose:** Per-requirement compliance tracking, human-marked.
- **Talking points:** "Each requirement gets a row. I mark it reviewed — it defaults to Draft, never 'done' on its own."
- **Show:** `#gc-sol-matrix-table`; manual "Mark Reviewed".
- **Buyer value:** No missed requirement.
- **Safety boundary:** "Human-marked; defaults to Draft."
- **Don't show:** Auto-complete (there is none).
- **Acceptance:** Matrix renders; default state is Draft.

### Scene 8 — Vendor Quote Room
- **Purpose:** Track vendor / subcontractor candidates and **manual** quote-request status.
- **Talking points:** "I line up sub candidates and track quote status — 'requested manually' means I reached out myself."
- **Show:** `#gc-vqr` table.
- **Buyer value:** Teaming readiness.
- **Safety boundary:** "SourceDeck does not send vendor outreach — status is what I did outside the app."
- **Don't show:** Real vendor contacts / pricing.
- **Acceptance:** Vendor table renders; "requested manually" language present.

### Scene 9 — Pricing Worksheet
- **Purpose:** Advisory price / margin with warning bands.
- **Talking points:** "Advisory pricing and margin — warning bands flag thin or missing inputs. I decide the number."
- **Show:** `#gc-pricing` outputs; margin/missing warnings.
- **Buyer value:** Pricing discipline.
- **Safety boundary:** "Advisory; never submitted."
- **Don't show:** Real bid pricing.
- **Acceptance:** Pricing outputs + warnings render.

### Scene 10 — Past Performance Library
- **Purpose:** Reusable past-performance citations, tailored per opportunity.
- **Talking points:** "My proof library — projects, agencies, NAICS, period, relevance, CPARS notes — reused and tailored per bid."
- **Show:** `#gc-pp` table incl. the Relevance column.
- **Buyer value:** Stronger, faster proposals.
- **Safety boundary:** "Operator-entered; verify CPARS before proposal use."
- **Don't show:** Real CPARS / contract numbers.
- **Acceptance:** PP table renders; empty state framing present when empty.

### Scene 11 — Capability Statement Studio
- **Purpose:** Draft/review capability content for internal use; optional **local/offline** paste import.
- **Talking points:** "I draft a tailored capability statement. I can paste existing text and it parses on-device — nothing is uploaded."
- **Show:** `#gc-cs` fields; the local import (`#gc-cs-import-text`); the internal-review disclaimer.
- **Buyer value:** Faster, targeted capability statements.
- **Safety boundary (verbatim):** "Internal review draft. SourceDeck does not send, submit, upload, or certify this content."
- **Don't show:** Any external send/upload (there is none).
- **Acceptance:** Studio fields render; import is local-only; disclaimer present.

### Scene 12 — Prime Partner Finder
- **Purpose:** Track candidate primes and **manual** teaming status.
- **Talking points:** "Candidate primes with fit and teaming angle — 'contacted manually' means I did it outside SourceDeck."
- **Show:** `#gc-ppf` table.
- **Buyer value:** Teaming pipeline.
- **Safety boundary:** "Partner outreach is not sent from SourceDeck."
- **Don't show:** Real prime names/contacts.
- **Acceptance:** Prime table renders; manual status chips present.

### Scene 13 — Stakeholder Graph
- **Purpose:** Who's around the opportunity — agency / program office / incumbent / prime-sub / internal owner — with **FAR-aware posture labels** and restricted-window warnings. **Never acts.**
- **Talking points:** "This shows the stakeholders and how I'm allowed to engage each — and it flags restricted communication windows. It is a reference; it never contacts anyone."
- **Show:** `#gc-stakeholder-graph` (by-opportunity, by-agency, teaming, internal-owner); posture labels (`restricted`, `reference_only`, `research_target`, `outreach_candidate`, `engagement_candidate`); restricted-window warning.
- **Buyer value:** Compliant, informed engagement planning.
- **Safety boundary (verbatim):** "Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."
- **Don't show:** Any "contact CO / email COR / backchannel" copy (there is none).
- **Acceptance:** Graph renders; posture labels + restricted-window warning visible; no action controls.

### Scene 14 — Submission Readiness Gate
- **Purpose:** Advisory red/yellow/green readiness; **never auto-submits**.
- **Talking points:** "A readiness score across the checklist — it tells me what's missing. It never submits anything."
- **Show:** `govcon-submission-readiness-gate`; "Human Review Required" notice.
- **Buyer value:** Confidence before the user submits externally.
- **Safety boundary:** "Advisory; the user completes official submission outside SourceDeck."
- **Don't show:** Any "Submit" control (there is none).
- **Acceptance:** Readiness renders; no submit control.

### Scene 15 — Internal Review Markdown Export
- **Purpose:** Bundle the pursuit into a **local** internal-review Markdown package.
- **Talking points:** "I export a review package as Markdown — locally. The header says exactly what it is."
- **Show:** `#gc-pkg-export`; the export preview header.
- **Buyer value:** Shareable internal review without leaving the device.
- **Safety boundary (verbatim):** "INTERNAL REVIEW DRAFT — NOT SUBMITTED" and "SourceDeck does not submit, upload, email, or transmit this package."
- **Don't show:** Any email/upload of the package.
- **Acceptance:** Export produces local Markdown; disclaimers present; no transmission.

### Scene 16 — Audit Log / local-only evidence
- **Purpose:** Show the local audit log of capture actions.
- **Talking points:** "Every meaningful action is logged locally — my own evidence trail."
- **Show:** `#gc-audit-log` panel.
- **Buyer value:** Traceability.
- **Safety boundary:** "Local only; nothing leaves the device."
- **Don't show:** Real audit entries with PII.
- **Acceptance:** Audit log panel present and populated from the demo session.

### Scene 17 — Closeout CTA
- **Purpose:** Move to a paid-pilot / request-access conversation.
- **Talking points:** "If this fits how you run capture, the next step is a guided pilot with your own profile and NAICS. SourceDeck organizes, drafts, and reviews — you decide and submit."
- **Show:** Nothing new; restate the boundary.
- **Buyer value:** Clear, low-risk next step.
- **Safety boundary:** No guarantee of award/revenue; no certification claims.
- **Don't show:** Pricing unless asked (if asked, cite `pricing-source-of-truth.md`).
- **Acceptance:** Buyer can restate the no-send/no-submit boundary back to you.

---

## 5. Explicit exclusions

- No live SAM run.
- No real inbox / Response Desk send.
- No private vendor / customer data.
- No `.env` / API keys on screen.
- No submit / send / upload from any surface.
- No guarantee of award / revenue.
- No unsupported compliance certifications (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- No public signed-release claim (current builds are unsigned dev builds) unless an exact release-evidence artifact proves otherwise.
- **No videos required in this phase** — recording remains deferred (see positioning doc).

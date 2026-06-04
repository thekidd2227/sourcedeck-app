# Phase 23F — GovCon Buyer Demo Shot List

**Date:** 2026-06-04
**Use:** Storyboard for recording the SourceDeck GovCon Capture OS demo video. Pair with `phase-23f-govcon-demo-master-script.md` (narration source) and `phase-23f-govcon-demo-recording-checklist.md` (pre / during / post checks).
**Target runtime:** 5:00 (compact buyer demo). Add §19–§22 for the 15-minute deep-dive.

> Recording rules baked in:
> 1. The build on screen is an **unsigned development build for demo purposes** unless the Phase 23E verification chain has completed for the specific artifact.
> 2. No real agency / vendor / past-performance / solicitation data on screen. Sample demo data only.
> 3. Generated video and screenshot files MUST land in `/tmp` or `.qa/` only. NEVER `git add` them.

---

## Shot 1 — Cold open on GovCon default tab

- **Screen area:** Full SourceDeck window. Sidebar + GovCon pane visible.
- **Narrator line:** *"GovCon Capture OS. You find an opportunity, triage the solicitation, line up vendor pricing, prove past performance, build the team, and prepare a submission package — one workflow, human-approved at every step."*
- **User action:** None. Hold the frame after launch. Confirm the active pane is `tab-govcon` (Phase 23C default).
- **Expected visible result:** Top-left brand sub-label reads **"GovCon Capture OS"**. The sidebar's first nav-section is **GovCon Capture OS** with `GovCon` highlighted as active.
- **Safety note:** No commercial-CRM dashboard, no Lead Generator. If the first frame is `tab-dashboard`, STOP — Phase 23C regression.
- **Seconds:** 6

## Shot 2 — GovCon Capture OS sidebar position

- **Screen area:** Zoom on sidebar top: brand block → "GovCon Capture OS" label → GovCon / Outreach / Prime Partners buttons → "Other business tools — Shown" toggle.
- **Narrator line:** *"GovCon is the primary navigation. Lead Generator, Email Tracker, Daily Ops, Delivery — every legacy commercial tool is one click below, under 'Other business tools'."*
- **User action:** Slow vertical pan from the brand block down to the `Other business tools — Shown` toggle button.
- **Expected visible result:** Single `GovCon Capture OS` separator label above the three GovCon buttons. Below them, the `Other business tools` toggle followed by six "Other business tools · X" labelled sections (Operations, Alerts, Workflow, Tools, Client, Intelligence).
- **Safety note:** None of the "Other business tools · X" sections are hidden. The toggle reads "Shown".
- **Seconds:** 8

## Shot 3 — GovCon Mode indicator

- **Screen area:** Top of the GovCon pane. `#gc-mode-indicator` block visible.
- **Narrator line:** *"You're in GovCon Mode. Capture OS workflow."*
- **User action:** Hover the GovCon Mode indicator headline.
- **Expected visible result:** "GovCon Mode — Capture OS workflow" headline + the Phase 23B sub-copy describing the workflow scope. Brand sub-label "GovCon Capture OS" still visible top-left.
- **Safety note:** Indicator is descriptive, not a status badge that asserts "live". No "watsonx live" copy anywhere in frame.
- **Seconds:** 4

## Shot 4 — Load Sample GovCon Demo Data

- **Screen area:** Phase 23A Demo Mode block at the top of the GovCon pane.
- **Narrator line:** *"That just populated every section with sample data tagged as a demo. Real fielded data would replace this. The Markdown export we generate at the end will carry a 'SAMPLE DEMO DATA — Replace before proposal use' warning."*
- **User action:** Click **Load Sample GovCon Demo Data**. Wait for re-render.
- **Expected visible result:** Capture board populates with sample pursuits; Solicitation Workspace shows extracted lines; Vendor Quote Room shows rows; Past Performance Library populates; Submission Readiness checklist shows a mix of Reviewed / In progress.
- **Safety note:** All five Phase 23D **Last Updated** chips flip from "Not yet" to a real timestamp within ~2.5s (the polling interval). Sample-data rows visibly carry the demo tag.
- **Seconds:** 15

## Shot 5 — Capture Command Center

- **Screen area:** `#gc-capture-cc` section. Eight stat cards visible.
- **Narrator line:** *"Where a contractor's day starts. Eight panels: active pursuits, deadlines this week, Q&A and amendment watch, bid/no-bid review, solicitation readiness, vendor and subcontractor needs, proposal package status, pending human approvals."*
- **User action:** Slow horizontal pan across the stat cards. Hover the **Last Updated** chip in the header to highlight the timestamp.
- **Expected visible result:** Eight cards with non-zero sample counts. Header chip reads `Last updated: YYYY-MM-DD HH:MM`.
- **Safety note:** No live SAM call is made. The "Add an opportunity manually (no live SAM call)" button label is visible.
- **Seconds:** 18

## Shot 6 — Solicitation Workspace extraction

- **Screen area:** `#gc-sol-workspace` section. Intake form + extracted sections list.
- **Narrator line:** *"You paste solicitation text here. Local deterministic extraction — no API key, no LLM dependency. Section L, Section M, PWS/SOW, required forms, deadlines, risks — all separated."*
- **User action:** Scroll to show the extracted Section L / Section M / PWS lists populated by sample data.
- **Expected visible result:** Each extracted-section list shows several rows; each row carries the "Draft — Not Reviewed" default status.
- **Safety note:** Every row defaults to Draft. SourceDeck does not mark anything Reviewed automatically.
- **Seconds:** 22

## Shot 7 — Compliance Matrix

- **Screen area:** Compliance Matrix table inside the Solicitation Workspace.
- **Narrator line:** *"Build Compliance Matrix gives you 10 columns: requirement ID, source section, requirement text, mandatory/optional, proposal section, owner, evidence needed, status, risk flag, notes. Mandatory-vs-optional is verb-driven. Proposal section is source-driven. Owner / evidence / notes are operator-assigned."*
- **User action:** Scroll horizontally across all 10 matrix columns.
- **Expected visible result:** Every visible row has Status = "Draft — Not Reviewed". Click **Mark Requirement Reviewed** on ONE row → that row flips to Reviewed and the Solicitation Workspace's **Last Updated** chip re-stamps.
- **Safety note:** The Submission Readiness section-status rollup at the bottom is read-only and matches the matrix progress.
- **Seconds:** 25

## Shot 8 — Vendor Quote Room

- **Screen area:** `#gc-vqr` section. 3 stat cards + vendor table.
- **Narrator line:** *"You log vendor needs here. SourceDeck does not send the quote request — you do that outside the app, then record what you sent, when, and what came back. Credentials, insurance, bonding, W-9, SAM.gov, CAGE/UEI, clearance — checkboxes. Every quote entry is 'Requested manually'."*
- **User action:** Hover one sample vendor row to show the "Requested manually" status badge.
- **Expected visible result:** Vendor table shows sample rows; status column is "Requested manually" for every row.
- **Safety note:** No vendor outreach is sent. The shared **Last Updated** chip in the Vendor Quote Room header covers both Vendor and Pricing data.
- **Seconds:** 16

## Shot 9 — Pricing Worksheet

- **Screen area:** `#gc-pricing` section. Cost inputs + advisory Estimated Price / Margin.
- **Narrator line:** *"Pricing computes an advisory estimated price and margin from labor, materials, vendor cost, travel, equipment, overhead %, profit %, contingency %. Below 5% or above 35% → warning. None of this is submitted anywhere."*
- **User action:** Type into the Labor field, then Materials, then Profit %. Show the Estimated Price + Estimated Margin update live. Trigger the `< 5%` warning by lowering Profit %.
- **Expected visible result:** Estimated Price + Margin recompute on every keystroke; warning banner appears under the margin row.
- **Safety note:** Numbers are sample numbers, not real cost data. No bid is submitted.
- **Seconds:** 22

## Shot 10 — Past Performance Library

- **Screen area:** `#gc-pp` section. Past performance records table.
- **Narrator line:** *"Past Performance Library is operator-typed — project, agency, NAICS, contract number, period of performance, value, role, scope, relevance tags, CPARS notes, evidence."*
- **User action:** Scroll the records table. Hover a sample row.
- **Expected visible result:** Records table shows sample rows; columns visible: project, agency, NAICS, role, value.
- **Safety note:** Past performance is advisory only. Header chip belongs to the combined past-performance + capability + prime-partner group.
- **Seconds:** 14

## Shot 11 — Capability Statement Studio

- **Screen area:** `#gc-cs` section. Target-agency / NAICS / capabilities form + outline output.
- **Narrator line:** *"Capability Statement Studio combines your target agency, target NAICS, certifications, core capabilities, differentiators, and selected past performance into a draft outline. Drafts only. SourceDeck does not send capability statements."*
- **User action:** Click **Build Capability Statement Outline (draft)** if not already populated by demo data; scroll the outline.
- **Expected visible result:** Outline renders with a "Draft — review before sending. SourceDeck does not send capability statements or outreach" footer.
- **Safety note:** Draft footer must be visible in frame for the entire shot.
- **Seconds:** 14

## Shot 12 — Prime Partner Finder

- **Screen area:** `#gc-ppf` section. Operator-entered prime partner rows.
- **Narrator line:** *"Prime Partner Finder is operator-entered — research, shortlist, contacted manually, interested, not a fit, follow up later. Partner outreach is not sent from SourceDeck."*
- **User action:** Scroll the prime-partner table. Hover a "contacted manually" row.
- **Expected visible result:** Status column visible with `contacted manually` / `interested` / `not a fit` / `follow up later` chips.
- **Safety note:** No outreach is dispatched. Manual entry only.
- **Seconds:** 12

## Shot 13 — Submission Readiness Gate

- **Screen area:** `#gc-sub-gate` section. Score + Status + Final Package Status + checklist.
- **Narrator line:** *"This is the final control. Submission checklist, advisory readiness score, package status. 'Ready for Human Review' appears only when every required item is Reviewed and the final approval is Reviewed. SourceDeck does not submit, upload, email, or transmit this package."*
- **User action:** Scroll the checklist. Click **Build Package Preview**. Scroll the rendered preview.
- **Expected visible result:** Preview renders with the Phase 22F included-section summaries + the bottom safety microcopy "Internal review preview only. SourceDeck does not submit, upload, email, or transmit this package."
- **Safety note:** Even when every checklist item is Reviewed, no submission action exists. The next shot (#15) is the only "delivery" action.
- **Seconds:** 24

## Shot 14 — Last Updated chips

- **Screen area:** Pan across the headers of all 5 Phase 23D-instrumented sections (`gc-capture-cc` → `gc-sol-workspace` → `gc-vqr` → `gc-pp` → `gc-sub-gate`) zooming on each chip.
- **Narrator line:** *"Cold open: 'Not yet'. Real change: stamped with a local ISO timestamp. Persisted-from-prior-session data does not fake a stamp. Polling every 2.5 seconds catches edits, demo-mode loads, and external storage changes."*
- **User action:** Slow vertical pan. Pause briefly on each chip.
- **Expected visible result:** Each chip reads `Last updated: YYYY-MM-DD HH:MM`. No chip reads "Not yet" at this point in the demo (sample data was loaded in Shot 4).
- **Safety note:** The timestamps are local-only. No remote sync, no telemetry call.
- **Seconds:** 14

## Shot 15 — Internal Review Markdown export

- **Screen area:** Submission Readiness Gate → package form action row. Then split-screen with the Downloads folder / Finder window.
- **Narrator line:** *"Export Internal Review Markdown. Browser Blob download. No IPC, no fetch, no network call. Header reads 'INTERNAL REVIEW DRAFT — NOT SUBMITTED'. The safety boundary is restated inline. Because Demo Mode is active, the export carries 'SAMPLE DEMO DATA — Replace before proposal use'."*
- **User action:** Click **Export Internal Review Markdown**. Switch to Finder to show the file. Open the `.md` in a code editor on a second monitor / split.
- **Expected visible result:** Filename ends `INTERNAL-REVIEW-DRAFT.md`. Opening the file shows the header on line 1, the no-submit blockquote, then the SAMPLE DEMO DATA warning, then the package metadata, then the Last Updated table, then the safety footer + `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`.
- **Safety note:** **This is the proof shot.** If the file does NOT contain the SAMPLE DEMO DATA warning while Demo Mode is on, stop the recording — Phase 23D regression.
- **Seconds:** 30

## Shot 16 — No-submit safety language

- **Screen area:** Submission Readiness Gate footer + the Markdown editor showing the safety blockquote.
- **Narrator line:** *"SourceDeck prepares internal review materials. It does not submit, upload, email, or transmit bids, quotes, or government responses. No portal upload. No SAM / PIEE / eBuy / GSA interaction. No email transmission."*
- **User action:** Hold the Markdown safety blockquote in frame. Then pan to the on-screen "Human Review Required" notice at the bottom of the Submission Readiness Gate section.
- **Expected visible result:** Both copies of the safety language are visible. No Send Email / Submit Bid / Submit Quote button is anywhere in frame.
- **Safety note:** **This is the second proof shot.** If a "Send Email" button is visible anywhere in this frame, STOP — Response Desk / GovCon regression.
- **Seconds:** 18

## Shot 17 — Show All Tools toggle

- **Screen area:** Sidebar. The `Other business tools — Shown / Hidden` toggle button.
- **Narrator line:** *"Show All Tools collapses the legacy commercial groups. Click again to bring them back. Nothing is removed from the DOM — every commercial tab is still keyboard-reachable."*
- **User action:** Click the toggle once → the six "Other business tools · X" sections collapse. Click again → they re-expand.
- **Expected visible result:** Sections collapse via `display:none` (Phase 23C). The toggle text flips Shown ↔ Hidden. The GovCon Capture OS primary section stays visible at all times.
- **Safety note:** The Phase 23E Last Updated chips and Markdown export button are unchanged by the toggle.
- **Seconds:** 12

## Shot 18 — Close / CTA

- **Screen area:** Full SourceDeck window with the GovCon pane scrolled to the top + Markdown editor visible on a second monitor / split.
- **Narrator line:** *"Six sections, one final gate, a local Markdown artifact your contracting team can take to a contracting officer — and one safety boundary that doesn't move: SourceDeck does not submit, upload, email, or transmit. If that boundary works for how your team buys, the next step is a guided pilot with your actual NAICS, your actual past performance, and one live solicitation you're triaging this quarter. Want to put it on the calendar?"*
- **User action:** End on the GovCon Capture Command Center with the brand sub-label visible top-left.
- **Expected visible result:** Final frame shows the brand sub-label "GovCon Capture OS" + the Capture Command Center stat cards. Last frame held for ~2 seconds before fade.
- **Safety note:** The final frame must NOT show a "Send Email", "Submit Bid", or "Submit Quote" button anywhere. The final frame must NOT show any "signed and notarized" / "FedRAMP certified" / "watsonx live" copy.
- **Seconds:** 22

**5-minute demo total:** ~296 seconds (≈ 4:56). Comfortable padding for natural pauses.

---

## Optional 15-minute deep-dive add-ons

### Shot 19 — Compliance matrix detail (+90s)

Walk every column. Show Owner / Evidence / Status / Notes are operator-editable. Click **Mark Requirement Reviewed** on a row, then revert. Pan to the Submission Readiness section-status rollup. Hover the Solicitation Workspace **Last Updated** chip.

- **Safety note:** Mark Reviewed must be a manual action — no auto-mark anywhere.

### Shot 20 — Pricing Worksheet math (+90s)

Type real numbers into Labor, Materials, Vendor, Overhead %, Profit %. Show Estimated Price + Margin updating. Trigger `< 5%` warning. Trigger `> 35%` warning. Trigger missing-cost warning (Labor = 0).

- **Safety note:** All numbers are sample. No bid submitted.

### Shot 21 — Vendor Quote Room credential checklist (+60s)

Open the intake form. Walk the 7 credential checkboxes. Add one row with status `Requested manually`. Reiterate: SourceDeck did not send the request.

### Shot 22 — Submission Readiness scoring (+90s)

Set 3 items to Reviewed, 2 to In progress, 1 to Blocked. Show the score change. Show status at `Not Ready` because of Blocked. Clear the Blocked. Show status flip to `Needs Review`. Mark every required item Reviewed AND final approval Reviewed. Show `Ready for Human Review` appear.

### Shot 23 — Markdown deep-dive (+120s)

Re-export the Markdown. Open the `.md` in a code editor. Walk the buyer through the 8-section structure (Header → safety blockquote → SAMPLE DEMO DATA → metadata → included sections → Last Updated table → safety footer → end-of-draft footer).

**15-minute demo total:** ~5:00 base + ~7:30 add-ons = ~12:30. Add ~2:30 for objection handling / Q&A buffer.

---

## Safety stop conditions

Stop the recording IMMEDIATELY if any of the following appears on screen:

1. A `Send Email` button anywhere.
2. A `Submit Bid` or `Submit Quote` button anywhere.
3. A System Readiness or System Flow tab in the sidebar.
4. Any "SourceDeck is signed and notarized" / "Apple notarized" / "FedRAMP certified" / "SOC 2 certified" / "CMMC certified" / "HIPAA certified" / "HITRUST" / "ISO 27001" copy.
5. Any "watsonx live" copy.
6. Any positive "package submitted" / "bid submitted" / "quote submitted" / "government response submitted" / "portal upload completed" copy.
7. Real customer PII / real solicitation content from another engagement / real vendor names with real contact info.
8. Markdown export missing the SAMPLE DEMO DATA banner while Demo Mode is active.
9. Markdown export missing the INTERNAL REVIEW DRAFT — NOT SUBMITTED header or footer.
10. Boot-time SyntaxError / ReferenceError / TypeError in the Electron devtools console.

In every case, halt, investigate, and do not resume recording until the regression is fixed.

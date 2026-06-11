# Phase 25M — SAM Pipeline + Calendar Repair + Proposal Intake · Release Note

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## What ships

1. **SAM.gov key saved/missing mismatch fixed.** `_gcWizSaveKey()` paints the saved status optimistically on every visible surface (Setup wizard `#gcwiz-sam-status`, Settings `#out-samkey-status`, GovCon Pipeline `#gc-sam-key-status`) and re-polls `sd.credentials.status()` once at 250 ms to verify. The raw key is never written back to the DOM.
2. **GovCon Pipeline section.** New `#gc-sam-pipeline` at the top of GovCon. Compact filter row (keyword · NAICS · set-aside · place of performance · closing window · status). User-triggered Search SAM.gov + Refresh buttons. Results render inside SourceDeck. Per-row actions: View Details · Save to SourceDeck · Mark Pursue · Archive · Open SAM.gov Source. Search routes through `sd.govcon.samSearch(filters)`; save/pursue/archive routes through `sd.govcon.opportunities.upsert(opp)`. **No auto-search on page load.**
3. **Saved opportunities flow into Dashboard active pursuits.** Save / Mark Pursue trigger `renderDashboardLaunchpad()` so counts refresh immediately.
4. **Proposal Workspace solicitation selector.** `#pw-solicitation-intake` lists SAM.gov-imported opportunities (from `sd.govcon.opportunities.list()`) alongside locally uploaded / pasted records. Upload accepts `.pdf` / `.docx` / `.txt` / `.md` (PDF/DOCX = file attachment + paste fallback). Extract Key Details produces 6 FAR-aligned sections (Solicitation Metadata & Summary · Scope of Work · Place of Performance · Subcontractor ID & Proposal Prep · Compliance & Submission Requirements · Site Visit Details & Logistics), each with Notes · Draft · Approve · Needs revision · Retry with notes controls.
5. **Dashboard "Start a pursuit" card.** New launchpad card with three actions: Search SAM.gov · Upload Solicitation / RFQ / RFP · Paste Solicitation Text. Routes into GovCon Pipeline or Proposal Workspace.
6. **Calendar Delete repaired.** `calCardDelete()` now mutates `_state.events` directly instead of going through the modal. Toasts a clear error if no row matched; success toast is explicit about local-only scope. Refreshes Dashboard launchpad counts on delete.
7. **Compact ICS help `?` icon.** The full-text "How do I get an .ics file?" button in the Calendar header becomes a small 22×22 circular `?` icon. Hover opens the help panel; click toggles. Panel content (Google / Apple-iCloud / Outlook / Calendly steps + safety footer) is preserved.

## Safety

- No `.env` touched
- No secrets printed
- No raw API key in renderer markup
- No auto-search on page load
- No portal upload (SAM.gov, PIEE, eBuy, GSA, agency, acquisition.gov)
- No email sending · No automatic vendor/agency contact
- No bid/quote/proposal submission
- No calendar provider upload / sync · No live calendar sync claim
- No Google / Microsoft / iCloud password or OAuth requirement
- No pricing source change · No checkout/payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send/no-submit/no-upload boundary preserved
- Phase 23C reachability invariant preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25m-sam-key-status.test.js`
- `test/phase-25m-sam-in-app-search-save.test.js`
- `test/phase-25m-calendar-delete-help.test.js`
- `test/phase-25m-proposal-solicitation-selector.test.js`
- `test/phase-25m-dashboard-govcon-ux-cleanup.test.js`

**Full gate results:**

- `npm test` → 64 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings (manual-only items unchanged).
- `node scripts/release-check.js` → privacy gate passes (macOS signing env left to operator).

## Operator next step

Merge when green, rebuild app package, refresh Day 0 package, then retest SAM search and calendar delete manually.

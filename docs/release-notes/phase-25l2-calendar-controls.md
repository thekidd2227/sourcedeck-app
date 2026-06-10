# Phase 25L-2 — Calendar Controls + Settings ICS Import · Release Note

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-2 (PR 2 of 5)
**Builds on:** Phase 25L-1 (merged in #112)

---

## What ships

1. **Calendar event card inline actions** on every card: 👁 View · ✎ Edit · ✓ Mark Complete · ↻ Reschedule · 🗑 Delete.
2. **Local-only delete confirmation**: *"This removes it from SourceDeck only. It does not delete it from Google, iCloud, Outlook, or any external calendar."* Modal-level `calDeleteEvent({ skipConfirm })` accepts an opt-out so the card-level handler does not display the same prompt twice.
3. **Per-card footer note**: *"Local SourceDeck event only. Editing or deleting here does not change your external calendar."*
4. **Imported ICS events are editable locally** — the Edit button opens the same modal used for manual events; saving writes back to local state only.
5. **"How do I get an .ics file?" help icon** in the Calendar pane header that toggles a help panel covering Google Calendar, Apple Calendar / iCloud, Outlook, and Calendly export steps plus a safety footer reiterating that ICS import does NOT give SourceDeck access to the user's email inbox.
6. **Settings → Calendar Import card** sits right after the API Keys card. Three actions: 📅 Import .ics File · 📋 Paste Calendar Text · ? How do I get an .ics file? Each delegates back to the existing Calendar pane handlers. Copy explicitly disclaims OAuth and password collection.

## What does NOT ship in 25L-2

- Response Desk subtitle removal + Email Import boundary → **Phase 25L-3**
- Settings → Email Import placeholder → **Phase 25L-3**
- Proposal Workspace solicitation upload + extraction → **Phase 25L-4**
- Subcontractor research + Incumbents/Awards workflow + Hunter.io key → **Phase 25L-5**

## Safety

- No `.env` touched
- No secrets printed
- No stashes touched
- No new paid dependencies
- No deploy / public release / public download
- No live SAM run
- No email sending
- No vendor / agency auto-contact
- No bid / quote / proposal submission
- No portal upload
- No calendar provider upload / sync
- No Google / Microsoft / iCloud password or OAuth requirement
- No pricing source change
- No checkout / payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send / no-submit / no-upload boundary preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25l2-calendar-edit-delete-help.test.js`
- `test/phase-25l2-settings-calendar-import.test.js`
- Wired into `npm test`.

**Full gate results:**
- `npm test` → 59 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings (manual-only items unchanged).
- `node scripts/release-check.js` → privacy gate passes (macOS signing env left to operator).

## Operator next step

Review and approve PR 25L-2. Once it merges, proceed to **Phase 25L-3** (Response Desk simplification + Email Import boundary).

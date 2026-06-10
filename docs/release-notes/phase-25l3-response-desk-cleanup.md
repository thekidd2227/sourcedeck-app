# Phase 25L-3 — Response Desk Cleanup + Email Import Boundary · Release Note

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-3 (PR 3 of 5)
**Builds on:** Phase 25L-1 (#112) + Phase 25L-2 (#113)

---

## What ships

1. **Response Desk pane is title-only** (`Response Desk`); the operational subtitle (`Inbound reply triage · intent detection · next-action routing · draft-only responses`) is removed.
2. **No ICS / calendar controls** live inside Response Desk. Calendar setup remains in the Calendar pane and in Settings → Calendar Import.
3. **Import-first header copy is provider-gated**: Import Email uses the configured email integration if Settings → Email Import is set up; otherwise the user pastes the reply manually. The copy explicitly says no auto-scan and no password collection.
4. **Airtable Email Events ledger red banner removed from buyer UI.** The pre-25L-3 red `⚠ EMAIL EVENTS LEDGER UNAVAILABLE` / `⚠ Ledger: …` surfaces fall back to a calm "No email integration configured · Set up Email Import in Settings when available" placeholder. Operator-side diagnostic data is preserved in `_emailTrackerState.error`.
5. **Settings → Email Import card** lands between Calendar Import and Automation Config. Copy:
   - Future secure Gmail/Outlook OAuth integration — not active in this build unless configured by the operator.
   - SourceDeck never requests Gmail, iCloud, or Outlook passwords.
   - Importing an .ics calendar file does **not** give SourceDeck access to your email inbox.
   - SourceDeck does not auto-scan email. SourceDeck never sends email. SourceDeck does not upload your mailbox anywhere.

## What does NOT ship in 25L-3

- Proposal Workspace solicitation upload + extraction + section-level drafting → **Phase 25L-4**
- Subcontractor research workflow + Incumbents & Awards research workflow + Hunter.io key → **Phase 25L-5**
- Actual live Gmail / Outlook OAuth integration — deferred to a future secure phase. Phase 25L-3 ships only the placeholder + boundary copy.

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
- No automatic email scanning
- No automatic mailbox upload
- No pricing source change
- No checkout / payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send / no-submit / no-upload boundary preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25l3-response-desk-cleanup.test.js`
- `test/phase-25l3-email-import-boundary.test.js`
- Wired into `npm test`.

**Full gate results:**
- `npm test` → 61 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings.
- `node scripts/release-check.js` → privacy gate passes.

## Operator next step

Review and approve PR 25L-3. Once it merges, proceed to **Phase 25L-4** (Proposal Workspace solicitation upload + 5-section extraction + section-level drafting).

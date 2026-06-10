# Phase 25L-3 — Response Desk · Email Import Boundary

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-3 (PR 3 of 5)
**Builds on:** Phase 25L-1 (#112) + Phase 25L-2 (#113)

---

## 1. Mission

Simplify the Response Desk surface and draw an explicit line between calendar import and email import. Stop surfacing internal Airtable Email Events ledger errors as a red banner to buyer-facing UI. Add Settings → Email Import as the canonical home for future secure Gmail / Outlook OAuth integration.

## 2. Response Desk pane changes

- Pane title is **`Response Desk`** only. Operational subtitle (`Inbound reply triage · intent detection · next-action routing · draft-only responses`) is removed.
- No ICS / calendar import controls live inside the pane. Calendar setup remains in the Calendar pane and in Settings → Calendar Import.
- The import-first header keeps the two-button workflow (📥 Import Email · 📋 Paste Reply Manually) but the helper copy under it now spells out provider gating:

  > Import Email uses your configured email integration if set up in Settings → Email Import. Otherwise, paste the reply manually. No email integration configured. Paste the reply manually or set up email import in Settings when available. SourceDeck does not auto-scan email and never requests Gmail, iCloud, or Outlook passwords.

## 3. Airtable Email Events ledger — buyer UI neutralized

The pre-25L-3 Email Tracker rendering bubbled the internal Airtable HTTP error to the buyer via two surfaces:

- A red `⚠ Ledger: Airtable Email Events ledger fetch failed: HTTP …` sub-header
- A red `⚠ EMAIL EVENTS LEDGER UNAVAILABLE` placeholder table row

Phase 25L-3 replaces both with a calm "no email integration configured" copy that steers the user to Settings → Email Import:

- Sub-header on error: `No email integration configured · Set up Email Import in Settings when available`.
- Table body on error: a centered placeholder reading *"No email integration configured · Connect Gmail or Outlook in a future secure OAuth phase via Settings → Email Import. For now, paste replies manually in Response Desk."*

The internal Airtable HTTP error is **preserved** in `_emailTrackerState.error` for operator-side diagnostics. We just stop shouting it at the buyer.

The Email Tracker pane (`tab-email`) was removed from active sidebar nav in Phase 25L-1; it lives only in the hidden reachability buffer. Phase 25L-3 ensures that even when it is reached programmatically (e.g. by an older shortcut), the screen does not display a procurement-misleading "ledger unavailable" red banner.

## 4. Settings → Email Import card

`#settings-email-import-card` (`data-settings-section="email-import"`) sits between Calendar Import and Automation Config in the Settings pane.

Copy:

- *"Future secure Gmail/Outlook OAuth integration. Not active in this build unless configured by the operator. For now, paste replies manually in Response Desk. SourceDeck never requests Gmail, iCloud, or Outlook passwords."*
- *"Importing an .ics calendar file does **not** give SourceDeck access to your email inbox. Calendar import and email import are separate."*
- *"SourceDeck does not auto-scan email. SourceDeck never sends email. SourceDeck does not upload your mailbox anywhere."*

State indicator: `#s-email-import-state` (`data-settings-email-import-state="true"`) defaults to **Not configured**. A future PR can flip this to **Configured** once a secure OAuth flow ships.

## 5. ICS-vs-email separation, in three places

The same separation statement now appears on three surfaces so a buyer can land on any of them and walk away without confusion:

1. Phase 25L-2 — Calendar pane ICS help panel (already shipping)
2. Phase 25L-2 — Settings → Calendar Import card (already shipping)
3. Phase 25L-3 — Settings → Email Import card (this PR)

Plus the Response Desk import-first header reiterates the no-password posture.

## 6. Boundaries preserved

- No live Gmail / Outlook / iCloud OAuth in this phase.
- No password collection on any surface.
- No automatic email scanning.
- No automatic email sending.
- No automatic mailbox upload.
- Phase 25A no-send / no-submit / no-upload boundary preserved.
- Phase 25C master delivery method preserved.
- Phase 23C reachability invariant preserved.

## 7. Tests

- `test/phase-25l3-response-desk-cleanup.test.js` — pane title is "Response Desk" only · subtitle removed · provider-gated copy · no ICS/calendar controls in pane · Email Events ledger red banner removed.
- `test/phase-25l3-email-import-boundary.test.js` — Email Import card present · OAuth-as-future copy · no-password posture · ICS-vs-email separation reiterated · no-auto-scan / no-auto-send disclaimers · placement after Calendar Import + before Automation Config · no affirmative OAuth / auto-scan / auto-send claims globally.

Both wired into `npm test`. Full suite: 61 PASS, 0 FAIL.

## 8. Out of scope for Phase 25L-3

- Proposal Workspace solicitation upload + extraction + section-level drafting → **Phase 25L-4**
- Subcontractor research workflow + Incumbents & Awards research workflow + Hunter.io API key → **Phase 25L-5**
- Actual Gmail / Outlook OAuth implementation — deferred to a future secure phase; only the placeholder + boundary copy ship here.

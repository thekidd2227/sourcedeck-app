# Phase 25L — Calendar / Email / Settings Boundary

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Companion:** `docs/product/phase-25l-buyer-workflow-cleanup-contract.md`

---

## 1. Calendar import vs email import — they are separate

The most common misunderstanding flagged in the Manus second-pair-of-eyes audit is the assumption that importing an `.ics` calendar file gives SourceDeck access to a user's email inbox. **It does not.** Calendar import and email import are two distinct paths with two distinct boundaries.

| Surface           | Import path                                  | Network access                              | Provider credentials                                  |
|-------------------|----------------------------------------------|---------------------------------------------|-------------------------------------------------------|
| Calendar          | `.ics` file picker · paste ICS text · manual | None — parsed in renderer                   | None                                                  |
| Email (Response Desk) | Manual paste · file picker (current phase) | None in current phase                       | None in current phase; future Gmail/Outlook OAuth     |

This boundary is asserted in three places in the UI:

1. The `cal-ics-help-panel` safety list: *"Importing an .ics file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*
2. The Settings → Email Import card copy: *"Importing an .ics calendar file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*
3. The Response Desk header copy: clarifies Import Email is provider-gated and manual until a future OAuth integration is configured.

## 2. Live sync claims — explicit denial

SourceDeck does not claim live calendar sync. The Calendar pane carries a `Local-only calendar.` banner that states:

> Events live on your Mac. SourceDeck does not send calendar invites, sync to Google / Outlook / iCloud, or upload your calendar anywhere. `.ics` import is the open standard; OAuth-based providers are deferred to a future secure phase. Calendar import setup also lives in Settings → Calendar Import.

The ICS help panel reiterates:

- *"This is import, not live sync."*
- *"SourceDeck does not change your external calendar."*
- *"SourceDeck does not send invites."*
- *"SourceDeck does not sync to Google, Outlook, or iCloud in this phase."*
- *"To refresh events, export and import a new .ics file."*

## 3. Password / OAuth posture

- SourceDeck never requests Gmail, iCloud, or Outlook passwords (asserted in the Settings → Email Import card).
- SourceDeck does not implement Google/Microsoft/Apple OAuth in this phase.
- A future secure OAuth integration would land as its own surface in Settings → Email Import with explicit user consent and would never repurpose ICS import as an inbox bridge.

## 4. Hunter.io API key boundary

- Stored via `window.sd.credentials.set('hunter-io', value)` — the same safe credential adapter used for Anthropic / OpenAI / Apollo / Airtable / SAM.gov keys.
- Renderer never holds the raw value after save (`s-hunter.value` is cleared once the credential adapter accepts the write).
- `loadSettings()` shows a `Hunter.io key saved (write-only)` placeholder when present; the raw value is never read back into the UI.
- Optional only. If the key is absent, SourceDeck routes contact research to the manual fallback workflow that ships in Phase 25L.3.
- Phase 25L.3 will introduce the user-triggered contact-enrichment action. Until then, the key exists in Settings but no code path consumes it.

## 5. Configuration-level setup belongs in Settings

The Phase 25L invariant is: **operational pages stay focused on operational work; configuration-level controls live in Settings or Setup**. Concretely:

- Calendar Import (`.ics` import, paste calendar text, ICS help) — primary home is now Settings → Calendar Import. The Calendar pane still hosts a copy of these controls for one-click access during active work, but the canonical configuration surface is Settings.
- Email Import — Settings → Email Import is the canonical surface. Response Desk hosts Import Email + Paste Reply Manually as work-time actions only.
- Hunter.io API Key — Settings → API Keys (write-only).

## 6. Setup Wizard placement

The Setup Wizard already includes an optional ICS calendar step. Phase 25L preserves it as skippable, password-free, and OAuth-free. No new Setup Wizard step is required for Phase 25L.1.

## 7. Boundary tests

- `test/phase-25l-calendar-edit-delete-help.test.js` — asserts the ICS help panel includes the email-vs-calendar separation statement; asserts no live-sync/two-way-sync/OAuth/password claims.
- `test/phase-25l-settings-integrations.test.js` — asserts Calendar Import + Email Import + Hunter.io cards exist with the boundary copy.

## 8. Out of scope

- Live Google/Microsoft/Apple OAuth — deferred to a future secure phase
- Automatic email scanning — deferred
- Live two-way calendar sync — deferred
- ZoomInfo / paid enrichment auto-integration — documented as optional external paid tool in Phase 25L.3

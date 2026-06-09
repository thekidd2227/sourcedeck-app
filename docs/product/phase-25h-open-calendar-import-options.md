# Phase 25H — Open Calendar Import Options

**Date:** 2026-06-09

This phase ships only the **`.ics` open-standard** import. This document records the options considered, the reasoning, and the future-phase path for richer calendar sync.

---

## 1. What Phase 25H ships

| Mechanism | Status | Detail |
|---|---|---|
| `.ics` file picker | ✅ Implemented | `<input type="file" accept=".ics,text/calendar">` → `FileReader.readAsText` → in-renderer parse. No upload. |
| Paste ICS text | ✅ Implemented | Textarea → in-renderer parse → preview → explicit Save. |
| Manual event entry | ✅ Implemented | Full modal form with date / time / task type / status / link fields / notes. |
| CalDAV sync | ❌ Documented only | Future-phase enhancement. |
| Google Calendar sync | ❌ Out of scope | Explicit mission prohibition: "Do not add Google Calendar API." |
| Microsoft Graph Calendar sync | ❌ Out of scope | Explicit mission prohibition: "Do not add Microsoft Graph Calendar API." |
| iCloud direct sync | ❌ Out of scope | Explicit mission prohibition: "Do not ask for iCloud credentials." |
| Outlook OAuth | ❌ Out of scope | Explicit mission prohibition: "Do not require Microsoft OAuth." |

## 2. Why `.ics` first

`.ics` is the open-standard text format (RFC 5545) for calendar data. Every modern calendar tool (Google Calendar, Outlook, iCloud, Apple Calendar, Fastmail, Proton Calendar, Thunderbird) can **export** a `.ics` file from a calendar without sharing the user's password, OAuth token, or credentials.

The user flow Phase 25H supports:

1. Buyer exports a `.ics` from their existing calendar tool.
2. Buyer chooses **Import .ics File** in SourceDeck.
3. SourceDeck reads the file locally, parses in-renderer, and saves to the local calendar.

**No password is ever requested. No OAuth grant is initiated. No file is uploaded.** The boundary is verified by sentinel (`test/phase-25h-ics-import.test.js`).

## 3. Parser scope (RFC 5545 subset)

Phase 25H ships a small inline parser. It supports:

- Folded lines (CRLF + space/tab continuation, RFC 5545 §3.1)
- `VEVENT` blocks (any number per file)
- `SUMMARY`, `DTSTART`, `DTEND`, `DESCRIPTION`, `LOCATION`, `UID`, `RRULE`, `DTSTAMP`
- `DATE` values (`YYYYMMDD`) and `DATE-TIME` values (`YYYYMMDDTHHMMSS[Z]`)
- Standard escape sequences in text values (`\n`, `\N`, `\,`, `\;`, `\\`)
- Recurring events are imported with the **first instance only**; `RRULE` is annotated into the description so the buyer can re-create the recurrence manually until full expansion ships in a future phase.

Out of scope for the Phase 25H parser:

- Full RRULE expansion (multi-instance recurring events)
- Timezone conversion (the parser stores Z-suffixed times as UTC HH:MM; non-Z times are stored as-is and treated as the buyer's local time)
- `VTODO`, `VJOURNAL`, `VFREEBUSY`, `VALARM` components
- `ATTENDEE`, `ORGANIZER` (would imply invite semantics — Phase 25H sends no invites)
- iCalendar method `REQUEST` / `REPLY` / `CANCEL` semantics

## 4. Future-phase CalDAV path

When buyers ask for live two-way sync, the canonical path is:

| Step | Detail |
|---|---|
| Add dependency | [`tsdav`](https://github.com/natelindev/tsdav) is an Apache-2.0-licensed CalDAV client. It supports iCloud, Fastmail, Nextcloud, Baikal, and other open CalDAV servers. **Phase 25H does NOT add it.** |
| Credential storage | User-provided CalDAV URL + username + password. Per the Phase 24L API-key onboarding boundary: credentials would enter via Setup Wizard or Settings → API Keys only, persisted via `window.sd.credentials.set('caldav', …)`. Operator never sees the value. |
| Sync direction | One-way (CalDAV → SourceDeck) initially. Two-way (SourceDeck → CalDAV write) requires explicit Phase 25A-style buyer consent because it constitutes "external calendar update" — currently forbidden. |
| Provider compatibility | iCloud CalDAV requires an Apple ID-specific app-specific password; Google Calendar CalDAV requires OAuth-derived app passwords; Outlook does not support CalDAV at all (use Graph + OAuth). Each provider has its own ergonomics. |

CalDAV path is **future-phase**. Phase 25H ships only `.ics`.

## 5. Why no OAuth in Phase 25H

OAuth-based calendar sync requires:

1. App registration with the provider (Google Cloud Console, Microsoft Entra ID).
2. App review for `https://www.googleapis.com/auth/calendar` / `Calendars.ReadWrite` scope.
3. Client ID + client secret distribution to every buyer.
4. Token refresh handling, scope-creep review by the provider, and ongoing app-review compliance.
5. Tenant-scoped credential storage and rotation policies.

None of those are feasible within the Phase 25A → Phase 25H scope. The mission rule "no OAuth in this phase" is honored.

## 6. Dependency-impact note

Phase 25H adds **zero new dependencies**. The inline parser is ~150 lines of plain JavaScript in `sourcedeck.html`. The renderer-boot sentinel confirms the parser fits the existing inline-script invariant (every `<script>` block parses).

If a future phase chooses to migrate to `ical.js` (Apache-2.0 license) for full RFC 5545 conformance, the migration path is straightforward — the existing `calParseIcs(text)` contract is the integration seam. Add the dependency, swap the implementation, keep the contract.

---

## Signature

This document records the open / free-first calendar-import posture for Phase 25H. The `.ics` open standard is the canonical phase-1 mechanism; CalDAV is the canonical future-phase enhancement; OAuth-based providers are explicitly deferred.

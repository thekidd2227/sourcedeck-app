# Phase 25L-2 — Calendar Edit/Delete + ICS Help Contract

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-2 (PR 2 of 5)
**Builds on:** Phase 25L-1 (Navigation + Dashboard cleanup, merged in #112)

---

## 1. Mission

Make Calendar event management a one-click action and explain the .ics import path in product language a buyer can follow without prior knowledge. Move setup / configuration controls off the operational Calendar surface and into Settings.

## 2. Calendar event card — inline action surface

Every event card (rendered by `eventCard()` in the Phase 25H calendar module) now exposes five inline action buttons under a dashed divider, plus a small italicized footer note that runs on every card:

| Button         | `data-cal-action` | Behavior                                                                                       |
|----------------|-------------------|------------------------------------------------------------------------------------------------|
| 👁 View         | `view`            | Opens the event modal at the View tab.                                                         |
| ✎ Edit          | `edit`            | Opens the event modal with the form populated. Editing imported ICS events is local-only.      |
| ✓ Mark Complete | `complete`        | Sets status to `completed` (local). Reuses the modal's `calMarkComplete()` helper.             |
| ↻ Reschedule   | `reschedule`      | Sets status to `reschedule` so the user can update the date/time. Reuses `calRescheduleEvent`. |
| 🗑 Delete        | `delete`          | Confirms with the SourceDeck-only copy, then removes the local copy only.                      |

Footer note on every card:

> *Local SourceDeck event only. Editing or deleting here does not change your external calendar.*

Card-level handlers (`calCardView`, `calCardEdit`, `calCardMarkComplete`, `calCardReschedule`, `calCardDelete`) reuse the existing modal helpers to keep behavior identical between in-card and in-modal flows. The clickable card surface and the action buttons both stop event propagation appropriately so a click on an action does not also re-open the modal.

## 3. Delete confirmation copy

`calCardDelete()` and `calDeleteEvent({ skipConfirm: false })` both use the same confirmation prompt:

> Delete this SourceDeck calendar event?
>
> This removes it from SourceDeck only. It does not delete it from Google, iCloud, Outlook, or any external calendar.

The card-level handler passes `{ skipConfirm: true }` after the user accepts the prompt so the modal-level `calDeleteEvent` does not display a duplicate dialog.

## 4. Imported ICS events are editable locally

Phase 25H imported ICS events as read-mostly entries. Phase 25L-2 makes them locally editable: the Edit button opens the same modal used for manual events, the user can update title / date / time / location / notes / status, and Save writes back to local SourceDeck state. The external calendar source is not touched, ever.

## 5. ICS help icon + panel

A new help button sits in the Calendar pane header, immediately before the Import .ics File button:

```
[? How do I get an .ics file?]  [📅 Import .ics File]  [📋 Paste]  [+ Add Event]  [⊘ Clear]
```

Clicking the help button toggles `#cal-ics-help-panel` (collapsed by default; `role="region"`, `aria-label="How to get an .ics calendar file"`). The panel is also reachable from Settings → Calendar Import.

### 5.1 Panel content

- **What is an ICS file?** — open standard used by Google, Apple/iCloud, Outlook, Calendly, etc.
- **Can I import any calendar?** — yes, any calendar that can export an .ics / iCalendar file. Manual entry / paste-text fallback if no export is available.
- **Google Calendar instructions** — Settings → Import & Export → Export → download .ics → Import .ics File.
- **Apple Calendar / iCloud instructions** — select the calendar → File → Export → save the .ics file → Import .ics File.
- **Outlook instructions** — Save Calendar / Export Calendar / Publish Calendar → download .ics → Import .ics File.
- **Calendly & other tools** — export / subscribe → choose .ics / iCalendar → download → Import .ics File. If only a webcal:// URL is offered, save it to .ics first.
- **Safety**: local copy only · does not change external calendar · does not send invites · does not sync to Google / Outlook / iCloud · refresh = export + import a new file · **importing an .ics file does NOT give SourceDeck access to your email inbox**.

## 6. Settings → Calendar Import card

`#settings-calendar-import-card` (`data-settings-section="calendar-import"`) sits directly after the API Keys card and before the Automation Config card. It hosts three configuration-level controls:

| Button                          | `data-settings-action`  | Delegates to                                              |
|---------------------------------|-------------------------|-----------------------------------------------------------|
| 📅 Import .ics File             | `open-ics-picker`       | `openTab('calendar'); calOpenIcsPicker();`                |
| 📋 Paste Calendar Text          | `open-ics-paste`        | `openTab('calendar'); calOpenPasteModal();`               |
| ? How do I get an .ics file?    | `open-ics-help`         | `openTab('calendar'); calToggleIcsHelp();`                |

Card copy reiterates:
- Local-only import.
- No Google / Outlook / iCloud OAuth in this phase.
- SourceDeck never requests Gmail, iCloud, or Outlook passwords.
- Editing or deleting an imported event affects the local SourceDeck copy only.
- **Importing an .ics file does NOT give SourceDeck access to your email inbox.**

## 7. Boundaries preserved

- No OAuth in this phase.
- No password collection.
- No live two-way sync.
- No invite sending.
- No external calendar mutation on edit / delete.
- ICS import and email import remain orthogonal — Phase 25L-3 will reiterate the same separation in Response Desk + Settings → Email Import.

## 8. Setup Wizard

The existing Setup Wizard already includes an optional ICS calendar step. Phase 25L-2 leaves it unchanged: skippable, password-free, OAuth-free. No new wizard step is added in this PR.

## 9. Tests

- `test/phase-25l2-calendar-edit-delete-help.test.js`
- `test/phase-25l2-settings-calendar-import.test.js`

Both wired into `npm test`. Full suite: 59 PASS, 0 FAIL.

## 10. Out of scope for Phase 25L-2

- Response Desk subtitle removal + Email Import boundary → **Phase 25L-3**
- Settings → Email Import card → **Phase 25L-3**
- Proposal Workspace solicitation upload + extraction → **Phase 25L-4**
- Subcontractor / Incumbents research + Hunter.io key → **Phase 25L-5**

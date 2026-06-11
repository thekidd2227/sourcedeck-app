# Phase 25M — Calendar Delete Repair + Compact ICS Help

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Two targeted Calendar fixes surfaced from buyer screenshots:

1. **Delete event button did not work.** The Phase 25L-2 card-level delete handler depended on `_editingEventId` being set synchronously by `calOpenEventModal()` and then consumed by `calDeleteEvent({skipConfirm:true})`. The modal hop caused a brief modal flash and (in some Electron renderer states) a race condition where the delete silently no-op'd. Buyers reported delete "doesn't work."
2. **ICS help button cluttered the Calendar header.** The Phase 25L-2 "? How do I get an .ics file?" button took up a full-width slot in the pane-actions row. The user wanted a small "?" icon instead.

## 2. Calendar delete — direct state mutation

`calCardDelete(eventId)` now:

1. Shows the SourceDeck-only confirmation prompt:

   > Delete this SourceDeck calendar event?
   >
   > This removes it from SourceDeck only. It does not delete it from Google, iCloud, Outlook, or any external calendar.

2. Directly mutates `_state.events` via `.filter(e => e.id !== eventId)`. No modal hop. No dependency on `_editingEventId`.
3. Asserts the row actually came out (`if (_state.events.length === before)` → error toast and bail).
4. Calls `saveState()` and `renderCalendar()`.
5. If the modal happens to be open against this same event, calls `window.calCloseEventModal()` to clean up.
6. Calls `window.renderDashboardLaunchpad({})` so the Dashboard launchpad counts refresh immediately.
7. Success toast: *"Event deleted locally. External calendars are not changed."*

A vm-sandboxed unit test in `test/phase-25m-calendar-delete-help.test.js` runs the delete body against a synthetic 3-event store and asserts the row is gone, `saveState` ran once, and `renderCalendar` ran once.

## 3. Compact ICS help "?" icon

The Calendar pane header replaces the full-text button with a compact circular icon:

```
< previous >  [📅 Import .ics File]  [📋 Paste]  [+ Add Event]  [⊘ Clear]
                                  ⌃
                                  ⌃─ (?) ← compact help icon
```

Markup:

```html
<button type="button" class="cal-ics-help-q" id="cal-ics-help-btn"
        data-cal-ics-help-toggle="true" data-cal-ics-help-compact="true"
        onclick="calToggleIcsHelp()"
        onmouseenter="calToggleIcsHelp({open:true})"
        title="How do I get an .ics file?"
        aria-label="How do I get an .ics file?"
        aria-expanded="false"
        aria-controls="cal-ics-help-panel"
        style="width:22px;height:22px;border-radius:50%;...">?</button>
```

- Visible label is only `?`.
- Hover (`onmouseenter`) opens the panel via `calToggleIcsHelp({open:true})` — the new `opts.open=true` path that forces the panel open without toggling closed if already showing.
- Click toggles. Esc / clicking outside the panel keeps existing behavior.
- The full help panel content (Google Calendar, Apple Calendar / iCloud, Outlook, Calendly steps + safety footer) from Phase 25L-2 is preserved unchanged.

## 4. Safety

- Calendar delete is local-only — Google / iCloud / Outlook are never touched.
- No invite cancellation.
- No email send.
- ICS help panel still reiterates: *"Importing an .ics file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*

## 5. Tests

- `test/phase-25m-calendar-delete-help.test.js`

`npm test` → 64 PASS suites, 0 FAIL.

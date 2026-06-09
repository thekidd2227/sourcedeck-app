# Phase 25H — Calendar Module Contract

**Date:** 2026-06-09
**Companion docs:** `docs/product/phase-25h-open-calendar-import-options.md`, `docs/product/phase-25h-calendar-govcon-integration.md`, `docs/audits/phase-25h-calendar-privacy-safety-audit.md`.

---

## 1. Purpose

Provide SourceDeck with a standalone, local-only calendar surface that buyers and operators can use to manage events, deadlines, vendor follow-ups, and proposal work — without OAuth, without external sync, and without sending invites.

The Calendar module is the canonical home for date-anchored work in SourceDeck. Phase 25H also integrates it tightly with the Phase 22–24 GovCon workspace and the Phase 25E.2 Proposal Workspace (see `phase-25h-calendar-govcon-integration.md`).

## 2. Delivery posture

| Posture | Status |
|---|---|
| Local-only state | ✅ Primary: `window.sd.storeGet/storeSet('calendar')` electron-store bridge. Fallback: `localStorage['sd.calendar.v1']`. |
| No fetch / no XHR | ✅ Verified by sentinel: the Phase 25H Calendar script block strips clean. |
| No OAuth | ✅ No `client_secret`, no `refresh_token`, no `googleapis.com`/`graph.microsoft.com`/`caldav.icloud` URL anywhere in the calendar code path. |
| No external calendar sync | ✅ Phase 25H ships ICS import only. CalDAV is documented as a future option (`phase-25h-open-calendar-import-options.md`). |
| No calendar invites sent | ✅ Verified by sentinel: pane contains no "Send Invite" / "Email Invite" / "Contact Vendor" / "Contact Agency" / "Upload to portal" control. |
| No new dependency | ✅ Phase 25H ships a small inline RFC 5545 subset parser. No `ical.js`, no `node-ical`, no `tsdav`, no calendar UI library. |
| Phase 25A no-send / no-submit / no-upload | ✅ The pane reproduces the boundary verbatim in its top-of-pane disclaimer. |

## 3. Navigation contract

| Property | Value |
|---|---|
| Nav section | `<div class="nav-section" id="nav-section-calendar" data-section="calendar-nav">` |
| Visibility | Always-on. The section sits OUTSIDE the Phase 25E.1 `data-other-business-tools` collapsible container — buyers reach Calendar in one click on cold open. |
| Nav button | `<button class="nav-btn" data-tab="calendar">Calendar</button>` |
| Pane | `<div class="tab-pane" id="tab-calendar">` |
| Phase 23C invariant | Preserved. The new tab does not displace any existing nav button. |

## 4. State shape

```js
{
  activeView: 'today' | 'week' | 'month' | 'list',
  anchorDate: 'YYYY-MM-DD',
  events: [
    {
      id: 'evt-…',                       // local UUID (newId())
      uid: 'event-1@source',            // RFC 5545 UID, or '' for manual events
      source: 'manual' | 'imported-ics', // 'paste-ics' shares the imported-ics bucket
      title: string,
      date: 'YYYY-MM-DD',
      start: 'HH:MM' | '',
      end:   'HH:MM' | '',
      allDay: boolean,
      location: string,
      description: string,
      linkedSolicitationId: string,
      linkedVendorId: string,
      linkedProposalSectionId: '' | 'table-of-contents' | … | 'final-internal-review',
      taskType: 'calendar-event' | 'vendor-follow-up' | 'quote-due' | 'appointment' |
                'site-visit' | 'qa-deadline' | 'proposal-deadline' | 'internal-review' |
                'subcontractor-meeting' | 'proposal-section-work' | 'other',
      status: 'scheduled' | 'completed' | 'missed' | 'reschedule' | 'canceled',
      notes: string,
      createdAt: ISO8601,
      updatedAt: ISO8601
    }
  ]
}
```

## 5. View contract

Four views, all rendered from the same `events` array:

| View | Behavior |
|---|---|
| **Today** | Renders events whose `date` matches `anchorDate`. Empty state offers `+ Add Event` and import CTAs. |
| **Week** | 7-column grid, Sunday → Saturday, anchored to the week containing `anchorDate`. Today's column gets a gold accent border. Each cell lists events in start-time order. |
| **Month** | 6×7 grid. Cells outside the anchored month dim. Each cell shows at most 3 event titles + `+ N more` overflow. Click a cell to jump to its Today view. |
| **List** | Chronological list of every event. |

Range step (◀ / ▶) advances by 1 day / 1 week / 1 month / 1 day depending on the active view. `⤴ Today` jumps back to the current date.

## 6. Action contract

| Action | Method | Result |
|---|---|---|
| Import .ics File | `window.calOpenIcsPicker()` → file picker → `calOnIcsFileChosen(ev)` | Local `FileReader.readAsText`; parsed via `calParseIcs(text)`; each event flows through `calAddOrUpdateImportedEvent` (dedupe by UID + date). |
| Paste Calendar Text | `window.calOpenPasteModal()` → user pastes → `calParseAndImportPaste()` previews → `calSaveParsedPaste()` commits | Same parser; the modal previews parsed events and waits for explicit Save. Non-ICS text is rejected with a clear message. |
| Add Event | `window.calOpenEventModal(null)` → user fills form → `calSaveEventForm()` | Creates a `source: 'manual'` event. Title required; everything else optional. |
| Edit Event | `window.calOpenEventModal('<id>')` | Opens the form pre-populated. Save updates the existing record. |
| Mark Complete | `window.calMarkComplete()` | Sets `status: 'completed'`. |
| Reschedule | `window.calRescheduleEvent()` | Sets `status: 'reschedule'`. Operator updates the date/time and saves. |
| Delete | `window.calDeleteEvent()` | Confirm dialog → removes the record. |
| Clear Imported | `window.calClearImported()` | Confirm dialog → removes every event whose `source === 'imported-ics'`. Manual events are preserved. |

## 7. Persistence + autosave

- Every mutation calls `saveState()`.
- `saveState()` debounces 200 ms and writes to both the electron-store bridge and `localStorage`.
- `loadState()` runs on cold open; merges over the blank shape so missing keys get safe defaults.

## 8. Empty state

| Condition | UI |
|---|---|
| `events.length === 0` | The `cal-empty-state` block renders with: 📅 icon, "No calendar events yet" headline, sub-copy directing the buyer to import or add. |
| Filtered view returns 0 events | Each view renders its own contextual empty state ("No events on …"). |

## 9. No founder/internal defaults

The calendar ships with **zero pre-loaded events**. The Phase 25E.6 Daily Ops invariant (no PROD-01..05 / Notion Sync / Reply Intel / Booking Brief / Gmail / Airtable writeback defaults) extends to the calendar.

## 10. Today's Work Plan mirror (Daily Ops integration)

A second Phase 25H script block renders today's calendar events into the Daily Operating Rhythm pane's `#do-checklist` host. Read-only mirror. The Calendar module is the source of truth; the Daily Ops mirror is a read-time render.

| Condition | UI |
|---|---|
| Today has events | Each event rendered as a compact card: title, time/all-day, task type, status. |
| Today has no events | Neutral empty state with a one-click jump to the Calendar tab (`openTab('calendar')`). |
| Buyer has loaded zero events overall | Same empty state — no founder/internal defaults appear. |

## 11. Future-phase reservations

| Future enhancement | Why deferred |
|---|---|
| Full RRULE expansion (multi-instance recurring events) | The Phase 25H parser imports the first instance and annotates the description. Full expansion requires a recurrence library or substantial code; reserved for a future phase. |
| CalDAV sync (iCloud / Fastmail / open CalDAV servers) | Documented in `phase-25h-open-calendar-import-options.md` §4. Adds a dependency (`tsdav` or equivalent) + credential storage; not in this phase. |
| Google Calendar / Microsoft Graph sync | Requires OAuth + app review with the provider. Explicitly forbidden in this phase per mission. |
| Live cross-pane sync (e.g., a GovCon Q&A deadline auto-creates a Calendar event) | Phase 25H ships the schema + link fields. The cross-pane writeback is a separate UI/data sprint reserved for a future phase. |
| Per-event reminders (system notification, sound) | Phase 25H ships the text-only `notes` reminder field. Push notifications are an Electron-main-process concern reserved for a future phase. |
| Per-tenant calendar boundary | The Phase 25C secure web app / PWA contract specifies tenant-scoped storage. The local-only Phase 25H module is single-user; multi-user partitioning rides with the future web/PWA delivery. |

---

## Signature

This is the Phase 25H Calendar module contract. The local-only, no-OAuth, no-network posture is the canonical posture for Phase 25H. Future phases may extend the surface; they may not relax the boundary.

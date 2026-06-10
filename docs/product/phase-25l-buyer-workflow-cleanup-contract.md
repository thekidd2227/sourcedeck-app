# Phase 25L — SourceDeck GovCon Buyer Workflow Cleanup · Contract

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Companion sub-phases:**
- Phase 25L.1 — Navigation cleanup, Calendar Edit/Delete, ICS help, Settings additions, Dashboard consolidation (this PR)
- Phase 25L.2 — Proposal Workspace solicitation upload + 5-section extraction + section-level drafting (subsequent PR)
- Phase 25L.3 — Subcontractor research + Incumbents & Awards workflow (subsequent PR)

---

## 1. Mission

Clean SourceDeck into a focused GovCon Capture OS by:
1. Removing buyer-facing clutter from active navigation.
2. Consolidating routine operating surfaces (Today's Tasks, Overdue, Pipeline, Reports) under Dashboard as launchpad cards.
3. Surfacing inline Edit/Delete controls on every Calendar event card with explicit local-only language.
4. Adding an ICS help icon with step-by-step Google / Apple-iCloud / Outlook export instructions.
5. Moving Calendar import setup and the Email Import placeholder to Settings so operational pages stay focused on the work itself.
6. Stripping user-visible phase labels from active UI (Help banner, Settings notes, GovCon snapshot rows, GovCon Capture Command Center placeholder copy).
7. Adding an optional Hunter.io API key field to Settings (write-only via the safe credential adapter).

## 2. Final sidebar surface

Exactly 8 items, in fixed order:

| # | Label              | data-tab    | Purpose                                           |
|---|--------------------|-------------|---------------------------------------------------|
| 1 | Dashboard          | `dashboard` | Operating hub launchpad                           |
| 2 | GovCon             | `govcon`    | Find / Qualify / Solicitation / Scope / etc.      |
| 3 | Leads              | `leads`     | Potential buyers, partners, contacts              |
| 4 | Calendar           | `calendar`  | Local SourceDeck events; .ics import              |
| 5 | Response Desk      | `reply`     | Manual inbound reply triage                       |
| 6 | Proposal Workspace | `execution` | Solicitation intake (Phase 25L.2)                 |
| 7 | Settings           | `settings`  | API keys, Calendar Import, Email Import, etc.     |
| 8 | Help / FAQ         | `help`      | Plain-English manual                              |

`GovCon Capture OS` label is renamed to `GovCon` in both the topbar `brand-ver` element and the sidebar `nav-label`.

## 3. Removed from active sidebar

The following nav buttons no longer appear on the sidebar surface. They are preserved as hidden nav buttons inside `#nav-section-removed-25l` (`data-phase-25l="removed-from-active-nav"`, `style="display:none"`, `aria-hidden="true"`) so that any existing programmatic `openTab('cmd')` / `openTab('overdue')` / etc. still resolves — Phase 23C invariant: **never orphan a pane**.

- Command Center (`cmd`)
- Command (`command`)
- Email Tracker (`email`)
- Pilot Tracker (`delivery`)
- Opportunities (`opportunities`)
- Deal Workspace (`dealwork`)
- Pipeline (`pipeline`)
- Reports (`proof`)
- Daily Ops (`dailyops`)
- Overdue (`overdue`)
- Revenue (`revenue`)
- Ad Engine (`content`)
- Socials (`socials`)
- Outreach (`outreach`)
- Prime Partners (`primes`)
- Create Lead (`createlead`) — already hidden pre-25L
- AI Lead Builder (`aigenerate`) — already hidden pre-25L

## 4. Dashboard consolidation cards

Dashboard pane-title is `Dashboard` (was `Command Dashboard`). The first row inside Dashboard's pane-body is a launchpad container (`#dash-launchpad`, `data-dash-launchpad="true"`) that renders 10 consolidation cards. Each card surfaces a count plus a button that calls `openTab()` into the right destination.

| Card                        | Counts                          | Routes to               |
|-----------------------------|---------------------------------|-------------------------|
| Active pursuits             | non-Won/Lost leads              | GovCon                  |
| Overdue items               | overdue + no-email leads        | Overdue (hidden tab)    |
| Today's Tasks               | today's calendar events         | Daily Ops (hidden tab)  |
| Pipeline value              | sum of deal values              | Pipeline (hidden tab)   |
| Proposal deadlines          | leads at Proposal Sent stage    | Proposal Workspace      |
| Vendor follow-ups           | calendar events tagged vendor   | Proposal Workspace      |
| Calendar events             | total local calendar events     | Calendar                |
| Open risks · replies        | leads in Replied status         | Response Desk           |
| Leads                       | total leads in system           | Leads                   |
| Reports                     | static blurb                    | Reports (hidden tab)    |

Dashboard remains a launchpad — it does **not** render full module tables. The detailed views live behind the openTab buttons. `renderDashboardLaunchpad(stats)` runs on every `renderDashboard()` and reads from `allLeads` + `window.sourceDeckCalendar.fetchAllEvents()` when available.

## 5. Calendar Edit/Delete + ICS help

Every Calendar event card (`renderToday`, `renderWeek`, `renderList`) now renders an inline action row with four buttons:

- **Edit** (`data-cal-action="edit"`) — opens the event modal
- **Mark Complete** (`data-cal-action="complete"`) — sets status to `completed`
- **Reschedule** (`data-cal-action="reschedule"`) — sets status to `reschedule`
- **Delete** (`data-cal-action="delete"`) — confirms with the Phase 25L copy and removes the local SourceDeck copy only

Below the actions, every card carries a small italicized footer note: *"Local SourceDeck event only. Editing or deleting here does not change your external calendar."*

Delete confirmation copy (in `calCardDelete()` and `calDeleteEvent({ skipConfirm: false })`):

> Delete this SourceDeck calendar event?
>
> This removes it from SourceDeck only. It does not delete it from Google, iCloud, Outlook, or any external calendar.

A new help button `"? How do I get an .ics file?"` sits in the Calendar pane header above the Import .ics File button. Clicking it (`calToggleIcsHelp()`) shows/hides `#cal-ics-help-panel`, a region (`role="region"`, `aria-label="How to get an .ics calendar file"`) that covers:

- What an ICS file is
- Why import is local-only, not live sync
- Google Calendar / Apple Calendar / Outlook step-by-step export instructions
- Safety notes including the explicit clarification: *"Importing an .ics file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*

## 6. Settings additions

Two new cards land after the API Keys card, before Automation Config:

### Calendar Import (`#settings-calendar-import-card`, `data-settings-section="calendar-import"`)

- Import .ics File (delegates to `calOpenIcsPicker()` after opening the Calendar tab)
- Paste Calendar Text (delegates to `calOpenPasteModal()`)
- "? How do I get an .ics file?" (delegates to `calToggleIcsHelp()`)
- Explicit copy: *"SourceDeck does not use Google, Outlook, or iCloud OAuth in this phase."*

### Email Import (`#settings-email-import-card`, `data-settings-section="email-import"`)

- Placeholder for future secure Gmail/Outlook OAuth integration
- Copy: *"Not active in this build unless configured by the operator. For now, paste replies manually in Response Desk."*
- Copy: *"Importing an .ics calendar file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*
- Copy: *"SourceDeck never requests Gmail, iCloud, or Outlook passwords."*

### Hunter.io API key

Added to the API Keys card between SAM.gov and Setup Wizard. Optional only. Persisted via `window.sd.credentials.set('hunter-io', value)`; renderer never holds the raw value. `loadSettings()` shows a `Hunter.io key saved (write-only)` placeholder when the key is present.

## 7. Response Desk simplification

- Pane-header subtitle removed (was: `Inbound reply triage · intent detection · next-action routing · draft-only responses`).
- Import-first header copy clarified: Import Email uses the configured email integration if set up in Settings → Email Import; otherwise paste reply manually.
- No ICS / calendar import controls in the Response Desk pane.

## 8. Phase label scrub (user-visible only)

Removed from active UI:
- `Phase 25E.4:` prefix on the Help/FAQ banner
- `Phase 25E.3:` prefix on the Settings Airtable note
- `Phase 25E.6:` prefix on the Settings Automation Config note
- `Phase 24K:` prefix on the SAM.gov key note
- `Phase 22C` reference in the GovCon Capture Command Center "Solicitation Readiness" placeholder
- `Phase 22E/22D/22C/22F` references in the GovCon Bid/No-Bid Snapshot rows
- `Phase 22F` reference in the Export Matrix placeholder toast
- `GovCon Capture OS` brand-ver label → `GovCon`
- `GovCon Capture OS` copy inside the Setup Wizard wrap-up screens → `GovCon`

Internal-reference labels inside the snapshot Markdown export (`bullet('Opportunity summary (Phase 22B)', ...)`, etc.) are preserved as internal-review-export annotations; they are acceptable per the Phase 25L safety scan ("docs explaining removed items / release notes / safety warning copy").

## 9. Safety invariants preserved

- No new feature flags or paid dependencies introduced
- No `.env` touched
- No secrets printed
- No deploy / public release / public download
- No live SAM run
- No email sending
- No vendor/agency auto-contact
- No bid/quote/proposal submission
- No portal upload (SAM, PIEE, eBuy, GSA, agency, acquisition.gov)
- No calendar provider upload/sync
- No Google/Microsoft/iCloud password or OAuth request
- No pricing source change
- No checkout/payment change
- No legal advice or certified-compliance claim
- Phase 23C reachability invariant: every pre-25L commercial nav button + pane remains in DOM
- Phase 25A no-send/no-submit/no-upload boundary preserved
- Phase 25C master delivery method preserved (Request Access → Manual Qualification → Secure Web App/PWA; desktop is internal trial only)
- Approved SourceDeck logo unchanged

## 10. Tests

- `test/phase-25l-navigation-cleanup.test.js` — 8 sidebar items in order; 14 removed items absent; reachability buffer present; GovCon Capture OS scrubbed; visible Phase labels scrubbed.
- `test/phase-25l-calendar-edit-delete-help.test.js` — Edit/Delete/Complete/Reschedule actions on every card; local-only footer note; delete confirmation copy; ICS help panel content.
- `test/phase-25l-dashboard-consolidation.test.js` — 10 launchpad cards with correct openTab targets; renderDashboardLaunchpad invoked from renderDashboard; pane-title is "Dashboard"; sidebar order Dashboard → GovCon → Leads → Calendar verified.
- `test/phase-25l-settings-integrations.test.js` — Calendar Import / Email Import / Hunter.io card presence; copy; credential-adapter wiring; placement after API Keys card.

## 11. Files changed

| File | Lines changed |
|---|---|
| `sourcedeck.html` | ~280 lines (sidebar rebuild + calendar card actions + ICS help panel + Settings cards + Dashboard launchpad + phase-label scrub) |
| `test/phase-25l-navigation-cleanup.test.js` | new |
| `test/phase-25l-calendar-edit-delete-help.test.js` | new |
| `test/phase-25l-dashboard-consolidation.test.js` | new |
| `test/phase-25l-settings-integrations.test.js` | new |
| `docs/product/phase-25l-buyer-workflow-cleanup-contract.md` | new (this file) |
| `docs/product/phase-25l-calendar-email-settings-boundary.md` | new |
| `docs/audits/phase-25l-navigation-dashboard-cleanup-audit.md` | new |
| `docs/release-notes/phase-25l-1-buyer-workflow-cleanup.md` | new |

---

## Signature

Phase 25L.1 reduces SourceDeck's buyer-facing navigation surface from 17 visible items down to 8, consolidates routine work into Dashboard launchpad cards, and brings Calendar event UX up to Edit/Delete-on-card parity. Proposal Workspace solicitation intake (Phase 25L.2) and Subcontractor / Incumbent research workflows (Phase 25L.3) follow in subsequent PRs. Paid-pilot readiness gate from Phase 25K is not flipped by this PR.

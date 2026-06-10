# Phase 25L · Navigation + Dashboard Cleanup Audit

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L.1
**Contract:** `docs/product/phase-25l-buyer-workflow-cleanup-contract.md`

---

## 1. Why this audit

Manus's second-pair-of-eyes pass plus internal Day 0 walkthroughs flagged that SourceDeck's sidebar surfaced 17 visible items, with internal Phase labels bleeding into user-facing copy and overlapping operational pages (Pipeline, Deal Workspace, Reports, Daily Ops, Overdue, Email Tracker, Pilot Tracker, Command, Command Center, Opportunities). The product felt like an internal build artifact rather than a focused GovCon Capture OS.

## 2. Final sidebar (8 surfaces)

```
1. Dashboard            ← Operating hub
2. GovCon               ← Find / Qualify / Solicitation / Scope / etc.
3. Leads
4. Calendar
5. Response Desk
6. Proposal Workspace
7. Settings
8. Help / FAQ
```

## 3. Removed-from-active-nav matrix

| Pre-25L sidebar item | Pre-25L `data-tab` | Post-25L status                  | Replacement path                                |
|----------------------|--------------------|----------------------------------|-------------------------------------------------|
| Command Center       | `cmd`              | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Command              | `command`          | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Email Tracker        | `email`            | Hidden buffer, pane preserved    | Response Desk (manual import)                   |
| Pilot Tracker        | `delivery`         | Hidden buffer, pane preserved    | Internal-only; docs/trial/                      |
| Opportunities        | `opportunities`    | Hidden buffer, pane preserved    | GovCon section                                  |
| Deal Workspace       | `dealwork`         | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Pipeline             | `pipeline`         | Hidden buffer, pane preserved    | Dashboard "Pipeline value" card                 |
| Reports              | `proof`            | Hidden buffer, pane preserved    | Dashboard "Reports" card                        |
| Daily Ops            | `dailyops`         | Hidden buffer, pane preserved    | Dashboard "Today's Tasks" card                  |
| Overdue              | `overdue`          | Hidden buffer, pane preserved    | Dashboard "Overdue items" card                  |
| Revenue              | `revenue`          | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Ad Engine            | `content`          | Hidden buffer, pane preserved    | Out of scope                                    |
| Socials              | `socials`          | Hidden buffer, pane preserved    | Out of scope                                    |
| Outreach             | `outreach`         | Hidden buffer, pane preserved    | GovCon Outreach section                         |
| Prime Partners       | `primes`           | Hidden buffer, pane preserved    | GovCon Prime Partners section                   |
| Create Lead          | `createlead`       | Already hidden pre-25L           | Leads workspace                                 |
| AI Lead Builder      | `aigenerate`       | Already hidden pre-25L           | Leads workspace                                 |

All hidden items live in `#nav-section-removed-25l` (`style="display:none"`, `aria-hidden="true"`, `data-phase-25l="removed-from-active-nav"`). Each button carries `data-phase-25l-removed="true"` so any downstream nav sweep can filter them out.

## 4. Dashboard consolidation

Dashboard's pane-body opens with a launchpad card (`#dash-launchpad`) that surfaces 10 counts plus open-tab buttons:

```
┌─ Active pursuits ──┬─ Overdue items ────┬─ Today's Tasks ────┐
│  N                 │  N (red)           │  N                 │
│  [Open GovCon →]   │  [View Overdue →]  │  [Open Today's →]  │
├─ Pipeline value ───┼─ Proposal lines ───┼─ Vendor follow-ups ┤
│  $N                │  N                 │  N                 │
│  [View Pipeline →] │  [Open Proposal →] │  [Open Proposal →] │
├─ Calendar events ──┼─ Open risks ───────┼─ Leads ────────────┤
│  N                 │  N                 │  N                 │
│  [Open Calendar →] │  [Open Response →] │  [Open Leads →]    │
├─ Reports ──────────┴───
│  blurb
│  [View Reports →]
└────────
```

Dashboard is a launchpad — not a mega-page. Each card displays a single count (or short blurb) plus one routing button. Detailed views remain in their dedicated panes, reachable from the launchpad.

`renderDashboardLaunchpad(stats)` runs on every `renderDashboard()`. It reads from already-computed `pipeline` / `overdue` / `proposals` stats plus `allLeads` and `window.sourceDeckCalendar.fetchAllEvents()` when the calendar module is loaded.

## 5. Phase-label scrub

| Surface                                        | Pre-25L                                         | Post-25L                                |
|------------------------------------------------|-------------------------------------------------|-----------------------------------------|
| Topbar brand-ver                               | `GovCon Capture OS`                             | `GovCon`                                |
| Sidebar nav-label (was `govcon-primary` block) | `GovCon Capture OS`                             | `GovCon`                                |
| Setup Wizard wrap-up help                      | `the GovCon Capture OS becomes your default…`   | `GovCon becomes your default…`          |
| Setup Wizard tour help                         | `A one-screen tour of the GovCon Capture OS…`   | `A one-screen tour of the GovCon…`      |
| Help/FAQ banner                                | `Phase 25E.4: Plain-English help…`              | `Help / FAQ. Plain-English answers…`    |
| Settings Airtable note                         | `Phase 25E.3: SourceDeck owns lead management…` | `SourceDeck owns lead management…`      |
| Settings Automation Config note                | `Phase 25E.6: SourceDeck owns workflow…`        | `SourceDeck owns workflow…`             |
| SAM.gov key note                               | `Phase 24K: also available in the Setup…`       | `Also available in the Setup…`          |
| GovCon CC Solicitation Readiness placeholder   | `The Solicitation Workspace ships in Phase 22C` | `Solicitation Workspace lives inside…`  |
| GovCon Bid/No-Bid past-perf row                | `Wires to Past Performance Library in Phase 22E.` | `Wires to the GovCon Past Performance Library.` |
| GovCon Bid/No-Bid pricing row                  | `Pricing Worksheet ships in Phase 22D.`         | `Wires to the GovCon Pricing Worksheet.`|
| GovCon Bid/No-Bid compliance row               | `Compliance Matrix Builder ships in Phase 22C.` | `Wires to the GovCon Compliance Matrix.`|
| Export Matrix toast                            | `export bundle ships in Phase 22F`              | `internal review export only`           |

Internal-reference labels inside the snapshot Markdown export (`bullet('Opportunity summary (Phase 22B)', …)`, etc.) are **preserved**. They are internal-review-export annotations consumed by the operator/recipient, not visible buyer chrome, and are acceptable per the Phase 25L safety scan ("docs explaining removed items / release notes / safety warning copy").

## 6. Calendar Edit/Delete + ICS help

Inline action row on every event card:

```
┌─ Event title ─────────────────────────┬─ status pill ─┐
│ Date · time · location                │               │
│ Sol / Vendor / Section link chips     │               │
├───────────────────────────────────────┴───────────────┤
│ [✎ Edit]  [✓ Mark Complete]  [↻ Reschedule]  [🗑 Delete] │
├───────────────────────────────────────────────────────┤
│ Local SourceDeck event only. Editing or deleting here │
│ does not change your external calendar.               │
└───────────────────────────────────────────────────────┘
```

ICS help button sits above Import .ics File:

```
[? How do I get an .ics file?]  [📅 Import .ics File]  [📋 Paste]  [+ Add Event]  [⊘ Clear]
```

Clicking the help button toggles `#cal-ics-help-panel` (collapsed by default). Panel content covers: what an ICS file is, why import is local-only not live sync, Google / Apple-iCloud / Outlook step-by-step instructions, and a safety footer including the explicit *"Importing an .ics file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."* statement.

## 7. Settings additions

Three new surfaces added to Settings (placement: API Keys card → Calendar Import card → Email Import card → Automation Config card):

1. **Hunter.io API Key** — optional, write-only via `window.sd.credentials.set('hunter-io', ...)`. Persisted credential; renderer never holds the raw value.
2. **Calendar Import card** — `.ics` import, paste calendar text, ICS help. Routes back to the Calendar pane for one-click action.
3. **Email Import card** — future secure Gmail/Outlook OAuth placeholder. Explicit no-password / no-OAuth-in-this-phase copy. Explicit ICS-vs-email separation copy.

## 8. Safety scan

The following queries are run against `sourcedeck.html` + `docs/` + `test/` + `services/` + `scripts/`. Hits inside HTML comments, docs explaining removed items, hidden reachability buffer, negative tests, and audit/release notes are acceptable per the Phase 25L safety contract.

| Query                                  | Active-UI hits | Status |
|----------------------------------------|---------------:|--------|
| Email Tracker (sidebar/active pane)    |              0 | ✅     |
| Pilot Tracker (sidebar/active pane)    |              0 | ✅     |
| Command Mode / Command Center (sidebar)|              0 | ✅     |
| Opportunities tab (sidebar)            |              0 | ✅     |
| Deal Workspace top-level nav           |              0 | ✅     |
| Pipeline top-level nav                 |              0 | ✅     |
| Reports top-level nav                  |              0 | ✅     |
| Daily Ops top-level nav                |              0 | ✅     |
| Overdue top-level nav                  |              0 | ✅     |
| Revenue top-level nav                  |              0 | ✅     |
| Ad Engine / Socials top-level nav      |              0 | ✅     |
| `GovCon Capture OS` visible label      |              0 | ✅     |
| Visible `Phase 25E.4 / Phase 25E.3 / Phase 25E.6 / Phase 24K / Phase 22[A-F]` in scrubbed surfaces | 0 | ✅ |
| `Submit Bid` / `Submit Quote` / `Send Email` in active UI | 0 | ✅ |
| `auto-contact` / `automatically contact` / `live calendar sync` | 0 | ✅ |
| `Gmail password` / `iCloud password` / `Outlook password` | 0 | ✅ |
| `certified compliant` / `legal advice` | 0 | ✅ |
| `$79` / `$349` / `$999` legacy pricing | preserved server-side mock only | ✅ |

## 9. Out of scope (handled in subsequent Phase 25L sub-PRs)

- Proposal Workspace solicitation/RFQ/RFP upload + 5-section extraction + section-level drafting → **Phase 25L.2**
- Subcontractor research workflow (Place-of-Performance linkage, 50-mile radius, Hunter.io enrichment trigger) → **Phase 25L.3**
- Incumbents & Awards research workflow (FSD link, research prompt, confidence/verification) → **Phase 25L.3**
- Hunter.io contact-enrichment trigger consuming the Phase 25L.1 key → **Phase 25L.3**

## 10. Paid-pilot readiness gate impact

This PR does **not** flip any of the Phase 25K readiness gate boxes. The gate's binary state remains as established in `docs/audits/phase-25k-paid-pilot-readiness-gate.md`. Once Phase 25L.1, 25L.2, 25L.3, and the Phase 25I recovery PR all land, the operator runs the Day 0 trial-package regeneration and re-evaluates the gate.

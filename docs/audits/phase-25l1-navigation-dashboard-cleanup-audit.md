# Phase 25L-1 · Navigation + Dashboard Cleanup Audit

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-1 (PR 1 of the 5-PR Phase 25L sequence)

---

## 1. Why this audit

Manus's second-pair-of-eyes pass plus internal Day 0 walkthroughs flagged that SourceDeck's sidebar surfaced 17 visible items, with internal Phase labels bleeding into user-facing copy and overlapping operational pages (Pipeline, Deal Workspace, Reports, Daily Ops, Overdue, Email Tracker, Pilot Tracker, Command, Command Center, Opportunities). The product felt like an internal build artifact rather than a focused GovCon Capture OS.

This PR — the first of a 5-PR sequence — handles **navigation cleanup, Dashboard consolidation, and visible Phase-label scrub only**. Calendar UX, Settings additions, Response Desk simplification, Proposal solicitation intake, and Subcontractor / Incumbent research workflows ship in subsequent PRs (25L-2 through 25L-5).

## 2. Final sidebar (8 surfaces)

```
1. Dashboard            ← Operating hub launchpad
2. GovCon               ← Cold-open active pane
3. Leads
4. Calendar
5. Response Desk
6. Proposal Workspace
7. Settings
8. Help / FAQ
```

GovCon Mode indicator inside the GovCon pane is untouched. Cold-open active pane remains `tab-govcon` (Phase 23C invariant). The Dashboard nav button is rendered above GovCon in source order; clicking it routes to the Dashboard launchpad pane.

## 3. Removed-from-active-nav matrix

| Pre-25L sidebar item | Pre-25L `data-tab` | Post-25L status                  | Replacement path                                |
|----------------------|--------------------|----------------------------------|-------------------------------------------------|
| Command Center       | `cmd`              | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Command              | `command`          | Hidden buffer, pane preserved    | Dashboard launchpad                             |
| Email Tracker        | `email`            | Hidden buffer, pane preserved    | Response Desk (Phase 25L-3 follow-up)           |
| Pilot Tracker        | `delivery`         | Hidden buffer, pane preserved    | Internal-only; docs/trial/                      |
| Opportunities        | `opportunities`    | Hidden buffer, pane preserved    | GovCon section                                  |
| Deal Workspace       | `dealwork`         | Hidden buffer, pane preserved    | Dashboard "Deal Workspace" launchpad card       |
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

All hidden items live in `#nav-section-removed-25l1` (`style="display:none"`, `aria-hidden="true"`, `data-phase-25l1="removed-from-active-nav"`). Each button carries `data-phase-25l1-removed="true"` so any downstream nav sweep can filter them out. **Phase 23C reachability invariant: every commercial nav button + pane stays in DOM.**

## 4. Dashboard consolidation

Dashboard's pane-body opens with a launchpad card (`#dash-launchpad`, `data-dash-launchpad="true"`) that surfaces 10 counts plus open-tab buttons:

```
┌─ Active pursuits ──┬─ Overdue items ────┬─ Today's Tasks ────┐
│  N                 │  N (red)           │  N                 │
│  [Open GovCon →]   │  [View Overdue →]  │  [Open Today's →]  │
├─ Pipeline value ───┼─ Proposal lines ───┼─ Deal Workspace ───┤
│  $N                │  N                 │  N                 │
│  [View Pipeline →] │  [Open Proposal →] │  [Open Deal WS →]  │
├─ Calendar events ──┼─ Open risks ───────┼─ Leads ────────────┤
│  N                 │  N                 │  N                 │
│  [Open Calendar →] │  [Open Response →] │  [Open Leads →]    │
├─ Reports ──────────
│  blurb
│  [View Reports →]
└────────
```

Dashboard is a **launchpad**, not a mega-page. Each card displays a single count plus one routing button. Detailed views remain in their dedicated panes, reachable from the launchpad.

`renderDashboardLaunchpad(stats)` runs on every `renderDashboard()`. It reads from already-computed `pipeline` / `overdue` / `proposals` stats plus `allLeads` and `window.sourceDeckCalendar.fetchAllEvents()` when the calendar module is loaded.

## 5. Phase-label scrub (visible UI only)

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

Internal-reference labels inside the snapshot Markdown export (`bullet('Opportunity summary (Phase 22B)', …)`, etc.) are **preserved**. They are internal-review-export annotations consumed by the operator / recipient, not visible buyer chrome.

## 6. What does NOT ship in 25L-1

- Calendar event Edit/Delete/Help icon → **Phase 25L-2**
- Settings Calendar Import card → **Phase 25L-2**
- Response Desk subtitle removal + Email Import boundary → **Phase 25L-3**
- Settings Email Import card → **Phase 25L-3**
- Proposal Workspace solicitation upload + extraction + section-level drafting → **Phase 25L-4**
- Subcontractor research workflow → **Phase 25L-5**
- Incumbents & Awards research workflow → **Phase 25L-5**
- Settings Hunter.io API key field → **Phase 25L-5**

## 7. Safety scan

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

## 8. Test coverage

- `test/phase-25l1-navigation-cleanup.test.js` — 8 sidebar items in order; 14 removed items absent; reachability buffer present; GovCon Capture OS scrubbed; commercial panes preserved.
- `test/phase-25l1-dashboard-consolidation.test.js` — 10 launchpad cards with correct openTab targets; renderDashboardLaunchpad invoked from renderDashboard; pane-title is "Dashboard"; sidebar order verified.
- `test/phase-25l1-phase-label-cleanup.test.js` — visible Phase labels scrubbed; "GovCon Capture OS" scrubbed across visible surfaces.
- Updated `test/govcon-primary-navigation.test.js` (Phase 23C invariants) for Phase 25L-1 supersession; 23/23 pass.
- Updated `test/govcon-mode-navigation.test.js` (Phase 23B brand-ver relabel); 17/17 pass.
- Updated `test/govcon-demo-delivery-polish.test.js` (Phase 23D Show All Tools supersession); 26/26 pass.
- Updated `test/phase-25e-pilot-tracker.test.js` (Phase 25E.5 → Phase 25L-1 Pilot relocation); pass.
- `npm test` → 57 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings.
- `node scripts/release-check.js` → privacy gate passes.

## 9. Paid-pilot readiness gate impact

This PR does **not** flip any of the Phase 25K readiness gate boxes. The gate's binary state remains as established in `docs/audits/phase-25k-paid-pilot-readiness-gate.md`. The operator regenerates the Day 0 trial package only after Phase 25L-1 through 25L-5 land plus the Phase 25I-recovery PR.

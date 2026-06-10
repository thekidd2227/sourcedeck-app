# Phase 25L-1 — Navigation + Dashboard Cleanup · Release Note

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L-1 (PR 1 of 5)

---

## What ships

1. **Sidebar reduced from 17 visible items to 8** in fixed order:
   `Dashboard → GovCon → Leads → Calendar → Response Desk → Proposal Workspace → Settings → Help / FAQ`. Dashboard sits above GovCon; Leads sits below GovCon.
2. **`GovCon Capture OS` relabeled to `GovCon`** (topbar `brand-ver`, sidebar nav-label, Setup Wizard wrap-up + tour copy).
3. **Dashboard rebuild as operating-hub launchpad** with 10 consolidation cards (Active pursuits, Overdue items, Today's Tasks, Pipeline value, Proposal deadlines, Deal Workspace, Calendar events, Open risks · replies, Leads, Reports). Each card has a one-click `openTab()` button. Dashboard does not render full module tables.
4. **Removed-from-active-nav buttons preserved as hidden DOM.** Phase 23C reachability invariant: every commercial nav button + pane remains in DOM. Programmatic `openTab('cmd')`, `openTab('overdue')`, etc. continue to resolve.
5. **Phase-label scrub on visible UI** (Help/FAQ banner, Settings notes, GovCon Capture Command Center placeholder, GovCon Bid/No-Bid snapshot rows, Export Matrix toast).
6. **`gcToggleAllTools` preserved as a no-op stub** so any legacy caller does not throw.

## What does NOT ship in 25L-1

- Calendar event Edit/Delete/Help icon → **Phase 25L-2**
- Settings Calendar Import card → **Phase 25L-2**
- Response Desk subtitle removal + Email Import boundary → **Phase 25L-3**
- Settings Email Import card → **Phase 25L-3**
- Proposal Workspace solicitation upload + extraction + section-level drafting → **Phase 25L-4**
- Subcontractor research workflow → **Phase 25L-5**
- Incumbents & Awards research workflow → **Phase 25L-5**
- Settings Hunter.io API key field → **Phase 25L-5**

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
- No portal upload (SAM.gov, PIEE, eBuy, GSA, agency portals, acquisition.gov)
- No calendar provider upload / sync
- No Google / Microsoft / iCloud password or OAuth requirement
- No pricing source change
- No checkout / payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send / no-submit / no-upload boundary preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25l1-navigation-cleanup.test.js`
- `test/phase-25l1-dashboard-consolidation.test.js`
- `test/phase-25l1-phase-label-cleanup.test.js`
- Wired into `npm test`.

Existing tests adjusted for Phase 25L-1 supersession (Phase 23B brand-ver, Phase 23C nav cosmetics, Phase 23D Show All Tools, Phase 25E.5 Pilot label).

**Full gate results:**
- `npm test` → 57 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings.
- `node scripts/release-check.js` → privacy gate passes (macOS signing env left to operator).

## Operator next step

Review and approve PR 25L-1. Once it merges, proceed to **Phase 25L-2** (Calendar Edit/Delete + Settings-Based Import Help). Per the new 5-PR plan, **no further Phase 25L PR will be opened until you approve 25L-1**.

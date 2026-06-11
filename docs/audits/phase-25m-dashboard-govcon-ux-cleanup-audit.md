# Phase 25M — Dashboard + GovCon UX Cleanup Audit

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Buyer-reported pain

Screenshots showed the Dashboard and GovCon panes felt **crowded and overwhelming**. The buyer specifically liked the GovCon top-tab structure but wanted a clearer primary action and less internal-build verbiage. The Phase 25M cleanup pass is intentionally **additive**, not a full visual redesign — adding the right entry points and reducing required user effort to start a pursuit.

## 2. Dashboard changes

The launchpad grid (Phase 25L-1) gains one new card at the head of the grid:

```
┌─ Start a pursuit ────────────┬─ Active pursuits ──┬─ Overdue items ────┐
│ Search SAM.gov · Upload · …  │  N                 │  N (red)           │
│ [🔎 Search SAM.gov]          │  [Open GovCon →]   │  [View Overdue →]  │
│ [📎 Upload Solicitation/…]   │                    │                    │
│ [📋 Paste Solicitation Text] │                    │                    │
├─ Today's Tasks ──────────────┴────────────────────┴───
…
```

- The new card is `data-dash-card="start-pursuit"`.
- Three actions, each with `data-dash-start-action`:
  - `search-sam` → opens GovCon and scrolls to `#gc-sam-pipeline`.
  - `upload-solicitation` → opens Proposal Workspace and triggers `pwSolOpenFilePicker()`.
  - `paste-solicitation` → opens Proposal Workspace and triggers `pwSolTogglePasteArea()`.
- The existing 10 launchpad cards (Active pursuits, Overdue items, Today's Tasks, Pipeline value, Proposal deadlines, Deal Workspace, Calendar events, Open risks, Leads, Reports) are unchanged. Dashboard remains a launchpad — no full module tables.

## 3. GovCon changes

The section-pill nav (`#gc-section-nav`) gains a **Pipeline** pill anchoring `#gc-sam-pipeline`. The Pipeline pill is the first one — it's the highest-impact buyer action.

```
Jump to: [Pipeline]  [Overview]  [Operating Rhythm]  [Solicitation]  [Vendor & Pricing]  …
```

The Pipeline section itself (Phase 25M SAM search) sits above the existing Phase 23B GovCon Mode indicator so the buyer's first eye-fixation inside GovCon lands on the actionable Search SAM.gov surface, not on the introductory copy.

## 4. Carried-forward invariants (from Phase 25L-1)

- Sidebar surfaces 8 items: Dashboard → GovCon → Leads → Calendar → Response Desk → Proposal Workspace → Settings → Help / FAQ.
- Sidebar nav-label reads `GovCon` (not `GovCon Capture OS`). Topbar `brand-ver` likewise.
- Removed-from-active-nav buttons (Email Tracker, Pilot Tracker, Command Center, Command, Opportunities, Deal Workspace, Pipeline pane, Reports pane, Daily Ops, Overdue, Revenue, Ad Engine, Socials, Outreach, Prime Partners) remain in `#nav-section-removed-25l1` for `openTab()` reachability.
- Visible Phase labels stay scrubbed from active UI.

## 5. What Phase 25M deliberately did NOT change

- The full GovCon Mode indicator copy block.
- The Phase 22B Capture Command Center counts.
- The 13-section Proposal Workspace nav rail (Phase 25E.2). Phase 25M's solicitation intake card sits above it; the existing per-section drafting flow is untouched.
- The Phase 25L-2 ICS help panel content. Only the button shape was changed.

A deeper layout / spacing pass is out of scope for Phase 25M. The cleanup here targets buyer-reported friction points: visible **entry points** for the most common pursuit-start actions, and a clear visual home for SAM.gov inside the app.

## 6. Safety scan

| Query                                          | Active-UI hits | Status |
|------------------------------------------------|---------------:|--------|
| `>Submit Bid<` button                          |              0 | ✅     |
| `>Submit Quote<` button                        |              0 | ✅     |
| `>Send Email<` button                          |              0 | ✅     |
| `upload to SAM` / `upload to PIEE` / `upload to eBuy` / `upload to acquisition.gov` | 0 | ✅ |
| `auto-contact vendors` / `auto-contact agencies` | 0 | ✅     |
| `live calendar sync (enabled|active|on)`       |              0 | ✅     |
| `Gmail password` / `iCloud password` / `Outlook password` | 0 | ✅ |
| `certified compliant` / `legally sufficient` / `provides legal advice` | 0 | ✅ |
| `GovCon Capture OS` visible label              |              0 | ✅     |

## 7. Tests

- `test/phase-25m-dashboard-govcon-ux-cleanup.test.js`

`npm test` → 64 PASS suites, 0 FAIL.

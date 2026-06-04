# Phase 20G — Responsive Demo Screenshot QA Checklist

**Branch:** `feat/phase-20g-responsive-demo-polish`
**Purpose:** Final visual QA for SourceDeck Civic Atelier before demo handoff.
**Capture target:** Electron app on macOS, same zoom level for every frame.

## Setup

1. Start from a clean checkout of the Phase 20G branch.
2. Launch SourceDeck with the normal local app command.
3. Use the same app data state for every capture.
4. Do not capture or expose secrets.
5. Do not run or modify SAM Opportunity Sprint during this walkthrough.
6. Attach screenshots to the PR, or store temporary captures in a gitignored scratch folder.

## Required Frames

| # | Viewport / state | Screen | Inspect | Failure criteria | Blocks merge |
|---|---|---|---|---|---|
| 1 | Desktop `1440 x 900` | Default shell | Topbar, sidebar, pane header, brand mark, active nav state. | Text overlap, clipped title, sidebar overflow, broken active rail, or wrong Civic Atelier tones. | Yes |
| 2 | Desktop `1440 x 900` | Dashboard | KPI grid, cards, tables, primary actions. | KPI/card crowding, table clipping, unreadable labels, or `.btn-gold` shifted from cool gold. | Yes |
| 3 | Desktop `1440 x 900` | GovCon workspace | Workspace layout, KPI row, opportunity table, non-SAM GovCon surfaces. | Any SAM Sprint/Profile copy changed, table overflow without scroll, or action controls overlapping. | Yes |
| 4 | Desktop `1440 x 900` | Troubleshooting / readiness banner | Readiness ledger, severity badges, remediation actions. | Finding labels/descriptions overlap, badge colors regress, or release/troubleshooting copy changes. | Yes |
| 5 | Desktop `1440 x 900` | Settings / onboarding | Settings cards, readiness panel, setup wizard entry. | Form fields clipped, labels unreadable, buttons overflow, or credential copy changed. | Yes |
| 6 | Tablet `1024 x 768` | Default shell | Sidebar width, pane title, two-column grid collapse. | Sidebar labels wrap awkwardly, pane actions push off-screen, or grid cards overlap. | Yes |
| 7 | Tablet `900 x 768` | Sidebar boundary | Boundary before horizontal nav collapse. | Sidebar width or nav active rail regresses from intended breakpoint behavior. | Yes |
| 8 | Tablet `899 x 768` | Collapsed sidebar | Horizontal nav scroller, sticky topbar/sidebar, active nav pill. | Nav pills stretch full-width, scroller disappears, or sticky elements cover content. | Yes |
| 9 | Mobile `768 x 844` | Dashboard | Single-column grid, touch targets, table horizontal scroll. | Controls below 44px touch target, table escapes viewport, or content requires two-axis page scrolling. | Yes |
| 10 | Mobile `480 x 844` | Settings / onboarding | Pane header wrap, form controls, slide panel behavior. | Inputs trigger cramped layout, buttons overflow, or slide panel clips essential actions. | Yes |
| 11 | Mobile `375 x 812` | GovCon workspace excluding SAM Sprint changes | GovCon table/card layout and non-SAM controls. | SAM Sprint card/copy modified, GovCon Profile section modified, or non-SAM controls overlap. | Yes |
| 12 | Short landscape `844 x 390` | Any dense tab | Topbar height, horizontal nav, pane scroll. | Sticky chrome consumes the viewport, content inaccessible, or pane body cannot scroll. | Yes |
| 13 | Sidebar scroll state | Full nav list | Horizontal mobile nav and desktop vertical nav. | Missing nav items, duplicate active state, unreadable section labels on desktop, or broken scroll cue on mobile. | Yes |
| 14 | `.btn-gold` regression | Dashboard, Settings, GovCon | Cool gold button color and hover state. | Button appears brass instead of cool gold, or hover state changes from `--gold2`. | Yes |

## GovCon-Specific Boundary

During Phase 20G capture, GovCon QA must avoid the active SAM Sprint/Profile UX lane.

- Do not edit or judge new SAM Sprint plan/profile UX copy in this branch.
- Do not modify the SAM Opportunity Sprint card.
- Do not modify the GovCon Pursuit Profile section.
- Do not run live SAM execution from the UI.
- Do not send outreach or submit quotes.

## Visual Regression Watch

| Item | Pass signal | Failure signal |
|---|---|---|
| Civic Atelier shell | Obsidian sidebar, federal-navy topbar, readable mono labels. | Prior near-black/navy wash returns or labels lose contrast. |
| Responsive grids | 4 → 3 → 2 → 1 column transitions remain orderly. | Cards overlap, large gaps appear, or content clips. |
| Tables | Horizontal scrolling works on small screens. | Columns escape viewport with no scroll affordance. |
| Readiness banners | Ledger rows remain readable and scoped. | Severity badges, finding labels, or remediation copy shift unexpectedly. |
| Buttons | `.btn-gold` remains cool gold. | Global gold token appears repointed to brass. |
| Forms | Inputs stay at mobile-safe sizing. | iOS zoom-prone input sizes or clipped field labels. |

## Captured Evidence — 2026-06-04

Capture time: `2026-06-04T02:38:19Z`

Local environment:
- Branch: `feat/phase-20g-responsive-demo-polish`
- Main baseline included `898caed` (`docs(govcon): clean up SAM sprint post-merge wording`)
- SourceDeck was launched with `npm start` (`electron .`)
- macOS `System Events` could see the `Electron` process, but assistive access was not granted, so scripted Electron-window resize/click capture was blocked
- Supplemental static renderer captures were taken through the Codex in-app browser against `http://127.0.0.1:8765/sourcedeck.html`

Screenshot folder:

`/Users/jean-maxcharles/sourcedeck-app/.codex/worktrees/phase-20g-responsive-demo-polish/.qa/phase-20g-screenshots/`

Screenshots are stored locally and are not committed. No secrets were captured. SAM Sprint/Profile areas were not modified.

| # | File | Result | Notes |
|---|---|---|---|
| 1 | `01-desktop-1440x900-default-shell.png` | PASS | Desktop shell captured; no text overlap, clipped title, sidebar overflow, duplicate active state, or visible secrets observed. |
| 2 | `02-desktop-1440x900-dashboard.png` | FAIL | Dashboard layout captured, but `.btn-gold`/primary action color did not satisfy the cool-gold regression criterion in the current rendered app state. |
| 3 | `03-desktop-1440x900-govcon-workspace.png` | PASS | GovCon workspace captured; no live SAM Sprint execution, no outreach, no quote submission, and no visible secrets. |
| 4 | `04-desktop-1440x900-troubleshooting-readiness.png` | PASS | Readiness ledger captured; no overlap or clipped remediation controls observed. |
| 5 | `05-desktop-1440x900-settings-onboarding.png` | PASS | Settings/onboarding surface captured with no password values visible. |
| 6 | `06-tablet-1024x768-default-shell.png` | PASS | Tablet shell captured; no grid overlap or pane-action overflow observed. |
| 7 | `07-tablet-900x768-sidebar-boundary.png` | FAIL | The 900px frame rendered the horizontal collapsed nav state; the checklist expected the boundary before horizontal nav collapse. |
| 8 | `08-tablet-899x768-collapsed-sidebar.png` | PASS | Collapsed horizontal nav captured with one active state and no visible secret values. |
| 9 | `09-mobile-768x844-dashboard.png` | PASS | Mobile dashboard captured; no horizontal document overflow observed and mobile controls reported 44px minimum height where active. |
| 10 | `10-mobile-480x844-settings-onboarding.png` | PASS | Mobile settings/onboarding captured; no visible password values, no form overflow observed. |
| 11 | `11-mobile-375x812-govcon-workspace-non-sam.png` | PASS | Mobile GovCon capture completed without modifying SAM Sprint/Profile areas or running live SAM execution. |
| 12 | `12-landscape-844x390-dense-tab.png` | PASS | Short landscape dense tab captured; pane remained scrollable and no visible secrets were observed. |
| 13 | `13-sidebar-scroll-state.png` | PASS | Sidebar scroll state captured with one active nav state and no missing visible nav controls in the captured scroller state. |
| 14 | `14-btn-gold-regression.png` | FAIL | `.btn-gold` regression criterion did not pass: captured primary buttons rendered blue-toned (`--gold` resolved to `#1A6FA8`) rather than cool gold. |

Blocking conclusion:

- Screenshot QA is **not green**.
- PR #48 must remain draft.
- Do not merge until the `.btn-gold` criterion and 900px sidebar-boundary expectation are either fixed in a separate authorized UI/CSS change or the checklist is intentionally updated to match the current accepted behavior.
- Smallest safe next step: get explicit approval to patch responsive/Civic CSS in `sourcedeck.html`, or revise the checklist if current brand-accented `.btn-gold` and 900px collapsed nav are now accepted product behavior.

## Sign-Off Gate

Before merge:

- [ ] All required frames captured.
- [ ] All blocking failure criteria pass.
- [ ] No SAM Sprint/Profile areas changed.
- [ ] `.btn-gold` regression check passes.
- [ ] No secrets visible in screenshots.
- [ ] Validation commands pass or are documented with a clear blocker.

If any blocking row fails, keep the PR as draft and patch only the smallest safe CSS/layout issue outside SAM Sprint/Profile areas.

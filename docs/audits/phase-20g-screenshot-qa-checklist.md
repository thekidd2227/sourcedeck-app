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

## Sign-Off Gate

Before merge:

- [ ] All required frames captured.
- [ ] All blocking failure criteria pass.
- [ ] No SAM Sprint/Profile areas changed.
- [ ] `.btn-gold` regression check passes.
- [ ] No secrets visible in screenshots.
- [ ] Validation commands pass or are documented with a clear blocker.

If any blocking row fails, keep the PR as draft and patch only the smallest safe CSS/layout issue outside SAM Sprint/Profile areas.

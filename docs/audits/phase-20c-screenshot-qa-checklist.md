# Phase 20C — Screenshot QA Checklist (Operator)

**PR:** #40 — `feat(ui): redesign Civic Atelier navigation shell`
**Branch:** `feat/phase-20c-civic-shell-redesign`
**Head SHA:** `fcfddc3`
**Base:** `main @ 6d4e7d8` (Phase 20B token foundation)

This is the operator-facing walkthrough used to verify Phase 20C before promoting PR #40 from draft to ready-for-review. It complements `docs/audits/phase-20c-civic-shell-redesign-audit.md`. **Do not merge PR #40 until every "Blocks merge: yes" row is captured and verified pass.**

## Setup

1. **Before screenshots:** check out `main` (`6d4e7d8`) and capture every "Before" frame at the same window dimensions and zoom. Then `git switch feat/phase-20c-civic-shell-redesign` and capture every "After" frame at the same dimensions.
2. **Recommended dimensions:** `1440 × 900` for default desktop frames; explicit widths called out in the table for breakpoint frames.
3. **Capture method:** Electron app on macOS via `npm run dev` or `npm start`. Use the system screenshot tool (`Cmd+Shift+4`). Attach pairs to the PR as comments or commit them under `tmp/phase-20c-screenshots/` (gitignored).
4. **Naming:** `20c-<##>-<slug>-{before|after}.png` (e.g. `20c-01-default-desktop-after.png`).

## Checklist

| # | Screen / view to open | Visual element to inspect | Failure criteria (what makes this a NO-GO) | Blocks merge |
|---|---|---|---|---|
| 1 | **Default desktop shell** — launch app; default landing tab; window ≥ 1180 px wide. | Topbar should read as Civic Atelier federal-navy command zone (`#172033`, slightly lighter than prior near-black). Sidebar should read as true editorial black (`--sd-obsidian` `#0B0B0A`). Pane header should match topbar tone. | Topbar still reads as the prior `#0B1829` near-black, OR sidebar still reads as `--panel2` navy (`#0A1420`), OR pane header doesn't match topbar tone. | **yes** |
| 2 | **Topbar + brand mark** — default shell, default width; focus on top 64px strip. | Logo-mark plate: obsidian ground with a subtle brass hairline + brass glow. Brand-name "SourceDeck" + version chip render identically to before (Syne typography unchanged). KPI strip (`.tb-kpi`) hairlines unchanged at rest; brass-tinted hairline on hover. Live-dot still pulses green at the same color/cadence. | Logo-mark plate appears with cool-gold (not brass) hairline, OR brand-name letterforms changed, OR live-dot changes hue, OR KPI hover hairline still cool gold. | **yes** |
| 3 | **Sidebar active nav state** — click any nav tab so one `.nav-btn.active` is visible. | Active button shows: brass left rail (`--sd-brass-gold` `#B08A3C`), brass-tinted background gradient, brass-light label color (`--sd-brass-gold-light` `#C7A24E`), brass-tinted border. Inactive nav buttons unchanged (transparent / `--muted`). Nav-section labels readable (no longer near-invisible). | Active rail still cool gold, OR active label still `--gold2` cool tone, OR nav-section labels still on low-contrast `--dim` (look at small uppercase mono labels like "PIPELINE" / "GOVCON" — they should be clearly readable now). | **yes** |
| 4 | **Dashboard pane title** — click Dashboard tab; focus on the page-header title row. | Pane title renders in Cormorant Garamond italic at 20px weight-600. Should read as editorial display, not geometric Syne sans. Title should not clip vertically inside the 14px-padded `.pane-hdr`. `.pane-sub` mono caption below unchanged. | Title clips vertically (ascenders touching pane-hdr top edge), OR title overflows horizontally, OR Cormorant fallback (`Georgia`) loads instead of Cormorant (system without the webfont), OR title still renders in Syne. | **yes** |
| 5 | **GovCon pane title** — switch to GovCon tab. | Same Cormorant Garamond italic at 20px. Verify the (likely) longer title string doesn't push `.pane-actions` off-screen and doesn't wrap awkwardly. | Title wraps to 2 lines, OR pushes pane-actions controls off-screen, OR title is truncated by ellipsis where prior Syne version was not. | **yes** |
| 6 | **Troubleshooting pane title** — switch to Troubleshooting tab. | Same Cormorant Garamond italic at 20px. Verify the editorial title sits well alongside the operator monospace `.pane-sub` caption beneath it. | Visual tension between italic serif title and mono caption is jarring, OR title baseline misaligns with the new pane-hdr civic-navy gradient. | **yes** |
| 7 | **Sidebar at default width (224 px)** — default desktop window, ≥1180 px wide. | Sidebar reads obsidian black, 224 px wide, all nav labels readable, no horizontal scroll inside the sidebar. Brass active rail visible on the left edge of the active button. | Sidebar width != 224 px (CSS variable broken), OR text overflow inside any nav button, OR scrollbar visible inside the sidebar at default width. | **yes** |
| 8 | **Sidebar at 1024 px breakpoint (196 px)** — resize the window to between 901 and 1024 px wide. | Sidebar narrows to 196 px (per `:root{--sidebar:196px}` media query). Nav button labels still fit on a single line; icons stay aligned; brass active rail still visible. | Sidebar width != 196 px, OR nav labels truncate / wrap, OR active rail disappears, OR icons misalign. | **yes** |
| 9 | **Sidebar at 900 px breakpoint (176 px)** — resize the window to exactly 900 px wide (the boundary). | Sidebar narrows to 176 px (per `:root{--sidebar:176px}` media query). Nav buttons still distinguishable; brass active rail still readable. Labels may be tight; should not collapse to icon-only unless that's the prior behavior on `main`. | Sidebar layout regresses from `main @ 6d4e7d8` baseline (e.g., visible reflow that did not happen pre-20C), OR brass rail becomes invisible against the narrower button. | **yes** |
| 10 | **≤900 px collapsed / mobile shell state** — resize the window to < 900 px wide (e.g. 700 px). | The pre-existing horizontal-collapse / mobile shell layout renders identically to `main @ 6d4e7d8`. No new layout behavior. (20C did not change media-query rules; this is a regression watch.) | Any layout change vs `main @ 6d4e7d8` at the same width — items reorder, controls overlap, sidebar refuses to collapse, etc. | **yes** |
| 11 | **Dashboard `.btn-gold` visual check** — Dashboard tab; locate any primary gold button (e.g. "Generate Brief", "Refresh", or similar). | The button background must still be **cool gold (`#C9941A`)**, not brass. The button hover state must still be `--gold2` cool tone (`#E8A91E`). This proves no global `--gold` / `--gold2` alias was repointed. | The button background renders in brass (`#B08A3C`) — that means a global alias was repointed by mistake; **revert and re-scope**. | **yes** |
| 12 | **Feature-view `.btn-gold` visual check** — open at least one non-dashboard view that uses gold buttons (e.g. GovCon search "Run search", Outreach "Send draft", Settings "Save", or any other `.btn-gold` outside the shell). | Same as #11 — feature-view gold buttons must remain cool gold (`#C9941A`). Status pills, KPI value chips, and any other `--gold*`-consuming surface must also be unchanged. | Any `.btn-gold` instance outside the shell renders in brass; OR a status pill / KPI accent shifts toward brass; **revert and re-scope**. | **yes** |

## Additional regression watch (capture in passing — no separate frames needed)

| # | Watch item | Failure criteria |
|---|---|---|
| R1 | macOS title-bar drag region — try dragging the window by the topbar | Window cannot be moved by dragging the topbar (means `-webkit-app-region:drag` got broken) |
| R2 | Nav button hover state — hover an inactive `.nav-btn` | Hover background appears anything other than the subtle white-low-alpha overlay it used pre-20C |
| R3 | Live-dot pulse animation | Pulse cadence changes, OR green hue changes, OR pulse stops |
| R4 | Nav-badge red alert | Red shifts hue (was `--red` `#8B1A2E`; must stay that exact shade) |
| R5 | Pane-body scrollbar | Scrollbar thumb color / width changes (not touched in 20C) |
| R6 | Topbar separator (`.topbar-sep`) | Hairline disappears, changes color, or changes thickness |
| R7 | `.tb-kv` KPI number typography | Font / weight / size changes (Syne 16px weight-700 must be preserved) |

## Sign-off gate

The PR may be promoted from **draft → ready-for-review** only after:

- [ ] All 12 numbered rows captured with before/after pairs.
- [ ] All 12 "Failure criteria" rows return **NOT triggered** (i.e., pass).
- [ ] All 7 regression watch items (R1–R7) confirmed unchanged.
- [ ] Before/after screenshot URLs or local paths attached to PR #40 as comments (or committed under `tmp/phase-20c-screenshots/`).
- [ ] An operator (you) has personally walked through each row.

If any blocking row fails: keep PR #40 as draft, open a follow-up commit on `feat/phase-20c-civic-shell-redesign` to address the issue, and re-run this checklist from the top.

## What still cannot be tested from this environment

- The host CI/build environment has no Electron GUI driver (no Playwright, no Puppeteer, no DISPLAY). Every "after" frame above must be captured by an operator on macOS.
- Webfont rendering (Cormorant Garamond) depends on the renderer loading the font correctly; verify in row 4 that the fallback to Georgia is not what's showing.

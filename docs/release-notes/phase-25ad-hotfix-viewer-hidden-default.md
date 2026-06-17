# Phase 25AD-HOTFIX — Right-side file viewer hidden by default

**Branch:** `fix/phase-25ad-viewer-hidden-default`
**Scope:** Runtime hotfix — visibility of `#sd-right-file-viewer`. No other behavior, search, package download, extraction, pricing, or boundary surface is touched.

## What was broken

After Phase 25AD merged, the attached right-side file viewer rendered with the HTML `hidden` attribute AND an inline `display:flex`. Because inline styles outrank the user-agent `[hidden]{display:none}` rule, the viewer stayed visible and showed "No file selected" — taking nearly half the app shell even when no file had been opened.

## What changed

- **CSS** (`sourcedeck.html` main style block) — added two authoritative rules:

  ```css
  #sd-right-file-viewer[hidden]{ display:none !important; }
  #sd-right-file-viewer.is-open{ display:flex !important; }
  ```

- **Aside opening tag** — removed `display:flex` from inline style (kept `flex-direction:column` so it still composes correctly when open), and added `aria-hidden="true"` to mirror the `hidden` attribute.
- **`sdRightFileViewerOpen()`** — now flips `hidden=false`, sets `aria-hidden="false"`, and adds `.is-open`.
- **`sdRightFileViewerClose()`** — now flips `hidden=true`, sets `aria-hidden="true"`, removes `.is-open`, clears the active pursuit/file markers, and resets the body back to the default "click View" hint so a closed viewer never re-opens with stale content.
- **No change** to `gcACPreviewFile`, the View action, Open Local File, or any IPC. The viewer still opens **only** when the user clicks View on a downloaded attachment.

## What stayed the same

- View → `gcACPreviewFile` → right-side viewer (no separate OS/browser window for inline preview).
- Open Local File still launches the canonical package folder via `gcABOpenLocalPackageFolder` (`shell.openPath` through the credential boundary).
- Path validation in `govcon:preview-package-file` is unchanged.
- Phase 25AD keyword tighten, Unpursue/Delete, package manifest, and Solicitation Center handoff — all preserved verbatim.

## Tests

- `test/phase-25ad-hotfix-viewer-hidden-default.test.js` — 9/9 PASS:
  - aside is rendered `hidden` + `aria-hidden="true"` by default
  - aside inline style no longer contains `display:flex`
  - CSS rule `#sd-right-file-viewer[hidden]{display:none !important}` exists
  - CSS rule `#sd-right-file-viewer.is-open{display:flex !important}` exists
  - "No file selected" copy is scoped to the hidden header + close reset
  - Open helper adds `.is-open` and flips both visibility flags
  - Close helper restores closed state and clears active markers
  - Open Local File still routes through `gcABOpenLocalPackageFolder`
  - View still routes through `gcACPreviewFile` (no separate-window path)

### Regression sweep (PASS)

- `phase-25ad-right-side-file-viewer.test.js` (10/10)
- `phase-25ad-view-details-after-download.test.js` (6/6)
- `phase-25ad-local-package-files-display.test.js` (6/6)
- `phase-25ad-send-package-to-solicitation-center.test.js` (5/5)
- `phase-25ac-solicitation-runtime-repair.test.js` (10/10)
- `phase-25ab-sam-package-download-all.test.js` (OK)
- `phase-25aa-tighten-2.test.js` (11/11)
- `renderer-boot.test.js` (7/7)
- `govcon-core-hardening.test.js` (15/15)

### Gates

- `npm test` → exit 0 (full suite, hotfix wired in)
- `npm run govcon:smoke` → 47/0 PASS
- `npm run troubleshooting:scan` → no fail/warn findings
- `node scripts/release-check.js` → privacy gate ✓ (macOS signing warnings expected in dev)

## Safety

- No `.env*` changes; no secret printing; no deploy / publish / release.
- No change to SAM.gov search, package download, extraction, or any IPC handler.
- No change to pricing, Stripe, payment, or checkout.
- No new `window.open` / `openExternal` introduced by the hotfix.
- No new visible "No file selected" surface; the one occurrence remaining inside the hidden viewer is not rendered until the user explicitly opens it.

## Manual smoke

1. Launch SourceDeck — confirm the right-side panel is **absent**.
2. Find Opportunities, Saved Pursuits, Solicitation Center, Dashboard — confirm full-width layout, no reserved right column.
3. Open a saved pursuit → click View on a downloaded attachment → viewer slides in from the right.
4. Click ✕ → viewer disappears; left content reclaims full width.
5. Click View on a different file → viewer reopens with the new content; "No file selected" never appears in normal flow.

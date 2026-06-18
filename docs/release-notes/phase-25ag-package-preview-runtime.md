# Phase 25AG — Package Preview Viewer Runtime Repair (Release Notes)

**Date:** 2026-06-18
**Branch:** `fix/phase-25ag-package-preview-runtime`
**Surface:** GovCon → Saved Pursuits / Solicitation Center → right-side
attached file viewer.

## What's fixed (the headline)

The right-side viewer was dumping SourceDeck's own UI / CSS text into
the preview pane and freezing the renderer. Root cause: when SAM.gov
or a linked resource served an HTML page (portal page, login, error,
or in the worst case the host app's index), SourceDeck saved it under
the package as `.html` / `.htm` and the IPC handler returned the full
file as inline text. The viewer then assigned that raw HTML / text
through `innerHTML`.

Phase 25AG:

- **Blocks `.html` / `.htm` from inline preview.** Always. Even when
  the file lives under the approved package root. SAM.gov can't be
  trusted to never redirect a description fetch to an HTML page.
- **Adds an app-shell guard.** Even text files (`.txt`, `.log`, etc.)
  are scanned for SourceDeck UI markers (`.cmd-flow`, `.cmd-pill`,
  `.cc-lcc-grid`, `SourceDeck GovCon Pipeline`, etc.) and refused
  when matched. Two markers required so a real solicitation that
  mentions "SourceDeck" once doesn't get blocked.
- **Caps text payloads at 200,000 characters.** Anything larger is
  sliced to the cap and the viewer shows "Preview truncated for
  performance. Open Local File to view the full document." Eliminates
  the renderer freeze on giant `description.txt` payloads.
- **Eliminates raw innerHTML assignment for preview content.** File
  text now reaches the DOM exclusively via `.textContent` after
  building the `<pre>` block with `createElement`. No `srcdoc`, no
  `<iframe>`, no `<webview>`.
- **Hardens the path allowlist.** Both the approved solicitations
  root and the requested file are resolved through `realpath` so
  symlinks can't smuggle paths out of `userData/govcon/solicitations`.
  URL-shaped inputs are refused up front.
- **Clarifies the no-match / unsupported / blocked copy.** Office
  files surface a clean "Office preview is not available inline. Use
  Open Local File." Missing or corrupt files surface "Preview
  unavailable for this file. Re-download the package or use Open
  Local File."
- **Defensive busy state cleanup.** The whole preview pipeline runs
  inside `try / catch / finally`. The loading shimmer is always
  cleared. A thrown exception shows "Preview failed." — never a stack
  trace.
- **Download still doesn't auto-open the viewer.** Pinned by
  regression test. `gcABDownloadPackage` never calls `gcACPreviewFile`
  or `sdRightFileViewerOpen`. The viewer opens only when the user
  clicks **View** on a specific file row.

## What you'll see now

| Scenario | Before | After |
| -------- | ------ | ----- |
| SAM returns an HTML portal page as description.html | Right-side viewer dumps raw HTML / SourceDeck UI text and freezes | Fallback panel: "HTML / web pages are blocked from inline preview because SAM.gov can return portal or error pages. Use Open Local File or re-download the package." |
| A 12 MB description.txt | Renderer hangs trying to render the whole text | Soft cap: first 200,000 characters render inside `<pre>` (textContent), notice says "Preview truncated for performance. Open Local File for the full document." |
| A 20 MB scan PDF | Read into memory anyway | Hard cap (8 MB): fallback "File is too large to preview inline. Use Open Local File." File is never read. |
| Missing / corrupt package file | Loading shimmer sticks | Generic "Preview unavailable for this file." — busy state cleared. |
| DOCX / XLSX file | "Office preview not available yet" | "Office preview is not available inline. Use Open Local File." (optional bounded 4000-char extracted-text snippet still shown when one is on the file state) |
| Click Download Solicitation Package | (works correctly) | (still works correctly — pinned by regression test) |
| Click View on a file row | Opens the right-side viewer | Opens the right-side viewer (unchanged) |

## What did NOT change

- The right-side viewer concept itself.
- The Phase 25AF extraction engine.
- SAM.gov search / filter / index logic.
- Pricing, Stripe / checkout, the approved SourceDeck logo, the
  GovCon tab architecture, the blank-canvas default, the request-
  access delivery model.
- Saved pursuits, package download, Solicitation Center, Open Local
  File.

## Verification

```bash
npm test                                                      # all phase suites OK
npm run govcon:smoke                                          # 47 passes, 0 failures
npm run troubleshooting:scan                                  # no fail/warn
node scripts/release-check.js                                 # privacy gate ✓
node test/phase-25ag-download-does-not-open-viewer.test.js    # OK
node test/phase-25ag-preview-html-blocked.test.js             # OK
node test/phase-25ag-preview-path-allowlist.test.js           # OK
node test/phase-25ag-preview-safe-rendering.test.js           # OK
node test/phase-25ag-preview-size-limit.test.js               # OK
node test/phase-25ag-office-preview-fallback.test.js          # OK
node test/phase-25ag-missing-corrupt-preview-file.test.js     # OK
```

## Manual test plan (after rebuild + Day 0 refresh)

- [ ] Click **Download Solicitation Package** on a saved pursuit →
      the right-side viewer does NOT open until you click View on a
      file row.
- [ ] After download, click **View** on a `.txt` file → text renders
      inside the viewer; busy state clears.
- [ ] Click **View** on an `.html` / `.htm` attachment → fallback
      panel says "HTML / web pages are blocked from inline preview"
      — no SourceDeck UI text appears.
- [ ] Click **View** on a 10 MB+ file → fallback says "File is too
      large to preview inline. Use Open Local File."
- [ ] Click **View** on a `.docx` / `.xlsx` → "Office preview is not
      available inline." (snippet appears if extraction populated one)
- [ ] Click **View** on a missing / deleted file → "Preview
      unavailable for this file. Re-download the package or use Open
      Local File."

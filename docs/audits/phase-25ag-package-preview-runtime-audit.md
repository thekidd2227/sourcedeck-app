# Phase 25AG — Package Preview Viewer Runtime Audit

Branch: `fix/phase-25ag-package-preview-runtime`
Audit date: 2026-06-18

## Root cause (one-line)

`ipcMain.handle('govcon:preview-package-file', …)` listed `.html` and
`.htm` in `TEXT_EXT` and returned the full file body as inline text.
When SAM.gov / a linked resource served a portal page, login page,
error page, or SourceDeck's own app shell HTML, the renderer surfaced
that content in the right-side viewer — including UI/CSS dumps like
`SourceDeck GovCon Pipeline`, `.cmd-flow`, `.cmd-pill`, `.cc-lcc-grid`
— and the large payload (`bodyEl.innerHTML = lines.join('')`) froze
the renderer.

## What Phase 25AG fixes

### Main process (`main.js::govcon:preview-package-file`)

- Reject URL-shaped inputs up front (`remote_url_refused`).
- Resolve `realpath` for both the approved root and the requested
  target so symlinks can't smuggle paths outside
  `userData/govcon/solicitations`.
- New explicit branch: `ext === '.html' || ext === '.htm'` returns
  `{ kind:'fallback', reason:'html_not_previewable', ... }` BEFORE the
  text branch runs.
- `TEXT_EXT` reduced to `['.txt', '.csv', '.json', '.xml', '.md',
  '.rtf', '.log']` — `.html` and `.htm` are no longer eligible.
- New helper `looksLikeSourceDeckAppShellPreview(text)` checks the
  first 64 KB of any text payload for SourceDeck UI markers (any 2 of:
  `SourceDeck GovCon Pipeline`, `GovCon Find Opportunities`, `Operating
  Hub`, `.cmd-flow`, `.cmd-pill`, `.cc-lcc-grid`, `tab-govcon`,
  `tab-dashboard`, `SourceDeck does not auto-send`). When matched the
  handler returns `reason:'app_shell_preview_blocked'`.
- New `MAX_TEXT_PREVIEW_CHARS = 200_000` soft cap. Text over the cap
  is sliced to the cap and the payload carries
  `truncated:true, charCount, limitation:'truncated_for_preview',
  message`.
- Hard `MAX_BYTES = 8 MiB` cap is unchanged. Files over the hard cap
  return `reason:'too_large'` and the handler never calls `readFile`.

### Renderer (`sourcedeck.html::gcACPreviewFile`)

- Body construction rewritten from `lines.push('<pre>' + esc(text) +
  '</pre>')` + `bodyEl.innerHTML = lines.join('')` to DOM construction
  via `document.createElement` + `.textContent`.
- File content reaches the DOM exclusively through `.textContent`.
  `innerHTML` assignment for preview content is gone.
- No `srcdoc`, no `<iframe>`, no `<webview>` is used anywhere in the
  function.
- All canonical fallback reasons surface explicit copy:
  - `html_not_previewable` — "HTML / web pages are blocked from
    inline preview because SAM.gov can return portal or error pages."
  - `app_shell_preview_blocked` — "Preview blocked: selected content
    appears to be SourceDeck app shell."
  - `too_large` — "File is too large to preview inline. Use Open
    Local File."
  - `file_unreadable / not_a_file / read_failed / invalid_file_path
    / remote_url_refused / no_file_path` — "Preview unavailable for
    this file."
  - `unsupported_type` with `.docx?|xlsx?` — "Office preview is not
    available inline. Use Open Local File."
  - `unsupported_type` with `.pdf` — "PDF preview is not available
    inline. Use Open Local File."
  - `unsupported_type` / `metadata-only` — bounded 4000-char
    extracted-text snippet IF one is present on the file state.
    Snippet is locally scrubbed for SourceDeck UI markers — never
    surface the app shell.
- The whole pipeline is wrapped in `try { … } catch (e) {
  setFallback('Preview failed.') } finally { sdClearActionBusy(…) }`
  so a missing/corrupt file never leaves the busy shimmer stuck or
  surfaces a stack trace.

### Download path

`window.gcABDownloadPackage` was already isolated from the viewer —
it never called `gcACPreviewFile` or `sdRightFileViewerOpen`. Phase
25AG pins that with a regression test
(`phase-25ag-download-does-not-open-viewer.test.js`).

## Evidence

### Tests (7 new, all green)

```
node test/phase-25ag-download-does-not-open-viewer.test.js  → OK
node test/phase-25ag-preview-html-blocked.test.js           → OK (14 assertions)
node test/phase-25ag-preview-path-allowlist.test.js         → OK (13 assertions)
node test/phase-25ag-preview-safe-rendering.test.js         → OK (18 assertions)
node test/phase-25ag-preview-size-limit.test.js             → OK (10 assertions)
node test/phase-25ag-office-preview-fallback.test.js        → OK (9 assertions)
node test/phase-25ag-missing-corrupt-preview-file.test.js   → OK (16 assertions)
```

### Upstream regressions verified clean

- Phase 25AD right-side viewer: copy assertion relaxed for the
  Phase 25AG message refinements (dropped the "yet" hedge); test
  now passes 10/10.
- Phase 25AE, 25AF, 25AC, 25Y, 25X, 25W, 25V, 25U, 25T, 25S, 25R,
  25Q, all earlier suites — all green.

### Gates

```
npm test                          → all phase suites green
npm run govcon:smoke              → 47 passes, 0 failures
npm run troubleshooting:scan      → no fail/warn findings
node scripts/release-check.js     → privacy gate ✓
```

### Sandbox-verified behaviours

- `looksLikeSourceDeckAppShellPreview('SOLICITATION SF1449...')` → `false`
- `looksLikeSourceDeckAppShellPreview('SourceDeck GovCon Pipeline\n.cmd-flow')` → `true`
- `looksLikeSourceDeckAppShellPreview('Operating Hub\nGovCon Find Opportunities')` → `true`
- `looksLikeSourceDeckAppShellPreview('SourceDeck GovCon Pipeline is awesome\nbut nothing else matches')` → `false` (single marker, avoids false positives)
- `looksLikeSourceDeckAppShellPreview('')` / `null` / `undefined` → `false`

### Safety scan residue

- No raw `api_key=<value>` literals.
- No new `Submit Bid` / `Submit Quote` / `Send Email` / portal-upload surface.
- All `innerHTML =` hits are in unrelated render paths (capability
  statement preview, package preview output) that build their own
  HTML; none are wired to file-derived content.
- All `legal advice` / `certified compliant` / `legally sufficient`
  hits are negative disclaimers.

### Boundaries preserved

- `.env`: not touched.
- Stashes: untouched.
- No deploy / publish / release tag.
- No SAM.gov search / filter / index changes.
- No extraction engine redesign.
- No mass download / no download on app launch.
- No portal upload, vendor / agency contact, government submission.
- Phase 23C reachability invariant honored.

## Sign-off

Audit conclusion: Phase 25AG met. The right-side viewer is now safe
against HTML dumps, app-shell content, oversized payloads, missing /
corrupt files, and the Download Solicitation Package action never
auto-opens it.

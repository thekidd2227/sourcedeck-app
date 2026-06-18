# Phase 25AG — Solicitation Package Viewer Freeze / Wrong-File Preview Audit

**Priority:** P0 runtime blocker
**Branch:** `fix/phase-25ag-viewer-freeze-wrong-file`
**Scope:** Focused runtime safety repair of the right-side solicitation file
viewer. No new product features, no SAM search/filter/index changes, no
pricing/payment changes, no deploy/release.

## Symptom

After clicking **Download Solicitation Package** or selecting a file/View
action, the right-side viewer filled with raw SourceDeck app-shell content
(e.g. "SourceDeck GovCon Pipeline — Expected — Leads", sidebar labels,
dashboard text, CSS classes `.cmd-flow`, `.cmd-pill`, `cc-lcc-grid`) and the
app froze. The viewer was rendering the wrong payload — the app shell / a
large HTML/CSS blob — instead of the selected downloaded attachment.

## Root cause

The preview pipeline (`govcon:preview-package-file` in `main.js` →
`gcACPreviewFile` in `sourcedeck.html`) was missing three safety properties:

1. **No hard size cap on rendered text.** The IPC handler's only size limit
   was an 8 MB *fallback* threshold; any text file up to 8 MB was returned
   whole, and the renderer dumped it all into the DOM in a single
   `bodyEl.innerHTML = lines.join('')`. A large HTML/CSS file (or an
   app-shell-like blob) therefore froze the renderer.
2. **No realpath enforcement.** Path validation used a lexical
   `path.relative` containment check only. A symlink inside the package root
   could resolve to an app/repo file (`sourcedeck.html`, `package.json`,
   `.env*`) without being caught.
3. **No app-shell content guard.** Nothing detected and refused content that
   was clearly the SourceDeck UI shell rather than a solicitation attachment,
   so a stray app-shell payload was rendered as if it were a file.

`.html`/`.htm` files were also surfaced as full raw text with no truncation.
Combined, any large/HTML/app-shell-like package file dumped megabytes of
markup into the DOM and froze the renderer.

## Fixes

### Download no longer auto-opens the viewer (verified)
`gcABDownloadPackage` only downloads files, updates the package
manifest/state, and shows a status toast. It does **not** call
`gcACPreviewFile`, `sdRightFileViewerOpen`, or `gcABViewAttachment`. The
viewer stays hidden (`hidden` + `aria-hidden="true"`) until the user clicks
**View** on a specific downloaded attachment row. Locked in by
`test/phase-25ag-download-does-not-open-viewer.test.js`.

### Strict local-file preview allowlist (`services/govcon/solicitation-preview-guard.js`)
New pure, dependency-free guard module (reached from `main.js` via
`appApi.govcon.packages.previewGuard`, preserving the architecture boundary —
`main.js` does not import `services/govcon/*` directly):

- Only files under `app.getPath('userData')/govcon/solicitations/` are
  previewable.
- Rejects remote URLs and `file://` URLs, empty paths, the package root
  directory itself, and any path that resolves outside the root.
- After `fs.realpath`, the resolved target must still be inside the resolved
  root (symlink-escape proof). Repo `sourcedeck.html`, `package.json`,
  `.env*`, `dist/`, `release/`, `out/`, `node_modules/` are all outside the
  root and therefore rejected.
- Failures return a safe `{ ok:false, reason, limitation }` with the message
  "Preview blocked: file is outside SourceDeck solicitation package storage."
  — never an uncaught throw.

### App-shell preview guard
Both the main process and the renderer detect SourceDeck app-shell markers via
`looksLikeSourceDeckAppShellPreview()` (aliased to `containsAppShell`):
`SourceDeck GovCon Pipeline`, `Operating Hub`, `GovCon Find Opportunities`,
`.cmd-flow`, `.cmd-pill`, `cc-lcc-grid`, `sourcedeck.html`, `tab-govcon`,
`tab-dashboard`, `SourceDeck does not auto-send`; dotted CSS markers also match
the HTML `class="…"` form. On a match the content is **blocked**
(`previewKind: 'blocked'`) with the message "Preview blocked because the
selected content appears to be the SourceDeck app shell, not a solicitation
attachment." This is defensive — path validation should already prevent it —
but guarantees a
shell payload can never freeze or impersonate an attachment.

### Safe rendering (no raw innerHTML / no srcdoc)
`gcACPreviewFile` now builds DOM nodes and assigns all file-derived text via
`textContent` (the `<pre>` text block, labels, notes, warnings). No package
content is ever assigned to `innerHTML`, and `srcdoc`/`iframe`/`webview` are
never used for package content. PDF uses an `<object>` element pointing at the
approved local file's data URL; images use an `<img>` with the data URL.
**Open Local File** remains a separate explicit control; the View path never
calls `openExternal`.

### Preview size cap
`PREVIEW_TEXT_LIMIT_BYTES = 250 KB`. Text larger than the cap is truncated and
flagged (`truncated: true`) with "Preview truncated for performance. Open
Local File to view the full document." Files larger than the 8 MB read ceiling
are never read into memory (fallback only). The renderer surfaces the
truncation note and never receives a multi-MB body.

### Standardized preview payload
`govcon:preview-package-file` returns:
`{ ok, fileName, extension, sizeBytes, previewKind, text, truncated,
limitation, canOpenLocalFile, dataUrl?, mimeType?, kind? }` where
`previewKind ∈ text | image | pdf | pdf-fallback | office-fallback |
zip-list | unsupported | blocked`. `kind` is retained for backward
compatibility.

## Tests / gates

New (wired into `npm test`):
- `test/phase-25ag-download-does-not-open-viewer.test.js`
- `test/phase-25ag-preview-path-allowlist.test.js`
- `test/phase-25ag-preview-safe-rendering.test.js`
- `test/phase-25ag-preview-size-limit.test.js`
- `test/phase-25ag-block-app-shell-preview.test.js`

Regression / runtime gates (all pass):
`npm test`, `npm run govcon:smoke`, `npm run troubleshooting:scan`,
`node scripts/release-check.js`, plus the Phase 25AD/25AF viewer & extraction
tests and `renderer-boot` / `govcon-core-hardening`.

## Safety scan

`innerHTML`/`srcdoc`/app-shell-marker/secret scan over `main.js`,
`preload.js`, `api/index.js`, `services/govcon/solicitation-preview-guard.js`,
and the preview region of `sourcedeck.html` shows only acceptable hits: the
guard's block markers, the pre-existing `loadFile('sourcedeck.html')` app
bootstrap, safe `textContent` usage, and explanatory comments. No raw preview
assigned to `innerHTML`, no `srcdoc`, no key leaks, no send/submit/upload
controls.

## Out of scope (unchanged)

Package download, saved pursuits, Solicitation Center, the Phase 25AF
extraction engine, SAM search/filter/index logic, pricing, Stripe/checkout,
website files. No `.env*` touched, no stashes touched, no deploy/release.

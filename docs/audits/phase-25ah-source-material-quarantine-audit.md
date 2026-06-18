# Phase 25AH — Source Material Quarantine Audit

## Root cause

After Download Solicitation Package / Source Materials / Solicitation Center /
Extract Requirements activity, SourceDeck could display a dump of its own
app-shell / UI / CSS text instead of solicitation content. The earlier preview
hardening (PR #143, Phase 25AG) closed the **package preview IPC** path, but not
the **renderer source-material** path. SAM.gov / linked resources sometimes
return portal HTML, login/error pages, or — worst case — the SourceDeck app
shell. Those bodies were fetched, stored under `sd.govcon.sourceMaterials.v1`,
collected as source text, and fed into extraction and First Impression context.
Stale poisoned `localStorage` from earlier sessions kept the contamination alive
even after code fixes landed.

## Quarantine boundary (defense in depth)

App-shell / UI / CSS / HTML text is treated as **toxic input everywhere** it can
enter: fetch, save/import, collect, extract, First Impression, and persisted
runtime state.

### Shared classifier — `services/govcon/sam-body-classifier.js`
- `classifyResponseBody(buffer|string, contentType)` — rejects HTML / app-shell /
  SAM-login / generic error responses; preserves genuine binary attachments
  (PDF / ZIP / DOCX / XLSX / legacy OLE) by magic-byte sniff regardless of the
  advertised content-type.
- `looksLikeAppShellText(text)` / `classifySourceText(text)` — catch SourceDeck
  UI strings even after HTML tags are stripped (strong single markers like
  `.cmd-flow`, `.cc-lcc-grid`, `tab-govcon`, `sourcedeck.html`; or ≥2 softer
  markers). A lone "SourceDeck" mention does **not** trip it.

### SAM source fetch — `services/govcon/sam-source-fetch.js`
- Reads the body and runs the shared classifier **before returning any text**.
- Second gate: rejects stripped app-shell text (`reason: 'app_shell_text'`).
- Never returns a rejected body; never returns an `api_key` URL; redacts keys
  from error text. Reasons map to user-safe copy in the renderer.

### Renderer save / import / display — `sourcedeck.html`
- `gcW25FetchDescription` / `gcW25ImportResource` store `status:'rejected'` with
  **empty text** when the source is toxic, and surface a safe toast — never the
  raw payload.
- `renderSourcePanel` renders a rejection row, never toxic text or `[object Object]`.

### Fallback extraction + First Impression — `sourcedeck.html`
- `gcW25CollectSourceText` filters toxic entries; returns only safe text.
- `gcSolExtract` prefers package extraction; falls back only to sanitized text,
  with a belt-and-suspenders `_w25LooksLikeBadSource` guard. With no safe text it
  shows a clean "download a package" message and never fabricates section
  content (`state.real` flag).
- `gcFiBuildContext` builds from the guarded collector, so app-shell copy never
  becomes opportunity context.

### Boot sanitizer + migration — `sourcedeck.html` (`_bootSanitize`)
Runs once per boot (idempotent). Scans and cleans:
- `sd.govcon.sourceMaterials.v1` — zeroes contaminated description / resource
  text, marks `rejected` / `boot_sanitized`.
- `sd.govcon.solWorkspace.v1` — clears contaminated summary / sections / matrix
  and sets `real:false`.
- `sd.govcon.firstImpression.v1` — drops contaminated drafts (they regenerate
  from the guarded collector); clean drafts are preserved.

On the first boot that cleans anything it writes the migration marker
`sd.govcon.sourceMaterialQuarantine.v1` and shows one non-blocking notice:
> SourceDeck removed contaminated cached source text from a previous session.

Credentials, API-key settings, saved pursuits (unless the pursuit itself embeds
toxic raw source text), and on-disk package files are **not** deleted.

## Valid solicitation text still works
Real PWS / SOW / Section L / M text is accepted, extracted, and drives the
compliance matrix. Plain-text SAM descriptions still fetch. Verified by the test
suite below.

## Tests / gates
- `test/phase-25aj-app-shell-text-rejection.test.js`
- `test/phase-25ah-html-package-rejection.test.js`
- `test/phase-25ah-source-fetch-html-rejection.test.js`
- `test/phase-25ah-source-material-sanitizer-runtime.test.js`
- `test/phase-25ah-source-materials-non-storage.test.js`
- `test/phase-25ah-boot-quarantine-migration.test.js`
- `test/phase-25ag-*` (preview hardening regressions — PR #143 intact)
- `test/renderer-boot.test.js`
- Full `npm test` (green), `npm run govcon:smoke` (PASS),
  `npm run troubleshooting:scan`, `node scripts/release-check.js`.

## Manual storage purge fallback
If contaminated cache persists, run once in the app DevTools console:
```js
localStorage.removeItem('sd.govcon.sourceMaterials.v1');
localStorage.removeItem('sd.govcon.solWorkspace.v1');
localStorage.removeItem('sd.govcon.firstImpression.v1');
```

## Safety
No `.env` changes; no secrets printed; no raw SAM key / `api_key` URL display;
no SAM search/filter/index changes beyond rejecting poisoned source text; no
send/submit/upload controls; no pricing/payment/checkout changes; no deploy /
release / publish.

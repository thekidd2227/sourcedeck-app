# Phase 25AF — Real Solicitation Text Extraction Engine Repair (Audit)

**Status:** Fixed
**Branch:** `fix/phase-25af-real-solicitation-extraction-engine`
**Scope:** `services/govcon/solicitation-package-extract.js` + Phase 25AF tests + docs. No renderer/IPC change was required — the handoff and binding were already correct.

## Symptom

A downloaded saved pursuit reached the Solicitation Center and rendered metadata
(Title, Agency, Solicitation #, NAICS, Place of Performance, Source URL), but after
**Extract Requirements** the Section L / Section M / PWS-SOW / Required Forms /
Deadlines / Risks panels and the Compliance Matrix stayed empty.

## Confirmed root cause

The renderer→IPC→service handoff was intact:

- `gcABExtractPackageToCenter()` passes `{ manifest: sm.package }`.
- `preload.js` → `main.js` → `api/index.js` resolve to
  `solicitationPackageExtractSvc.extractSolicitationPackage(input)`.
- `normalizeManifest()` accepts `input.manifest`, `collectPackageFiles()` resolves
  local `localPath`s under userData, and the renderer binds `ex.sections[letter].text`,
  `ex.metadata`, `ex.warnings`, and `ex.complianceMatrixStarter`.

The failure was entirely inside the **parser + classifier**:

1. **`extractFileText()` only covered text-like files, DOCX/Word XML, and ZIP children.**
   PDF, XLSX, XLS, and DOC fell through to the default `metadata-only` branch with
   `text: ''`.
2. Because real SAM packages are mostly PDF/XLSX/DOCX, the aggregate `fullText` was
   empty, so `classifySections()`, `extractMetadata()`, and `complianceMatrixStarter()`
   had nothing to classify.
3. `classifySections()` only matched literal UCF `SECTION C/L/M` headers. RFQs and
   agency templates that don't use formal Section headers produced empty panels even
   when readable.
4. Tests passed because they used synthetic fixtures with explicit `SECTION C/L/M`
   text rather than real mixed PDF/XLSX/DOCX packages.

## Repairs

### Parser coverage (`extractFileText` + new helpers)

All advertised formats now produce readable text where feasible, using **built-in
`zlib` only** (no new dependencies, build-safe for Electron):

| Format | Behavior | Status |
| --- | --- | --- |
| TXT / CSV / MD / JSON / XML / HTML / RTF | direct read + markup sanitize | `text` |
| DOCX | unzip → `word/document.xml` + headers/footers → `<w:t>` nodes, entities decoded, tags stripped | `text` |
| Word XML child | `<w:t>` extraction | `text` |
| PDF | pure-JS: locate streams, inflate FlateDecode via `zlib`, decode `Tj`/`TJ`/`'`/`"` text operators (literal + hex strings, octal escapes, UTF-16BE), page count via `/Type /Page` | `text` / `partial` |
| XLSX | unzip → `sharedStrings.xml` + `workbook.xml` sheet names + `worksheets/sheetN.xml` rows → readable `Row N: a | b | c` lines, preserving CLIN/pricing rows | `text` |
| XLS (legacy) | best-effort printable-string scan, clearly limited | `partial` / `metadata-only` |
| DOC (legacy) | best-effort printable-string scan, clearly limited | `partial` / `metadata-only` |
| ZIP | recursive child extraction, corrupt children isolated, child source names preserved | `text` |

Per-file output now carries: `fileName`, `localPath`, `extension`, `extractionStatus`
(`text`/`partial`/`metadata-only`/`failed`), `text`, `warnings`, `limitation`,
`pages`, `sheets`, `sourceType`.

`metadata-only` is now reserved for corrupt/unreadable/unsupported files. Readable
PDF/DOCX/XLSX never default to `metadata-only` (guarded by a dedicated test).

### Source-aware representation

`extractSolicitationPackage()` returns `fullText` plus `sourceBlocks`
(`[{ fileName, location, text }]`, with page/sheet hints) so classification and
matrix rows retain source attribution.

### Two-pass classifier (`classifySections`)

- **Pass 1 — formal UCF sections A–M** (unchanged literal-header detection).
- **Pass 2 — requirements-first fallback.** When C/L/M are missing, `sourceBlocks`
  are scanned for instruction / evaluation / scope / forms / deadline / risk language
  and the high-value panels are populated with `confidence: 'fallback'`. Irrelevant
  text does **not** hallucinate sections; missing sections keep the verify placeholder.

### Compliance matrix from real requirements (`complianceMatrixStarter`)

Rows are built from real extracted requirement lines (formal sections first, then
inferred fallback buckets, then manifest/detected forms). Each row carries
`sourceFile` / `sourceLocation` / `sourceSection`. No duplicate rows, no generic
"Required Forms" filler, and an honest empty array when no requirements exist.

### Plain-English summaries

High-value sections (C/F/H/L/M) carry a draft `plainEnglishSummary`, surfaced through
`plainEnglish()`. Clearly marked draft, not legal advice, verify against source.

### UI-friendly aliases

The result also exposes `instructionsToOfferors`, `evaluationCriteria`,
`pwsSowRequirements`, `requiredFormsAttachments`, `deadlines`, `risksDealKillers`, and
`complianceMatrix` (alias of `complianceMatrixStarter`).

## Renderer binding

No renderer change needed. Fallback content lands in `sections[L/M/C].text`, which the
existing `mapPackageExtraction()` / `renderPanels()` / `renderMatrix()` already bind.
A runtime-grade test extracts the real renderer functions from `sourcedeck.html`, runs
them in a VM against a real extraction payload, and confirms source-backed content
renders with no raw Office XML.

## Tests / gates

New (fail before, pass after):

- `test/phase-25af-real-package-parser-coverage.test.js`
- `test/phase-25af-mixed-package-extraction.test.js`
- `test/phase-25af-fallback-requirements-classifier.test.js`
- `test/phase-25af-compliance-matrix-from-real-requirements.test.js`
- `test/phase-25af-renderer-binding-extraction-payload.test.js`
- `test/phase-25af-no-metadata-only-for-readable-core-formats.test.js`
- `test/fixtures-25af.js` (pure-JS PDF/DOCX/XLSX/ZIP fixture builders)

Regressions confirmed green: Phase 25AB/25AC/25AE suites, `renderer-boot`,
`govcon-core-hardening`, full `npm test`, `npm run govcon:smoke`,
`npm run troubleshooting:scan`, `node scripts/release-check.js`.

## Safety scan

- No `.env` change, no secrets printed, no `api_key` URL leak.
- No raw XML/HTML/Office markup rendered to the user (sanitized + guarded).
- No submit/quote/email/portal-upload controls added.
- No mass download / download-on-launch behavior. Only explicit user action downloads
  a selected/saved package.
- Existing saved pursuit / download / viewer / Open SAM.gov Notice / Send Package
  behavior preserved.

## Remaining limitations

- Legacy `.xls` and `.doc` binary formats are best-effort printable-string extraction
  only; they are clearly labelled `partial` with a per-file limitation. Convert to
  `.docx`/`.xlsx`/PDF for full fidelity.
- Scanned/image-only PDFs (no text operators) return a per-file warning; OCR is out of
  scope.
- PDF extraction targets standard `Tj`/`TJ` text operators with literal/hex strings;
  exotic font encodings (CID/Type3 with custom CMaps) may extract partially.

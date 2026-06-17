# Phase 25AE Extraction Display Runtime Audit

## Scope

Phase 25AE is a focused runtime repair for Solicitation Center display quality. It does not change SAM.gov key storage, search/filter behavior, pricing, checkout, deployment, release publishing, portal uploads, email sending, or auto-contact behavior.

## Runtime fixes

### SAM.gov key warning

- The Find Opportunities screen keeps the clear instruction card: "SAM.gov key missing. Add it in Setup or Settings -> API Keys to enable in-app search. SourceDeck never displays the raw key."
- The adjacent key-status pill is hidden while the key is missing, removing the duplicate visible warning.
- The credential boundary remains presence-only; no raw key is rendered or logged.

### DOCX/XML readable extraction

- `services/govcon/solicitation-package-extract.js` now treats `.docx` files as ZIP packages.
- It extracts readable text from `word/document.xml` plus available headers and footers.
- WordprocessingML text nodes are decoded into plain text before classification.
- Extracted text is sanitized to remove XML tags, namespace declarations, null characters, excessive whitespace, and accidental raw markup.
- If a file cannot be parsed, SourceDeck shows a file-specific limitation instead of dumping raw Office XML.

### Required Forms / Attachments

- Required Forms / Attachments now uses Section J text, package manifest filenames, and detected form/attachment references.
- It identifies items such as SF 33, SF 1449, SF 18, reps/certs, wage determinations, QASP, pricing sheets, exhibits, amendments, and PWS/SOW attachments when present.
- If no forms are extracted, the runtime shows a clean empty state: "No required forms or attachments extracted yet. Verify source package."
- Raw XML/code strings are guarded before rendering.

### Compliance Matrix quality

- The matrix now represents concrete extracted requirements instead of generic filler rows.
- Rows include requirement ID, source, section/page/file, requirement text, mandatory/optional, proposal section, owner, evidence needed, status, risk/deal-killer flag, and notes.
- Rows are generated from Section L, Section M, Section C/PWS/SOW, Section F, Section H, Section I where compliance-heavy, Section J, and attachment index signals.
- Duplicate generic "Required Forms" rows are filtered out unless distinct forms or requirements exist.
- When extraction is weak, the table keeps its header and shows a useful empty state rather than fake rows.

### Section extraction display

- Solicitation Center now cleans extracted content before rendering summary, Section L, Section M, PWS/SOW, and Required Forms / Attachments panels.
- Missing sections use clear placeholders such as "No Section L instructions extracted yet. Verify source package."
- Raw extracted text is not used as the primary Required Forms output.

### Loading indicators

Action-level busy states were added for long-running operations:

- Search SAM.gov -> "Searching..."
- Download Solicitation Package -> "Downloading package..."
- Refresh Package / Refresh Source Details -> "Refreshing..."
- Send Package to Solicitation Center -> "Sending..."
- Extract Key Details / Extract Requirements -> "Extracting..."
- Explain Package in Plain English -> "Explaining..."
- View file preview -> "Loading preview..."
- Save copy to... -> "Saving copy..."

Each action disables the clicked button during work, shows a short background-working message, and clears the busy state on success or failure.

## Safety scan

The safety scan was reviewed for:

- duplicate visible SAM.gov key warnings
- raw Office XML in runtime output
- Required Forms dumping raw code/XML
- fake repetitive Compliance Matrix rows
- missing loading states for long-running actions
- raw SAM.gov key exposure
- visible `api_key` URLs
- send/submit/portal-upload controls

Acceptable hits were limited to hidden/legacy status text, parser/test XML handling, negative safety tests, older audit documentation, and main-process credential-boundary code that appends SAM keys outside renderer-visible URLs.

## Tests and gates

Focused tests added:

- `test/phase-25ae-single-sam-key-warning.test.js`
- `test/phase-25ae-docx-readable-extraction.test.js`
- `test/phase-25ae-required-forms-sanitized.test.js`
- `test/phase-25ae-compliance-matrix-quality.test.js`
- `test/phase-25ae-section-display-extraction.test.js`
- `test/phase-25ae-action-loading-indicators.test.js`

Regression tests updated only where the Compliance Matrix schema or async extraction handler changed.

Gates run:

- Phase 25AE focused tests
- Phase 25AD/25AC optional regressions
- Phase 25AB extraction and no-sample regressions
- Phase 25AA tightening regression
- `node test/renderer-boot.test.js`
- `node test/govcon-core-hardening.test.js`
- `npm test`
- `npm run govcon:smoke`
- `npm run troubleshooting:scan`
- `node scripts/release-check.js`

`release-check` reported only local macOS signing/notarization warnings for the existing unsigned local artifact; no release or deployment was performed.

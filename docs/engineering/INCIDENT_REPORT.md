# Production Incident Report — Solicitation Center Incomplete Extraction

**Repository:** `thekidd2227/sourcedeck-app`

**Incident area:** GovCon Solicitation Center upload, extraction, display, and summarization

**Date:** 2026-06-25

**Branch:** `fix/solicitation-incident-complete-v2`

**Status:** Confirmed summary/explain defects corrected and regression-protected. Exact production PDF parser failure remains unconfirmed because the affected source file was not available. OCR is not implemented in this change.

## 1. Incident Summary

The reported symptom was that the Solicitation Center displayed the solicitation summary while most detailed solicitation sections remained blank.

The investigation confirmed an architectural reason this state can occur: summary metadata may fall back to the saved SAM.gov opportunity record, while detailed sections require usable text from uploaded solicitation files. An unreadable, image-only, metadata-only, or unsupported PDF can therefore leave the section classifier with little or no content while the summary still appears populated.

A prior FAR classifier repair improved coverage for commercial-item headings such as FAR 52.212-1 and FAR 52.212-2. That repair only applies after readable text exists. It does not provide OCR or broad production-PDF parsing support.

PR #162 added a structured summary and Explain actions but introduced several data-integrity and renderer defects. This branch corrects those defects without a broad extraction rewrite.

## 2. Reproduction Status

Readable deterministic fixtures reproduce successful extraction for formal UCF sections and selected FAR commercial-item headings.

The exact production blank-panel failure was not reproduced because the affected solicitation package was unavailable. The code path remains consistent with:

1. an uploaded PDF yields no usable text or is marked `ocr_required` or `metadata-only`;
2. detailed sections remain missing;
3. saved opportunity metadata fills the summary;
4. the user sees a summary beside incomplete detailed panels.

The affected source file, import manifest, document inventory, and warnings are still needed to confirm the exact PDF-level failure.

## 3. Relevant Code Path

```text
sourcedeck.html upload action
→ preload.js
→ app/main/ipc/register-feature-ipc.js
→ api/index.js
→ services/govcon/solicitation-import.js
→ services/govcon/solicitation-package-extract.js
→ normalized extraction contract
→ Solicitation Center renderer state
→ section panels / summary / explain
```

The summary and explain service is `services/govcon/solicitation-summarize.js`.

The renderer module is `app/renderer/features/solicitation-center/summarize-and-explain.js`.

## 4. Confirmed Defects Corrected

### 4.1 Cross-pursuit extraction mismatch

PR #162 accepted an `opportunityId` and an independently supplied extraction object without proving they belonged together. Its test accepted a mismatched pair.

The service now validates the selected opportunity against `extraction.import.opportunityId` and rejects:

- `opportunity_mismatch`
- `unbound_extraction`

This prevents a summary or explanation from being generated for the wrong selected pursuit.

### 4.2 Explain replaced the source panel

PR #162 rendered the explanation directly into Section L, Section M, or PWS/SOW panel HTML. The original extracted text disappeared.

The renderer now creates a dedicated explanation panel beside the source panel. The original source text remains unchanged and visible for verification.

### 4.3 Structured data disappeared

The original generic flattener only understood strings and object properties named `text` or `value`. Valid normalized structures could disappear, including:

- points of contact;
- CLIN and pricing rows;
- compliance rows using `requirementText` or `requirement`;
- attachment inventory objects;
- structured deadlines.

The summary service now uses field-specific serializers for those record types.

### 4.4 Provenance was incomplete

The previous summary frequently exposed field names without exact source records. It also omitted provenance carried under normalized metadata fields such as points of contact and pricing rows.

Summary areas and section explanations now return, when available:

- `sourceDocumentId`
- `sourceFile`
- `sourceLocation`
- `sourceFiles`
- `sourceReferences`

### 4.5 Empty aliases reported success

Empty arrays are truthy in JavaScript. The prior Explain implementation could return `ok: true` with an empty explanation.

Alias explanations now normalize content first and return `not_found` when no usable content exists.

### 4.6 Extraction failure was hidden

The summary service now derives an explicit processing state from document inventory:

- `extracted`
- `low_confidence`
- `extraction_failed`
- `pending_processing`

A package in which every document is `ocr_required`, `metadata-only`, failed, unsupported, or rejected is reported as `extraction_failed`. A mixed readable and incomplete package is reported as `low_confidence`.

## 5. Files Changed

- `services/govcon/solicitation-summarize.js`
  - schema version 2;
  - opportunity binding validation;
  - structured serializers;
  - metadata-inclusive source-reference collection;
  - explicit processing state;
  - metadata-only classification;
  - honest empty-alias handling;
  - Explain based on actual extracted content.

- `app/renderer/features/solicitation-center/summarize-and-explain.js`
  - non-destructive explanation panels;
  - mismatch and unbound failure copy;
  - processing-state display;
  - exact source-reference display;
  - original extracted section remains visible.

- `test/phase-25ar-solicitation-summarize-and-extraction-bugs.test.js`
  - cross-opportunity rejection;
  - unbound legacy extraction rejection;
  - contact, CLIN, and compliance serialization;
  - source provenance;
  - OCR-required status;
  - empty alias handling;
  - renderer preservation of original source text.

- `test/phase-25as-solicitation-processing-provenance.test.js`
  - all-metadata-only failure state;
  - mixed-package low-confidence state;
  - top-level metadata provenance;
  - exact source location retention.

- `.github/workflows/solicitation-center-ci.yml`
  - focused pull-request validation;
  - isolated failure diagnostics;
  - syntax checks;
  - existing extraction regressions;
  - release safety gate;
  - full pull-request diff hygiene.

## 6. Regression Coverage

The focused tests verify:

1. commercial-item solicitation number extraction;
2. attachment label de-duplication;
3. all 17 summary areas;
4. explicit processing status;
5. structured points of contact;
6. structured pricing and CLIN rows;
7. multiple compliance row shapes;
8. source-file provenance;
9. cross-pursuit mismatch rejection;
10. unbound extraction rejection;
11. OCR-required failure status;
12. metadata-only failure status;
13. mixed-package low-confidence status;
14. section explanation from actual extracted text;
15. empty alias `not_found` behavior;
16. no direct Electron or `ipcRenderer` access;
17. original section text remains unchanged after Explain;
18. separate explanation-panel creation.

## 7. Remaining Risk

This change does not add OCR and does not replace the custom PDF parser with a mature general-purpose PDF text engine.

Image-only or unsupported PDFs can still require re-upload in a readable form. The UI now reports that processing state honestly, but the source file is not converted automatically.

A follow-up parser/OCR change should be based on the affected production file and should add:

- representative complex searchable federal PDF fixtures;
- image-only PDF fixtures;
- page-level extraction status;
- OCR confidence and provider or method provenance;
- amendment precedence fixtures;
- safe idempotent reprocessing.

## 8. Validation Commands

```bash
node test/phase-25ar-solicitation-summarize-and-extraction-bugs.test.js
node test/phase-25as-solicitation-processing-provenance.test.js
node test/phase-25aq-far-commercial-items-section-extraction.test.js
node test/phase-25ab-extract-sections-a-to-m.test.js
node test/solicitation-extraction-end-to-end-mapping.test.js
node test/phase-25an-browser-handoff-local-extraction.test.js
npm run release:check
git diff --check <base>...<head>
```

Do not declare the exact production PDF failure closed without testing the affected source file.

## 9. Rollback

If merged by squash:

```bash
git checkout main
git pull origin main
git revert <squash_commit_sha>
npm test
npm run release:check
git push origin main
```

Rollback does not require deleting imported solicitation files or saved opportunity records.

## 10. Final Disposition

The confirmed summary and Explain defects are corrected on `fix/solicitation-incident-complete-v2`.

The exact production document-extraction failure remains open pending the affected solicitation file. The application now distinguishes and exposes failed, metadata-only, or OCR-required processing instead of presenting a misleading complete summary state.

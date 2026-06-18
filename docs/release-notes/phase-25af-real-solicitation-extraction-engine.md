# Phase 25AF — Real Solicitation Text Extraction Engine

## What changed

Downloaded and uploaded solicitation packages now populate the Solicitation Center
with real, source-backed content. Previously, PDF / XLSX / DOC attachments fell
through to "metadata-only" with empty text, so Section L, Section M, PWS/SOW, Required
Forms, Deadlines, Risks, and the Compliance Matrix stayed empty after **Extract
Requirements**.

## Highlights

- **PDF** — readable per-page text extraction (pure JS via built-in `zlib`; handles
  FlateDecode streams, `Tj`/`TJ` text operators, literal/hex strings, page counts).
- **XLSX** — workbook/sheet extraction into readable rows, preserving CLIN / pricing /
  labor-category / quantity rows for the compliance matrix.
- **DOCX** — strengthened Word XML extraction (document + headers/footers, entities
  decoded, never shows `w:document` / `xmlns` / WordprocessingML markup).
- **ZIP** — recursive child extraction with corrupt children isolated and child source
  names preserved.
- **Legacy XLS / DOC** — best-effort text with a clear per-file limitation (no false
  "success").
- **Requirements-first fallback classifier** — populates the high-value panels even
  when a package has no literal `SECTION C/L/M` headers, without hallucinating when
  nothing relevant exists.
- **Compliance Matrix from real requirements** — rows built from extracted requirement
  text with source-file/location attribution, no generic filler, honest empty state.
- **Plain-English summaries** — draft 5th-grade summaries for high-value sections
  (clearly marked draft, not legal advice, verify against source).

## Behavior preserved

Saved pursuit, package download, attachments, right-side viewer, Open SAM.gov Notice,
and Send Package to Solicitation Center are unchanged. No renderer/IPC change was
required.

## Safety

No `.env` change · no secrets printed · no SAM API key / `api_key` URL leakage · no raw
markup rendered · no mass download / download-on-launch · downloads only on explicit
user action for a selected/saved opportunity · no bid/quote/email/portal-upload
controls · no pricing/checkout/payment change.

## Limitations

Legacy `.xls`/`.doc` are best-effort only; scanned/image-only PDFs return a warning
(no OCR); exotic PDF font encodings may extract partially. Each is surfaced as a
per-file warning so operators always know which file needs manual review.

## Operator next step

Merge when green, rebuild the app package, refresh the Day 0 package, then manually
test one downloaded SAM.gov package with PDF/DOCX/XLSX attachments and one uploaded ZIP
package.

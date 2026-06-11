# Phase 25I — Proposal Workspace Export (Word + PDF) Contract

**Date:** 2026-06-09

The Phase 25E.2 Proposal Workspace shipped a Markdown export of approved/finalized sections. Phase 25I adds two more local-only export formats: Word (`.doc`) and PDF.

---

## 1. Why two more formats

Operators told the team that internal review meetings need a Word document the legal/contracts team can mark up, and a PDF the buyer's leadership can read on a tablet. Markdown is good for source control but unfriendly for downstream review.

## 2. Three export buttons (post-Phase-25I)

| Button | Function | Output |
|---|---|---|
| Export Internal Review Draft (Markdown) | `pwExportInternalReview()` (Phase 25E.2) | `*.md` file via `Blob` + `URL.createObjectURL` |
| Export Internal Review Draft (Word) | `pwExportInternalReviewWord()` (Phase 25I) | `*.doc` file (HTML wrapped with `application/msword` MIME) |
| Export Internal Review Draft (PDF) | `pwExportInternalReviewPdf()` (Phase 25I) | New window → `window.print()` → buyer chooses "Save as PDF" |

All three labels intentionally include the words **Internal Review Draft**. None of them say "Submit," "Final," or "agency-ready." The sentinel `test/phase-25i-proposal-export.test.js` pins this.

## 3. Zero new dependencies

Phase 25I ships both new exports without adding a single new dependency to `package.json`. The Word export uses the long-standing browser convention that Word opens HTML wrapped as `application/msword` with a `.doc` extension. The PDF export opens a print-styled HTML window and asks the browser to render the print dialog — the operator picks "Save as PDF" themselves.

Future phases may choose to add `docx` (real .docx) or `pdf-lib` (programmatic PDF) for tighter formatting. Until then, the zero-dependency path keeps the bundle lean.

## 4. Export body contract

`buildExportHtml()` (Phase 25I) composes the shared HTML body used by both Word and PDF exports. It includes:

1. **Title**: `Proposal Workspace — Internal Review Draft`.
2. **Generated date** (ISO YYYY-MM-DD).
3. **Canonical disclaimer** (verbatim):

   > **Internal review only.** Drafts produced here are not legal review, not compliance certification, and not final proposals. SourceDeck does not send, submit, or upload this document. The user is responsible for every external action. Verify against the current solicitation and acquisition.gov FAR text before any external use.
4. **PDF helper note**: tells the operator to use File → Print → Save as PDF. Hidden in the printed output via `@media print { .print-cta { display:none; } }`.
5. **All 13 canonical Phase 25E.2 sections**, each with:
   - Section number + title
   - Status badge (`not-started`, `drafted`, `approved`, `needs-revision`, `finalized`)
   - Notes (if any)
   - Draft (if any) — or "No draft yet for this section." italic placeholder
6. **Footer**: count of approved/finalized sections (`N of 13`) + restated boundary ("SourceDeck does not submit proposals, send emails, or upload to portals.").

## 5. Local-only invariant

| Export path | Local-only enforcement |
|---|---|
| Word | `Blob` + `URL.createObjectURL` + `<a download>` → file save dialog. No `fetch()`. No `XMLHttpRequest`. |
| PDF | `window.open` + `document.write` + `window.print()` → browser print dialog. No `fetch()`. No `XMLHttpRequest`. |

The sentinel `test/phase-25i-proposal-export.test.js` strips comments and confirms the script source contains zero network calls.

## 6. Data source

Both exports read from `localStorage['sd.proposalWorkspace.v1']` (Phase 25E.2 fallback). The electron-store primary write of the same state is the source of truth; the localStorage mirror is kept in sync by Phase 25E.2's `saveState()` debouncer. Reading the mirror keeps the export click synchronous.

## 7. Section selection

Phase 25I ships **all 13 sections** in every export (matching Phase 25E.2 ordering). The mission allows a future "include drafts" / "approved only" toggle; Phase 25I includes everything and lets the status badges + per-section render carry the buyer's review judgment.

## 8. PDF popup-blocker fallback

If the browser blocks the new window (Electron's `BrowserWindow` shouldn't, but future packaging changes might), the export shows a toast:

> PDF export needs popup permission. Allow popups, then click Export Internal Review Draft (PDF) again.

## 9. Status

The Phase 25E.2 status badges drive the export rendering. Approved/Finalized count is surfaced at the end of the body so the operator can verify proposal completeness at a glance.

---

## Signature

Phase 25I ships two zero-dependency export formats (Word + PDF) alongside the existing Markdown. Every label says "Internal Review Draft" — never "Submit" or "Final." Every export carries the canonical Phase 25A no-send/no-submit/no-upload disclaimer. Local-only invariant verified by sentinel.

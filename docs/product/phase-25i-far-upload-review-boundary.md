# Phase 25I — FAR Compliance Review Upload Boundary

**Date:** 2026-06-09

The FAR compliance review path accepts user-provided text and runs an AI-assisted advisory review. This document records what is acceptable to upload, what is extracted locally, what is sent to the AI provider, and what is forbidden.

---

## 1. Accepted file types

| Extension | Local extraction in Phase 25I | Fallback |
|---|---|---|
| `.txt` | ✅ `FileReader.readAsText` in renderer | — |
| `.md` | ✅ `FileReader.readAsText` in renderer | — |
| `.docx` | ❌ Phase 25I does not bundle a DOCX parser | User pastes the extracted text |
| `.pdf` | ❌ Phase 25I does not bundle a PDF parser | User pastes the extracted text |
| `.png` / `.jpg` / `.jpeg` / `.webp` | ❌ Phase 25I does not bundle OCR | User pastes screenshot caption text, OR future-phase AI-vision route |

The mission instruction allows the future-phase addition of `mammoth` (DOCX), `pdf.js` (PDF), and AI-vision routing for images. Phase 25I ships only the safe text path + paste fallback.

## 2. Paste fallback

The textarea at `#far-upload-paste` accepts up to 12,000 chars of pasted text (slice cap enforced in `farBuildReviewPrompt`). For larger documents, the buyer reviews section-by-section.

## 3. Review types (6 canonical)

| Type value | Buyer-facing label |
|---|---|
| `far-alignment` | FAR alignment check |
| `solicitation-instruction` | Solicitation instruction check |
| `clause-risk` | Clause risk scan |
| `proposal-section` | Proposal section review |
| `vendor-subcontractor-agreement` | Vendor / subcontractor agreement review |
| `pricing-cost-volume` | Pricing / cost volume review |

## 4. Prompt-builder contract

`window.farBuildReviewPrompt(text, reviewType)` returns a deterministic prompt with these mandatory clauses:

1. **System role**: SourceDeck's FAR compliance review assistant.
2. **Hard rules** (verbatim):
   - Do NOT say "certified compliant" / "legally sufficient" / "FAR certified."
   - Use phrasing like "appears aligned," "potential issue," "requires review," "verify against FAR and solicitation."
   - Cite FAR Part / Subpart / Section when applicable.
   - Flag uncertainty.
   - Recommend next steps for internal review.
   - Do not provide legal advice.
3. **Review type label**.
4. **Document text** (triple-quoted, sliced to 12,000 chars).
5. **Output format requirement** — five labeled sections:
   1. Likely FAR topics
   2. Possible issues (with FAR citations)
   3. Uncertainty / needs human review
   4. Recommended next steps for internal review
   5. Disclaimer line: *"Advisory only. Not a compliance certification."*

The sentinel `test/phase-25i-far-upload-review.test.js` pins every required clause.

## 5. User warning before AI dispatch

The upload panel surfaces an explicit warning before the buyer clicks **Run review**:

> This may send the selected content to your configured AI provider. Do not upload secrets unless approved. No file is sent to any government site or external storage.

## 6. No-upload-to-government invariant

Phase 25I does NOT upload any document to:

- SAM.gov
- PIEE
- eBuy
- GSA
- acquisition.gov
- agency portal
- email recipient
- website

The sentinel verifies the FAR Reference section markup contains zero "uploaded to SAM/PIEE/eBuy/GSA/acquisition.gov" or "agency-ready" phrasing.

## 7. AI bridge routing

The review handler calls `window.sd.ai.complete({ prompt, purpose: 'far-compliance-review' })`. If the bridge is unavailable, the renderer shows the prompt for out-of-band copy/paste rather than attempting a direct network call.

## 8. Future enhancements

| Enhancement | Status |
|---|---|
| Native DOCX text extraction | Reserved (Phase 25J or later). Would add `mammoth` (~30 KB) or similar. |
| Native PDF text extraction | Reserved. Would add `pdf.js` (~2 MB) or similar. |
| OCR for image uploads | Reserved. Would add `tesseract.js` (~5 MB) or route to AI-vision provider. |
| AI vision for image uploads | Reserved. Would extend `window.sd.ai.complete` with image-content support and gate behind an explicit "Analyze image with AI" confirmation. |
| Per-tenant secret-redaction filter before AI dispatch | Reserved. Phase 25C secure web-app contract calls for this layer; the local Electron build can implement a simpler regex pass in the meantime. |

---

## Signature

The FAR compliance review upload accepts only safe local-extract text formats today, with paste fallback for the rest. Every AI call routes through the bridge with explicit advisory phrasing. Zero government-portal upload paths. Zero compliance-certification claims.

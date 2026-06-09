# Phase 25I — FAR Reference Contract

**Date:** 2026-06-09
**Companion docs:** `docs/product/phase-25i-far-ai-faq-source-grounding.md`, `docs/product/phase-25i-far-upload-review-boundary.md`, `docs/product/phase-25i-proposal-export-contract.md`, `docs/audits/phase-25i-far-reference-safety-audit.md`.

---

## 1. Purpose

Add a FAR Reference section inside the GovCon workspace that lets the buyer:

1. Browse / deep-link to acquisition.gov FAR text.
2. Ask FAR questions and get source-grounded AI answers with citations.
3. Run AI-assisted FAR compliance reviews on pasted text or uploaded text-format files.
4. Save FAR notes and link them to a solicitation / proposal section / compliance matrix row / vendor agreement.

The section lives **inside** GovCon (Phase 25F section nav adds an 8th pill `FAR Reference → #gc-far-reference`). It does not become a separate top-level sidebar tab.

## 2. Boundary contract

| Property | Status |
|---|---|
| Source of truth | acquisition.gov — SourceDeck links out for primary FAR text. |
| Local FAR cache | None. SourceDeck does not claim to ship versioned FAR text locally. |
| AI provider | The user-configured AI provider key (Phase 24L credential boundary). **No new mandatory FAR-specific API key.** |
| Network calls from renderer | None. AI calls route through `window.sd.ai.complete` (bridge). |
| File upload to government | None. No path uploads to acquisition.gov, SAM, PIEE, eBuy, or GSA. |
| Compliance certification claim | **Forbidden.** No "certified compliant," "legally sufficient," or "FAR certified" phrasing anywhere. |
| Legal advice claim | **Forbidden.** Every panel reproduces the canonical "SourceDeck provides internal review support only. This is not legal advice." disclaimer. |
| Phase 25A no-send/no-submit/no-upload | Extends verbatim. |

## 3. Layout

The FAR Reference section ships as `<section id="gc-far-reference" data-section="govcon-far-reference">` inside the `tab-govcon` pane, after the existing submission-readiness sections. It contains four panels:

| Panel | `data-section` | Purpose |
|---|---|---|
| FAR Browse · Reference Links | `govcon-far-browse` | Search input + Open FAR on Acquisition.gov + Regulations Search |
| FAR AI FAQ | `govcon-far-ai-faq` | Question/context/source-text input + Ask AI button + Answer panel + Citations panel |
| FAR Compliance Review (Upload) | `govcon-far-upload-review` | File picker (.txt/.md only locally; .pdf/.docx/images → paste-fallback) + paste textarea + review type selector + Result panel |
| Saved FAR Notes | `govcon-far-saved-notes` | Local list of saved FAR notes (FAQ answers, compliance reviews) with delete |

## 4. Canonical safety language

Every AI-touching panel reproduces the mission's canonical disclaimer verbatim:

> SourceDeck provides internal review support only. This is not legal advice. Verify against the current solicitation and acquisition.gov FAR text before relying on it.

A second orange-tinted warning sits below each AI panel:

> Advisory only. SourceDeck does not certify any document as FAR-compliant. Reviews use phrasing like "appears aligned," "potential issue," "requires review," and "verify against FAR and solicitation." Do not infer certification.

## 5. Persistence

| Property | Value |
|---|---|
| Storage primary | `window.sd.storeGet/storeSet('farReference')` electron-store bridge |
| Storage fallback | `localStorage['sd.farReference.v1']` |
| State shape | `{ notes: [{ id, kind, question, answer, citations, createdAt, linkedSolicitationId, linkedProposalSectionId, linkedComplianceMatrixId, linkedVendorAgreementId }] }` |
| Saved-note kinds | `far-faq`, `far-compliance-review` |

## 6. Acquisition.gov link strategy

- Plain search query (`Part 15`, `evaluation factors`) → `https://www.acquisition.gov/far?search=…`
- Section-shaped input (e.g., `52.212-4`, `15.305`) → `https://www.acquisition.gov/far/52.212-4`
- Regulations Search button → `https://www.acquisition.gov/content/regulations`
- All external opens prefer `window.sd.openExternal(url)` when the bridge exposes it; otherwise `window.open(url, '_blank', 'noopener,noreferrer')`.

## 7. Future enhancements

| Enhancement | Status |
|---|---|
| Versioned local FAR snapshot with retrieval date | Reserved. Adds bundle weight + freshness burden. Phase 25I deep-links to live acquisition.gov instead. |
| OCR for image uploads | Reserved. Would need `tesseract.js` or AI-vision routing. Phase 25I says "paste the extracted text" or "enable AI vision (warning shown first)." |
| Native PDF text extraction | Reserved. Would need `pdf.js`. Phase 25I paste-fallback. |
| Native DOCX text extraction | Reserved. Would need `mammoth`. Phase 25I paste-fallback. |
| Auto-link saved FAR notes to specific compliance-matrix rows | Reserved. The note schema already includes the link fields; the GovCon Compliance Matrix surface needs a corresponding "attach FAR note" button (future Phase 25J). |

---

## Signature

Phase 25I ships the FAR Reference contract: acquisition.gov deep-links, source-grounded AI FAQ, advisory-only compliance review, saved local notes. No legal advice. No certified compliance. No new mandatory API key.

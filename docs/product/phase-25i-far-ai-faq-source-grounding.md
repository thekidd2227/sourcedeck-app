# Phase 25I — FAR AI FAQ Source-Grounding Contract

**Date:** 2026-06-09

The FAR AI FAQ must answer FAR questions without hallucinating. This document records the prompt-building contract, the refusal paths, and the verification protocol.

---

## 1. Refusal paths (mandatory)

The FAR AI FAQ refuses to answer in three cases:

| Trigger | UI response |
|---|---|
| No AI provider key configured (`window.sd.credentials.status().present.openai/anthropic/ibm` all absent) | Shows: *"Add an AI API key in Settings → API Keys to use FAR AI FAQ. You can still open acquisition.gov manually with the link above to read the FAR text yourself."* |
| No FAR source text pasted | Shows: *"No FAR source text was retrieved. Open acquisition.gov or paste FAR text before relying on the answer. SourceDeck does not fabricate FAR text. Click 'Open FAR on Acquisition.gov,' copy the relevant text into the 'Pasted FAR source text' box, and try again."* |
| AI bridge `window.sd.ai.complete` not available | Falls back to showing the prompt text directly so the operator can copy it into their own AI provider out-of-band. |

## 2. Prompt-building contract

`window.farBuildFaqPrompt(question, context, sourceText)` returns a deterministic prompt with these mandatory clauses:

1. **System role**: SourceDeck's FAR Reference assistant.
2. **Hard rules** (verbatim):
   - Answer only from provided FAR/acquisition.gov source text or say the source text is insufficient.
   - Cite FAR Part/Subpart/Section and URL when available.
   - Do not provide legal advice.
   - Do not claim compliance.
   - Give practical next steps for internal review.
   - If unsure, say "I do not know" or "verify against current FAR and the solicitation."
3. **Context label**: the user-selected dropdown value (one of 10 canonical contexts).
4. **User question**: as typed.
5. **Pasted FAR source text** (if provided): wrapped in triple-quotes so the model treats it as the source.
6. **No-source instruction** (if no source text): explicit instruction to refuse rather than fabricate.
7. **Output format requirement**: Answer + FAR citations (Part / Subpart / Section + URL when known).
8. **End-of-answer disclaimer**: `Advisory only. Verify against the current solicitation and acquisition.gov FAR text.`

The prompt-builder is the source of source-grounding. The sentinel `test/phase-25i-far-ai-faq.test.js` pins every required clause.

## 3. Canonical contexts (10)

| Context value | Buyer-facing label |
|---|---|
| `general` | General FAR |
| `micro-purchase` | Micro-purchase / simplified acquisition |
| `solicitation-instructions` | Solicitation instructions |
| `evaluation-factors` | Evaluation factors |
| `subcontracting-teaming` | Subcontracting / teaming |
| `small-business` | Small business / set-asides |
| `pricing-cost` | Pricing / cost |
| `past-performance` | Past performance |
| `communication-restrictions` | Communication restrictions |
| `clauses-forms` | Clauses / forms |

## 4. Citation extraction

After the AI returns, the renderer scans the answer for `FAR \d+(\.\d+)?(-\d+)?` patterns and surfaces them in the dedicated Citations panel. The buyer can verify each by pasting it into the FAR Browse search and clicking **Open FAR on Acquisition.gov**.

## 5. Saved-note path

`window.farCopyAsNote()` saves the current answer + citations as a `far-faq` note in `window.sd.storeGet/storeSet('farReference')`. Saved notes can be linked to a solicitation / proposal section / compliance matrix row / vendor agreement (the schema is in place; the cross-pane attach UI is a future-phase enhancement).

## 6. No-network invariant

The Phase 25I script block strips clean of `fetch(` and `XMLHttpRequest` after comment removal. The only AI route is `window.sd.ai.complete(...)`, which is the bridge to the user-configured provider's main-process call site. The renderer never speaks to a model provider directly.

## 7. Verification protocol

Every FAR AI answer ships with three verifications:

1. **Open FAR on Acquisition.gov** — the buyer reads the live FAR text themselves.
2. **Cite FAR section** — every answer must include `FAR Part/Subpart/Section`.
3. **Disclaimer** — the answer ends with "Advisory only. Verify against the current solicitation and acquisition.gov FAR text."

A buyer who skips all three is operating outside the Phase 25I contract.

---

## Signature

The FAR AI FAQ ships a source-grounded prompt + three refusal paths + on-the-fly citation extraction + canonical disclaimer. The sentinel `test/phase-25i-far-ai-faq.test.js` pins every clause.

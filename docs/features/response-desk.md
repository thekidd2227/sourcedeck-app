# Response Desk

**Status:** Shipped. Replaces the previous Reply Analyzer feature.

## What it is

Response Desk turns an inbound reply into an operational decision:

1. **What happened** — a short summary of the inbound message.
2. **What it means** — an intent classification across 11 categories with urgency, revenue, and risk scores.
3. **What to do next** — a recommended next action with a due window.
4. **What to draft** — three review-only response options (Direct Close, Consultative, Short Executive).
5. **What to update** — pipeline-stage and task recommendations (advisory only).
6. **What is safe** — explicit safety flags plus a hard human-approval requirement.

The classifier in `services/response-desk.js` is **pure, offline, and deterministic** — it does not call any external AI provider. Manual paste mode produces a complete, usable triage with zero network calls, which is what makes Response Desk usable on day one without any keys configured.

## Why it is more valuable than pasting a reply into ChatGPT / Claude / Gemini / Perplexity

A generic chat box can summarize the text. Response Desk does five things a generic chat box cannot:

| Generic AI chat box | Response Desk |
|---|---|
| Summarizes the message | Summarizes **and** classifies into a 11-category operational taxonomy |
| Sometimes proposes a reply | Builds **three** review-only drafts (direct close / consultative / short executive) tailored to the classified intent |
| No idea of your pipeline | Recommends a pipeline-stage update and a follow-up task, anchored to the SourceDeck record |
| No safety surface | Surfaces explicit safety flags (do-not-contact, procurement-restricted, high-risk, operator review) |
| Will draft replies even when it shouldn't | Suppresses sales drafts on unsubscribe / procurement-restricted / spam |
| Doesn't know your offer, stage, or deal value | Consumes company, contact, offer, current stage, deal value, user goal, and optional CRM record ID as context |
| Can hallucinate guaranteed-outcome / compliance claims | Sanitizer scrubs guaranteed-outcome, certification, and signed/notarized phrases from every output field |
| Can be talked into auto-sending | Hard invariants: `human_approval_required: true` / `auto_send: false` on every output, asserted by the test suite |

## Classification categories

The 11 categories the classifier resolves to (priority order — safety/compliance categories resolve first):

1. `unsubscribe_or_do_not_contact` — suppresses normal drafts; recommends DNC handling.
2. `procurement_restricted` — suppresses direct sales drafts; recommends routing through official channels.
3. `spam_or_irrelevant` — low priority; no drafts.
4. `meeting_request` — schedule-availability recommendation.
5. `hot_buying_signal` — high-urgency close/meeting recommendation.
6. `pricing_request` — pricing/scope draft recommendation.
7. `objection` — consultative re-frame draft recommendation.
8. `need_more_info` — concise information-request draft recommendation.
9. `referral_or_wrong_contact` — re-route to recommended contact.
10. `not_now_nurture` — nurture cadence (30-day default).
11. `human_review_required` — fallback when no signal is detected.

## Urgency, revenue, and risk scoring

Each output carries:
- `urgency_score` (0–100)
- `revenue_score` (0–100) — boosted by deal value for commercial categories; never boosted on suppression categories.
- `risk_level` (`low` / `medium` / `high`)

## Response draft options

For every non-suppression category, three review-only draft options are produced:
- **Direct Close** — assumes the buyer is ready and proposes a concrete next slot.
- **Consultative** — asks two clarifying questions before advancing.
- **Short Executive** — three-choice decision frame.

For suppression categories, all three drafts are empty and a `notice` field explains why the drafts were suppressed.

Each draft ends with the audit-friendly line: *"Sent for your review; not auto-sent."* The sanitizer scrubs any blocked-phrase contamination from inputs (e.g., a user putting "guaranteed 10x ROI" into the offer field will not leak into the draft).

## Pipeline and task recommendations

Both are **advisory strings** with the explicit `(advisory only)` suffix. Response Desk does not silently mutate any CRM record. The renderer's `rdCreateTask()` and `rdSaveToCRM()` helpers are user-triggered only; the Save button is disabled unless a CRM record ID is present and the AT_PAT credential is configured.

## CRM / Airtable writeback

When a record ID and a configured Airtable PAT are present, the operator can click **Save analysis to CRM/Airtable** to write the analysis fields (intent, summary, response draft, next action) to Airtable. The writeback is:
- **User-triggered only** (no auto-save).
- **Labeled clearly** as save/writeback, not send.
- **Shows what will be saved** before mutating (the status text spells out which fields will be written).
- **Never sends email.**

## Manual approval requirement

Every output sets `human_approval_required: true` and `auto_send: false`. These invariants are enforced by:
- The classifier output shape.
- The `sanitizeResponseDeskOutput()` function (force-sets them even if upstream code tries to weaken them).
- The test suite (`test/response-desk.test.js`).
- The renderer UI (the "Human approval required" section is always visible, and there is no Send Email button anywhere).

## No auto-send

Response Desk has **no** Send Email, Auto-Send, or Submit Quote surface. The audit doc and the test suite explicitly assert this is the case — both in the service module and in the rendered HTML pane.

## Privacy / safety rules

- No external AI call is made by the renderer or the service module — manual paste mode is fully offline.
- Blocked phrases (guaranteed-outcome, compliance certifications, watsonx-live, signed-notarized, auto-send, auto-submit) are scrubbed from every output field by `sanitizeResponseDeskOutput`.
- Drafts cannot include unsupported certification claims even if the user tries to seed them via input fields.
- Stored credentials (Airtable PAT, AI provider keys) follow the existing SourceDeck credential boundary (safeStorage via the IPC bridge). Response Desk does not introduce a new credential surface.

## Future inbox-import path

Paste mode is the fallback. Future iterations may add a connected inbox import that routes inbound replies to Response Desk automatically. This phase intentionally does not wire Gmail / Outlook OAuth — that landing requires a separate authorized connector with its own credential boundary review. The UI copy ("Paste mode is a fallback. Connected inbox import can route replies automatically when configured.") signals the direction without committing the renderer to an unsafe integration.

## Operator-facing language

The UI presents Response Desk with this framing:

> Response Desk turns replies into pipeline actions. It does not just summarize text — it recommends the next move, draft options, safety flags, and CRM/task updates for human approval.

## File map

- `services/response-desk.js` — deterministic classifier + sanitizer (UMD: Node + browser).
- `sourcedeck.html` — `#tab-reply` pane, `analyzeReply()`, `clearRA()`, `rdCopyDraft()`, `rdCreateTask()`, `rdSaveToCRM()`, `rdMarkDNC()`, `rdMoveToNurture()`, `rdOpenLead()`.
- `test/response-desk.test.js` — 24 tests covering classification, scoring, sanitizer, invariants, and renderer wiring.
- `docs/features/response-desk.md` — this document.
- `docs/audits/response-desk-implementation-audit.md` — implementation audit.
- `docs/release-notes/response-desk.md` — release note.

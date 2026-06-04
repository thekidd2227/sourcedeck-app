# Audit — Response Desk Implementation

**Date:** 2026-06-04
**Branch:** `feat/response-desk`
**Base:** `main @ 6480f93`
**Phase:** Reply Analyzer → Response Desk upgrade.

## Pre-existing state (Reply Analyzer)

Before this PR:
- Nav button: `data-tab="reply"` labeled "Reply Analyzer" (`sourcedeck.html:785`).
- Pane: `<div class="tab-pane" id="tab-reply">` (`sourcedeck.html:1178`).
- Pane title: `<span class="brief-head">Reply Analyzer</span>` with subtitle `"OpenAI GPT-4o primary · Claude fallback · Airtable writeback ready"`.
- Inputs: `ra-co`, `ra-rid`, `ra-reply`, `ra-ctx` (4 fields).
- Output tabs: Summary / Intent / Response / Next Move (`ra-sum-out`, `ra-int-out`, `ra-res-out`, `ra-next-out`).
- Buttons: `analyzeReply()`, `clearRA()`, `saveRAtoAirtable()`.
- JavaScript: `analyzeReply()` built a prompt for `window.sd.ai.generate()` (OpenAI/Anthropic via the credential boundary) and parsed `---SUMMARY---`/`---INTENT---`/`---RESPONSE---`/`---NEXT---` blocks. When no AI key was configured, the function emitted a hand-coded fallback response after a 1.2s timer.
- `saveRAtoAirtable()` PATCHed the `raCache` fields to specific Airtable field IDs via the existing `sdAirtableFetch` helper.
- DailyOps mentioned the feature at `sourcedeck.html:7802` ("Open LCC → Replied leads → analyze in Reply Analyzer").
- Settings hinted at provider use at `sourcedeck.html:1777`.
- Spanish i18n at `sourcedeck.html:10255` translated "Reply Analyzer" → "Analizador de respuestas".

### Pre-existing safety profile

- **Wrote to Airtable?** Yes — user-triggered only, behind `AT_PAT` credential check.
- **Updated pipeline state?** No.
- **Created tasks?** No.
- **Used direct renderer-side AI calls?** Yes, via the existing `window.sd.ai` IPC surface (so credentials stayed in main process — no renderer-side raw key handling).
- **No-auto-send protection?** Implicit (no Send button existed) but no explicit invariant.

## What Response Desk does now

### Service module (`services/response-desk.js`, new)

UMD module exporting:
- `CATEGORIES` — frozen list of 11 classification categories.
- `BLOCKED_PHRASES` — frozen regex list of phrases that may never appear in any output field.
- `classifyResponse(input)` — rule-based classifier returning `{ category, confidence, signals }`.
- `scoreResponse(input, classification)` — returns `{ urgency_score, revenue_score, risk_level }`.
- `recommendResponseAction(classification)` — returns `{ recommended_action, next_due }`.
- `buildResponseDraftOptions(input, classification)` — returns `{ direct_close, consultative, short_executive, notice? }`.
- `buildPipelineRecommendations(input, classification)` — returns `{ pipeline_stage_recommendation, task_recommendation }`.
- `sanitizeResponseDeskOutput(output)` — scrubs blocked phrases and force-sets the hard invariants.
- `runResponseDesk(input)` — orchestrator returning the full output shape.

**Output shape (asserted by tests):**
```
{ summary, intent, classification_confidence, classification_signals,
  urgency_score, revenue_score, risk_level,
  recommended_action, next_due,
  pipeline_stage_recommendation, task_recommendation,
  response_options: { direct_close, consultative, short_executive, notice? },
  safety_flags: [...],
  human_approval_required: true,    // hard invariant
  auto_send: false,                  // hard invariant
  audit_note: 'Draft only — not sent. All outbound responses require explicit human approval.'
}
```

**Hard rules enforced by the sanitizer (every output, every code path):**
- `human_approval_required` is always set to `true`.
- `auto_send` is always set to `false`.
- `safety_flags` is always an array.
- Blocked phrases are replaced with `[redacted]` in every string field.

### Renderer (`sourcedeck.html`, modified)

- Nav button label: Reply Analyzer → **Response Desk**.
- Pane comment + title + subtitle replaced.
- New input fields added: Company/Contact, original outreach context, **Offer discussed**, **Current pipeline stage**, **Estimated deal value**, **User goal**, optional **CRM/Airtable record ID**.
- Helper copy added: *"Paste mode is a fallback. Connected inbox import can route replies automatically when configured."*
- Framing copy added: *"Response Desk turns replies into pipeline actions. It does not just summarize text — it recommends the next move, draft options, safety flags, and CRM/task updates for human approval."*
- Output replaced with 8 explicit sections: Reply Summary · Intent + Urgency · Recommended Next Action · Pipeline Recommendation · Task Recommendation · Response Options (Direct Close / Consultative / Short Executive sub-tabs) · Safety Flags · Human Approval Required.
- Allowed action buttons added: **Copy selected draft**, **Create follow-up task**, **Save analysis to CRM/Airtable**, **Mark do-not-contact**, **Move to nurture**, **Open lead record**.
- Forbidden controls: **none introduced** — no Send Email, no Auto-Send, no Submit Quote.
- Provider language ("OpenAI GPT-4o primary · Claude fallback") removed from the visible subtitle.
- Settings hint updated: "Used for AI Generate, Response Desk, Intro Email generation".
- DailyOps mention updated: "analyze in Response Desk".
- Spanish i18n: "Response Desk" → "Mesa de respuesta".
- `<script src="services/response-desk.js">` added in `<head>` so the renderer can call `window.SDResponseDesk.runResponseDesk(input)` without any change to `preload.js` or `main.js`.

### Renderer behavior

`analyzeReply()`:
- Reads all input fields.
- Calls `window.SDResponseDesk.runResponseDesk({...})` synchronously — **no external AI call**.
- Renders the 8 sections from the structured output.
- Enables the **Save analysis to CRM/Airtable** button only when both an Airtable record ID and `AT_PAT` are present.
- Logs an activity entry; toasts a status.

`rdCopyDraft()`, `rdCreateTask()`, `rdMarkDNC()`, `rdMoveToNurture()`, `rdOpenLead()`:
- All advisory / clipboard / log operations only.
- None of them dispatch email or auto-send.

`rdSaveToCRM()`:
- Refuses to save without an Airtable record ID and `AT_PAT`.
- Builds a payload mapping the analysis fields to the same Airtable field IDs the pre-existing `saveRAtoAirtable()` used (no schema change).
- Status text spells out what is being saved before the network call returns.
- Sends an Airtable PATCH via `sdAirtableFetch` — same credential boundary as before.

`clearRA()`:
- Clears all 8 input fields and all 9 output regions.
- Disables the save button.
- Clears the cached output.

## Tests (`test/response-desk.test.js`, new — 24 cases)

| # | Test | Result |
|---|---|---|
| 1 | hot buying signal → high urgency + close/meeting action | ✅ |
| 2 | pricing request → pricing/scope draft + action | ✅ |
| 3 | meeting request → scheduling recommendation | ✅ |
| 4 | objection → consultative re-frame | ✅ |
| 5 | unsubscribe → do-not-contact + no sales draft | ✅ |
| 6 | procurement-restricted → restricted safety flag + suppressed drafts | ✅ |
| 7 | spam/irrelevant → low priority + no drafts | ✅ |
| 8 | need-more-info → information-request draft | ✅ |
| 9 | referral / wrong contact → re-route recommendation | ✅ |
| 10 | not-now nurture → 30-day cadence | ✅ |
| 11 | empty reply → operator review required | ✅ |
| 12 | every output has `human_approval_required: true` | ✅ |
| 13 | every output has `auto_send: false` | ✅ |
| 14 | no send-email surface in service module | ✅ |
| 15 | blocked phrases scrubbed from any output field | ✅ |
| 16 | drafts never include guaranteed-outcome or compliance claims | ✅ |
| 17 | pipeline recommendation is advisory only (no auto-write hint) | ✅ |
| 18 | manual paste mode works without external API or network | ✅ |
| 19 | deal-value boost lifts revenue_score for commercial categories | ✅ |
| 20 | deal-value boost does NOT lift revenue on unsubscribe / spam | ✅ |
| 21 | all 11 categories are exported | ✅ |
| 22 | renderer uses "Response Desk" — Reply Analyzer label retired | ✅ |
| 23 | renderer has no Send Email / auto-send surface in Response Desk | ✅ |
| 24 | renderer surfaces "Draft only — not sent" safety language | ✅ |

## Files changed

- `sourcedeck.html` (modified) — nav rename, pane rewrite, script include, JS function rewrite, settings/i18n/DailyOps text updates.
- `services/response-desk.js` (new) — deterministic classifier + sanitizer.
- `test/response-desk.test.js` (new) — 24-test suite.
- `docs/features/response-desk.md` (new) — feature documentation.
- `docs/audits/response-desk-implementation-audit.md` (this file).
- `docs/release-notes/response-desk.md` (new) — release note.
- `README.md` (modified) — tab list label update.
- `package.json` (modified — by `npm test` chain append only) — adds `node test/response-desk.test.js` to the test list.

No `.env`, `main.js`, `preload.js`, `chartnav-integration.js`, `reports/**`, SAM Sprint, GovCon entitlement, watsonx, signing, Vercel, ARCGSystems, ChartNav, sourcedeck-site, or Buffer file was modified.

## Confirmations

- **No auto-send.** The service module exposes no `sendEmail` / `autoSend` / `dispatchReply` symbol; the renderer pane has no Send Email button; the sanitizer force-sets `auto_send: false` and `human_approval_required: true` on every output.
- **No Send Email button.** Static-source asserted by test #23.
- **Human approval required.** Asserted in 13 invariant tests + the always-visible "Human approval required" UI section.
- **No SAM Sprint behavior changed.** No file under `services/govcon/sam-*` or `scripts/sam-*` modified.
- **No GovCon entitlement behavior changed.** `services/govcon/sam-sprint-entitlements.js` not touched.
- **No pricing / payment / watsonx / signing / release-evidence / Vercel / compliance-claims logic changed.**
- **No secrets in source.** Test #14 and test #18 statically verify no http / electron / fetch usage in the service module. Renderer credential boundary unchanged.
- **No new product features added beyond the Response Desk scope.**
- **No claims of guaranteed award / revenue / ROI / response rate / savings** appear in any output. Sanitizer scrubs all such phrases.
- **Stashes untouched** (`git stash list` empty before and after).
- **Old SoHo×DC stash not applied** (per the Phase 20 series guardrail; still applies here).
- **No package-lock churn.** No `package-lock.json` added; only the existing `package.json` `test` script chain appended.

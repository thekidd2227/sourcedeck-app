# Release Note — Response Desk

**Branch:** `feat/response-desk`
**Type:** Feature upgrade — Reply Analyzer → Response Desk.
**Base:** `main @ 6480f93`.

## Summary

Replaces the previous Reply Analyzer with **Response Desk** — an operational inbound-reply triage workflow that turns a pasted reply into a classification, urgency / revenue / risk scores, a recommended next action, three review-only draft options, advisory pipeline and task recommendations, and explicit safety flags. Every output is human-approved; nothing is auto-sent.

## What changed

- The "Reply Analyzer" tab is now called **Response Desk** throughout the renderer, README, settings hint, DailyOps task list, and Spanish i18n.
- New deterministic classifier service: `services/response-desk.js` (offline, no external AI call required).
- New input fields: Company/Contact · Reply text · Original outreach context · Offer discussed · Current pipeline stage · Estimated deal value · User goal · Optional CRM/Airtable record ID.
- New output sections: Reply Summary · Intent + Urgency · Recommended Next Action · Pipeline Recommendation · Task Recommendation · Response Options (Direct Close / Consultative / Short Executive) · Safety Flags · Human Approval Required.
- New allowed action buttons: Copy selected draft · Create follow-up task · Save analysis to CRM/Airtable · Mark do-not-contact · Move to nurture · Open lead record.
- Provider language ("OpenAI GPT-4o primary · Claude fallback") removed from the visible subtitle. Provider logic for SourceDeck's other AI features is unchanged elsewhere in the app.

## Why

Pasting a reply into ChatGPT / Claude / Gemini / Perplexity returns a summary and maybe a draft. Response Desk goes further: it classifies the reply into an 11-category operational taxonomy, scores urgency / revenue / risk, recommends a concrete next action, builds three differentiated draft options, surfaces explicit safety flags, suggests pipeline and task updates anchored to the SourceDeck record, and refuses to draft sales replies on unsubscribe / procurement-restricted / spam categories. Every output sets `human_approval_required: true` and `auto_send: false` as hard invariants.

## Safety

- **No auto-send.** Response Desk does not send email, auto-submit, or dispatch any outbound message.
- **No Send Email button** anywhere in the pane.
- **No new credential surface.** The renderer continues to use the existing `sd.credentials` IPC boundary for any provider key.
- **Sanitizer scrubs blocked phrases** — guaranteed-outcome, certification, watsonx-live, signed-notarized, auto-send, auto-submit, government-compliant — from every output field. Even if a user pastes such language into the input fields, it cannot leak into a draft.
- **Suppression categories** (unsubscribe / procurement-restricted / spam) produce empty drafts with an explanatory notice.
- **Save-to-CRM is user-triggered only.** The button is disabled unless both a record ID and the Airtable PAT are present; the status text spells out what will be saved before the network call.
- **Pipeline and task recommendations are advisory strings**, labeled `(advisory only)`. Response Desk does not silently mutate any CRM record.

## Safety claims explicitly NOT added

- No guaranteed award / revenue / ROI / response-rate / savings language.
- No SOC 2 / FedRAMP / CMMC / HIPAA / HITRUST / ISO 27001 claims.
- No watsonx-live claim.
- No signed/notarized claim.

## Files changed

- `sourcedeck.html` — nav rename, pane rewrite, script include for the service module, JS function rewrite, settings/i18n/DailyOps text updates.
- `services/response-desk.js` (new) — deterministic classifier + sanitizer (UMD: Node + browser).
- `test/response-desk.test.js` (new) — 24-test suite covering classification, scoring, sanitizer, hard invariants, and renderer wiring.
- `docs/features/response-desk.md` (new) — feature documentation.
- `docs/audits/response-desk-implementation-audit.md` (new) — implementation audit.
- `docs/release-notes/response-desk.md` (this file).
- `README.md` — tab list label update.
- `package.json` — appends `test/response-desk.test.js` to the `npm test` chain.

## Files NOT changed

- `main.js`, `preload.js`, `chartnav-integration.js` — none touched. The renderer reaches the service module via a plain `<script src=>` include because `services/response-desk.js` is UMD-style.
- `.env` files — none touched.
- `services/govcon/sam-*`, `scripts/sam-*` — SAM Sprint behavior unchanged.
- `services/govcon/sam-sprint-entitlements.js` — GovCon entitlement behavior unchanged.
- watsonx / signing / release-evidence / Vercel / Buffer / ARCGSystems / ChartNav / sourcedeck-site — unchanged.

## Tests run

- `node test/response-desk.test.js` — 24/24 PASS.
- `npm test` — full suite green.
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Results recorded in the PR description.

## Future inbox-import

Paste mode is the fallback. A future iteration may add a connected inbox import (Gmail / Outlook OAuth) that routes inbound replies to Response Desk automatically. This phase intentionally does not wire that integration — it would require a separate authorized connector with its own credential boundary review. The UI copy signals the direction ("Paste mode is a fallback. Connected inbox import can route replies automatically when configured.") without committing to an unsafe integration today.

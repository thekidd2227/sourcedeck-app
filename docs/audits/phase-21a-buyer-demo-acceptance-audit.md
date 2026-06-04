# Audit — Phase 21A Buyer Demo Acceptance

**Date:** 2026-06-04
**Branch:** `docs/phase-21a-buyer-demo-acceptance`
**Base:** `main @ 9dc9350` (post-PR #52 default-state data hygiene).
**Scope:** Docs-only. No runtime, package, script, service, test, or workflow change.

## Purpose

Validate that SourceDeck on `main @ 9dc9350` is clean, credible, and demo-ready for a controlled buyer walkthrough, and produce the operator-facing materials (walkthrough scripts, Go / No-Go checklist, release note) that gate the demo.

## Pre-existing state

| Surface | Status at `main @ 9dc9350` | Evidence |
|---|---|---|
| Default-state hygiene | ✅ verified | `test/default-state-policy.test.js` 22/22 PASS, including markup-contamination assertions for PROD-XX, NYC/Manhattan/Brooklyn, Spanish Caribbean, fake Airtable/Gmail IDs, operator topic codenames, "Faceless Ad Engine" title. |
| Response Desk | ✅ preserved | `test/response-desk.test.js` 24/24 PASS; tests #16–#18 in default-state-policy re-verify Response Desk invariants. |
| SAM Opportunity Sprint entitlement | ✅ preserved | `test/sam-opportunity-sprint.test.js` 62/0 PASS; `test/default-state-policy.test.js` #19 verifies `PLAN_LIMITS.free.max_naics_codes === 1`; #20 verifies `SAM_GOV_API_KEY` is renderer-absent. |
| `.btn-gold` cool gold | ✅ preserved | `:root --gold:#C9941A` at `sourcedeck.html:60`; `.btn-gold` rule at `sourcedeck.html:181`. |
| 900px / 899px responsive boundary | ✅ preserved | `@media(max-width:899px)` at `sourcedeck.html:438` and `:540`; `@media(max-width:900px)` at `:2269`. |
| Privacy gate | ✅ clean | `node scripts/release-check.js`: `no owner strings in shipped source; MOCK_LEADS empty; PROMPT_LIBRARY empty; arcg_brand default neutral`. |

## Claims audit at `main @ 9dc9350`

Static-source scan (`grep -RInE "guaranteed (award|revenue|ROI)|we guarantee|auto-send|send automatically|submit automatically|SOC ?2 certified|FedRAMP authorized|CMMC certified|HIPAA certified|HITRUST|ISO ?27001 certified|watsonx live|signed and notarized|unlimited AI"` across `README.md`, `docs/**`, and `sourcedeck.html`):

**Result: 0 positive unsupported claims.** Every hit is in one of three negative-assertion contexts:

1. **Sanitizer / blocked-phrase lists** in `services/response-desk.js`, `services/default-state-policy.js`, `docs/features/response-desk.md`, `docs/features/sam-opportunity-sprint.md`.
2. **Forbidden-claim lists** in `docs/operator/demo-operator-runbook.md`, `docs/commercial-readiness/final-commercial-smoke-checklist.md`, `docs/release-candidate/known-limitations.md`, `docs/release-candidate/go-no-go-checklist.md`, `docs/release-candidate/sourceDeck-v1-rc-lock.md`, `docs/design/sourceDeck-ui-redesign-roadmap.md`, `docs/design/sourceDeck-civic-atelier-visual-direction.md`.
3. **Test forbidden-term arrays** in `test/response-desk.test.js`, `test/default-state-policy.test.js`.

No positive "watsonx live" claim. No positive "signed and notarized" claim. No positive compliance-certification claim. No positive guaranteed-outcome claim. No positive auto-send / auto-submit claim.

## Default-state / new-user posture validation

PR #52 cleanup confirmed via static-source contamination scan on user-facing markup (lines 1–1731 of `sourcedeck.html` — everything before the first inline `<script>`):

| Category | Hits in markup | Verdict |
|---|---|---|
| `PROD-XX` activity rows | 0 | ✅ |
| `NYC Metro` / `Manhattan` / `Brooklyn` / `Bronx` / `Queens` / `Staten Island` / `Westchester` dropdown defaults | 0 | ✅ |
| `ARCG` / `Jean-Max` / `Ariel` / `River` owner strings | 0 | ✅ |
| `Notion pipeline` / `Notion Leads DB` / `synced leads to Notion` | 0 | ✅ |
| `appXXXXXXXXXXXXXXX` fake Airtable base ID | 0 | ✅ |
| `Gmail Connection` with fake numeric ID | 0 | ✅ |
| Webhook fake tokens (`ti5tlit9…`, `jpu2xj…`, `4595758`) | 0 | ✅ |
| `PROD-XX ACTIVE` / `Warmup Score 100/100` | 0 | ✅ |
| MedPilot / Diagnosis-First / Operator POV / Bad-Fit Opportunity / Government Contractor Diagnostic / Revenue Leakage | 0 | ✅ |
| "Faceless Ad Engine" title | 0 | ✅ (now "Ad Engine") |

Demo data is gated behind `SOURCEDECK_DEMO_MODE=true` and is off by default. `MOCK_LEADS=[]` and `PROMPT_LIBRARY={}` ship empty.

## Protected-feature validation

### Response Desk

- Label present at `sourcedeck.html:789` (nav button) and `:1140` (pane title).
- No Send Email button in `#tab-reply` pane — asserted by `test/response-desk.test.js` #23 and `test/default-state-policy.test.js` #17.
- `human_approval_required: true` and `auto_send: false` hard invariants on every output — asserted by tests #12–#13 in `test/response-desk.test.js` and #18 in `test/default-state-policy.test.js`.
- Suppression categories (`unsubscribe_or_do_not_contact`, `procurement_restricted`, `spam_or_irrelevant`) produce empty drafts with explanatory notice — asserted by tests #5–#7 in `test/response-desk.test.js`.

### SAM Opportunity Sprint

- Plan limit copy present at `sourcedeck.html:2090`: *"Free users: 1 NAICS per sprint. Paid users: all configured NAICS codes."*
- `PLAN_LIMITS.free.max_naics_codes === 1` verified by `test/default-state-policy.test.js` #19.
- `SAM_GOV_API_KEY` not stored in renderer / `localStorage` — verified by `test/default-state-policy.test.js` #20.
- Manual-only report-viewer: no auto-send, no auto-submit. Verified by `test/sam-opportunity-sprint.test.js` ("generates at most top_draft_count email drafts and none auto-send"; "keeps manual_review_required=true under both plans").

### Phase 20G visual guards

- `.btn-gold` cool gold preserved: `--gold:#C9941A` at `sourcedeck.html:60`; rule at `:181`. Asserted by `test/default-state-policy.test.js` #21.
- 900px / 899px responsive boundary preserved: `@media(max-width:899px)` at `:438` and `:540`. Asserted by `test/default-state-policy.test.js` #22.

## Materials produced (Phase 21A)

- `docs/demo/phase-21a-buyer-demo-walkthrough.md` — 5-minute and 15-minute walkthrough scripts; screen-by-screen table; what-to-say / what-not-to-say columns; known limitations; buyer objections + approved responses; manual approval boundaries; no-auto-send / no-guaranteed-award / no-compliance / watsonx-live / signed-notarized status rules; embedded Go / No-Go pre-meeting check.
- `docs/audits/phase-21a-buyer-demo-acceptance-audit.md` — this file.
- `docs/commercial-readiness/phase-21a-go-no-go-checklist.md` — formal Go / No-Go gate.
- `docs/release-notes/phase-21a-buyer-demo-acceptance.md` — release note.

## Files NOT changed (verification)

- `sourcedeck.html` — not touched.
- `services/**` — not touched.
- `scripts/**` — not touched.
- `test/**` — not touched.
- `package.json` — not touched.
- `package-lock.json` — not present.
- `.env*` — not touched.
- `main.js`, `preload.js`, `chartnav-integration.js` — not touched.
- `reports/**` — not committed.
- Vercel config — not touched.
- watsonx / signing / provider files — not touched.

## Demo readiness decision

**GO for controlled buyer walkthrough** subject to the gates in `docs/commercial-readiness/phase-21a-go-no-go-checklist.md`. Specifically:

- Presenter must use the **5-minute** or **15-minute** walkthrough in `docs/demo/phase-21a-buyer-demo-walkthrough.md` (or the longer 20–30 minute script in `docs/demo/sourceDeck-v1-buyer-demo-script.md`).
- Presenter must use a **default-state install**, not the operator's working machine with active pipeline data.
- Presenter must not extend into the forbidden-claim column under any buyer pressure.
- Pixel-level operator visual screenshot QA for PR #52 is recommended but not blocking for a controlled walkthrough; the static-source pass is sufficient evidence that the cleanup is in place.

## Confirmations

- **Docs-only.** No runtime, package, script, service, test, or workflow file modified.
- **No new claims added** in any of the four new docs. The forbidden-claim language in the new docs is **negative** ("do not say X") — it lists what to avoid, not what to assert.
- **No watsonx-live claim added.**
- **No signed/notarized claim added.**
- **No guaranteed-outcome claim added.**
- **No compliance-certification claim added.**
- **No auto-send / auto-submit claim added.**
- **No pricing change** in any of the four new docs.
- **No new product feature** described.
- **No `.env`** touched.
- **No screenshots committed.** The walkthrough script references existing screens; it does not embed image files.
- **No generated reports committed.**
- **Stashes untouched** (`git stash list` empty before and after).
- **Phase 20G `.btn-gold` cool gold + 900px / 899px guards** preserved by virtue of not editing `sourcedeck.html`.
- **Response Desk** behavior preserved by virtue of not editing `services/response-desk.js`, `test/response-desk.test.js`, or `#tab-reply` pane.
- **SAM Sprint** behavior preserved by virtue of not editing `services/govcon/sam-*`, `scripts/sam-*`, or the SAM Sprint UI.

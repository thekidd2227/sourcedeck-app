# Release Note — Phase 21D Response Desk Email Import Workflow

**Branch:** `feat/response-desk-email-import-workflow`
**Type:** Feature — Response Desk paste-first → import-first reshape + two navigation renames.
**Base:** `main @ 97a2eea` (post-PR #54 Phase 21B docs; post-PR #55 renderer boot fix).

## Summary

Response Desk now opens with an **Import Email** action at the top of the workflow. A new manual-import detail card surfaces the email's `From`, `Subject`, and `Received` fields, the source of the reply is labeled in the UI (`Source: Manual email import` / `Source: Pasted reply`), and the imported metadata is folded into the analysis context before classification runs. Paste mode is preserved as a fallback. There is still no Send Email button, no auto-send, and no claim of a live inbox integration — the UI explicitly states *"Import Email is local/manual until inbox integration is connected."*

Two vague primary-nav labels are renamed for buyer clarity: **AI Generate → AI Lead Builder** (ties the label to the actual prospect-research-to-CRM workflow) and **System Flow → System Readiness** (ties the label to the readiness/connection surface it actually shows).

## What changed

### Response Desk (`#tab-reply`)

- New import-first header: **📥 Import Email** and **📋 Paste Reply Manually** action buttons + a visible source label.
- New Imported Email detail card (hidden by default; revealed by **Import Email**) with `From`, `Subject`, and `Received` inputs.
- Explicit manual-mode language: *"Import Email is local/manual until inbox integration is connected. Paste mode remains as a fallback."*
- `analyzeReply()` reads the imported metadata and folds it (with the `Source: …` label) into the existing `contextNotes` before calling `window.SDResponseDesk.runResponseDesk(...)`.
- `clearRA()` resets the new fields, hides the import card, and resets the source label.
- 3 new pure UI handlers: `rdOpenImport()`, `rdFocusPaste()`, `rdSetSource()`.

### Navigation

- Nav button **"AI Generate"** → **"AI Lead Builder"** (pane title updated too).
- Nav button **"System Flow"** → **"System Readiness"** with new pane subtitle *"Connections, webhooks, and readiness checks — empty until configured."*

### Tests

- New `test/response-desk-email-import.test.js` — 20-check static-source regression suite covering the import workflow, manual-mode language, no-Send-Email surface, no fake Gmail / message / thread IDs, navigation renames, and a child-process re-run of `test/renderer-boot.test.js`.
- Wired into `npm test` after `test/renderer-boot.test.js`.

## What did NOT change

- **No live Gmail / inbox integration.** No OAuth, no fetch, no IPC. The Import Email path is pure UI; clicking it only reveals the manual fields and sets the source label.
- **No Send Email surface.** No Send Email / Auto-Send / Submit Quote / Dispatch Reply button anywhere in the renderer.
- **No `auto_send: true` path** anywhere.
- **No fake Gmail Connection ID, no fake message IDs, no fake thread IDs** introduced.
- **No SAM Sprint behavior change.** `services/govcon/sam-*`, `scripts/sam-*`, and the SAM Sprint UI not touched. Free=1 NAICS / paid=many entitlement still asserted by `test/sam-opportunity-sprint.test.js` (62/0) and `test/default-state-policy.test.js` #19.
- **No Response Desk service behavior change.** `services/response-desk.js`, `test/response-desk.test.js` not touched. Service module 24/24 tests still pass.
- **No default-state cleanup regression.** PR #52's contamination removals remain in place. `test/default-state-policy.test.js` 22/22.
- **No Phase 20G visual guard regression.** `.btn-gold` cool gold and the 900/899 px responsive boundary intact.
- **No renderer boot regression.** PR #55's syntax-error fix and `_api` collision rename remain in place. `test/renderer-boot.test.js` 7/7.
- **No `main.js`, `preload.js`, `chartnav-integration.js`, `.env`, `reports/**`, watsonx, signing, Vercel, ARCGSystems, ChartNav, sourcedeck-site, or Buffer change.**
- **No pricing change. No compliance claim. No watsonx-live / signed-notarized claim.**

## Files changed

- `sourcedeck.html` — Response Desk pane (import-first header, Imported Email detail card, source label, `analyzeReply()` enrichment, `clearRA()` extension, 3 new pure UI handlers); nav buttons rename; two pane titles updated.
- `test/response-desk-email-import.test.js` (new) — 20-test regression suite.
- `package.json` — appends the new test to `npm test`.
- `docs/audits/phase-21d-response-desk-email-import-audit.md` (new).
- `docs/release-notes/phase-21d-response-desk-email-import.md` (this file).

## Safety / claims

- **No Send Email button.** Asserted by tests #3, #10 of the new suite and by `test/renderer-boot.test.js` #7 (post-PR-55) and `test/response-desk.test.js` #23.
- **No auto-send.** Asserted by test #9 of the new suite (`auto_send: true` regex absent everywhere) and by `test/response-desk.test.js` #13.
- **No live Gmail / inbox integration claim.** Asserted by test #11 (manual-mode language present) and #11b (no "Gmail connected" / "live inbox connected" anywhere).
- **No fake operator IDs reintroduced.** Asserted by tests #7, #8, and the closing "No fake operator IDs reintroduced" check.
- **Human approval required.** Asserted by test #4 and surfaced in the renderer at section 8 of the Response Desk output.
- **No compliance claim added.** No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / "government compliant" wording added.
- **No watsonx-live claim added.**
- **No signed/notarized claim added.**
- **No guaranteed-outcome / unlimited-AI / auto-submit claim added.**

## Tests

| Gate | Result |
|---|---|
| `node test/response-desk-email-import.test.js` | ✅ 20/20 PASS |
| `node test/renderer-boot.test.js` | ✅ 7/7 PASS |
| `node test/response-desk.test.js` | ✅ 24/24 PASS |
| `node test/default-state-policy.test.js` | ✅ 22/22 PASS |
| `node test/sam-opportunity-sprint.test.js` | ✅ 62/0 PASS |
| `npm test` | ✅ PASS (full suite incl. new test at tail) |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 |
| `npm run phase13:rc-check` | ✅ 16/16 |
| `npm run i18n:audit` | ✅ 31/31 |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Stashes

Stashes were not modified. No stash applied or dropped.

## Future inbox-import

The Response Desk wiring is now the right shape for a future live inbox connector (Gmail / Outlook OAuth) without further renderer rewrites: when that connector lands, it will populate the same `ra-from` / `ra-subject` / `ra-received` / reply-body fields, set the source label to a connector-specific label (e.g., `Source: Gmail inbox import`), and reveal the import-detail card automatically. The current UI copy and the deterministic offline classifier do not need to change. That work is intentionally out of scope for Phase 21D and is not claimed here.

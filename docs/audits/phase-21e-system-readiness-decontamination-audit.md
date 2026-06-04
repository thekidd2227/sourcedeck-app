# Phase 21E — System Readiness Decontamination Audit

**Branch:** `fix/system-readiness-flow-contamination`
**Base:** `main` @ `4212b29` (PR #56 Response Desk Email Import)
**Date:** 2026-06-04
**Severity:** BLOCKER for buyer-demo recording (Phase 21C failure).

## 1. Why Phase 21C failed

Phase 21C real-navigation QA passed 8 of 9 demo screens. The single failure was
the **System Readiness** tab (formerly "System Flow"). Once PR #55 restored the
renderer, `renderFlow()` actually executed and populated the "9-Stage Revenue
Pipeline" / `#flow-steps` card with internal operator labels that were visible
to anyone navigating to the tab:

- `PROD-02`, `PROD-03`, `PROD-04`, `PROD-05` (internal automation scenario IDs)
- `4595758` (the real Instantly campaign ID)
- plus internal integration codenames (Notion/M3/Instantly/GPT-4o, "your
  assessment URL", "your sender inbox", Airtable/Gmail specifics).

PR #56 *renamed* the tab to "System Readiness" but did not remove the
contaminating flow-step data — so the blocker persisted.

## 2. What was removed

All `PROD-02..05` and `4595758` references plus the internal automation
codenames they rode with. The complete set in `sourcedeck.html`:

| Location | Surface | Before |
|---|---|---|
| `renderFlow()` step 3 | flow-steps card | `PROD-02 15min → M3 writeback → Synced to Notion …` |
| `renderFlow()` step 4 | flow-steps card | `PROD-03 4595758 15min → Campaign insert …` |
| `renderFlow()` step 6 | flow-steps card | `PROD-04 15min → GPT-4o → Airtable AI fields + Gmail alert` |
| `renderFlow()` step 7 | flow-steps card | `PROD-05 webhook → pre-call brief → booking link emailed …` |
| `renderFlow()` steps 1,2,5,8,9 | flow-steps card | operator/integration specifics (assessment URL, sender inbox, Airtable/Notion/Google Meet) |
| Booking panel header (`#bk-ov`) | overlay | `POST → PROD-05 webhook` |
| Command Center inbox row | work-item warning | `Synced-to-Notion leads awaiting PROD-03` |
| Lead-corroboration code comment | non-rendered comment | `… so PROD-03 will pick it up` |

## 3. Safe copy that replaced it

The 9-stage structure is retained with neutral, product-safe descriptions:

| # | Title | New description |
|---|---|---|
| 1 | Assessment Form | New intake is received and queued for review. |
| 2 | Qualification | Records are reviewed and qualified before any outreach. |
| 3 | **CRM Sync** | Qualified records can sync to your connected workspace when configured. |
| 4 | **Outreach Queue** | Approved prospects can be prepared for outreach review when configured. |
| 5 | Outreach Delivered | Approved outreach is delivered on your configured schedule. |
| 6 | **Reply Review** | Imported replies are classified and turned into draft-only next actions. |
| 7 | **Booking Review** | Qualified booking signals can create follow-up tasks when configured. |
| 8 | Discovery Call | A scheduled discovery call routes to a proposal or nurture path. |
| 9 | Close | Won deals move to invoicing and onboarding. |

- Booking panel sub-text → "Booking review — no email sent automatically".
- Command Center warning → "Synced leads awaiting outreach".
- Code comment → "… for the downstream outreach step to pick up".

The three lower System Readiness cards keep their existing empty states:
**No webhooks active**, **No integrations configured**, **No HTTP standards
published**.

## 4. No runtime integration behavior changed

Only display labels/descriptions in `renderFlow()`'s static `steps` array, one
overlay sub-title, one work-item label string, and one code comment were
edited. No integration code, request, status filter, webhook, or credential
path was touched. `AT_BASE`/Airtable adapter logic is unchanged (the all-`X`
`appXXXXXXXXXXXXXXX` placeholder constant is a non-rendered config default and
is out of scope — it is not a flow-step description).

## 5. Preservation / safety

- **Response Desk import workflow preserved** — `test/response-desk-email-import.test.js`
  20/20; "Import Email" + "never auto-sends, never auto-submits" intact; no
  Send Email button.
- **Response Desk no-send preserved** — `test/response-desk.test.js` 24/24.
- **SAM Sprint preserved** — `test/sam-opportunity-sprint.test.js` 62/62;
  "Free users: 1 NAICS" intact; no auto-send.
- **Renderer boot preserved** — `test/renderer-boot.test.js` 7/7; live Electron:
  0 boot-time SyntaxErrors; System Readiness reached via real nav click.
- **Phase 20G guard preserved** — `.btn-gold` cool-gold lock + 900/899
  breakpoints untouched.
- **Default-state cleanup preserved** — `test/default-state-policy.test.js` 22/22.
- No secrets exposed; no screenshots/videos committed.

## 6. Regression test added

`test/system-readiness-flow-steps.test.js` (wired into `npm test`) — 10 checks:
no `PROD-02..05`/`4595758` in the file; no webhook tokens / fake Gmail ID
file-wide; renderFlow descriptions free of scenario IDs / campaign ID /
`appXXXXXXXX` / codenames; System Readiness pane markup clean; safe copy
preserved; renderer still parses; Response Desk import + no-Send-Email; SAM
Free=1 NAICS; Phase 20G guard.

## 7. Live verification

Electron (`--remote-debugging-port=9227`), real nav click to System Readiness:
- `BOOT_SYNTAX_ERRORS = 0`
- flow-steps render the neutral copy above — `PROD-02/03/04/05` and `4595758`
  all **absent** from the pane.
- Lower cards still show **No webhooks active / No integrations configured / No
  HTTP standards published**.

# Phase 22B — GovCon-First Operating Rhythm UI

**Date:** 2026-06-08
**Branch:** `feat/phase-22b-govcon-operating-rhythm`
**Base:** `main` (post-PR #82 — pricing source-of-truth merged).

## Purpose

Phase 22A and 22A-P closed two strategic blockers: the product-market-fit audit and the pricing source-of-truth. Phase 22B begins to deliver on that work by assembling existing backend/service capability into a stronger buyer-facing **operating-rhythm** layer inside the GovCon tab pane. The goal is to make SourceDeck feel like a real capture operating system on cold open — a buyer scrolling the GovCon pane should see "what to do today, what is due soon, what's coming next, and which agencies are worth pursuing" before they touch any other surface.

## What was added

A single new section `id="gc-operating-rhythm"` inside the GovCon tab pane (`#tab-govcon`), sandwiched between the existing Phase 22B Capture Command Center (`#gc-capture-cc`) and the Phase 22C Solicitation Workspace (`#gc-sol-workspace`). The section contains four sibling panels:

| Panel | Anchor | What it shows |
|---|---|---|
| **Daily Capture Rhythm** | `#gc-daily-rhythm` | Today's capture priorities — pursuits awaiting qualification, solicitations needing extraction/review, vendor quote follow-ups, submission readiness risks, internal review packages waiting. Five SAMPLE-labeled rows ship for buyer demo. |
| **Deadline & Q&A Calendar** | `#gc-deadline-calendar` | Proposal due dates, Q&A submission deadlines, amendment-watch items, site-visit dates, and clarification windows with countdown labels. Five SAMPLE-labeled rows ship for buyer demo. |
| **Pre-RFP Intelligence** | `#gc-prerfp-intel` | Sources Sought signals, agency forecast / acquisition-plan signals, recompete watchlist items, Industry Day notices. Four SAMPLE-labeled rows ship for buyer demo. |
| **Agency Targeting Insights** | `#gc-agency-targeting` | Target agencies with NAICS / PSC fit, buying-office notes, past patterns, and a next-action recommendation. Four SAMPLE-labeled rows ship for buyer demo. |

Every panel:

- Carries a `data-section="govcon-*"` attribute consistent with existing GovCon surfaces.
- Ships at least one `data-or-source="sample"` row with a visible `SAMPLE` chip so a buyer never sees unattributed demo content.
- Uses the existing typography vocabulary (Cormorant Garamond italic title, IBM Plex Mono uppercase subhead, parchment-neutral border).
- Carries explicit no-send / no-submit / no-upload / human-approval-required microcopy.

## Why this improves the GovCon buyer story

Before Phase 22B, the GovCon tab opened with the Capture Command Center's 8 stat cards (a counter view) followed by the Solicitation Workspace (a single-pursuit triage view). Buyers commented that the surface answered *"what's running?"* but not *"what should I do today?"*. The four new panels close that gap:

- **Daily Capture Rhythm** answers *"what should I do today?"*.
- **Deadline & Q&A Calendar** answers *"what's due soon?"*.
- **Pre-RFP Intelligence** answers *"what's coming next?"*.
- **Agency Targeting Insights** answers *"which agencies are worth pursuing?"*.

The four answers stack into the daily rhythm a capture manager actually runs. The Phase 22A audit recommended this exact assembly (see `docs/product/phase-22a-govcon-feature-opportunity-map.md` items **F05** — Deadline & Q&A Calendar, **F06** — Pre-RFP Intel Card, **F18** — Agency Targeting Insights, **F25** — Weekly Pursuit Rhythm).

## Which existing services / capabilities are surfaced

This is a **UI assembly** phase — no new backend service was created. The panels are populated with sample/demo-safe rows in the renderer and are designed to be wired to existing services in a follow-up phase:

| Panel | Existing service that can populate it |
|---|---|
| Daily Capture Rhythm | `services/govcon/capture-os.js`, `services/govcon/workflow-automation.js`, `services/govcon/opportunity-records.js`, `services/govcon/govcon-pursuit-profile.js`, `services/govcon/govcon-pursuit-profile-store.js` |
| Deadline & Q&A Calendar | `services/govcon/deadline-extraction.js`, `services/govcon/clarification-strategy.js`, `services/govcon/scheduled-sam-search.js` |
| Pre-RFP Intelligence | `services/govcon/pre-rfp.js`, `services/govcon/incumbent-research.js`, `services/govcon/fed-agent.js` |
| Agency Targeting Insights | `services/govcon/targeting-profile.js`, `services/govcon/fed-agent.js`, `services/govcon/naics-expansion.js` |

None of those services is invoked from the new panels in this phase. The UI is the contract surface; the service wire-up happens later without further renderer rewrites.

## No-send / no-submit / no-upload boundaries

The parent section explicitly declares:

> Local-only operating view. SourceDeck does not submit bids, quotes, or government responses; does not auto-send outreach. No portal upload. No SAM.gov / PIEE / eBuy / GSA interaction from this surface. Every action is advisory and requires human approval.

Each panel's per-row microcopy reinforces the same posture (drafts only, human approval required, operator submits via the agency's stated channel). The new section adds **no** Send Email control, **no** Submit Bid control, **no** Submit Quote control, **no** "Export and submit" wording, and **no** portal-upload claim.

The existing safety invariants are preserved:

- Renderer-boot test (`test/renderer-boot.test.js`) 7/7.
- Response Desk no-send (`test/response-desk.test.js` 24/24, `test/response-desk-email-import.test.js` 20/20).
- SAM Sprint no-auto-send (`test/sam-opportunity-sprint.test.js` 62/0).
- System Readiness / System Flow removal (`test/remove-system-readiness-tab.test.js` 9/9).
- Default-state policy (`test/default-state-policy.test.js` 22/22).
- Phase 22F Submission Readiness Gate (`test/govcon-submission-readiness.test.js` 30/30).

## Pricing source-of-truth citation

This phase introduces **no buyer-facing pricing copy** in the new section. The panel rows describe operating activity (qualify, review, draft, watch, target) — never plan / price / tier. If a future iteration adds tier-gated rows (e.g., "Multi-client switching available in Operator Plus"), that copy must cite and follow `docs/product/pricing-source-of-truth.md`:

- Solo Capture — $149/mo
- GovCon Operator — $499/mo or $4,990/yr
- Operator Plus — $997/mo or $9,970/yr
- Enterprise — custom
- Implementation services — Self-Install $1,497 / Guided $3,497 / DFY $5,997

The deprecated V2 amounts ($79 / $349 / $999) are not used anywhere in the new section. The new operating-rhythm test (`test/govcon-operating-rhythm.test.js`) regression-guards against accidental V2 pricing leakage.

## Tests run

| Gate | Result |
|---|---|
| `node test/govcon-operating-rhythm.test.js` (new) | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-polish.test.js` | ✅ PASS 27/27 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `node test/govcon-pricing-positioning.test.js` | ✅ PASS |
| `npm test` (full chain) | ⚠️ See "Known pre-existing issue" below |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn (manual-only items unchanged) |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Known pre-existing issue (not caused by this PR)

`test/govcon-opportunity-outreach.test.js` reports `27/28 passed, 1 failed` — one assertion mismatch on the "active-solicitation needs review" case ("Drafted" returned instead of "Needs Review"). The same failure was already documented in PR #82's body as **pre-existing on `main`** before Phase 22A-P merged, and the failure reproduces on a clean `main` checkout with this branch's docs stashed. It is **not** caused by Phase 22B. Triage of the active-solicitation case is out of scope for this UI-assembly phase.

## Safety scan

Forbidden-claim grep across changed files plus the rest of the runtime/test/docs/package.json:

- `Free demo` / `Download now` / `Try now` / `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` / `package submitted` / `bid submitted` / `quote submitted` / `SourceDeck submits` / `files into SAM.gov` — only present in negative-assertion contexts (forbidden-pattern lists in tests, "no Send Email surface" comments).
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — none added.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — none reintroduced.
- `$79` / `$349` / `$999` — only appear in historical/deprecated audit docs and pricing-source-of-truth deprecation table; not visible in the new operating-rhythm region (regression-guarded by `test/govcon-operating-rhythm.test.js`).

## Files changed

| File | Lines added | Purpose |
|---|---|---|
| `sourcedeck.html` | ~125 | New `#gc-operating-rhythm` section with four child panels. |
| `test/govcon-operating-rhythm.test.js` | ~230 | New Phase 22B regression test (23 checks). |
| `package.json` | 1 | Adds `&& node test/govcon-operating-rhythm.test.js` to the end of the `test` chain. |
| `docs/product/phase-22b-govcon-operating-rhythm.md` | this file | Product narrative for Phase 22B. |
| `docs/release-notes/phase-22b-govcon-operating-rhythm.md` | ~150 | Release note. |

## Out of scope

- New backend services (none added; the four panels surface existing service shapes).
- Wiring the panels to live opportunity / deadline / pre-RFP / agency data (later phase).
- Pricing copy in the panels (none added; would follow `pricing-source-of-truth.md`).
- Website-repo edits (none).
- Stripe / payment / checkout (none).
- Live SAM call (none).
- Outreach / email send (none).
- Bid / quote / proposal submission (none).
- Portal upload to SAM.gov / PIEE / eBuy / GSA / agency portals (none).
- System Readiness / System Flow restoration (none).
- Compliance certification claims (none added — FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed and notarized / Apple notarized / production signed).

## Confirmations

- **No `.env` touched. No API key printed. No secret exposed.**
- **No stashes touched.**
- **No website-repo files edited.**
- **No payment / Stripe / checkout change.**
- **No live SAM Sprint run.**
- **No outreach drafted, sent, or queued.**
- **No bid / quote / proposal submission.**
- **No portal upload.**
- **No deploy.**
- **No videos or screenshots committed.**
- **No `.qa/` output committed.**

## Next phase recommendation

Phase 22C-onward focus on **wiring** the four operating-rhythm panels to existing services as live state warrants — e.g., feeding `Daily Capture Rhythm` from `capture-os.js` + the opportunity-records store, populating `Deadline & Q&A Calendar` from `deadline-extraction.js`, and pulling `Agency Targeting Insights` from `targeting-profile.js` + `fed-agent.js`. The renderer surface is now the right shape; service wire-up is a contained service-by-service change with the existing pattern of "draft, advisory, human-approved" preserved.

# Release Note — Phase 22B GovCon-First Operating Rhythm UI

**Branch:** `feat/phase-22b-govcon-operating-rhythm`
**Type:** UI assembly — surfaces existing GovCon service capability as a buyer-facing daily operating rhythm.
**Base:** `main` (post-PR #82 — pricing source-of-truth merged).

## Summary

Phase 22B adds a new **GovCon Operating Rhythm** section inside the GovCon tab pane that assembles four buyer-facing panels — Daily Capture Rhythm, Deadline & Q&A Calendar, Pre-RFP Intelligence, and Agency Targeting Insights — without changing any backend service, runtime safety boundary, pricing, or payment processing. The panels close the "what should I do today?" gap that the Phase 22A audit identified and use sample/demo-safe rows (explicitly labeled SAMPLE) until live service wire-up lands in a follow-up phase.

## What changed

### Runtime

- **`sourcedeck.html`** — single insert: a new `<section id="gc-operating-rhythm">` placed between the Phase 22B Capture Command Center (`#gc-capture-cc`) and the Phase 22C Solicitation Workspace (`#gc-sol-workspace`). The section contains four child panels:
  - `#gc-daily-rhythm` — Daily Capture Rhythm (5 SAMPLE rows)
  - `#gc-deadline-calendar` — Deadline & Q&A Calendar (5 SAMPLE rows)
  - `#gc-prerfp-intel` — Pre-RFP Intelligence (4 SAMPLE rows)
  - `#gc-agency-targeting` — Agency Targeting Insights (4 SAMPLE rows)
- No backend service edited. No `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js` change.

### Tests

- **`test/govcon-operating-rhythm.test.js` (new)** — 23-check regression suite: parent + four-panel anchors, SAMPLE labeling, no-send/no-submit/no-upload guard copy, no Send Email / Submit Bid / Submit Quote / "Export and submit" / portal-upload positive claim, sysflow remains removed, no deprecated V2 pricing in the panel, renderer-boot still passes, positional regression guard (panel sandwiched between Capture CC and Solicitation Workspace), and Phase 22B–22F surfaces remain intact.

### `package.json`

- Adds `&& node test/govcon-operating-rhythm.test.js` to the end of the existing `test` chain. No other change.

### Docs

- **`docs/product/phase-22b-govcon-operating-rhythm.md` (new)** — product narrative.
- **`docs/release-notes/phase-22b-govcon-operating-rhythm.md` (this file)**.

## What did NOT change

- **No backend service added.** No `services/**` change. The four panels surface existing service shapes (`capture-os`, `deadline-extraction`, `pre-rfp`, `incumbent-research`, `fed-agent`, `targeting-profile`, `naics-expansion`, `clarification-strategy`, `scheduled-sam-search`) without invoking them.
- **No Send Email button. No Submit Bid button. No Submit Quote button. No "Export and submit" wording. No portal-upload claim. No `auto_send: true`. No `auto_submit: true`.**
- **No live Gmail / live-inbox claim.** Response Desk import remains local/manual.
- **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- **No live SAM Sprint run.** No outreach drafted, sent, or queued. No bid / quote / proposal submission.
- **No compliance-certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / CUI). No "Apple notarized" / "signed and notarized" / "production signed" wording.
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No pricing change. No `docs/pricing/` edited. No website-repo edit. No `assets/sd-config.js` touch. No Stripe Product / Price ID change.**
- **No System Readiness / System Flow / `sysflow` resurrection** (Phase 21F removal preserved).
- **No PO-language reintroduced.**
- **No `.env`, no API key printed, no secret exposed.**
- **No stash touched. No videos / screenshots committed. No `.qa/` output committed.**

## Tests / gates

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
| `npm test` (full chain) | ⚠️ Pre-existing `opportunity-outreach` 27/28 (see below) |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn (manual-only items unchanged) |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Known pre-existing issue

`test/govcon-opportunity-outreach.test.js` still reports **27/28 passed, 1 failed** — the same "active-solicitation needs review" assertion mismatch documented in PR #82's body. Verified the failure reproduces on a clean `main` checkout with this branch stashed; it is **pre-existing on `main`** and unrelated to Phase 22B. Out of scope for this UI-assembly phase.

## Pricing source-of-truth compliance

This phase introduces **no buyer-facing pricing copy** in the new section. The new section, the new test, and both new docs cite and follow `docs/product/pricing-source-of-truth.md`:

- V3 pricing canonical: Solo Capture $149/mo, GovCon Operator $499/mo or $4,990/yr, Operator Plus $997/mo or $9,970/yr, Enterprise custom, Self-Install $1,497, Guided $3,497, DFY $5,997.
- Deprecated V2 amounts ($79 / $349 / $999) explicitly excluded from the active operating-rhythm region (regression-guarded by the new test).

## Safety / claims

- ❌ **No Send Email button.** Untouched.
- ❌ **No Submit Bid button. No Submit Quote button. No "Export and submit" wording. No portal-upload claim.**
- ❌ **No `auto_send: true`. No `auto_submit: true`.**
- ❌ **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- ❌ **No live Gmail / live-inbox claim.**
- ❌ **No compliance certification claim.**
- ❌ **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- ❌ **No pricing change.** No website-repo edit.
- ❌ **No System Readiness / `sysflow` resurrection.**
- ✅ Every new panel ships SAMPLE-labeled rows. Buyer demo never displays unattributed sample content.
- ✅ Every panel carries explicit "drafts only, human approval required, operator submits via the agency's stated channel" microcopy.

## Stashes

Untouched.

## Next phase

Phase 22C-onward begins the **service-wire-up** of the four panels — feeding live state from `capture-os.js`, `deadline-extraction.js`, `pre-rfp.js`, `incumbent-research.js`, `fed-agent.js`, `targeting-profile.js`, `naics-expansion.js`, `clarification-strategy.js`, and `scheduled-sam-search.js` — preserving the existing "draft, advisory, human-approved" posture throughout. The renderer surface is now stable; the service wiring is a contained per-service change.

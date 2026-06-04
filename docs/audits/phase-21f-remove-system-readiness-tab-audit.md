# Phase 21F — Remove System Readiness Tab Audit

**Branch:** `fix/remove-system-readiness-tab`
**Base:** `main` @ `f0e7a2c` (PR #57 System Readiness decontamination)
**Date:** 2026-06-04
**Priority:** HIGH (before buyer-demo recording).

## 1. Why removed (not just cleaned)

The "System Readiness" tab (internally `sysflow`, formerly "System Flow") is an
admin/readiness screen: a "9-Stage Revenue Pipeline" diagram and backend
Webhooks / Infrastructure / HTTP Standards cards. Even after Phase 21E
decontaminated the pipeline copy, the screen has **no buyer-facing purpose** —
it shows internal plumbing rather than product outcomes and distracts from the
demo story. Removing it is better than cleaning it: there is no buyer value to
preserve, and removal eliminates the whole class of future contamination on
that surface.

## 2. Exact UI removed (`sourcedeck.html`)

- **Left-nav button** `data-tab="sysflow"` (label "System Readiness").
- **Tab pane** `id="tab-sysflow"` in full — the "9-Stage Revenue Pipeline"
  card (`#flow-steps`) and the Active Webhooks / Infrastructure / HTTP Standards
  cards.
- **`openTab` dispatch** line `if(t==='sysflow' …)renderFlow();`.
- **`renderFlow()` function** (the pipeline-steps renderer) — removed; replaced
  by a short comment noting the removal.
- **Stale i18n entry** `'System Flow': 'Flujo del sistema'` (the label no longer
  exists; SD_ES still has 190 entries, well above the audit's 150 threshold).
- **Defensive guard added:** the persisted-tab loader now falls back to
  `dashboard` if the stored `lcc_active_tab` points to a pane that no longer
  exists (so a returning user who last viewed `sysflow` lands on Dashboard).

Default active tab remains `dashboard`. Nav order is otherwise unchanged.

## 3. Demo path now focuses on buyer outcomes

`docs/demo/phase-21b-controlled-demo-dry-run.md` and
`docs/demo/phase-21b-recording-shot-list.md` updated:

- Removed the Sysflow pre-record checklist item.
- 5-minute flow `0:30–1:30` now tours **Dashboard → Activity Feed** (two
  empty-state screens) instead of including Sysflow.
- Removed shot-list **Shot 12** (Sysflow) and renumbered the remaining shots
  (old 13/14/15 → 12/13/14); the dry-run shot-summary updated to match.

The buyer demo now centers on outcomes: find leads, generate/queue outreach,
classify replies, draft safe responses, evaluate GovCon opportunities.

Real-navigation QA expectation is now **8 screens** (Dashboard, Lead Generator,
Ad Engine, Daily Operating Rhythm, Activity Feed, Settings, Response Desk,
GovCon / SAM Sprint) — System Readiness is no longer present.

## 4. Tests

- Added `test/remove-system-readiness-tab.test.js` (wired into `npm test`): no
  `sysflow` nav button, no `tab-sysflow` pane, no buyer-facing System Readiness
  copy, renderer still parses, protected features intact, no contamination.
- Removed `test/system-readiness-flow-steps.test.js` (Phase 21E): it asserted
  the decontaminated System Readiness pane still existed — directly
  contradicted by this removal. Its contamination guarantees (no
  PROD-02..05/4595758/tokens) are fully covered by the new test.
- Updated one stray assertion (#13) in `test/response-desk-email-import.test.js`
  that checked the old "System Flow → System Readiness" nav rename; it now
  asserts the tab is removed. **No Response Desk behavior or other assertion
  changed.**

## 5. Preservation / safety

- **Renderer boot preserved** — `renderer-boot` 7/7; all inline scripts parse;
  `openTab` no longer dispatches to a missing pane.
- **Response Desk preserved** — Import Email + "never auto-sends, never
  auto-submits" + human-approval intact; no Send Email button; 20/20 + 24/24.
- **SAM Sprint preserved** — "Free users: 1 NAICS" intact; no auto-send; 62/62.
- **Ad Engine / AI Lead Builder preserved** — pane title "Ad Engine"; nav
  "AI Lead Builder" intact.
- **Phase 20G guard preserved** — `.btn-gold` cool-gold lock + 900/899
  breakpoints untouched.
- **No runtime integrations changed** — only UI markup, one `openTab` dispatch
  line, the `renderFlow` view function, an unused i18n label, and docs/tests.
  No credential, webhook, request, or status-filter logic touched.
- No secrets exposed; no screenshots/videos committed; no `.env` changes.

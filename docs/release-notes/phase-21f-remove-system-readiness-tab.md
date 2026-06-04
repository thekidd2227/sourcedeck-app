# Release Note — Phase 21F: Remove System Readiness Tab

**Type:** UI change (buyer-demo readiness)
**Branch:** `fix/remove-system-readiness-tab`
**Date:** 2026-06-04

## What changed

The internal **System Readiness** tab (internally `sysflow`, formerly "System
Flow") was removed from the primary SourceDeck UI. It was an admin/readiness
screen — a "9-Stage Revenue Pipeline" diagram and backend Webhooks /
Infrastructure / HTTP Standards cards — with no buyer-facing purpose. Removing
it (rather than continuing to clean it) keeps the demo focused on product
outcomes and eliminates the surface entirely.

Removed from `sourcedeck.html`: the left-nav button, the `tab-sysflow` pane, the
`openTab` dispatch, the `renderFlow()` view function, and a stale i18n label. A
defensive fallback now sends a returning user to the Dashboard if their saved
tab no longer exists.

## Demo docs

Phase 21B dry-run and recording shot list updated: the Sysflow checklist item,
the 5-minute Sysflow stop, and shot-list Shot 12 (Sysflow) were removed and the
remaining shots renumbered. The demo path now covers Dashboard, Lead Generator,
Ad Engine / AI Lead Builder, Daily Operating Rhythm, Activity Feed, Response
Desk, GovCon / SAM Sprint, and Settings — **8 buyer-facing screens**, no
internal readiness/admin screen.

## Tests

- Added `test/remove-system-readiness-tab.test.js` (in `npm test`) so the tab
  cannot return.
- Removed the obsolete `test/system-readiness-flow-steps.test.js` (it guarded
  the now-deleted pane); its contamination guarantees are covered by the new
  test.
- Updated one nav-label assertion in `test/response-desk-email-import.test.js`
  to reflect the removal (test-only; no Response Desk behavior changed).

## Preserved / safety

- Renderer boot preserved (7/7; all inline scripts parse).
- Response Desk preserved — no Send Email, no auto-send, draft-only / human
  approval, Import Email intact.
- SAM Sprint preserved — Free = 1 NAICS, no auto-send.
- Ad Engine / AI Lead Builder labels intact.
- Phase 20G `.btn-gold` and 900/899 guards preserved.
- No runtime integrations changed; no secrets exposed; no `.env`, pricing,
  payment, watsonx, signing, provider, or Vercel changes; no screenshots/videos
  committed.

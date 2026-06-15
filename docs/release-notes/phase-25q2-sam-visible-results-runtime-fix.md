# Phase 25Q-2 — SAM Visible Results Runtime Fix · Release Note

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## What ships

- **Visible SAM.gov results.** Clicking Search SAM.gov now renders the returned rows into `#gc-tab-find-results` and they stay there — across the microtask drain that previously wiped them, across Save / Mark Pursue clicks, and across tab activations.
- **`refreshSavedPursuitsPreview` is a no-op.** Saved opportunities live exclusively on the Saved Pursuits tab (`renderSavedPursuits` → `#gc-tab-saved-list`). The Find Opportunities tab is owned solely by `renderSamFreshResults`.
- **Result-count selector still controls visible row count.** 25 / 50 / 75 / 100 each render exactly the requested count (verified end-to-end in the regression test for every selector value).
- **Per-row status pill updates correctly.** Save → row 0 pill flips to `saved` and the table stays in DOM. Same for Mark Pursue → `pursuing`.

## Root cause

The Phase 25Q sandbox unit test inspected `#gc-tab-find-results` synchronously after `renderSamFreshResults` returned — before the async `await _listSaved()` chain inside `refreshSavedPursuitsPreview` resolved and wiped the innerHTML. Live UX waited for the drain and got an empty table.

## Tests

- `test/phase-25q2-sam-visible-results-runtime.test.js` — vm-sandboxed end-to-end with microtask drain. Mocks `sd.govcon.opportunities.list` to resolve **asynchronously** (mirrors the live IPC), then drains 8 microtasks before asserting visible row counts at every selector value (25 / 50 / 75 / 100), action buttons on every row, Save-flow stability, and status-pill updates.
- All existing Phase 25Q tests still pass.

## Safety

- No `.env` touched · No secrets printed · No stashes touched
- No deploy · No public release · No GitHub release
- No auto-search on load · raw key never in DOM/logs
- No email send · no auto-contact · no bid/quote/proposal submission · no portal upload
- Phase 25A no-send / no-submit / no-upload boundary intact

**Full gate results:**
- `npm test` → 75 PASS suites, 0 FAIL
- `npm run govcon:smoke` → 47 PASS, 0 FAIL
- `npm run troubleshooting:scan` → no fail/warn findings
- `node scripts/release-check.js` → privacy gate passes

## Next

**Merge when green, rebuild app package, refresh Day 0 package, then manually retest SAM search visible rows at 25 / 50 / 75 / 100.**

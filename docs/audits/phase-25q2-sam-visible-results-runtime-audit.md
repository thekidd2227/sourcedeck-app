# Phase 25Q-2 · SAM Visible Results Runtime Audit

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Confirmed bug

User screenshot: SAM.gov key saved. Result count = 50. Click Search SAM.gov. Status line: *"Showing up to 50 results · returned 50 · last run …"*. Toast: *"Returned 50 opportunities. Review results below, then save or mark pursue."* But the visible table shows zero rows and the empty state *"No saved or pursuing opportunities yet."* is still rendered.

## 2. Root cause

`refreshSavedPursuitsPreview()` shared the same `#gc-tab-find-results` and `#gc-tab-find-empty` elements as Phase 25Q's `renderSamFreshResults()`. After `gcTabSearchSam` painted N rows, it called `refreshSavedPursuitsPreview()` which `await`ed `sd.govcon.opportunities.list()`. On a fresh canvas that resolves to `[]` and the preview function then:

```js
if (emptyEl) emptyEl.style.display = '';   // re-show empty state
listEl.style.display = 'none';              // hide results
listEl.innerHTML = '';                      // ⚠ wipe my fresh rows
```

Because `_listSaved` resolves AFTER the synchronous render, the wipe lands on the next microtask — after `renderSamFreshResults` has already written innerHTML. The Phase 25Q sandbox test inspected state before the microtask drained, so it passed. Live UX waited for the drain and got an empty table.

The same wipe ran:
- After every search (`gcTabSearchSam` → `refreshSavedPursuitsPreview`)
- After every Save / Mark Pursue (`gcTabSamSave` / `gcTabSamMarkPursue` → `refreshSavedPursuitsPreview`)
- On every tab activation (`gcTabSwitch('find-opportunities')` → `refreshSavedPursuitsPreview`)

## 3. Fix

`refreshSavedPursuitsPreview()` is now a no-op:

```js
async function refreshSavedPursuitsPreview(){
  return;
}
```

Saved opportunities live exclusively on the Saved Pursuits tab (`#gc-tab-saved-list`), rendered by `renderSavedPursuits()`. The Find Opportunities tab is now solely owned by `renderSamFreshResults()`, which targets `#gc-tab-find-results` / `#gc-tab-find-empty`.

Per-row status pills still update after Save / Mark Pursue / Archive because `_samUpsert` already calls `renderSamFreshResults(_samFreshResults)` after the upsert.

## 4. Regression test

`test/phase-25q2-sam-visible-results-runtime.test.js`:

- Mocks `sd.govcon.opportunities.list` to resolve **asynchronously** (via `Promise.resolve().then(…)`), reproducing the exact microtask ordering that masked the bug in production.
- Calls `gcTabSearchSam` and drains **8 microtasks** before asserting.
- Asserts **exactly N rows render in DOM** for each selector value (25 / 50 / 75 / 100).
- Asserts `#gc-tab-find-results` stays visible and `#gc-tab-find-empty` stays hidden across the drain.
- Asserts every row carries the required action buttons (View Details · Save · Mark Pursue · Archive · Open SAM.gov Source).
- Asserts the Save flow keeps all rows in DOM and updates the row 0 status pill to `saved`.

Verified the test catches the pre-fix bug: reverting `refreshSavedPursuitsPreview` to its pre-25Q-2 body produces:
- `✗ refreshSavedPursuitsPreview no longer wipes #gc-tab-find-results innerHTML`
- `✗ refreshSavedPursuitsPreview no longer re-shows the empty state`
- `✗ After 50-row search + microtask drain, #gc-tab-find-results is visible`

## 5. Safety

- No `.env` touched · no secrets printed · no stashes touched (one temporary stash for revert-verification, immediately popped — `git stash list` is empty)
- No deploy · no public release · no GitHub release
- No auto-search on load
- No raw key in DOM / logs / docs / exports
- No portal upload · no email send · no auto-contact
- Phase 25A no-send / no-submit / no-upload boundary intact

## 6. Tests + gates

- `npm test` → 75 PASS suites, 0 FAIL
- `npm run govcon:smoke` → 47 PASS, 0 FAIL
- `npm run troubleshooting:scan` → no fail/warn findings
- `node scripts/release-check.js` → privacy gate passes

## 7. Operator handoff

```bash
cd ~/sourcedeck-app && \
  git checkout main && \
  git pull origin main && \
  rm -rf dist && \
  npm run pack:mac && \
  bash ~/sd-day0-refresh.sh
```

Then verify SAM search at 25 / 50 / 75 / 100 manually.

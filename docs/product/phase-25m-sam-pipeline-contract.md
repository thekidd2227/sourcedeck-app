# Phase 25M — SAM.gov Pipeline Contract

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Make SAM.gov opportunity discovery a first-class in-app workflow. The buyer-reported regression: the SAM.gov API key was saved through the credential boundary, but the Setup wizard kept saying *"SAM.gov key missing"* and there was no way to search SAM.gov without leaving SourceDeck. Phase 25M fixes the saved/missing mismatch and ships a new GovCon Pipeline section that runs the search through the existing `sd.govcon.samSearch` IPC and renders the results inside SourceDeck.

## 2. Key status surface — saved/missing mismatch repair

`_gcWizSaveKey()` (the shared save path for SAM / AI / creative keys) now:

1. Awaits `sd.credentials.set(service, val)`.
2. On success, **optimistically** paints the saved status into every visible surface via `_gcWizSetStatusSaved(service)`:
   - Setup wizard pill `#gcwiz-sam-status` flips to *"SAM.gov key saved"* (class `gcwiz-status saved`).
   - Settings status label `#out-samkey-status` flips to *"SAM.gov key: configured ✓"*.
3. Runs `statusFn()` once to reconcile with `sd.credentials.status()`.
4. Schedules a 250ms verification retry — handles the rare case where the credential adapter snapshot lags the write.

The raw key value is **never** written back to the DOM. The save path clears `input.value = ''` whether the persistence succeeds or fails.

## 3. GovCon Pipeline section (`#gc-sam-pipeline`)

New section at the top of the GovCon pane, surfaced via a Pipeline pill in `#gc-section-nav`. Layout:

```
┌─────────────────────────────────────────────────┐
│ GovCon Pipeline                  [SAM.gov key]  │
│ Search SAM.gov · Save · Pursue                  │
├─────────────────────────────────────────────────┤
│ (banner: key missing if not configured)         │
├─────────────────────────────────────────────────┤
│ [Keyword] [NAICS] [Set-aside] [PoP] [Due] [...] │
│ [🔎 Search SAM.gov] [↻ Refresh] [⊘ Clear]       │
├─────────────────────────────────────────────────┤
│ Results table (renders inside SourceDeck)       │
└─────────────────────────────────────────────────┘
```

### 3.1 Filters

`keyword`, `naics`, `setAside`, `placeOfPerformance`, `dueWithinDays` (default 30), `status` (active / archived / awarded).

### 3.2 Behavior

- **No auto-search on page load.** The boot hook only calls `refreshSamKeyStatus()` so the pill / banner / Search button reflect whether a key is configured.
- **User-triggered only.** `gcSamSearchRun()` is the entry point; the Search and Refresh buttons are the only triggers. The button is disabled when the key is missing.
- **Through the secure credential boundary.** Search invokes `sd.govcon.samSearch(filters)` — the IPC bridge that already holds the SAM key main-process-side. The renderer never sees the raw key.
- **Results render inside the same screen.** Phase 25M never opens a new browser tab/window for the search itself. "Open SAM.gov Source" on a result row uses `window.open(url, '_blank', 'noopener,noreferrer')` to view the original notice in the user's default browser, but that is opt-in per row.

### 3.3 Per-row actions

| Button                  | `data-gc-sam-action`    | Behavior                                                                                                            |
|-------------------------|-------------------------|---------------------------------------------------------------------------------------------------------------------|
| 👁 View Details         | `view-details`          | Shows title + sol # via toast (lightweight; full detail panel is out of scope for 25M).                              |
| + Save to SourceDeck    | `save-to-sourcedeck`    | `sd.govcon.opportunities.upsert({ ..., userStatus: 'saved' })`. Refreshes Dashboard launchpad.                       |
| ★ Mark Pursue           | `mark-pursue`           | `sd.govcon.opportunities.upsert({ ..., userStatus: 'pursuing' })`. Surfaces in Dashboard active pursuits.            |
| ⊘ Archive               | `archive`               | `sd.govcon.opportunities.upsert({ ..., userStatus: 'archived' })`.                                                   |
| ↗ Open SAM.gov Source   | `open-sam-source`       | `window.open(uiLink || url, '_blank', 'noopener,noreferrer')`.                                                       |

### 3.4 Opportunity record schema (upsert payload)

`id` (prefixed `sam:`), `source: 'SAM.gov'`, `title`, `agency`, `solicitationNumber`, `noticeId`, `naics`, `setAside`, `postedDate`, `dueDate`, `placeOfPerformance`, `sourceUrl`, `importedAt`, `userStatus` (`saved` / `pursuing` / `archived`).

## 4. Dashboard surface

Saved + pursuing opportunities flow into the Dashboard launchpad through `renderDashboardLaunchpad()`. The Active pursuits card counts records whose `userStatus !== 'archived'`.

## 5. Boundaries preserved

- No auto-search on load.
- No raw key ever in renderer markup.
- No portal upload, no email send, no bid submission.
- `Open SAM.gov Source` requires an explicit per-row click.
- Phase 25A no-send / no-submit / no-upload boundary preserved.
- Phase 23C reachability invariant preserved.

## 6. Tests

- `test/phase-25m-sam-key-status.test.js`
- `test/phase-25m-sam-in-app-search-save.test.js`

`npm test` → 64 PASS suites, 0 FAIL.

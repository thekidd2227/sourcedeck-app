# Main-process architecture refactor

This document is the engineering-facing companion to
[ADR-0001](../architecture/ADR-0001-main-process-composition-root.md).
It tells contributors **where** main-process responsibilities live now
that both phases of the refactor have shipped.

## Why we did this

`main.js` was 740 lines and owned ten unrelated responsibilities. The
strangler-fig pattern let us extract main-process startup concerns
into single-purpose modules **without** touching the renderer or
breaking the ~11 static-analysis tests that pin `main.js` content.

The goal was **risk reduction**, not a redesign. Every IPC channel
name, every argument, every return shape, and every renderer
expectation is preserved byte-for-byte across both phases.

## Where things live now (Phase 2 ✅)

```
main.js                                  thin composition entry point (~150 lines)
├── boot the IBM-readiness services      (cfg, audit, context, license)
├── const _mp = bootstrap({ … })         composition root
├── scrubStoredData()                    delegates to startup/privacy-scrub
├── createWindow()                       delegates to _mp.createWindow()
└── app.whenReady → createWindow + _mp.triggerUpdateCheck()
                                         (NO ipcMain.handle calls here)

app/main/
├── bootstrap.js                         orchestrates all helpers + IPC
├── startup/
│   ├── privacy-scrub.js                 first-run owner-string scrub
│   └── updater.js                       autoUpdater config + notify-check
├── window/
│   └── create-main-window.js            BrowserWindow factory
└── ipc/
    ├── register-core-ipc.js             18 core IPC channels
    ├── register-feature-ipc.js          78 feature IPC channels
    └── sanitizers.js                    5 argument sanitizers
```

### Behavior preserved exactly

| Concern | Old location | New location | Behavior delta |
| --- | --- | --- | --- |
| First-run privacy scrub | `main.js` (inline) | `app/main/startup/privacy-scrub.js` | None. `main.js#scrubStoredData` retained as a 1-line delegate. |
| `BrowserWindow` construction | `main.js` (inline) | `app/main/window/create-main-window.js` | None. Width/height/min/title/background/preload/setWindowOpenHandler/closed all identical. |
| autoUpdater config | `main.js` (inline) | `app/main/startup/updater.js` | None. `autoDownload=true`, `autoInstallOnAppQuit=true`, `'error'` swallowed, `'update-downloaded' → 'update-ready'`. |
| Packaged-build update check | `main.js` (inline `checkForUpdatesAndNotify`) | `_mp.triggerUpdateCheck()` (delegates to `updater.js`) | None. Still gated by `app.isPackaged`, still 5 s after createWindow, rejections still swallowed. |
| Core IPC registrations (18) | `main.js` | `app/main/ipc/register-core-ipc.js` | None. All 18 handlers — store-key/get-key/delete-key, store-get/set, ai-provider-status, storage-provider-status, context-get/set, guard-sensitive-action, validate-upload, ai-generate, storage-test-put, audit-summary, license:* — identical. |
| Feature IPC registrations (78) | `main.js` | `app/main/ipc/register-feature-ipc.js` | None. govcon:* (62), open-external, audit:list, credentials:* (3), airtable:* (4), enrichment:* (4), ai:* (4). All identical, all still routing through `createAppApi`. |
| Argument sanitizers (5) | `main.js` (inline) | `app/main/ipc/sanitizers.js` | None. `sanitizeOutreachConfig`, `sanitizeOutreachDraftInput`, `sanitizeSamLinkFetchInput`, `sanitizeSamFilters`, `normalizeSamSetAsideCode` — same shapes, same field-by-field whitelisting. |

### How handler inventory tracking works

The IPC registrars wrap the inbound `ipcMain` with a thin recording
Proxy so the source-level call pattern stays literally
`ipcMain.handle('channel', fn)` (which the 11 static-analysis tests
require) while each registration still pushes onto an internal
`registered` array. The Proxy is the whole reason we could move IPC
out of `main.js` without weakening the security/architecture
assertions in `test/credential-boundary.test.js`.

## Constraints that still apply

- **No new dependencies.** No new npm packages, no bundler, no
  TypeScript, no framework.
- **No renderer changes.** `preload.js` and `sourcedeck.html` are
  untouched across both phases.
- **No credential leaks.** The credential boundary tests
  (`test/credential-boundary*.test.js`) continue to pass; they are the
  security floor for the desktop app.
- **No GovCon business-logic changes.** The govcon services are
  untouched. IPC handlers route through `appApi`, identical to the
  pre-refactor behavior.
- **No silent behavior change in main.js.** `git diff main.js` reads
  as a pure extraction; new lines are delegations, removed lines are
  extractions.

## How to extend

If you add new startup-time main-process work, prefer to add it under
`app/main/startup/` (or `app/main/window/` for window-related concerns)
and wire it into `bootstrap.js`.

If you add a new IPC channel:

1. Add the handler body to either `app/main/ipc/register-core-ipc.js`
   or `app/main/ipc/register-feature-ipc.js`. Use the literal pattern
   `ipcMain.handle('your:channel', fn)` so the static-analysis tests
   continue to pin it.
2. **Add the channel name to the `EXPECTED_CHANNELS` list in
   `test/architecture-ipc-channel-inventory.test.js`.** Otherwise the
   inventory test fails — that's intentional, it is the regression
   guard.
3. Add the corresponding renderer surface to `preload.js`.
4. Update `app/main/ipc/sanitizers.js` if the channel takes
   renderer-supplied input that needs whitelisting.

If you add or rename a sanitizer, also update the characterization
checks in `test/architecture-main-process-composition.test.js`.

## Testing

```
node test/architecture-boundary.test.js
node test/architecture-main-process-composition.test.js
node test/architecture-ipc-channel-inventory.test.js
node test/credential-boundary.test.js
node test/default-state-policy.test.js
node test/license-service.test.js
node test/phase-25an-browser-handoff-local-extraction.test.js
npm test
```

The Phase 2 characterization test
(`test/architecture-main-process-composition.test.js`) locks the
composition-root surface — bootstrap + helper exports, the post-Phase-2
main.js layout (no `ipcMain.handle`, no sanitizer bodies), preload
untouched, no `require('electron')` in any `app/main/*` module, and
pure-function characterization of `runPrivacyScrub`,
`configureAutoUpdater`, `createMainWindow`, plus the 4 sanitizers and
`normalizeSamSetAsideCode`.

The IPC channel inventory test
(`test/architecture-ipc-channel-inventory.test.js`) runs both
registrars against a fake `ipcMain.handle` recorder and asserts the
full set deep-equals the canonical 96-channel pre-Phase-2 inventory.
This is the single regression guard for the migration: any channel
add/drop/rename without a matching update to `EXPECTED_CHANNELS`
fails this test loudly.

## Rollback

`git revert` of the Phase 2 commit restores the IPC handler bodies +
sanitizers to `main.js`. Phase 1 stays intact: the composition-root
helpers (`bootstrap.js`, `startup/*`, `window/*`) are pre-existing
from the earlier commit and were not modified by Phase 2's IPC
migration. A full restoration to the original monolithic `main.js`
requires reverting both Phase 1 and Phase 2 commits.

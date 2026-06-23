# Main-process architecture refactor

This document is the engineering-facing companion to
[ADR-0001](../architecture/ADR-0001-main-process-composition-root.md).
It tells contributors **where** main-process responsibilities live
**now** and where they will live **after** Phase 2.

## Why we did this

`main.js` was 740 lines and owned ten unrelated responsibilities. The
strangler-fig pattern lets us extract main-process startup concerns
into single-purpose modules **without** touching the renderer or
breaking the ~11 static-analysis tests that pin `main.js` content.

The goal of Phase 1 is **risk reduction**, not a redesign. Every IPC
channel name, every argument, every return shape, and every renderer
expectation is preserved byte-for-byte.

## Where things live now (Phase 1)

```
main.js                                  thin entry point + IPC site
├── boot the IBM-readiness services      (cfg, audit, context, license)
├── const _mp = bootstrap({ … })         composition root
├── scrubStoredData()                    delegates to startup/privacy-scrub
├── createWindow()                       delegates to _mp.createWindow()
├── app.whenReady → createWindow + _mp.triggerUpdateCheck()
└── ipcMain.handle(...) registrations    ← still here (Phase 2 target)

app/main/
├── bootstrap.js                         orchestrates the helpers below
├── startup/
│   ├── privacy-scrub.js                 first-run owner-string scrub
│   └── updater.js                       autoUpdater config + notify-check
├── window/
│   └── create-main-window.js            BrowserWindow factory
└── ipc/
    ├── register-core-ipc.js             Phase 2 scaffold (no-op)
    └── register-feature-ipc.js          Phase 2 scaffold (no-op)
```

### Behavior preserved exactly

| Concern | Old location | New location | Behavior delta |
| --- | --- | --- | --- |
| First-run privacy scrub | `main.js` (inline) | `app/main/startup/privacy-scrub.js` | None. `main.js#scrubStoredData` retained as a 1-line delegate. |
| `BrowserWindow` construction | `main.js` (inline) | `app/main/window/create-main-window.js` | None. Width/height/min/title/background/preload/setWindowOpenHandler/closed all identical. |
| autoUpdater config | `main.js` (inline) | `app/main/startup/updater.js` | None. `autoDownload=true`, `autoInstallOnAppQuit=true`, `'error'` swallowed, `'update-downloaded' → 'update-ready'`. |
| Packaged-build update check | `main.js` (inline `checkForUpdatesAndNotify`) | `_mp.triggerUpdateCheck()` (delegates to `updater.js`) | None. Still gated by `app.isPackaged`, still 5 s after createWindow, rejections still swallowed. |
| IPC registrations | `main.js` | **Still `main.js`** | None. Migration is Phase 2. |

### Why IPC registrations did not move in Phase 1

11 tests read `main.js` as a string and regex over the literal
`ipcMain.handle(...)` calls plus the `appApi.foo.bar()` pattern. Moving
those calls + rewriting the 11 tests in a single patch produces a
change too large to ship as a safety commit. See ADR-0001 §"Constraint:
the static-analysis test floor" for the full list.

## Phase 2 (planned)

The Phase 2 patch will:

1. Move core IPC handlers into `app/main/ipc/register-core-ipc.js`:
   `store-key`, `get-key`, `delete-key`, `store-get`, `store-set`,
   `ai-provider-status`, `storage-provider-status`, `context-get`,
   `context-set`, `guard-sensitive-action`, `validate-upload`,
   `ai-generate`, `storage-test-put`, `audit-summary`, `license:*`.
2. Move feature IPC handlers into
   `app/main/ipc/register-feature-ipc.js`: `govcon:*`, `audit:list`,
   `credentials:*`, `airtable:*`, `enrichment:*`, `ai:*`,
   `open-external`, `govcon:open-external-safe`,
   `govcon:select-and-extract-solicitation`.
3. Move sanitizers (`sanitizeOutreachConfig`,
   `sanitizeOutreachDraftInput`, `sanitizeSamFilters`) into
   `app/main/ipc/sanitizers.js`.
4. Update the 11 static-analysis tests to read from the new module
   locations. The assertions are about **layout**, not behavior; the
   regex checks transfer 1:1 to the new files.
5. Reduce `main.js` to a ~50-line composition entry point.

The renderer is not touched in Phase 2. No IPC channel name changes,
no argument changes, no return changes.

## Constraints that still apply

- **No new dependencies.** This refactor must not pull in new npm
  packages, a bundler, TypeScript, or a framework.
- **No renderer changes.** `preload.js` and `sourcedeck.html` are
  untouched.
- **No credential leaks.** The credential boundary tests
  (`test/credential-boundary*.test.js`) must continue to pass; they
  are the security floor for the desktop app.
- **No GovCon business-logic changes.** The govcon services are
  untouched. IPC handlers may move in Phase 2, but their behavior
  through `appApi` is identical.
- **No silent behavior change in main.js.** `git diff main.js` must
  read as a pure extraction; new lines are delegations, removed lines
  are extractions, and the runtime contract is identical.

## How to extend (Phase 1 patterns)

If you add new startup-time main-process work, prefer to add it under
`app/main/startup/` (or `app/main/window/` for window-related concerns)
and wire it into `bootstrap.js`. **Do not** add new logic directly to
`main.js`. The IPC site in `main.js` is the only thing that should
keep growing there during Phase 1; everything else has a more
specific home.

If you add a new IPC channel during Phase 1, it goes in `main.js`
alongside the other `ipcMain.handle(...)` calls — the static-analysis
tests need every channel to be at the same layout level. The Phase 2
migration will sweep all of them into `app/main/ipc/` together.

## Testing

```
node test/architecture-boundary.test.js
node test/credential-boundary.test.js
node test/default-state-policy.test.js
node test/license-service.test.js
node test/architecture-main-process-composition.test.js
npm test
```

The new characterization test
(`test/architecture-main-process-composition.test.js`) locks the
Phase 1 composition-root surface — it asserts that the bootstrap
exists, that the helpers under `app/main/` exist and export their
public functions, that `main.js` still requires the bootstrap, and
that the renderer-visible IPC site is still in `main.js`. A future
Phase 2 patch will update this test alongside the migration.

## Rollback

`git revert` of the Phase 1 commit is sufficient. The new files under
`app/main/` are pure additions; removing them does not break anything
else. `main.js` returns to its prior monolithic shape and the test
suite continues to pass.

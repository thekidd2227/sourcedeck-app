# ADR-0001 — Main-process composition root

- **Status:** Accepted (Phase 1 ✅ shipped · Phase 2 ✅ shipped)
- **Date:** 2026-06-23 (Phase 1) · 2026-06-23 (Phase 2)
- **Repo:** `thekidd2227/sourcedeck-app`
- **Authors:** Refactor working group

## Context

`main.js` had grown to ~740 lines covering ten distinct main-process
responsibilities:

1. Electron + electron-store + electron-updater bootstrapping
2. Service-layer construction (config, audit, context, AI provider,
   storage provider, license service, credentials, app-API adapter)
3. First-run privacy scrub
4. `BrowserWindow` construction (preload path, `setWindowOpenHandler`
   browser handoff, `ready-to-show` wiring, `closed` cleanup)
5. autoUpdater configuration + the 5-second packaged-build notify-check
6. ~25 core `ipcMain.handle(...)` registrations (storage keys,
   provider status, context, guard-sensitive-action, upload validation,
   AI generation, audit summary, license:*)
7. ~30 feature `ipcMain.handle(...)` registrations (govcon:*, audit:list,
   credentials:*, airtable:*, enrichment:*, ai:*)
8. Sanitizers used by feature handlers
   (`sanitizeOutreachConfig`, `sanitizeOutreachDraftInput`,
   `sanitizeSamFilters`)
9. The two `open-external` channels + the dialog-driven
   `govcon:select-and-extract-solicitation` IPC
10. `app.whenReady`/`activate`/`window-all-closed` lifecycle wiring

This file had become the highest-blast-radius surface in the desktop
repo: every IPC change had to thread the same monolith, every new
handler increased the risk of breaking a sibling, and the file's size
discouraged characterization tests. We need to reduce risk **without**
changing renderer behavior or shipping a different IPC contract.

## Constraint: the static-analysis test floor

~11 test files read `main.js` as a string and assert specific shape via
regex:

- `test/credential-boundary.test.js`
- `test/first-run-safety.test.js`
- `test/govcon-core.test.js`
- `test/phase-25aa-storage-safety.test.js`
- `test/phase-25aa-index-settings.test.js`
- `test/phase-25ab-uploaded-rfp-rfq-support.test.js`
- `test/phase-25an-browser-handoff-local-extraction.test.js`
- `test/chartnav-integration.test.js`
- `test/govcon-operating-profile-completeness.test.js`
- `test/phase-25aa-sam-filter-params.test.js`
- `test/credential-boundary-openai-claude.test.js`

These tests pin the literal `ipcMain.handle('channel-name', ...)`
strings and the `appApi.foo.bar()` routing pattern. They are guards
against regressions (e.g. credential boundary leaks, IPC channels going
through raw service modules instead of the app-API adapter). They are
**also** layout assertions, which makes them tightly coupled to where
those calls physically live.

Any refactor that moves `ipcMain.handle(...)` calls out of `main.js`
must update those tests in the same patch. That is more change than a
Phase 1 safety commit can absorb without losing reversibility.

## Decision

Adopt the **strangler-fig pattern** in two phases.

### Phase 1 (this ADR)

- Extract **startup-time, non-IPC responsibilities** out of `main.js`
  into a new `app/main/` namespace:
  - `app/main/bootstrap.js` — composition root. Single entry point
    that `main.js` calls once during startup.
  - `app/main/startup/privacy-scrub.js` — first-run scrub implementation.
  - `app/main/startup/updater.js` — autoUpdater configuration + the
    `triggerNotifyCheck` delegate the boot path invokes 5 s after window
    create on packaged builds.
  - `app/main/window/create-main-window.js` — `BrowserWindow` factory.
  - `app/main/ipc/register-core-ipc.js` — **scaffold only**. Documents the
    Phase 2 migration target for core IPC handlers. Currently a no-op
    that validates its dependency bag and returns `{phase:1, registered:[]}`.
  - `app/main/ipc/register-feature-ipc.js` — same shape for feature IPC
    handlers.
- Keep every `ipcMain.handle(...)` call in `main.js` exactly where the
  static-analysis tests expect to find it.
- Keep the `scrubStoredData` symbol + `_B64_BLOCKS`/`OWNER_STRING_BLOCKLIST`
  arrays in `main.js` so `first-run-safety.test.js`'s file-content
  assertion still passes; the body of `scrubStoredData` delegates to
  the new `runPrivacyScrub` helper, so behavior is identical.
- Keep `createWindow()` as a `main.js` symbol that delegates to
  `app/main/window/create-main-window.js` via the bootstrap.
- Wire the autoUpdater entirely through `app/main/startup/updater.js`
  (configuration runs during composition; `triggerNotifyCheck()` is
  exposed back to `main.js` so the 5 s setTimeout path keeps its prior
  shape).

The composition root is **purely additive** at this stage: it accepts
dependencies, owns the singleton window reference, exposes
`runScrub`/`createWindow`/`getMainWindow`/`triggerUpdateCheck`, and
leaves IPC registration alone.

### Phase 2 (shipped 2026-06-23)

Phase 2 completed the strangler migration:

- **18 core IPC handlers** migrated into
  `app/main/ipc/register-core-ipc.js`: `store-key`, `get-key`,
  `delete-key`, `store-get`, `store-set`, `ai-provider-status`,
  `storage-provider-status`, `context-get`, `context-set`,
  `guard-sensitive-action`, `validate-upload`, `ai-generate`,
  `storage-test-put`, `audit-summary`, `license:status`,
  `license:activate`, `license:validate`, `license:deactivate`.
- **78 feature IPC handlers** migrated into
  `app/main/ipc/register-feature-ipc.js`: `govcon:*` (62 channels),
  `open-external`, `audit:list`, `credentials:*` (3), `airtable:*` (4),
  `enrichment:*` (4), `ai:*` (4).
- **Five argument sanitizers** moved into `app/main/ipc/sanitizers.js`:
  `sanitizeOutreachConfig`, `sanitizeOutreachDraftInput`,
  `sanitizeSamLinkFetchInput`, `sanitizeSamFilters`, and the module-scope
  `normalizeSamSetAsideCode` helper.
- **Stale static-analysis tests updated** to read from the new module
  locations (no behavioral assertions changed):
  `credential-boundary.test.js`,
  `govcon-core.test.js`,
  `chartnav-integration.test.js`,
  `govcon-operating-profile-completeness.test.js`,
  `phase-25aa-sam-filter-params.test.js`,
  `phase-25ab-uploaded-rfp-rfq-support.test.js`,
  `phase-25an-browser-handoff-local-extraction.test.js`,
  `phase-25u-sam-naics-query-builder.test.js`,
  `phase-25x-open-sam-source-links.test.js`,
  `phase-25y-sam-source-open.test.js`,
  `renderer-airtable-migration.test.js`,
  `renderer-apollo-migration.test.js`.
- **New IPC inventory test**
  `test/architecture-ipc-channel-inventory.test.js` runs both registrars
  against a fake `ipcMain.handle` recorder and asserts the full sorted
  channel set deep-equals the canonical pre-Phase-2 96-channel inventory.
  Any future commit that adds, drops, or renames an IPC channel without
  updating the canonical list will fail this test.
- **`main.js` is now ~150 lines**, contains zero `ipcMain.handle(...)`
  calls, and no sanitizer bodies. It owns: service-layer construction,
  the `scrubStoredData` wrapper that keeps the first-run-safety symbol
  in place, the `createWindow` delegate, and the Electron app lifecycle
  (`whenReady` / `activate` / `window-all-closed`).
- **The renderer was untouched.** `preload.js` is byte-for-byte
  identical to its pre-Phase-2 state; every IPC channel name + argument
  shape + return shape is preserved exactly.

## Renderer contract

This refactor is invisible to the renderer:

- No new preload surface; `preload.js` is unchanged.
- No IPC channel renames.
- No argument or return-shape changes.
- No new IPC channels.

If a renderer change is needed in a future patch, it goes through its
own ADR and PR — not this one.

## Why not skip Phase 1 and do Phase 2 immediately?

- The Phase 2 migration *and* the corresponding 11 static-analysis
  test rewrites in one commit would be irreversible in practice. The
  blast radius (IPC + tests + main.js shape change all at once) is
  larger than we should ship in a single "safety" commit.
- Splitting the work into Phase 1 (composition root + scaffolds) and
  Phase 2 (IPC migration + test rewrite) gives us a clean rollback
  point. If Phase 2 introduces a regression we can revert it without
  losing the composition root or any of the extracted startup helpers.

## Consequences

### Positive

- `main.js` no longer owns BrowserWindow construction, autoUpdater
  configuration, or the literal privacy-scrub implementation. Those
  responsibilities live in single-purpose modules under `app/main/`.
- New main-process work (a new startup step, a different window option,
  a new autoUpdater event handler) has a clear, narrow file to land
  in. Reviewers don't need to scroll past 700 lines of IPC handlers
  to find the change.
- The composition root makes future test seams obvious: every helper
  takes its dependencies through a bag, none reach for `require('electron')`
  at module scope.
- `runPrivacyScrub` and `createMainWindow` are now unit-testable in
  isolation (no Electron app context required to exercise them).

### Negative / accepted

- `main.js` is still ~720 lines after this patch — Phase 2 is required
  to make a meaningful dent in the file's size.
- The `app/main/ipc/register-{core,feature}-ipc.js` files are
  intentionally no-ops in Phase 1. That's a placeholder cost we pay
  to publish the intended Phase 2 shape now (so reviewers see the
  whole strangler plan) and to avoid a churn-only second PR that only
  adds scaffolds.
- The `scrubStoredData` symbol in `main.js` is now a 1-line delegate
  but must be retained so the file-content assertion in
  `first-run-safety.test.js` keeps passing. This is a known
  carrying-cost that disappears in Phase 2.

## Validation

This refactor was gated through:

- `node test/architecture-boundary.test.js` — passes
- `node test/credential-boundary.test.js` — passes
- `node test/default-state-policy.test.js` — passes
- `node test/license-service.test.js` — passes
- `npm test` — passes
- All 11 static-analysis tests listed above — pass individually

A new characterization test was added:
`test/architecture-main-process-composition.test.js`. It locks the
Phase 1 surface so a future commit cannot silently regress the
composition-root contract.

## Reversal plan

If the composition root introduces a regression we cannot fix forward:

1. Revert this commit.
2. The new files under `app/main/` are pure additions; their removal
   does not break anything else in the tree.
3. `main.js` returns to its prior monolithic shape with no further
   downstream consequences.

The reversibility of this patch is the primary reason for the
strangler approach — a single revert returns the codebase to a known
green state without touching any of the work that has shipped on top
of the same `main.js` since.

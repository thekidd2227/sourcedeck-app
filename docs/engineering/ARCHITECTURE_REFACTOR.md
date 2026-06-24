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

## Phase 3 — Renderer strangler (started ✅ first slice)

Phases 1–2 strangled the **main process**. Phase 3 begins the same
treatment for the **renderer**: `sourcedeck.html` is ~23.5k lines and
mixes markup with dozens of inline `<script>` feature blocks. We extract
**one contained feature slice per commit** into a dedicated module under
`app/renderer/features/<feature>/`, with **no bundler, no framework, and
no IPC contract change**. See
[ADR-0002](../architecture/ADR-0002-renderer-strangler.md) for the rule.

**Strangler rule (renderer):**

- Extract exactly **one** contained slice at a time. Never attempt a full
  `sourcedeck.html` decomposition in a single change.
- Modules are **browser-safe global-attachment** scripts loaded with a
  relative `<script src>` (same mechanism as `services/*.js` and
  `chartnav-integration.js`). No `import`, no `require` of app code, no
  build step.
- **Preserve the renderer-facing surface exactly.** Window-global function
  names called from `onclick=` markup (e.g. `sdSwitchOppMode`,
  `sdRenderStatePortal`, `sdOpenExternal`) are a public contract — do not
  rename them.
- **Markup stays in HTML.** Only JS logic moves. DOM ids, CSS classes,
  copy, tab values, `localStorage` keys, and IPC/preload calls are
  unchanged.
- A renderer module **must not** `require('electron')` or use `ipcRenderer`
  directly — it reaches the main process only through the `window.sd.*`
  preload bridge.
- `app/**` must be in `build.files` so renderer modules ship in the packaged
  app (added in the packaging fix that also repaired the Phase 1/2
  main-process bundling gap).

### First slice (this phase)

| Slice | From | To |
| --- | --- | --- |
| Find Opportunities → State & Local procurement panel | `sourcedeck.html` inline Phase 25AL `<script>` (192 lines) | `app/renderer/features/find-opportunities/state-local-procurement.js` |

The IIFE moved **verbatim** (byte-identical logic), still attaches
`window.SD_STATE_PORTALS` + `sdSwitchOppMode` / `sdRenderStatePortal` /
`sdOpenSelectedStatePortal` / `sdOpenExternal`, and `sourcedeck.html` now
loads it via
`<script src="app/renderer/features/find-opportunities/state-local-procurement.js"></script>`.
`sourcedeck.html` dropped from 23,706 → 23,515 lines. The tab-restore hook
(`gcTabSwitch`, Phase 25N block) stays in HTML and still calls
`window.sdSwitchOppMode`.

Locked by `test/architecture-renderer-strangler.test.js` (module exists,
HTML references it and no longer holds the moved bodies, surface intact,
50 states + DC, unsafe URLs blocked, no electron import, `main.js` still
zero `ipcMain.handle`). The behavioral suite
`test/state-local-procurement-panel.test.js` is unchanged except its two
loaders now read the module file instead of the inline block.

## Phase 4 — Renderer strangler (✅ second slice)

The second renderer slice follows the same rule as Phase 3 (one contained
slice, browser-safe `<script src>`, no IPC/contract change).

- **Selected slice:** the **Pilot Tracker** (Phase 25E.5) — the local-only
  7-day trial tracker.
- **Why it was safe:** a fully self-contained IIFE with no dependency on
  unrelated globals; its only outside calls are the existing
  `window.sd.storeGet/storeSet` preload bridge (kept as-is, with a
  `localStorage` fallback). It is explicitly local-only ("nothing here is
  sent, submitted, or uploaded") — no credential/license/payment/extraction
  ties. The renderer-facing surface is just two markup-invoked globals
  (`window.ptOnDayChange`, `window.ptSaveDebounced`); `renderPilotTracker`
  and friends are internal. The existing `test/phase-25e-pilot-tracker.test.js`
  only asserts pane **markup**, so it was unaffected by moving the script.
- **New module path:**
  `app/renderer/features/pilot-tracker/pilot-tracker.js`
- **Behavior-preservation rule:** the IIFE moved verbatim; same window
  surface, same `sd.pilotTracker.v1` storage key, same `pilotTracker` bridge
  key, same auto-force-STOP-on-open-criticals logic, same boot via
  `DOMContentLoaded`/`setTimeout`. `sourcedeck.html` dropped 23,515 → 23,344
  lines; the Pilot Tracker pane markup and its `onchange`/`oninput` handlers
  stay in HTML.
- **Guards updated:** the new module is added to the Phase 3.5 packaging
  guard (`test/architecture-packaging-runtime-modules.test.js`) and to
  `scripts/release-check.js` `REQUIRED_ASAR_FILES`, and is locked by
  `test/architecture-renderer-strangler-phase-4.test.js` plus the running
  slice inventory in `test/architecture-renderer-strangler.test.js`.
- **Next recommended slice category:** another small, self-contained,
  storage-or-DOM-only utility panel with no provider/credential/extraction
  ties — e.g. the Phase 25F GovCon section-navigation helper or the Phase 25AD
  right-side file-viewer open/close helpers. Continue to **avoid** the large
  Phase 25N tab-switcher and the provider-backed Web/Awards intel panels until
  the smaller slices are done.

## Phase 5 — Renderer strangler (✅ third slice)

Same rule as Phases 3–4 (one contained slice, browser-safe `<script src>`, no
IPC/contract change).

- **Selected slice:** the **GovCon section-navigation helper** (Phase 25F) —
  smooth-scroll to a section + active-pill highlighting.
- **Why it was safe:** explicitly "pure browser code; no network." It is a
  single self-contained IIFE exposing one markup-invoked global
  (`window.gcScrollTo`); `pills`/`setActive` are internal. No credential,
  license, payment, provider, upload, extraction, storage, preload-bridge, or
  GovCon business-rule dependency — it only calls `scrollIntoView` and sets
  inline pill styles. Trivially testable in a minimal DOM harness.
- **New module path:** `app/renderer/features/navigation/section-scroll.js`
- **Packaging guard updated:** added to
  `test/architecture-packaging-runtime-modules.test.js` (`REQUIRED_RUNTIME_FILES`)
  and `scripts/release-check.js` (`REQUIRED_ASAR_FILES`), pinned the same way as
  the State & Local and Pilot Tracker modules; locked by
  `test/architecture-renderer-strangler-phase-5.test.js` and the slice inventory
  in `test/architecture-renderer-strangler.test.js`.
- **Behavior-preservation rule:** the IIFE moved verbatim; same
  `window.gcScrollTo` surface, same active/inactive pill colors, same
  smooth-scroll + missing-target no-op semantics. `sourcedeck.html` dropped
  23,344 → 23,307 lines; the dashboard handler that calls
  `gcScrollTo(event,'gc-sam-pipeline')` stays in HTML. (The `.gc-section-pill`
  highlighting is currently dormant — there are no pill elements in markup —
  and that pre-existing state is preserved exactly, not "fixed.")
- **Recommended next slice category:** continue with small, local-only
  utility/DOM helpers — e.g. the Phase 25AD right-side file-viewer open/close
  helpers (`window.sdRightFileViewerOpen/Close`, pure show/hide). Keep avoiding
  the central Phase 25N tab-switcher and the provider-backed Web/Awards intel
  and Solicitation Workspace blocks until the small slices are exhausted.

## Phase 6 — Renderer strangler (✅ fourth slice)

Same rule as Phases 3–5 (one contained slice, browser-safe `<script src>`, no
IPC/contract change).

- **Selected slice:** the **right-side file-viewer open/close helper**
  (Phase 25AD) — `window.sdRightFileViewerOpen` / `window.sdRightFileViewerClose`.
- **Why it was safe:** a self-contained IIFE that does **only** UI show/hide:
  toggles `hidden`/`aria-hidden`, the `.is-open` class, and `data-open`, and on
  close resets the title/meta/body to their default placeholder and removes the
  `data-current-*` UI-state attributes. It performs **no** upload, extraction,
  parsing, persistence, IPC, preload-bridge, storage, package-download, or
  GovCon business logic. Its consumers (`gcACPreviewFile` in the Saved
  Pursuits / Attachments code) stay in `sourcedeck.html` and keep calling the
  same globals.
- **Abort boundaries respected:** the block was confirmed isolated to open/close
  UI behavior before editing — it owns no business rules, touches no
  upload/extraction/parsing/persistence/IPC, and needed no viewer redesign or
  workflow change. None of the documented STOP conditions were hit.
- **New module path:** `app/renderer/features/file-viewer/file-viewer.js`
- **Packaging guard updated:** added to
  `test/architecture-packaging-runtime-modules.test.js` (`REQUIRED_RUNTIME_FILES`)
  and `scripts/release-check.js` (`REQUIRED_ASAR_FILES`), pinned the same way as
  the first three renderer modules; locked by
  `test/architecture-renderer-strangler-phase-6.test.js` and the slice inventory
  in `test/architecture-renderer-strangler.test.js`.
- **Behavior-preservation rule:** the IIFE moved verbatim; same window surface,
  same DOM/display/class/text effects, same early-return when the viewer element
  is absent, same guarded sub-element updates, and the unused (dormant)
  `sd-right-file-viewer-open-local` button reference preserved as-is — not
  "fixed." `sourcedeck.html` dropped 23,307 → 23,268 lines; the viewer `<aside>`
  markup and CSS stay in HTML (tablet/touch layout untouched).
- **Recommended next slice category:** small candidates are nearly exhausted;
  the Phase 25H "Today's Work Plan" calendar-integration helper (~64 lines) is a
  reasonable next local-only target. After that, the remaining blocks are large
  or coupled (Phase 25N tab-switcher, provider-backed Web/Awards intel,
  Solicitation Workspace) and will need a seam plan rather than a verbatim move.

## Phase 7 — Renderer strangler (✅ fifth slice)

Same rule as Phases 3–6 (one contained slice, browser-safe `<script src>`, no
IPC/contract change). Phase 6's file-viewer slice was manually smoke-tested in
the packaged app (open/close/repeat + attachment UI) and confirmed PASS before
this phase started.

- **Phase 25H assessment:** the **"Today's Work Plan integration"** block was
  inspected and found **safe** — it is a read-only mirror. It was extracted.
- **Selected slice:** Phase 25H Today's Work Plan integration —
  `window.calRenderTodayWorkPlan`.
- **Why it was safe:** UI / local read-only state only. It reads today's events
  from the optional `window.__sdCalendar.getState()` renderer global, falling
  back to `localStorage 'sd.calendar.v1'` (read-only — never writes, never
  changes the data shape), and renders them into the Daily Operating Rhythm
  pane's `#do-checklist` host. It makes **no** IPC/preload, provider, upload,
  extraction, parsing, persistence-write, credential/license, or GovCon
  scoring/compliance/business-rule calls. Fully characterizable with a VM/DOM
  harness (no real services).
- **Abort boundaries respected:** confirmed before editing that the block calls
  no IPC/provider/service, mutates no pursuit/package/extraction data, writes no
  storage, and changes no workflow semantics or stored-data shape. None of the
  documented STOP conditions were hit, so no fallback was needed.
- **New module path:** `app/renderer/features/todays-work-plan/todays-work-plan.js`
- **Packaging guard updated:** added to
  `test/architecture-packaging-runtime-modules.test.js` (`REQUIRED_RUNTIME_FILES`)
  and `scripts/release-check.js` (`REQUIRED_ASAR_FILES`), pinned identically to
  the first four renderer modules; locked by
  `test/architecture-renderer-strangler-phase-7.test.js` and the slice inventory
  in `test/architecture-renderer-strangler.test.js`.
- **Behavior-preservation rule:** the IIFE moved verbatim; same
  `window.calRenderTodayWorkPlan` surface, same `__sdCalendar`→`sd.calendar.v1`
  read order, same today-date filter, sort, escaping, empty-state copy + Calendar
  link, and the same guarded no-op when `#do-checklist` is absent. The existing
  `test/phase-25h-calendar-daily-rhythm-integration.test.js` keeps all behavior
  assertions; only its block loader was repointed to the module (the Daily Ops
  pane markup assertion still reads HTML). `sourcedeck.html` dropped
  23,268 → 23,204 lines; the `#do-checklist` host and the Calendar module
  (`window.__sdCalendar`) stay in HTML.
- **Recommended next slice category:** the easy local-only slices are now
  exhausted. The remaining inline blocks are large or coupled (Phase 25H
  **Calendar module** itself ~130+ lines with ICS import; Phase 25N Find
  Opportunities tab-switcher; provider-backed Web/Awards intel; Solicitation
  Workspace). The next phase should pick a deliberate seam (e.g. the Calendar
  module if its persistence stays read/write-through the same keys) rather than
  a verbatim move, and budget for more test repointing.

## Phase 3.5 — Packaging smoke guard (✅)

`app/**` is now a **required packaged runtime boundary**, not an optional
source folder. `main.js` `require()`s `app/main/**` at boot and
`sourcedeck.html` loads `app/renderer/features/**` via `<script src>`, so if
`app/**` is excluded from the asar the packaged app crashes at launch —
exactly what happened when `build.files` (an explicit allowlist) shipped
without `app/**`.

This boundary is guarded so it cannot silently regress again:

- **`test/architecture-packaging-runtime-modules.test.js`** asserts (1)
  `build.files` contains a rule that admits `app/**`, (2) every required
  runtime module exists in the repo, and (3) if a packaged
  `dist/mac/SourceDeck.app/.../app.asar` exists, those same files are inside
  it (via the local `@electron/asar` dep). When no asar is present the asar
  inspection **skips with a non-failing message** — CI may run `npm test`
  before packaging. It runs in the `npm test` chain.
- **`scripts/release-check.js`** now fails fast at gate time if `build.files`
  does not admit `app/**`, and its `REQUIRED_ASAR_FILES` list pins the
  `app/main/**` + `app/renderer/**` runtime modules so a packaged asar
  missing any of them blocks the release.

Required runtime modules under the boundary: `app/main/bootstrap.js`,
`app/main/window/create-main-window.js`, `app/main/startup/privacy-scrub.js`,
`app/main/startup/updater.js`, `app/main/ipc/register-core-ipc.js`,
`app/main/ipc/register-feature-ipc.js`, `app/main/ipc/sanitizers.js`,
`app/renderer/features/find-opportunities/state-local-procurement.js`.

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

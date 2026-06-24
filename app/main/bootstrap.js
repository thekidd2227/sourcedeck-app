// app/main/bootstrap.js
//
// Composition root for the main process.
//
// `main.js` becomes a thin entry point that:
//   1. Imports electron + electron-store + electron-updater + the
//      shared-services + app-api boundary.
//   2. Calls `bootstrap(...)` from this module to wire startup-time
//      concerns: privacy scrub, autoUpdater configuration, primary
//      window creation, IPC registration (core + feature).
//   3. Drives the Electron app lifecycle (whenReady / activate /
//      window-all-closed).
//
// Phase 2: IPC registration migrated out of main.js into
// `register-core-ipc.js` + `register-feature-ipc.js`. The deps bag is
// forwarded verbatim so handler bodies see the same dependencies the
// inline versions did. Channel names, argument shapes, and return
// shapes are preserved byte-for-byte. See ADR-0001.
//
// This module owns nothing the renderer can see.

'use strict';

const { runPrivacyScrub }      = require('./startup/privacy-scrub');
const { configureAutoUpdater } = require('./startup/updater');
const { createMainWindow }     = require('./window/create-main-window');
const { registerCoreIpc }      = require('./ipc/register-core-ipc');
const { registerFeatureIpc }   = require('./ipc/register-feature-ipc');

// deps:
//   electron                 — { app, BrowserWindow, ipcMain, shell, safeStorage, dialog }
//   autoUpdater              — from electron-updater
//   store                    — electron-store instance (sourcedeck-data)
//   credentials              — safeStorage-backed credential adapter
//   appApi                   — createAppApi(...) result
//   audit / context          — shared-service singletons
//   AUDIT_TYPES              — audit-log type constants
//   licensing                — license-service instance
//   loadConfig               — IBM-readiness config loader
//   getAiProviderStatus      — IBM-readiness AI status fn
//   getStorageProviderStatus — IBM-readiness storage status fn
//   createAiProvider         — IBM-readiness AI factory
//   createStorage            — IBM-readiness storage factory
//   validateUpload           — upload-validation entry point
//
// Returns:
//   {
//     runScrub,            // function() — re-runs the first-run privacy scrub
//     createWindow,        // function() — creates the primary BrowserWindow and tracks it
//     getMainWindow,       // function() → BrowserWindow | null
//     triggerUpdateCheck,  // function() — invoked once 5 s after createWindow on packaged builds
//     ipcChannels          // { core: [...], feature: [...] } — channels registered by Phase 2
//   }
function bootstrap(deps){
  if (!deps || !deps.electron) {
    throw new Error('bootstrap: deps.electron is required');
  }
  const {
    electron,
    autoUpdater,
    store,
    appApi,
    audit,
    AUDIT_TYPES,
    context,
    licensing,
    loadConfig,
    getAiProviderStatus,
    getStorageProviderStatus,
    createAiProvider,
    createStorage,
    validateUpload
  } = deps;
  const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog } = electron;

  // Singleton window reference. Exposed as getter + setter so the
  // autoUpdater can post to `webContents.send('update-ready')` and so
  // `app.on('activate')` can re-create the window when none exists.
  let mainWindow = null;
  const getMainWindow = () => mainWindow;
  const setMainWindow = (w) => { mainWindow = w; };

  // Privacy scrub runs against the electron-store snapshot. main.js
  // still invokes the legacy `scrubStoredData()` wrapper so the
  // first-run-safety static-analysis test continues to find the
  // expected entrypoint in main.js (test asserts file layout, not
  // behavior — see ADR-0001).
  function runScrub(){
    return runPrivacyScrub({ store });
  }

  // Configure auto-updater once. The notify-check is exposed as a
  // delegate so the boot path (packaged builds) can schedule the
  // single check 5 s after window create — matching the prior
  // behavior exactly.
  const { triggerNotifyCheck } = configureAutoUpdater({
    autoUpdater,
    getMainWindow
  });

  // BrowserWindow factory — caller (main.js) invokes this from
  // `app.whenReady` and from `app.on('activate', ...)` when the
  // window has been closed.
  function createWindow(){
    const win = createMainWindow({
      BrowserWindow,
      shell,
      onClosed: () => setMainWindow(null)
    });
    setMainWindow(win);
    return win;
  }

  // ─── Phase 2 IPC registration ──────────────────────────────────────
  // Core: storage-key, store-get/set, ai/storage provider-status,
  // context, guard-sensitive-action, validate-upload, ai-generate,
  // storage-test-put, audit-summary, license:*
  const coreRegResult = registerCoreIpc({
    ipcMain,
    safeStorage,
    store,
    audit,
    AUDIT_TYPES,
    context,
    licensing,
    loadConfig,
    getAiProviderStatus,
    getStorageProviderStatus,
    createAiProvider,
    createStorage,
    validateUpload
  });

  // Feature: govcon:*, open-external, audit:list, credentials:*,
  // airtable:*, enrichment:*, ai:*. The feature registrar pulls
  // userDataPath via a lazy getter so the platform-neutral handlers
  // never need to know about the Electron `app` object.
  const featureRegResult = registerFeatureIpc({
    ipcMain,
    shell,
    dialog,
    appApi,
    getUserDataPath: () => app.getPath('userData')
  });

  return {
    runScrub,
    createWindow,
    getMainWindow,
    triggerUpdateCheck: triggerNotifyCheck,
    ipcChannels: {
      core:    coreRegResult.registered.slice(),
      feature: featureRegResult.registered.slice()
    },
    // expose the setter only so legacy main.js code (or tests) can clear
    // the ref when needed — not part of the rolling Phase 2 API.
    _setMainWindow: setMainWindow
  };
}

module.exports = { bootstrap };

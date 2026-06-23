// app/main/bootstrap.js
//
// Phase 1 composition root for the main process.
//
// `main.js` becomes a thin entry point that:
//   1. Imports electron + electron-store + electron-updater + the
//      shared-services + app-api boundary.
//   2. Calls `bootstrap(...)` from this module to wire startup-time
//      concerns: privacy scrub, autoUpdater configuration, primary
//      window creation, IPC registrar scaffolds.
//   3. Continues to host the literal `ipcMain.handle(...)` registrations
//      because ~11 static-analysis tests pin them to main.js. Those
//      registrations will migrate into `register-core-ipc.js` /
//      `register-feature-ipc.js` in Phase 2 (see ADR-0001).
//
// This module owns nothing the renderer can see. Every IPC channel
// name and behavior is preserved byte-for-byte. The strangler approach
// keeps every Phase 1 change reversible.

'use strict';

const { runPrivacyScrub }      = require('./startup/privacy-scrub');
const { configureAutoUpdater } = require('./startup/updater');
const { createMainWindow }     = require('./window/create-main-window');
const { registerCoreIpc }      = require('./ipc/register-core-ipc');
const { registerFeatureIpc }   = require('./ipc/register-feature-ipc');

// deps:
//   electron         — { app, BrowserWindow, ipcMain, shell, safeStorage, dialog }
//   autoUpdater      — from electron-updater
//   store            — electron-store instance (sourcedeck-data)
//   credentials      — safeStorage-backed credential adapter
//   appApi           — createAppApi(...) result
//   audit / context  — shared-service singletons (passed through for IPC use)
//
// Returns:
//   {
//     runScrub,            // function() — re-runs the first-run privacy scrub
//     createWindow,        // function() — creates the primary BrowserWindow and tracks it
//     getMainWindow,       // function() → BrowserWindow | null
//     onWindowClosed,      // function() — clears the tracked window reference
//     triggerUpdateCheck   // function() — invoked once 5 s after createWindow on packaged builds
//   }
function bootstrap(deps){
  if (!deps || !deps.electron) {
    throw new Error('bootstrap: deps.electron is required');
  }
  const { electron, autoUpdater, store } = deps;
  const { BrowserWindow, shell } = electron;

  // Singleton window reference. We expose getter + setter so the
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

  // Phase 1 IPC registrars — currently no-op scaffolds. See ADR-0001.
  registerCoreIpc({ phase: 1, deps });
  registerFeatureIpc({ phase: 1, deps });

  return {
    runScrub,
    createWindow,
    getMainWindow,
    triggerUpdateCheck: triggerNotifyCheck,
    // expose the setter only so legacy main.js code (or tests) can clear
    // the ref when needed — not part of the rolling Phase 2 API.
    _setMainWindow: setMainWindow
  };
}

module.exports = { bootstrap };

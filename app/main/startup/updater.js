// app/main/startup/updater.js
//
// Auto-updater configuration. Phase 1 composition-root extraction.
// Behavior preserved exactly:
//   - autoDownload = true
//   - autoInstallOnAppQuit = true
//   - 'error' event is swallowed so an unreachable update channel cannot
//     crash the running app (this matters for unsigned dev packs that
//     lack app-update.yml)
//   - 'update-downloaded' notifies the renderer via mainWindow.webContents
//     by sending the 'update-ready' channel
//   - On packaged builds, the boot path calls `checkForUpdatesAndNotify`
//     once 5 s after window create; rejections are swallowed.
//
// The caller passes a `getMainWindow` getter so this module never holds a
// stale reference to a closed window.

'use strict';

function configureAutoUpdater({ autoUpdater, getMainWindow }){
  if (!autoUpdater) return { triggerNotifyCheck: () => {} };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', () => { /* update channel unavailable; app remains usable */ });

  autoUpdater.on('update-downloaded', () => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && win.webContents && !win.isDestroyed?.()) {
      try { win.webContents.send('update-ready'); } catch (_) {}
    }
  });

  // Returns a delegate the boot path can invoke once the app is ready.
  // Rejections are swallowed (directory/test packages do not include
  // app-update.yml — treat that as "no update channel", not a crash).
  function triggerNotifyCheck(){
    try { void autoUpdater.checkForUpdatesAndNotify().catch(() => {}); }
    catch (_) { /* never throw out of boot */ }
  }

  return { triggerNotifyCheck };
}

module.exports = { configureAutoUpdater };

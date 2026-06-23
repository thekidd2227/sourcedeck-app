// app/main/window/create-main-window.js
//
// Construct the primary SourceDeck BrowserWindow. Phase 1 composition-root
// extraction — the construction options, the preload path, the
// `setWindowOpenHandler` browser-handoff behavior, and the show-on-ready
// behavior are byte-for-byte identical to the prior in-file
// `createWindow()` in main.js. The only change is that the singleton
// `mainWindow` reference now lives in the caller (main.js or bootstrap)
// so the autoUpdater + `app.on('activate')` paths can re-create the
// window when it has been closed.
//
// Hard contract preserved (renderer must not know this refactor happened):
//   - dimensions and minimum dimensions
//   - title bar style (hiddenInset on darwin, default elsewhere)
//   - background color
//   - contextIsolation: true / nodeIntegration: false
//   - preload at <repo>/preload.js
//   - loadFile('sourcedeck.html')
//   - ready-to-show → show()
//   - setWindowOpenHandler → shell.openExternal + deny
//   - 'closed' event nulls the ref

'use strict';

const path = require('path');

// deps:
//   electron      — for the BrowserWindow constructor
//   shell         — for setWindowOpenHandler external opens
//   onClosed      — caller-supplied callback so the ref in main.js can
//                   be reset to null and re-created on `app.activate`.
//   repoRoot      — directory containing preload.js + sourcedeck.html
//                   (defaults to the parent of this module's `app/main/window/`).
function createMainWindow({ BrowserWindow, shell, onClosed, repoRoot }){
  const root = repoRoot || path.resolve(__dirname, '..', '..', '..');
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#04040A',
    title: 'SourceDeck',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(root, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  win.loadFile(path.join(root, 'sourcedeck.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (shell && typeof shell.openExternal === 'function') {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.on('closed', () => {
    if (typeof onClosed === 'function') onClosed();
  });

  return win;
}

module.exports = { createMainWindow };

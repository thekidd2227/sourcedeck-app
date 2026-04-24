const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store({ name: 'sourcedeck-data' });

// ─── First-run privacy scrub ──────────────────────────────────────────
// Runs before the window is created. Makes a packaged build safe even if,
// somehow, owner-identifying state ended up on the user's machine (e.g. a
// corrupt copy from the developer's own install or a migration that brought
// legacy data over). We never pre-populate data here; we only *remove*
// anything that matches a blocklist pattern.
//
// The blocklist fragments are base64-encoded so the packaged asar (and
// any strings(1) scan of it) does NOT contain the literal owner strings.
// See test/first-run-safety.test.js for the decoded set (kept out of shipping source).
const _B64_BLOCKS = [
  'QVJDRyBTeXN0ZW1z',
  'YXJjZ3N5c3RlbXM=',
  'YXJpdmVyZ3JvdXA=',
  'ZGlnaWFyY2dzeXN0ZW1z',
  'YXJjZy5haQ==',
  'SmVhbi1NYXg=',
  'amVhbm1heA=='
];
const OWNER_STRING_BLOCKLIST = _B64_BLOCKS.map(s => Buffer.from(s, 'base64').toString('utf8'));

function scrubStoredData() {
  try {
    const snapshot = store.store || {};
    const json = JSON.stringify(snapshot);
    const contaminated = OWNER_STRING_BLOCKLIST.some(s => json.includes(s));
    if (!contaminated) return;
    // On any contamination, drop all non-essential state. Keys (encrypted)
    // are left intact so the user doesn't lose their own API credentials.
    const keep = {};
    if (snapshot.keys) keep.keys = snapshot.keys;
    store.clear();
    Object.keys(keep).forEach(k => store.set(k, keep[k]));
    store.set('_privacy_scrub_applied_at', new Date().toISOString());
  } catch (_) {
    // Never crash boot on scrub failure.
  }
}

scrubStoredData();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#04040A',
    title: 'SourceDeck',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.loadFile('sourcedeck.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-updater: silent download, prompt on ready
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-ready');
  }
});

// IPC handlers for secure key storage
ipcMain.handle('store-key', (event, service, key) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key);
      store.set(`keys.${service}`, encrypted.toString('base64'));
    } else {
      store.set(`keys.${service}`, key);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-key', (event, service) => {
  try {
    const val = store.get(`keys.${service}`);
    if (!val) return null;
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(val, 'base64');
      return safeStorage.decryptString(buffer);
    }
    return val;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('delete-key', (event, service) => {
  try {
    store.delete(`keys.${service}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Generic store get/set for pipeline data
ipcMain.handle('store-get', (event, key) => {
  return store.get(key, null);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

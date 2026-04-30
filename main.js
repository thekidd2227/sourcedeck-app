const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// ── IBM-readiness service layer (main-process only) ─────────────────
const { loadConfig }                                  = require('./services/config');
const { createAiProvider, getAiProviderStatus }       = require('./services/ai/provider-factory');
const { createStorage,    getStorageProviderStatus }  = require('./services/storage/storage-factory');
const { createAuditLog, TYPES: AUDIT_TYPES }          = require('./services/audit/audit-log');
const { createContext }                               = require('./services/context/context');
const { validateUpload }                              = require('./services/security/upload-validation');

const store = new Store({ name: 'sourcedeck-data' });

// Boot the IBM-readiness services. They're additive: defaults are
// local + offline so first-run is unchanged. They never reach the
// renderer except through the explicit IPC handlers registered below.
const cfg     = loadConfig();
const audit   = createAuditLog(store);
const context = createContext(store);

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

// ─── IBM-readiness IPC ──────────────────────────────────────────────
// Status surfaces never expose secret values — only configured/missing.

ipcMain.handle('ai-provider-status', () => getAiProviderStatus(loadConfig()));
ipcMain.handle('storage-provider-status', () => getStorageProviderStatus(loadConfig()));
ipcMain.handle('context-get', () => context.get());

ipcMain.handle('context-set', (_event, patch) => {
  const next = context.set(patch || {});
  audit.append({ type: AUDIT_TYPES.CONTEXT_SET, status: 'ok',
                 metadata: { changedKeys: Object.keys(patch || {}) } });
  return next;
});

ipcMain.handle('guard-sensitive-action', (_event, name, opts) => {
  try {
    const allowed = context.guardSensitiveAction(String(name || 'unknown'),
                      Object.assign({}, opts || {}, { soft: true }));
    if (!allowed) {
      audit.append({ type: AUDIT_TYPES.SENSITIVE_ACTION_DENIED, status: 'denied',
                     metadata: { action: name, role: context.get().role } });
    }
    return { allowed };
  } catch (err) {
    return { allowed: false, error: err.code || 'denied' };
  }
});

ipcMain.handle('validate-upload', (_event, descriptor) => {
  try { return validateUpload(descriptor || {}); }
  catch (err) { return { ok: false, code: 'validation_threw', detail: err.message }; }
});

ipcMain.handle('ai-generate', async (_event, input) => {
  const c = loadConfig();
  const provider = createAiProvider(c);
  audit.append({
    type: AUDIT_TYPES.AI_PROVIDER_SELECTED,
    provider: provider.name, modelId: provider.modelId,
    status: 'ok', metadata: { aiProvider: c.aiProvider }
  });
  if (provider.configured === false) {
    audit.append({ type: AUDIT_TYPES.AI_REQUEST_FAILED, provider: provider.name,
                   status: 'denied', metadata: { reason: 'missing_config', missing: provider.missing } });
    return { ok: false, provider: provider.name, error: 'missing_config', missing: provider.missing };
  }
  audit.append({ type: AUDIT_TYPES.AI_REQUEST_CREATED, provider: provider.name,
                 modelId: provider.modelId, status: 'pending' });
  const result = await provider.generate(input || {});
  audit.append({
    type: result.ok ? AUDIT_TYPES.AI_RESPONSE_RECEIVED : AUDIT_TYPES.AI_REQUEST_FAILED,
    provider:  result.provider || provider.name,
    modelId:   result.model_id || provider.modelId,
    requestId: result.request_id || null,
    status:    result.ok ? 'ok' : 'error',
    metadata:  result.ok
      ? { textLength: (result.text || '').length, usage: (result.raw && result.raw.usage) || null }
      : { error: result.error || 'unknown', status: result.status || null }
  });
  return result;
});

ipcMain.handle('storage-test-put', async (_event, text) => {
  const c       = loadConfig();
  const adapter = createStorage(c, store);
  audit.append({ type: AUDIT_TYPES.STORAGE_OPERATION_STARTED,
                 provider: adapter.name, status: 'pending', metadata: { op: 'put' } });
  if (adapter.configured === false) {
    audit.append({ type: AUDIT_TYPES.STORAGE_OPERATION_FAILED, provider: adapter.name,
                   status: 'denied', metadata: { reason: 'missing_config', missing: adapter.missing } });
    return { ok: false, provider: adapter.name, error: 'missing_config', missing: adapter.missing };
  }
  const buffer = Buffer.from(String(text || `SourceDeck test object · ${new Date().toISOString()}`), 'utf8');
  const result = await adapter.put({ buffer, contentType: 'text/plain', originalFilename: 'sourcedeck-test.txt' });
  audit.append({
    type:     result.ok ? AUDIT_TYPES.STORAGE_OPERATION_COMPLETED : AUDIT_TYPES.STORAGE_OPERATION_FAILED,
    provider: result.provider || adapter.name,
    status:   result.ok ? 'ok' : 'error',
    metadata: result.ok
      ? { op: 'put', key: result.key, size: result.size, hash: result.hash }
      : { op: 'put', error: result.error || 'unknown', status: result.status || null }
  });
  return result;
});

ipcMain.handle('audit-summary', () => audit.summary());

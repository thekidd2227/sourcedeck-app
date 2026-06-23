// main.js
//
// Phase 2 main-process composition entry point.
//
// All IPC handler bodies, argument sanitizers, BrowserWindow
// construction, autoUpdater configuration, and the privacy-scrub
// implementation have been extracted into modules under `app/main/`.
// This file's job is now strictly:
//
//   1. Import Electron + the shared-service layer + the app-API
//      boundary (createAppApi).
//   2. Construct in-process singletons (store, audit, context,
//      licensing, credentials, appApi).
//   3. Hand them to `bootstrap(...)` which wires the privacy scrub,
//      autoUpdater, window factory, and IPC registrars.
//   4. Drive the Electron app lifecycle (whenReady / activate /
//      window-all-closed).
//
// Behavior is byte-for-byte identical to the prior monolithic main.js.
// Every IPC channel name and argument/return shape is preserved;
// the renderer must not know either phase happened.
// See docs/architecture/ADR-0001-main-process-composition-root.md.

const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog } = require('electron');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// ── IBM-readiness service layer (main-process only) ─────────────────
const { loadConfig }                                  = require('./services/config');
const { createAiProvider, getAiProviderStatus }       = require('./services/ai/provider-factory');
const { createStorage,    getStorageProviderStatus }  = require('./services/storage/storage-factory');
const { createAuditLog, TYPES: AUDIT_TYPES }          = require('./services/audit/audit-log');
const { createContext }                               = require('./services/context/context');
const { validateUpload }                              = require('./services/security/upload-validation');

// ── App-API adapter + credential adapter (web-first migration) ──────
// The IPC registrars route through createAppApi so the same surface
// can later be hosted by an HTTP API server. See
// docs/architecture-web-first-roadmap.md.
const { createAppApi }                       = require('./api');
const { createSafeStorageCredentialStore }   = require('./services/settings/credentials');
const { createLicenseService }               = require('./services/licensing/license-service');

// ── Main-process composition root ───────────────────────────────────
const { bootstrap: createMainProcessBootstrap } = require('./app/main/bootstrap');
const { runPrivacyScrub: _runPrivacyScrubImpl } = require('./app/main/startup/privacy-scrub');

const store = new Store({ name: 'sourcedeck-data' });

// Boot the IBM-readiness services. They're additive: defaults are
// local + offline so first-run is unchanged. They never reach the
// renderer except through the explicit IPC handlers the registrars
// install.
const audit   = createAuditLog(store);
const context = createContext(store);
const licensing = createLicenseService({
  store,
  safeStorage,
  fetchFn: typeof fetch === 'function' ? fetch : null,
  appInfo: {
    appName: app.getName ? app.getName() : 'SourceDeck',
    appVersion: app.getVersion ? app.getVersion() : 'unknown',
    platform: process.platform,
    arch: process.arch,
    userDataPath: app.getPath('userData')
  }
});

// Credential adapter — safeStorage-backed, same `keys.{service}` namespace
// the existing IPC has used since the IBM-readiness layer landed.
const credentials = createSafeStorageCredentialStore({ store, safeStorage });

// Single in-process API adapter. Every GovCon / external-API IPC
// handler routes through this so a future HTTP server can mount the
// same code unchanged.
const appApi = createAppApi({
  store,
  credentials,
  audit,
  fetchFn: typeof fetch === 'function' ? fetch : null,
  userDataPath: app.getPath('userData'),
  vendorOutreachTestMode: process.env.SOURCEDECK_VENDOR_OUTREACH_TEST_MODE === 'true'
});

// ─── Composition-root wiring ─────────────────────────────────────────
// Privacy scrub, autoUpdater configuration, BrowserWindow creation,
// and IPC registration are all owned by `app/main/bootstrap.js`.
// main.js retains a thin `scrubStoredData` wrapper + the blocklist
// arrays so the first-run-safety static-analysis test continues to
// find the expected entrypoint here.
const _mp = createMainProcessBootstrap({
  electron: { app, BrowserWindow, ipcMain, shell, safeStorage, dialog },
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
});

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

// Delegates to app/main/startup/privacy-scrub.js. The behavior is
// byte-for-byte identical to the prior in-file implementation; this
// wrapper keeps the symbol name + entrypoint where the static-analysis
// tests expect to find it.
function scrubStoredData() {
  _runPrivacyScrubImpl({ store, blocklist: OWNER_STRING_BLOCKLIST });
}

scrubStoredData();

let mainWindow;

// Delegates window construction to app/main/window/create-main-window.js
// via the bootstrap. BrowserWindow options, preload path,
// ready-to-show + closed event wiring, and the setWindowOpenHandler
// browser-handoff are preserved exactly. `mainWindow` is kept here so
// `app.on('activate')` re-create stays referenced unchanged.
function createWindow() {
  mainWindow = _mp.createWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    // autoUpdater configuration + the 5 s notify-check live in
    // app/main/startup/updater.js. Behavior is unchanged: packaged
    // builds invoke `checkForUpdatesAndNotify` once, 5 s after window
    // create, and rejections are swallowed (directory/test packages
    // have no app-update.yml).
    setTimeout(() => { _mp.triggerUpdateCheck(); }, 5000);
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

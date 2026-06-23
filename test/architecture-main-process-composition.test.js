// test/architecture-main-process-composition.test.js
//
// Characterization test for Phase 1 of the main-process composition-root
// refactor. See docs/architecture/ADR-0001-main-process-composition-root.md.
//
// These assertions lock the Phase 1 surface so a future commit cannot
// silently regress it. They are about LAYOUT and PUBLIC EXPORTS — they do
// not invoke Electron, they do not start the app, and they do not touch
// the renderer.
//
// Phase 2 (the IPC migration) will update parts of this test alongside
// the migration. Until Phase 2 lands, every assertion below is expected
// to hold.

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const MAIN_JS  = path.join(ROOT, 'main.js');
const APP_MAIN = path.join(ROOT, 'app', 'main');

let pass = 0;
let fail = 0;
function ok(label, cond, detail){
  if (cond) { pass += 1; console.log('  ✅', label); return; }
  fail += 1;
  console.log('  ❌', label, detail ? '→ ' + detail : '');
}

console.log('\n=== Phase 1 — main-process composition root characterization ===\n');

// ── 1. The new app/main/* files exist and export what the bootstrap needs ──

const expectedFiles = [
  ['bootstrap.js',                         ['bootstrap']],
  ['startup/privacy-scrub.js',             ['runPrivacyScrub', 'decodeBlocklist', 'PRIVACY_SCRUB_B64_BLOCKS']],
  ['startup/updater.js',                   ['configureAutoUpdater']],
  ['window/create-main-window.js',         ['createMainWindow']],
  ['ipc/register-core-ipc.js',             ['registerCoreIpc']],
  ['ipc/register-feature-ipc.js',          ['registerFeatureIpc']]
];

for (const [rel, exports] of expectedFiles) {
  const abs = path.join(APP_MAIN, rel);
  ok(`app/main/${rel} exists`, fs.existsSync(abs));
  if (!fs.existsSync(abs)) continue;
  let mod;
  try { mod = require(abs); } catch (err) {
    ok(`app/main/${rel} requires cleanly`, false, err.message);
    continue;
  }
  for (const name of exports) {
    ok(`app/main/${rel} exports ${name}`, typeof mod[name] === 'function' || mod[name] !== undefined);
  }
}

// ── 2. The Phase 1 IPC scaffolds remain no-ops (no registrations) ──

try {
  const { registerCoreIpc }    = require(path.join(APP_MAIN, 'ipc', 'register-core-ipc'));
  const { registerFeatureIpc } = require(path.join(APP_MAIN, 'ipc', 'register-feature-ipc'));
  const core = registerCoreIpc({ phase: 1 });
  const feat = registerFeatureIpc({ phase: 1 });
  ok('register-core-ipc Phase 1 returns {phase:1, registered:[]}',
     core && core.phase === 1 && Array.isArray(core.registered) && core.registered.length === 0,
     JSON.stringify(core));
  ok('register-feature-ipc Phase 1 returns {phase:1, registered:[]}',
     feat && feat.phase === 1 && Array.isArray(feat.registered) && feat.registered.length === 0,
     JSON.stringify(feat));
} catch (err) {
  ok('IPC scaffolds invokable as no-ops', false, err.message);
}

// ── 3. main.js still hosts the IPC site + privacy-scrub symbols ──
// The 11 static-analysis tests pin this. Phase 2 will move them.

const main = fs.readFileSync(MAIN_JS, 'utf8');

ok('main.js requires the composition-root bootstrap',
   /require\('\.\/app\/main\/bootstrap'\)/.test(main));
ok('main.js requires the privacy-scrub helper',
   /require\('\.\/app\/main\/startup\/privacy-scrub'\)/.test(main));
ok('main.js still defines scrubStoredData (first-run-safety test contract)',
   /function\s+scrubStoredData\s*\(/.test(main));
ok('main.js still defines createWindow (lifecycle contract)',
   /function\s+createWindow\s*\(/.test(main));
ok('main.js wires _mp.triggerUpdateCheck() from app.whenReady',
   /_mp\.triggerUpdateCheck\s*\(/.test(main));
ok('main.js wires _mp.createWindow() from the createWindow delegate',
   /_mp\.createWindow\s*\(/.test(main));

// IPC site stays in main.js for Phase 1. We sample several pinned channels.
const pinnedChannels = [
  'store-key', 'get-key', 'delete-key',
  'govcon:profile-completeness',
  'govcon:targeting-get',
  'credentials:status',
  'audit:list',
  'license:activate'
];
for (const ch of pinnedChannels) {
  const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`ipcMain\\.handle\\(\\s*['\"]${escaped}['\"]`);
  ok(`main.js still hosts ipcMain.handle('${ch}', ...) (Phase 2 target)`, re.test(main));
}

// ── 4. main.js no longer holds the literal autoUpdater config block ──
// (that lives in app/main/startup/updater.js now). We assert main.js
// does NOT have the redundant top-level autoUpdater.autoDownload =
// statement — it would conflict with the bootstrap's configuration.

ok('main.js does not duplicate autoUpdater.autoDownload assignment',
   !/^\s*autoUpdater\.autoDownload\s*=\s*true/m.test(main));
ok('main.js does not duplicate autoUpdater.autoInstallOnAppQuit assignment',
   !/^\s*autoUpdater\.autoInstallOnAppQuit\s*=\s*true/m.test(main));
ok('main.js does not register a duplicate autoUpdater "update-downloaded" listener',
   !/autoUpdater\.on\(\s*['"]update-downloaded['"]/.test(main));

// ── 5. The renderer-visible surface is untouched ──
// preload.js is the renderer/main IPC bridge. The refactor must not
// modify it.

const preloadPath = path.join(ROOT, 'preload.js');
ok('preload.js still exists at the canonical path', fs.existsSync(preloadPath));
const preload = fs.readFileSync(preloadPath, 'utf8');
ok('preload.js does not reference the new app/main/* tree',
   !/app\/main\//.test(preload));

// ── 6. Helpers do not reach for electron at module scope ──
// (testability + reuse — they should accept deps via the bag).

for (const rel of ['bootstrap.js', 'startup/privacy-scrub.js', 'startup/updater.js', 'window/create-main-window.js', 'ipc/register-core-ipc.js', 'ipc/register-feature-ipc.js']) {
  const src = fs.readFileSync(path.join(APP_MAIN, rel), 'utf8');
  ok(`app/main/${rel} does not require('electron') at module scope`,
     !/^\s*(?:const|let|var)\s+\{?[^=]*\}?\s*=\s*require\(['"]electron['"]\)/m.test(src));
}

// ── 7. The privacy-scrub helper is a pure function over a store ──

try {
  const { runPrivacyScrub } = require(path.join(APP_MAIN, 'startup', 'privacy-scrub'));
  const fakeStore = {
    _data: { keys: { foo: 'enc' }, owner: 'something containing ARCG Systems' },
    get store(){ return this._data; },
    clear(){ this._data = {}; },
    set(k, v){ this._data[k] = v; }
  };
  const result = runPrivacyScrub({ store: fakeStore });
  ok('runPrivacyScrub returns {contaminated, appliedAt}', result && typeof result === 'object' && 'contaminated' in result && 'appliedAt' in result);
  ok('runPrivacyScrub detects contaminated store', result.contaminated === true, JSON.stringify(result));
  ok('runPrivacyScrub keeps the keys namespace when contaminated', fakeStore._data.keys && fakeStore._data.keys.foo === 'enc');
  ok('runPrivacyScrub records _privacy_scrub_applied_at', typeof fakeStore._data._privacy_scrub_applied_at === 'string');
  ok('runPrivacyScrub drops owner-containing fields', !('owner' in fakeStore._data));
} catch (err) {
  ok('privacy-scrub characterization', false, err.message);
}

try {
  const { runPrivacyScrub } = require(path.join(APP_MAIN, 'startup', 'privacy-scrub'));
  const clean = { _data: { other: 'unrelated' }, get store(){ return this._data; }, clear(){ this._data = {}; }, set(k, v){ this._data[k] = v; } };
  const result = runPrivacyScrub({ store: clean });
  ok('runPrivacyScrub leaves a clean store untouched', result.contaminated === false && clean._data.other === 'unrelated' && !('_privacy_scrub_applied_at' in clean._data));
} catch (err) {
  ok('privacy-scrub clean-store characterization', false, err.message);
}

// ── 8. configureAutoUpdater preserves the public delegate contract ──

try {
  const { configureAutoUpdater } = require(path.join(APP_MAIN, 'startup', 'updater'));
  const listeners = {};
  const fakeUpdater = {
    autoDownload: null,
    autoInstallOnAppQuit: null,
    on(ev, fn){ listeners[ev] = fn; },
    checkForUpdatesAndNotify(){ return Promise.resolve(); }
  };
  const result = configureAutoUpdater({ autoUpdater: fakeUpdater, getMainWindow: () => null });
  ok('configureAutoUpdater sets autoDownload=true',          fakeUpdater.autoDownload === true);
  ok('configureAutoUpdater sets autoInstallOnAppQuit=true',  fakeUpdater.autoInstallOnAppQuit === true);
  ok('configureAutoUpdater registers an error listener',     typeof listeners.error === 'function');
  ok('configureAutoUpdater registers an update-downloaded listener', typeof listeners['update-downloaded'] === 'function');
  ok('configureAutoUpdater returns a triggerNotifyCheck delegate', typeof result.triggerNotifyCheck === 'function');

  let threw = false;
  try { listeners.error(new Error('simulated')); } catch (_) { threw = true; }
  ok('error listener swallows errors (does not throw)', threw === false);

  let sent = null;
  const win = { webContents: { send: (ch) => { sent = ch; } }, isDestroyed: () => false };
  const result2 = configureAutoUpdater({ autoUpdater: { autoDownload: null, autoInstallOnAppQuit: null, on(ev, fn){ listeners[ev] = fn; }, checkForUpdatesAndNotify(){ return Promise.resolve(); } }, getMainWindow: () => win });
  listeners['update-downloaded']();
  ok("update-downloaded forwards the 'update-ready' renderer notification", sent === 'update-ready');
  ok('result2 also exposes triggerNotifyCheck', typeof result2.triggerNotifyCheck === 'function');
} catch (err) {
  ok('updater characterization', false, err.message);
}

// ── 9. createMainWindow honors the documented BrowserWindow contract ──

try {
  const { createMainWindow } = require(path.join(APP_MAIN, 'window', 'create-main-window'));
  let received = null;
  const fakeBW = function (opts) {
    received = opts;
    this.loaded = null;
    this.loadFile = (p) => { this.loaded = p; };
    this.once = (ev, fn) => { this.onReady = ev === 'ready-to-show' ? fn : this.onReady; };
    this.on   = (ev, fn) => { if (ev === 'closed') this.onClosed = fn; };
    this.webContents = { setWindowOpenHandler: (fn) => { this.openHandler = fn; } };
    this.show = () => { this.shown = true; };
    return this;
  };
  let externalOpened = null;
  const fakeShell = { openExternal: (url) => { externalOpened = url; } };
  let closedRan = false;
  const win = createMainWindow({ BrowserWindow: fakeBW, shell: fakeShell, onClosed: () => { closedRan = true; }, repoRoot: ROOT });
  ok('BrowserWindow width=1440',  received && received.width === 1440);
  ok('BrowserWindow height=900',  received && received.height === 900);
  ok('BrowserWindow minWidth=1024', received && received.minWidth === 1024);
  ok('BrowserWindow minHeight=700', received && received.minHeight === 700);
  ok('BrowserWindow backgroundColor=#04040A', received && received.backgroundColor === '#04040A');
  ok('BrowserWindow show=false (gated on ready-to-show)', received && received.show === false);
  ok('BrowserWindow contextIsolation=true', received && received.webPreferences && received.webPreferences.contextIsolation === true);
  ok('BrowserWindow nodeIntegration=false', received && received.webPreferences && received.webPreferences.nodeIntegration === false);
  ok('BrowserWindow preload resolves to <repo>/preload.js', received && received.webPreferences && received.webPreferences.preload === path.join(ROOT, 'preload.js'));
  ok('loadFile points at sourcedeck.html', win.loaded === path.join(ROOT, 'sourcedeck.html'));

  win.openHandler({ url: 'https://example.com' });
  ok('setWindowOpenHandler forwards URL to shell.openExternal', externalOpened === 'https://example.com');
  ok('setWindowOpenHandler return value denies the in-app open', (function(){ return win.openHandler({ url: 'https://x' }).action === 'deny'; })());

  win.onClosed();
  ok('closed listener triggers caller-supplied onClosed', closedRan === true);
} catch (err) {
  ok('createMainWindow characterization', false, err.message);
}

// ── 10. bootstrap returns the documented composition surface ──

try {
  const { bootstrap } = require(path.join(APP_MAIN, 'bootstrap'));
  const listeners = {};
  const fakeUpdater = {
    autoDownload: null, autoInstallOnAppQuit: null,
    on(ev, fn){ listeners[ev] = fn; },
    checkForUpdatesAndNotify(){ return Promise.resolve(); }
  };
  const fakeStore = { store: {} };
  const handle = bootstrap({
    electron: { BrowserWindow: function(){}, shell: { openExternal(){} }, ipcMain: { handle(){} }, app: {} , safeStorage: {}, dialog: {} },
    autoUpdater: fakeUpdater,
    store: fakeStore,
    credentials: {},
    appApi: {},
    audit: {},
    context: {}
  });
  ok('bootstrap exposes runScrub',           typeof handle.runScrub === 'function');
  ok('bootstrap exposes createWindow',       typeof handle.createWindow === 'function');
  ok('bootstrap exposes getMainWindow',      typeof handle.getMainWindow === 'function');
  ok('bootstrap exposes triggerUpdateCheck', typeof handle.triggerUpdateCheck === 'function');
  ok('bootstrap initially has no main window', handle.getMainWindow() === null);
} catch (err) {
  ok('bootstrap characterization', false, err.message);
}

console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

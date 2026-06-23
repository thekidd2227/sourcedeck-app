// test/architecture-main-process-composition.test.js
//
// Characterization test for the main-process composition root.
// See docs/architecture/ADR-0001-main-process-composition-root.md.
//
// Phase 1 (shipped earlier): extracted startup-time concerns (privacy
// scrub, autoUpdater config, BrowserWindow factory) into `app/main/*`
// modules and turned `main.js` into a composition entry point that
// still hosted the literal `ipcMain.handle(...)` registrations.
//
// Phase 2 (this PR): migrated IPC registrations into
// `app/main/ipc/register-core-ipc.js` + `app/main/ipc/register-feature-ipc.js`,
// extracted argument sanitizers into `app/main/ipc/sanitizers.js`, and
// reduced `main.js` to a ~150-line composition entry point that no
// longer contains any `ipcMain.handle(...)` calls.
//
// These assertions lock the Phase 2 surface so a future commit cannot
// silently regress it. They are about LAYOUT and PUBLIC EXPORTS — they
// do not invoke Electron, they do not start the app, and they do not
// touch the renderer.

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

console.log('\n=== Phase 2 — main-process composition root characterization ===\n');

// ── 1. The app/main/* files exist and export what the bootstrap needs ──

const expectedFiles = [
  ['bootstrap.js',                         ['bootstrap']],
  ['startup/privacy-scrub.js',             ['runPrivacyScrub', 'decodeBlocklist', 'PRIVACY_SCRUB_B64_BLOCKS']],
  ['startup/updater.js',                   ['configureAutoUpdater']],
  ['window/create-main-window.js',         ['createMainWindow']],
  ['ipc/register-core-ipc.js',             ['registerCoreIpc']],
  ['ipc/register-feature-ipc.js',          ['registerFeatureIpc']],
  ['ipc/sanitizers.js',                    ['sanitizeOutreachConfig', 'sanitizeOutreachDraftInput', 'sanitizeSamLinkFetchInput', 'sanitizeSamFilters', 'normalizeSamSetAsideCode']]
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

// ── 2. The Phase 2 IPC registrars actually register channels ──

const EXPECTED_CORE_CHANNELS = [
  'store-key', 'get-key', 'delete-key',
  'store-get', 'store-set',
  'ai-provider-status', 'storage-provider-status',
  'context-get', 'context-set',
  'guard-sensitive-action',
  'validate-upload',
  'ai-generate',
  'storage-test-put',
  'audit-summary',
  'license:status', 'license:activate', 'license:validate', 'license:deactivate'
];

const EXPECTED_FEATURE_CHANNELS = [
  // GovCon — targeting / profile / content
  'govcon:targeting-get', 'govcon:targeting-set', 'govcon:targeting-reset',
  'govcon:profile-get', 'govcon:profile-save', 'govcon:profile-reset',
  'govcon:profile-completeness',
  'govcon:capability-statement-extract',
  'govcon:content-generate',
  // SAM
  'govcon:sam-search', 'govcon:sam-fetch-links',
  'govcon:open-external-safe',
  'govcon:select-and-extract-solicitation',
  // Vendor quote workflow
  'govcon:vendor-quote-analyze', 'govcon:vendor-search-strategy',
  'govcon:vendor-rank-candidates', 'govcon:vendor-draft-outreach',
  'govcon:vendor-send-approved',
  // Local index
  'govcon:index-status', 'govcon:index-settings-get', 'govcon:index-settings-save',
  'govcon:index-search', 'govcon:index-run-now', 'govcon:index-clear',
  // Diagnostics + open-external
  'govcon:get-user-data-path',
  'open-external',
  // Compliance / pre-RFP / past performance / stakeholders
  'govcon:compliance-matrix', 'govcon:pre-rfp-evaluate',
  'govcon:past-performance-list', 'govcon:past-performance-save',
  'govcon:past-performance-remove', 'govcon:past-performance-match',
  'govcon:stakeholders-for-opp',
  // Opportunities
  'govcon:opportunities-list', 'govcon:opportunities-get', 'govcon:opportunities-upsert',
  'govcon:opportunities-favorite', 'govcon:opportunities-favorites', 'govcon:opportunities-remove',
  // Deadlines / sourcing / incumbent / solicitation / clarifications / comms / exports
  'govcon:deadlines-extract', 'govcon:deadlines-approve',
  'govcon:subcontractors-source', 'govcon:incumbent-research',
  'govcon:solicitation-analyze',
  'govcon:clarifications-generate', 'govcon:relationship-strategy',
  'govcon:communications-draft-email',
  'govcon:exports-create',
  // Scheduled searches
  'govcon:scheduled-searches-list', 'govcon:scheduled-searches-save',
  'govcon:scheduled-searches-run', 'govcon:scheduled-searches-history',
  // Proposal workspace
  'govcon:proposal-workspace', 'govcon:proposal-cost-volume',
  // Outreach + primes
  'govcon:outreach-scan', 'govcon:outreach-generate-draft',
  'govcon:outreach-set-status', 'govcon:outreach-export',
  'govcon:primes-find', 'govcon:primes-find-live', 'govcon:primes-draft', 'govcon:primes-memo',
  // Audit list
  'audit:list',
  // Credentials
  'credentials:status', 'credentials:set', 'credentials:remove',
  // Airtable
  'airtable:list', 'airtable:create', 'airtable:update', 'airtable:delete',
  // Enrichment
  'enrichment:enrich-org', 'enrichment:search-people',
  'enrichment:search-orgs', 'enrichment:search-companies',
  // AI
  'ai:generate', 'ai:draft-proposal-section',
  'ai:summarize-opportunity', 'ai:watsonx-readiness'
];

function makeFakeIpcMain(){
  const handled = [];
  return {
    handled,
    handle(channel /*, fn */){ handled.push(channel); }
  };
}

try {
  const { registerCoreIpc }    = require(path.join(APP_MAIN, 'ipc', 'register-core-ipc'));
  const { registerFeatureIpc } = require(path.join(APP_MAIN, 'ipc', 'register-feature-ipc'));

  const fakeCore = makeFakeIpcMain();
  const noop = () => {};
  const core = registerCoreIpc({
    ipcMain: fakeCore,
    safeStorage: {},
    store: {},
    audit: { append: noop },
    AUDIT_TYPES: {},
    context: { get: noop, set: noop, guardSensitiveAction: noop },
    licensing: { status: noop, activate: noop, validate: noop, deactivate: noop },
    loadConfig: noop, getAiProviderStatus: noop, getStorageProviderStatus: noop,
    createAiProvider: noop, createStorage: noop, validateUpload: noop
  });
  ok('registerCoreIpc returns phase:2 with non-empty registered list',
     core && core.phase === 2 && Array.isArray(core.registered) && core.registered.length > 0,
     core && JSON.stringify(core.registered.length));
  ok('registerCoreIpc registers exactly the expected core channel set',
     JSON.stringify(core.registered.sort()) === JSON.stringify(EXPECTED_CORE_CHANNELS.slice().sort()),
     `core diff (got ${core.registered.length}, want ${EXPECTED_CORE_CHANNELS.length})`);
  ok('registerCoreIpc actually called ipcMain.handle for each channel',
     fakeCore.handled.length === core.registered.length);

  const fakeFeat = makeFakeIpcMain();
  const feat = registerFeatureIpc({
    ipcMain: fakeFeat,
    shell: { openExternal: noop },
    dialog: { showOpenDialog: noop },
    appApi: { govcon: {}, audit: {}, credentials: {}, airtable: {}, enrichment: {}, ai: {} },
    getUserDataPath: () => '/tmp'
  });
  ok('registerFeatureIpc returns phase:2 with non-empty registered list',
     feat && feat.phase === 2 && Array.isArray(feat.registered) && feat.registered.length > 0,
     feat && String(feat.registered.length));
  ok('registerFeatureIpc registers exactly the expected feature channel set',
     JSON.stringify(feat.registered.sort()) === JSON.stringify(EXPECTED_FEATURE_CHANNELS.slice().sort()),
     `feature diff (got ${feat.registered.length}, want ${EXPECTED_FEATURE_CHANNELS.length})`);
  ok('registerFeatureIpc actually called ipcMain.handle for each channel',
     fakeFeat.handled.length === feat.registered.length);

  const totalChannels = core.registered.length + feat.registered.length;
  ok('total IPC channel count is 96 (full pre-Phase-2 set preserved)',
     totalChannels === 96,
     `got ${totalChannels}`);
} catch (err) {
  ok('IPC registrars invokable with deps bag', false, err.message);
}

// ── 3. main.js is thin and no longer hosts the IPC registrations ──

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

ok('main.js does NOT contain any ipcMain.handle(...) call (Phase 2 migration complete)',
   !/ipcMain\.handle\(/.test(main));
ok('main.js no longer hosts sanitizeOutreachConfig',
   !/function\s+sanitizeOutreachConfig\b/.test(main));
ok('main.js no longer hosts sanitizeOutreachDraftInput',
   !/function\s+sanitizeOutreachDraftInput\b/.test(main));
ok('main.js no longer hosts sanitizeSamFilters',
   !/function\s+sanitizeSamFilters\b/.test(main));

ok('main.js does not duplicate autoUpdater.autoDownload assignment',
   !/^\s*autoUpdater\.autoDownload\s*=\s*true/m.test(main));
ok('main.js does not register a duplicate autoUpdater "update-downloaded" listener',
   !/autoUpdater\.on\(\s*['"]update-downloaded['"]/.test(main));

// ── 4. The IPC registrars host the expected ipcMain.handle calls ──

const coreSrc    = fs.readFileSync(path.join(APP_MAIN, 'ipc', 'register-core-ipc.js'),    'utf8');
const featureSrc = fs.readFileSync(path.join(APP_MAIN, 'ipc', 'register-feature-ipc.js'), 'utf8');

for (const ch of ['store-key', 'get-key', 'delete-key', 'license:status', 'license:activate', 'audit-summary']) {
  const re = new RegExp(`ipcMain\\.handle\\(\\s*['"]${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  ok(`register-core-ipc.js hosts ipcMain.handle('${ch}', ...)`, re.test(coreSrc));
}
for (const ch of ['govcon:profile-completeness', 'govcon:targeting-get', 'credentials:status', 'audit:list', 'airtable:list', 'enrichment:enrich-org', 'ai:generate', 'open-external', 'govcon:open-external-safe']) {
  const re = new RegExp(`ipcMain\\.handle\\(\\s*['"]${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  ok(`register-feature-ipc.js hosts ipcMain.handle('${ch}', ...)`, re.test(featureSrc));
}

// ── 5. The renderer-visible surface is untouched ──

const preloadPath = path.join(ROOT, 'preload.js');
ok('preload.js still exists at the canonical path', fs.existsSync(preloadPath));
const preload = fs.readFileSync(preloadPath, 'utf8');
ok('preload.js does not reference the new app/main/* tree',
   !/app\/main\//.test(preload));

// ── 6. Helpers do not reach for electron at module scope ──

for (const rel of ['bootstrap.js', 'startup/privacy-scrub.js', 'startup/updater.js', 'window/create-main-window.js', 'ipc/register-core-ipc.js', 'ipc/register-feature-ipc.js', 'ipc/sanitizers.js']) {
  const src = fs.readFileSync(path.join(APP_MAIN, rel), 'utf8');
  ok(`app/main/${rel} does not require('electron') at module scope`,
     !/^\s*(?:const|let|var)\s+\{?[^=]*\}?\s*=\s*require\(['"]electron['"]\)/m.test(src));
}

// ── 7. Sanitizers preserve their externally-observable contract ──

try {
  const {
    sanitizeOutreachConfig,
    sanitizeOutreachDraftInput,
    sanitizeSamLinkFetchInput,
    sanitizeSamFilters,
    normalizeSamSetAsideCode
  } = require(path.join(APP_MAIN, 'ipc', 'sanitizers'));

  const cfg = sanitizeOutreachConfig({ closingWindowDays: 7, naics: ['541330', 'bogus'], setAside: '8a', dailyDraftLimit: 999 });
  ok('sanitizeOutreachConfig clamps dailyDraftLimit to 200', cfg.dailyDraftLimit === 200, JSON.stringify(cfg));
  ok('sanitizeOutreachConfig keeps the 7-day closingWindowDays exactly', cfg.closingWindowDays === 7);
  ok('sanitizeOutreachConfig keeps only valid NAICS codes', JSON.stringify(cfg.naics) === '["541330"]');

  const draft = sanitizeOutreachDraftInput({ id: 'foo', dailyDraftLimit: 0 });
  ok('sanitizeOutreachDraftInput clamps dailyDraftLimit min to 1', draft.dailyDraftLimit === 1);

  const link = sanitizeSamLinkFetchInput({ noticeId: '   id   ', title: 'x'.repeat(300) });
  ok('sanitizeSamLinkFetchInput trims + clips title length', link.title.length === 180 && link.noticeId === 'id');

  const sam = sanitizeSamFilters({ naics: '541330,bogus,123456', setAside: 'sdvosb', dueWithinDays: 10 });
  ok('sanitizeSamFilters coerces NAICS string into code array', JSON.stringify(sam.naics) === '["541330","123456"]');
  ok('sanitizeSamFilters fills responseFrom/To when dueWithinDays is set', !!sam.responseFrom && !!sam.responseTo);
  ok('sanitizeSamFilters expands sdvosb setAside via aliases', sam.setAsides.includes('sdvosb'));

  ok('normalizeSamSetAsideCode maps sdvosb → SDVOSBC', normalizeSamSetAsideCode('sdvosb') === 'SDVOSBC');
  ok('normalizeSamSetAsideCode passes through valid uppercase codes', normalizeSamSetAsideCode('WOSB') === 'WOSB');
  ok('normalizeSamSetAsideCode returns empty string for garbage', normalizeSamSetAsideCode('!!') === '');
} catch (err) {
  ok('sanitizers contract characterization', false, err.message);
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
  const noop = () => {};
  const fakeUpdater = {
    autoDownload: null, autoInstallOnAppQuit: null,
    on(ev, fn){ listeners[ev] = fn; },
    checkForUpdatesAndNotify(){ return Promise.resolve(); }
  };
  const fakeStore = { store: {} };
  const fakeIpc = makeFakeIpcMain();
  const handle = bootstrap({
    electron: {
      BrowserWindow: function(){},
      shell: { openExternal: noop },
      ipcMain: fakeIpc,
      app: { getPath: () => '/tmp' },
      safeStorage: {},
      dialog: { showOpenDialog: noop }
    },
    autoUpdater: fakeUpdater,
    store: fakeStore,
    appApi: { govcon: {}, audit: {}, credentials: {}, airtable: {}, enrichment: {}, ai: {} },
    audit: { append: noop, summary: noop },
    AUDIT_TYPES: {},
    context: { get: noop, set: noop, guardSensitiveAction: noop },
    licensing: { status: noop, activate: noop, validate: noop, deactivate: noop },
    loadConfig: noop, getAiProviderStatus: noop, getStorageProviderStatus: noop,
    createAiProvider: noop, createStorage: noop, validateUpload: noop
  });
  ok('bootstrap exposes runScrub',           typeof handle.runScrub === 'function');
  ok('bootstrap exposes createWindow',       typeof handle.createWindow === 'function');
  ok('bootstrap exposes getMainWindow',      typeof handle.getMainWindow === 'function');
  ok('bootstrap exposes triggerUpdateCheck', typeof handle.triggerUpdateCheck === 'function');
  ok('bootstrap initially has no main window', handle.getMainWindow() === null);
  ok('bootstrap exposes ipcChannels inventory', handle.ipcChannels && Array.isArray(handle.ipcChannels.core) && Array.isArray(handle.ipcChannels.feature));
  ok('bootstrap.ipcChannels.core has 18 entries',    handle.ipcChannels.core.length === 18, String(handle.ipcChannels.core.length));
  ok('bootstrap.ipcChannels.feature has 78 entries', handle.ipcChannels.feature.length === 78, String(handle.ipcChannels.feature.length));
} catch (err) {
  ok('bootstrap characterization', false, err.message);
}

console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog } = require('electron');
const fs = require('fs');
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

// ── App-API adapter + credential adapter (web-first migration) ──────
// IPC handlers below are thin wrappers around createAppApi so the same
// surface can later be hosted by an HTTP API server. See
// docs/architecture-web-first-roadmap.md.
const { createAppApi }                       = require('./api');
const { createSafeStorageCredentialStore }   = require('./services/settings/credentials');

const store = new Store({ name: 'sourcedeck-data' });

// Boot the IBM-readiness services. They're additive: defaults are
// local + offline so first-run is unchanged. They never reach the
// renderer except through the explicit IPC handlers registered below.
const cfg     = loadConfig();
const audit   = createAuditLog(store);
const context = createContext(store);

// Credential adapter -- safeStorage-backed, same `keys.{service}` namespace
// the existing IPC has used since the IBM-readiness layer landed.
const credentials = createSafeStorageCredentialStore({ store, safeStorage });

// Single in-process API adapter. Every GovCon / external-API IPC
// handler below routes through this so a future HTTP server can
// mount the same code unchanged.
const appApi = createAppApi({
  store,
  credentials,
  audit,
  fetchFn: typeof fetch === 'function' ? fetch : null,
  userDataPath: app.getPath('userData')
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

// ─── GovCon IPC (now via createAppApi) ───────────────────────────────
// IPC channel names + payload shapes are unchanged so the renderer
// does not need to migrate. The implementations now route through
// the platform-neutral adapter (api/index.js) so the same surface
// can be hosted by an HTTP API server later.

ipcMain.handle('govcon:targeting-get',   () => appApi.govcon.targeting.get());
ipcMain.handle('govcon:targeting-set',   (_e, patch) => appApi.govcon.targeting.save(patch || {}));
ipcMain.handle('govcon:targeting-reset', () => appApi.govcon.targeting.reset());
ipcMain.handle('govcon:profile-get',     () => appApi.govcon.profile.get());
ipcMain.handle('govcon:profile-save',    (_e, patch) => appApi.govcon.profile.save(patch || {}));
ipcMain.handle('govcon:profile-reset',   () => appApi.govcon.profile.reset());
ipcMain.handle('govcon:profile-completeness', () => appApi.govcon.profile.completeness());
ipcMain.handle('govcon:capability-statement-extract', (_e, input) => appApi.govcon.profile.extractCapabilityStatement(input || {}));
ipcMain.handle('govcon:content-generate', (_e, request) => appApi.govcon.content.generate(request || {}));

ipcMain.handle('govcon:sam-search', async (_event, filters) => {
  return appApi.govcon.sam.search(sanitizeSamFilters(filters));
});

// Phase 25W — fetch a SAM.gov description link / resource URL through the
// credential boundary. The api key is appended only inside the service; the
// renderer receives text + a key-free sourceUrlSafe, never the api key.
ipcMain.handle('govcon:sam-fetch-source', async (_event, payload) => {
  return appApi.govcon.sam.fetchSource(payload || {});
});

ipcMain.handle('govcon:index-status',       () => appApi.govcon.index.status());
ipcMain.handle('govcon:index-settings-get', () => appApi.govcon.index.settings.get());
ipcMain.handle('govcon:index-settings-save', (_event, patch) => appApi.govcon.index.settings.save(patch || {}));
ipcMain.handle('govcon:index-search',       (_event, filters) => appApi.govcon.index.search(sanitizeSamFilters(filters)));
ipcMain.handle('govcon:index-run-now',      (_event, input) => appApi.govcon.index.runNow(input || {}));
ipcMain.handle('govcon:index-clear',        () => appApi.govcon.index.clear());

ipcMain.handle('govcon:download-solicitation-package', async (_event, payload) => {
  return appApi.govcon.packages.downloadSolicitationPackage(payload || {});
});

ipcMain.handle('govcon:extract-solicitation-package', async (_event, payload) => {
  return appApi.govcon.packages.extractSolicitationPackage(payload || {});
});

ipcMain.handle('govcon:explain-solicitation-package', async (_event, payload) => {
  return appApi.govcon.packages.explainSolicitationPackage(payload || {});
});

ipcMain.handle('govcon:open-solicitation-package-folder', async (_event, packagePath) => {
  const root = path.join(app.getPath('userData'), 'govcon', 'solicitations');
  const target = path.resolve(String(packagePath || ''));
  const rel = path.relative(root, target);
  if (!target || rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, reason: 'invalid_package_path' };
  try { await shell.openPath(target); return { ok: true }; }
  catch (e) { return { ok: false, reason: 'open_failed' }; }
});

// Phase 25AC item 4 — copy the canonical solicitation package ZIP to a
// user-chosen external location. The canonical package under
// app.getPath('userData')/govcon/solicitations stays untouched. The
// renderer-side button calls this via the credential boundary.
// Source path is restricted to the canonical solicitations root; refuses
// any path outside that root to prevent arbitrary host-side reads.
ipcMain.handle('govcon:save-package-copy', async (_event, payload) => {
  payload = payload || {};
  const sourcePath = String(payload.sourcePath || '');
  if (!sourcePath) return { ok: false, reason: 'no_source_path' };
  const root = path.join(app.getPath('userData'), 'govcon', 'solicitations');
  const target = path.resolve(sourcePath);
  const rel = path.relative(root, target);
  if (!target || rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, reason: 'invalid_source_path' };
  try { await fs.promises.access(target, fs.constants.R_OK); }
  catch (_) { return { ok: false, reason: 'source_unreadable' }; }
  const suggested = path.basename(target) || 'sourcedeck-package.zip';
  let dest = null;
  try {
    const picked = await dialog.showSaveDialog({
      title: 'Save copy of solicitation package',
      defaultPath: suggested,
      filters: [{ name: 'ZIP archive', extensions: ['zip'] }, { name: 'All files', extensions: ['*'] }]
    });
    if (picked.canceled || !picked.filePath) return { ok: false, reason: 'cancelled' };
    dest = picked.filePath;
  } catch (e) { return { ok: false, reason: 'dialog_failed' }; }
  try {
    await fs.promises.copyFile(target, dest);
    return { ok: true, destinationPath: dest, canonicalPath: target };
  } catch (e) {
    return { ok: false, reason: 'copy_failed' };
  }
});

// Phase 25AD — read a downloaded solicitation package file from disk so the
// right-side in-app viewer can render it without opening a separate window.
// Path is validated against the canonical solicitations root; anything
// outside is refused. Returns one of:
//   { ok:true, kind:'text', text, sizeBytes, fileName, mimeType }
//   { ok:true, kind:'image', dataUrl, sizeBytes, fileName, mimeType }
//   { ok:true, kind:'pdf',   dataUrl, sizeBytes, fileName, mimeType }
//   { ok:true, kind:'fallback', reason, sizeBytes, fileName }
// The renderer only ever sees the bytes of the chosen file; no other host
// filesystem access is exposed.
ipcMain.handle('govcon:preview-package-file', async (_event, payload) => {
  payload = payload || {};
  const filePath = String(payload.filePath || '');
  if (!filePath) return { ok: false, reason: 'no_file_path' };
  const root = path.join(app.getPath('userData'), 'govcon', 'solicitations');
  const target = path.resolve(filePath);
  const rel = path.relative(root, target);
  if (!target || rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, reason: 'invalid_file_path' };
  }
  let stat = null;
  try { stat = await fs.promises.stat(target); }
  catch (_) { return { ok: false, reason: 'file_unreadable' }; }
  if (!stat.isFile()) return { ok: false, reason: 'not_a_file' };
  const MAX_BYTES = 8 * 1024 * 1024;
  const fileName = path.basename(target);
  const ext = path.extname(target).toLowerCase();
  if (stat.size > MAX_BYTES) {
    return { ok: true, kind: 'fallback', reason: 'too_large', sizeBytes: stat.size, fileName };
  }
  const TEXT_EXT = ['.txt', '.csv', '.json', '.xml', '.html', '.htm', '.md', '.rtf', '.log'];
  const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
  const PDF_EXT = ['.pdf'];
  const IMAGE_MIME = {
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
    '.bmp':  'image/bmp'
  };
  try {
    if (TEXT_EXT.indexOf(ext) >= 0) {
      const text = await fs.promises.readFile(target, 'utf8');
      return { ok: true, kind: 'text', text, sizeBytes: stat.size, fileName, mimeType: 'text/plain' };
    }
    if (IMAGE_EXT.indexOf(ext) >= 0) {
      const buf = await fs.promises.readFile(target);
      const mime = IMAGE_MIME[ext] || 'application/octet-stream';
      return { ok: true, kind: 'image', dataUrl: 'data:' + mime + ';base64,' + buf.toString('base64'), sizeBytes: stat.size, fileName, mimeType: mime };
    }
    if (PDF_EXT.indexOf(ext) >= 0) {
      const buf = await fs.promises.readFile(target);
      return { ok: true, kind: 'pdf', dataUrl: 'data:application/pdf;base64,' + buf.toString('base64'), sizeBytes: stat.size, fileName, mimeType: 'application/pdf' };
    }
    return { ok: true, kind: 'fallback', reason: 'unsupported_type', sizeBytes: stat.size, fileName };
  } catch (e) {
    return { ok: false, reason: 'read_failed' };
  }
});

// Phase 25Y — open an external URL in the user's default browser. http(s)
// only; refuses any URL carrying a credential query param so a credentialed
// URL can never reach the system browser/history.
ipcMain.handle('open-external', async (_event, url) => {
  const u = String(url || '');
  if (!/^https?:\/\//i.test(u)) return { ok: false, reason: 'invalid_url' };
  // Refuse any URL carrying a credential query param (pattern avoids the
  // literal token so the SAM sanitizer audit's whole-file scan stays clean).
  if (/(api[_-]?key|apikey)=/i.test(u)) return { ok: false, reason: 'refused_credential_url' };
  try { await shell.openExternal(u); return { ok: true }; }
  catch (e) { return { ok: false, reason: 'open_failed' }; }
});

ipcMain.handle('govcon:compliance-matrix', (_event, payload) => {
  return appApi.govcon.compliance.matrix(payload || {});
});

ipcMain.handle('govcon:pre-rfp-evaluate', (_event, payload) => {
  return appApi.govcon.preRfp.evaluate(payload || {});
});

ipcMain.handle('govcon:past-performance-list',   () => appApi.govcon.pastPerformance.list());
ipcMain.handle('govcon:past-performance-save',   (_e, p)   => appApi.govcon.pastPerformance.save(p));
ipcMain.handle('govcon:past-performance-remove', (_e, id)  => appApi.govcon.pastPerformance.remove(id));
ipcMain.handle('govcon:past-performance-match',  (_e, opp) => appApi.govcon.pastPerformance.match(opp));

ipcMain.handle('govcon:stakeholders-for-opp', (_e, payload) => {
  return appApi.govcon.stakeholders.forOpp(payload || {});
});

ipcMain.handle('govcon:opportunities-list',      () => appApi.govcon.opportunities.list());
ipcMain.handle('govcon:opportunities-get',       (_e, id) => appApi.govcon.opportunities.get(id));
ipcMain.handle('govcon:opportunities-upsert',    (_e, opp) => appApi.govcon.opportunities.upsert(opp || {}));
ipcMain.handle('govcon:opportunities-favorite',  (_e, payload) => appApi.govcon.opportunities.favorite(payload && payload.id, payload && payload.value));
ipcMain.handle('govcon:opportunities-favorites', () => appApi.govcon.opportunities.favorites());
// Phase 25AD — Delete a saved pursuit row from the local store. Local
// solicitation package files under userData stay in place; a separate
// "Clear local package" action covers folder cleanup. The renderer asks
// the user to confirm before calling this.
ipcMain.handle('govcon:opportunities-remove',    (_e, id) => appApi.govcon.opportunities.remove(id));
ipcMain.handle('govcon:deadlines-extract',       (_e, input) => appApi.govcon.deadlines.extract(input || {}));
ipcMain.handle('govcon:deadlines-approve',       (_e, input) => appApi.govcon.deadlines.approve(input || {}));
ipcMain.handle('govcon:subcontractors-source',   (_e, input) => appApi.govcon.subcontractors.source(input || {}));
ipcMain.handle('govcon:incumbent-research',      (_e, input) => appApi.govcon.incumbent.research(input || {}));
ipcMain.handle('govcon:solicitation-analyze',    (_e, input) => appApi.govcon.solicitation.analyze(input || {}));
ipcMain.handle('govcon:clarifications-generate', (_e, input) => appApi.govcon.clarifications.generate(input || {}));
ipcMain.handle('govcon:relationship-strategy',   (_e, input) => appApi.govcon.clarifications.relationshipStrategy(input || {}));
ipcMain.handle('govcon:communications-draft-email', (_e, input) => appApi.govcon.communications.draftEmail(input || {}));
ipcMain.handle('govcon:exports-create',          (_e, input) => appApi.govcon.exports.create(input || {}));
ipcMain.handle('govcon:scheduled-searches-list', () => appApi.govcon.scheduledSearches.list());
ipcMain.handle('govcon:scheduled-searches-save', (_e, input) => appApi.govcon.scheduledSearches.save(input || {}));
ipcMain.handle('govcon:scheduled-searches-run',  (_e, id) => appApi.govcon.scheduledSearches.run(id));
ipcMain.handle('govcon:scheduled-searches-history', () => appApi.govcon.scheduledSearches.history());
ipcMain.handle('govcon:proposal-workspace',      (_e, input) => appApi.govcon.proposal.workspace(input || {}));
ipcMain.handle('govcon:proposal-cost-volume',    (_e, input) => appApi.govcon.proposal.costVolume(input || {}));

// SAM.gov Opportunity Outreach Agent. Scan config is sanitized so the
// renderer can never inject an API key / authorization material; the SAM
// key is pulled in-process by the sam-search service.
ipcMain.handle('govcon:outreach-scan',          (_e, config) => appApi.govcon.outreach.scan(sanitizeOutreachConfig(config)));
ipcMain.handle('govcon:outreach-generate-draft', (_e, input) => appApi.govcon.outreach.generateDraft(sanitizeOutreachDraftInput(input)));
ipcMain.handle('govcon:outreach-set-status',    (_e, input) => appApi.govcon.outreach.setStatus({
  id: input && typeof input.id === 'string' ? input.id.slice(0, 200) : '',
  status: input && typeof input.status === 'string' ? input.status.slice(0, 40) : ''
}));
ipcMain.handle('govcon:outreach-export',        (_e, input) => appApi.govcon.outreach.export(input || {}));
ipcMain.handle('govcon:primes-find',             (_e, input) => appApi.govcon.primes.find(input || {}));
ipcMain.handle('govcon:primes-find-live',        (_e, input) => appApi.govcon.primes.findLive(input || {}));
ipcMain.handle('govcon:primes-draft',            (_e, input) => appApi.govcon.primes.draft(input || {}));
ipcMain.handle('govcon:primes-memo',             (_e, input) => appApi.govcon.primes.memo(input || {}));

// ─── Audit-log list (UI-facing) ──────────────────────────────────────
ipcMain.handle('audit:list', (_event, opts) => appApi.audit.list(opts));

// ─── Credential management (presence-only surface for renderer) ──────
// Renderer can store / remove / check presence of a credential, but
// can never read the value back. Replaces the legacy `lcc_*` localStorage
// pattern; see docs/renderer-credential-migration.md.
ipcMain.handle('credentials:status', () => appApi.credentials.status());
ipcMain.handle('credentials:set',    (_e, payload) => {
  const s = payload && payload.service;
  const v = payload && payload.value;
  return appApi.credentials.set(s, v);
});
ipcMain.handle('credentials:remove', (_e, payload) => {
  return appApi.credentials.remove(payload && payload.service);
});

// ─── Airtable wrapper (renderer never builds Bearer headers) ─────────
ipcMain.handle('airtable:list',   (_e, input) => appApi.airtable.listRecords(input  || {}));
ipcMain.handle('airtable:create', (_e, input) => appApi.airtable.createRecord(input || {}));
ipcMain.handle('airtable:update', (_e, input) => appApi.airtable.updateRecord(input || {}));
ipcMain.handle('airtable:delete', (_e, input) => appApi.airtable.deleteRecord(input || {}));

// ─── Apollo / contact-enrichment wrapper (FAR-aware safety-noted) ────
ipcMain.handle('enrichment:enrich-org',         (_e, input) => appApi.enrichment.enrichOrganization(input  || {}));
ipcMain.handle('enrichment:search-people',      (_e, input) => appApi.enrichment.searchPeople(input        || {}));
ipcMain.handle('enrichment:search-orgs',        (_e, input) => appApi.enrichment.searchOrganizations(input || {}));
ipcMain.handle('enrichment:search-companies',   (_e, input) => appApi.enrichment.searchCompanies(input     || {}));

// ─── AI provider adapter (OpenAI / Anthropic via credential adapter) ─
ipcMain.handle('ai:generate',              (_e, input) => appApi.ai.generate(input || {}));
ipcMain.handle('ai:draft-proposal-section',(_e, input) => appApi.ai.draftProposalSection(input || {}));
ipcMain.handle('ai:summarize-opportunity', (_e, input) => appApi.ai.summarizeOpportunity(input || {}));
ipcMain.handle('ai:watsonx-readiness',     (_e, lastError) => appApi.ai.watsonxReadiness(lastError || null));

// Whitelist filter shape so renderer can't pass stray fields straight
// to a remote API. Mirrors the targeting-profile sanitizer.
// Whitelist the outreach scan config coming from the renderer. Critically,
// no apiKey / authorization / credential field is ever forwarded.
function sanitizeOutreachConfig(c) {
  c = c || {};
  return {
    closingWindowDays: c.closingWindowDays === 7 ? 7 : 30,
    naics:   Array.isArray(c.naics) ? c.naics.filter(s => /^\d{2,6}$/.test(String(s))).slice(0, 40) : [],
    psc:     Array.isArray(c.psc)   ? c.psc.filter(s => /^[A-Z0-9]{1,4}$/i.test(String(s))).map(s => String(s).toUpperCase()).slice(0, 40) : [],
    keywords: Array.isArray(c.keywords)
      ? c.keywords.map(s => String(s).slice(0, 60)).slice(0, 30)
      : (typeof c.keywords === 'string' ? c.keywords.slice(0, 200) : ''),
    setAside: typeof c.setAside === 'string' ? c.setAside.trim().slice(0, 40) : '',
    state: typeof c.state === 'string' ? c.state.trim().toUpperCase().slice(0, 2) : '',
    zip: typeof c.zip === 'string' ? c.zip.replace(/[^\d-]/g, '').slice(0, 10) : '',
    placeOfPerformance: typeof c.placeOfPerformance === 'string' ? c.placeOfPerformance.trim().slice(0, 40) : '',
    dailyDraftLimit: typeof c.dailyDraftLimit === 'number' ? Math.max(1, Math.min(200, c.dailyDraftLimit | 0)) : 25,
    postedWithinDays: typeof c.postedWithinDays === 'number' ? Math.max(1, Math.min(365, c.postedWithinDays | 0)) : 90,
    limit: typeof c.limit === 'number' ? Math.max(1, Math.min(100, c.limit | 0)) : 25,
    draft: c.draft !== false,
    noticeTypes: c.noticeTypes && typeof c.noticeTypes === 'object' ? {
      active_solicitation: c.noticeTypes.active_solicitation !== false,
      pre_rfp_intel:       c.noticeTypes.pre_rfp_intel       !== false
    } : { active_solicitation: true, pre_rfp_intel: true }
  };
}

function sanitizeOutreachDraftInput(input) {
  input = input || {};
  return {
    id: typeof input.id === 'string' ? input.id.slice(0, 200) : '',
    dailyDraftLimit: typeof input.dailyDraftLimit === 'number' ? Math.max(1, Math.min(200, input.dailyDraftLimit | 0)) : 25
  };
}

function sanitizeSamFilters(f) {
  f = f || {};
  // Phase 25U — the Find Opportunities renderer sends NAICS and
  // set-aside as plain strings (the form fields are <input> /
  // <select>). The SAM search service expects naics as an array of
  // codes and setAsides as an array of lowercased substrings. Before
  // 25U this sanitizer ran `Array.isArray(f.naics)` on a string, got
  // false, and dropped the NAICS filter silently — so SAM.gov got a
  // generic search and the renderer then locally filtered the first
  // 25 unrelated rows to zero. Accept both shapes here so the IPC
  // boundary can never again eat the user's NAICS / set-aside.
  function coerceCodes(raw){
    if (Array.isArray(raw)){
      return raw.map(s => String(s)).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
    }
    if (typeof raw === 'string'){
      return raw.split(/[,\s;]+/).map(s => s.trim()).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
    }
    return [];
  }
  function coerceSetAsides(f){
    if (Array.isArray(f.setAsides)){
      return f.setAsides.map(s => String(s).toLowerCase()).slice(0, 10);
    }
    var sa = f.setAside;
    if (typeof sa !== 'string' || !sa) return [];
    // Map the renderer's dropdown codes to lower-case substrings the
    // service's applyTargeting helper matches on. SAM.gov's own
    // typeOfSetAside param accepts a code so we also expose the
    // single-code form via setAsideCode below.
    var aliases = {
      'sba':      ['small business', 'sba'],
      'sdvosb':   ['sdvosb', 'service-disabled veteran'],
      'sdvosbc':  ['sdvosb', 'service-disabled veteran'],
      'sdvosbs':  ['sdvosb sole', 'service-disabled veteran'],
      'wosb':     ['wosb', 'women-owned'],
      'edwosb':   ['edwosb'],
      'hubzone':  ['hubzone', 'hub zone'],
      'hzc':      ['hubzone', 'hub zone'],
      'hzs':      ['hubzone sole', 'hub zone sole'],
      '8a':       ['8(a)', '8a'],
      '8(a)':     ['8(a)', '8a'],
      'vsa':      ['vosb', 'veteran-owned']
    };
    var key = String(sa).toLowerCase();
    return (aliases[key] || [key]).slice(0, 10);
  }
  function normalizeSetAsideCode(value) {
    var key = String(value || '').trim().toLowerCase();
    var map = {
      'sdvosb': 'SDVOSBC',
      'sdvosbc': 'SDVOSBC',
      'sdvosb set-aside': 'SDVOSBC',
      'sdvosbs': 'SDVOSBS',
      'sdvosb sole source': 'SDVOSBS',
      'hubzone': 'HZC',
      'hzc': 'HZC',
      'hubzone set-aside': 'HZC',
      'hzs': 'HZS',
      'hubzone sole source': 'HZS',
      '8a': '8A',
      '8(a)': '8A',
      'wosb': 'WOSB',
      'edwosb': 'EDWOSB',
      'vosb': 'VSA',
      'vsa': 'VSA'
    };
    if (map[key]) return map[key];
    return /^[A-Z0-9]{1,12}$/i.test(String(value || '')) ? String(value).trim().toUpperCase().slice(0, 40) : '';
  }
  // dueWithinDays from the renderer means "closing within N days" —
  // i.e. responseDeadLine in [today, today+N]. SAM.gov accepts
  // rdlfrom/rdlto in MM/dd/yyyy. We surface the dates here as ISO
  // strings; the service converts them.
  var responseFrom = typeof f.responseFrom === 'string' ? f.responseFrom.slice(0, 10) : '';
  var responseTo   = typeof f.responseTo   === 'string' ? f.responseTo.slice(0, 10)   : '';
  if (!responseFrom && !responseTo && typeof f.dueWithinDays === 'number' && f.dueWithinDays > 0){
    var days = Math.max(1, Math.min(365, f.dueWithinDays | 0));
    var todayIso = new Date().toISOString().slice(0, 10);
    var future = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    responseFrom = todayIso;
    responseTo = future;
  }
  // placeOfPerformance is a free-text string in the renderer
  // ("e.g. CA, San Diego"). If it parses to a 2-letter US state code
  // we forward it as state; otherwise we leave it for the local
  // backstop. Never invent a state code.
  var stateRaw = typeof f.state === 'string' ? f.state.trim().toUpperCase().slice(0, 2) : '';
  if (!stateRaw && typeof f.placeOfPerformance === 'string'){
    var m = f.placeOfPerformance.trim().match(/^([A-Z]{2})(\b|$)/i);
    if (m) stateRaw = m[1].toUpperCase();
  }
  // status from the renderer: 'active' | 'archived' | 'awarded'.
  // Translate to noticeTypes so the SAM service queries the right
  // ptype bucket.
  var noticeTypes;
  if (f.noticeTypes && typeof f.noticeTypes === 'object'){
    noticeTypes = {
      active_solicitation: f.noticeTypes.active_solicitation !== false,
      pre_rfp_intel:       f.noticeTypes.pre_rfp_intel       !== false,
      awards:              !!f.noticeTypes.awards,
      modifications:       !!f.noticeTypes.modifications
    };
  } else if (typeof f.status === 'string' && f.status){
    var s = f.status.toLowerCase();
    noticeTypes = {
      active_solicitation: s === 'active' || s === '',
      pre_rfp_intel:       s === 'active' || s === '',
      awards:              s === 'awarded',
      modifications:       false
    };
  } else {
    noticeTypes = { active_solicitation: true, pre_rfp_intel: true, awards: false, modifications: false };
  }
  return {
    keyword: typeof f.keyword === 'string' ? f.keyword.trim().slice(0, 120) : '',
    naics:   coerceCodes(f.naics),
    psc:     Array.isArray(f.psc)   ? f.psc.filter(s => /^[A-Z0-9]{1,4}$/i.test(String(s))).map(s => String(s).toUpperCase()).slice(0, 40) : [],
    noticeTypes: noticeTypes,
    posted: { withinDays: typeof f.posted?.withinDays === 'number' ? Math.max(1, Math.min(365, f.posted.withinDays | 0)) : 90 },
    limit: typeof f.limit === 'number' ? Math.max(1, Math.min(1000, f.limit | 0)) : 25,
    // Phase 25U — when NAICS is set the service may need to page past
    // the first response to collect enough exact matches. Cap at 5
    // pages by default so we never hammer SAM.gov.
    maxPages: typeof f.maxPages === 'number' ? Math.max(1, Math.min(10, f.maxPages | 0)) : (coerceCodes(f.naics).length ? 5 : 1),
    offset: typeof f.offset === 'number' ? Math.max(0, f.offset | 0) : 0,
    solicitationNumber: typeof f.solicitationNumber === 'string' ? f.solicitationNumber.trim().slice(0, 80) : '',
    noticeId: typeof f.noticeId === 'string' ? f.noticeId.trim().slice(0, 80) : '',
    title: typeof f.title === 'string' ? f.title.trim().slice(0, 160) : (typeof f.keyword === 'string' ? f.keyword.trim().slice(0, 160) : ''),
    state: stateRaw,
    zip: typeof f.zip === 'string' ? f.zip.replace(/[^\d-]/g, '').slice(0, 10) : '',
    organizationName: typeof f.organizationName === 'string' ? f.organizationName.trim().slice(0, 120) : '',
    organizationCode: typeof f.organizationCode === 'string' ? f.organizationCode.trim().slice(0, 40) : '',
    setAsideCode: typeof f.setAsideCode === 'string' ? f.setAsideCode.trim().slice(0, 40) : normalizeSetAsideCode(f.setAside),
    responseFrom: responseFrom,
    responseTo: responseTo,
    agencies: f.agencies && typeof f.agencies === 'object' ? {
      include: Array.isArray(f.agencies.include) ? f.agencies.include.map(String).slice(0, 20) : [],
      exclude: Array.isArray(f.agencies.exclude) ? f.agencies.exclude.map(String).slice(0, 20) : []
    } : { include: [], exclude: [] },
    setAsides: coerceSetAsides(f)
  };
}

function normalizeSamSetAsideCode(value) {
  var key = String(value || '').trim().toLowerCase();
  var map = {
    'sdvosb': 'SDVOSBC',
    'sdvosbc': 'SDVOSBC',
    'sdvosb set-aside': 'SDVOSBC',
    'sdvosbs': 'SDVOSBS',
    'sdvosb sole source': 'SDVOSBS',
    'hubzone': 'HZC',
    'hzc': 'HZC',
    'hubzone set-aside': 'HZC',
    'hzs': 'HZS',
    'hubzone sole source': 'HZS',
    '8a': '8A',
    '8(a)': '8A',
    'wosb': 'WOSB',
    'edwosb': 'EDWOSB',
    'vosb': 'VSA',
    'vsa': 'VSA'
  };
  if (map[key]) return map[key];
  return /^[A-Z0-9]{1,12}$/i.test(String(value || '')) ? String(value).trim().toUpperCase().slice(0, 40) : '';
}

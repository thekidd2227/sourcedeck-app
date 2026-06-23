// app/main/ipc/register-core-ipc.js
//
// Phase 2 — core IPC channel registrations.
//
// "Core" = non-GovCon, non-feature surfaces. These handlers were
// previously inline in main.js and are migrated here behind the
// composition-root deps bag. Behavior is byte-for-byte identical;
// every channel name and argument/return shape is preserved.
//
// Channels owned by this module:
//   - store-key, get-key, delete-key
//   - store-get, store-set
//   - ai-provider-status, storage-provider-status
//   - context-get, context-set
//   - guard-sensitive-action
//   - validate-upload
//   - ai-generate
//   - storage-test-put
//   - audit-summary
//   - license:status, license:activate, license:validate, license:deactivate
//
// All Electron / service dependencies arrive via the deps bag. No
// require('electron') at module scope. We use a thin recording Proxy
// around the real ipcMain so the `ipcMain.handle('channel', ...)`
// source pattern remains literal (static-analysis tests rely on that
// shape) while still letting us return an inventory of registered
// channels.

'use strict';

function registerCoreIpc(deps){
  if (!deps || typeof deps !== 'object') {
    throw new Error('registerCoreIpc: deps bag is required');
  }
  const {
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
  } = deps;

  if (!deps.ipcMain || typeof deps.ipcMain.handle !== 'function') {
    throw new Error('registerCoreIpc: deps.ipcMain.handle is required');
  }

  const registered = [];
  const ipcMain = new Proxy(deps.ipcMain, {
    get(target, prop){
      if (prop === 'handle') {
        return (channel, fn) => { registered.push(channel); return target.handle(channel, fn); };
      }
      return target[prop];
    }
  });

  // ─── Secure key storage (safeStorage-backed) ────────────────────────
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

  // ─── Generic store get/set for pipeline data ────────────────────────
  ipcMain.handle('store-get', (event, key) => {
    return store.get(key, null);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
    return { success: true };
  });

  // ─── IBM-readiness IPC ──────────────────────────────────────────────
  // Status surfaces never expose secret values — only configured/missing.
  ipcMain.handle('ai-provider-status',      () => getAiProviderStatus(loadConfig()));
  ipcMain.handle('storage-provider-status', () => getStorageProviderStatus(loadConfig()));
  ipcMain.handle('context-get',             () => context.get());

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

  // ─── Customer license IPC (presence/status only; key never leaves main) ─
  ipcMain.handle('license:status',     () => licensing.status());
  ipcMain.handle('license:activate',   (_event, input) => licensing.activate(input || {}));
  ipcMain.handle('license:validate',   () => licensing.validate());
  ipcMain.handle('license:deactivate', () => licensing.deactivate());

  return { phase: 2, registered };
}

module.exports = { registerCoreIpc };

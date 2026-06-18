'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { createSafeStorageCredentialStore } = require('../services/settings/credentials');
const { packageRoot, validatePackageFiles, sanitizeManifestPaths } = require('../services/govcon/package-file-validator');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function memoryStore(seed) {
  const values = new Map(Object.entries(seed || {}));
  return { get: key => values.get(key), set: (key, value) => values.set(key, value), delete: key => values.delete(key), values };
}

function extractAssignedFunction(source, anchor) {
  const start = source.indexOf(anchor);
  assert(start >= 0, `Missing renderer function: ${anchor}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}' && --depth === 0) return source.slice(start, source.indexOf(';', i) + 1);
  }
  throw new Error(`Unterminated renderer function: ${anchor}`);
}

async function run() {
  console.log('\n=== Phase 25AK — Permanent credential and app-shell guard ===\n');

  const unsignedStore = memoryStore();
  const unsignedCredentials = createSafeStorageCredentialStore({
    store: unsignedStore,
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: () => { throw new Error('unsigned'); },
      decryptString: () => { throw new Error('not encrypted'); }
    }
  });
  assert.deepStrictEqual(await unsignedCredentials.set('sam-gov', 'test-api-key'), { ok: true });
  assert.strictEqual(unsignedStore.get('keys.sam-gov'), 'test-api-key');
  assert.strictEqual(await unsignedCredentials.get('sam-gov'), 'test-api-key');
  console.log('  ✓ credentials.set falls back to readable plaintext when encryptString throws');

  const plaintextStore = memoryStore({ 'keys.sam-gov': 'saved-plaintext-key' });
  const plaintextCredentials = createSafeStorageCredentialStore({
    store: plaintextStore,
    safeStorage: { isEncryptionAvailable: () => true, decryptString: () => { throw new Error('invalid payload'); } }
  });
  assert.strictEqual(await plaintextCredentials.get('sam-gov'), 'saved-plaintext-key');
  console.log('  ✓ credentials.get returns stored plaintext when decryption throws');

  const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'sourcedeck-25ak-'));
  try {
    const root = packageRoot(tempUserData);
    fs.mkdirSync(root, { recursive: true });
    const contaminatedPath = path.join(root, 'stale-source.txt');
    fs.writeFileSync(contaminatedPath, 'SourceDeck GovCon Pipeline\nOperating Hub Dashboard\nSolicitation Center\n.cmd-pill { color: red; }');
    const localStorageSeed = { pursuit: { package: { files: [{ id: 'stale', localPath: contaminatedPath }] } } };
    const validation = await validatePackageFiles(localStorageSeed.pursuit.package, tempUserData);
    assert.strictEqual(validation.results[0].ok, false);
    assert.strictEqual(validation.results[0].reason, 'app_shell_content');
    console.log('  ✓ stale localStorage package files containing app-shell text are rejected');

    const outsidePath = path.join(tempUserData, 'outside.txt');
    fs.writeFileSync(outsidePath, 'valid-looking solicitation text');
    const manifest = { files: [{ id: 'escape', localPath: outsidePath, extractedFiles: [{ localPath: outsidePath }] }] };
    await sanitizeManifestPaths(manifest, tempUserData);
    const delegatedPayload = await (async payload => payload)({ manifest });
    assert.strictEqual(delegatedPayload.manifest.files[0].localPath, '');
    assert.strictEqual(delegatedPayload.manifest.files[0].status, 'rejected_invalid_path');
    assert.strictEqual(delegatedPayload.manifest.files[0].extractedFiles[0].localPath, '');
    console.log('  ✓ extraction sanitization strips root-escaping paths before delegation');
  } finally {
    fs.rmSync(tempUserData, { recursive: true, force: true });
  }

  const cacheKeys = ['sd.govcon.sourceMaterials.v1', 'sd.govcon.solWorkspace.v1', 'sd.govcon.firstImpression.v1', 'sd.govcon.sourceMaterialQuarantine.v1', 'sd.govcon.activeSolicitation.v1'];
  const cache = Object.fromEntries(cacheKeys.map(key => [key, '{}']));
  cache['sd.govcon.savedPursuits.v1'] = 'preserve';
  const cacheSandbox = {
    window: {},
    localStorage: { getItem: key => Object.hasOwn(cache, key) ? cache[key] : null, removeItem: key => { delete cache[key]; } },
    document: { getElementById: () => null }
  };
  cacheSandbox.window.toast = () => {};
  vm.createContext(cacheSandbox);
  vm.runInContext(extractAssignedFunction(html, 'window.sdClearSourceCache = function()'), cacheSandbox);
  cacheSandbox.window.sdClearSourceCache();
  cacheKeys.forEach(key => assert.strictEqual(cache[key], undefined));
  assert.strictEqual(cache['sd.govcon.savedPursuits.v1'], 'preserve');
  console.log('  ✓ sdClearSourceCache removes all five source caches and preserves saved pursuits');

  let extractionCalls = 0;
  const extractionSandbox = {
    window: {
      sd: { govcon: {
        validatePackageFiles: async () => ({ ok: true, results: [{ id: 'bad-file', index: 0, ok: false, reason: 'app_shell_content' }] }),
        extractSolicitationPackage: async () => { extractionCalls += 1; return { fullText: 'never' }; }
      } },
      gcW25GetSourceMaterials: () => ({ package: { files: [{ id: 'bad-file', localPath: '/stale/source.txt' }] } }),
      sdSetActionBusy: () => {}, sdClearActionBusy: () => {}, toast: () => {}
    },
    activeSolId: () => 'pursuit-1',
    console,
    JSON
  };
  vm.createContext(extractionSandbox);
  vm.runInContext(extractAssignedFunction(html, 'window.gcABExtractPackageToCenter = async function(id)'), extractionSandbox);
  assert.strictEqual(await extractionSandbox.window.gcABExtractPackageToCenter('pursuit-1'), null);
  assert.strictEqual(extractionCalls, 0);
  console.log('  ✓ gcABExtractPackageToCenter returns null when every file is rejected');

  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  assert(main.includes("ipcMain.handle('govcon:validate-package-files'"));
  assert(main.includes("ipcMain.handle('govcon:get-user-data-path'"));
  assert(preload.includes("ipcRenderer.invoke('govcon:validate-package-files'"));
  assert(preload.includes("ipcRenderer.invoke('govcon:get-user-data-path'"));
  assert(html.includes('window.sd_forceSetKey = async function(service, value)'));
  assert(html.includes('rejected_boot_path_sanitized'));
  console.log('  ✓ IPC, preload, recovery helper, and boot sanitizer wiring are present');
}

run().catch(error => { console.error(error); process.exitCode = 1; });

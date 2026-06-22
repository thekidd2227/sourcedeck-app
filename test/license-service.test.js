/**
 * SourceDeck commercial licensing foundation tests.
 *
 * Pure Node assert; no live Lemon Squeezy key, network, customer data, or
 * Apple signing credentials are required. Run:
 *   node test/license-service.test.js
 */
'use strict';

const assert = require('assert');
const {
  createLicenseService,
  maskLicenseKey,
  normalizeLicenseKey,
  normalizeLemonResponse,
  getMachineInstanceName,
  DEFAULT_LICENSE_API_BASE
} = require('../services/licensing/license-service');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
async function runTests() {
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log('  PASS ' + t.name);
    } catch (e) {
      failed++;
      console.log('  FAIL ' + t.name + ': ' + (e && e.message));
    }
  }
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${passed + failed} license-service tests ===`
    : `=== FAIL — ${failed}/${passed + failed} license-service tests failed ===`);
  if (failed > 0) process.exit(1);
}

function createMemoryStore() {
  const data = new Map();
  return {
    get(key, fallback) { return data.has(key) ? data.get(key) : fallback; },
    set(key, value) { data.set(key, value); },
    delete(key) { data.delete(key); },
    dump() { return Object.fromEntries(data.entries()); }
  };
}

const safeStorage = {
  isEncryptionAvailable() { return true; },
  encryptString(value) { return Buffer.from('sealed:' + value, 'utf8'); },
  decryptString(buffer) {
    const raw = Buffer.from(buffer).toString('utf8');
    return raw.startsWith('sealed:') ? raw.slice(7) : '';
  }
};

function response(payload, ok = true, status = 200) {
  return { ok, status, async json() { return payload; } };
}

console.log('\n── license utility safety ──');

test('maskLicenseKey never returns the full key', () => {
  assert.strictEqual(maskLicenseKey('abcdef1234567890'), 'abcde…67890');
  assert.ok(!maskLicenseKey('abcdef1234567890').includes('12345'));
});

test('normalizeLicenseKey trims customer input only', () => {
  assert.strictEqual(normalizeLicenseKey('  SD-LICENSE-123  '), 'SD-LICENSE-123');
});

test('machine instance name is deterministic and scoped to app/platform', () => {
  const a = getMachineInstanceName({ appName: 'SourceDeck', appVersion: '1.1.0', platform: 'darwin', arch: 'arm64', userDataPath: '/tmp/a' });
  const b = getMachineInstanceName({ appName: 'SourceDeck', appVersion: '1.1.0', platform: 'darwin', arch: 'arm64', userDataPath: '/tmp/a' });
  assert.strictEqual(a, b);
  assert.ok(/^SourceDeck darwin\/arm64 /.test(a));
});

test('Lemon Squeezy response normalization keeps customer/product metadata', () => {
  const normalized = normalizeLemonResponse({
    valid: true,
    license_key: { status: 'active', activation_limit: 3, activation_usage: 1, expires_at: '2027-01-01T00:00:00Z' },
    instance: { id: 'inst_123', name: 'SourceDeck darwin/arm64 abc' },
    meta: { customer_name: 'Customer LLC', customer_email: 'buyer@example.com', product_name: 'SourceDeck Pro', variant_name: 'Annual' }
  });
  assert.strictEqual(normalized.valid, true);
  assert.strictEqual(normalized.status, 'active');
  assert.strictEqual(normalized.customerEmail, 'buyer@example.com');
  assert.strictEqual(normalized.productName, 'SourceDeck Pro');
  assert.strictEqual(normalized.instanceId, 'inst_123');
});

console.log('\n── activation / validation / deactivation ──');

test('status starts as missing without a stored license', () => {
  const service = createLicenseService({ store: createMemoryStore(), safeStorage, fetchFn: async () => response({ valid: true }) });
  const status = service.status();
  assert.strictEqual(status.configured, false);
  assert.strictEqual(status.state, 'missing');
  assert.strictEqual(status.provider, 'lemonsqueezy');
});

test('activation posts only to the official license API base and stores encrypted key', async () => {
  const store = createMemoryStore();
  const calls = [];
  const service = createLicenseService({
    store,
    safeStorage,
    appInfo: { appName: 'SourceDeck', appVersion: '1.1.0', platform: 'darwin', arch: 'arm64', userDataPath: '/tmp/sourceDeck' },
    fetchFn: async (url, options) => {
      calls.push({ url, body: String(options.body || '') });
      return response({
        valid: true,
        license_key: { status: 'active', activation_limit: 2, activation_usage: 1 },
        instance: { id: 'inst_abc', name: 'SourceDeck darwin/arm64 test' },
        meta: { customer_name: 'ARCG Systems', customer_email: 'ops@example.com', product_name: 'SourceDeck', variant_name: 'Professional' }
      });
    }
  });
  const result = await service.activate({ licenseKey: 'SD-LICENSE-SECRET-12345' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.state, 'active');
  assert.strictEqual(calls[0].url, `${DEFAULT_LICENSE_API_BASE}/activate`);
  assert.ok(calls[0].body.includes('license_key=SD-LICENSE-SECRET-12345'));
  assert.ok(!JSON.stringify(service.status()).includes('SD-LICENSE-SECRET-12345'), 'full key leaked through status');
  assert.ok(String(store.get('license.encryptedKey')).startsWith('safe:'), 'license key must be encrypted when safeStorage is available');
});

test('activation rejects invalid Lemon Squeezy response without storing key', async () => {
  const store = createMemoryStore();
  const service = createLicenseService({ store, safeStorage, fetchFn: async () => response({ valid: false, error: 'invalid_license' }) });
  const result = await service.activate({ licenseKey: 'SD-LICENSE-INVALID-12345' });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.state, 'invalid');
  assert.strictEqual(store.get('license.encryptedKey', ''), '');
});

test('validation uses stored instance_id and preserves last known status during offline grace', async () => {
  const store = createMemoryStore();
  let callCount = 0;
  const service = createLicenseService({
    store,
    safeStorage,
    fetchFn: async (_url, options) => {
      callCount++;
      if (callCount === 1) return response({ valid: true, instance: { id: 'inst_keep' }, license_key: { status: 'active' } });
      assert.ok(String(options.body).includes('instance_id=inst_keep'));
      throw Object.assign(new Error('network down'), { name: 'NetworkError' });
    }
  });
  await service.activate({ licenseKey: 'SD-LICENSE-OFFLINE-12345' });
  const result = await service.validate();
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.state, 'offline_grace');
  assert.strictEqual(result.status.valid, true);
});

test('deactivation clears key and local instance state', async () => {
  const store = createMemoryStore();
  const service = createLicenseService({
    store,
    safeStorage,
    fetchFn: async () => response({ valid: true, instance: { id: 'inst_clear' }, license_key: { status: 'active' } })
  });
  await service.activate({ licenseKey: 'SD-LICENSE-CLEAR-12345' });
  const result = await service.deactivate();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.state, 'deactivated');
  assert.strictEqual(service.status().configured, false);
  assert.strictEqual(store.get('license.encryptedKey', ''), '');
  assert.strictEqual(store.get('license.instance', ''), '');
});

runTests();

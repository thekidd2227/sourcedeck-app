/**
 * Architecture-boundary tests.
 *
 * Verifies the new shared-services + /api/ adapter shape introduced
 * by the web-first refactor. All synthetic data; no live network.
 *
 * Run:  node test/architecture-boundary.test.js
 *
 * Exits non-zero on any failure so `npm test` fails.
 */

'use strict';

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}
async function asyncTest(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

function makeStore() {
  const m = new Map();
  return {
    get:    (k) => m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null,
    set:    (k, v) => m.set(k, JSON.parse(JSON.stringify(v))),
    has:    (k) => m.has(k),
    delete: (k) => m.delete(k),
    _raw:   m
  };
}

console.log('\n── shared-services tree ──');

test('services/sam re-exports the implementation surface', () => {
  const sam = require('../services/sam');
  for (const k of ['createSamSearchService', 'normalizeSamRecord', 'dedupe', 'applyTargeting', 'buildSamHumanUrl']) {
    assert.strictEqual(typeof sam[k], 'function', `services/sam missing ${k}`);
  }
});

test('services/compliance re-exports generateComplianceMatrix', () => {
  const c = require('../services/compliance');
  assert.strictEqual(typeof c.generateComplianceMatrix, 'function');
});

test('services/stakeholders re-exports buildStakeholderGraph + safety constants', () => {
  const s = require('../services/stakeholders');
  assert.strictEqual(typeof s.buildStakeholderGraph, 'function');
  assert.strictEqual(typeof s.SAFETY_NOTE, 'string');
  assert.match(s.SAFETY_NOTE, /restricted communication window/i);
});

test('services/settings/targeting-profile re-exports defaultProfile', () => {
  const t = require('../services/settings/targeting-profile');
  assert.strictEqual(typeof t.defaultProfile, 'function');
  const d = t.defaultProfile();
  assert.strictEqual(d.schemaVersion, 1);
});

test('services/capture exposes preRfp + past-performance entry points', () => {
  const c = require('../services/capture');
  assert.strictEqual(typeof c.evaluatePreRfp, 'function');
  assert.strictEqual(typeof c.createPastPerformanceService, 'function');
});

test('services/proposal exposes draftSections scaffold', () => {
  const p = require('../services/proposal');
  assert.strictEqual(typeof p.draftSections, 'function');
  const out = p.draftSections({ opportunity: { noticeId: 'X' } });
  assert.strictEqual(out.ok, true);
  assert.ok(Array.isArray(out.drafts) && out.drafts.length >= 4);
  assert.match(out.aiPolicy, /human review/i);
  assert.strictEqual(out._scaffold, true);
});

console.log('\n── credentials abstraction ──');

const credSurface = require('../services/settings/credentials');

test('credentials: KNOWN_SERVICES includes the GovCon-relevant set', () => {
  for (const s of ['sam-gov', 'airtable', 'apollo', 'openai', 'anthropic', 'watsonx', 'ibm-cos']) {
    assert.ok(credSurface.KNOWN_SERVICES.includes(s), 'missing ' + s);
  }
});

asyncTest('credentials: memory adapter set/get/remove/status round-trips', async () => {
  const store = credSurface.createMemoryCredentialStore();
  const r1 = await store.set('sam-gov', 'TEST-KEY');
  assert.strictEqual(r1.ok, true);
  const v = await store.get('sam-gov');
  assert.strictEqual(v, 'TEST-KEY');
  const s = await store.status();
  assert.strictEqual(s.adapter, 'memory');
  assert.strictEqual(s.present['sam-gov'], true); // status returns presence boolean, never the value
  await store.remove('sam-gov');
  assert.strictEqual(await store.get('sam-gov'), null);
});

asyncTest('credentials: summarizePresence returns booleans only (no values)', async () => {
  const store = credSurface.createMemoryCredentialStore();
  await store.set('sam-gov', 'SECRET-VALUE');
  await store.set('airtable', 'pat_secret');
  const summary = await credSurface.summarizePresence(store);
  // Every present value must be a boolean, never the original string.
  for (const [k, v] of Object.entries(summary.present)) {
    assert.strictEqual(typeof v, 'boolean', 'present[' + k + '] must be boolean, got ' + typeof v);
    assert.notStrictEqual(v, 'SECRET-VALUE');
    assert.notStrictEqual(v, 'pat_secret');
  }
  assert.strictEqual(summary.present['sam-gov'], true);
  assert.strictEqual(summary.present['airtable'], true);
});

asyncTest('credentials: safeStorage adapter falls back to plaintext when encryption unavailable', async () => {
  const store = makeStore();
  const adapter = credSurface.createSafeStorageCredentialStore({
    store,
    safeStorage: null  // simulate dev / Linux without keychain
  });
  await adapter.set('apollo', 'apollo_test_key');
  const v = await adapter.get('apollo');
  assert.strictEqual(v, 'apollo_test_key');
  // Stored under the documented key path
  assert.strictEqual(store.get('keys.apollo'), 'apollo_test_key');
  const summary = await adapter.status();
  assert.strictEqual(summary.adapter, 'safeStorage');
  assert.strictEqual(summary.encryptionAvailable, false);
  assert.strictEqual(summary.present['apollo'], true);
});

asyncTest('credentials: safeStorage adapter encrypts when safeStorage is available', async () => {
  const store = makeStore();
  const fakeSafeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from('ENC[' + s + ']', 'utf8'),
    decryptString: (b) => {
      const s = b.toString('utf8');
      return s.startsWith('ENC[') ? s.slice(4, -1) : s;
    }
  };
  const adapter = credSurface.createSafeStorageCredentialStore({ store, safeStorage: fakeSafeStorage });
  await adapter.set('sam-gov', 'sk-secret');
  // The persisted value must NOT contain the plaintext.
  const persisted = store.get('keys.sam-gov');
  assert.ok(persisted && !persisted.includes('sk-secret'), 'persisted value must not contain plaintext');
  // Round-trip via the adapter must still yield the plaintext.
  const back = await adapter.get('sam-gov');
  assert.strictEqual(back, 'sk-secret');
});

asyncTest('credentials: vault adapter is a documented placeholder', async () => {
  const v = credSurface.createVaultCredentialStore();
  const r = await v.set('airtable', 'x');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'vault_adapter_not_implemented');
  const s = await v.status();
  assert.strictEqual(s.adapter, 'vault');
});

console.log('\n── /api adapter ──');

const { createAppApi } = require('../api');

asyncTest('app-api: targeting roundtrips through the adapter', async () => {
  const store = makeStore();
  const credentials = credSurface.createMemoryCredentialStore();
  const api = createAppApi({ store, credentials });
  const initial = await api.govcon.targeting.get();
  assert.deepStrictEqual(initial.naics, []);
  await api.govcon.targeting.save({ naics: ['541512', '561720'], setAsides: ['SDVOSB'] });
  const after = await api.govcon.targeting.get();
  assert.deepStrictEqual(after.naics, ['541512', '561720']);
  assert.deepStrictEqual(after.setAsides, ['sdvosb']);
});

asyncTest('app-api: SAM search uses the credentials adapter, not raw input', async () => {
  const store       = makeStore();
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('sam-gov', 'TEST-KEY-VIA-VAULT');

  let observedUrl = null;
  const api = createAppApi({
    store, credentials,
    fetchFn: async (url) => {
      observedUrl = url;
      return {
        ok: true, status: 200,
        json: async () => ({
          totalRecords: 1,
          opportunitiesData: [{
            noticeId: 'N-1', title: 'T1', type: 'Solicitation',
            fullParentPathName: 'DLA.J6', naicsCode: '541512',
            postedDate: '2026-05-01', responseDeadLine: '2026-06-15'
          }]
        })
      };
    }
  });
  const r = await api.govcon.sam.search({ naics: ['541512'] });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.usedApi, true);
  assert.ok(observedUrl.includes('api_key=TEST-KEY-VIA-VAULT'));
});

asyncTest('app-api: SAM search without a key returns a fallback URL', async () => {
  const api = createAppApi({
    store: makeStore(),
    credentials: credSurface.createMemoryCredentialStore()
  });
  const r = await api.govcon.sam.search({ naics: ['541512'] });
  assert.strictEqual(r.usedApi, false);
  assert.strictEqual(r.reason, 'no_api_key');
  assert.ok(r.fallbackUrl && r.fallbackUrl.startsWith('https://sam.gov/'));
});

asyncTest('app-api: compliance matrix surface returns rows on synthetic input', async () => {
  const api = createAppApi({
    store: makeStore(),
    credentials: credSurface.createMemoryCredentialStore()
  });
  const r = await api.govcon.compliance.matrix({ text: `
SECTION L
L.3.1 Technical Approach. The offeror shall describe staffing.
L.3.2 Past Performance. The offeror shall submit three references.
SECTION M
M.1 Technical (40%)
M.2 Past Performance (25%)
` });
  assert.strictEqual(r.ok, true);
  assert.ok(r.rows.length >= 2);
  assert.match(r.aiPolicy, /human review/i);
});

asyncTest('app-api: stakeholders.forOpp returns a graph with the safety note', async () => {
  const api = createAppApi({ store: makeStore(), credentials: credSurface.createMemoryCredentialStore() });
  const r = await api.govcon.stakeholders.forOpp({
    opp: { noticeId: 'X', noticeGroup: 'active_solicitation', noticeType: 'Solicitation', responseDeadline: '2099-01-01', agency: 'DLA' }
  });
  assert.ok(r && r.nodes && r.nodes.length);
  assert.match(r.safetyNote, /restricted communication window/i);
  // Sanity scan: never contains banned phrasing
  const flat = JSON.stringify(r).toLowerCase();
  assert.ok(!/cold[\s-]?(email|call|outreach)/.test(flat));
  assert.ok(!/dm\s+the\s+(co|cor|contracting)/.test(flat));
});

asyncTest('app-api: proposal.draftSections returns a scaffold + AI policy reminder', async () => {
  const api = createAppApi({ store: makeStore(), credentials: credSurface.createMemoryCredentialStore() });
  const r = await api.govcon.proposal.draftSections({
    opportunity: { noticeId: 'X' },
    complianceMatrix: { rows: [{ reqId: 'REQ-001', requirement: 'Technical staffing approach', sourceQuote: 'staffing model' }] }
  });
  assert.strictEqual(r.ok, true);
  assert.ok(r.drafts.length >= 1);
  assert.match(r.aiPolicy, /human review/i);
});

asyncTest('app-api: credentials.status returns presence-only summary', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('sam-gov', 'plaintext-secret');
  const api = createAppApi({ store: makeStore(), credentials });
  const s = await api.credentials.status();
  // No raw values anywhere in the status payload.
  const flat = JSON.stringify(s);
  assert.ok(!flat.includes('plaintext-secret'), 'status payload must not echo the credential value');
  assert.strictEqual(s.present['sam-gov'], true);
});

console.log('\n── platform-neutral guarantee ──');

test('shared services do not import electron', () => {
  const dirs = ['sam', 'compliance', 'stakeholders', 'capture', 'proposal', 'settings'];
  for (const d of dirs) {
    const root = path.join(__dirname, '..', 'services', d);
    walk(root, (f) => {
      if (!f.endsWith('.js')) return;
      const src = fs.readFileSync(f, 'utf8');
      assert.ok(!/require\(['"]electron['"]\)/.test(src), `${f} must not require('electron')`);
      assert.ok(!/from\s+['"]electron['"]/.test(src),    `${f} must not import from electron`);
    });
  }
});

test('shared services do not touch DOM globals', () => {
  const dirs = ['sam', 'compliance', 'stakeholders', 'capture', 'proposal', 'settings'];
  const banned = /\b(window|document|navigator|localStorage|sessionStorage|HTMLElement)\b/;
  for (const d of dirs) {
    const root = path.join(__dirname, '..', 'services', d);
    walk(root, (f) => {
      if (!f.endsWith('.js')) return;
      const src = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      assert.ok(!banned.test(src), `${f} references DOM/browser global`);
    });
  }
});

test('/api adapter does not import electron', () => {
  const apiSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'index.js'), 'utf8');
  assert.ok(!/require\(['"]electron['"]\)/.test(apiSrc));
  assert.ok(!/from\s+['"]electron['"]/.test(apiSrc));
});

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// ── runner ──────────────────────────────────────────────────────────
(async () => {
  await new Promise(r => setTimeout(r, 50));
  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} architecture-boundary tests ===`
    : `=== FAIL — ${failed}/${total} architecture-boundary tests failed ===`);
  if (failed > 0) process.exit(1);
})();

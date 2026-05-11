/**
 * Credential-boundary tests.
 *
 * Proves that the new airtable / apollo / openai / anthropic
 * services + the createAppApi surfaces never return raw credentials
 * to a caller and never accept a credential as renderer-supplied
 * input. All synthetic; no live network.
 *
 * Run:  node test/credential-boundary.test.js
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
    delete: (k) => m.delete(k)
  };
}

const credSurface = require('../services/settings/credentials');
const { createAirtableService }    = require('../services/airtable');
const { createApolloService }      = require('../services/apollo');
const { createOpenaiProvider }     = require('../services/ai/providers/openai');
const { createAnthropicProvider }  = require('../services/ai/providers/anthropic');
const { createAppApi }             = require('../api');

console.log('\n── airtable wrapper ──');

asyncTest('airtable: validates baseId / tableRef / recordId at the boundary', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('airtable', 'patTEST_PAT_VALUE');
  const svc = createAirtableService({
    credentials, fetchFn: async () => ({ ok: true, status: 200, json: async () => ({ records: [] }) })
  });
  // Bad base
  await assert.rejects(svc.listRecords({ baseId: 'xxx', tableRef: 'tblOK0123456789' }));
  await assert.rejects(svc.listRecords({ baseId: 'app1234567890123456', tableRef: '\'; DROP TABLE--' }));
  // Bad record id on update
  await assert.rejects(svc.updateRecord({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789', recordId: 'bad', fields: { x: 1 } }));
});

asyncTest('airtable: builds Authorization header inside the service, never echoes PAT in result', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('airtable', 'patSECRET_PAT_DO_NOT_LOG');
  let observedHeaders = null;
  const svc = createAirtableService({
    credentials,
    fetchFn: async (url, opts) => {
      observedHeaders = opts.headers;
      return { ok: true, status: 200, json: async () => ({ records: [{ id: 'rec1', fields: { Name: 'Synthetic' } }] }) };
    }
  });
  const r = await svc.listRecords({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789' });
  assert.strictEqual(r.ok, true);
  // Auth header was built INSIDE the service.
  assert.match(observedHeaders.Authorization, /^Bearer pat/);
  // Result payload must NOT contain the PAT anywhere.
  const flat = JSON.stringify(r);
  assert.ok(!flat.includes('patSECRET_PAT_DO_NOT_LOG'),
    'airtable result must not echo the PAT');
});

asyncTest('airtable: returns no_credential without crashing when key missing', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  const svc = createAirtableService({ credentials, fetchFn: async () => ({ ok: true, status: 200, json: async () => ({}) }) });
  const r = await svc.listRecords({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'no_credential');
});

console.log('\n── apollo wrapper ──');

asyncTest('apollo: rejects endpoints not on the allowlist', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('apollo', 'apollo_test_key');
  const svc = createApolloService({
    credentials, fetchFn: async () => { throw new Error('should not be called'); }
  });
  // The wrapper does not expose a generic "endpoint" parameter; this
  // is verified by the absence of such an entrypoint plus the
  // _internal allowlist.
  const internal = require('../services/apollo')._internal;
  assert.ok(internal.ALLOWED_ENDPOINTS.has('organizations/enrich'));
  assert.ok(internal.ALLOWED_ENDPOINTS.has('mixed_people/search'));
  assert.ok(!internal.ALLOWED_ENDPOINTS.has('admin/secrets'));
  // Smoke: only documented surfaces exist.
  assert.deepStrictEqual(
    Object.keys(svc).sort(),
    ['SAFETY_NOTE','enrichOrganization','searchOrganizations','searchPeople'].sort()
  );
});

asyncTest('apollo: includes FAR-aware safety note on every result', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('apollo', 'apollo_test_key');
  const svc = createApolloService({
    credentials,
    fetchFn: async () => ({ ok: true, status: 200, json: async () => ({
      people: [{ id: '1', first_name: 'Synthetic', last_name: 'Person', title: 'Director', organization: { name: 'SyntheticCo' }}]
    }) })
  });
  const r = await svc.searchPeople({ titles: ['Director'] });
  assert.strictEqual(r.ok, true);
  assert.match(r.safetyNote, /restricted communication window/i);
  assert.match(r.safetyNote, /CO\/COR/);
  // Normalized people must NOT include direct phone / personal email
  for (const p of r.people) {
    assert.strictEqual(typeof p.email, 'undefined', 'apollo wrapper must not surface personal emails by default');
    assert.strictEqual(typeof p.phone, 'undefined', 'apollo wrapper must not surface personal phones by default');
  }
});

asyncTest('apollo: never echoes the API key in the result', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('apollo', 'apollo_DO_NOT_ECHO_8675309');
  let observedHeaders = null;
  const svc = createApolloService({
    credentials,
    fetchFn: async (_url, opts) => {
      observedHeaders = opts.headers;
      return { ok: true, status: 200, json: async () => ({ organization: { id: 'org1', name: 'SyntheticCo' } }) };
    }
  });
  const r = await svc.enrichOrganization({ organization_domain: 'synthetic.example' });
  assert.strictEqual(observedHeaders['x-api-key'], 'apollo_DO_NOT_ECHO_8675309');
  const flat = JSON.stringify(r);
  assert.ok(!flat.includes('apollo_DO_NOT_ECHO_8675309'), 'apollo result must not echo the api key');
});

console.log('\n── openai / anthropic providers ──');

asyncTest('openai: builds Bearer header inside provider; result does not echo key', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('openai', 'sk-OPENAI_TEST_VALUE');
  let observedHeaders = null;
  const provider = createOpenaiProvider({
    credentials,
    fetchFn: async (_url, opts) => {
      observedHeaders = opts.headers;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'hello' } }], usage: { total_tokens: 10 } }) };
    }
  });
  const r = await provider.generate({ userMessage: 'ping' });
  assert.strictEqual(r.ok, true);
  assert.match(observedHeaders.Authorization, /^Bearer sk-/);
  assert.match(r.aiPolicy, /human review/i);
  const flat = JSON.stringify(r);
  assert.ok(!flat.includes('sk-OPENAI_TEST_VALUE'), 'openai provider must not echo the key');
});

asyncTest('anthropic: builds x-api-key inside provider; result does not echo key', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('anthropic', 'sk-ant-TEST_SECRET');
  let observedHeaders = null;
  const provider = createAnthropicProvider({
    credentials,
    fetchFn: async (_url, opts) => {
      observedHeaders = opts.headers;
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'hi' }], usage: { output_tokens: 1 } }) };
    }
  });
  const r = await provider.generate({ userMessage: 'ping' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(observedHeaders['x-api-key'], 'sk-ant-TEST_SECRET');
  assert.match(r.aiPolicy, /human review/i);
  assert.ok(!JSON.stringify(r).includes('sk-ant-TEST_SECRET'), 'anthropic provider must not echo the key');
});

asyncTest('openai/anthropic: no_credential return when key absent', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  const oa = createOpenaiProvider({ credentials, fetchFn: async () => { throw new Error('should not be called'); } });
  const an = createAnthropicProvider({ credentials, fetchFn: async () => { throw new Error('should not be called'); } });
  assert.strictEqual((await oa.generate({ userMessage: 'x' })).error, 'no_credential');
  assert.strictEqual((await an.generate({ userMessage: 'x' })).error, 'no_credential');
});

console.log('\n── createAppApi cross-surface ──');

asyncTest('app-api: ai.generate falls back from openai -> anthropic when openai missing', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('anthropic', 'sk-ant-only');
  const api = createAppApi({
    store: makeStore(), credentials,
    fetchFn: async (url) => {
      if (/anthropic\.com/.test(url)) {
        return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'fallback-ok' }] }) };
      }
      throw new Error('only anthropic should be called');
    }
  });
  const r = await api.ai.generate({ userMessage: 'ping' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.provider, 'anthropic');
  assert.strictEqual(r.text, 'fallback-ok');
});

asyncTest('app-api: airtable + enrichment + ai surfaces all exist on the adapter', async () => {
  const api = createAppApi({ store: makeStore(), credentials: credSurface.createMemoryCredentialStore() });
  for (const k of ['listRecords', 'createRecord', 'updateRecord', 'deleteRecord']) {
    assert.strictEqual(typeof api.airtable[k], 'function', 'missing api.airtable.' + k);
  }
  for (const k of ['enrichOrganization', 'searchPeople', 'searchOrganizations']) {
    assert.strictEqual(typeof api.enrichment[k], 'function', 'missing api.enrichment.' + k);
  }
  for (const k of ['generate', 'draftProposalSection', 'summarizeOpportunity']) {
    assert.strictEqual(typeof api.ai[k], 'function', 'missing api.ai.' + k);
  }
});

console.log('\n── preload + main static guarantees ──');

test('preload: exposes credentials/airtable/enrichment/ai surfaces but no raw key getter', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  assert.ok(preload.includes('credentials:status'),  'preload exposes credentials:status');
  assert.ok(preload.includes('airtable:list'),       'preload exposes airtable:list');
  assert.ok(preload.includes('enrichment:enrich-org'), 'preload exposes enrichment:enrich-org');
  assert.ok(preload.includes('ai:generate'),         'preload exposes ai:generate');
  // No "credentials:get" channel (presence-only surface for renderer).
  assert.ok(!preload.includes('credentials:get'),    'preload must NOT expose credentials:get (renderer is presence-only)');
  // No raw fetch / Bearer literal / Authorization header in preload.
  const stripped = preload.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/['"`]Bearer\s/.test(stripped), 'preload must not embed Bearer header literals');
  assert.ok(!/Authorization['"]\s*:/.test(stripped), 'preload must not set an Authorization header');
});

test('main.js: all govcon IPC handlers route through appApi', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const govconChannels = [
    'govcon:targeting-get', 'govcon:targeting-set', 'govcon:targeting-reset',
    'govcon:sam-search',    'govcon:compliance-matrix', 'govcon:pre-rfp-evaluate',
    'govcon:past-performance-list',  'govcon:past-performance-save',
    'govcon:past-performance-remove', 'govcon:past-performance-match',
    'govcon:stakeholders-for-opp'
  ];
  for (const ch of govconChannels) {
    const re = new RegExp(`ipcMain\\.handle\\('${ch.replace(/[\.\-:]/g, '\\$&')}'\\s*,[\\s\\S]{0,300}?appApi\\.`);
    assert.ok(re.test(main), `IPC handler "${ch}" must route through appApi`);
  }
  // The new credential / airtable / enrichment / ai handlers also use appApi.
  for (const ch of ['credentials:status', 'credentials:set', 'credentials:remove',
                    'airtable:list', 'airtable:create', 'airtable:update', 'airtable:delete',
                    'enrichment:enrich-org', 'enrichment:search-people', 'enrichment:search-orgs',
                    'ai:generate', 'ai:draft-proposal-section', 'ai:summarize-opportunity']) {
    const re = new RegExp(`ipcMain\\.handle\\('${ch.replace(/[\.\-:]/g, '\\$&')}'\\s*,[\\s\\S]{0,300}?appApi\\.`);
    assert.ok(re.test(main), `IPC handler "${ch}" must route through appApi`);
  }
});

test('main.js: no longer imports services/govcon/* directly', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.ok(!/require\(['"]\.\/services\/govcon\/[^'"]+['"]\)/.test(main),
    'main.js should not import services/govcon/* directly; use createAppApi instead');
});

// ── runner ──────────────────────────────────────────────────────────
(async () => {
  await new Promise(r => setTimeout(r, 50));
  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} credential-boundary tests ===`
    : `=== FAIL — ${failed}/${total} credential-boundary tests failed ===`);
  if (failed > 0) process.exit(1);
})();

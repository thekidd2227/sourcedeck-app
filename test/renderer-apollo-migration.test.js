/**
 * Renderer Apollo migration tests.
 *
 * Static guarantees that prove the renderer no longer talks to
 * api.apollo.io directly, no longer builds an x-api-key header
 * with APOLLO_KEY, and no longer stores the raw Apollo key in
 * localStorage. Plus service-level proof that personal contact
 * PII (email/phone) is stripped from person records.
 *
 * All synthetic data; no live network.
 *
 * Run:  node test/renderer-apollo-migration.test.js
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

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

console.log('\n── renderer Apollo surface ──');

test('no direct fetch to api.apollo.io remains in the renderer', () => {
  const re = /\bfetch\s*\(\s*['"`][^'"`]*api\.apollo\.io/;
  const hits = HTML.match(new RegExp(re.source, 'g')) || [];
  assert.strictEqual(hits.length, 0,
    `expected 0 direct apollo fetch sites, found ${hits.length}`);
});

test('no api.apollo.io URL string remains anywhere in the renderer', () => {
  // Stronger check: no 'api.apollo.io' anywhere (URL is now built
  // inside the main-process service).
  const idx = HTML.indexOf('api.apollo.io');
  assert.strictEqual(idx, -1,
    `api.apollo.io still referenced in renderer at offset ${idx}`);
});

test('no x-api-key header build with APOLLO_KEY remains', () => {
  // Match common shapes: 'x-api-key': APOLLO_KEY,  'x-api-key': key,
  // or 'x-api-key': window.APOLLO_KEY (where the value provided is
  // the raw key from the renderer).
  const stripped = HTML
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  // After stripping comments, the renderer must not appear to set
  // x-api-key to anything resembling APOLLO_KEY.
  const banned = /['"`]x-api-key['"`]\s*:\s*(?:APOLLO_KEY|window\.APOLLO_KEY|key|apolloKey)\b/;
  assert.ok(!banned.test(stripped),
    'renderer must not build an x-api-key header with APOLLO_KEY');
});

test('renderer never writes lcc_APOLLO_KEY to localStorage', () => {
  // It is fine to READ lcc_APOLLO_KEY for the one-time migration,
  // and to call removeItem on it. It must not be written.
  const re = /localStorage\.setItem\s*\(\s*['"`]lcc_APOLLO_KEY/;
  assert.ok(!re.test(HTML), 'renderer must not write lcc_APOLLO_KEY');
  // And we must NOT do `localStorage.setItem('lcc_'+k, ...)` for k=APOLLO_KEY.
  // The Object.entries loop in saveSettings explicitly skips APOLLO_KEY.
  const ss = HTML.match(/async function saveSettings\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ss, 'saveSettings function not found');
  assert.ok(/k\s*!==\s*['"`]APOLLO_KEY['"`]/.test(ss[0]),
    'saveSettings localStorage loop must explicitly skip APOLLO_KEY');
});

test('renderer never assigns the raw Apollo key to window.APOLLO_KEY', () => {
  // Pre-migration: `window.APOLLO_KEY = keys.APOLLO_KEY;`
  // Post-migration: we route through window.sd.credentials and never
  // populate window.APOLLO_KEY with the raw value.
  const re = /window\.APOLLO_KEY\s*=\s*(?:keys\.APOLLO_KEY|keys\['APOLLO_KEY'\]|v\b)/;
  assert.ok(!re.test(HTML),
    'renderer must not assign the raw Apollo key to window.APOLLO_KEY');
});

test('apolloSearchCompanies routes through window.sd.enrichment.searchCompanies', () => {
  const fn = HTML.match(/async function apolloSearchCompanies\([\s\S]*?\n\}/);
  assert.ok(fn, 'apolloSearchCompanies not found');
  const body = fn[0];
  assert.ok(/window\.sd\.enrichment\.searchCompanies/.test(body),
    'apolloSearchCompanies must call window.sd.enrichment.searchCompanies');
  assert.ok(!/api\.apollo\.io/.test(body),
    'apolloSearchCompanies must not reference api.apollo.io');
  assert.ok(!/x-api-key/.test(body),
    'apolloSearchCompanies must not build x-api-key headers');
});

test('APOLLO_KEY presence flag is populated from credential adapter', () => {
  assert.ok(/let\s+APOLLO_KEY\s*=\s*['"]['"];?/.test(HTML),
    'APOLLO_KEY must be declared as let with empty initial value');
  assert.ok(/APOLLO_KEY\s*=\s*['"]<apollo_credential_present>['"]/.test(HTML),
    'APOLLO_KEY must be flipped to a presence marker, not a real value');
  assert.ok(/window\.sd\.credentials\.status/.test(HTML),
    'renderer must read presence from window.sd.credentials.status');
});

test('Settings save routes Apollo key to window.sd.credentials.set("apollo")', () => {
  const ss = HTML.match(/async function saveSettings\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ss, 'saveSettings not found');
  const body = ss[0];
  assert.ok(/window\.sd\.credentials\.set\(\s*['"]apollo['"]/.test(body),
    'saveSettings must call window.sd.credentials.set("apollo", ...)');
});

test('one-time migration: legacy lcc_APOLLO_KEY is moved to safeStorage and cleared', () => {
  const ls = HTML.match(/function loadSettings\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ls, 'loadSettings not found');
  const body = ls[0];
  assert.ok(/legacyApollo\s*=\s*localStorage\.getItem\(['"]lcc_APOLLO_KEY['"]\)/.test(body),
    'loadSettings must read any legacy lcc_APOLLO_KEY for one-time migration');
  assert.ok(/window\.sd\.credentials\.set\(\s*['"]apollo['"]/.test(body),
    'loadSettings must move lcc_APOLLO_KEY to safeStorage');
  assert.ok(/localStorage\.removeItem\(['"]lcc_APOLLO_KEY['"]\)/.test(body),
    'loadSettings must remove lcc_APOLLO_KEY after migrating to safeStorage');
});

console.log('\n── boundary surface (regression check) ──');

test('preload exposes window.sd.enrichment.searchCompanies', () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.ok(/searchCompanies/.test(preload), 'preload missing window.sd.enrichment.searchCompanies');
  assert.ok(/enrichment:search-companies/.test(preload), 'preload missing enrichment:search-companies channel');
});

test('main.js enrichment handlers route through appApi (regression)', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  for (const ch of ['enrichment:enrich-org', 'enrichment:search-people',
                    'enrichment:search-orgs', 'enrichment:search-companies']) {
    const re = new RegExp(`ipcMain\\.handle\\('${ch.replace(/[\.\-:]/g, '\\$&')}'\\s*,[\\s\\S]{0,200}?appApi\\.enrichment\\.`);
    assert.ok(re.test(main), `IPC handler "${ch}" must route through appApi.enrichment.*`);
  }
});

console.log('\n── Apollo service: end-to-end ──');

const credSurface = require('../services/settings/credentials');
const { createApolloService } = require('../services/apollo');

asyncTest('Apollo service: builds x-api-key inside service; never echoes key', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('apollo', 'apolloSECRETkey_DO_NOT_LOG');
  let observedHeaders = null;
  const svc = createApolloService({
    credentials,
    fetchFn: async (_url, opts) => {
      observedHeaders = opts.headers;
      return { ok:true, status:200, json: async () => ({
        organizations: [{ id:'o1', name:'SyntheticCo', primary_domain:'synthetic.example',
          website_url:'https://synthetic.example', sanitized_phone:'555-0100',
          linkedin_url:'https://linkedin.com/company/synthetic',
          naics_codes:['561210'], estimated_num_employees: 42, industry:'Facilities',
          city:'Columbus', state:'OH', country:'USA' }],
        pagination: { total_entries: 1 }
      })};
    }
  });
  const r = await svc.searchCompanies({
    per_page: 10, organization_locations:['Columbus, Ohio, United States'],
    q_organization_keyword_tags:['facilities'],
    organization_num_employees_ranges:['11,50']
  });
  assert.strictEqual(observedHeaders['x-api-key'], 'apolloSECRETkey_DO_NOT_LOG');
  assert.strictEqual(r.ok, true);
  assert.ok(!JSON.stringify(r).includes('apolloSECRETkey_DO_NOT_LOG'),
    'searchCompanies result must not echo the api key');
  assert.ok(r.organizations.length === 1);
  assert.strictEqual(r.organizations[0].name, 'SyntheticCo');
  assert.strictEqual(r.organizations[0].sanitized_phone, '555-0100');
  assert.match(r.safetyNote, /restricted communication window/i);
});

asyncTest('Apollo person results never expose personal email/phone', async () => {
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('apollo', 'apollo_test_key');
  const svc = createApolloService({
    credentials,
    fetchFn: async () => ({ ok:true, status:200, json: async () => ({
      people: [{ id:'p1', first_name:'Synthetic', last_name:'Person',
        email:'should-be-stripped@example.com', phone:'+1-555-0123',
        title:'Director', organization:{ name:'SyntheticCo' } }]
    })})
  });
  const r = await svc.searchPeople({ titles:['Director'] });
  assert.strictEqual(r.ok, true);
  for (const p of r.people) {
    assert.strictEqual(typeof p.email, 'undefined', 'email must be stripped from person records');
    assert.strictEqual(typeof p.phone, 'undefined', 'phone must be stripped from person records');
  }
});

asyncTest('Apollo searchCompanies missing credential returns no_credential', async () => {
  const svc = createApolloService({
    credentials: credSurface.createMemoryCredentialStore(),
    fetchFn: async () => { throw new Error('should not be called'); }
  });
  const r = await svc.searchCompanies({ per_page: 5 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'no_credential');
});

// ── runner ──────────────────────────────────────────────────────────
(async () => {
  await new Promise(r => setTimeout(r, 50));
  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} renderer-apollo-migration tests ===`
    : `=== FAIL — ${failed}/${total} renderer-apollo-migration tests failed ===`);
  if (failed > 0) process.exit(1);
})();

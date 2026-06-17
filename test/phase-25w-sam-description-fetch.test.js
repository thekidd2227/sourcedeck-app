/**
 * Phase 25W — SAM.gov description fetch through the credential boundary.
 *
 * Asserts the package download/description credential flow exists, is wired across
 * preload + main + service, appends the api key ONLY inside the service (main
 * process), redacts the key from output/errors, stores the fetched text
 * locally, and can be sent to the Solicitation Center.
 *
 * Mixed: string assertions on the renderer/IPC wiring + a runtime unit test
 * of the service redaction (fake fetch + fake key — no network).
 *
 * Run:  node test/phase-25w-sam-description-fetch.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const svc = require('../services/govcon/sam-source-fetch');

let passed = 0, failed = 0;
function test(name, fn) {
  try { const r = fn(); if (r && r.then) { return r.then(() => { passed++; console.log('  ✅ ' + name); }, (e) => { failed++; console.log('  ❌ ' + name + ': ' + e.message); }); } passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25W — SAM description fetch ===\n');

test('Package download button + legacy description handler exist (gated on descriptionLink)', () => {
  assert.ok(/window\.gcW25FetchDescription/.test(HTML), 'legacy gcW25FetchDescription handler present');
  assert.ok(/Download Solicitation Package/.test(HTML), 'package download label present');
  assert.ok(/o\.descriptionLink/.test(HTML), 'description link still gates description/package path');
});

test('fetch routes through the credential boundary (preload + main + api)', () => {
  assert.ok(/samFetchSource:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('govcon:sam-fetch-source'/.test(PRELOAD), 'preload bridge present');
  assert.ok(/ipcMain\.handle\('govcon:sam-fetch-source'/.test(MAIN), 'main IPC handler present');
  assert.ok(/window\.sd\.govcon\.samFetchSource/.test(HTML), 'renderer calls samFetchSource bridge');
});

test('renderer never builds an api_key URL itself', () => {
  assert.ok(!/samFetchSource\([^)]*api_key/.test(HTML), 'renderer does not pass api_key');
  assert.ok(!/descriptionLink[^;]*api_key=/.test(HTML), 'no api_key appended in renderer');
});

test('service appends key ONLY server-side and redacts it from output', () => {
  const calls = [];
  const fetcher = svc.createSamSourceFetchService({
    getApiKey: async () => 'SECRETKEY999',
    fetch: async (url) => { calls.push(url); return { ok: true, status: 200, headers: { get: () => 'text/plain' }, text: async () => 'desc body with api_key=SECRETKEY999 echoed' }; }
  });
  return fetcher.fetchSource({ url: 'https://api.sam.gov/prod/opportunities/v1/noticedesc?noticeid=z', kind: 'description' }).then((r) => {
    assert.ok(r.ok, 'fetch ok');
    assert.ok(/api_key=SECRETKEY999/.test(calls[0]), 'key appended server-side in the request');
    assert.ok(!/SECRETKEY999/.test(r.text), 'returned text must not contain the raw key');
    assert.ok(/api_key=REDACTED/.test(r.text), 'echoed key redacted in returned text');
    assert.ok(!/api_key/.test(r.sourceUrlSafe), 'returned sourceUrlSafe has no api_key');
    assert.ok(JSON.stringify(r).indexOf('SECRETKEY999') < 0, 'key absent from the whole response');
  });
});

test('service returns no_api_key (not a crash) when key missing', () => {
  const fetcher = svc.createSamSourceFetchService({ getApiKey: async () => '', fetch: async () => ({ ok: true }) });
  return fetcher.fetchSource({ url: 'https://api.sam.gov/x?noticeid=1' }).then((r) => {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'no_api_key');
  });
});

test('fetched description is stored locally + can be used in Solicitation Center', () => {
  assert.ok(/sd\.govcon\.sourceMaterials\.v1/.test(HTML), 'local source-material store key present');
  assert.ok(/sm\.description\s*=\s*\{/.test(HTML), 'description stored under pursuit');
  assert.ok(/gcW25UseInWorkspace\(/.test(HTML), 'use-in-workspace handler present');
  assert.ok(/Use in Solicitation Center/.test(HTML), 'Solicitation Center label present');
});

test('fetch failure shows a safe error (no URL/key leak)', () => {
  assert.ok(/Description unavailable or SAM\.gov returned an error\./.test(HTML), 'safe error message present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W sam-description-fetch checks ===\n`);
setTimeout(() => process.exit(failed ? 1 : 0), 50);

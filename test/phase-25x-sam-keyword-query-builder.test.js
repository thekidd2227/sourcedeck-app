/**
 * Phase 25X — SAM.gov keyword query builder.
 *
 * Proves the keyword is shaped INTO the SAM.gov API request as supported
 * title metadata search BEFORE any local filtering runs. SourceDeck does
 * not claim reliable full attachment search from one live SAM.gov response.
 *
 * Runs the real sam-search service with an injected fetch (no network).
 *
 * Run:  node test/phase-25x-sam-keyword-query-builder.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSamSearchService } = require('../services/govcon/sam-search');

const ROOT = path.resolve(__dirname, '..');
const SAMSRC = fs.readFileSync(path.join(ROOT, 'services', 'govcon', 'sam-search.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
const QUEUE = [];
function test(n, fn){ QUEUE.push({ n, fn }); }
async function runAll(){
  for (const { n, fn } of QUEUE){
    try { await fn(); passed++; console.log('  ✅ ' + n); }
    catch (e){ failed++; console.log('  ❌ ' + n + ': ' + e.message); }
  }
}

console.log('\n=== Phase 25X — SAM keyword query builder ===\n');

// Capture the URL the service requests so we can assert query shape.
function makeService(captureUrls, body){
  return createSamSearchService({
    getApiKey: async () => 'TEST_KEY_DO_NOT_LOG',
    now: () => Date.parse('2026-06-17T00:00:00Z'),
    fetch: async (url) => { captureUrls.push(url); return { ok: true, json: async () => body }; }
  });
}

const SAMPLE_BODY = {
  totalRecords: 2,
  opportunitiesData: [
    { noticeId: 'A', title: 'Janitorial Services', type: 'Solicitation', naicsCode: '561720' },
    { noticeId: 'B', title: 'Base Ops', type: 'Solicitation', naicsCode: '561720', description: 'https://api.sam.gov/x/description' }
  ]
};

test('keyword maps to SAM.gov `title` param in the request URL', async () => {
  const urls = [];
  const svc = makeService(urls, SAMPLE_BODY);
  await svc.search({ keyword: 'janitorial', limit: 25 });
  assert.ok(urls.length, 'service issued a request');
  const u = new URL(urls[0]);
  assert.strictEqual(u.searchParams.get('title'), 'janitorial', 'title param carries the keyword');
  assert.ok(!u.searchParams.get('q'), 'q param is not used for the Phase 25AA title metadata path');
});

test('keyword is shaped server-side even with NAICS ignored', async () => {
  const urls = [];
  const svc = makeService(urls, SAMPLE_BODY);
  await svc.search({ keyword: 'janitorial', limit: 50 });
  const u = new URL(urls[0]);
  assert.strictEqual(u.searchParams.get('title'), 'janitorial', 'title present without ncode');
  assert.ok(!u.searchParams.get('ncode'), 'no ncode when NAICS omitted');
});

test('result limit is honored in the request', async () => {
  const urls = [];
  const svc = makeService(urls, SAMPLE_BODY);
  await svc.search({ keyword: 'janitorial', limit: 75 });
  assert.strictEqual(new URL(urls[0]).searchParams.get('limit'), '75', 'limit param matches selector');
});

test('service returns the SAM.gov rows (no destructive NAICS targeting when none requested)', async () => {
  const urls = [];
  const svc = makeService(urls, SAMPLE_BODY);
  const out = await svc.search({ keyword: 'janitorial', limit: 25 });
  assert.ok(out.ok && out.usedApi, 'used the API');
  assert.strictEqual(out.results.length, 2, 'both keyword rows returned to the renderer');
});

test('source line maps keyword → title (static guard)', () => {
  assert.ok(/params\.set\('title', filters\.keyword\)/.test(SAMSRC), 'title mapping present in service');
});

test('renderer copies keyword into the IPC payload and never deletes it in ignore mode', () => {
  // ipcFilters copies all filter keys; only naics is deleted for Ignore NAICS.
  assert.ok(/Object\.keys\(filters\)\.forEach\(function\(k\)\{ ipcFilters\[k\] = filters\[k\]; \}\)/.test(HTML), 'all filters copied to ipcFilters');
  assert.ok(/filters\.naicsMode === 'ignore'[\s\S]*delete ipcFilters\.naics/.test(HTML), 'ignore deletes only naics, keeps keyword');
});

test('no raw api_key literal leaks in service or status path', () => {
  assert.ok(!/TEST_KEY_DO_NOT_LOG/.test(SAMSRC), 'no test key baked into source');
  assert.ok(!/api_key=[A-Za-z0-9]{6,}/.test(SAMSRC), 'no hardcoded api_key value');
});

runAll().then(function(){
  console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X query-builder checks ===\n`);
  process.exit(failed ? 1 : 0);
});

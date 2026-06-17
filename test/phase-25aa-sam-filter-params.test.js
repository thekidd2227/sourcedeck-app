'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSamSearchService } = require('../services/govcon/sam-search');

const ROOT = path.resolve(__dirname, '..');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

async function captureUrl(filters) {
  const urls = [];
  const svc = createSamSearchService({
    getApiKey: async () => 'TEST_KEY_DO_NOT_LOG',
    now: () => Date.parse('2026-06-17T12:00:00Z'),
    fetch: async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ totalRecords: 0, opportunitiesData: [] }) };
    }
  });
  await svc.search(filters);
  return new URL(urls[0]);
}

(async () => {
  const u = await captureUrl({
    keyword: 'janitorial',
    title: 'janitorial',
    naics: ['561720'],
    setAsideCode: 'SDVOSBC',
    state: 'TX',
    zip: '77002',
    limit: 75,
    offset: 1000,
    responseFrom: '2026-06-17',
    responseTo: '2026-09-15'
  });
  assert.strictEqual(u.searchParams.get('ncode'), '561720');
  assert.strictEqual(u.searchParams.get('typeOfSetAside'), 'SDVOSBC');
  assert.strictEqual(u.searchParams.get('state'), 'TX');
  assert.strictEqual(u.searchParams.get('zip'), '77002');
  assert.strictEqual(u.searchParams.get('title'), 'janitorial');
  assert.strictEqual(u.searchParams.get('limit'), '75');
  assert.strictEqual(u.searchParams.get('offset'), '1000');
  assert.ok(u.searchParams.get('postedFrom') && u.searchParams.get('postedTo'), 'posted dates present');
  assert.ok(u.searchParams.get('rdlfrom') && u.searchParams.get('rdlto'), 'deadline dates present');
  assert.ok(!/api_key=.*TEST_KEY/.test(HTML + MAIN), 'raw key is not in DOM/source');
  assert.ok(/normalizeSamSetAsideCode/.test(MAIN), 'set-aside code normalizer exists');
  assert.ok(/<option value="apply" selected>Apply NAICS<\/option>/.test(HTML), 'Apply NAICS is default');
  assert.ok(/<option value="ignore">Ignore NAICS<\/option>/.test(HTML), 'Ignore NAICS is explicit');
  assert.ok(/NAICS ignored by user/.test(HTML), 'ignore mode visible pill/status exists');
  console.log('Phase 25AA SAM filter params: OK');
})().catch((e) => { console.error(e); process.exit(1); });

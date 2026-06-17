'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createGovconIndexDb, TABLES, normalizeOpportunity } = require('../services/govcon/govcon-index-db');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25aa-index-'));
const db = createGovconIndexDb({ userDataPath: dir });
const schema = db.ensureSchema();

assert.strictEqual(schema.dbPath, path.join(dir, 'govcon-cache.sqlite'));
assert.strictEqual(schema.storageEngine, 'jsonl-fallback');
for (const t of TABLES) assert.ok(schema.tables.includes(t), 'schema has ' + t);
assert.ok(schema.tables.includes('govcon_opportunities_fts'), 'FTS/search index contract exists');

const row = normalizeOpportunity({
  noticeId: 'N1',
  title: 'Janitorial Services',
  agency: { name: 'Bad Object' },
  naicsCode: '561720',
  uiLink: 'https://sam.gov/opp/N1/view?api_key=SECRET',
  placeOfPerformance: { city: { name: 'Houston' }, state: { code: 'TX' }, zip: '77002' }
});
assert.ok(!JSON.stringify(row).includes('[object Object]'), 'normalization avoids object string artifacts');
assert.ok(!/api_key|SECRET/i.test(JSON.stringify(row)), 'sourceUrl safe, no raw key stored');

db.upsertOpportunities([row], 'batch_1');
assert.strictEqual(db.status().recordCount, 1);
console.log('Phase 25AA local index schema: OK');

'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createGovconIndexDb } = require('../services/govcon/govcon-index-db');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25aa-search-'));
const db = createGovconIndexDb({ userDataPath: dir });
const batch = db.beginBatch({});
db.upsertOpportunities([
  { noticeId:'A', title:'Janitorial services', agency:'GSA', naics:'561720', setAside:'SDVOSBC', setAsideCode:'SDVOSBC', active:true, placeOfPerformance:'Houston, TX 77002' },
  { noticeId:'B', title:'Road construction', agency:'DOT', naics:'237310', setAside:'WOSB', setAsideCode:'WOSB', active:true, placeOfPerformance:'Dallas, TX 75201' },
  { noticeId:'C', title:'Custodial support', agency:'VA', naics:'561720', setAside:'SDVOSBC', setAsideCode:'SDVOSBC', active:true, placeOfPerformance:'Miami, FL 33101' }
], batch.id);
db.completeBatch(batch.id, { status:'completed', recordCount:3 });

let out = db.search({ keyword:'janitorial', limit:25 });
assert.deepStrictEqual(out.results.map(r => r.noticeId).sort(), ['A','C'], 'janitorial returns janitorial/custodial/cleaning records only when text matches');
out = db.search({ naics:'561720', naicsMode:'apply', limit:25 });
assert.deepStrictEqual(out.results.map(r => r.noticeId).sort(), ['A','C'], 'exact NAICS only');
out = db.search({ naics:'561720', naicsMode:'broaden', limit:25 });
assert.ok(out.results.every(r => r.naicsCode.startsWith('5617')), 'broaden uses family prefix');
out = db.search({ setAside:'SDVOSBC', limit:25 });
assert.ok(out.results.every(r => /SDVOSB|SDVOSBC/i.test(r.setAside + r.setAsideCode)), 'SDVOSB filter works');
out = db.search({ state:'TX', limit:25 });
assert.deepStrictEqual(out.results.map(r => r.noticeId).sort(), ['A','B'], 'state filter works');
out = db.search({ limit:1 });
assert.strictEqual(out.results.length, 1, 'result count is honored');
console.log('Phase 25AA local index search: OK');

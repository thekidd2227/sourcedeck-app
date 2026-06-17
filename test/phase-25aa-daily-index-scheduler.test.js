'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createGovconIndexService, computeNextRun } = require('../services/govcon/govcon-index');

function store(seed){ const s = Object.assign({}, seed); return { get:k=>s[k], set:(k,v)=>{ s[k]=v; }, _s:s }; }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25aa-scheduler-'));
const svc = createGovconIndexService({
  userDataPath: tmp,
  store: store({ 'govcon.naicsProfiles': [{ id:'p1', name:'Cleaning', naics:['561720'], setAsides:['SDVOSB'], state:'TX' }] }),
  samSearch: { search: async (f) => ({ ok:true, total:1, results:[{ noticeId:'N1', title:'Janitorial', naics:'561720', setAside:'SDVOSBC', state:f.state }] }) },
  now: () => Date.parse('2026-06-17T07:30:00-04:00')
});

assert.strictEqual(svc.getSettings().runTime, '08:00');
assert.ok(computeNextRun('08:00', Date.parse('2026-06-17T07:30:00-04:00')).getTime() > Date.parse('2026-06-17T07:30:00-04:00'));
assert.strictEqual(svc.shouldRunOnStart(), false, 'disabled index does not auto-run on app load');
svc.saveSettings({ enabled: true, maxRecordsPerRun: 10000 });
assert.strictEqual(svc.shouldRunOnStart(), true, 'enabled + saved profile + stale can run after app start check');
assert.ok(svc.status().scheduler.runIndexNowAvailable, 'Run Index Now exists');
assert.ok(svc.status().scheduler.staleCheckOnStart, 'stale check logic exists');
svc.runNow().then((out) => {
  assert.ok(out.ok, 'manual run succeeds');
  assert.ok(out.savedCount >= 1);
  console.log('Phase 25AA daily index scheduler: OK');
}).catch((e) => { console.error(e); process.exit(1); });

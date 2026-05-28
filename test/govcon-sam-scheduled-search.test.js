'use strict';
const assert = require('assert');
const { createSamSearchService } = require('../services/govcon/sam-search');
const { createScheduledSamSearchService, sanitizeScheduleFilters } = require('../services/govcon/scheduled-sam-search');
const { createOpportunityRecordService } = require('../services/govcon/opportunity-records');

const m = new Map();
const store = { get:k => m.get(k), set:(k,v) => m.set(k,v) };
let calls = 0;
const sam = createSamSearchService({
  getApiKey: async () => 'KEY',
  now: () => Date.parse('2026-05-28T00:00:00Z'),
  fetch: async (url) => {
    calls++;
    assert.ok(!url.includes('apiKey='));
    return { ok: true, json: async () => ({ totalRecords: 2, opportunitiesData: [{ noticeId:'N'+calls, title:'Opp '+calls, type:'Solicitation' }] }) };
  }
});

(async () => {
  const r = await sam.search({ limit: 1, maxPages: 2 });
  assert.strictEqual(r.fetchedPages, 2);
  assert.strictEqual(r.results.length, 2);
  const opps = createOpportunityRecordService(store);
  const sched = createScheduledSamSearchService({ store, samSearch: sam, opportunityRecords: opps });
  const saved = sched.save({ filters: { apiKey: 'NOPE', keyword: 'it' }, frequency: 'daily' });
  assert.strictEqual(sanitizeScheduleFilters({ apiKey:'x', keyword:'y' }).apiKey, undefined);
  const run = await sched.run(saved.id);
  assert.strictEqual(run.ok, true);
  assert.ok(sched.history().length === 1);
  assert.ok(opps.list().length >= 1);
  console.log('=== PASS govcon-sam-scheduled-search ===');
})().catch(e => { console.error(e); process.exit(1); });

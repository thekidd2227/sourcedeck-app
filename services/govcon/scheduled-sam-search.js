'use strict';

const KEY = 'govcon.scheduledSamSearches';
const HISTORY_KEY = 'govcon.scheduledSamSearchRuns';

function createScheduledSamSearchService(opts) {
  opts = opts || {};
  const store = opts.store;
  const samSearch = opts.samSearch;
  const opportunityRecords = opts.opportunityRecords;
  const now = opts.now || (() => Date.now());
  if (!store) throw new Error('scheduled-sam-search: store required');
  if (!samSearch || typeof samSearch.search !== 'function') throw new Error('scheduled-sam-search: samSearch required');

  function list() { return arr(store.get(KEY)); }
  function history() { return arr(store.get(HISTORY_KEY)); }
  function save(input) {
    input = input || {};
    const all = list();
    const record = Object.assign({
      id: input.id || `sam_sched_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      name: String(input.name || 'Scheduled SAM.gov Search').slice(0, 80),
      filters: sanitizeScheduleFilters(input.filters || {}),
      frequency: normalizeFrequency(input.frequency || 'weekly'),
      dayOfWeek: input.dayOfWeek || null,
      time: input.time || '09:00',
      status: input.status === 'paused' ? 'paused' : 'active',
      createdAt: new Date(now()).toISOString(),
      updatedAt: new Date(now()).toISOString(),
      lastRunAt: null
    }, input.id ? { id: input.id } : {});
    const idx = all.findIndex(x => x.id === record.id);
    if (idx >= 0) all[idx] = Object.assign({}, all[idx], record, { updatedAt: new Date(now()).toISOString() });
    else all.push(record);
    store.set(KEY, all);
    return record;
  }

  async function run(id) {
    const schedule = list().find(s => s.id === id);
    if (!schedule) return { ok: false, reason: 'not_found' };
    const startedAt = new Date(now()).toISOString();
    const result = await samSearch.search(schedule.filters || {});
    const saved = [];
    if (result.ok && Array.isArray(result.results) && opportunityRecords) {
      for (const opp of result.results) saved.push(opportunityRecords.upsert(opp));
    }
    const entry = {
      id: `sam_run_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      scheduleId: id,
      startedAt,
      finishedAt: new Date(now()).toISOString(),
      ok: !!result.ok,
      resultCount: Array.isArray(result.results) ? result.results.length : 0,
      savedCount: saved.length,
      reason: result.reason || null
    };
    store.set(HISTORY_KEY, history().concat(entry).slice(-200));
    store.set(KEY, list().map(s => s.id === id ? Object.assign({}, s, { lastRunAt: entry.finishedAt }) : s));
    return { ok: true, schedule, result, saved, runLog: entry };
  }

  return { list, save, run, history, KEY, HISTORY_KEY };
}

function sanitizeScheduleFilters(f) {
  const clone = Object.assign({}, f || {});
  delete clone.apiKey;
  delete clone.authorization;
  return clone;
}
function normalizeFrequency(f) { return ['daily', 'weekly', 'monthly'].includes(String(f).toLowerCase()) ? String(f).toLowerCase() : 'weekly'; }
function arr(v) { return Array.isArray(v) ? v : []; }

module.exports = { createScheduledSamSearchService, KEY, HISTORY_KEY, sanitizeScheduleFilters };

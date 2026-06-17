'use strict';

const { createGovconIndexDb } = require('./govcon-index-db');

const SETTINGS_KEY = 'govcon.indexSettings';
const NAICS_PROFILES_KEY = 'govcon.naicsProfiles';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  runTime: '08:00',
  deadlineWindowDays: 180,
  maxRecordsPerRun: 10000,
  maxRecordsPerRequest: 1000,
  indexDescriptions: false,
  broaderIndexing: false
});

function createGovconIndexService(opts) {
  opts = opts || {};
  const store = opts.store;
  const samSearch = opts.samSearch;
  const db = opts.db || createGovconIndexDb({ userDataPath: opts.userDataPath });
  const now = opts.now || (() => Date.now());
  if (!store) throw new Error('govcon-index: store required');
  if (!samSearch || typeof samSearch.search !== 'function') throw new Error('govcon-index: samSearch required');
  db.ensureSchema();

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, store.get(SETTINGS_KEY) || {});
  }

  function saveSettings(patch) {
    const current = getSettings();
    const next = Object.assign({}, current, sanitizeSettings(patch || {}));
    store.set(SETTINGS_KEY, next);
    return Object.assign({}, next, status());
  }

  function status() {
    const s = getSettings();
    const dbStatus = db.status();
    const nextRun = computeNextRun(s.runTime, now());
    return Object.assign({}, dbStatus, {
      settings: s,
      nextRunAt: nextRun.toISOString(),
      scheduler: {
        localOnly: true,
        defaultRunTime: '08:00',
        staleCheckOnStart: true,
        runIndexNowAvailable: true
      },
      hasSavedNaicsProfiles: getSavedNaicsProfiles().length > 0
    });
  }

  async function runNow(input) {
    const settings = Object.assign({}, getSettings(), sanitizeSettings(input || {}));
    const profiles = getSavedNaicsProfiles();
    if (!profiles.length && !settings.broaderIndexing) {
      return { ok: false, reason: 'no_saved_naics_profiles', message: 'No NAICS profile saved. Add NAICS profiles to enable daily GovCon index.', status: status() };
    }
    const batch = db.beginBatch({ settings, profiles: profiles.map(p => ({ id: p.id, name: p.name, naics: p.naics || p.codes })) });
    let saved = 0;
    let totalRecords = 0;
    try {
      const jobs = buildJobs(profiles, settings);
      for (const job of jobs) {
        let offset = 0;
        for (;;) {
          if (saved >= settings.maxRecordsPerRun) break;
          const limit = Math.min(settings.maxRecordsPerRequest, settings.maxRecordsPerRun - saved);
          const result = await samSearch.search(Object.assign({}, job, { limit, offset, maxPages: 1 }));
          if (!result || result.ok === false) {
            if (result && /429|rate/i.test(String(result.reason || result.error || ''))) await wait(750);
            break;
          }
          const rows = Array.isArray(result.results) ? result.results : [];
          totalRecords += Number(result.total || rows.length || 0);
          const up = db.upsertOpportunities(rows, batch.id);
          saved += up.count;
          if (rows.length < limit) break;
          if (result.total && offset + limit >= result.total) break;
          offset += limit;
        }
        if (saved >= settings.maxRecordsPerRun) break;
      }
      const done = db.completeBatch(batch.id, { status: 'completed', recordCount: saved, totalRecords });
      return { ok: true, batch: done, savedCount: saved, totalRecords, status: status() };
    } catch (e) {
      const failed = db.completeBatch(batch.id, { status: 'failed', recordCount: saved, errorSafe: String(e && e.message || e).slice(0, 240) });
      return { ok: false, reason: 'index_failed', batch: failed, savedCount: saved, errorSafe: failed.errorSafe, status: status() };
    }
  }

  function search(filters) {
    return db.search(filters || {});
  }

  function clear() {
    return db.clear();
  }

  function shouldRunOnStart() {
    const s = getSettings();
    const st = db.status();
    return !!(s.enabled && getSavedNaicsProfiles().length && st.stale);
  }

  function getSavedNaicsProfiles() {
    const raw = store.get(NAICS_PROFILES_KEY) || [];
    return Array.isArray(raw) ? raw : [];
  }

  return { SETTINGS_KEY, NAICS_PROFILES_KEY, getSettings, saveSettings, status, runNow, search, clear, shouldRunOnStart };
}

function buildJobs(profiles, settings) {
  const jobs = [];
  for (const p of profiles) {
    const codes = Array.isArray(p.naics) ? p.naics : Array.isArray(p.codes) ? p.codes : [];
    const setAsides = Array.isArray(p.setAsides) ? p.setAsides : [];
    const places = p.state ? [{ state: p.state }] : p.zip ? [{ zip: p.zip }] : [{}];
    for (const code of codes) {
      const sas = setAsides.length ? setAsides : [''];
      for (const sa of sas) {
        for (const place of places) {
          jobs.push(Object.assign({
            naics: [String(code)],
            setAsideCode: normalizeSetAsideCode(sa),
            setAsides: sa ? [String(sa).toLowerCase()] : [],
            status: 'active',
            dueWithinDays: settings.deadlineWindowDays,
            posted: { withinDays: Math.min(365, settings.deadlineWindowDays) }
          }, place));
        }
      }
    }
  }
  return jobs.length ? jobs : [];
}

function sanitizeSettings(patch) {
  const out = {};
  if ('enabled' in patch) out.enabled = patch.enabled === true;
  if ('runTime' in patch && /^\d{2}:\d{2}$/.test(String(patch.runTime))) out.runTime = String(patch.runTime);
  if ('deadlineWindowDays' in patch) out.deadlineWindowDays = clamp(patch.deadlineWindowDays, 30, 365, 180);
  if ('maxRecordsPerRun' in patch) out.maxRecordsPerRun = clamp(patch.maxRecordsPerRun, 100, 10000, 10000);
  if ('maxRecordsPerRequest' in patch) out.maxRecordsPerRequest = clamp(patch.maxRecordsPerRequest, 25, 1000, 1000);
  if ('indexDescriptions' in patch) out.indexDescriptions = patch.indexDescriptions === true;
  if ('broaderIndexing' in patch) out.broaderIndexing = patch.broaderIndexing === true;
  return out;
}

function normalizeSetAsideCode(sa) {
  const key = String(sa || '').toLowerCase();
  const map = {
    sdvosb: 'SDVOSBC', sdvosbc: 'SDVOSBC', sdvosbs: 'SDVOSBS',
    hubzone: 'HZC', hzc: 'HZC', hzs: 'HZS',
    '8a': '8A', '8(a)': '8A', wosb: 'WOSB', edwosb: 'EDWOSB',
    vosb: 'VSA', vsa: 'VSA'
  };
  return map[key] || String(sa || '').toUpperCase();
}

function computeNextRun(runTime, nowMs) {
  const [hh, mm] = String(runTime || '08:00').split(':').map(Number);
  const d = new Date(nowMs);
  d.setHours(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0, 0, 0);
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1);
  return d;
}
function clamp(v, min, max, d) { v = Number(v); if (!Number.isFinite(v)) return d; return Math.max(min, Math.min(max, Math.floor(v))); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = { createGovconIndexService, DEFAULT_SETTINGS, computeNextRun, buildJobs, normalizeSetAsideCode };

'use strict';

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

const TABLES = Object.freeze([
  'govcon_opportunities',
  'govcon_opportunities_fts',
  'govcon_index_batches',
  'govcon_saved_pursuits'
]);

function createGovconIndexDb(opts) {
  opts = opts || {};
  const userDataPath = opts.userDataPath;
  if (!userDataPath) throw new Error('govcon-index-db: userDataPath required');
  const dbPath = opts.dbPath || path.join(userDataPath, 'govcon-cache.sqlite');

  function ensureDir() {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      storageEngine: 'jsonl-fallback',
      sqliteContract: TABLES,
      tables: {
        govcon_opportunities: [],
        govcon_opportunities_fts: [],
        govcon_index_batches: [],
        govcon_saved_pursuits: []
      }
    };
  }

  function readState() {
    ensureDir();
    if (!fs.existsSync(dbPath)) {
      const state = emptyState();
      writeState(state);
      return state;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const state = Object.assign(emptyState(), parsed || {});
      state.tables = Object.assign(emptyState().tables, state.tables || {});
      return state;
    } catch (_) {
      const state = emptyState();
      state.recoveredAt = new Date().toISOString();
      writeState(state);
      return state;
    }
  }

  function writeState(state) {
    ensureDir();
    const tmp = dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, dbPath);
  }

  function ensureSchema() {
    const state = readState();
    state.schemaVersion = SCHEMA_VERSION;
    state.sqliteContract = TABLES;
    state.tables = Object.assign(emptyState().tables, state.tables || {});
    writeState(state);
    return { ok: true, dbPath, storageEngine: state.storageEngine, tables: TABLES.slice() };
  }

  function beginBatch(filters) {
    const state = readState();
    const id = 'batch_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
    const row = {
      id,
      startedAt: new Date().toISOString(),
      completedAt: null,
      filtersJson: safeJson(filters || {}),
      recordCount: 0,
      status: 'running',
      errorSafe: null
    };
    state.tables.govcon_index_batches.push(row);
    writeState(state);
    return row;
  }

  function completeBatch(id, patch) {
    const state = readState();
    const rows = state.tables.govcon_index_batches;
    const idx = rows.findIndex(r => r.id === id);
    if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], patch || {}, { completedAt: new Date().toISOString() });
    writeState(state);
    return idx >= 0 ? rows[idx] : null;
  }

  function upsertOpportunities(records, batchId) {
    const state = readState();
    const rows = state.tables.govcon_opportunities.slice();
    const fts = state.tables.govcon_opportunities_fts.slice();
    const byNotice = new Map(rows.map((r, i) => [r.noticeId || r.id, i]));
    let count = 0;
    for (const raw of Array.isArray(records) ? records : []) {
      const row = normalizeOpportunity(raw, batchId);
      if (!row.noticeId && !row.solicitationNumber && !row.title) continue;
      const key = row.noticeId || row.id;
      const idx = byNotice.get(key);
      if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], row);
      else {
        byNotice.set(key, rows.length);
        rows.push(row);
      }
      const ftsRow = buildFtsRow(row);
      const ftsIdx = fts.findIndex(x => x.noticeId === row.noticeId);
      if (ftsIdx >= 0) fts[ftsIdx] = ftsRow;
      else fts.push(ftsRow);
      count++;
    }
    state.tables.govcon_opportunities = rows;
    state.tables.govcon_opportunities_fts = fts;
    writeState(state);
    return { ok: true, count, total: rows.length };
  }

  function search(filters) {
    filters = filters || {};
    const state = readState();
    const limit = clampInt(filters.limit, 25, 1, 100);
    const mode = filters.naicsMode || 'apply';
    const keyword = clean(filters.keyword, 120).toLowerCase();
    const naics = splitCodes(filters.naics);
    const setAside = clean(filters.setAside || filters.setAsideCode, 40).toLowerCase();
    const stateFilter = clean(filters.state, 2).toUpperCase();
    const zip = clean(filters.zip, 10);
    const pop = clean(filters.placeOfPerformance, 80).toLowerCase();
    let rows = state.tables.govcon_opportunities.slice();
    rows = rows.filter((r) => {
      if (naics.length && mode !== 'ignore') {
        const have = clean(r.naicsCode, 12);
        if (!have) return false;
        if (mode === 'broaden') {
          if (!naics.some(c => have.indexOf(c.slice(0, 4)) === 0)) return false;
        } else if (!naics.includes(have)) return false;
      }
      if (setAside && setAside !== 'any') {
        const hay = [r.setAsideCode, r.setAside].join(' ').toLowerCase();
        if (!matchesSetAside(hay, setAside)) return false;
      }
      if (filters.status === 'active' && r.active === false) return false;
      if (stateFilter && r.state !== stateFilter) return false;
      if (zip && String(r.zip || '').indexOf(zip) !== 0) return false;
      if (pop && clean(r.placeOfPerformanceText, 300).toLowerCase().indexOf(pop) < 0) return false;
      if (keyword && !matchesKeyword(r, keyword)) return false;
      return true;
    });
    return {
      ok: true,
      source: 'local-index',
      dbPath,
      storageEngine: state.storageEngine,
      total: rows.length,
      results: rows.slice(0, limit),
      stale: isStale(state),
      lastRun: latestCompletedBatch(state)
    };
  }

  function status() {
    const state = readState();
    const lastRun = latestCompletedBatch(state);
    const recordCount = state.tables.govcon_opportunities.length;
    return {
      ok: true,
      dbPath,
      storageEngine: state.storageEngine,
      sqliteContract: TABLES.slice(),
      recordCount,
      lastRun,
      stale: isStale(state),
      estimatedStorageBytes: estimateBytes(state),
      estimatedStorageLabel: formatBytes(estimateBytes(state))
    };
  }

  function clear() {
    const state = emptyState();
    writeState(state);
    return status();
  }

  return { dbPath, ensureSchema, beginBatch, completeBatch, upsertOpportunities, search, status, clear };
}

function normalizeOpportunity(input, batchId) {
  input = input || {};
  const pop = popText(input.placeOfPerformance || input.placeOfPerformanceText);
  const stateZip = extractStateZip(input.placeOfPerformance || input.placeOfPerformanceText);
  const noticeId = clean(input.noticeId || input.id, 120);
  return {
    id: noticeId || clean(input.solicitationNumber, 120) || ('opp_' + Math.random().toString(16).slice(2)),
    noticeId,
    solicitationNumber: clean(input.solicitationNumber, 160),
    title: clean(input.title, 300),
    agency: clean(input.agency || input.organizationName, 200),
    department: clean(input.department || input.fullParentPathName, 200),
    subtier: clean(input.subtier || input.subTier || input.subAgency, 200),
    office: clean(input.office, 200),
    postedDate: clean(input.postedDate || input.publishDate, 40),
    responseDeadline: clean(input.responseDeadline || input.responseDeadLine || input.dueDate, 40),
    naicsCode: clean(input.naicsCode || input.naics, 12),
    classificationCode: clean(input.classificationCode || input.psc, 12),
    setAside: clean(input.setAside || input.typeOfSetAsideDescription || input.typeOfSetAside, 160),
    setAsideCode: clean(input.setAsideCode || input.typeOfSetAside, 40),
    type: clean(input.noticeType || input.type, 80),
    status: clean(input.archiveType || input.status, 80),
    active: input.active !== false,
    placeOfPerformanceText: pop,
    state: clean(input.state || stateZip.state, 2).toUpperCase(),
    zip: clean(input.zip || stateZip.zip, 10),
    sourceUrlSafe: stripKey(input.sourceUrlSafe || input.sourceUrl || input.samUrl || input.uiLink || ''),
    uiLink: stripKey(input.uiLink || input.samUrl || ''),
    descriptionLink: stripKey(input.descriptionLink || (/^https?:\/\//i.test(String(input.description || '')) ? input.description : '')),
    resourceLinksJson: safeJson((input.resourceLinks || []).map(stripKey)),
    pointOfContactJson: safeJson(input.pointOfContact || []),
    awardJson: safeJson(input.award || null),
    descriptionText: clean(input.descriptionText || (input.description && !/^https?:\/\//i.test(String(input.description)) ? input.description : ''), 5000),
    fetchedAt: new Date().toISOString(),
    searchBatchId: batchId || null
  };
}

function buildFtsRow(row) {
  return {
    noticeId: row.noticeId,
    title: row.title,
    agency: row.agency,
    solicitationNumber: row.solicitationNumber,
    naicsCode: row.naicsCode,
    setAside: row.setAside,
    placeOfPerformanceText: row.placeOfPerformanceText,
    descriptionText: row.descriptionText || ''
  };
}

function matchesKeyword(r, keyword) {
  const hay = [r.title, r.agency, r.solicitationNumber, r.naicsCode, r.setAside, r.placeOfPerformanceText, r.descriptionText]
    .map(x => String(x || '').toLowerCase()).join(' ');
  const synonyms = keyword === 'janitorial' ? ['janitorial', 'custodial', 'cleaning'] : [keyword];
  return synonyms.some(k => hay.indexOf(k) >= 0);
}

function matchesSetAside(hay, wanted) {
  const aliases = {
    sdvosbc: ['sdvosbc', 'sdvosb', 'service-disabled veteran'],
    sdvosbs: ['sdvosbs', 'sdvosb sole'],
    hzc: ['hzc', 'hubzone', 'hub zone'],
    hzs: ['hzs', 'hubzone sole'],
    '8a': ['8a', '8(a)'],
    wosb: ['wosb', 'women-owned'],
    edwosb: ['edwosb'],
    vsa: ['vsa', 'vosb', 'veteran-owned']
  };
  return (aliases[wanted] || [wanted]).some(x => hay.indexOf(x) >= 0);
}

function latestCompletedBatch(state) {
  return (state.tables.govcon_index_batches || []).filter(b => b.status === 'completed').slice(-1)[0] || null;
}
function isStale(state) {
  const last = latestCompletedBatch(state);
  if (!last || !last.completedAt) return true;
  return Date.now() - Date.parse(last.completedAt) > 24 * 3600000;
}
function estimateBytes(state) { return Buffer.byteLength(JSON.stringify(state || {}), 'utf8'); }
function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function safeJson(v) { try { return JSON.stringify(v == null ? null : v); } catch (_) { return 'null'; } }
function clean(v, max) {
  if (v && typeof v === 'object') {
    if (Array.isArray(v)) v = v.map(x => clean(x, max)).filter(Boolean).join(' / ');
    else v = v.name || v.code || v.value || v.title || v.description || '';
  }
  return String(v == null ? '' : v).trim().slice(0, max || 200);
}
function splitCodes(v) { return (Array.isArray(v) ? v : String(v || '').split(/[,\s;]+/)).map(x => clean(x, 12)).filter(Boolean); }
function clampInt(v, d, min, max) { v = Number(v); if (!Number.isFinite(v)) v = d; return Math.max(min, Math.min(max, Math.floor(v))); }
function stripKey(url) {
  let s = String(url || '');
  s = s.replace(/([?&])(api_key|apikey)=[^&#"']*&?/gi, (m, sep) => sep === '?' ? '?' : '&').replace(/[?&]$/, '');
  return /api_key|apikey|\[object Object\]/i.test(s) ? '' : s;
}
function popText(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 300);
  if (Array.isArray(v)) return v.map(popText).filter(Boolean).join(' / ').slice(0, 300);
  const state = v.state && (v.state.code || v.state.name || v.state);
  const city = v.city && (v.city.name || v.city.code || v.city);
  const zip = v.zip || v.zipCode || v.postalCode;
  return [city, state, zip].filter(Boolean).join(', ').slice(0, 300);
}
function extractStateZip(v) {
  const text = popText(v);
  const state = (text.match(/\b[A-Z]{2}\b/) || [''])[0];
  const zip = (text.match(/\b\d{5}(?:-\d{4})?\b/) || [''])[0];
  return { state, zip };
}

module.exports = { createGovconIndexDb, normalizeOpportunity, TABLES };

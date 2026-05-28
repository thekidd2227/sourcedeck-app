'use strict';

const KEY = 'govcon.opportunityRecords';

function createOpportunityRecordService(store, nowFn) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('opportunity-records: store must implement get(key) and set(key, value)');
  }
  const now = nowFn || (() => Date.now());

  function list() {
    const rows = store.get(KEY) || [];
    return Array.isArray(rows) ? rows.map(normalizeOpportunityRecord) : [];
  }

  function upsert(input) {
    const incoming = normalizeOpportunityRecord(Object.assign({}, input, {
      updatedAt: new Date(now()).toISOString()
    }));
    if (!incoming.id) incoming.id = identityFor(incoming);
    const rows = list();
    const idx = rows.findIndex(r => sameOpportunity(r, incoming));
    const next = idx >= 0
      ? rows.map((r, i) => i === idx ? mergeRecord(r, incoming, now) : r)
      : rows.concat(Object.assign({ createdAt: new Date(now()).toISOString() }, incoming));
    store.set(KEY, next);
    return idx >= 0 ? next[idx] : next[next.length - 1];
  }

  function patch(idOrIdentity, patchValue) {
    const rows = list();
    const idx = rows.findIndex(r => r.id === idOrIdentity || identityFor(r) === idOrIdentity);
    if (idx < 0) return null;
    const next = rows.slice();
    next[idx] = normalizeOpportunityRecord(mergeRecord(next[idx], Object.assign({}, patchValue, {
      updatedAt: new Date(now()).toISOString()
    }), now));
    store.set(KEY, next);
    return next[idx];
  }

  function get(idOrIdentity) {
    return list().find(r => r.id === idOrIdentity || identityFor(r) === idOrIdentity) || null;
  }

  function favorite(idOrIdentity, value) {
    return patch(idOrIdentity, { favorite: !!value });
  }

  function favorites() {
    return list().filter(r => r.favorite === true);
  }

  return { list, get, upsert, patch, favorite, favorites, KEY };
}

function normalizeOpportunityRecord(input) {
  input = input && typeof input === 'object' ? input : {};
  const base = {
    id: clean(input.id || identityFor(input), 160),
    noticeId: clean(input.noticeId || input['Notice ID'], 120),
    solicitationNumber: clean(input.solicitationNumber || input['Solicitation Number'], 160),
    title: clean(input.title || input.Title, 300),
    agency: clean(input.agency || input.Agency, 200),
    office: clean(input.office || input.Office || input.subAgency, 200),
    naics: clean(input.naics || input.NAICS, 20),
    psc: clean(input.psc || input.PSC, 20),
    setAside: clean(input.setAside || input['Set-Aside Code'], 120),
    responseDeadline: clean(input.responseDeadline || input['Response Deadline'], 40),
    placeOfPerformance: input.placeOfPerformance || input['Place of Performance'] || null,
    favorite: input.favorite === true,
    deadlineEvents: array(input.deadlineEvents),
    reminders: array(input.reminders),
    subcontractorSourcingRuns: array(input.subcontractorSourcingRuns),
    incumbentResearch: input.incumbentResearch || null,
    solicitationAnalysis: input.solicitationAnalysis || null,
    proposalWorkspace: input.proposalWorkspace || null,
    clarificationQuestions: array(input.clarificationQuestions),
    relationshipStrategy: input.relationshipStrategy || null,
    communicationsLog: array(input.communicationsLog),
    exports: array(input.exports),
    scheduledSamSearches: array(input.scheduledSamSearches),
    createdAt: clean(input.createdAt, 40),
    updatedAt: clean(input.updatedAt, 40)
  };
  return Object.assign({}, input, base);
}

function mergeRecord(current, patchValue) {
  const merged = Object.assign({}, current, patchValue);
  for (const key of ['deadlineEvents','reminders','subcontractorSourcingRuns','clarificationQuestions','communicationsLog','exports','scheduledSamSearches']) {
    if (Array.isArray(current[key]) || Array.isArray(patchValue[key])) {
      merged[key] = dedupeArray([...(current[key] || []), ...(patchValue[key] || [])], key);
    }
  }
  return normalizeOpportunityRecord(merged);
}

function sameOpportunity(a, b) {
  if (a.noticeId && b.noticeId && a.noticeId === b.noticeId) return true;
  if (a.solicitationNumber && b.solicitationNumber && a.solicitationNumber === b.solicitationNumber) return true;
  return fallbackKey(a) && fallbackKey(a) === fallbackKey(b);
}

function identityFor(o) {
  o = o || {};
  if (o.noticeId || o['Notice ID']) return 'notice_' + clean(o.noticeId || o['Notice ID'], 120);
  if (o.solicitationNumber || o['Solicitation Number']) return 'sol_' + clean(o.solicitationNumber || o['Solicitation Number'], 160);
  return 'opp_' + fallbackKey(o);
}

function fallbackKey(o) {
  const raw = [o.title || o.Title, o.agency || o.Agency].filter(Boolean).join('|').toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 180);
}

function dedupeArray(rows, scope) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row && (row.id || row.eventId || row.runId || row.exportId || JSON.stringify(row).slice(0, 400));
    const scoped = scope + ':' + key;
    if (seen.has(scoped)) continue;
    seen.add(scoped);
    out.push(row);
  }
  return out;
}

function array(v) { return Array.isArray(v) ? v : []; }
function clean(v, max) { return String(v || '').trim().slice(0, max || 200); }

module.exports = {
  KEY,
  createOpportunityRecordService,
  normalizeOpportunityRecord,
  sameOpportunity,
  identityFor
};

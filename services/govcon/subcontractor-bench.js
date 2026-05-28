// services/govcon/subcontractor-bench.js
//
// Local subcontractor/vendor bench data service.

'use strict';

function sanitizeBenchRecord(input) {
  input = input && typeof input === 'object' ? input : {};
  const id = String(input.id || ('sub_' + Date.now().toString(36))).slice(0, 80);
  return Object.freeze({
    id,
    name: clean(input.name || input.company || input.person, 120),
    contact: clean(input.contact, 120),
    serviceCategory: clean(input.serviceCategory, 120),
    certifications: list(input.certifications, 20),
    socioeconomicStatus: list(input.socioeconomicStatus, 20),
    licenses: list(input.licenses, 30),
    insurance: clean(input.insurance, 200),
    bonding: clean(input.bonding, 200),
    serviceArea: clean(input.serviceArea, 200),
    rates: clean(input.rates, 200),
    responseSpeed: clean(input.responseSpeed, 60),
    qualityScore: clamp(input.qualityScore, 0, 100),
    docsOnFile: list(input.docsOnFile, 40),
    similarlySituatedStatus: clean(input.similarlySituatedStatus, 120),
    notes: clean(input.notes, 1000),
    updatedAt: new Date().toISOString()
  });
}

function createSubcontractorBenchService(store) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('subcontractor-bench: store must implement get(key) and set(key, value)');
  }
  const KEY = 'govcon.subcontractorBench';
  function listRecords() {
    const rows = store.get(KEY) || [];
    return Array.isArray(rows) ? rows.map(sanitizeBenchRecord) : [];
  }
function save(record) {
    const cleanRec = sanitizeBenchRecord(record);
    const rows = listRecords();
    const idx = rows.findIndex(r => r.id === cleanRec.id);
    const next = idx >= 0
      ? rows.map(r => r.id === cleanRec.id ? cleanRec : r)
      : rows.concat(cleanRec);
    store.set(KEY, next);
    return cleanRec;
  }
  function remove(id) {
    const before = listRecords();
    const next = before.filter(r => r.id !== id);
    store.set(KEY, next);
    return { ok: next.length !== before.length };
  }
function match(opp) {
    opp = opp && typeof opp === 'object' ? opp : {};
    const hay = [opp.title, opp.description, opp.naics, opp.psc].filter(Boolean).join(' ').toLowerCase();
    return listRecords()
      .map(r => Object.assign({}, r, { matchScore: scoreBenchRecord(r, hay) }))
      .filter(r => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
  return { list: listRecords, save, remove, match };
}

function scoreBenchRecord(r, hay) {
  r = r && typeof r === 'object' ? r : {};
  hay = String(hay || '').toLowerCase();
  let score = 0;
  const fields = [r.serviceCategory, r.serviceArea, r.name, r.notes].filter(Boolean).join(' ').toLowerCase();
  for (const tok of fields.split(/[^a-z0-9]+/).filter(t => t.length > 3)) {
    if (hay.includes(tok)) score += 8;
  }
  score += Math.round((r.qualityScore || 0) / 10);
  if ((r.docsOnFile || []).length) score += 8;
  if (r.insurance) score += 8;
  if (r.bonding) score += 5;
  if (r.similarlySituatedStatus) score += 8;
  return clamp(score, 0, 100);
}

function list(v, max) {
  if (typeof v === 'string') v = v.split(/[,;\n]/);
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  const out = [];
  for (const item of v) {
    const s = clean(item, 120);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.slice(0, max || 20);
}

function clean(v, max) {
  return String(v || '').trim().slice(0, max || 200);
}

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

module.exports = {
  createSubcontractorBenchService,
  sanitizeBenchRecord,
  scoreBenchRecord
};

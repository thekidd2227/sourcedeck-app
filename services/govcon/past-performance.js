// services/govcon/past-performance.js
//
// Local past-performance and capability library.
//
// Stored under electron-store key `govcon.pastPerformance`.
// Pure data + relevance scoring; no network. Feeds proposal drafting
// and bid/no-bid scoring downstream.
//
// Project shape (after sanitize):
//   {
//     id, customer, agency, naics, psc, contractType,
//     valueRange: { minUsd, maxUsd },
//     periodOfPerformance: { start, end },
//     scopeTags: [...],
//     proofPoints: [...],
//     cparsRating, contactPocPermission
//   }

'use strict';

const KEY = 'govcon.pastPerformance';

const VALID_CPARS = new Set(['exceptional', 'very_good', 'satisfactory', 'marginal', 'unsatisfactory', null, undefined]);

function genId() {
  // small, dependency-free, sortable enough for in-app records
  return 'pp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function sanitizeProject(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {
    id:           typeof p.id === 'string' && p.id ? p.id : genId(),
    customer:     str(p.customer),
    agency:       str(p.agency),
    naics:        str(p.naics).match(/^\d{2,6}$/) ? str(p.naics) : '',
    psc:          str(p.psc).match(/^[A-Z0-9]{1,4}$/i) ? str(p.psc).toUpperCase() : '',
    contractType: str(p.contractType),
    valueRange: {
      minUsd: numOrNull(p.valueRange && p.valueRange.minUsd),
      maxUsd: numOrNull(p.valueRange && p.valueRange.maxUsd)
    },
    periodOfPerformance: {
      start: dateStr(p.periodOfPerformance && p.periodOfPerformance.start),
      end:   dateStr(p.periodOfPerformance && p.periodOfPerformance.end)
    },
    scopeTags:  arrStr(p.scopeTags, 16),
    proofPoints: arrStr(p.proofPoints, 12, 240),
    cparsRating: VALID_CPARS.has(p.cparsRating) ? (p.cparsRating || null) : null,
    contactPocPermission: !!p.contactPocPermission
  };
  if (!out.customer && !out.agency) return null; // require at least one party
  return out;
}

function relevanceScore(project, opportunity) {
  if (!project || !opportunity) return 0;
  let score = 0;
  const reasons = [];

  // NAICS exact = +30
  if (project.naics && opportunity.naics && project.naics === String(opportunity.naics)) {
    score += 30;
    reasons.push('NAICS exact match (' + project.naics + ')');
  } else if (project.naics && opportunity.naics &&
             project.naics.slice(0, 4) === String(opportunity.naics).slice(0, 4)) {
    score += 18;
    reasons.push('NAICS partial match (' + project.naics + ' / ' + opportunity.naics + ')');
  }

  // PSC exact = +15
  if (project.psc && opportunity.psc && project.psc === String(opportunity.psc).toUpperCase()) {
    score += 15;
    reasons.push('PSC exact match (' + project.psc + ')');
  }

  // Same agency = +20; same department only = +8
  if (project.agency && opportunity.agency) {
    const a = project.agency.toLowerCase();
    const b = String(opportunity.agency).toLowerCase();
    if (a === b) { score += 20; reasons.push('Same agency'); }
    else if (a.split(' ')[0] === b.split(' ')[0]) { score += 8; reasons.push('Same parent department'); }
  }

  // Scope-tag overlap
  if (project.scopeTags && project.scopeTags.length && opportunity.title) {
    const t = String(opportunity.title).toLowerCase() + ' ' + String(opportunity.description || '').toLowerCase();
    const hits = project.scopeTags.filter(tag => tag && t.includes(tag.toLowerCase()));
    if (hits.length) {
      const add = Math.min(20, hits.length * 6);
      score += add;
      reasons.push('Scope-tag overlap: ' + hits.join(', '));
    }
  }

  // CPARS bonus
  if (project.cparsRating === 'exceptional')      score += 8;
  else if (project.cparsRating === 'very_good')   score += 5;
  else if (project.cparsRating === 'satisfactory') score += 2;

  // Contact permission gives an extra usable bump
  if (project.contactPocPermission) { score += 4; reasons.push('Customer POC permission on file'); }

  // Recency: end within 36 months = +6
  if (project.periodOfPerformance && project.periodOfPerformance.end) {
    const t = Date.parse(project.periodOfPerformance.end);
    const ageMo = isFinite(t) ? (Date.now() - t) / (30 * 86400000) : 999;
    if (ageMo <= 36) { score += 6; reasons.push('Recent (within 36 months)'); }
  }

  return { score: Math.min(100, score), reasons };
}

function createPastPerformanceService(store) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('past-performance: store must implement get/set');
  }

  function list() {
    const arr = store.get(KEY);
    return Array.isArray(arr) ? arr : [];
  }
  function save(project) {
    const clean = sanitizeProject(project);
    if (!clean) return null;
    const all = list();
    const idx = all.findIndex(x => x && x.id === clean.id);
    if (idx >= 0) all[idx] = clean; else all.push(clean);
    store.set(KEY, all);
    return clean;
  }
  function remove(id) {
    const all = list().filter(x => x && x.id !== id);
    store.set(KEY, all);
    return true;
  }
  function match(opportunity, opts) {
    opts = opts || {};
    const limit = opts.limit || 5;
    const ranked = list().map(p => ({ project: p, ...relevanceScore(p, opportunity) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return ranked;
  }
  return { list, save, remove, match };
}

function str(v)        { return typeof v === 'string' ? v.trim().slice(0, 200) : ''; }
function dateStr(v)    { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null; }
function numOrNull(v)  { return typeof v === 'number' && isFinite(v) ? v : null; }
function arrStr(v, max, perCap) {
  if (!Array.isArray(v)) return [];
  return v.map(x => typeof x === 'string' ? x.trim().slice(0, perCap || 80) : '').filter(Boolean).slice(0, max || 16);
}

module.exports = {
  createPastPerformanceService,
  sanitizeProject,
  relevanceScore
};

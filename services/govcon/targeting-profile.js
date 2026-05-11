// services/govcon/targeting-profile.js
//
// User-editable GovCon targeting profile.
//
// Supersedes the previous hardcoded APPROVED_NAICS list in the renderer.
// Stored under the existing electron-store key `govcon.targeting`. All
// fields are optional and merged onto a sensible-but-generic default.
// We do NOT seed one contractor's NAICS list here -- the seed is empty
// by design, and operators add their own codes via Settings.
//
// Pure data layer. No network, no IPC. Caller (main.js) wires this up.

'use strict';

// ── Notice-type categories tracked separately ──
// The renderer's old `isSolicitationOpportunity` filter blanket-rejected
// Sources Sought and Pre-Solicitations. The new model treats them as a
// distinct lane (see services/govcon/pre-rfp.js) so an SS/RFI is
// pre-RFP intelligence, not noise.
const NOTICE_TYPE_GROUPS = Object.freeze({
  active_solicitation: ['Solicitation', 'Combined Synopsis/Solicitation', 'Combined Synopsis', 'RFP', 'RFQ'],
  pre_rfp_intel:       ['Sources Sought', 'Presolicitation', 'Pre-solicitation', 'RFI', 'Special Notice'],
  awards:              ['Award Notice', 'Award'],
  modifications:       ['Modification', 'Amendment', 'Cancellation', 'Justification']
});

// SBA-recognized small-business set-aside lanes plus open competition.
const KNOWN_SETASIDES = Object.freeze([
  'sdvosb', 'vosb', '8a', 'wosb', 'edwosb', 'hubzone',
  'small_business', 'total_small_business', 'open'
]);

// Common federal contract types.
const KNOWN_CONTRACT_TYPES = Object.freeze([
  'FFP',         // Firm-Fixed-Price
  'FFP-LOE',     // FFP Level of Effort
  'CPFF',        // Cost-Plus Fixed Fee
  'CPIF',        // Cost-Plus Incentive Fee
  'CPAF',        // Cost-Plus Award Fee
  'T&M',         // Time and Materials
  'LH',          // Labor Hour
  'IDIQ',        // Indefinite Delivery Indefinite Quantity
  'BPA',         // Blanket Purchase Agreement
  'MAS',         // Multiple Award Schedule (GSA)
  'BOA'          // Basic Ordering Agreement
]);

const KNOWN_CERTIFICATIONS = Object.freeze([
  'sdvosb', 'vosb', '8a', 'wosb', 'edwosb', 'hubzone',
  'small_business', 'sdb',
  'iso_9001', 'iso_27001', 'cmmc_l1', 'cmmc_l2'
]);

// Default profile is intentionally EMPTY for codes/agencies/set-asides --
// the operator fills these in. We seed conservative behavior on the
// notice-type and opportunity-type front so first-run is sane.
function defaultProfile() {
  return Object.freeze({
    schemaVersion: 1,
    name: 'Default profile',
    naics: [],
    psc:   [],
    agencies: { include: [], exclude: [] },
    setAsides: [],
    certifications: [],
    contractTypes: [],
    noticeTypes: {
      active_solicitation: true,
      pre_rfp_intel: true,
      awards: false,
      modifications: false
    },
    keywords: { include: [], exclude: [] },
    posted: { withinDays: 90 },
    deadline: { minDays: 0, maxDays: 365 },
    notes: ''
  });
}

// Sanitize a profile so we never persist garbage. Strings trimmed; arrays
// uniqued + filtered; unknown set-asides/contract types/certs dropped.
function sanitizeProfile(input) {
  const base = defaultProfile();
  const out = JSON.parse(JSON.stringify(base)); // deep clone (frozen base would error on assign)
  if (!input || typeof input !== 'object') return out;

  if (typeof input.name === 'string')   out.name = input.name.trim().slice(0, 80) || base.name;
  if (typeof input.notes === 'string')  out.notes = input.notes.slice(0, 2000);

  out.naics = uniqStrings(input.naics).filter(naicsLike).slice(0, 40);
  out.psc   = uniqStrings(input.psc).filter(pscLike).slice(0, 40);

  if (input.agencies && typeof input.agencies === 'object') {
    out.agencies.include = uniqStrings(input.agencies.include).slice(0, 40);
    out.agencies.exclude = uniqStrings(input.agencies.exclude).slice(0, 40);
  }

  out.setAsides      = uniqStrings(input.setAsides, /*lowercase*/true).filter(s => KNOWN_SETASIDES.includes(s));
  out.certifications = uniqStrings(input.certifications, true).filter(s => KNOWN_CERTIFICATIONS.includes(s));
  out.contractTypes  = uniqStrings(input.contractTypes).filter(s => KNOWN_CONTRACT_TYPES.includes(s));

  if (input.noticeTypes && typeof input.noticeTypes === 'object') {
    for (const k of Object.keys(out.noticeTypes)) {
      if (typeof input.noticeTypes[k] === 'boolean') out.noticeTypes[k] = input.noticeTypes[k];
    }
  }

  if (input.keywords && typeof input.keywords === 'object') {
    out.keywords.include = uniqStrings(input.keywords.include).slice(0, 30);
    out.keywords.exclude = uniqStrings(input.keywords.exclude).slice(0, 30);
  }

  if (input.posted && typeof input.posted.withinDays === 'number') {
    out.posted.withinDays = clamp(input.posted.withinDays, 1, 365);
  }
  if (input.deadline) {
    if (typeof input.deadline.minDays === 'number') out.deadline.minDays = clamp(input.deadline.minDays, 0, 365);
    if (typeof input.deadline.maxDays === 'number') out.deadline.maxDays = clamp(input.deadline.maxDays, 0, 365);
  }
  return out;
}

function naicsLike(s) { return /^\d{2,6}$/.test(String(s)); }
function pscLike(s)   { return /^[A-Z0-9]{1,4}$/i.test(String(s)); }

function uniqStrings(arr, lower) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (v === null || v === undefined) continue;
    let s = String(v).trim();
    if (lower) s = s.toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n | 0)); }

// Store-bound API. Caller passes an electron-store-compatible instance
// or any { get(k), set(k,v), has(k) } shim (used by tests).
function createTargetingProfileService(store) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('targeting-profile: store must implement get(key) and set(key, value)');
  }
  const KEY = 'govcon.targeting';

  function load() {
    const stored = store.get(KEY);
    return sanitizeProfile(stored);
  }
  function save(patch) {
    const merged = sanitizeProfile(Object.assign({}, load(), patch || {}));
    store.set(KEY, merged);
    return merged;
  }
  function reset() {
    const fresh = JSON.parse(JSON.stringify(defaultProfile()));
    store.set(KEY, fresh);
    return fresh;
  }

  return { load, save, reset };
}

module.exports = {
  createTargetingProfileService,
  defaultProfile,
  sanitizeProfile,
  NOTICE_TYPE_GROUPS,
  KNOWN_SETASIDES,
  KNOWN_CONTRACT_TYPES,
  KNOWN_CERTIFICATIONS
};

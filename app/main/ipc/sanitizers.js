// app/main/ipc/sanitizers.js
//
// Phase 2 — IPC argument sanitizers extracted from main.js.
//
// These helpers whitelist the renderer-supplied shape so the IPC
// boundary can never forward a stray field (e.g. an apiKey /
// Authorization header) into a service call. They are pure functions
// over plain objects: no Electron dependency, no service dependency.
//
// Behavior is byte-for-byte identical to the prior in-file implementation
// in main.js. The set of exported sanitizers is the minimum surface the
// feature IPC registrar needs.

'use strict';

// Whitelist the SAM outreach scan config coming from the renderer.
// Critically, no apiKey / authorization / credential field is ever
// forwarded.
function sanitizeOutreachConfig(c) {
  c = c || {};
  return {
    closingWindowDays: c.closingWindowDays === 7 ? 7 : 30,
    naics:   Array.isArray(c.naics) ? c.naics.filter(s => /^\d{2,6}$/.test(String(s))).slice(0, 40) : [],
    psc:     Array.isArray(c.psc)   ? c.psc.filter(s => /^[A-Z0-9]{1,4}$/i.test(String(s))).map(s => String(s).toUpperCase()).slice(0, 40) : [],
    keywords: Array.isArray(c.keywords)
      ? c.keywords.map(s => String(s).slice(0, 60)).slice(0, 30)
      : (typeof c.keywords === 'string' ? c.keywords.slice(0, 200) : ''),
    setAside: typeof c.setAside === 'string' ? c.setAside.trim().slice(0, 40) : '',
    state: typeof c.state === 'string' ? c.state.trim().toUpperCase().slice(0, 2) : '',
    zip: typeof c.zip === 'string' ? c.zip.replace(/[^\d-]/g, '').slice(0, 10) : '',
    placeOfPerformance: typeof c.placeOfPerformance === 'string' ? c.placeOfPerformance.trim().slice(0, 40) : '',
    dailyDraftLimit: typeof c.dailyDraftLimit === 'number' ? Math.max(1, Math.min(200, c.dailyDraftLimit | 0)) : 25,
    postedWithinDays: typeof c.postedWithinDays === 'number' ? Math.max(1, Math.min(365, c.postedWithinDays | 0)) : 90,
    limit: typeof c.limit === 'number' ? Math.max(1, Math.min(100, c.limit | 0)) : 25,
    draft: c.draft !== false,
    noticeTypes: c.noticeTypes && typeof c.noticeTypes === 'object' ? {
      active_solicitation: c.noticeTypes.active_solicitation !== false,
      pre_rfp_intel:       c.noticeTypes.pre_rfp_intel       !== false
    } : { active_solicitation: true, pre_rfp_intel: true }
  };
}

function sanitizeOutreachDraftInput(input) {
  input = input || {};
  return {
    id: typeof input.id === 'string' ? input.id.slice(0, 200) : '',
    dailyDraftLimit: typeof input.dailyDraftLimit === 'number' ? Math.max(1, Math.min(200, input.dailyDraftLimit | 0)) : 25
  };
}

function sanitizeSamLinkFetchInput(input) {
  input = input || {};
  return {
    noticeId: typeof input.noticeId === 'string' ? input.noticeId.trim().slice(0, 100) : '',
    solicitationNumber: typeof input.solicitationNumber === 'string' ? input.solicitationNumber.trim().slice(0, 100) : '',
    postedDate: typeof input.postedDate === 'string' ? input.postedDate.trim().slice(0, 40) : '',
    publishDate: typeof input.publishDate === 'string' ? input.publishDate.trim().slice(0, 40) : '',
    title: typeof input.title === 'string' ? input.title.trim().slice(0, 180) : ''
  };
}

// Module-scope counterpart to the nested helper used by sanitizeSamFilters.
// Exported so test scaffolds can exercise the set-aside translation table
// directly; the production caller is sanitizeSamFilters below.
function normalizeSamSetAsideCode(value) {
  var key = String(value || '').trim().toLowerCase();
  var map = {
    'sdvosb': 'SDVOSBC',
    'sdvosbc': 'SDVOSBC',
    'sdvosb set-aside': 'SDVOSBC',
    'sdvosbs': 'SDVOSBS',
    'sdvosb sole source': 'SDVOSBS',
    'hubzone': 'HZC',
    'hzc': 'HZC',
    'hubzone set-aside': 'HZC',
    'hzs': 'HZS',
    'hubzone sole source': 'HZS',
    '8a': '8A',
    '8(a)': '8A',
    'wosb': 'WOSB',
    'edwosb': 'EDWOSB',
    'vosb': 'VSA',
    'vsa': 'VSA'
  };
  if (map[key]) return map[key];
  return /^[A-Z0-9]{1,12}$/i.test(String(value || '')) ? String(value).trim().toUpperCase().slice(0, 40) : '';
}

function sanitizeSamFilters(f) {
  f = f || {};
  // Phase 25U — the Find Opportunities renderer sends NAICS and
  // set-aside as plain strings (the form fields are <input> /
  // <select>). The SAM search service expects naics as an array of
  // codes and setAsides as an array of lowercased substrings. Before
  // 25U this sanitizer ran `Array.isArray(f.naics)` on a string, got
  // false, and dropped the NAICS filter silently — so SAM.gov got a
  // generic search and the renderer then locally filtered the first
  // 25 unrelated rows to zero. Accept both shapes here so the IPC
  // boundary can never again eat the user's NAICS / set-aside.
  function coerceCodes(raw){
    if (Array.isArray(raw)){
      return raw.map(s => String(s)).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
    }
    if (typeof raw === 'string'){
      return raw.split(/[,\s;]+/).map(s => s.trim()).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
    }
    return [];
  }
  function coerceSetAsides(f){
    if (Array.isArray(f.setAsides)){
      return f.setAsides.map(s => String(s).toLowerCase()).slice(0, 10);
    }
    var sa = f.setAside;
    if (typeof sa !== 'string' || !sa) return [];
    // Map the renderer's dropdown codes to lower-case substrings the
    // service's applyTargeting helper matches on. SAM.gov's own
    // typeOfSetAside param accepts a code so we also expose the
    // single-code form via setAsideCode below.
    var aliases = {
      'sba':      ['small business', 'sba'],
      'sdvosb':   ['sdvosb', 'service-disabled veteran'],
      'sdvosbc':  ['sdvosb', 'service-disabled veteran'],
      'sdvosbs':  ['sdvosb sole', 'service-disabled veteran'],
      'wosb':     ['wosb', 'women-owned'],
      'edwosb':   ['edwosb'],
      'hubzone':  ['hubzone', 'hub zone'],
      'hzc':      ['hubzone', 'hub zone'],
      'hzs':      ['hubzone sole', 'hub zone sole'],
      '8a':       ['8(a)', '8a'],
      '8(a)':     ['8(a)', '8a'],
      'vsa':      ['vosb', 'veteran-owned']
    };
    var key = String(sa).toLowerCase();
    return (aliases[key] || [key]).slice(0, 10);
  }
  function normalizeSetAsideCode(value) {
    var key = String(value || '').trim().toLowerCase();
    var map = {
      'sdvosb': 'SDVOSBC',
      'sdvosbc': 'SDVOSBC',
      'sdvosb set-aside': 'SDVOSBC',
      'sdvosbs': 'SDVOSBS',
      'sdvosb sole source': 'SDVOSBS',
      'hubzone': 'HZC',
      'hzc': 'HZC',
      'hubzone set-aside': 'HZC',
      'hzs': 'HZS',
      'hubzone sole source': 'HZS',
      '8a': '8A',
      '8(a)': '8A',
      'wosb': 'WOSB',
      'edwosb': 'EDWOSB',
      'vosb': 'VSA',
      'vsa': 'VSA'
    };
    if (map[key]) return map[key];
    return /^[A-Z0-9]{1,12}$/i.test(String(value || '')) ? String(value).trim().toUpperCase().slice(0, 40) : '';
  }
  // dueWithinDays from the renderer means "closing within N days" —
  // i.e. responseDeadLine in [today, today+N]. SAM.gov accepts
  // rdlfrom/rdlto in MM/dd/yyyy. We surface the dates here as ISO
  // strings; the service converts them.
  var responseFrom = typeof f.responseFrom === 'string' ? f.responseFrom.slice(0, 10) : '';
  var responseTo   = typeof f.responseTo   === 'string' ? f.responseTo.slice(0, 10)   : '';
  if (!responseFrom && !responseTo && typeof f.dueWithinDays === 'number' && f.dueWithinDays > 0){
    var days = Math.max(1, Math.min(365, f.dueWithinDays | 0));
    var todayIso = new Date().toISOString().slice(0, 10);
    var future = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    responseFrom = todayIso;
    responseTo = future;
  }
  // placeOfPerformance is a free-text string in the renderer
  // ("e.g. CA, San Diego"). If it parses to a 2-letter US state code
  // we forward it as state; otherwise we leave it for the local
  // backstop. Never invent a state code.
  var stateRaw = typeof f.state === 'string' ? f.state.trim().toUpperCase().slice(0, 2) : '';
  if (!stateRaw && typeof f.placeOfPerformance === 'string'){
    var m = f.placeOfPerformance.trim().match(/^([A-Z]{2})(\b|$)/i);
    if (m) stateRaw = m[1].toUpperCase();
  }
  // status from the renderer: 'active' | 'archived' | 'awarded'.
  // Translate to noticeTypes so the SAM service queries the right
  // ptype bucket.
  var noticeTypes;
  if (f.noticeTypes && typeof f.noticeTypes === 'object'){
    noticeTypes = {
      active_solicitation: f.noticeTypes.active_solicitation !== false,
      pre_rfp_intel:       f.noticeTypes.pre_rfp_intel       !== false,
      awards:              !!f.noticeTypes.awards,
      modifications:       !!f.noticeTypes.modifications
    };
  } else if (typeof f.status === 'string' && f.status){
    var s = f.status.toLowerCase();
    noticeTypes = {
      active_solicitation: s === 'active' || s === '',
      pre_rfp_intel:       s === 'active' || s === '',
      awards:              s === 'awarded',
      modifications:       false
    };
  } else {
    noticeTypes = { active_solicitation: true, pre_rfp_intel: true, awards: false, modifications: false };
  }
  return {
    keyword: typeof f.keyword === 'string' ? f.keyword.trim().slice(0, 120) : '',
    naics:   coerceCodes(f.naics),
    psc:     Array.isArray(f.psc)   ? f.psc.filter(s => /^[A-Z0-9]{1,4}$/i.test(String(s))).map(s => String(s).toUpperCase()).slice(0, 40) : [],
    noticeTypes: noticeTypes,
    posted: { withinDays: typeof f.posted?.withinDays === 'number' ? Math.max(1, Math.min(365, f.posted.withinDays | 0)) : 90 },
    limit: typeof f.limit === 'number' ? Math.max(1, Math.min(1000, f.limit | 0)) : 25,
    // Phase 25U — when NAICS is set the service may need to page past
    // the first response to collect enough exact matches. Cap at 5
    // pages by default so we never hammer SAM.gov.
    maxPages: typeof f.maxPages === 'number' ? Math.max(1, Math.min(10, f.maxPages | 0)) : (coerceCodes(f.naics).length ? 5 : 1),
    offset: typeof f.offset === 'number' ? Math.max(0, f.offset | 0) : 0,
    solicitationNumber: typeof f.solicitationNumber === 'string' ? f.solicitationNumber.trim().slice(0, 80) : '',
    noticeId: typeof f.noticeId === 'string' ? f.noticeId.trim().slice(0, 80) : '',
    title: typeof f.title === 'string' ? f.title.trim().slice(0, 160) : (typeof f.keyword === 'string' ? f.keyword.trim().slice(0, 160) : ''),
    state: stateRaw,
    zip: typeof f.zip === 'string' ? f.zip.replace(/[^\d-]/g, '').slice(0, 10) : '',
    organizationName: typeof f.organizationName === 'string' ? f.organizationName.trim().slice(0, 120) : '',
    organizationCode: typeof f.organizationCode === 'string' ? f.organizationCode.trim().slice(0, 40) : '',
    setAsideCode: typeof f.setAsideCode === 'string' ? f.setAsideCode.trim().slice(0, 40) : normalizeSetAsideCode(f.setAside),
    responseFrom: responseFrom,
    responseTo: responseTo,
    agencies: f.agencies && typeof f.agencies === 'object' ? {
      include: Array.isArray(f.agencies.include) ? f.agencies.include.map(String).slice(0, 20) : [],
      exclude: Array.isArray(f.agencies.exclude) ? f.agencies.exclude.map(String).slice(0, 20) : []
    } : { include: [], exclude: [] },
    setAsides: coerceSetAsides(f)
  };
}

module.exports = {
  sanitizeOutreachConfig,
  sanitizeOutreachDraftInput,
  sanitizeSamLinkFetchInput,
  sanitizeSamFilters,
  normalizeSamSetAsideCode
};

// services/govcon/sam-search.js
//
// SAM.gov opportunity-search service for the main process.
//
// Behavior:
//   - If a SAM.gov API key is configured (env SAM_API_KEY or a key
//     stored in the secure keystore), call the SAM.gov Opportunities
//     API with a normalized parameter set.
//   - Normalize results to a stable shape regardless of SAM.gov field
//     drift.
//   - Dedupe by noticeId, then by solicitationNumber.
//   - If no API key is present, return a status object that includes
//     a fallback SAM.gov human-search URL the renderer can open.
//
// This service runs main-process only. Tests inject `fetch` via deps so
// no real network call ever leaves the harness.

'use strict';

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';
const SAM_HUMAN_BASE = 'https://sam.gov/search/?index=opp&page=1&pageSize=25&sort=-modifiedDate';

const NOTICE_TYPE_TO_GROUP = {
  'Solicitation': 'active_solicitation',
  'Combined Synopsis/Solicitation': 'active_solicitation',
  'Combined Synopsis': 'active_solicitation',
  'RFP': 'active_solicitation',
  'RFQ': 'active_solicitation',

  'Sources Sought': 'pre_rfp_intel',
  'Presolicitation': 'pre_rfp_intel',
  'Pre-solicitation': 'pre_rfp_intel',
  'RFI': 'pre_rfp_intel',
  'Special Notice': 'pre_rfp_intel',

  'Award Notice': 'awards',
  'Award': 'awards',

  'Justification': 'modifications',
  'Modification': 'modifications',
  'Amendment': 'modifications',
  'Cancellation': 'modifications'
};

function isoDateOnly(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date && !isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

function daysUntil(dateLike, nowMs) {
  const t = Date.parse(String(dateLike || ''));
  if (!isFinite(t)) return null;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  return Math.round((t - now) / 86400000);
}

// Normalize one record from SAM.gov's API.
// We keep field access defensive because SAM.gov occasionally renames
// fields and we don't want a payload change to crash the service.
function normalizeSamRecord(rec, nowMs) {
  rec = rec || {};
  const noticeType = rec.type || rec.baseType || rec.noticeType || '';
  const group = NOTICE_TYPE_TO_GROUP[noticeType] || 'other';

  let agency = null;
  if (rec.fullParentPathName) {
    // SAM packs parent path as "DEPARTMENT.SUB-AGENCY.OFFICE"
    agency = String(rec.fullParentPathName).split('.')[0] || null;
  } else if (rec.organizationName) {
    agency = rec.organizationName;
  }

  const naics = rec.naicsCode || (Array.isArray(rec.naicsCodes) && rec.naicsCodes[0]) || null;
  const setAside = rec.typeOfSetAside || rec.setAside || rec.setAsideType || null;
  const responseDeadline = rec.responseDeadLine || rec.responseDeadline || rec.deadline || null;
  const postedDate = rec.postedDate || rec.publishedDate || rec.datePosted || null;

  return Object.freeze({
    noticeId:           rec.noticeId || rec.id || rec.notice_id || null,
    solicitationNumber: rec.solicitationNumber || rec.solnbr || null,
    title:              (rec.title || '').toString().trim() || null,
    noticeType,
    noticeGroup:        group,
    agency,
    subAgency:          rec.subTier || rec.office || null,
    naics:              naics,
    psc:                rec.classificationCode || rec.psc || null,
    setAside,
    contractType:       rec.contractType || rec.typeOfContract || null,
    placeOfPerformance: rec.placeOfPerformance || null,
    postedDate:         isoDateOnly(postedDate),
    responseDeadline:   isoDateOnly(responseDeadline),
    daysUntilDue:       daysUntil(responseDeadline, nowMs),
    description:        rec.description || null,
    samUrl:             rec.uiLink || rec.link || rec.url || null,
    _source:            'sam.gov',
    _normalizedAt:      new Date(nowMs || Date.now()).toISOString()
  });
}

// Dedupe by noticeId then by solicitationNumber.
// Earlier-listed records win when there's a clash.
function dedupe(records) {
  const out = [];
  const seenNotice = new Set();
  const seenSol    = new Set();
  for (const r of records) {
    if (!r) continue;
    if (r.noticeId && seenNotice.has(r.noticeId)) continue;
    if (!r.noticeId && r.solicitationNumber && seenSol.has(r.solicitationNumber)) continue;
    if (r.noticeId) seenNotice.add(r.noticeId);
    if (r.solicitationNumber) seenSol.add(r.solicitationNumber);
    out.push(r);
  }
  return out;
}

// Filter normalized records against a targeting profile.
function applyTargeting(records, profile) {
  profile = profile || {};
  const noticeTypes = profile.noticeTypes || { active_solicitation: true };
  const setAsides   = (profile.setAsides || []).map(s => String(s).toLowerCase());
  const naicsAllow  = (profile.naics || []).map(s => String(s).toLowerCase());
  const inclAgency  = (profile.agencies && profile.agencies.include) || [];
  const exclAgency  = (profile.agencies && profile.agencies.exclude) || [];

  return records.filter(r => {
    if (noticeTypes[r.noticeGroup] === false) return false;
    if (noticeTypes[r.noticeGroup] === undefined && r.noticeGroup === 'awards') return false;
    if (naicsAllow.length && (!r.naics || !naicsAllow.includes(String(r.naics).toLowerCase()))) return false;
    if (setAsides.length && r.setAside) {
      const sa = String(r.setAside).toLowerCase();
      const hit = setAsides.some(s => sa.includes(s));
      if (!hit) return false;
    }
    if (inclAgency.length && r.agency) {
      const hit = inclAgency.some(a => String(r.agency).toLowerCase().includes(String(a).toLowerCase()));
      if (!hit) return false;
    }
    if (exclAgency.length && r.agency) {
      const hit = exclAgency.some(a => String(r.agency).toLowerCase().includes(String(a).toLowerCase()));
      if (hit) return false;
    }
    return true;
  });
}

// Build a human-readable SAM.gov search URL the renderer can open as a
// fallback when no API key is configured. This is the same kind of URL
// the legacy renderer built, kept centralized.
function buildSamHumanUrl(filters) {
  filters = filters || {};
  const codes = Array.isArray(filters.naics) ? filters.naics : [];
  const radio = codes.length > 1 ? 'ANY' : 'ALL';
  let url = SAM_HUMAN_BASE + '&sfm%5Bstatus%5D%5Bis_active%5D=true';
  url += '&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=' + radio;
  codes.forEach((c, i) => {
    url += '&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B' + i + '%5D%5Bkey%5D=' + encodeURIComponent(c);
    url += '&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B' + i + '%5D%5Bvalue%5D=' + encodeURIComponent(c);
  });
  const nt = filters.noticeTypes || { active_solicitation: true };
  if (nt.active_solicitation) {
    url += '&sfm%5BnoticeType%5D%5Bis_Solicitation%5D=true';
    url += '&sfm%5BnoticeType%5D%5Bis_Combined_Synopsis%5D=true';
  }
  if (nt.pre_rfp_intel) {
    url += '&sfm%5BnoticeType%5D%5Bis_Sources_Sought%5D=true';
    url += '&sfm%5BnoticeType%5D%5Bis_Presolicitation%5D=true';
  }
  return url;
}

// Factory. Inject deps for testability.
//   deps.fetch    -> fetch-compatible function (defaults to global fetch)
//   deps.getApiKey -> async fn returning the SAM.gov API key or null
//   deps.now      -> () => epochMs (default Date.now)
function createSamSearchService(deps) {
  deps = deps || {};
  const fetchFn = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const getApiKey = deps.getApiKey || (async () => null);
  const now = deps.now || (() => Date.now());

  async function search(filters) {
    filters = filters || {};
    const apiKey = await getApiKey();
    if (!apiKey) {
      return {
        ok: true,
        usedApi: false,
        reason: 'no_api_key',
        fallbackUrl: buildSamHumanUrl(filters),
        results: [],
        total: 0
      };
    }
    if (!fetchFn) {
      return { ok: false, usedApi: false, reason: 'no_fetch_available', results: [], total: 0 };
    }

    const params = new URLSearchParams();
    params.set('api_key', apiKey);
    params.set('limit',  String(Math.min(filters.limit || 25, 100)));

    // SAM.gov requires postedFrom + postedTo as MM/dd/yyyy.
    const within = (filters.posted && filters.posted.withinDays) || 90;
    const toD    = new Date(now());
    const fromD  = new Date(now() - within * 86400000);
    params.set('postedFrom', mmddyyyy(fromD));
    params.set('postedTo',   mmddyyyy(toD));

    if (filters.naics && filters.naics.length) {
      params.set('ncode', filters.naics.join(','));
    }
    if (filters.psc && filters.psc.length) {
      params.set('ccode', filters.psc.join(','));
    }
    if (filters.keyword) {
      params.set('q', filters.keyword);
    }
    // notice-type group → SAM.gov ptype
    const nt = filters.noticeTypes || { active_solicitation: true };
    const ptypes = [];
    if (nt.active_solicitation) ptypes.push('k', 'o'); // Combined Synopsis, Solicitation
    if (nt.pre_rfp_intel)       ptypes.push('r', 'p'); // Sources Sought, Presolicitation
    if (ptypes.length) params.set('ptype', ptypes.join(','));

    const url = SAM_API_BASE + '?' + params.toString();
    let resp;
    try {
      resp = await fetchFn(url, { method: 'GET' });
    } catch (e) {
      return { ok: false, usedApi: true, reason: 'fetch_failed', error: e.message, results: [], total: 0 };
    }
    if (!resp.ok) {
      let detail = '';
      try { detail = (await resp.text()).slice(0, 200); } catch (_) {}
      return { ok: false, usedApi: true, reason: 'http_' + resp.status, detail, results: [], total: 0 };
    }
    let body;
    try { body = await resp.json(); } catch (_) {
      return { ok: false, usedApi: true, reason: 'invalid_json', results: [], total: 0 };
    }

    const rawList = Array.isArray(body.opportunitiesData) ? body.opportunitiesData
                  : Array.isArray(body.opportunities)     ? body.opportunities
                  : Array.isArray(body.data)              ? body.data : [];
    const normalized = rawList.map(r => normalizeSamRecord(r, now()));
    const deduped    = dedupe(normalized);
    const targeted   = applyTargeting(deduped, filters);

    return {
      ok: true,
      usedApi: true,
      total: body.totalRecords || body.total || deduped.length,
      returned: targeted.length,
      results: targeted
    };
  }

  return { search };
}

function mmddyyyy(d) {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const y = d.getUTCFullYear();
  return `${m}/${day}/${y}`;
}

module.exports = {
  createSamSearchService,
  normalizeSamRecord,
  dedupe,
  applyTargeting,
  buildSamHumanUrl,
  NOTICE_TYPE_TO_GROUP
};

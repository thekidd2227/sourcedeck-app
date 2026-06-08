// services/govcon/opportunity-outreach.js
//
// SAM.gov Opportunity -> Outreach Agent (orchestrator).
//
// This module DOES NOT introduce a second SAM.gov pipeline, a second
// scorer, or a second draft engine. It composes the existing services:
//
//   - sam-search.js          -> opportunity discovery (the SAM.gov key
//                               stays in the main process; renderer
//                               never sees it)
//   - middleman-fit.js       -> the canonical 0-100 bid-fit scorer
//   - outreach-window.js     -> FAR-aware comms-window gating
//   - stakeholder-graph.js   -> POC postures (CO = reference-only)
//   - email-compliance.js    -> the draft-only email generator
//   - opportunity-records.js -> persistence (electron-store)
//
// What this module adds on top (the genuine gaps from the audit):
//   - closing-window (7/30 day) filter + past-deadline exclusion
//   - an outreach status lifecycle on each record
//   - a certification/endorsement/guarantee OVERCLAIM guard
//   - a daily draft cap
//   - a demo/mock mode usable with no SAM.gov key
//
// HARD INVARIANTS (mirrored by email-compliance + tests):
//   - draft only. sendingEnabled is always false. No send transport.
//   - human approval required before any contact.
//   - active/restricted solicitation -> official Q&A draft only.
//   - never claim a certification absent from the user profile.
//   - never imply a guaranteed award, guaranteed savings, guaranteed
//     response, or agency endorsement.

'use strict';

const { analyzeMiddlemanFit } = require('./middleman-fit');
const { classify } = require('./outreach-window');
const { draftOfficialEmail } = require('./email-compliance');
const { buildStakeholderGraph } = require('./stakeholder-graph');
const { normalizeSamRecord } = require('./sam-search');

const REVIEW_NOTICE = 'Review all drafts before contacting government personnel.';

const OUTREACH_STATUS = Object.freeze({
  NEW:         'New',
  SCORED:      'Scored',
  DRAFTED:     'Drafted',
  NEEDS_REVIEW:'Needs Review',
  APPROVED:    'Approved',
  REJECTED:    'Rejected',
  BID_TARGET:  'Bid Target',
  ARCHIVED:    'Archived'
});
const VALID_STATUSES = Object.freeze(Object.values(OUTREACH_STATUS));

// Closing-window quick selector. Only 7 or 30 are offered to the user;
// anything else falls back to 30.
function closingWindowDays(config) {
  const w = config && Number(config.closingWindowDays || config.closingWindow || config.window);
  return w === 7 ? 7 : 30;
}

const DEFAULT_DAILY_CAP = 25;
function dailyCap(config) {
  const n = config && Number(config.dailyDraftLimit);
  if (!Number.isFinite(n)) return DEFAULT_DAILY_CAP;
  return Math.max(1, Math.min(Math.trunc(n), 200));
}

// ── overclaim guard ──────────────────────────────────────────────────
// We never let a draft imply a guaranteed outcome or agency endorsement.
const BANNED_CLAIM_PATTERNS = [
  /\bguarantee(?:d|s)?\b[^.\n]*/ig,
  /\bassured? (?:award|contract|win|savings|response)\b[^.\n]*/ig,
  /\b(?:government|agency|federal|endorsed?)\s+endorse\w*/ig,
  /\bendorsed by (?:the )?(?:government|agency|federal)\b[^.\n]*/ig,
  /\bofficial partner of (?:the )?(?:government|agency|federal|[A-Z])\w*/ig,
  /\bpreferred vendor (?:status|of)\b[^.\n]*/ig,
  /\bsole.source lock\b[^.\n]*/ig,
  /\b(?:risk[- ]free|no[- ]risk)\b/ig,
  /\bcertified by (?:the )?(?:government|agency|federal)\b[^.\n]*/ig
];

function scrubClaims(text) {
  let out = String(text || '');
  for (const p of BANNED_CLAIM_PATTERNS) out = out.replace(p, '');
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ \n/g, '\n').trim();
}

// Known certification tokens. A draft may mention a cert ONLY if it is in
// the user profile's certifications list. Any other cert token is removed.
const CERT_TOKENS = [
  { token: 'SDVOSB', re: /\bSDVOSB\b/ig, key: 'sdvosb' },
  { token: 'VOSB',   re: /\bVOSB\b/ig,   key: 'vosb' },
  { token: '8(a)',   re: /8\(a\)/ig, key: '8a' },
  { token: 'HUBZone',re: /\bHUBZone\b/ig,key: 'hubzone' },
  { token: 'WOSB',   re: /\bWOSB\b/ig,   key: 'wosb' },
  { token: 'EDWOSB', re: /\bEDWOSB\b/ig, key: 'edwosb' },
  { token: 'SDB',    re: /\bSDB\b/ig,    key: 'sdb' }
];

function profileCertSet(profile) {
  const certs = (profile && Array.isArray(profile.certifications)) ? profile.certifications : [];
  return new Set(certs.map(c => String(c).toLowerCase().replace(/[^a-z0-9]/g, '')));
}

function stripUnbackedCertifications(text, profile) {
  const backed = profileCertSet(profile);
  let out = String(text || '');
  for (const c of CERT_TOKENS) {
    const key = c.key.replace(/[^a-z0-9]/g, '');
    if (!backed.has(key)) out = out.replace(c.re, '');
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ \n/g, '\n').trim();
}

// Combined draft-text sanitizer: claim guard + cert guard.
function sanitizeDraftText(text, profile) {
  return stripUnbackedCertifications(scrubClaims(text), profile);
}

// ── deadline / closing-window helpers ────────────────────────────────
function daysLeft(opp, nowMs) {
  if (opp && typeof opp.daysUntilDue === 'number') return opp.daysUntilDue;
  const t = Date.parse((opp && opp.responseDeadline) || '');
  if (!isFinite(t)) return null;
  return Math.ceil((t - nowMs) / 86400000);
}

// Keep only opportunities whose response deadline is in the future and
// within the selected closing window. Unknown/past deadlines are excluded.
function withinClosingWindow(opp, windowDays, nowMs) {
  const d = daysLeft(opp, nowMs);
  if (d === null) return false; // no usable deadline -> excluded from a closing-window scan
  if (d < 0) return false;      // past-deadline -> excluded
  return d <= windowDays;
}

// ── POC selection ────────────────────────────────────────────────────
// Safely pick a point of contact. Never crashes on a missing POC list.
function selectPoc(opp) {
  const list = (opp && Array.isArray(opp.pointOfContact)) ? opp.pointOfContact : [];
  if (!list.length) return null;
  // Prefer a contact that actually has an email; otherwise the first one.
  return list.find(p => p && p.email) || list[0] || null;
}

// ── config -> sam-search filters ─────────────────────────────────────
function arr(v) {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  return [];
}

function placeFilters(config) {
  const out = {};
  const place = config.placeOfPerformance || config.place || '';
  if (config.state) out.state = String(config.state);
  if (config.zip) out.zip = String(config.zip);
  if (!out.state && !out.zip && place) {
    const s = String(place).trim();
    if (/^[A-Za-z]{2}$/.test(s)) out.state = s;
    else if (/^\d{5}(-\d{4})?$/.test(s)) out.zip = s;
  }
  return out;
}

function mapConfigToFilters(config, nowMs) {
  config = config || {};
  const windowDays = closingWindowDays(config);
  const keywords = Array.isArray(config.keywords) ? config.keywords.join(' ')
                 : (config.keywords || config.keyword || '');
  const filters = {
    naics: arr(config.naics),
    psc: arr(config.psc),
    noticeTypes: config.noticeTypes || { active_solicitation: true, pre_rfp_intel: true },
    posted: { withinDays: clampInt(config.postedWithinDays, 1, 365, 90) },
    responseFrom: new Date(nowMs).toISOString(),
    responseTo: new Date(nowMs + windowDays * 86400000).toISOString(),
    limit: clampInt(config.limit, 1, 100, 25),
    maxPages: clampInt(config.maxPages, 1, 10, 1)
  };
  if (keywords) filters.keyword = String(keywords).slice(0, 200);
  if (config.setAside || config.setAsideCode) filters.setAsideCode = String(config.setAside || config.setAsideCode);
  Object.assign(filters, placeFilters(config));
  return filters;
}

function clampInt(v, lo, hi, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

// ── demo / mock opportunities (used when no SAM.gov key is present) ───
// Deterministic relative to `nowMs` so window filtering is testable.
function mockOpportunities(nowMs) {
  const day = 86400000;
  const iso = (ms) => new Date(ms).toISOString();
  const raws = [
    { // A: active solicitation, closes in 5d -> RED window -> Q&A only
      noticeId: 'MOCK-A', solicitationNumber: 'SOL-A-001', title: 'Pest Control Services - Regional Facilities',
      type: 'Solicitation', fullParentPathName: 'GENERAL SERVICES ADMINISTRATION.PBS',
      naicsCode: '561710', typeOfSetAside: 'SDVOSB', responseDeadLine: iso(nowMs + 5 * day),
      placeOfPerformance: { state: { code: 'MD' } }, uiLink: 'https://sam.gov/opp/MOCK-A',
      pointOfContact: [{ fullName: 'Contracting Officer', email: 'co@example.gov', type: 'primary' }]
    },
    { // B: sources sought, closes in 20d -> GREEN pre-RFP -> draft allowed
      noticeId: 'MOCK-B', solicitationNumber: 'SS-B-002', title: 'Sources Sought - Janitorial & Facility Support',
      type: 'Sources Sought', fullParentPathName: 'DEPARTMENT OF VETERANS AFFAIRS.VHA',
      naicsCode: '561720', typeOfSetAside: 'SDVOSB', responseDeadLine: iso(nowMs + 20 * day),
      placeOfPerformance: { state: { code: 'VA' } }, uiLink: 'https://sam.gov/opp/MOCK-B',
      pointOfContact: [{ fullName: 'Small Business Specialist', email: 'sbs@example.gov', type: 'primary' }]
    },
    { // C: special notice, closes in 3d, NO poc email -> draft allowed, no contact email (must not crash)
      noticeId: 'MOCK-C', solicitationNumber: 'SN-C-003', title: 'Special Notice - Translation & Interpretation',
      type: 'Special Notice', fullParentPathName: 'DEPARTMENT OF JUSTICE.EOIR',
      naicsCode: '541930', typeOfSetAside: 'WOSB', responseDeadLine: iso(nowMs + 3 * day),
      placeOfPerformance: { state: { code: 'DC' } }, uiLink: 'https://sam.gov/opp/MOCK-C',
      pointOfContact: []
    },
    { // D: past-deadline -> excluded
      noticeId: 'MOCK-D', solicitationNumber: 'SOL-D-004', title: 'Expired - Staffing Support',
      type: 'Solicitation', fullParentPathName: 'DEPARTMENT OF THE ARMY.ACC',
      naicsCode: '561320', responseDeadLine: iso(nowMs - 2 * day),
      uiLink: 'https://sam.gov/opp/MOCK-D',
      pointOfContact: [{ fullName: 'CO', email: 'co-d@example.gov' }]
    },
    { // E: closes in 60d -> excluded from both 7 and 30 windows
      noticeId: 'MOCK-E', solicitationNumber: 'SS-E-005', title: 'Sources Sought - Emergency Relief (Far Out)',
      type: 'Sources Sought', fullParentPathName: 'FEDERAL EMERGENCY MANAGEMENT AGENCY',
      naicsCode: '624230', responseDeadLine: iso(nowMs + 60 * day),
      uiLink: 'https://sam.gov/opp/MOCK-E',
      pointOfContact: [{ fullName: 'SBS', email: 'sbs-e@example.gov' }]
    }
  ];
  return raws.map(r => normalizeSamRecord(r, nowMs));
}

// Map a normalized opportunity to the flags outreach-window.classify reads.
function windowInput(opp) {
  const group = String(opp.noticeGroup || '').toLowerCase();
  const isActive = group === 'active_solicitation';
  const isPreRfp = group === 'pre_rfp_intel';
  const isAward  = group === 'awards';
  let noticeType;
  if (isActive) noticeType = 'solicitation';
  else if (isPreRfp) noticeType = 'sources_sought';
  return {
    noticeType,
    activeSolicitation: isActive || undefined,
    awarded: isAward || undefined,
    status: isAward ? 'awarded' : undefined,
    responseDeadline: opp.responseDeadline,
    noticeGroup: opp.noticeGroup
  };
}

// ── the orchestrator factory ─────────────────────────────────────────
// deps:
//   samSearch        : { search(filters) }              (required)
//   opportunities    : opportunity-records service       (required)
//   store            : { get, set } for the daily counter (optional)
//   targetingProfile : { load() } for company profile     (optional)
//   scorer           : fn(opp, profile) -> analysis       (optional)
//   now              : () => epochMs                       (optional)
function createOpportunityOutreachService(deps) {
  deps = deps || {};
  const samSearch = deps.samSearch;
  const opportunities = deps.opportunities;
  const store = deps.store || null;
  const targetingProfile = deps.targetingProfile || null;
  const scorer = deps.scorer || analyzeMiddlemanFit;
  const now = deps.now || (() => Date.now());
  if (!samSearch || typeof samSearch.search !== 'function') {
    throw new Error('opportunity-outreach: deps.samSearch with search() is required');
  }
  if (!opportunities || typeof opportunities.upsert !== 'function') {
    throw new Error('opportunity-outreach: deps.opportunities service is required');
  }

  const DAILY_KEY = 'govcon.outreachDailyDrafts';

  function todayStr(ms) { return new Date(ms).toISOString().slice(0, 10); }

  function draftsToday() {
    if (!store || typeof store.get !== 'function') return 0;
    const rec = store.get(DAILY_KEY) || {};
    return rec.date === todayStr(now()) ? (Number(rec.count) || 0) : 0;
  }
  function bumpDraftsToday(n) {
    if (!store || typeof store.set !== 'function') return;
    const today = todayStr(now());
    const rec = store.get(DAILY_KEY) || {};
    const count = (rec.date === today ? (Number(rec.count) || 0) : 0) + n;
    store.set(DAILY_KEY, { date: today, count });
  }

  function loadProfile(config) {
    if (config && config.profile) return config.profile;
    if (targetingProfile && typeof targetingProfile.load === 'function') {
      try { return targetingProfile.load(); } catch (_) { return {}; }
    }
    return {};
  }

  // Build a draft for one opportunity. Always draft-only; gated by the
  // existing email-compliance engine (which returns Q&A-only for active
  // solicitations). Returns the sanitized draft result + the record patch.
  function buildDraft(opp, profile) {
    const poc = selectPoc(opp);
    const purpose = String((opp.noticeGroup === 'pre_rfp_intel')
      ? 'capability introduction'
      : 'clarification');
    const result = draftOfficialEmail({
      opportunity: windowInputForEmail(opp),
      contact: poc || {},
      purpose,
      companyName: profile.name || profile.companyName || 'SourceDeck user',
      companyProfile: profile,
      // Pass the injectable clock so deadline-based "active solicitation"
      // detection matches the agent's frame, not the wall clock.
      nowMs: now()
    });

    // Apply the overclaim + cert guard to whatever draft text came back.
    if (result.draft) result.draft = sanitizeDraftText(result.draft, profile);
    if (result.officialQAndADraft) result.officialQAndADraft = sanitizeDraftText(result.officialQAndADraft, profile);

    // Hard invariants, defensively re-asserted.
    result.requiresApproval = true;
    result.sendingEnabled = false;
    result.reviewNotice = REVIEW_NOTICE;
    result.pocEmail = (poc && poc.email) || null;
    return result;
  }

  // email-compliance.activeSolicitation() matches /solicitation|rfp|rfq|
  // combined/ against (noticeGroup || noticeType). Our normalized
  // noticeGroup value 'pre_rfp_intel' contains the substring "rfp", which
  // would FALSELY flag a Sources-Sought notice as an active solicitation.
  // So we deliberately pass only the raw SAM noticeType (e.g. 'Solicitation',
  // 'Sources Sought', 'Special Notice'), which classifies correctly.
  function windowInputForEmail(opp) {
    return {
      title: opp.title,
      solicitationNumber: opp.solicitationNumber,
      noticeId: opp.noticeId,
      noticeType: opp.noticeType,
      responseDeadline: opp.responseDeadline,
      agency: opp.agency
    };
  }

  function statusForDraft(draftResult) {
    // A blocked/Q&A-only result needs human review; a clean draft is Drafted.
    return draftResult.blocked ? OUTREACH_STATUS.NEEDS_REVIEW : OUTREACH_STATUS.DRAFTED;
  }

  // Run a full scan: search -> filter -> score -> (draft up to cap) -> persist.
  async function scan(config) {
    config = config || {};
    const nowMs = now();
    const windowDays = closingWindowDays(config);
    const cap = dailyCap(config);
    const profile = loadProfile(config);

    const filters = mapConfigToFilters(config, nowMs);
    const searchResult = await samSearch.search(filters);

    // Surface a real SAM.gov error (e.g. invalid key -> http_403, rate
    // limit -> http_429, network failure) instead of silently returning an
    // empty result that looks like "no opportunities".
    if (searchResult && searchResult.usedApi && searchResult.ok === false) {
      return {
        ok: false,
        reason: searchResult.reason || 'sam_search_failed',
        detail: searchResult.detail || null,
        demoMode: false,
        windowDays,
        dailyCap: cap,
        reviewNotice: REVIEW_NOTICE,
        metrics: { opportunitiesFound: 0, inWindow: 0, qualifiedMatches: 0, draftsCreated: 0, needsReview: 0, scored: 0 },
        records: []
      };
    }

    let demoMode = false;
    let fallbackUrl = null;
    let opps = [];
    if (searchResult && searchResult.usedApi) {
      opps = Array.isArray(searchResult.results) ? searchResult.results : [];
    } else {
      // No API key (or no usable API): fall back to demo/mock data so the
      // feature is fully usable without a live SAM.gov key.
      demoMode = true;
      fallbackUrl = (searchResult && searchResult.fallbackUrl) || null;
      opps = mockOpportunities(nowMs);
    }

    // Closing-window + past-deadline filter.
    const inWindow = opps.filter(o => withinClosingWindow(o, windowDays, nowMs));

    // Dedupe (sam-search already dedupes API results; mock + safety net).
    const seen = new Set();
    const unique = [];
    for (const o of inWindow) {
      const key = o.noticeId || o.solicitationNumber
        || (String(o.title || '') + '|' + String(o.agency || '')).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(o);
    }

    // Score every in-window opportunity, then draft up to the daily cap,
    // highest score first.
    const scored = unique.map(o => {
      const analysis = scorer(o, profile) || {};
      return {
        opp: o,
        score: typeof analysis.score === 'number' ? analysis.score : 0,
        label: analysis.decision || analysis.rating || 'MORE_RESEARCH_NEEDED',
        window: classify(windowInput(o)).window,
        stakeholders: safeStakeholders(o)
      };
    }).sort((a, b) => b.score - a.score);

    let remaining = Math.max(0, cap - draftsToday());
    let draftsCreated = 0;
    let needsReview = 0;
    let capReached = false;
    const records = [];

    for (const item of scored) {
      const o = item.opp;
      let outreachStatus = OUTREACH_STATUS.SCORED;
      let communicationsLog = [];
      let draftMeta = null;

      const wantDraft = config.draft !== false; // scan drafts by default
      if (wantDraft && remaining > 0) {
        const draftResult = buildDraft(o, profile);
        outreachStatus = statusForDraft(draftResult);
        if (draftResult.logEntry) communicationsLog = [draftResult.logEntry];
        draftMeta = {
          blocked: !!draftResult.blocked,
          requiresApproval: true,
          sendingEnabled: false,
          window: item.window,
          pocEmail: draftResult.pocEmail,
          reviewNotice: REVIEW_NOTICE,
          draft: draftResult.draft || null,
          officialQAndADraft: draftResult.officialQAndADraft || null
        };
        remaining -= 1;
        draftsCreated += 1;
        if (draftResult.blocked) needsReview += 1;
      } else if (wantDraft) {
        capReached = true;
      }

      const record = opportunities.upsert(Object.assign({}, o, {
        outreachStatus,
        outreachScore: item.score,
        outreachLabel: item.label,
        outreachWindow: item.window,
        outreachDraft: draftMeta,
        pointOfContact: o.pointOfContact || [],
        communicationsLog
      }));
      records.push(record);
    }

    if (draftsCreated > 0) bumpDraftsToday(draftsCreated);

    const qualified = scored.filter(s => s.score >= 60).length;
    return {
      ok: true,
      demoMode,
      fallbackUrl,
      reviewNotice: REVIEW_NOTICE,
      windowDays,
      dailyCap: cap,
      draftsRemainingToday: Math.max(0, remaining),
      capReached,
      metrics: {
        opportunitiesFound: opps.length,
        inWindow: unique.length,
        qualifiedMatches: qualified,
        draftsCreated,
        needsReview,
        scored: scored.length
      },
      records
    };
  }

  function safeStakeholders(opp) {
    try { return buildStakeholderGraph(opp); } catch (_) { return null; }
  }

  // Generate (or regenerate) a draft for a single already-persisted record.
  async function generateDraft(input) {
    input = input || {};
    const id = input.id || input.opportunityId
      || (input.opportunity && (input.opportunity.id || input.opportunity.noticeId));
    let record = id && opportunities.get ? opportunities.get(id) : null;
    if (!record && input.opportunity) record = opportunities.upsert(input.opportunity);
    if (!record) return { ok: false, reason: 'opportunity_not_found' };

    if (draftsToday() >= dailyCap(input)) {
      return { ok: false, reason: 'daily_draft_cap_reached', dailyCap: dailyCap(input) };
    }

    const profile = loadProfile(input);
    const draftResult = buildDraft(record, profile);
    const status = statusForDraft(draftResult);
    opportunities.patch(record.id, {
      outreachStatus: status,
      outreachDraft: {
        blocked: !!draftResult.blocked,
        requiresApproval: true,
        sendingEnabled: false,
        pocEmail: draftResult.pocEmail,
        reviewNotice: REVIEW_NOTICE,
        draft: draftResult.draft || null,
        officialQAndADraft: draftResult.officialQAndADraft || null
      },
      communicationsLog: draftResult.logEntry ? [draftResult.logEntry] : []
    });
    bumpDraftsToday(1);
    return Object.assign({ ok: true, status }, draftResult);
  }

  // Set the review-queue status. Approval is an explicit, user-driven act;
  // it NEVER enables sending (no send transport exists).
  function setStatus(input) {
    input = input || {};
    const id = input.id || input.opportunityId;
    const status = input.status;
    if (!id) return { ok: false, reason: 'missing_id' };
    if (!VALID_STATUSES.includes(status)) {
      return { ok: false, reason: 'invalid_status', validStatuses: VALID_STATUSES };
    }
    const patch = { outreachStatus: status };
    if (status === OUTREACH_STATUS.APPROVED) {
      patch.communicationsLog = [{
        id: `comm_${now()}_${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date(now()).toISOString(),
        status: 'approved_by_user',
        approvedByUser: true,
        sendingEnabled: false // approval authorizes the user to act manually; the app never sends
      }];
    }
    if (status === OUTREACH_STATUS.BID_TARGET) patch.favorite = true;
    const record = opportunities.patch(id, patch);
    if (!record) return { ok: false, reason: 'opportunity_not_found' };
    return { ok: true, status, record };
  }

  return Object.freeze({
    scan,
    generateDraft,
    setStatus,
    OUTREACH_STATUS,
    REVIEW_NOTICE,
    DAILY_KEY
  });
}

module.exports = {
  createOpportunityOutreachService,
  OUTREACH_STATUS,
  VALID_STATUSES,
  REVIEW_NOTICE,
  BANNED_CLAIM_PATTERNS,
  CERT_TOKENS,
  closingWindowDays,
  dailyCap,
  scrubClaims,
  stripUnbackedCertifications,
  sanitizeDraftText,
  withinClosingWindow,
  daysLeft,
  selectPoc,
  mapConfigToFilters,
  mockOpportunities
};

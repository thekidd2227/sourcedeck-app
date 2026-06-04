// services/govcon/sam-opportunity-sprint.js
//
// SAM Opportunity Sprint — composes SourceDeck's existing SAM.gov
// search client with the GovCon Pursuit Profile to produce
// goal-personalized, manual-only capture output.
//
// REUSES (does not duplicate):
//   - ./sam-search.js → createSamSearchService / normalizeSamRecord
//   - ./govcon-pursuit-profile.js → profile schema + lane/NAICS maps
//
// HARD INVARIANTS:
//   - SAM_GOV_API_KEY loaded only via the caller-provided getApiKey.
//     The key never appears in returned objects, reports, or logs.
//   - manual_review_required stays true; outreach is human-gated.
//   - Email drafts are draft-only. No transport. No auto-send.
//   - No guaranteed-award / guaranteed-revenue / guaranteed-response
//     language in any draft, summary, or report payload.
//   - Pure data + orchestration layer. No filesystem writes; the CLI
//     runner owns I/O.

'use strict';

const { createSamSearchService, normalizeSamRecord } = require('./sam-search');
const {
  normalizePursuitProfile,
  calculateProfileCompleteness,
  LANE_TO_NAICS,
  LANE_TO_KEYWORDS,
  SPRINT_WINDOWS,
} = require('./govcon-pursuit-profile');
const {
  getSamSprintEntitlement,
  applyNaicsLimit,
  describeNaicsLimit,
} = require('./sam-sprint-entitlements');

const SCORING_MODEL_VERSION = '1.0.0-sprint';

const LABELS = Object.freeze({
  PURSUE:   'Pursue Immediately',
  STRONG:   'Strong Outreach Target',
  REVIEW:   'Review / Possible Quote',
  ARCHIVE:  'Archive',
});

function scoreLabel(score) {
  if (score >= 90) return LABELS.PURSUE;
  if (score >= 75) return LABELS.STRONG;
  if (score >= 60) return LABELS.REVIEW;
  return LABELS.ARCHIVE;
}

function bidNoBidRecommendation(score, riskFlags) {
  if (riskFlags.some((f) => f.severity === 'hard_stop')) return 'NO-BID';
  if (score >= 90) return 'BID';
  if (score >= 75) return 'BID — prepare capability statement and quote';
  if (score >= 60) return 'REVIEW';
  return 'NO-BID (archive)';
}

// -----------------------------------------------------------------------------
// Query plan generation — derived from the pursuit profile.
// -----------------------------------------------------------------------------

function buildQueryPlan(profile, nowMs, options) {
  const opts = options || {};
  const window = Number(profile.output_preference.sprint_window_days);
  const rdlfrom = new Date(nowMs);
  const rdlto = new Date(nowMs + window * 86400000);

  const activeLanes = Object.entries(profile.service_lanes || {})
    .filter(([, on]) => on === true)
    .map(([lane]) => lane);

  // Resolve entitlement. Free plans cap the active NAICS query set; the
  // saved target_naics on the profile is never mutated.
  const entitlement = opts.entitlement || getSamSprintEntitlement(profile);
  const naicsLimit = applyNaicsLimit(profile, entitlement);

  // Start from the operator's ALLOWED NAICS (after the plan cap), then
  // union in lane-derived NAICS hints. Lane-derived hints are also
  // subject to the cap so a free user with 3 NAICS + 4 lanes does not
  // sneak past the limit via lane expansion.
  const naicsSet = new Set(naicsLimit.allowed_naics);
  for (const lane of activeLanes) {
    for (const code of (LANE_TO_NAICS[lane] || [])) naicsSet.add(code);
  }
  let naics = [...naicsSet];
  const blockedFromLanes = [];
  if (Number.isFinite(entitlement.max_naics_codes) && naics.length > entitlement.max_naics_codes) {
    const cap = Math.max(0, Math.floor(entitlement.max_naics_codes));
    const trimmed = naics.slice(0, cap);
    for (const code of naics.slice(cap)) {
      if (!naicsLimit.blocked_naics.includes(code)) blockedFromLanes.push(code);
    }
    naics = trimmed;
  }

  const keywordSet = new Set([
    'micro-purchase', 'simplified acquisition',
  ]);
  for (const lane of activeLanes) {
    for (const kw of (LANE_TO_KEYWORDS[lane] || [])) keywordSet.add(kw);
  }
  // Fallback keyword set if no lanes are selected — broad facility coverage.
  if (!activeLanes.length) {
    ['janitorial', 'custodial', 'painting', 'facility turnover', 'punch list',
     'minor repair', 'facilities support', 'administrative support',
     'management consulting', 'translation', 'interpreting'].forEach((k) => keywordSet.add(k));
  }

  const keywords = [...keywordSet];
  const primaryStates = (profile.geography.primary_states || []).slice();

  const blockedNaics = [...new Set([...naicsLimit.blocked_naics, ...blockedFromLanes])];
  const naicsLimitApplied = naicsLimit.naics_limit_applied || blockedFromLanes.length > 0;

  return Object.freeze({
    window,
    rdlfrom,
    rdlto,
    naics,
    keywords,
    primaryStates,
    entitlement: Object.freeze({
      plan: entitlement.plan,
      is_paid: entitlement.is_paid,
      max_naics_codes: entitlement.max_naics_codes === Infinity ? null : entitlement.max_naics_codes,
      naics_limit_applied: naicsLimitApplied,
      requested_naics_count: naicsLimit.requested_count,
      allowed_naics_count: naics.length,
      blocked_naics_codes: Object.freeze(blockedNaics.slice()),
      plan_warning: entitlement.plan_warning,
      plan_normalized_from: entitlement.plan_normalized_from,
      message: describeNaicsLimit(entitlement, naicsLimit.requested_count, naics.length),
    }),
  });
}

// -----------------------------------------------------------------------------
// Sprint runner — fans out queries through the reused SAM client.
// -----------------------------------------------------------------------------

async function runSprintQueries(samService, plan) {
  const out = { records: [], errors: [] };
  // NAICS fan-out (single bucketed call per NAICS — bounded).
  for (const ncode of plan.naics.slice(0, 12)) {
    const r = await samService.search({
      naics: [ncode],
      responseFrom: plan.rdlfrom.toISOString(),
      responseTo:   plan.rdlto.toISOString(),
      noticeTypes:  { active_solicitation: true },
      limit: 50,
      maxPages: 1,
      posted: { withinDays: 60 },
    });
    if (!r.ok) { out.errors.push({ source: `naics:${ncode}`, reason: r.reason, status: r.detail || null }); continue; }
    for (const rec of (r.results || [])) out.records.push({ source: `naics:${ncode}`, rec });
  }
  // State fan-out for the operator's primary states.
  for (const st of plan.primaryStates.slice(0, 5)) {
    const r = await samService.search({
      state: st,
      responseFrom: plan.rdlfrom.toISOString(),
      responseTo:   plan.rdlto.toISOString(),
      noticeTypes:  { active_solicitation: true },
      limit: 100,
      maxPages: 1,
      posted: { withinDays: 60 },
    });
    if (!r.ok) { out.errors.push({ source: `state:${st}`, reason: r.reason, status: r.detail || null }); continue; }
    for (const rec of (r.results || [])) out.records.push({ source: `state:${st}`, rec });
  }
  // Keyword fan-out — capped to the ten most distinctive terms to avoid
  // blowing the rate limit.
  for (const kw of plan.keywords.slice(0, 10)) {
    const r = await samService.search({
      keyword: kw,
      responseFrom: plan.rdlfrom.toISOString(),
      responseTo:   plan.rdlto.toISOString(),
      noticeTypes:  { active_solicitation: true },
      limit: 50,
      maxPages: 1,
      posted: { withinDays: 60 },
    });
    if (!r.ok) { out.errors.push({ source: `kw:${kw}`, reason: r.reason, status: r.detail || null }); continue; }
    for (const rec of (r.results || [])) out.records.push({ source: `kw:${kw}`, rec });
  }
  return out;
}

// Dedupe by noticeId or solicitationNumber — either match collapses
// records. Mirrors the behavior of services/govcon/sam-search.js'
// internal dedupe so the sprint and the underlying client agree.
function dedupeRecords(records) {
  const seenN = new Map();
  const seenS = new Map();
  const out = [];
  for (const entry of records) {
    const rec = entry.rec || entry;
    const source = entry.source || 'unknown';
    let wrapped = null;
    if (rec.noticeId && seenN.has(rec.noticeId)) wrapped = seenN.get(rec.noticeId);
    else if (rec.solicitationNumber && seenS.has(rec.solicitationNumber)) wrapped = seenS.get(rec.solicitationNumber);
    if (wrapped) {
      wrapped.sources.add(source);
      // Cross-index so subsequent records hitting the other key also
      // collapse onto the same wrapper.
      if (rec.noticeId && !seenN.has(rec.noticeId)) seenN.set(rec.noticeId, wrapped);
      if (rec.solicitationNumber && !seenS.has(rec.solicitationNumber)) seenS.set(rec.solicitationNumber, wrapped);
      continue;
    }
    const key = rec.noticeId
      || rec.solicitationNumber
      || `${rec.title || ''}::${rec.responseDeadline || ''}`;
    wrapped = { rec, sources: new Set([source]), dedupeKey: key };
    if (rec.noticeId) seenN.set(rec.noticeId, wrapped);
    if (rec.solicitationNumber) seenS.set(rec.solicitationNumber, wrapped);
    out.push(wrapped);
  }
  return out.map((w) => ({ rec: w.rec, sources: [...w.sources] }));
}

// -----------------------------------------------------------------------------
// Profile-aware scoring.
// -----------------------------------------------------------------------------

function scoreOpportunity(opp, profile, nowMs) {
  const breakdown = {};
  const reasons = [];
  const risk_flags = [];
  let score = 0;

  const text = `${opp.title || ''} ${opp.description || ''}`.toLowerCase();
  const popState = (opp.placeOfPerformance && (opp.placeOfPerformance.state || '')).toString().toUpperCase().slice(0, 2);
  const dUntil = typeof opp.daysUntilClose === 'number'
    ? opp.daysUntilClose
    : daysUntil(opp.responseDeadline, nowMs);

  // 1. Deadline urgency (-30 .. +25), weighted by operator urgency_level.
  let urg = 0;
  if (dUntil == null) {
    urg = 5;
    reasons.push('Deadline unknown (+5)');
  } else if (dUntil < 0) {
    urg = -30;
    risk_flags.push({ key: 'closed', severity: 'hard_stop', message: 'Response deadline already passed.' });
    reasons.push('Closed (-30)');
  } else if (dUntil <= 3) { urg = 25; reasons.push(`Closes in ${dUntil}d (+25 urgency)`); }
  else if (dUntil <= 7)  { urg = 22; reasons.push(`Closes in ${dUntil}d (+22 urgency)`); }
  else if (dUntil <= 14) { urg = 16; reasons.push(`Closes in ${dUntil}d (+16 urgency)`); }
  else if (dUntil <= 30) { urg = 12; reasons.push(`Closes in ${dUntil}d (+12 urgency)`); }
  else { urg = 4; reasons.push(`Closes in ${dUntil}d (+4 urgency)`); }
  if (profile.contract_goal.urgency_level === 'immediate_revenue' && dUntil != null && dUntil >= 0) {
    urg += 3;
    reasons.push('Urgency level immediate_revenue (+3 weighting)');
  }
  breakdown.deadline_urgency = urg;
  score += urg;

  // 2. NAICS match against the operator's target_naics (+/-).
  let n = 0;
  if (opp.naics && (profile.target_naics || []).includes(String(opp.naics))) {
    n = 20;
    reasons.push(`NAICS ${opp.naics} matches your target list (+20)`);
  } else if (opp.naics) {
    n = 0;
    reasons.push(`NAICS ${opp.naics} not in your target list (+0)`);
  }
  breakdown.naics_match = n;
  score += n;

  // 3. Service lane match — translated through LANE_TO_NAICS + keyword text.
  let lane = 0;
  const activeLanes = Object.entries(profile.service_lanes || {})
    .filter(([, on]) => on === true).map(([l]) => l);
  let laneHits = [];
  for (const l of activeLanes) {
    const naicsHit = (LANE_TO_NAICS[l] || []).includes(String(opp.naics || ''));
    const kwHit = (LANE_TO_KEYWORDS[l] || []).some((k) => text.includes(k));
    if (naicsHit || kwHit) laneHits.push(l);
  }
  if (laneHits.length) {
    lane = Math.min(15, laneHits.length * 8);
    reasons.push(`Service-lane match: ${laneHits.join(', ')} (+${lane})`);
  } else if (activeLanes.length) {
    reasons.push('No active service-lane match (+0)');
  }
  breakdown.service_lane_match = lane;
  score += lane;

  // 4. Generic keyword match (independent of lanes).
  const genericKeywords = ['micro-purchase', 'simplified acquisition', 'sdvosb', 'small business'];
  const kwHits = genericKeywords.filter((k) => text.includes(k));
  let kw = Math.min(8, kwHits.length * 3);
  if (kw) reasons.push(`Keyword hits: ${kwHits.join(', ')} (+${kw})`);
  breakdown.keyword_match = kw;
  score += kw;

  // 5. Place of performance vs. operator geography.
  let geo = 0;
  const primary = profile.geography.primary_states || [];
  const excluded = profile.geography.excluded_states || [];
  const allowsNational = profile.geography.national_allowed === true;
  const allowsRemote = profile.geography.remote_friendly === true;
  if (popState && excluded.includes(popState)) {
    geo = -25;
    risk_flags.push({ key: 'excluded_geo', severity: 'penalty', message: `PoP ${popState} is on the excluded list.` });
    reasons.push(`PoP ${popState} is on your excluded list (-25)`);
  } else if (popState && primary.includes(popState)) {
    geo = 12;
    reasons.push(`PoP ${popState} is in your primary geography (+12)`);
  } else if (!popState) {
    geo = allowsRemote ? 5 : 0;
    if (geo) reasons.push('PoP unspecified; remote-friendly (+5)');
  } else if (allowsNational) {
    geo = 4;
    reasons.push(`PoP ${popState} accepted under national_allowed (+4)`);
  } else if (allowsRemote) {
    geo = 2;
    reasons.push(`PoP ${popState} accepted under remote_friendly (+2)`);
  } else if (primary.length) {
    geo = -15;
    risk_flags.push({ key: 'geo_mismatch', severity: 'penalty', message: `PoP ${popState} outside your primary states and national_allowed is false.` });
    reasons.push(`PoP ${popState} outside primary geography (-15)`);
  }
  breakdown.geography_match = geo;
  score += geo;

  // 6. Set-aside vs. operator certifications/preferences.
  const sa = (opp.setAside || '').toString();
  const saLower = sa.toLowerCase();
  let saScore = 0;
  const prefs = profile.setaside_preferences || {};
  const certs = (profile.business_identity.certifications || []).map((c) => c.toLowerCase());
  const certHit = (sa && certs.some((c) => saLower.includes(c)))
    || (saLower.includes('sdvosb') && (prefs.SDVOSB || certs.includes('sdvosb')))
    || (saLower.includes('hubzone') && (prefs.HUBZone || certs.includes('hubzone')))
    || (saLower.includes('8(a)') && (prefs['8(a)'] || certs.includes('8(a)')))
    || (saLower.includes('women') && (prefs['Women-Owned']))
    || (saLower.includes('veteran') && (prefs['Veteran-Owned'] || certs.includes('sdvosb') || certs.includes('vosb')))
    || (saLower.includes('small business') && (prefs['Total Small Business'] || certs.includes('small business')));
  if (sa && certHit) {
    saScore = 15;
    reasons.push(`Set-aside "${sa}" matches your certification/preferences (+15)`);
  } else if (sa && !prefs.unrestricted_allowed && !certHit) {
    saScore = -10;
    risk_flags.push({ key: 'setaside_mismatch', severity: 'penalty', message: `Set-aside "${sa}" not covered by your certifications.` });
    reasons.push(`Set-aside "${sa}" not covered by your certifications (-10)`);
  } else if (!sa && prefs.unrestricted_allowed) {
    saScore = 3;
    reasons.push('Unrestricted opportunity and you allow unrestricted (+3)');
  }
  breakdown.setaside_match = saScore;
  score += saScore;

  // 7. Scope simplicity vs. heavy-vehicle / multi-year red flags.
  let simp = 0;
  const heavyWords = ['idiq', 'matoc', 'multi-year', 'multi year', 'gwac', 'multiple award', 'oasis'];
  const isHeavy = heavyWords.some((w) => text.includes(w));
  if (isHeavy && profile.risk_filters.avoid_long_technical_proposals) {
    simp = -5;
    risk_flags.push({ key: 'heavy_vehicle', severity: 'penalty', message: 'Heavy vehicle / IDIQ-style and you avoid long technical proposals.' });
    reasons.push('Heavy vehicle / IDIQ-style (-5)');
  } else if (!isHeavy) {
    simp = 6;
    reasons.push('Scope looks simple (+6)');
  }
  breakdown.scope_simplicity = simp;
  score += simp;

  // 8. Capacity match — response speed and start window vs. profile.
  let cap = 0;
  const maxResp = Number(profile.capacity.max_response_time_hours || 72);
  if (dUntil != null && dUntil >= 0) {
    const hoursLeft = Math.max(0, dUntil * 24);
    if (hoursLeft < maxResp && !profile.capacity.can_quote_same_day) {
      cap -= 8;
      risk_flags.push({ key: 'capacity_response', severity: 'penalty', message: `Deadline (${hoursLeft}h) tighter than your max_response_time_hours (${maxResp}h).` });
      reasons.push(`Tight deadline vs. your response capacity (-8)`);
    } else if (profile.capacity.can_quote_same_day && dUntil <= 7) {
      cap += 5;
      reasons.push('Can quote same day and deadline ≤7d (+5)');
    }
  }
  if (profile.capacity.requires_partner_for_field_work && !profile.capacity.subcontractor_network_available) {
    if (/(site visit|on-site|onsite|field work)/i.test(opp.title || '') || /(site visit|on-site|onsite|field work)/i.test(opp.description || '')) {
      cap -= 6;
      risk_flags.push({ key: 'capacity_field', severity: 'penalty', message: 'Field work required and no subcontractor network configured.' });
      reasons.push('Field work required, no subcontractor network (-6)');
    }
  } else if (profile.capacity.subcontractor_network_available) {
    cap += 2;
    reasons.push('Subcontractor network available (+2)');
  }
  breakdown.capacity_match = cap;
  score += cap;

  // 9. Past performance match.
  let pp = 0;
  if (profile.past_performance.has_relevant_past_performance) {
    pp += 4;
    reasons.push('Operator has relevant past performance (+4)');
    const ppLanes = profile.past_performance.past_performance_lanes || [];
    if (laneHits.some((l) => ppLanes.includes(l))) {
      pp += 3;
      reasons.push('Past-performance lane matches this opportunity (+3)');
    }
  }
  breakdown.past_performance_match = pp;
  score += pp;

  // 10. Risk filters — clearance / heavy construction / supply-only / onsite.
  let risk = 0;
  if (profile.risk_filters.avoid_clearance_required && /(clearance|secret|top secret|ts\/sci)/i.test(text)) {
    risk -= 25;
    risk_flags.push({ key: 'clearance_required', severity: 'hard_stop', message: 'Clearance language detected and operator avoids clearance work.' });
    reasons.push('Clearance language detected (-25 hard stop)');
  }
  if (profile.risk_filters.avoid_large_construction && /(new construction|major renovation|design[- ]build)/i.test(text)) {
    risk -= 10;
    risk_flags.push({ key: 'large_construction', severity: 'penalty', message: 'Large construction language detected.' });
    reasons.push('Large construction language detected (-10)');
  }
  if (profile.risk_filters.avoid_supply_only && /(supply only|commodity supply|item only|goods only)/i.test(text)) {
    risk -= 5;
    reasons.push('Supply-only scope (-5)');
  }
  if (profile.risk_filters.avoid_daily_onsite_if_outside_region && popState && !primary.includes(popState) && !allowsNational && /(daily on-site|daily onsite|24\/7|round-the-clock)/i.test(text)) {
    risk -= 10;
    risk_flags.push({ key: 'daily_onsite_outside_region', severity: 'penalty', message: 'Daily onsite presence required outside your region.' });
    reasons.push('Daily onsite outside region (-10)');
  }
  breakdown.risk_filters = risk;
  score += risk;

  // 11. Contact availability.
  let contact = 0;
  if (opp.contact && opp.contact.email) {
    contact = 6;
    reasons.push('Contact email present (+6)');
  } else if (opp.contact && opp.contact.name) {
    contact = 2;
    reasons.push('Contact name present, no email (+2)');
    risk_flags.push({ key: 'missing_email', severity: 'soft', message: 'No contact email on file.' });
  } else {
    risk_flags.push({ key: 'missing_contact', severity: 'soft', message: 'No POC information on file.' });
  }
  breakdown.contact_availability = contact;
  score += contact;

  // 12. Micro-purchase / simplified acquisition / fast-quote fit boost.
  let pathway = 0;
  if (/micro[- ]?purchase|simplified acquisition|rfq/i.test(text)) {
    pathway += 6;
    reasons.push('Micro-purchase / SAT / RFQ pathway (+6)');
  }
  if ((opp.type || '').toLowerCase().includes('sources sought') ||
      (opp.type || '').toLowerCase().includes('presolicitation')) {
    pathway += 2;
    reasons.push('Pre-RFP intel — relationship play (+2)');
  }
  breakdown.pathway_fit = pathway;
  score += pathway;

  // 13. Teaming / subcontracting fit.
  let teaming = 0;
  if (profile.setaside_preferences.subcontracting_allowed && /(prime|teaming|subcontract)/i.test(text)) {
    teaming += 3;
    reasons.push('Teaming / subcontract language present (+3)');
  }
  breakdown.teaming_fit = teaming;
  score += teaming;

  // Clamp.
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = scoreLabel(score);
  const recommendation = bidNoBidRecommendation(score, risk_flags);

  return Object.freeze({
    fit_score: score,
    score_label: label,
    score_breakdown: breakdown,
    why_this_fits: reasons,
    risk_flags,
    recommended_pursuit_angle: pursuitAngleFor(opp, laneHits, profile),
    suggested_outreach_angle: outreachAngleFor(opp, laneHits, profile),
    bid_no_bid_recommendation: recommendation,
  });
}

function pursuitAngleFor(opp, laneHits, profile) {
  const text = `${opp.title || ''} ${opp.description || ''}`.toLowerCase();
  if (laneHits.includes('facility_turnover') || /(turnover|move[- ]?out|closeout|punch[- ]?list)/.test(text)) {
    return '48-Hour Facility Turnover & Punch-List Support';
  }
  if (laneHits.includes('painting_refresh') || /paint/.test(text)) return 'Small-scope painting and refresh support';
  if (laneHits.includes('janitorial_custodial') || /(janitor|custodi)/.test(text)) return 'Custodial backlog / janitorial surge support';
  if (laneHits.includes('translation_interpreting') || /(translation|interpret)/.test(text)) return 'Translation / interpreting past performance';
  if (laneHits.includes('admin_management_consulting') || /(administrative|management consulting|program support)/.test(text)) {
    return 'Rapid admin / program support';
  }
  if (laneHits.includes('facilities_support')) return 'Facilities support — multi-lane vendor introduction';
  if (typeof opp.daysUntilClose === 'number' && opp.daysUntilClose <= 7) {
    return 'Same-day quote / quick-response support';
  }
  if ((profile.business_identity.certifications || []).length) {
    return 'SDVOSB / small business responsive vendor';
  }
  return 'Facility support — multi-lane vendor introduction';
}

function outreachAngleFor(opp, laneHits, profile) {
  const angle = pursuitAngleFor(opp, laneHits, profile);
  const window = profile.output_preference.sprint_window_days;
  return `${angle} (sprint window: ${window}d; manual review required before contact)`;
}

function daysUntil(dateLike, nowMs) {
  if (!dateLike) return null;
  const t = Date.parse(String(dateLike));
  if (!isFinite(t)) return null;
  return Math.floor((t - nowMs) / 86400000);
}

// -----------------------------------------------------------------------------
// Top-level runner.
// -----------------------------------------------------------------------------

// Inject fetch + getApiKey for testability. The caller (CLI or main
// process) is responsible for sourcing the SAM_GOV_API_KEY safely.
async function runSprint(opts) {
  const deps = opts || {};
  const inputProfile = deps.profile || {};
  const nowMs = typeof deps.now === 'function' ? deps.now() : Date.now();
  const { profile, issues, isComplete } = normalizePursuitProfile(inputProfile);

  const fetchFn = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const getApiKey = deps.getApiKey || (async () => null);

  // We don't want to embed the key anywhere in returned objects.
  let apiKey = null;
  try { apiKey = await getApiKey(); } catch (_) { apiKey = null; }

  // Resolve entitlement once; we surface it in both the not_configured
  // and the ran branches so the operator/UI can show the plan limit
  // even when SAM isn't queried.
  const entitlement = getSamSprintEntitlement(profile);
  const previewPlan = buildQueryPlan(profile, nowMs, { entitlement });
  const entitlementMetadata = previewPlan.entitlement;
  const profileCompleteness = calculateProfileCompleteness(profile);
  // Scoring confidence: 'preliminary' if the profile is not at least
  // 'usable', otherwise 'profile_driven'. The CLI / UI / report all
  // surface this so operators know whether to trust the rankings.
  const scoringConfidence = (profileCompleteness.readiness_label === 'incomplete')
    ? 'preliminary'
    : 'profile_driven';
  const activeNaicsCodes = previewPlan.naics.slice();
  const withheldNaicsCodes = (entitlementMetadata.blocked_naics_codes || []).slice();

  if (!apiKey) {
    return Object.freeze({
      ok: true,
      status: 'not_configured',
      reason: 'SAM_GOV_API_KEY missing from environment.',
      profile_snapshot: profile,
      profile_issues: issues,
      profile_complete: isComplete,
      profile_completeness: profileCompleteness,
      scoring_confidence: scoringConfidence,
      active_naics_codes: Object.freeze(activeNaicsCodes.slice()),
      withheld_naics_codes: Object.freeze(withheldNaicsCodes.slice()),
      query_metadata: Object.freeze({
        window_days: previewPlan.window,
        naics_queried: [],
        naics_planned: previewPlan.naics,
        keywords_queried: [],
        states_queried: [],
        rdlfrom: previewPlan.rdlfrom.toISOString(),
        rdlto:   previewPlan.rdlto.toISOString(),
        entitlement: entitlementMetadata,
      }),
      entitlement: entitlementMetadata,
      scoring_model_version: SCORING_MODEL_VERSION,
      generated_at: new Date(nowMs).toISOString(),
      raw_count: 0,
      unique_count: 0,
      scored_opportunities: [],
      email_drafts: [],
      manual_review_required: true,
      errors: [],
    });
  }

  const samService = (deps.samService || createSamSearchService({
    fetch: fetchFn,
    getApiKey: async () => apiKey,
    now: () => nowMs,
  }));

  // Re-use the same plan we just previewed so the entitlement metadata
  // and the actual query set match exactly.
  const plan = previewPlan;
  const { records: raw, errors } = await runSprintQueries(samService, plan);
  const deduped = dedupeRecords(raw);

  const scored = deduped.map(({ rec, sources }) => {
    const opp = ensureNormalized(rec, nowMs);
    const verdict = scoreOpportunity(opp, profile, nowMs);
    return Object.assign({}, opp, verdict, { matched_sources: sources });
  }).sort((a, b) => b.fit_score - a.fit_score);

  const topDraftCount = profile.output_preference.top_draft_count;
  const emailDrafts = profile.output_preference.generate_email_drafts
    ? scored.slice(0, topDraftCount).map((opp) => buildEmailDraft(opp, profile))
    : [];

  return Object.freeze({
    ok: true,
    status: 'ran',
    profile_snapshot: profile,
    profile_issues: issues,
    profile_complete: isComplete,
    profile_completeness: profileCompleteness,
    scoring_confidence: scoringConfidence,
    active_naics_codes: Object.freeze(activeNaicsCodes.slice()),
    withheld_naics_codes: Object.freeze(withheldNaicsCodes.slice()),
    query_metadata: Object.freeze({
      window_days: plan.window,
      naics_queried: plan.naics,
      keywords_queried: plan.keywords,
      states_queried: plan.primaryStates,
      rdlfrom: plan.rdlfrom.toISOString(),
      rdlto:   plan.rdlto.toISOString(),
      entitlement: entitlementMetadata,
    }),
    entitlement: entitlementMetadata,
    scoring_model_version: SCORING_MODEL_VERSION,
    generated_at: new Date(nowMs).toISOString(),
    raw_count: raw.length,
    unique_count: deduped.length,
    scored_opportunities: scored,
    email_drafts: emailDrafts,
    manual_review_required: true,
    errors,
  });
}

// Ensure a record is shaped like a normalized opp. sam-search produces
// normalized records via createSamSearchService; this is a defensive
// fallback for callers passing raw fixtures into tests.
function ensureNormalized(rec, nowMs) {
  if (rec && (rec.responseDeadline !== undefined || rec.placeOfPerformance !== undefined)) {
    return Object.assign({}, rec, {
      daysUntilClose: typeof rec.daysUntilClose === 'number'
        ? rec.daysUntilClose
        : daysUntil(rec.responseDeadline, nowMs),
    });
  }
  const n = normalizeSamRecord(rec, nowMs);
  return Object.assign({}, n, { daysUntilClose: daysUntil(n.responseDeadline, nowMs) });
}

// -----------------------------------------------------------------------------
// Email draft builder — draft-only, never sent.
// -----------------------------------------------------------------------------

const REVIEW_NOTICE = 'Review all drafts before contacting government personnel.';
const BLOCKED_PHRASES = [
  'guaranteed award', 'guaranteed savings', 'guaranteed roi', 'guaranteed response',
  'we guarantee', 'award-winning', 'preferred vendor of',
];

function safe(text) {
  let t = String(text || '');
  for (const p of BLOCKED_PHRASES) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    t = t.replace(re, '[redacted]');
  }
  return t;
}

function buildEmailDraft(opp, profile) {
  const company = profile.business_identity.company_name || 'Our company';
  const certs = (profile.business_identity.certifications || []).join(', ') || 'small business';
  const recipient = (opp.contact && opp.contact.name) || 'Contracting POC';
  const recipientEmail = (opp.contact && opp.contact.email) || null;
  const subject = safe(`${company} — ${opp.solicitationNumber || (opp.title || '').slice(0, 60)}`);
  const body = safe([
    `Good morning ${recipient.split(' ').slice(-1)[0] || ''},`.trim(),
    '',
    `I am writing regarding ${opp.solicitationNumber ? `solicitation ${opp.solicitationNumber}` : `the ${opp.title} requirement`} posted on SAM.gov.`,
    '',
    `${company} is a ${certs}. We have reviewed the requirement and believe our service posture aligns with the scope.`,
    '',
    `Pursuit angle: ${opp.recommended_pursuit_angle}.`,
    '',
    'May I send a one-page capability statement and a brief responsiveness note for this requirement? Happy to follow your preferred format — a quote, a capability narrative, or a vendor introduction package.',
    '',
    `Response posture: within ${profile.capacity.max_response_time_hours} hours. Single point of contact. Documentation current.`,
    '',
    'Thank you,',
    profile.business_identity.primary_contact_name || '',
    company,
    profile.business_identity.website || '',
  ].filter(Boolean).join('\n'));

  return Object.freeze({
    draft_only: true,
    auto_send: false,
    manual_approval_required: true,
    review_notice: REVIEW_NOTICE,
    to: recipientEmail || '(no email on file — look up via SAM.gov record)',
    to_name: recipient,
    subject,
    body,
    solicitation_number: opp.solicitationNumber || null,
    sam_link: opp.uiLink || null,
    response_deadline: opp.responseDeadline || null,
  });
}

module.exports = Object.freeze({
  runSprint,
  scoreOpportunity,            // exported for tests
  dedupeRecords,               // exported for tests
  buildQueryPlan,              // exported for tests
  buildEmailDraft,             // exported for tests
  scoreLabel,                  // exported for tests
  bidNoBidRecommendation,      // exported for tests
  SCORING_MODEL_VERSION,
  LABELS,
});

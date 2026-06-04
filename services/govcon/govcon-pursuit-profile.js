// services/govcon/govcon-pursuit-profile.js
//
// GovCon Pursuit Profile — user-configurable goal, capability, and risk
// model that personalizes SAM Opportunity Sprint scoring.
//
// This is a NEW profile concept layered on top of, and distinct from,
// `services/govcon/targeting-profile.js`. Targeting profile answers
// "what kinds of opportunities should I see?" (NAICS, set-asides,
// agencies). Pursuit profile answers "given my goal and capacity, which
// of those should I act on first, and how?"
//
// HARD RULES
// - No secrets. The SAM.gov API key is NEVER part of the profile.
// - manual_review_required defaults to true; outreach drafts must
//   remain human-gated.
// - Pure data layer. No network, no IPC, no filesystem reads/writes.
//   Callers are responsible for persistence (electron-store, JSON, etc).
// - No guaranteed-award / guaranteed-revenue claims may be stored or
//   surfaced from this profile.

'use strict';

// Default NAICS the sprint will fan out across when the operator has
// not customized their target list. Mirrors the seven codes called out
// in the task spec.
const DEFAULT_TARGET_NAICS = Object.freeze([
  '238320', // Painting and Wall Covering Contractors
  '561720', // Janitorial Services
  '561210', // Facilities Support Services
  '561790', // Other Services to Buildings and Dwellings
  '541611', // Administrative Management and General Management Consulting Services
  '541618', // Other Management Consulting Services
  '541930', // Translation and Interpretation Services
]);

const SERVICE_LANES = Object.freeze([
  'painting_refresh',
  'janitorial_custodial',
  'facility_turnover',
  'minor_repairs_punch_list',
  'facilities_support',
  'admin_management_consulting',
  'translation_interpreting',
  'staffing_support',
  'subcontractor_management',
  'other',
]);

const URGENCY_LEVELS = Object.freeze([
  'immediate_revenue',
  'pipeline_building',
  'relationship_building',
  'subcontracting',
  'long_term_capture',
]);

const KNOWN_CERTIFICATIONS = Object.freeze([
  'SDVOSB', 'VOSB', 'HUBZone', 'MBE', 'DBE', 'SBE', 'WOSB', '8(a)', 'Small Business', 'Other',
]);

const KNOWN_SETASIDE_PREFS = Object.freeze([
  'SDVOSB', 'HUBZone', 'Total Small Business', 'Veteran-Owned',
  'Women-Owned', '8(a)',
]);

const SPRINT_WINDOWS = Object.freeze([7, 30]);

// Default profile. Everything is permissive-by-default; nothing assumes
// a particular company's certs, geography, or capacity. Operators must
// populate the profile from Settings before relying on sprint rankings.
function defaultPursuitProfile() {
  return {
    schema_version: 1,
    business_identity: {
      company_name: '',
      website: '',
      primary_contact_name: '',
      primary_contact_email: '',
      phone: '',
      certifications: [], // subset of KNOWN_CERTIFICATIONS
    },
    contract_goal: {
      goal_name: '',
      target_revenue_30_days: 0,
      target_revenue_90_days: 0,
      preferred_award_size_min: 0,
      preferred_award_size_max: 0,
      urgency_level: 'pipeline_building', // one of URGENCY_LEVELS
    },
    service_lanes: {
      painting_refresh: false,
      janitorial_custodial: false,
      facility_turnover: false,
      minor_repairs_punch_list: false,
      facilities_support: false,
      admin_management_consulting: false,
      translation_interpreting: false,
      staffing_support: false,
      subcontractor_management: false,
      other: false,
    },
    target_naics: DEFAULT_TARGET_NAICS.slice(),
    geography: {
      primary_states: [],            // ['VA', 'MD', 'DC']
      preferred_counties_or_regions: [],
      remote_friendly: false,
      national_allowed: false,
      excluded_states: [],
    },
    setaside_preferences: {
      SDVOSB: false,
      HUBZone: false,
      'Total Small Business': false,
      'Veteran-Owned': false,
      'Women-Owned': false,
      '8(a)': false,
      unrestricted_allowed: true,
      subcontracting_allowed: true,
    },
    capacity: {
      can_perform_directly: false,
      subcontractor_network_available: false,
      max_response_time_hours: 72,
      can_quote_same_day: false,
      can_start_within_days: 14,
      has_site_visit_capacity: false,
      requires_partner_for_field_work: false,
      license_or_bonding_constraints: '',
    },
    risk_filters: {
      avoid_clearance_required: true,
      avoid_large_construction: true,
      avoid_heavy_equipment: true,
      avoid_supply_only: false,
      avoid_long_technical_proposals: true,
      avoid_daily_onsite_if_outside_region: true,
      avoid_low_margin: true,
      minimum_margin_percent: 15,
    },
    past_performance: {
      has_relevant_past_performance: false,
      past_performance_lanes: [],   // subset of SERVICE_LANES
      notable_contracts: [],         // [{ agency, scope, year }]
      agencies_served: [],
      commercial_facility_experience: false,
    },
    output_preference: {
      sprint_window_days: 30,        // 7 or 30
      max_results: 200,
      generate_email_drafts: true,
      top_draft_count: 10,
      manual_review_required: true,  // MUST default true
    },
  };
}

// Deep merge primitive override on top of the default. Arrays in `override`
// fully replace defaults; objects merge field-by-field.
function mergeProfile(defaults, override) {
  if (override == null) return defaults;
  if (Array.isArray(defaults) || Array.isArray(override)) return override;
  if (typeof defaults !== 'object' || typeof override !== 'object') return override;
  const out = Object.assign({}, defaults);
  for (const k of Object.keys(override)) {
    out[k] = mergeProfile(defaults[k], override[k]);
  }
  return out;
}

// Strip any secret-looking key the caller may have tried to attach.
// Belt-and-suspenders: the schema doesn't have these fields, but if a
// caller passes through extra props we drop them.
const SECRET_KEY_PATTERNS = [
  /api[-_]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /bearer/i,
  /authorization/i,
];

function stripSecrets(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripSecrets);
  const out = {};
  for (const k of Object.keys(obj)) {
    if (SECRET_KEY_PATTERNS.some((p) => p.test(k))) continue;
    out[k] = stripSecrets(obj[k]);
  }
  return out;
}

// Normalize + validate an operator-supplied profile. Always returns a
// fully-populated profile; never throws on missing fields. Returns
// `{ profile, issues }` where `issues` is a soft validation report.
function normalizePursuitProfile(input) {
  const issues = [];
  const safeInput = stripSecrets(input || {});
  const merged = mergeProfile(defaultPursuitProfile(), safeInput);

  // Manual review must remain true unless the operator explicitly
  // disabled it AND we treat that as a soft warning surfaced to the UI.
  if (merged.output_preference.manual_review_required !== true) {
    issues.push({
      level: 'warning',
      field: 'output_preference.manual_review_required',
      message: 'Manual review should remain true; sprint outreach is human-gated by design.',
    });
    merged.output_preference.manual_review_required = true;
  }

  // Window must be 7 or 30.
  if (!SPRINT_WINDOWS.includes(Number(merged.output_preference.sprint_window_days))) {
    issues.push({
      level: 'warning',
      field: 'output_preference.sprint_window_days',
      message: `sprint_window_days must be one of ${SPRINT_WINDOWS.join(' or ')}; coercing to 30.`,
    });
    merged.output_preference.sprint_window_days = 30;
  }

  // Top draft count cap.
  const top = Number(merged.output_preference.top_draft_count) || 10;
  merged.output_preference.top_draft_count = Math.max(1, Math.min(top, 10));

  // Urgency.
  if (!URGENCY_LEVELS.includes(merged.contract_goal.urgency_level)) {
    issues.push({
      level: 'warning',
      field: 'contract_goal.urgency_level',
      message: `urgency_level must be one of ${URGENCY_LEVELS.join(', ')}; coercing to pipeline_building.`,
    });
    merged.contract_goal.urgency_level = 'pipeline_building';
  }

  // Certifications must come from the known list.
  merged.business_identity.certifications = (merged.business_identity.certifications || []).filter(
    (c) => KNOWN_CERTIFICATIONS.includes(c)
  );

  // Past performance lanes must come from the known list.
  merged.past_performance.past_performance_lanes = (merged.past_performance.past_performance_lanes || []).filter(
    (l) => SERVICE_LANES.includes(l)
  );

  // NAICS list — keep digits only and clamp to 6 chars.
  merged.target_naics = (merged.target_naics || []).map((n) => String(n).replace(/\D/g, '').slice(0, 6)).filter(Boolean);
  if (!merged.target_naics.length) merged.target_naics = DEFAULT_TARGET_NAICS.slice();

  // Geography — uppercase 2-letter state codes.
  merged.geography.primary_states = (merged.geography.primary_states || [])
    .map((s) => String(s).toUpperCase().slice(0, 2))
    .filter((s) => /^[A-Z]{2}$/.test(s));
  merged.geography.excluded_states = (merged.geography.excluded_states || [])
    .map((s) => String(s).toUpperCase().slice(0, 2))
    .filter((s) => /^[A-Z]{2}$/.test(s));

  // Completeness signal — surfaced so UI can show "preliminary scoring".
  const looksComplete = (
    merged.business_identity.company_name &&
    (merged.business_identity.certifications.length || merged.setaside_preferences.unrestricted_allowed) &&
    (merged.geography.primary_states.length || merged.geography.national_allowed || merged.geography.remote_friendly) &&
    (merged.contract_goal.goal_name || merged.contract_goal.target_revenue_30_days || merged.contract_goal.target_revenue_90_days) &&
    Object.values(merged.service_lanes).some(Boolean)
  );
  if (!looksComplete) {
    issues.push({
      level: 'notice',
      field: 'profile',
      message: 'Profile is incomplete. Sprint rankings are preliminary until business identity, goal, service lanes, geography, and certifications are populated.',
    });
  }

  return { profile: Object.freeze(deepFreeze(merged)), issues, isComplete: !!looksComplete };
}

function deepFreeze(o) {
  if (o == null || typeof o !== 'object') return o;
  for (const k of Object.keys(o)) {
    if (typeof o[k] === 'object' && o[k] !== null) deepFreeze(o[k]);
  }
  return o;
}

// Lane → NAICS hint map. Used by the sprint scorer to translate the
// operator's selected lanes into NAICS expectations.
const LANE_TO_NAICS = Object.freeze({
  painting_refresh:            ['238320'],
  janitorial_custodial:        ['561720'],
  facility_turnover:           ['561210', '561720', '561790'],
  minor_repairs_punch_list:    ['561210', '561790', '238990'],
  facilities_support:          ['561210', '561790'],
  admin_management_consulting: ['541611', '541618'],
  translation_interpreting:    ['541930'],
  staffing_support:            ['561320', '561330'],
  subcontractor_management:    ['561210'],
  other:                       [],
});

// Lane → keyword hint map. Used both to bias the SAM.gov query keyword
// fan-out and to compute keyword scoring boosts.
const LANE_TO_KEYWORDS = Object.freeze({
  painting_refresh:            ['painting', 'paint', 'refresh', 'wall covering'],
  janitorial_custodial:        ['janitorial', 'custodial', 'cleaning'],
  facility_turnover:           ['facility turnover', 'turnover', 'move-out', 'closeout'],
  minor_repairs_punch_list:    ['punch list', 'punch-list', 'minor repair', 'minor repairs'],
  facilities_support:          ['facilities support', 'facility support', 'building maintenance'],
  admin_management_consulting: ['administrative support', 'management consulting', 'program support'],
  translation_interpreting:    ['translation', 'interpreting', 'interpretation'],
  staffing_support:            ['staffing', 'temporary staffing'],
  subcontractor_management:    ['subcontractor management', 'teaming'],
  other:                       [],
});

module.exports = Object.freeze({
  defaultPursuitProfile,
  normalizePursuitProfile,
  mergeProfile,           // exported for tests
  stripSecrets,           // exported for tests
  DEFAULT_TARGET_NAICS,
  SERVICE_LANES,
  URGENCY_LEVELS,
  KNOWN_CERTIFICATIONS,
  KNOWN_SETASIDE_PREFS,
  SPRINT_WINDOWS,
  LANE_TO_NAICS,
  LANE_TO_KEYWORDS,
});

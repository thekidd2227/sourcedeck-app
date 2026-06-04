/**
 * SAM Opportunity Sprint tests.
 *
 * Pure node assert; no external test framework. Mirrors the existing
 * test style in test/govcon-core.test.js. All synthetic data; no live
 * SAM.gov network calls.
 *
 * Run:  node test/sam-opportunity-sprint.test.js
 *
 * Exits non-zero on any failure so `npm test` fails.
 */

'use strict';
const assert = require('assert');

const {
  defaultPursuitProfile,
  normalizePursuitProfile,
  stripSecrets,
  DEFAULT_TARGET_NAICS,
  SERVICE_LANES,
  URGENCY_LEVELS,
} = require('../services/govcon/govcon-pursuit-profile');

const {
  runSprint,
  scoreOpportunity,
  dedupeRecords,
  buildQueryPlan,
  buildEmailDraft,
  scoreLabel,
  bidNoBidRecommendation,
  LABELS,
} = require('../services/govcon/sam-opportunity-sprint');

const {
  PLAN_LIMITS,
  KNOWN_PLANS,
  normalizePlan,
  getSamSprintEntitlement,
  applyNaicsLimit,
  describeNaicsLimit,
} = require('../services/govcon/sam-sprint-entitlements');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); if (e && e.stack) console.log(e.stack); }
}
async function asyncTest(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); if (e && e.stack) console.log(e.stack); }
}

// Deterministic clock — Wednesday, 2026-06-03.
const NOW_MS = Date.parse('2026-06-03T12:00:00Z');

// Build a synthetic, already-normalized opportunity. Keeps test data
// independent of sam-search.js field-drift defensiveness.
function fixtureOpp(overrides) {
  return Object.assign({
    noticeId: 'n-' + Math.random().toString(36).slice(2, 10),
    solicitationNumber: 'SOL-12345',
    title: 'Custodial / Janitorial Services',
    description: 'Recurring janitorial services for a federal facility.',
    type: 'Combined Synopsis/Solicitation',
    agency: 'DEPT OF DEFENSE',
    office: 'NAVSUP FLT LOG CTR',
    naics: '561720',
    setAside: 'Total Small Business Set-Aside (FAR 19.5)',
    responseDeadline: new Date(NOW_MS + 6 * 86400000).toISOString(),
    postedDate: new Date(NOW_MS - 10 * 86400000).toISOString(),
    placeOfPerformance: { city: 'Norfolk', state: 'VA', country: 'USA' },
    contact: { name: 'LT Jane Doe', email: 'jane.doe@navy.mil', phone: '555-1212' },
    uiLink: 'https://sam.gov/opp/example/view',
  }, overrides || {});
}

// Operator profile that strongly favors VA janitorial, SDVOSB, fast response.
function fixtureProfile(overrides) {
  return normalizePursuitProfile(Object.assign({
    business_identity: {
      company_name: 'ARCG Systems',
      primary_contact_name: 'Operator',
      primary_contact_email: 'ops@example.com',
      certifications: ['SDVOSB', 'Small Business'],
    },
    contract_goal: { goal_name: '30-day capture', target_revenue_30_days: 50000, urgency_level: 'immediate_revenue' },
    service_lanes: { janitorial_custodial: true, facilities_support: true, painting_refresh: true },
    target_naics: ['561720', '561210', '238320', '541930'],
    geography: { primary_states: ['VA', 'MD', 'DC'], national_allowed: false, remote_friendly: false },
    setaside_preferences: { SDVOSB: true, 'Total Small Business': true, unrestricted_allowed: false, subcontracting_allowed: true },
    capacity: { can_perform_directly: true, max_response_time_hours: 72, can_quote_same_day: true, subcontractor_network_available: true },
    past_performance: { has_relevant_past_performance: true, past_performance_lanes: ['janitorial_custodial'] },
    output_preference: { sprint_window_days: 30, generate_email_drafts: true, top_draft_count: 10 },
  }, overrides || {})).profile;
}

console.log('\n--- defaultPursuitProfile ---');
test('default profile exposes the seven target NAICS', () => {
  const p = defaultPursuitProfile();
  assert.deepStrictEqual(p.target_naics, DEFAULT_TARGET_NAICS.slice());
});
test('default profile defaults manual_review_required to true', () => {
  const p = defaultPursuitProfile();
  assert.strictEqual(p.output_preference.manual_review_required, true);
});
test('default profile carries every known service lane key', () => {
  const p = defaultPursuitProfile();
  for (const k of SERVICE_LANES) assert.ok(Object.prototype.hasOwnProperty.call(p.service_lanes, k), `missing lane key ${k}`);
});

console.log('\n--- normalizePursuitProfile ---');
test('manual_review_required is forced to true even if operator disables it', () => {
  const { profile, issues } = normalizePursuitProfile({ output_preference: { manual_review_required: false } });
  assert.strictEqual(profile.output_preference.manual_review_required, true);
  assert.ok(issues.some(i => i.field === 'output_preference.manual_review_required'));
});
test('sprint_window_days coerces invalid values to 30', () => {
  const { profile } = normalizePursuitProfile({ output_preference: { sprint_window_days: 14 } });
  assert.strictEqual(profile.output_preference.sprint_window_days, 30);
});
test('top_draft_count is clamped to [1, 10]', () => {
  const a = normalizePursuitProfile({ output_preference: { top_draft_count: 999 } }).profile;
  const b = normalizePursuitProfile({ output_preference: { top_draft_count: -5 } }).profile;
  assert.strictEqual(a.output_preference.top_draft_count, 10);
  assert.strictEqual(b.output_preference.top_draft_count, 1);
});
test('unknown urgency_level coerces to pipeline_building', () => {
  const { profile } = normalizePursuitProfile({ contract_goal: { urgency_level: 'WAT' } });
  assert.strictEqual(profile.contract_goal.urgency_level, 'pipeline_building');
});
test('isComplete is false for a bare default profile', () => {
  const { isComplete } = normalizePursuitProfile({});
  assert.strictEqual(isComplete, false);
});
test('isComplete is true once identity, lanes, goal, geo, certs are populated', () => {
  const { isComplete } = normalizePursuitProfile({
    business_identity: { company_name: 'X', certifications: ['SDVOSB'] },
    contract_goal: { goal_name: 'G' },
    service_lanes: { janitorial_custodial: true },
    geography: { primary_states: ['VA'] },
  });
  assert.strictEqual(isComplete, true);
});

console.log('\n--- stripSecrets ---');
test('stripSecrets removes any field that looks like a credential', () => {
  const cleaned = stripSecrets({ api_key: 'x', token: 'y', SECRET: 'z', kept: 1, nested: { Bearer: 'b', ok: 2 } });
  assert.strictEqual(cleaned.api_key, undefined);
  assert.strictEqual(cleaned.token, undefined);
  assert.strictEqual(cleaned.SECRET, undefined);
  assert.strictEqual(cleaned.kept, 1);
  assert.strictEqual(cleaned.nested.Bearer, undefined);
  assert.strictEqual(cleaned.nested.ok, 2);
});
test('a SAM_GOV_API_KEY snuck onto the profile is stripped', () => {
  const { profile } = normalizePursuitProfile({ business_identity: { company_name: 'X' }, SAM_GOV_API_KEY: 'whoops' });
  assert.strictEqual(profile.SAM_GOV_API_KEY, undefined);
});

console.log('\n--- scoreLabel / bidNoBidRecommendation ---');
test('label thresholds: 90 → Pursue, 75 → Strong, 60 → Review, 59 → Archive', () => {
  assert.strictEqual(scoreLabel(95), LABELS.PURSUE);
  assert.strictEqual(scoreLabel(80), LABELS.STRONG);
  assert.strictEqual(scoreLabel(65), LABELS.REVIEW);
  assert.strictEqual(scoreLabel(50), LABELS.ARCHIVE);
});
test('bidNoBidRecommendation honors hard_stop risk flags', () => {
  assert.strictEqual(bidNoBidRecommendation(95, [{ severity: 'hard_stop', key: 'x', message: '' }]), 'NO-BID');
});

console.log('\n--- dedupeRecords ---');
test('dedupes by noticeId then solicitationNumber, merging sources', () => {
  const a = { source: 'naics:561720', rec: { noticeId: 'X1', solicitationNumber: 'A' } };
  const b = { source: 'state:VA',    rec: { noticeId: 'X1', solicitationNumber: 'A' } };
  const c = { source: 'kw:janitor',  rec: { noticeId: null, solicitationNumber: 'A' } };
  const d = { source: 'kw:painting', rec: { noticeId: 'Y2', solicitationNumber: 'B' } };
  const out = dedupeRecords([a, b, c, d]);
  assert.strictEqual(out.length, 2);
  const x1 = out.find(o => o.rec.noticeId === 'X1');
  assert.ok(x1.sources.includes('naics:561720') && x1.sources.includes('state:VA'));
});

console.log('\n--- scoreOpportunity (profile-driven) ---');
test('matching VA + 561720 + SDVOSB + 6d deadline lands ≥90 (Pursue) for VA-focused SDVOSB operator', () => {
  const opp = fixtureOpp();
  opp.daysUntilClose = 6;
  const v = scoreOpportunity(opp, fixtureProfile(), NOW_MS);
  assert.ok(v.fit_score >= 90, `expected ≥90, got ${v.fit_score}`);
  assert.strictEqual(v.score_label, LABELS.PURSUE);
});

test('geography mismatch penalizes when national_allowed is false', () => {
  const opp = fixtureOpp({ placeOfPerformance: { city: 'Boise', state: 'ID', country: 'USA' } });
  opp.daysUntilClose = 6;
  const base = scoreOpportunity(opp, fixtureProfile(), NOW_MS);
  // Same operator but with national_allowed true should score noticeably higher.
  const wide = scoreOpportunity(opp, fixtureProfile({ geography: { primary_states: ['VA', 'MD', 'DC'], national_allowed: true } }), NOW_MS);
  assert.ok(wide.fit_score > base.fit_score, `national_allowed should raise score (base=${base.fit_score}, wide=${wide.fit_score})`);
  assert.ok(base.risk_flags.some(f => f.key === 'geo_mismatch'));
});

test('certification/set-aside boost: SDVOSB cert raises score on SDVOSB-coded opportunity', () => {
  const opp = fixtureOpp({ setAside: 'SDVOSB Sole Source' });
  opp.daysUntilClose = 10;
  const withSdvosb = scoreOpportunity(opp, fixtureProfile(), NOW_MS);
  const without = scoreOpportunity(opp, fixtureProfile({
    business_identity: { company_name: 'X', certifications: [] },
    setaside_preferences: { SDVOSB: false, unrestricted_allowed: false },
  }), NOW_MS);
  assert.ok(withSdvosb.fit_score > without.fit_score, `expected SDVOSB boost (with=${withSdvosb.fit_score}, without=${without.fit_score})`);
});

test('capacity mismatch: tight deadline + slow operator triggers penalty + risk flag', () => {
  const opp = fixtureOpp({ responseDeadline: new Date(NOW_MS + 1 * 86400000).toISOString() });
  opp.daysUntilClose = 1;
  const slow = scoreOpportunity(opp, fixtureProfile({
    capacity: { max_response_time_hours: 168, can_quote_same_day: false, subcontractor_network_available: false },
  }), NOW_MS);
  assert.ok(slow.risk_flags.some(f => f.key === 'capacity_response'));
});

test('clearance language triggers hard_stop and NO-BID even with high category scores', () => {
  const opp = fixtureOpp({ description: 'Janitorial services requiring secret clearance.' });
  opp.daysUntilClose = 6;
  const v = scoreOpportunity(opp, fixtureProfile(), NOW_MS);
  assert.ok(v.risk_flags.some(f => f.key === 'clearance_required' && f.severity === 'hard_stop'));
  assert.strictEqual(v.bid_no_bid_recommendation, 'NO-BID');
});

test('missing contact data penalizes but does NOT discard', () => {
  const opp = fixtureOpp({ contact: { name: null, email: null, phone: null } });
  opp.daysUntilClose = 6;
  const v = scoreOpportunity(opp, fixtureProfile(), NOW_MS);
  assert.ok(v.risk_flags.some(f => f.key === 'missing_contact'));
  assert.ok(v.fit_score > 0, 'should still receive a score');
});

test('profile drives score: same opp scores differently under different profiles', () => {
  const opp = fixtureOpp({ title: 'Translation services', naics: '541930', description: 'On-call Spanish translation.' });
  opp.daysUntilClose = 14;
  const translatorProfile = fixtureProfile({
    service_lanes: { translation_interpreting: true },
    target_naics: ['541930'],
  });
  const painterProfile = fixtureProfile({
    service_lanes: { painting_refresh: true },
    target_naics: ['238320'],
  });
  const a = scoreOpportunity(opp, translatorProfile, NOW_MS);
  const b = scoreOpportunity(opp, painterProfile, NOW_MS);
  assert.ok(a.fit_score > b.fit_score, `translator profile should score translation opp higher (a=${a.fit_score}, b=${b.fit_score})`);
});

console.log('\n--- buildQueryPlan ---');
test('buildQueryPlan unions operator NAICS with lane-derived NAICS and adds keywords', () => {
  // Use a paid plan so the union is not capped by the free-plan NAICS limit.
  // This test isolates union behavior (operator NAICS + lane-derived NAICS +
  // keywords); the entitlement cap is exercised separately below.
  const profile = fixtureProfile({ subscription: { plan: 'paid' } });
  const plan = buildQueryPlan(profile, NOW_MS);
  assert.ok(plan.naics.includes('561720'));
  assert.ok(plan.naics.includes('238320'));
  assert.ok(plan.keywords.includes('janitorial'));
  assert.ok(plan.keywords.includes('painting'));
  assert.strictEqual(plan.window, 30);
});

console.log('\n--- runSprint integration (no-network) ---');
asyncTest('runSprint returns not_configured when no API key is provided', async () => {
  const r = await runSprint({ profile: fixtureProfile(), getApiKey: async () => null, now: () => NOW_MS });
  assert.strictEqual(r.status, 'not_configured');
  assert.strictEqual(r.raw_count, 0);
  assert.strictEqual(r.scored_opportunities.length, 0);
});

asyncTest('runSprint never embeds the api key in the result', async () => {
  // Inject a fake sam service so we can pass an api key without ever
  // sending it anywhere. Returns one fixture record.
  const fakeRec = {
    noticeId: 'NID-1', solicitationNumber: 'SOL-1',
    title: 'Janitorial Services Norfolk VA', type: 'Combined Synopsis/Solicitation',
    fullParentPathName: 'DEPT OF DEFENSE.NAVSUP.NORFOLK',
    naicsCode: '561720',
    typeOfSetAside: 'Total Small Business Set-Aside (FAR 19.5)',
    responseDeadLine: new Date(NOW_MS + 6 * 86400000).toISOString(),
    placeOfPerformance: { city: { name: 'Norfolk' }, state: { code: 'VA' }, country: { code: 'USA' } },
    pointOfContact: [{ type: 'primary', fullName: 'LT Jane Doe', email: 'jane@navy.mil', phone: '555' }],
    uiLink: 'https://sam.gov/opp/x/view',
  };
  const fakeService = { search: async () => ({ ok: true, results: [fakeRec], total: 1, returned: 1 }) };
  const SECRET = 'this-must-not-leak-9f3a';
  const r = await runSprint({
    profile: fixtureProfile(),
    getApiKey: async () => SECRET,
    samService: fakeService,
    now: () => NOW_MS,
  });
  assert.strictEqual(r.status, 'ran');
  const serialized = JSON.stringify(r);
  assert.strictEqual(serialized.includes(SECRET), false, 'API key string leaked into result');
});

asyncTest('runSprint generates at most top_draft_count email drafts and none auto-send', async () => {
  // Inject 25 synthetic records so we can prove the cap.
  const recs = Array.from({ length: 25 }, (_, i) => ({
    noticeId: `NID-${i}`, solicitationNumber: `SOL-${i}`,
    title: `Janitorial Services ${i}`, type: 'Combined Synopsis/Solicitation',
    naicsCode: '561720',
    typeOfSetAside: 'Total Small Business Set-Aside (FAR 19.5)',
    responseDeadLine: new Date(NOW_MS + (i + 1) * 86400000).toISOString(),
    placeOfPerformance: { city: { name: 'Norfolk' }, state: { code: 'VA' } },
    pointOfContact: [{ type: 'primary', fullName: 'LT Jane Doe', email: 'jane@navy.mil' }],
  }));
  const fakeService = { search: async () => ({ ok: true, results: recs, total: recs.length, returned: recs.length }) };
  const r = await runSprint({
    profile: fixtureProfile({ output_preference: { top_draft_count: 10, generate_email_drafts: true } }),
    getApiKey: async () => 'fake',
    samService: fakeService,
    now: () => NOW_MS,
  });
  assert.ok(r.email_drafts.length <= 10, `email_drafts cap exceeded: ${r.email_drafts.length}`);
  for (const d of r.email_drafts) {
    assert.strictEqual(d.draft_only, true);
    assert.strictEqual(d.auto_send, false);
    assert.strictEqual(d.manual_approval_required, true);
  }
});

asyncTest('runSprint result has the documented report shape', async () => {
  const fakeService = { search: async () => ({ ok: true, results: [], total: 0, returned: 0 }) };
  const r = await runSprint({
    profile: fixtureProfile(), getApiKey: async () => 'fake', samService: fakeService, now: () => NOW_MS,
  });
  for (const key of [
    'status', 'profile_snapshot', 'profile_issues', 'profile_complete',
    'query_metadata', 'scoring_model_version', 'generated_at',
    'raw_count', 'unique_count', 'scored_opportunities',
    'email_drafts', 'manual_review_required', 'errors',
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(r, key), `missing key: ${key}`);
  }
  assert.strictEqual(r.manual_review_required, true);
});

console.log('\n--- buildEmailDraft ---');
test('email drafts never contain guaranteed-award language', () => {
  const opp = Object.assign(fixtureOpp(), {
    recommended_pursuit_angle: 'We guarantee award and guaranteed savings every time.',
    fit_score: 95,
  });
  const d = buildEmailDraft(opp, fixtureProfile());
  // Both subject and body run through safe(); blocked phrases must be redacted.
  assert.strictEqual(/guarantee/i.test(d.body) && !/redacted/i.test(d.body), false);
});
test('email drafts are draft_only with manual_approval_required=true', () => {
  const d = buildEmailDraft(Object.assign(fixtureOpp(), { recommended_pursuit_angle: 'X' }), fixtureProfile());
  assert.strictEqual(d.draft_only, true);
  assert.strictEqual(d.auto_send, false);
  assert.strictEqual(d.manual_approval_required, true);
});

console.log('\n--- sam-sprint-entitlements ---');
test('normalizePlan: missing/null/empty defaults to free', () => {
  assert.strictEqual(normalizePlan(null).plan, 'free');
  assert.strictEqual(normalizePlan('').plan, 'free');
  assert.strictEqual(normalizePlan(undefined).plan, 'free');
});
test('normalizePlan: unknown plan defaults to free with warning', () => {
  const r = normalizePlan('platinum');
  assert.strictEqual(r.plan, 'free');
  assert.ok(r.warning && /platinum/i.test(r.warning));
});
test('normalizePlan: known plans pass through (case-insensitive)', () => {
  for (const p of ['free', 'paid', 'pro', 'team', 'enterprise']) {
    assert.strictEqual(normalizePlan(p).plan, p);
    assert.strictEqual(normalizePlan(p.toUpperCase()).plan, p);
  }
});
test('PLAN_LIMITS: free is 1, all paid tiers are Infinity', () => {
  assert.strictEqual(PLAN_LIMITS.free.max_naics_codes, 1);
  assert.strictEqual(PLAN_LIMITS.free.is_paid, false);
  for (const p of ['paid', 'pro', 'team', 'enterprise']) {
    assert.strictEqual(PLAN_LIMITS[p].max_naics_codes, Infinity);
    assert.strictEqual(PLAN_LIMITS[p].is_paid, true);
  }
});
test('getSamSprintEntitlement accepts a profile and resolves plan', () => {
  const ent = getSamSprintEntitlement({ subscription: { plan: 'pro' } });
  assert.strictEqual(ent.plan, 'pro');
  assert.strictEqual(ent.is_paid, true);
});
test('applyNaicsLimit: free plan caps to first 1 NAICS, lists blocked', () => {
  const ent = getSamSprintEntitlement('free');
  const out = applyNaicsLimit({ target_naics: ['1', '2', '3', '4', '5'] }, ent);
  assert.deepStrictEqual(out.allowed_naics, ['1']);
  assert.deepStrictEqual(out.blocked_naics, ['2', '3', '4', '5']);
  assert.strictEqual(out.naics_limit_applied, true);
});
test('applyNaicsLimit: paid plan returns all NAICS, nothing blocked', () => {
  const ent = getSamSprintEntitlement('paid');
  const out = applyNaicsLimit({ target_naics: ['1', '2', '3', '4', '5'] }, ent);
  assert.deepStrictEqual(out.allowed_naics, ['1', '2', '3', '4', '5']);
  assert.strictEqual(out.blocked_naics.length, 0);
  assert.strictEqual(out.naics_limit_applied, false);
});
test('describeNaicsLimit phrases honestly for free under-limit and over-limit', () => {
  const free = getSamSprintEntitlement('free');
  // Under-limit case: operator configured exactly 1 NAICS (the cap).
  const under = describeNaicsLimit(free, 1, 1);
  // Over-limit case: operator configured 7 NAICS but free caps to 1.
  const over  = describeNaicsLimit(free, 7, 1);
  assert.ok(/within limit/i.test(under), `expected within-limit phrasing, got: ${under}`);
  assert.ok(/6 withheld/i.test(over) && /searching 1 of 7/i.test(over), `expected honest phrasing, got: ${over}`);
});

console.log('\n--- pursuit profile subscription normalization ---');
test('missing subscription defaults to free / not paid', () => {
  const { profile } = normalizePursuitProfile({});
  assert.strictEqual(profile.subscription.plan, 'free');
  assert.strictEqual(profile.subscription.is_paid, false);
});
test('unknown plan in profile defaults to free with warning', () => {
  const { profile, issues } = normalizePursuitProfile({ subscription: { plan: 'platinum' } });
  assert.strictEqual(profile.subscription.plan, 'free');
  assert.ok(issues.some(i => i.field === 'subscription.plan' && /platinum/i.test(i.message)));
});
test('paid plan in profile yields is_paid=true', () => {
  const { profile } = normalizePursuitProfile({ subscription: { plan: 'paid' } });
  assert.strictEqual(profile.subscription.plan, 'paid');
  assert.strictEqual(profile.subscription.is_paid, true);
});

console.log('\n--- buildQueryPlan respects entitlement ---');
test('buildQueryPlan caps NAICS to 1 for free plan and records blocked codes', () => {
  const { profile } = normalizePursuitProfile({
    target_naics: ['238320', '561720', '561210', '561790', '541611', '541618', '541930'],
    service_lanes: {}, // no lanes so lane-derived NAICS stay empty
    subscription: { plan: 'free' },
  });
  const plan = buildQueryPlan(profile, NOW_MS);
  assert.strictEqual(plan.naics.length, 1);
  assert.deepStrictEqual(plan.naics, ['238320']);
  assert.strictEqual(plan.entitlement.plan, 'free');
  assert.strictEqual(plan.entitlement.naics_limit_applied, true);
  assert.strictEqual(plan.entitlement.allowed_naics_count, 1);
  assert.strictEqual(plan.entitlement.requested_naics_count, 7);
  assert.deepStrictEqual(plan.entitlement.blocked_naics_codes, ['561720', '561210', '561790', '541611', '541618', '541930']);
});
test('buildQueryPlan keeps all NAICS for paid plan', () => {
  const { profile } = normalizePursuitProfile({
    target_naics: ['238320', '561720', '561210', '561790', '541611', '541618', '541930'],
    service_lanes: {},
    subscription: { plan: 'paid' },
  });
  const plan = buildQueryPlan(profile, NOW_MS);
  assert.strictEqual(plan.naics.length, 7);
  assert.strictEqual(plan.entitlement.is_paid, true);
  assert.strictEqual(plan.entitlement.naics_limit_applied, false);
  assert.deepStrictEqual(plan.entitlement.blocked_naics_codes, []);
});
test('free plan does not mutate the operator\'s saved target_naics on the profile', () => {
  const { profile } = normalizePursuitProfile({
    target_naics: ['238320', '561720', '561210', '561790', '541611', '541618', '541930'],
    subscription: { plan: 'free' },
  });
  buildQueryPlan(profile, NOW_MS); // ignore return
  // Saved list is preserved exactly.
  assert.deepStrictEqual(profile.target_naics, ['238320', '561720', '561210', '561790', '541611', '541618', '541930']);
});

asyncTest('runSprint surfaces entitlement metadata on the result', async () => {
  const fakeService = { search: async () => ({ ok: true, results: [], total: 0, returned: 0 }) };
  const r = await runSprint({
    profile: { target_naics: ['1','2','3','4','5'], subscription: { plan: 'free' } },
    getApiKey: async () => 'fake',
    samService: fakeService,
    now: () => NOW_MS,
  });
  assert.strictEqual(r.entitlement.plan, 'free');
  assert.strictEqual(r.entitlement.is_paid, false);
  assert.strictEqual(r.entitlement.naics_limit_applied, true);
  assert.strictEqual(r.entitlement.allowed_naics_count, 1);
  assert.deepStrictEqual(r.entitlement.blocked_naics_codes, ['2', '3', '4', '5']);
  assert.strictEqual(r.query_metadata.entitlement.plan, 'free');
  assert.strictEqual(r.manual_review_required, true);
});

asyncTest('runSprint does NOT call SAM for blocked free-plan NAICS', async () => {
  const calls = [];
  const fakeService = {
    search: async (params) => {
      // Record what we were asked to search.
      if (params && Array.isArray(params.naics)) calls.push(...params.naics);
      return { ok: true, results: [], total: 0, returned: 0 };
    },
  };
  await runSprint({
    profile: { target_naics: ['111', '222', '333', '444', '555'], service_lanes: {}, subscription: { plan: 'free' } },
    getApiKey: async () => 'fake',
    samService: fakeService,
    now: () => NOW_MS,
  });
  // Only the first NAICS should have been queried; 222/333/444/555 must not appear.
  const naicsCalledSet = new Set(calls);
  assert.ok(naicsCalledSet.has('111'), 'expected NAICS 111 to be queried');
  for (const blocked of ['222', '333', '444', '555']) {
    assert.strictEqual(naicsCalledSet.has(blocked), false, `blocked NAICS ${blocked} was queried`);
  }
});

asyncTest('runSprint surfaces entitlement even on not_configured exit (no key)', async () => {
  const r = await runSprint({
    profile: { target_naics: ['1','2','3','4'], subscription: { plan: 'free' } },
    getApiKey: async () => null,
    now: () => NOW_MS,
  });
  assert.strictEqual(r.status, 'not_configured');
  assert.ok(r.entitlement);
  assert.strictEqual(r.entitlement.plan, 'free');
  assert.strictEqual(r.entitlement.naics_limit_applied, true);
  assert.strictEqual(r.entitlement.allowed_naics_count, 1);
  assert.strictEqual(r.manual_review_required, true);
});

asyncTest('runSprint keeps manual_review_required=true under both plans', async () => {
  const fakeService = { search: async () => ({ ok: true, results: [], total: 0, returned: 0 }) };
  for (const plan of ['free', 'paid', 'pro', 'team', 'enterprise']) {
    const r = await runSprint({
      profile: { target_naics: ['1','2','3','4','5'], subscription: { plan } },
      getApiKey: async () => 'fake',
      samService: fakeService,
      now: () => NOW_MS,
    });
    assert.strictEqual(r.manual_review_required, true, `plan ${plan} did not force manual_review_required`);
    // Drafts (if any) must remain draft-only.
    for (const d of (r.email_drafts || [])) {
      assert.strictEqual(d.auto_send, false);
      assert.strictEqual(d.manual_approval_required, true);
    }
  }
});

// ---- Finalize ----

setTimeout(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}, 100);

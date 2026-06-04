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
  const profile = fixtureProfile();
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

// ---- Finalize ----

setTimeout(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}, 100);

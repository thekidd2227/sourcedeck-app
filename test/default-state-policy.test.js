/**
 * Default-state data-hygiene tests.
 *
 * Verifies:
 *   - The policy module enforces demo-mode-off-by-default.
 *   - The forbidden-seed-term list flags every example the operator listed.
 *   - The Top-50 industry list, social/content platform list, and generic
 *     ad-topic categories all meet shape requirements.
 *   - The shipped renderer (sourcedeck.html) no longer carries the
 *     operator/demo seed strings that contaminated default state, and the
 *     known regression-protected features (Response Desk, SAM Sprint,
 *     Phase 20G visuals) still hold.
 *
 * Run: node test/default-state-policy.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const policy = require('../services/default-state-policy');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

console.log('\n── default-state policy module ──');

test('demo mode is OFF by default (no env)', () => {
  assert.strictEqual(policy.isDemoMode({}), false);
  assert.strictEqual(policy.isDemoMode({ SOURCEDECK_DEMO_MODE: 'false' }), false);
});

test('demo mode requires explicit SOURCEDECK_DEMO_MODE=true', () => {
  assert.strictEqual(policy.isDemoMode({ SOURCEDECK_DEMO_MODE: 'true' }), true);
  assert.strictEqual(policy.isDemoMode({ SOURCEDECK_DEMO_MODE: '1' }), true);
});

test('TOP_50_INDUSTRIES has at least 50 entries + key industries present', () => {
  assert.ok(policy.TOP_50_INDUSTRIES.length >= 50, 'expected >= 50, got ' + policy.TOP_50_INDUSTRIES.length);
  for (const required of ['SaaS', 'E-commerce', 'Healthcare', 'Manufacturing', 'Education', 'Government Contractors']) {
    assert.ok(policy.TOP_50_INDUSTRIES.includes(required), 'missing industry: ' + required);
  }
});

test('SOCIAL_CONTENT_PLATFORMS contains all major platforms', () => {
  for (const p of ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X / Twitter', 'Pinterest', 'Email', 'Multi-Platform']) {
    assert.ok(policy.SOCIAL_CONTENT_PLATFORMS.includes(p), 'missing platform: ' + p);
  }
});

test('GENERIC_AD_TOPIC_CATEGORIES are generic (no operator codenames)', () => {
  for (const t of policy.GENERIC_AD_TOPIC_CATEGORIES) {
    for (const forbidden of ['Diagnosis-First', 'Revenue Leakage', 'Operator POV', 'Bad-Fit', 'MedPilot']) {
      assert.ok(!t.includes(forbidden), 'category contains operator term: ' + t);
    }
  }
  assert.ok(policy.GENERIC_AD_TOPIC_CATEGORIES.includes('Awareness'));
  assert.ok(policy.GENERIC_AD_TOPIC_CATEGORIES.includes('Lead generation'));
});

console.log('\n── forbidden-seed-term detection ──');

test('assertNoOperatorSeedData flags PROD-XX, NYC, ARCG, Jean-Max, etc.', () => {
  for (const bad of [
    'PROD-01 Assessment',
    'NYC Metro priority leads',
    'Manhattan accounts',
    'ARCG Systems internal',
    'Jean-Max test',
    'Diagnosis-First framework',
    'Operator POV essay',
    'Spanish Caribbean (All)',
    'Government Contractor Diagnostic',
    'Revenue Leakage Math'
  ]) {
    let threw = false;
    try { policy.assertNoOperatorSeedData(bad); }
    catch (e) { threw = true; assert.strictEqual(e.code, 'FORBIDDEN_SEED_TERM'); }
    assert.ok(threw, 'should flag: ' + bad);
  }
});

test('assertNoOperatorSeedData ignores neutral text', () => {
  for (const ok of [
    'Acme widgets',
    'Healthcare practices',
    'Property Management Q2 plan',  // "Property Management" alone is allowed (it's an industry)
    'United States',
    'Select market…',
    '',
    null
  ]) {
    policy.assertNoOperatorSeedData(ok);  // must not throw
  }
});

test('sanitizeDefaultUserState scrubs forbidden terms from objects', () => {
  const dirty = {
    title: 'Healthcare leads in NYC Metro',
    list: ['Manhattan accounts', 'Brooklyn pipeline', 'Acme widgets']
  };
  const clean = policy.sanitizeDefaultUserState(dirty);
  assert.ok(!/NYC Metro|Manhattan|Brooklyn/.test(JSON.stringify(clean)));
  assert.ok(/Acme widgets/.test(JSON.stringify(clean)));
});

test('DEFAULT_EMPTY_STATES covers all critical surfaces', () => {
  for (const k of ['leads','activity','webhooks','connections','infrastructure','automationStatus','dailyRhythm','weeklyRhythm','escalationRules','adTopics','responseDesk']) {
    assert.ok(policy.DEFAULT_EMPTY_STATES[k], 'missing empty-state for: ' + k);
  }
});

console.log('\n── renderer contamination (static-source) ──');

const HTML_PATH = path.join(__dirname, '..', 'sourcedeck.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Slice the renderer into the new-user-default region (HTML markup before
// the inline <script> block, where the option lists and kv defaults live).
const scriptIdx = html.indexOf('<script>');
const markup = scriptIdx > 0 ? html.slice(0, scriptIdx) : html;

test('renderer markup does NOT preload PROD-XX activity rows', () => {
  // PROD-XX may still appear inside the inline <script> block as part of
  // demo-data references, but should not appear in default user-facing
  // markup.
  const hits = (markup.match(/PROD-0\d/g) || []);
  assert.strictEqual(hits.length, 0, 'PROD-XX in markup: ' + hits.join(','));
});

test('renderer markup does NOT preload NYC/Manhattan/Brooklyn dropdown defaults', () => {
  for (const term of ['Manhattan', 'Brooklyn', 'Bronx', 'Queens', 'Staten Island', 'Westchester']) {
    assert.ok(!new RegExp('value="' + term + '"').test(markup),
      'still has dropdown option value="' + term + '"');
  }
});

test('renderer markup does NOT preload Spanish Caribbean dropdown', () => {
  assert.ok(!/optgroup label="Spanish Caribbean"/i.test(markup));
});

test('renderer markup does NOT carry fake operator IDs (Airtable appXXX, Gmail 8125092, fake tokens)', () => {
  assert.ok(!/appXXXXXXXXXXXXXXX/.test(markup), 'fake Airtable base ID present');
  assert.ok(!/\b8125092\b/.test(markup), 'fake Gmail connection ID present');
  assert.ok(!/ti5tlit9s9ir0sr1vha7vqjyemcuvlnq/.test(markup), 'fake PROD-05 token present');
  assert.ok(!/jpu2xjxufd8x7yt3qnsk9ntxd0ns77jk/.test(markup), 'fake LCC token present');
  assert.ok(!/\(4595758\)/.test(markup), 'fake Instantly campaign ID present');
});

test('renderer markup does NOT preload operator ad topics (Diagnosis-First family, MedPilot family)', () => {
  for (const term of [
    'Revenue Leakage Math', 'Operator POV', 'Bad-Fit Opportunity Chase',
    'Government Contractor Diagnostic', 'Caribbean & LatAm Operator Diagnostic',
    'Property Management Diagnostic', 'No-Show Revenue Leakage', 'RCM Revenue Leakage'
  ]) {
    assert.ok(!markup.includes(term), 'still has operator topic: ' + term);
  }
});

test('Ad Engine pane title is "Ad Engine" (not "Faceless Ad Engine")', () => {
  assert.ok(/>Ad Engine</.test(markup), 'Ad Engine title missing');
  assert.ok(!/>Faceless Ad Engine</.test(markup), 'old Faceless Ad Engine title still present');
});

console.log('\n── regression: Response Desk preserved ──');

test('Response Desk label still present + no Reply Analyzer regression', () => {
  assert.ok(/>Response Desk</.test(html), 'Response Desk label missing');
  assert.ok(!/<span class="brief-head">Reply Analyzer<\/span>/.test(html), 'Reply Analyzer label returned');
});

test('Response Desk: no Send Email surface', () => {
  const tabStart = html.indexOf('id="tab-reply"');
  if (tabStart > 0) {
    const region = html.slice(tabStart, tabStart + 12000);
    assert.ok(!/Send Email/i.test(region), 'Send Email button reintroduced');
  }
});

test('Response Desk service module still preserves invariants', () => {
  const rd = require('../services/response-desk');
  const r = rd.runResponseDesk({ replyText: 'We are ready to move forward.' });
  assert.strictEqual(r.human_approval_required, true);
  assert.strictEqual(r.auto_send, false);
});

console.log('\n── regression: SAM Sprint preserved ──');

test('SAM Sprint entitlements: Free = 1 NAICS, paid plans = all configured', () => {
  const ent = require('../services/govcon/sam-sprint-entitlements');
  assert.ok(ent.PLAN_LIMITS, 'PLAN_LIMITS export missing');
  assert.strictEqual(ent.PLAN_LIMITS.free.max_naics_codes, 1, 'Free plan must = 1 NAICS');
  assert.strictEqual(ent.PLAN_LIMITS.free.is_paid, false, 'Free plan must be is_paid:false');
  for (const paid of ['pro', 'team', 'enterprise']) {
    if (ent.PLAN_LIMITS[paid]) {
      assert.strictEqual(ent.PLAN_LIMITS[paid].is_paid, true, paid + ' must be is_paid:true');
      assert.ok(
        ent.PLAN_LIMITS[paid].max_naics_codes === null ||
        ent.PLAN_LIMITS[paid].max_naics_codes === Infinity ||
        ent.PLAN_LIMITS[paid].max_naics_codes >= 5,
        paid + ' must allow many NAICS, got ' + ent.PLAN_LIMITS[paid].max_naics_codes
      );
    }
  }
});

test('SAM_GOV_API_KEY remains environment-only (no renderer storage)', () => {
  // Renderer must not localStorage.setItem the SAM key.
  assert.ok(!/localStorage\.setItem\([^)]*SAM_GOV_API_KEY/i.test(html),
    'renderer must not store SAM_GOV_API_KEY in localStorage');
});

console.log('\n── regression: Phase 20G visual guards preserved ──');

test('.btn-gold remains cool gold (no global --gold repoint)', () => {
  // Phase 20F merged --gold:#C9941A as the canonical cool-gold. Confirm it
  // hasn't been repointed to blue or brass anywhere in the global :root.
  const rootBlock = html.match(/:root\{[\s\S]*?\}/);
  assert.ok(rootBlock, ':root block must exist');
  assert.ok(/--gold:#C9941A/.test(rootBlock[0]), '--gold no longer #C9941A');
});

test('900px / 899px breakpoint guards still present', () => {
  assert.ok(/@media\(max-width:900px\)/.test(html) || /@media\s*\(\s*max-width:\s*900px\s*\)/.test(html),
    '900px media query missing');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} default-state-policy tests ===`
  : `=== FAIL — ${failed}/${total} default-state-policy tests failed ===`);
if (failed > 0) process.exit(1);

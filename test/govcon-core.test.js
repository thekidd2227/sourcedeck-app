/**
 * GovCon core service tests.
 *
 * Pure node assert; no external test framework. Mirrors the existing
 * test style (clinical-capability, ibm-readiness, etc.). All synthetic
 * data; no live network is exercised.
 *
 * Run:  node test/govcon-core.test.js
 *
 * Exits non-zero on any failure so `npm test` fails.
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  createTargetingProfileService,
  defaultProfile,
  sanitizeProfile,
  KNOWN_SETASIDES,
  KNOWN_CONTRACT_TYPES
} = require('../services/govcon/targeting-profile');

const {
  createSamSearchService,
  normalizeSamRecord,
  dedupe,
  applyTargeting,
  buildSamHumanUrl
} = require('../services/govcon/sam-search');

const { generateComplianceMatrix } = require('../services/govcon/compliance-matrix');
const { evaluatePreRfp, isPreRfp } = require('../services/govcon/pre-rfp');
const { createPastPerformanceService, sanitizeProject, relevanceScore } =
  require('../services/govcon/past-performance');
const { buildStakeholderGraph, isInRestrictedWindow, SAFETY_NOTE } =
  require('../services/govcon/stakeholder-graph');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}
async function asyncTest(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

// In-memory store shim mimicking electron-store.get/set.
function makeStore() {
  const m = new Map();
  return {
    get: (k) => m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null,
    set: (k, v) => m.set(k, JSON.parse(JSON.stringify(v))),
    has: (k) => m.has(k),
    _raw: m
  };
}

console.log('\n── targeting-profile ──');

test('targeting: defaults expose schemaVersion 1 and empty seed', () => {
  const d = defaultProfile();
  assert.strictEqual(d.schemaVersion, 1);
  assert.deepStrictEqual(d.naics, []);
  assert.deepStrictEqual(d.psc, []);
  assert.deepStrictEqual(d.agencies.include, []);
  assert.deepStrictEqual(d.agencies.exclude, []);
  assert.strictEqual(d.noticeTypes.active_solicitation, true);
  assert.strictEqual(d.noticeTypes.pre_rfp_intel, true);
  assert.strictEqual(d.noticeTypes.awards, false);
});

test('targeting: sanitizes garbage input safely', () => {
  const dirty = {
    name: '   x'.repeat(200),
    naics: ['541512', 'banana', '99', '561210', '541512', 1234567],
    psc: ['D310', 'TOO-LONG', 'd3', 12],
    setAsides: ['SDVOSB', 'invalid', 'WOSB', 'open'],
    contractTypes: ['FFP', 'NOT_REAL', 'CPFF'],
    certifications: ['SDVOSB', 'iso_9001', 'unicorn'],
    agencies: { include: ['DoD', 'DoD', '   '], exclude: ['DOJ'] },
    noticeTypes: { active_solicitation: false, awards: true, pre_rfp_intel: 'yes' },
    posted: { withinDays: 999 },
    deadline: { minDays: -10, maxDays: 'huge' }
  };
  const clean = sanitizeProfile(dirty);
  assert.ok(clean.name.length <= 80);
  // 541512, 561210 keep; 99 is too short (regex requires 2-6 digits — 99 is 2 digits, valid). Actually regex is /^\d{2,6}$/, so '99' passes. Adjust assertion.
  // 'banana' rejected; 1234567 too long; '99' kept.
  assert.deepStrictEqual(clean.naics.sort(), ['541512', '561210', '99'].sort());
  // PSC regex is /^[A-Z0-9]{1,4}$/i so 'D310', 'd3', and '12' all pass; 'TOO-LONG' fails.
  assert.deepStrictEqual(clean.psc.sort(), ['12', 'D310', 'd3'].sort());
  assert.deepStrictEqual(clean.setAsides.sort(), ['open', 'sdvosb', 'wosb']);
  assert.ok(clean.contractTypes.includes('FFP'));
  assert.ok(clean.contractTypes.includes('CPFF'));
  assert.ok(!clean.contractTypes.includes('NOT_REAL'));
  assert.deepStrictEqual(clean.certifications.sort(), ['iso_9001', 'sdvosb']);
  assert.deepStrictEqual(clean.agencies.include, ['DoD']);
  assert.deepStrictEqual(clean.agencies.exclude, ['DOJ']);
  // noticeTypes booleans only; non-boolean ('yes') is ignored, default kept.
  assert.strictEqual(clean.noticeTypes.active_solicitation, false);
  assert.strictEqual(clean.noticeTypes.awards, true);
  assert.strictEqual(clean.noticeTypes.pre_rfp_intel, true); // default kept
  assert.strictEqual(clean.posted.withinDays, 365);
  assert.strictEqual(clean.deadline.minDays, 0);
  assert.strictEqual(clean.deadline.maxDays, 365); // default kept (string ignored)
});

test('targeting: store-bound load/save/reset round-trips', () => {
  const store = makeStore();
  const svc = createTargetingProfileService(store);
  // First load is the default
  const initial = svc.load();
  assert.strictEqual(initial.naics.length, 0);
  // Save a patch
  svc.save({ naics: ['541512'], setAsides: ['SDVOSB'] });
  const after = svc.load();
  assert.deepStrictEqual(after.naics, ['541512']);
  assert.deepStrictEqual(after.setAsides, ['sdvosb']);
  // Reset clears
  svc.reset();
  const r = svc.load();
  assert.deepStrictEqual(r.naics, []);
  assert.deepStrictEqual(r.setAsides, []);
});

console.log('\n── sam-search ──');

const SAMPLE_RAW = [
  {
    noticeId: 'NOTICE-A',
    title: 'IT Helpdesk Tier 1/2',
    type: 'Solicitation',
    fullParentPathName: 'DEFENSE LOGISTICS AGENCY.J6',
    naicsCode: '541512',
    classificationCode: 'D310',
    typeOfSetAside: 'SDVOSB',
    postedDate: '2026-05-01',
    responseDeadLine: '2026-06-15',
    uiLink: 'https://sam.gov/opp/NOTICE-A'
  },
  {
    // Duplicate of above by noticeId — must be deduped.
    noticeId: 'NOTICE-A',
    title: 'IT Helpdesk Tier 1/2 (dupe)',
    type: 'Solicitation',
    fullParentPathName: 'DEFENSE LOGISTICS AGENCY.J6',
    naicsCode: '541512'
  },
  {
    noticeId: 'NOTICE-B',
    title: 'Custodial services',
    type: 'Sources Sought',
    fullParentPathName: 'DEPARTMENT OF VETERANS AFFAIRS.VHA',
    naicsCode: '561720',
    typeOfSetAside: 'SDVOSB',
    postedDate: '2026-04-25',
    responseDeadLine: null
  },
  {
    noticeId: 'NOTICE-C',
    title: 'Award notice',
    type: 'Award Notice',
    fullParentPathName: 'GENERAL SERVICES ADMINISTRATION.PBS',
    naicsCode: '541330'
  }
];

test('sam-search: normalizeSamRecord sets noticeGroup correctly', () => {
  const r = normalizeSamRecord(SAMPLE_RAW[0], Date.parse('2026-05-10T00:00:00Z'));
  assert.strictEqual(r.noticeId, 'NOTICE-A');
  assert.strictEqual(r.title, 'IT Helpdesk Tier 1/2');
  assert.strictEqual(r.noticeGroup, 'active_solicitation');
  assert.strictEqual(r.agency, 'DEFENSE LOGISTICS AGENCY');
  assert.strictEqual(r.naics, '541512');
  assert.strictEqual(r.psc, 'D310');
  assert.strictEqual(r.setAside, 'SDVOSB');
  assert.strictEqual(r.responseDeadline, '2026-06-15');
  assert.strictEqual(r.daysUntilDue, 36);
});

test('sam-search: Sources Sought routed to pre_rfp_intel', () => {
  const r = normalizeSamRecord(SAMPLE_RAW[2]);
  assert.strictEqual(r.noticeGroup, 'pre_rfp_intel');
});

test('sam-search: dedupe removes by noticeId', () => {
  const norm = SAMPLE_RAW.map(r => normalizeSamRecord(r));
  const unique = dedupe(norm);
  assert.strictEqual(unique.length, 3);
  assert.strictEqual(unique.filter(x => x.noticeId === 'NOTICE-A').length, 1);
});

test('sam-search: applyTargeting filters by NAICS + notice type + set-aside', () => {
  const norm = dedupe(SAMPLE_RAW.map(r => normalizeSamRecord(r)));
  const filtered = applyTargeting(norm, {
    naics: ['541512', '561720'],
    setAsides: ['sdvosb'],
    noticeTypes: { active_solicitation: true, pre_rfp_intel: true, awards: false }
  });
  assert.strictEqual(filtered.length, 2);
  assert.ok(filtered.every(r => ['NOTICE-A', 'NOTICE-B'].includes(r.noticeId)));
});

test('sam-search: applyTargeting respects exclude-agency list', () => {
  const norm = dedupe(SAMPLE_RAW.map(r => normalizeSamRecord(r)));
  const filtered = applyTargeting(norm, {
    naics: ['541512'],
    agencies: { include: [], exclude: ['Defense Logistics Agency'] },
    noticeTypes: { active_solicitation: true, pre_rfp_intel: true, awards: false }
  });
  // NOTICE-A (DLA) should be excluded
  assert.strictEqual(filtered.filter(r => r.noticeId === 'NOTICE-A').length, 0);
});

test('sam-search: buildSamHumanUrl returns a valid sam.gov fallback URL', () => {
  const url = buildSamHumanUrl({ naics: ['541512', '561210'], noticeTypes: { active_solicitation: true, pre_rfp_intel: true } });
  assert.ok(url.startsWith('https://sam.gov/search/?'));
  assert.ok(url.includes('keywordRadio%5D=ANY'));
  assert.ok(url.includes('541512'));
  assert.ok(url.includes('561210'));
  assert.ok(url.includes('is_Sources_Sought%5D=true'));
});

asyncTest('sam-search: no API key -> graceful fallback with sam.gov URL', async () => {
  const svc = createSamSearchService({
    fetch: async () => { throw new Error('should not be called when no key'); },
    getApiKey: async () => null
  });
  const r = await svc.search({ naics: ['541512'] });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.usedApi, false);
  assert.strictEqual(r.reason, 'no_api_key');
  assert.ok(r.fallbackUrl && r.fallbackUrl.startsWith('https://sam.gov/'));
});

asyncTest('sam-search: with API key + injected fetch returns normalized + deduped + targeted', async () => {
  let fetchedUrl = null;
  const svc = createSamSearchService({
    fetch: async (url) => {
      fetchedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({ totalRecords: 4, opportunitiesData: SAMPLE_RAW })
      };
    },
    getApiKey: async () => 'TEST-KEY-DO-NOT-LOG',
    now: () => Date.parse('2026-05-10T00:00:00Z')
  });
  const r = await svc.search({
    naics: ['541512', '561720'],
    setAsides: ['sdvosb'],
    noticeTypes: { active_solicitation: true, pre_rfp_intel: true, awards: false }
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.usedApi, true);
  assert.strictEqual(r.returned, 2);
  assert.strictEqual(r.results.length, 2);
  assert.ok(fetchedUrl.includes('api_key=TEST-KEY'));
});

asyncTest('sam-search: HTTP error returns reason without throwing', async () => {
  const svc = createSamSearchService({
    fetch: async () => ({ ok: false, status: 503, text: async () => 'Service unavailable' }),
    getApiKey: async () => 'KEY'
  });
  const r = await svc.search({});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'http_503');
});

console.log('\n── compliance-matrix ──');

const SAMPLE_SOLICITATION = `
SECTION L — INSTRUCTIONS TO OFFERORS

L.3.1 Technical Approach
The offeror shall describe its staffing model including shift coverage,
escalation path, and on-call coverage.

L.3.2 Past Performance
The offeror shall submit three (3) past performance references within
the last five years showing relevant experience. Each reference must
include customer POC and contract value.

L.3.4 Section 889 Representation
The offeror must provide a current Section 889 representation regarding
covered telecommunications equipment.

L.3.5 Price
Submit a Firm-Fixed-Price rate per FTE per month with a cost narrative.
Page limit: 10 pages.

L.3.6 SDVOSB Self-Performance
The offeror must comply with FAR 52.219-14 (limitations on subcontracting,
50% of cost of personnel).

SECTION M — EVALUATION FACTORS

M.1 Technical (40%)
M.2 Past Performance (25%)
M.3 Price (25%)
M.4 Compliance (10%)
`;

test('compliance-matrix: extracts Section L items and pairs with M evaluation factors', () => {
  const out = generateComplianceMatrix(SAMPLE_SOLICITATION);
  assert.strictEqual(out.ok, true);
  assert.ok(out.rows.length >= 5, 'expected at least 5 rows, got ' + out.rows.length);
  const ids = out.rows.map(r => r.sourceSection);
  assert.ok(ids.includes('L.3.1'));
  assert.ok(ids.includes('L.3.2'));
  assert.ok(ids.includes('L.3.4'));
  assert.ok(ids.includes('L.3.5'));
  assert.ok(ids.includes('L.3.6'));
  // Owner heuristics
  const tech = out.rows.find(r => r.sourceSection === 'L.3.1');
  assert.strictEqual(tech.owner, 'Capture lead');
  const past = out.rows.find(r => r.sourceSection === 'L.3.2');
  assert.strictEqual(past.owner, 'Proposal lead');
  const price = out.rows.find(r => r.sourceSection === 'L.3.5');
  assert.strictEqual(price.owner, 'Finance');
  // Risk classification
  const r889 = out.rows.find(r => r.sourceSection === 'L.3.4');
  assert.strictEqual(r889.riskTag, 'section_889');
});

test('compliance-matrix: includes AI policy reminder', () => {
  const out = generateComplianceMatrix(SAMPLE_SOLICITATION);
  assert.match(out.aiPolicy, /human review/i);
});

test('compliance-matrix: empty input returns ok:false, no throw', () => {
  const r = generateComplianceMatrix('');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'no_text');
});

console.log('\n── pre-rfp ──');

test('pre-rfp: identifies Sources Sought as pre-RFP', () => {
  assert.ok(isPreRfp({ noticeType: 'Sources Sought' }));
  assert.ok(isPreRfp({ noticeGroup: 'pre_rfp_intel' }));
  assert.ok(!isPreRfp({ noticeType: 'Solicitation' }));
});

test('pre-rfp: aligned NAICS + matching set-aside -> recommend respond', () => {
  const opp = {
    noticeType: 'Sources Sought', noticeGroup: 'pre_rfp_intel',
    naics: '541512', setAside: 'SDVOSB', agency: 'DLA'
  };
  const r = evaluatePreRfp(opp, { naics: ['541512'], setAsides: ['sdvosb'], agencies: { include: ['DLA'] } });
  assert.strictEqual(r.ok, true);
  assert.ok(['respond', 'respond_with_caveats'].includes(r.recommendation));
  assert.match(r.stakeholderSafetyNote, /restricted communication window/i);
  assert.ok(r.watchlistDate && /^\d{4}-\d{2}-\d{2}$/.test(r.watchlistDate));
});

test('pre-rfp: excluded agency -> no_response', () => {
  const opp = { noticeType: 'RFI', noticeGroup: 'pre_rfp_intel', naics: '541512', agency: 'DEPT OF JUSTICE' };
  const r = evaluatePreRfp(opp, { naics: ['541512'], agencies: { include: [], exclude: ['Justice'] } });
  assert.strictEqual(r.recommendation, 'no_response');
});

test('pre-rfp: never drafts outreach to a CO/COR', () => {
  const opp = { noticeType: 'Sources Sought', noticeGroup: 'pre_rfp_intel', naics: '541512' };
  const r = evaluatePreRfp(opp, { naics: ['541512'] });
  const all = JSON.stringify(r).toLowerCase();
  assert.ok(!/cold[\s-]?(email|call|outreach)/.test(all), 'contains cold-outreach phrasing');
  assert.ok(!/email\s+the\s+(co|cor|contracting)/.test(all), 'drafts CO outreach');
});

console.log('\n── past-performance ──');

test('past-performance: sanitize keeps valid project, drops invalid one', () => {
  const ok = sanitizeProject({
    customer: 'USAF MAJCOM Wright-Patt',
    agency: 'Department of the Air Force',
    naics: '541512', psc: 'D310', contractType: 'FFP',
    valueRange: { minUsd: 3500000, maxUsd: 4500000 },
    periodOfPerformance: { start: '2023-09-01', end: '2026-08-31' },
    scopeTags: ['helpdesk', 'Tier 1', 'ServiceNow'],
    proofPoints: ['CPARS Very Good', '99.7% SLA met'],
    cparsRating: 'very_good',
    contactPocPermission: true
  });
  assert.ok(ok && ok.id && ok.id.startsWith('pp_'));
  assert.strictEqual(ok.naics, '541512');
  assert.strictEqual(ok.cparsRating, 'very_good');

  const bad = sanitizeProject({});
  assert.strictEqual(bad, null);
});

test('past-performance: relevance scores higher for exact NAICS + same agency + scope-tag overlap', () => {
  const project = sanitizeProject({
    customer: 'USAF MAJCOM',
    agency: 'Department of the Air Force',
    naics: '541512', psc: 'D310',
    scopeTags: ['helpdesk'],
    cparsRating: 'very_good',
    contactPocPermission: true,
    periodOfPerformance: { end: new Date().toISOString().slice(0, 10) }
  });
  const opp = {
    naics: '541512', psc: 'D310',
    agency: 'Department of the Air Force',
    title: 'Tier 1 helpdesk support',
    description: 'Tier 1/2 helpdesk staff augmentation'
  };
  const out = relevanceScore(project, opp);
  assert.ok(out.score >= 70, 'expected score >= 70, got ' + out.score);
  assert.ok(out.reasons.some(r => /NAICS/.test(r)));
  assert.ok(out.reasons.some(r => /agency/i.test(r)));
});

test('past-performance: store-bound list/save/match', () => {
  const store = makeStore();
  const svc = createPastPerformanceService(store);
  assert.deepStrictEqual(svc.list(), []);
  const saved = svc.save({
    customer: 'NAVAIR Pax River', agency: 'Department of the Navy',
    naics: '541512', scopeTags: ['helpdesk']
  });
  assert.ok(saved && saved.id);
  const matches = svc.match({ naics: '541512', agency: 'Department of the Navy', title: 'helpdesk', description: 'helpdesk staff' });
  assert.strictEqual(matches.length, 1);
  assert.ok(matches[0].score > 0);
});

console.log('\n── stakeholder-graph ──');

test('stakeholder-graph: contracting office is restricted in active solicitation window', () => {
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const opp = { noticeId: 'X', noticeGroup: 'active_solicitation', noticeType: 'Solicitation', responseDeadline: future, agency: 'DLA' };
  const g = buildStakeholderGraph(opp, {});
  const co = g.nodes.find(n => n.category === 'contracting_office');
  assert.ok(co, 'CO node exists');
  assert.strictEqual(co.posture, 'restricted');
  assert.match(co.postureLabel, /restricted/i);
});

test('stakeholder-graph: pre-RFP opp is NOT in restricted window', () => {
  const opp = { noticeId: 'Y', noticeGroup: 'pre_rfp_intel', noticeType: 'Sources Sought', agency: 'VA' };
  assert.strictEqual(isInRestrictedWindow(opp), false);
  const g = buildStakeholderGraph(opp, {});
  // Industry-day node should appear for pre-RFP
  assert.ok(g.nodes.some(n => n.category === 'industry_day'));
});

test('stakeholder-graph: never produces cold-outreach phrasing', () => {
  const opp = { noticeId: 'Z', noticeGroup: 'active_solicitation', noticeType: 'Solicitation', responseDeadline: '2099-01-01', agency: 'DoD' };
  const g = buildStakeholderGraph(opp, { partners: [{ label: 'Sub partner X' }] });
  const text = JSON.stringify(g).toLowerCase();
  assert.ok(!/cold[\s-]?(email|call|outreach)/.test(text), 'contains cold-outreach phrasing');
  assert.ok(!/dm\s+the\s+(co|cor|contracting)/.test(text), 'contains DM-the-CO phrasing');
  // Safety note must include FAR + restricted-window language
  assert.match(g.safetyNote, /restricted communication window/i);
  assert.match(g.safetyNote, /FAR/);
  assert.match(SAFETY_NOTE, /procurement integrity/i);
});

console.log('\n── credential-leakage in renderer-facing surface ──');

test('preload exposes no raw API call surface, only IPC invocations', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  // Must not expose fetch, https, net, or anything that would let renderer
  // bypass main-process credential boundaries.
  assert.ok(!/(^|\W)fetch\s*\(/.test(preload), 'preload must not call fetch');
  assert.ok(!/(^|\W)require\(['"]https?['"]\)/.test(preload), 'preload must not require http(s)');
  assert.ok(!/(^|\W)require\(['"]net['"]\)/.test(preload), 'preload must not require net');
  // Strip JS comments before scanning so accurate descriptive comments
  // (e.g. "renderer never builds Bearer headers") don't trip the check.
  const preloadCode = preload
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.ok(!/['"`]Bearer\s/.test(preloadCode), 'preload must not embed Bearer header literals');
  assert.ok(!/Authorization['"]\s*:/.test(preloadCode), 'preload must not set an Authorization header');
  // Must use ipcRenderer.invoke for everything it exposes.
  assert.ok(/ipcRenderer\.invoke/.test(preload), 'preload should use ipcRenderer.invoke');
});

test('main.js never logs a SAM API key value to audit metadata', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  // The SAM IPC handler must not push the api key into audit metadata.
  // Easy check: the handler block should not reference SAM_API_KEY in metadata.
  const samBlock = main.match(/govcon:sam-search[\s\S]*?\}\)\;/);
  assert.ok(samBlock, 'sam-search ipc block exists');
  assert.ok(!/SAM_API_KEY/i.test(samBlock[0]), 'sam-search ipc must not reference SAM_API_KEY in metadata');
  assert.ok(!/apiKey/i.test(samBlock[0].replace(/\/\/.*/g, '')), 'sam-search ipc must not handle apiKey directly');
});

// ── runner ──────────────────────────────────────────────────────────
(async () => {
  // Allow async tests above to settle; they pushed onto pass/fail directly.
  await new Promise(r => setTimeout(r, 50));
  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} govcon-core tests ===`
    : `=== FAIL — ${failed}/${total} govcon-core tests failed ===`);
  if (failed > 0) process.exit(1);
})();

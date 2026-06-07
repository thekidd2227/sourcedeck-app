'use strict';

// Tests for services/govcon/opportunity-outreach.js — the SAM.gov
// Opportunity -> Outreach Agent orchestrator. Pure node:assert, synthetic
// data, injected fetch/getApiKey/now. No network leaves the harness.

const assert = require('assert');

const { createSamSearchService } = require('../services/govcon/sam-search');
const { createOpportunityRecordService } = require('../services/govcon/opportunity-records');
const {
  createOpportunityOutreachService,
  OUTREACH_STATUS,
  REVIEW_NOTICE,
  closingWindowDays,
  dailyCap,
  scrubClaims,
  stripUnbackedCertifications,
  withinClosingWindow,
  selectPoc,
  mapConfigToFilters,
  mockOpportunities
} = require('../services/govcon/opportunity-outreach');

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { passed++; console.log('  ✅ ' + name); },
    (e) => { failed++; console.log('  ❌ ' + name + ' — ' + e.message); }
  );
}

// Phase 24A — bumped from '2026-06-01T00:00:00Z' so the test's injected
// clock stays comfortably ahead of the real system clock for years to come.
// `services/govcon/email-compliance.js#activeSolicitation()` uses
// `Date.now()` (system clock) to check whether a solicitation's response
// window is still open; when NOW slipped behind the wall clock, MOCK-A's
// `NOW + 5 days` deadline became "in the past" and the active-solicitation
// gate stopped firing in tests (the gate still works in production where
// real deadlines are anchored to real now). No product code is modified.
const NOW = Date.parse('2099-01-01T00:00:00.000Z');
const nowFn = () => NOW;
function freshStore() { const d = {}; return { get: (k) => d[k], set: (k, v) => { d[k] = v; }, _d: d }; }

function makeAgent({ apiKey = null, fetchFn = null, store = freshStore(), scorer = null } = {}) {
  const samSearch = createSamSearchService({ fetch: fetchFn, getApiKey: async () => apiKey, now: nowFn });
  const opportunities = createOpportunityRecordService(store, nowFn);
  const deps = { samSearch, opportunities, store, now: nowFn };
  if (scorer) deps.scorer = scorer;
  const agent = createOpportunityOutreachService(deps);
  return { agent, opportunities, store };
}

(async () => {
  console.log('=== GovCon SAM.gov Opportunity Outreach Agent ===');

  // ── pure helpers ──────────────────────────────────────────────────
  await test('closingWindowDays: only 7 or 30 (default 30)', () => {
    assert.strictEqual(closingWindowDays({ closingWindowDays: 7 }), 7);
    assert.strictEqual(closingWindowDays({ closingWindowDays: 30 }), 30);
    assert.strictEqual(closingWindowDays({ closingWindowDays: 99 }), 30);
    assert.strictEqual(closingWindowDays({}), 30);
  });

  await test('dailyCap: default 25, clamped 1..200', () => {
    assert.strictEqual(dailyCap({}), 25);
    assert.strictEqual(dailyCap({ dailyDraftLimit: 0 }), 1);
    assert.strictEqual(dailyCap({ dailyDraftLimit: 500 }), 200);
    assert.strictEqual(dailyCap({ dailyDraftLimit: 10 }), 10);
  });

  await test('scrubClaims removes guarantee / risk-free / endorsement language', () => {
    const out = scrubClaims('We guarantee an award and risk-free results, endorsed by the agency.');
    assert.ok(!/guarantee/i.test(out), 'guarantee removed');
    assert.ok(!/risk-free/i.test(out), 'risk-free removed');
    assert.ok(!/endorse/i.test(out), 'endorsement removed');
  });

  await test('stripUnbackedCertifications keeps backed certs, removes unbacked', () => {
    const out = stripUnbackedCertifications('We are an SDVOSB and HUBZone and 8(a) firm.', { certifications: ['sdvosb'] });
    assert.ok(/SDVOSB/.test(out), 'backed SDVOSB kept');
    assert.ok(!/HUBZone/.test(out), 'unbacked HUBZone removed');
    assert.ok(!/8\(a\)/.test(out), 'unbacked 8(a) removed');
  });

  await test('withinClosingWindow excludes past + beyond window, keeps in-window', () => {
    assert.strictEqual(withinClosingWindow({ daysUntilDue: -1 }, 7, NOW), false);
    assert.strictEqual(withinClosingWindow({ daysUntilDue: 5 }, 7, NOW), true);
    assert.strictEqual(withinClosingWindow({ daysUntilDue: 20 }, 7, NOW), false);
    assert.strictEqual(withinClosingWindow({ daysUntilDue: 20 }, 30, NOW), true);
    assert.strictEqual(withinClosingWindow({ responseDeadline: null }, 30, NOW), false);
  });

  await test('selectPoc prefers a contact with email, never crashes on empty', () => {
    assert.strictEqual(selectPoc({ pointOfContact: [] }), null);
    assert.strictEqual(selectPoc({}), null);
    const p = selectPoc({ pointOfContact: [{ name: 'A' }, { name: 'B', email: 'b@x.gov' }] });
    assert.strictEqual(p.email, 'b@x.gov');
  });

  await test('mapConfigToFilters: 7 vs 30 window changes responseTo; maps naics/keywords/setAside', () => {
    const f7 = mapConfigToFilters({ closingWindowDays: 7, naics: ['561710'], keywords: ['pest', 'control'], setAside: 'SDVOSB' }, NOW);
    const f30 = mapConfigToFilters({ closingWindowDays: 30 }, NOW);
    assert.deepStrictEqual(f7.naics, ['561710']);
    assert.strictEqual(f7.keyword, 'pest control');
    assert.strictEqual(f7.setAsideCode, 'SDVOSB');
    assert.ok(Date.parse(f30.responseTo) > Date.parse(f7.responseTo), '30d window reaches further out');
  });

  // ── demo/mock scan (no API key) ───────────────────────────────────
  await test('no-key scan runs in demo mode with mock opportunities', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.demoMode, true);
    assert.strictEqual(r.metrics.opportunitiesFound, 5, '5 mock opportunities');
    assert.strictEqual(r.reviewNotice, REVIEW_NOTICE);
  });

  await test('past-deadline + beyond-window opportunities are excluded (30d)', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    // A(5d), B(20d), C(3d) in window; D(past) + E(60d) excluded.
    assert.strictEqual(r.metrics.inWindow, 3, 'three in 30-day window');
    const ids = r.records.map(x => x.noticeId).sort();
    assert.ok(!ids.includes('MOCK-D'), 'past-deadline excluded');
    assert.ok(!ids.includes('MOCK-E'), 'beyond-window excluded');
  });

  await test('7-day window is stricter than 30-day', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 7 });
    // A(5d) + C(3d) in window; B(20d) excluded at 7 days.
    assert.strictEqual(r.metrics.inWindow, 2, 'two in 7-day window');
  });

  await test('scan scores every in-window opportunity with a label', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    for (const rec of r.records) {
      assert.strictEqual(typeof rec.outreachScore, 'number');
      assert.ok(typeof rec.outreachLabel === 'string' && rec.outreachLabel.length > 0);
    }
  });

  // ── draft-only / approval / no-autosend invariants ────────────────
  await test('drafts are draft-only: sendingEnabled false, requiresApproval true', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    const drafted = r.records.filter(x => x.outreachDraft);
    assert.ok(drafted.length > 0, 'at least one draft produced');
    for (const rec of drafted) {
      assert.strictEqual(rec.outreachDraft.sendingEnabled, false, 'no autosend');
      assert.strictEqual(rec.outreachDraft.requiresApproval, true, 'approval required');
      assert.strictEqual(rec.outreachDraft.reviewNotice, REVIEW_NOTICE);
    }
  });

  await test('no send transport exists on the agent surface', () => {
    const { agent } = makeAgent({ apiKey: null });
    assert.strictEqual(typeof agent.send, 'undefined');
    assert.strictEqual(typeof agent.sendEmail, 'undefined');
    assert.strictEqual(typeof agent.dispatch, 'undefined');
  });

  await test('active-solicitation opportunity yields Q&A-only draft + Needs Review', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    const a = r.records.find(x => x.noticeId === 'MOCK-A'); // active Solicitation
    assert.ok(a, 'MOCK-A present');
    assert.strictEqual(a.outreachStatus, OUTREACH_STATUS.NEEDS_REVIEW, 'active solicitation needs review');
    assert.strictEqual(a.outreachDraft.blocked, true, 'direct outreach blocked');
    assert.ok(a.outreachDraft.officialQAndADraft, 'Q&A draft offered instead');
    assert.strictEqual(a.outreachDraft.draft, null, 'no direct outreach draft');
  });

  await test('pre-RFP opportunity yields an allowed outreach draft', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30 });
    const b = r.records.find(x => x.noticeId === 'MOCK-B'); // Sources Sought
    assert.strictEqual(b.outreachStatus, OUTREACH_STATUS.DRAFTED);
    assert.ok(b.outreachDraft.draft, 'draft text present');
    assert.strictEqual(b.outreachDraft.blocked, false);
  });

  await test('opportunity with no POC email does not crash', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 7 });
    const c = r.records.find(x => x.noticeId === 'MOCK-C'); // no POC email
    assert.ok(c, 'MOCK-C present in 7-day window');
    assert.strictEqual(c.outreachDraft.pocEmail, null, 'no POC email, handled gracefully');
  });

  await test('generated drafts carry no overclaim/cert language by default', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30, profile: { name: 'Acme', certifications: [] } });
    for (const rec of r.records) {
      const text = (rec.outreachDraft && (rec.outreachDraft.draft || rec.outreachDraft.officialQAndADraft)) || '';
      assert.ok(!/guarantee/i.test(text), 'no guarantee language');
      assert.ok(!/SDVOSB|HUBZone|8\(a\)/.test(text), 'no unbacked cert claims');
    }
  });

  // ── daily draft cap ───────────────────────────────────────────────
  await test('daily draft cap limits drafts created in a scan', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30, dailyDraftLimit: 1 });
    assert.strictEqual(r.metrics.draftsCreated, 1, 'only one draft created');
    assert.strictEqual(r.capReached, true, 'cap reached flagged');
    const scoredOnly = r.records.filter(x => x.outreachStatus === OUTREACH_STATUS.SCORED);
    assert.ok(scoredOnly.length >= 1, 'remaining stay Scored');
  });

  await test('generateDraft refuses once daily cap is exhausted', async () => {
    const { agent } = makeAgent({ apiKey: null });
    await agent.scan({ closingWindowDays: 30, dailyDraftLimit: 1 });
    const res = await agent.generateDraft({ id: 'notice_MOCK-B', dailyDraftLimit: 1 });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.reason, 'daily_draft_cap_reached');
  });

  // ── review-queue status / approval ────────────────────────────────
  await test('setStatus Approved records explicit approval, never enables sending', async () => {
    const { agent } = makeAgent({ apiKey: null });
    await agent.scan({ closingWindowDays: 30 });
    const res = agent.setStatus({ id: 'notice_MOCK-B', status: OUTREACH_STATUS.APPROVED });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.record.outreachStatus, 'Approved');
    const appr = (res.record.communicationsLog || []).find(l => l.status === 'approved_by_user');
    assert.ok(appr && appr.approvedByUser === true, 'approval logged');
    assert.strictEqual(appr.sendingEnabled, false, 'approval does not enable sending');
  });

  await test('setStatus rejects an invalid status', async () => {
    const { agent } = makeAgent({ apiKey: null });
    await agent.scan({ closingWindowDays: 30 });
    const res = agent.setStatus({ id: 'notice_MOCK-B', status: 'Sent' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.reason, 'invalid_status');
  });

  await test('Bid Target status favorites the record', async () => {
    const { agent } = makeAgent({ apiKey: null });
    await agent.scan({ closingWindowDays: 30 });
    const res = agent.setStatus({ id: 'notice_MOCK-B', status: OUTREACH_STATUS.BID_TARGET });
    assert.strictEqual(res.record.favorite, true);
  });

  // ── live-API path (injected fetch; key stays in main process) ─────
  await test('API scan normalizes + dedupes SAM results (no demo mode)', async () => {
    const day = 86400000;
    const iso = (ms) => new Date(ms).toISOString();
    const raw = (id, sol, days) => ({
      noticeId: id, solicitationNumber: sol, title: 'Janitorial Services ' + id,
      type: 'Sources Sought', fullParentPathName: 'GSA.PBS', naicsCode: '561720',
      typeOfSetAside: 'SDVOSB', responseDeadLine: iso(NOW + days * day),
      pointOfContact: [{ fullName: 'SBS', email: 'sbs@x.gov', type: 'primary' }],
      uiLink: 'https://sam.gov/opp/' + id
    });
    const fetchFn = async () => ({
      ok: true,
      json: async () => ({ totalRecords: 3, opportunitiesData: [raw('N1', 'S1', 10), raw('N1', 'S1', 10), raw('N2', 'S2', 12)] })
    });
    const { agent } = makeAgent({ apiKey: 'TEST-KEY', fetchFn });
    const r = await agent.scan({ closingWindowDays: 30 });
    assert.strictEqual(r.demoMode, false, 'used live API path, not demo');
    assert.strictEqual(r.metrics.inWindow, 2, 'duplicate N1 deduped -> 2 unique');
  });

  await test('credential boundary: orchestrator never receives a raw API key', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'services', 'govcon', 'opportunity-outreach.js'), 'utf8');
    assert.ok(!/getApiKey|credentials\.get|SAM_API_KEY|process\.env|['"]api_key['"]/.test(src),
      'orchestrator does not read keys; key handling stays in sam-search/main process');
  });

  // ── Phase 2 hardening cases ───────────────────────────────────────
  await test('invalid API key surfaces an error (not a silent empty scan)', async () => {
    const fetchFn = async () => ({ ok: false, status: 403, text: async () => 'Forbidden' });
    const { agent } = makeAgent({ apiKey: 'BAD-KEY', fetchFn });
    const r = await agent.scan({ closingWindowDays: 30 });
    assert.strictEqual(r.ok, false, 'scan reports failure');
    assert.strictEqual(r.reason, 'http_403');
    assert.strictEqual(r.demoMode, false, 'a bad key is not demo mode');
    assert.deepStrictEqual(r.records, []);
  });

  await test('empty SAM result returns ok with zero metrics (no crash)', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => ({ totalRecords: 0, opportunitiesData: [] }) });
    const { agent } = makeAgent({ apiKey: 'GOOD-KEY', fetchFn });
    const r = await agent.scan({ closingWindowDays: 30 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.demoMode, false);
    assert.strictEqual(r.metrics.opportunitiesFound, 0);
    assert.strictEqual(r.metrics.draftsCreated, 0);
  });

  await test('missing NAICS config does not crash the scan', async () => {
    const { agent } = makeAgent({ apiKey: null });
    const r = await agent.scan({ closingWindowDays: 30, naics: [] });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.metrics.inWindow, 3);
  });

  await test('high vs low fit scores: ordering + qualified-match count', async () => {
    const scorer = (opp) => opp.noticeId === 'MOCK-B'
      ? { score: 92, decision: 'STRONG_FIT' }
      : { score: 30, decision: 'RISKY_FIT' };
    const { agent } = makeAgent({ apiKey: null, scorer });
    const r = await agent.scan({ closingWindowDays: 30 });
    assert.strictEqual(r.metrics.qualifiedMatches, 1, 'one opportunity scores >= 60');
    const top = r.records.slice().sort((a, b) => b.outreachScore - a.outreachScore)[0];
    assert.strictEqual(top.noticeId, 'MOCK-B');
    assert.strictEqual(top.outreachLabel, 'STRONG_FIT');
  });

  console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} opportunity-outreach tests ===`);
  if (failed > 0) process.exit(1);
})();

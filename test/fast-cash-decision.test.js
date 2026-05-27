#!/usr/bin/env node
'use strict';

const fc = require('../services/govcon/fast-cash');
const ow = require('../services/govcon/outreach-window');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { console.log('  ✅ ' + msg); passed++; }
  else      { console.log('  ❌ ' + msg); failed++; }
}

console.log('=== Fast-Cash Decision Engine — unit tests ===\n');

// ── VERDICTS ──
assert(fc.VERDICTS.KILL === 'KILL', 'KILL verdict exists');
assert(fc.VERDICTS.QUOTE_NOW === 'QUOTE_NOW', 'QUOTE_NOW verdict exists');
assert(fc.VERDICTS.SOURCE_SUB_FIRST === 'SOURCE_SUB_FIRST', 'SOURCE_SUB_FIRST verdict exists');
assert(fc.VERDICTS.SAFE_OUTREACH_FIRST === 'SAFE_OUTREACH_FIRST', 'SAFE_OUTREACH_FIRST verdict exists');
assert(fc.VERDICTS.WATCH === 'WATCH', 'WATCH verdict exists');
assert(fc.VERDICTS.MORE_RESEARCH_NEEDED === 'MORE_RESEARCH_NEEDED', 'MORE_RESEARCH_NEEDED verdict exists');

// ── ACQUISITION LANES ──
assert(fc.classifyAcquisitionLane(5000) === 'micro_purchase', 'micro_purchase lane for $5K');
assert(fc.classifyAcquisitionLane(50000) === 'simplified_acquisition', 'simplified_acquisition for $50K');
assert(fc.classifyAcquisitionLane(500000) === 'full_competition', 'full_competition for $500K');
assert(fc.classifyAcquisitionLane(0) === 'unknown', 'unknown lane for zero ceiling');
assert(fc.classifyAcquisitionLane(-100) === 'unknown', 'unknown lane for negative');

// ── MARGIN STRESS ──
assert(!fc.checkMarginStress({ ceiling: 100000 }).ok, 'margin stress fails when sub cost unknown');
assert(fc.checkMarginStress({ ceiling: 100000, estimatedSubCost: 80000 }).ok, 'margin OK at 20%');
assert(!fc.checkMarginStress({ ceiling: 100000, estimatedSubCost: 90000 }).ok, 'margin fails at 10%');
assert(fc.checkMarginStress({ ceiling: 100000, estimatedSubCost: 80000 }).marginPct === 20, 'margin pct = 20');

// ── SUB READINESS ──
assert(fc.scoreSubReadiness({}) === 0, 'empty sub = 0');
assert(fc.scoreSubReadiness({ identified: true, w9: true, coi: true, quoteReceived: true }) === 70, 'sub with id+w9+coi+quote = 70');

// ── QUOTE READINESS ──
assert(fc.scoreQuoteReadiness({}) === 0, 'empty opp quote readiness = 0');
assert(fc.scoreQuoteReadiness({ scopeClear: true, ceilingKnown: true, deadlineKnown: true, naicsFit: true, setAsideFit: true, subReady: true, pastPerfMatch: true, marginOk: true }) === 100, 'full readiness = 100');

// ── EVALUATE: KILL stays KILL ──
const killed = fc.evaluate({ killed: true, ceiling: 50000 });
assert(killed.verdict === 'KILL', 'KILL verdict when previously killed');
assert(killed.rationale.includes('KILL stays KILL'), 'KILL rationale mentions permanence');

// ── EVALUATE: over ceiling ──
const overCeiling = fc.evaluate({ ceiling: 300000 });
assert(overCeiling.verdict === 'KILL', 'KILL when over $250K ceiling');

// ── EVALUATE: NAICS excluded ──
const naicsExcl = fc.evaluate({ ceiling: 50000, naicsExcluded: true });
assert(naicsExcl.verdict === 'KILL', 'KILL when NAICS excluded');

// ── EVALUATE: pre-solicitation ──
const preSol = fc.evaluate({ ceiling: 50000, preSolicitation: true });
assert(preSol.verdict === 'SAFE_OUTREACH_FIRST', 'SAFE_OUTREACH_FIRST for pre-solicitation');

// ── EVALUATE: missing data ──
const noData = fc.evaluate({});
assert(noData.verdict === 'MORE_RESEARCH_NEEDED', 'MORE_RESEARCH_NEEDED when no data');

// ── EVALUATE: needs sub ──
const needsSub = fc.evaluate({ ceiling: 80000, requiresSub: true, scopeClear: true, deadline: '2026-06-01', sub: {} });
assert(needsSub.verdict === 'SOURCE_SUB_FIRST', 'SOURCE_SUB_FIRST when sub not sourced');

// ── EVALUATE: margin stress blocks QUOTE_NOW ──
const noMargin = fc.evaluate({
  ceiling: 80000, estimatedSubCost: 72000,
  scopeClear: true, deadline: '2026-06-01', naicsFit: true, setAsideFit: true,
  pastPerfMatch: true, sub: { identified: true, w9: true, coi: true, quoteReceived: true }
});
assert(noMargin.verdict !== 'QUOTE_NOW', 'margin stress (10%) blocks QUOTE_NOW');

// ── EVALUATE: QUOTE_NOW happy path ──
const quoteReady = fc.evaluate({
  ceiling: 80000, estimatedSubCost: 55000,
  scopeClear: true, deadline: '2026-06-01', naicsFit: true, setAsideFit: true,
  pastPerfMatch: true, sub: { identified: true, w9: true, coi: true, quoteReceived: true }
});
assert(quoteReady.verdict === 'QUOTE_NOW', 'QUOTE_NOW when fully ready');
assert(quoteReady.humanReviewRequired === true, 'human review always required');
assert(quoteReady.lane === 'simplified_acquisition', 'lane is simplified_acquisition at $80K');

// ── EVALUATE: WATCH on partial readiness ──
const watchOpp = fc.evaluate({
  ceiling: 80000, estimatedSubCost: 55000,
  scopeClear: true, deadline: '2026-06-01', naicsFit: true
});
assert(watchOpp.verdict === 'WATCH' || watchOpp.verdict === 'QUOTE_NOW', 'WATCH or QUOTE_NOW on partial readiness');

// ── EVALUATE: result is frozen ──
const frozenRes = fc.evaluate({ ceiling: 50000 });
let threw = false;
try { frozenRes.verdict = 'HACKED'; } catch (_) { threw = true; }
assert(threw || frozenRes.verdict !== 'HACKED', 'evaluate result is frozen');

console.log('\n=== Outreach-Window Engine — unit tests ===\n');

// ── WINDOWS ──
assert(ow.WINDOWS.RED_RESTRICTED === 'RED_RESTRICTED', 'RED_RESTRICTED window exists');
assert(ow.WINDOWS.GREEN_GENERAL_CAPABILITY_INTRO === 'GREEN_GENERAL_CAPABILITY_INTRO', 'GREEN general exists');
assert(ow.WINDOWS.YELLOW_PUBLIC_QA_ONLY === 'YELLOW_PUBLIC_QA_ONLY', 'YELLOW Q&A exists');

// ── CLASSIFY: unknown ──
const unkn = ow.classify({});
assert(unkn.window === 'UNKNOWN_RESEARCH_FIRST', 'unknown for empty opp');
assert(!unkn.draftsAllowed, 'drafts blocked for unknown');

// ── CLASSIFY: post-award ──
const award = ow.classify({ awarded: true });
assert(award.window === 'GREEN_POST_AWARD', 'GREEN_POST_AWARD when awarded');
assert(award.draftsAllowed, 'drafts allowed post-award');

// ── CLASSIFY: active solicitation ──
const active = ow.classify({ activeSolicitation: true });
assert(active.window === 'RED_RESTRICTED', 'RED_RESTRICTED for active solicitation');
assert(!active.draftsAllowed, 'drafts blocked for active solicitation');
assert(active.qaOnly, 'Q&A only for active solicitation');

// ── CLASSIFY: active solicitation without restricted comm ──
const activeNoRestrict = ow.classify({ activeSolicitation: true, restrictedComm: false });
assert(activeNoRestrict.window === 'YELLOW_PUBLIC_QA_ONLY', 'YELLOW when active but not restricted');

// ── CLASSIFY: pre-solicitation ──
const preSolOw = ow.classify({ noticeType: 'sources_sought' });
assert(preSolOw.window === 'GREEN_PRE_SOLICITATION', 'GREEN_PRE_SOLICITATION for sources sought');
assert(preSolOw.draftsAllowed, 'drafts allowed for pre-solicitation');

// ── CLASSIFY: RFI ──
const rfi = ow.classify({ noticeType: 'rfi' });
assert(rfi.window === 'GREEN_PRE_SOLICITATION', 'GREEN for RFI');

// ── CLASSIFY: planning/forecast ──
const planning = ow.classify({ status: 'planning' });
assert(planning.window === 'GREEN_GENERAL_CAPABILITY_INTRO', 'GREEN general for planning');

// ── BLOCKED INTENT ──
assert(ow.isBlockedIntent('What is the source selection criteria?'), 'blocks source selection');
assert(ow.isBlockedIntent('What did the incumbent bid?'), 'blocks incumbent pricing');
assert(ow.isBlockedIntent('Can you share nonpublic evaluation preferences?'), 'blocks nonpublic eval');
assert(ow.isBlockedIntent('Give me some inside guidance'), 'blocks inside guidance');
assert(!ow.isBlockedIntent('What is the scope of work?'), 'does not block scope question');
assert(!ow.isBlockedIntent(''), 'does not block empty string');

// ── GUARD DRAFT: RED blocks all ──
const redGuard = ow.guardDraft({ activeSolicitation: true }, 'Hello');
assert(!redGuard.allowed, 'draft blocked under RED_RESTRICTED');

// ── GUARD DRAFT: blocked intent ──
const blockedIntent = ow.guardDraft({ status: 'planning' }, 'What is the source selection criteria?');
assert(!blockedIntent.allowed, 'blocked intent fails even in GREEN window');
assert(blockedIntent.reason.includes('prohibited'), 'blocked intent reason mentions prohibited');

// ── GUARD DRAFT: COR contact during active ──
const corDraft = ow.guardDraft({ activeSolicitation: true }, 'Email the COR about the contract');
assert(!corDraft.allowed, 'COR contact blocked during active solicitation');

// ── GUARD DRAFT: GREEN allows normal ──
const greenDraft = ow.guardDraft({ status: 'planning' }, 'Introduce our capabilities');
assert(greenDraft.allowed, 'draft allowed in GREEN window with clean intent');

// ── GUARD DRAFT: post-award allows ──
const postAwardDraft = ow.guardDraft({ awarded: true }, 'Request debrief');
assert(postAwardDraft.allowed, 'draft allowed post-award');

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' fast-cash + outreach-window tests ===');
if (failed > 0) process.exit(1);

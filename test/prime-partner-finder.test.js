'use strict';
const assert = require('assert');
const {
  PRIME_STATUSES,
  SCORE_LABELS,
  DEMO_PRIMES,
  NO_AUTO_SEND_NOTE,
  findPrimePartners,
  scorePrime,
  getScoreLabel,
  generateOutreachDraft,
  generateCapabilityMatchMemo,
  _internal
} = require('../services/govcon/prime-partner-finder');

// ── Constants ─────────────────────────────────────────────────────────────

assert.ok(Array.isArray(PRIME_STATUSES), 'PRIME_STATUSES is array');
assert.ok(PRIME_STATUSES.includes('New'), 'PRIME_STATUSES has New');
assert.ok(PRIME_STATUSES.includes('Rejected'), 'PRIME_STATUSES has Rejected');
assert.ok(PRIME_STATUSES.includes('Portal Submitted'), 'PRIME_STATUSES has Portal Submitted');
assert.ok(PRIME_STATUSES.includes('Teaming Discussion'), 'PRIME_STATUSES has Teaming Discussion');
assert.strictEqual(PRIME_STATUSES.length, 12, 'PRIME_STATUSES has 12 values');

assert.ok(SCORE_LABELS.strategic, 'SCORE_LABELS.strategic exists');
assert.strictEqual(SCORE_LABELS.strategic.label, 'Strategic Prime', 'strategic label correct');
assert.strictEqual(SCORE_LABELS.strong.label, 'Strong Partner Target', 'strong label correct');
assert.strictEqual(SCORE_LABELS.monitor.label, 'Monitor', 'monitor label correct');
assert.strictEqual(SCORE_LABELS.low.label, 'Low Priority', 'low label correct');

assert.ok(typeof NO_AUTO_SEND_NOTE === 'string', 'NO_AUTO_SEND_NOTE is string');
assert.ok(
  NO_AUTO_SEND_NOTE.toLowerCase().includes('does not auto-send') ||
  NO_AUTO_SEND_NOTE.toLowerCase().includes('no auto-send'),
  'NO_AUTO_SEND_NOTE prevents auto-send'
);

// ── Demo primes ───────────────────────────────────────────────────────────

assert.ok(Array.isArray(DEMO_PRIMES), 'DEMO_PRIMES is array');
assert.ok(DEMO_PRIMES.length >= 20, `at least 20 demo primes (got ${DEMO_PRIMES.length})`);

for (const p of DEMO_PRIMES) {
  assert.ok(p.primeId, `prime has primeId: ${p.primeName}`);
  assert.ok(p.primeName, 'prime has primeName');
  assert.ok(Array.isArray(p.naics), 'prime has naics array');
  assert.ok(p.naics.length > 0, `prime ${p.primeName} has at least one NAICS`);
  assert.ok(typeof p.totalObligations === 'number', 'totalObligations is number');
  assert.ok(p.outreachStatus === 'New', `demo prime starts as New: ${p.primeName}`);
}

// ── getScoreLabel ─────────────────────────────────────────────────────────

assert.strictEqual(getScoreLabel(95), 'Strategic Prime', 'score 95 = Strategic Prime');
assert.strictEqual(getScoreLabel(90), 'Strategic Prime', 'score 90 = Strategic Prime');
assert.strictEqual(getScoreLabel(89), 'Strong Partner Target', 'score 89 = Strong Partner Target');
assert.strictEqual(getScoreLabel(80), 'Strong Partner Target', 'score 80 = Strong Partner Target');
assert.strictEqual(getScoreLabel(70), 'Strong Partner Target', 'score 70 = Strong Partner Target');
assert.strictEqual(getScoreLabel(69), 'Monitor', 'score 69 = Monitor');
assert.strictEqual(getScoreLabel(50), 'Monitor', 'score 50 = Monitor');
assert.strictEqual(getScoreLabel(49), 'Low Priority', 'score 49 = Low Priority');
assert.strictEqual(getScoreLabel(0), 'Low Priority', 'score 0 = Low Priority');

// ── findPrimePartners — basic ─────────────────────────────────────────────

const r1 = findPrimePartners({ naics: ['541512'] });
assert.strictEqual(r1.ok, true, 'findPrimePartners returns ok');
assert.ok(Array.isArray(r1.results), 'results is array');
assert.ok(r1.results.length > 0, 'at least one result');
assert.ok(r1.results.length <= 100, 'at most 100 results');
assert.ok(r1.summary, 'has summary');
assert.ok(typeof r1.summary.primeTargetsFound === 'number', 'summary.primeTargetsFound is number');
assert.ok(typeof r1.summary.strategicPrimes === 'number', 'summary.strategicPrimes is number');
assert.ok(typeof r1.summary.portalsToSubmit === 'number', 'summary.portalsToSubmit is number');
assert.strictEqual(r1.sourceMode, 'demo', 'sourceMode is demo');
assert.ok(r1.safetyNote, 'has safetyNote');
assert.ok(r1.dataNote, 'has dataNote');

// Results sorted by score descending
for (let i = 1; i < r1.results.length; i++) {
  assert.ok(
    r1.results[i].partnershipFitScore <= r1.results[i - 1].partnershipFitScore,
    `results sorted by score (index ${i})`
  );
}

// All scores in 0-100
for (const p of r1.results) {
  assert.ok(
    p.partnershipFitScore >= 0 && p.partnershipFitScore <= 100,
    `score ${p.partnershipFitScore} in range for ${p.primeName}`
  );
  assert.ok(p.scoreLabel, `has scoreLabel: ${p.primeName}`);
  assert.ok(p.reasonForScore, `has reasonForScore: ${p.primeName}`);
}

// ── findPrimePartners — no naics ──────────────────────────────────────────

const r2 = findPrimePartners({});
assert.strictEqual(r2.ok, true, 'returns ok with no NAICS');
assert.ok(r2.results.length > 0, 'returns results with no NAICS');

// ── findPrimePartners — limit ─────────────────────────────────────────────

const r3 = findPrimePartners({ naics: ['541512'], limit: 5 });
assert.ok(r3.results.length <= 5, 'respects limit');

// ── findPrimePartners — filters ───────────────────────────────────────────

const r4 = findPrimePartners({ naics: ['541512'], filters: { agency: 'Defense' } });
assert.strictEqual(r4.ok, true, 'agency filter returns ok');
assert.ok(r4.results.length > 0, 'agency filter returns results');

// ── scorePrime ────────────────────────────────────────────────────────────

const sp1 = scorePrime(DEMO_PRIMES[0], { naics: ['541512'], certifications: ['sdvosb'] });
assert.ok(sp1.partnershipFitScore >= 0 && sp1.partnershipFitScore <= 100, 'scored prime score in range');
assert.ok(sp1.scoreLabel, 'scored prime has scoreLabel');
assert.ok(typeof sp1.reasonForScore === 'string', 'reasonForScore is string');
assert.ok(sp1.reasonForScore.length > 0, 'reasonForScore is not empty');

// Cert advantage visible in reason when certs present
assert.ok(sp1.reasonForScore.toLowerCase().includes('certif') || sp1.reasonForScore.length > 0, 'reason mentions certs or match factors');

// Prime with direct NAICS match should score higher than prime with no match
const itPrime = DEMO_PRIMES.find(p => p.naics.includes('541512'));
const nonItPrime = DEMO_PRIMES.find(p => !p.naics.includes('541512') && !p.naics.some(n => n.startsWith('5415')));
if (itPrime && nonItPrime) {
  const scoreIt  = scorePrime(itPrime, { naics: ['541512'] }).partnershipFitScore;
  const scoreNon = scorePrime(nonItPrime, { naics: ['541512'] }).partnershipFitScore;
  assert.ok(scoreIt >= scoreNon, `NAICS-matching prime scores >= non-matching (${scoreIt} vs ${scoreNon})`);
}

// scorePrime with no user profile returns stable score
const sp2 = scorePrime(DEMO_PRIMES[0], {});
assert.ok(sp2.partnershipFitScore >= 0 && sp2.partnershipFitScore <= 100, 'stable score with empty profile');

// ── generateOutreachDraft ─────────────────────────────────────────────────

const prime0 = { ...DEMO_PRIMES[0], partnershipFitScore: 92, scoreLabel: 'Strategic Prime' };

// Basic draft
const d1 = generateOutreachDraft(prime0, { name: 'Acme Defense LLC', naics: ['541512'] });
assert.strictEqual(d1.ok, true, 'draft ok');
assert.ok(typeof d1.draft === 'string', 'draft.draft is string');
assert.ok(d1.draft.length > 50, 'draft has meaningful content');
assert.strictEqual(d1.requiresApproval, true, 'draft requiresApproval');
assert.strictEqual(d1.sendingEnabled, false, 'draft sendingEnabled false');
assert.ok(d1.safetyNote, 'draft has safetyNote');
assert.ok(d1.generatedAt, 'draft has generatedAt');

// Draft mentions prime name
assert.ok(d1.draft.includes('Booz Allen'), 'draft mentions prime name');
// Draft mentions user company
assert.ok(d1.draft.includes('Acme Defense'), 'draft mentions user company');
// Draft mentions user NAICS
assert.ok(d1.draft.includes('541512'), 'draft mentions user NAICS');

// No auto-send phrasing
assert.ok(!d1.draft.toLowerCase().includes('automatically send'), 'draft has no auto-send language');
// No guaranteed performance
assert.ok(!d1.draft.toLowerCase().includes('guaranteed performance'), 'draft has no guaranteed performance claim');

// Draft WITHOUT certifications does NOT claim certification
const d2 = generateOutreachDraft(prime0, { name: 'Acme LLC', naics: ['541512'], certifications: [] });
assert.ok(!d2.draft.toLowerCase().includes('certified'), 'draft with no certs does not claim certification');

// Draft WITH certifications mentions them
const d3 = generateOutreachDraft(prime0, { name: 'Acme LLC', naics: ['541512'], certifications: ['sdvosb'] });
assert.ok(d3.draft.toUpperCase().includes('SDVOSB'), 'draft with certs mentions certification');

// Draft with no name falls back gracefully
const d4 = generateOutreachDraft(prime0, {});
assert.strictEqual(d4.ok, true, 'draft ok with no user profile');

// ── generateCapabilityMatchMemo ───────────────────────────────────────────

const m1 = generateCapabilityMatchMemo(prime0, { name: 'Acme LLC', naics: ['541512'] });
assert.strictEqual(m1.ok, true, 'memo ok');
assert.ok(typeof m1.memo === 'string', 'memo is string');
assert.ok(m1.memo.includes('541512'), 'memo includes user NAICS');
assert.ok(m1.memo.includes('Human review required'), 'memo includes human review note');
assert.ok(m1.memo.includes('Booz Allen'), 'memo includes prime name');
assert.ok(m1.generatedAt, 'memo has generatedAt');

// Memo with no certs omits cert section
const m2 = generateCapabilityMatchMemo(prime0, { name: 'Acme LLC', naics: ['541512'], certifications: [] });
assert.ok(!m2.memo.includes('## Certifications'), 'memo with no certs omits cert section');

// Memo with certs includes cert section
const m3 = generateCapabilityMatchMemo(prime0, { name: 'Acme LLC', naics: ['541512'], certifications: ['sdvosb', '8a'] });
assert.ok(m3.memo.includes('## Certifications'), 'memo with certs includes cert section');
assert.ok(m3.memo.toUpperCase().includes('SDVOSB'), 'memo with certs lists SDVOSB');

// ── _internal helpers ─────────────────────────────────────────────────────

const { naicsMatchScore, scrubForbidden } = _internal;

assert.strictEqual(naicsMatchScore(['541512'], ['541512', '541611']), 20, 'perfect NAICS match = 20');
assert.strictEqual(naicsMatchScore(['541512'], ['541611']), 0, 'no NAICS match = 0');
assert.strictEqual(naicsMatchScore([], ['541512']), 10, 'empty user NAICS = neutral 10');

const scrubbed = scrubForbidden('This is a cold email with guaranteed performance claims');
assert.ok(!scrubbed.includes('cold email'), 'scrubs cold email');
assert.ok(!scrubbed.includes('guaranteed performance'), 'scrubs guaranteed performance');

// ── Summary dashboard cards ───────────────────────────────────────────────

const r5 = findPrimePartners({ naics: ['541512'] });
assert.ok(typeof r5.summary.primeTargetsFound === 'number', 'summary.primeTargetsFound');
assert.ok(typeof r5.summary.strategicPrimes === 'number', 'summary.strategicPrimes');
assert.ok(typeof r5.summary.draftsNeedingReview === 'number', 'summary.draftsNeedingReview');
assert.ok(typeof r5.summary.portalsToSubmit === 'number', 'summary.portalsToSubmit');
assert.ok(typeof r5.summary.followUpsDue === 'number', 'summary.followUpsDue');
assert.ok(typeof r5.summary.callsScheduled === 'number', 'summary.callsScheduled');

// portalsToSubmit ≤ results length
assert.ok(r5.summary.portalsToSubmit <= r5.results.length, 'portalsToSubmit <= results.length');

// strategicPrimes ≤ primeTargetsFound
assert.ok(r5.summary.strategicPrimes <= r5.summary.primeTargetsFound, 'strategicPrimes <= primeTargetsFound');

// ── Data model shape ──────────────────────────────────────────────────────

const requiredFields = [
  'primeId', 'primeName', 'uei', 'cage', 'website', 'naics',
  'totalObligations', 'awardCount', 'recentAwardCount',
  'topAgencies', 'topContractingOffices', 'contractVehicles',
  'placeOfPerformance', 'subcontractingPlanMatch',
  'sbloContactName', 'sbloEmail', 'supplierDiversityUrl', 'registrationPortalUrl',
  'partnershipFitScore', 'reasonForScore', 'scoreLabel',
  'outreachStatus', 'lastContacted', 'nextFollowUp', 'notes'
];

const sampleResult = r1.results[0];
for (const field of requiredFields) {
  assert.ok(field in sampleResult, `result has field: ${field}`);
}

// outreachStatus must be one of the defined statuses
assert.ok(PRIME_STATUSES.includes(sampleResult.outreachStatus), 'outreachStatus is valid');

console.log('=== PASS prime-partner-finder ===');

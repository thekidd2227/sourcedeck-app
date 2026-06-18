'use strict';

// Phase 25AF — when a package has NO literal "SECTION C/L/M" headers, the
// requirements-first fallback must still populate the high-value panels from
// the readable text — and must NOT hallucinate when nothing relevant exists.

const assert = require('assert');
const extract = require('../services/govcon/solicitation-package-extract');

// 1) No formal UCF headers, but clearly requirement-bearing prose.
const prose = [
  'Request for Quote — Custodial Services',
  'Quoters must submit their proposal via email no later than the response date.',
  'Proposals shall not exceed a page limit of 20 pages.',
  'The Government will evaluate technical approach and past performance on a best value tradeoff basis.',
  'The contractor shall provide custodial services during the period of performance.',
  'Offerors shall include a completed SF 1449 and current wage determination.',
  'A mandatory site visit is required prior to submission.'
].join('\n');

const sections = extract._classifySections(prose);

assert.ok(sections.L.found, 'fallback populates instructions (L) without literal header');
assert.equal(sections.L.confidence, 'fallback', 'L flagged as fallback-confidence');
assert.ok(/page limit|submit/i.test(sections.L.text), 'instructions content present');

assert.ok(sections.M.found, 'fallback populates evaluation (M)');
assert.ok(/evaluate|best value/i.test(sections.M.text), 'evaluation content present');

assert.ok(sections.C.found, 'fallback populates scope (C)');
assert.ok(/contractor shall provide/i.test(sections.C.text), 'scope content present');

const buckets = sections._fallbackBuckets;
assert.ok(buckets.deadlines.some(d => /response date|no later than|site visit/i.test(d.text)), 'deadlines bucket populated');
assert.ok(buckets.risks.some(r => /site visit|wage determination|page limit/i.test(r.text)), 'risks bucket populated');

// 2) Irrelevant text must NOT hallucinate sections.
const noise = extract._classifySections('The weather today is sunny. Lunch is at noon. Birds are singing.');
assert.ok(!noise.L.found, 'no instructions hallucinated from irrelevant text');
assert.ok(!noise.M.found, 'no evaluation hallucinated');
assert.ok(!noise.C.found, 'no scope hallucinated');
assert.ok(/No Section C/.test(noise.C.text), 'missing placeholder retained for irrelevant text');

// 3) Formal headers still win (Pass 1) and are not downgraded by fallback.
const formal = extract._classifySections('SECTION C\nContractor shall clean.\nSECTION L\nOfferor must submit forms.');
assert.equal(formal.C.confidence, 'high', 'formal section keeps high confidence');
assert.ok(!formal.M.found, 'formal fixture without M evaluation keeps M missing');

console.log('phase-25af-fallback-requirements-classifier: ok');

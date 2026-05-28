'use strict';
const assert = require('assert');
const { researchIncumbent, pricingScenarios } = require('../services/govcon/incumbent-research');

const out = researchIncumbent({
  opportunity: { solicitationNumber: 'FA123', title: 'Helpdesk Support', agency: 'USAF', setAside: 'SDVOSB' },
  awards: [{ solicitationNumber: 'FA123', title: 'Helpdesk Support', agency: 'USAF', awardeeName: 'Prime Inc', awardAmount: 1000000, contractNumber: 'C1' }],
  profile: { subcontractorCostPct: 70 }
});
assert.strictEqual(out.ok, true);
assert.strictEqual(out.incumbent.companyName, 'Prime Inc');
assert.strictEqual(out.pricingAnalysis.scenarios.find(s => s.name === 'competitive_5_under').proposedPrice, 950000);
assert.ok(out.confidence >= 70);
assert.match(out.sdvosbPositioning, /SDVOSB/);

const missing = researchIncumbent({ opportunity: { title: 'X' }, awards: [] });
assert.strictEqual(missing.missingIncumbent, true);
assert.strictEqual(missing.recommendation.decision, 'MORE_RESEARCH_NEEDED');
assert.strictEqual(pricingScenarios({ awardAmount: 100 }, { subcontractorCostPct: 70 }).scenarios[2].proposedPrice, 90);
console.log('=== PASS govcon-incumbent-research ===');

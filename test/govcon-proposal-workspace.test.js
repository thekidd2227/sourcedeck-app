'use strict';
const assert = require('assert');
const proposal = require('../services/proposal');

const noCompany = proposal.createProposalWorkspace({ opportunity: { title:'X' } });
assert.strictEqual(noCompany.ok, false);
assert.strictEqual(noCompany.reason, 'missing_company_profile');

const ws = proposal.createProposalWorkspace({
  opportunity: { title:'Helpdesk', solicitationNumber:'S1', responseDeadline:'2026-06-01' },
  companyProfile: { name: 'Example LLC' },
  complianceMatrix: { rows: [{ reqId:'L1', sourceSection:'L.1', requirement:'Technical approach shall describe staffing.' }] }
});
assert.strictEqual(ws.ok, true);
assert.ok(!JSON.stringify(ws).includes('[Company Name]'));
assert.ok(ws.tabs.includes('Cost Volume'));

const cost = proposal.draftCostVolume({ vendorQuote: { totalCost: 1000 }, breakdownRequired: true });
assert.strictEqual(cost.finalPrice, 1350);
assert.strictEqual(cost.breakdown.subcontractorCostDisplayed, 1250);
assert.strictEqual(cost.breakdown.primeProfitManagementDisplayed, 100);
console.log('=== PASS govcon-proposal-workspace ===');

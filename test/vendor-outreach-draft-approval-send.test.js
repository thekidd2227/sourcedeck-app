'use strict';
const assert = require('assert');
const w = require('../services/govcon/vendor-quote-workflow');
(async () => {
  const vendors = Array.from({ length:2 }, (_, i) => ({ id:`v${i}`, legalBusinessName:`Vendor ${i}`, email:`quote${i}@vendor.example`, emailVerificationStatus:'verified', capabilities:['licensed HVAC maintenance'] }));
  const made = w.draftVendorEmails({ vendors, sender:{ fullName:'Alex Operator', title:'President', businessName:'Prime Services LLC', businessEmail:'alex@prime.example', businessPhone:'555-0100' }, generalService:'commercial HVAC maintenance', placeOfPerformance:'Richmond, VA', quoteDeadline:'2026-06-25', proposalDeadline:'2026-06-30', requirements:[{ task:'Licensed technicians, service vehicles, insurance and rapid mobilization are required.' }] });
  assert.equal(made.ok, true); assert.equal(made.drafts.length, 2); assert.ok(made.drafts.every(d => d.to.length === 1 && d.questions.length === 3 && d.status === 'needs review' && !d.approved));
  assert.ok(made.drafts.every(d => /Prime Services LLC/.test(d.body) && !/\[(?:Name|Project|Deadline|User)/.test(d.body) && !/solicitation number|internal markup|competitor/i.test(d.body)));
  let calls = 0; const provider = { send: async () => ({ messageId:'mock-' + (++calls) }) };
  let result = await w.sendApproved({ drafts:made.drafts, confirmation:'Send 0 approved vendor outreach emails' }, provider);
  assert.equal(result.ok, false); assert.equal(calls, 0);
  const approved = made.drafts.map(d => Object.assign({}, d, { approved:true, status:'approved' }));
  result = await w.sendApproved({ drafts:approved, confirmation:'wrong' }, provider); assert.equal(result.ok, false); assert.equal(calls, 0);
  result = await w.sendApproved({ drafts:approved, confirmation:'Send 2 approved vendor outreach emails' }, provider); assert.equal(result.ok, true); assert.equal(calls, 2); assert.ok(result.sent.every(x => x.status === 'sent'));
  const duplicate = await w.sendApproved({ drafts:approved, confirmation:'Send 2 approved vendor outreach emails', sentDraftIds:result.sentDraftIds }, provider); assert.ok(duplicate.sent.every(x => x.status === 'duplicate_blocked')); assert.equal(calls, 2);
  console.log('vendor-outreach-draft-approval-send: ok');
})().catch(e => { console.error(e); process.exit(1); });

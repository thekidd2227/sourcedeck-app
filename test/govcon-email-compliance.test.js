'use strict';
const assert = require('assert');
const { draftOfficialEmail, FORBIDDEN_WORDS } = require('../services/govcon/email-compliance');

const blocked = draftOfficialEmail({
  opportunity: { noticeType:'Solicitation', responseDeadline:'2099-01-01', solicitationNumber:'S1', title:'Active RFP' },
  purpose: 'delve into pricing'
});
assert.strictEqual(blocked.blocked, true);
assert.match(blocked.officialQAndADraft, /Official Q&A/);
assert.ok(!/delve/i.test(blocked.officialQAndADraft));

const ok = draftOfficialEmail({ opportunity: { noticeType:'Sources Sought', solicitationNumber:'S2' }, question:'Please confirm scope.' });
assert.strictEqual(ok.requiresApproval, true);
assert.strictEqual(ok.sendingEnabled, false);
for (const word of FORBIDDEN_WORDS) assert.ok(!new RegExp(word, 'i').test(ok.draft));
assert.ok(ok.logEntry);
console.log('=== PASS govcon-email-compliance ===');

/**
 * Response Desk — deterministic inbound-reply triage tests.
 *
 * Exercises the classifier, scorer, action recommender, draft builder,
 * pipeline recommender, and sanitizer. Verifies the operational
 * invariants:
 *   - human_approval_required is always true
 *   - auto_send is always false
 *   - unsubscribe / procurement-restricted / spam suppress sales drafts
 *   - blocked / unsupported-claim phrases are scrubbed
 *   - manual paste mode produces a result with no external API
 *
 * Run: node test/response-desk.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rd = require('../services/response-desk');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

console.log('\n── Response Desk — classification ──');

test('hot buying signal → high urgency + close/meeting action', () => {
  const r = rd.runResponseDesk({ company: 'Acme', replyText: "We're ready to move forward — what's the next step? Send the contract." });
  assert.strictEqual(r.intent, 'hot_buying_signal');
  assert.ok(r.urgency_score >= 90, 'urgency >= 90, got ' + r.urgency_score);
  assert.ok(/meeting|close|proposal|next step/i.test(r.recommended_action));
});

test('pricing request → pricing/scope draft + action', () => {
  const r = rd.runResponseDesk({ company: 'Acme', replyText: 'How much does this cost? Can you send pricing details?' });
  assert.strictEqual(r.intent, 'pricing_request');
  assert.ok(/pricing|scope/i.test(r.recommended_action));
  assert.ok(r.response_options && r.response_options.direct_close.length > 0);
});

test('meeting request → scheduling recommendation', () => {
  const r = rd.runResponseDesk({ company: 'Acme', replyText: "Let's schedule a call this week. When are you free?" });
  assert.strictEqual(r.intent, 'meeting_request');
  assert.ok(/calendar|schedule|availability|meeting/i.test(r.recommended_action));
});

test('objection → consultative re-frame', () => {
  const r = rd.runResponseDesk({ company: 'Acme', replyText: "We don't think this is a good fit for us right now." });
  assert.strictEqual(r.intent, 'objection');
  assert.ok(/consultative|re-frame/i.test(r.recommended_action));
  assert.ok(r.response_options.consultative.length > 0);
});

test('unsubscribe → do-not-contact + no sales draft', () => {
  const r = rd.runResponseDesk({ company: 'Acme', replyText: 'Please unsubscribe me and do not contact again.' });
  assert.strictEqual(r.intent, 'unsubscribe_or_do_not_contact');
  assert.ok(r.safety_flags.includes('do_not_contact'));
  assert.strictEqual(r.response_options.direct_close, '');
  assert.strictEqual(r.response_options.consultative, '');
  assert.strictEqual(r.response_options.short_executive, '');
  assert.ok(/suppress|do[- ]not[- ]contact/i.test(r.response_options.notice || r.recommended_action));
});

test('procurement-restricted → restricted safety flag + suppressed drafts', () => {
  const r = rd.runResponseDesk({ replyText: 'All vendor communications must go through procurement; unsolicited proposals are not allowed.' });
  assert.strictEqual(r.intent, 'procurement_restricted');
  assert.ok(r.safety_flags.includes('procurement_restricted'));
  assert.strictEqual(r.response_options.direct_close, '');
  assert.ok(/procurement|official channels/i.test(r.response_options.notice || r.recommended_action));
});

test('spam/irrelevant → low priority + no drafts', () => {
  const r = rd.runResponseDesk({ replyText: 'Invest in our crypto token now and earn guaranteed ROI!' });
  assert.strictEqual(r.intent, 'spam_or_irrelevant');
  assert.ok(r.urgency_score <= 20);
  assert.ok(r.safety_flags.includes('low_priority'));
  assert.strictEqual(r.response_options.direct_close, '');
});

test('need-more-info → information-request draft', () => {
  const r = rd.runResponseDesk({ replyText: 'Can you send more information about how this works?' });
  assert.strictEqual(r.intent, 'need_more_info');
  assert.ok(/information|concise|answer/i.test(r.recommended_action));
});

test('referral / wrong contact → re-route recommendation', () => {
  const r = rd.runResponseDesk({ replyText: "I'm not the right person — please contact Sarah instead." });
  assert.strictEqual(r.intent, 'referral_or_wrong_contact');
  assert.ok(/redirect|referral|re-route|re-?route/i.test(r.recommended_action + ' ' + r.task_recommendation));
});

test('not-now nurture → 30-day cadence', () => {
  const r = rd.runResponseDesk({ replyText: 'Not now — check back next quarter.' });
  assert.strictEqual(r.intent, 'not_now_nurture');
  assert.strictEqual(r.next_due, '30d');
});

test('empty reply → operator review required', () => {
  const r = rd.runResponseDesk({ replyText: '' });
  assert.strictEqual(r.intent, 'human_review_required');
  assert.ok(r.safety_flags.includes('operator_review_required'));
  assert.strictEqual(r.response_options.direct_close, '');
});

console.log('\n── Response Desk — invariants ──');

test('every output has human_approval_required: true', () => {
  for (const text of [
    "We're ready to move forward",
    'Please unsubscribe',
    'How much does this cost?',
    "Let's schedule a call",
    'Not now',
    '',
    'Random text with no clear intent'
  ]) {
    const r = rd.runResponseDesk({ replyText: text });
    assert.strictEqual(r.human_approval_required, true, 'failed for: ' + text);
  }
});

test('every output has auto_send: false', () => {
  for (const text of [
    "We're ready to move forward",
    'Please unsubscribe',
    'How much does this cost?',
    "Let's schedule a call",
    'Not now',
    '',
    'Random text with no clear intent'
  ]) {
    const r = rd.runResponseDesk({ replyText: text });
    assert.strictEqual(r.auto_send, false, 'failed for: ' + text);
  }
});

test('no send-email surface exists in the service module', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'response-desk.js'), 'utf8');
  assert.ok(!/\bsendEmail\b/i.test(src), 'service must not expose sendEmail');
  assert.ok(!/\bautoSend\b/i.test(src), 'service must not expose autoSend');
  assert.ok(!/\bdispatchReply\b/i.test(src), 'service must not expose dispatchReply');
});

test('blocked phrases are scrubbed from any output field', () => {
  const r = rd.sanitizeResponseDeskOutput({
    summary: 'We guarantee 10x results and unlimited AI.',
    recommended_action: 'Send email automatically to the prospect.',
    response_options: { direct_close: 'We are SOC 2 certified and FedRAMP authorized.' },
    safety_flags: [],
    human_approval_required: false,
    auto_send: true
  });
  assert.ok(/redacted/i.test(r.summary));
  assert.ok(/redacted/i.test(r.recommended_action));
  assert.ok(/redacted/i.test(r.response_options.direct_close));
  assert.strictEqual(r.human_approval_required, true, 'sanitizer must force human approval');
  assert.strictEqual(r.auto_send, false, 'sanitizer must force auto_send false');
});

test('drafts never include guaranteed-outcome or compliance claims', () => {
  const r = rd.runResponseDesk({
    company: 'Acme',
    offerDiscussed: 'guaranteed 10x ROI savings program', // tries to smuggle a claim
    replyText: 'Tell me more about pricing.'
  });
  const joined = JSON.stringify(r.response_options);
  assert.ok(!/guaranteed (results|ROI|award|revenue|savings)/i.test(joined),
    'guaranteed-outcome leak: ' + joined);
  assert.ok(!/SOC ?2 certified|FedRAMP authorized|CMMC certified/i.test(joined),
    'compliance-claim leak: ' + joined);
});

test('pipeline recommendation is advisory only (string-typed, no auto-write hint)', () => {
  const r = rd.runResponseDesk({ replyText: "We're ready to move forward", currentStage: 'Discovery' });
  assert.strictEqual(typeof r.pipeline_stage_recommendation, 'string');
  assert.strictEqual(typeof r.task_recommendation, 'string');
  assert.ok(/advisory only/i.test(r.pipeline_stage_recommendation), 'must label advisory');
  assert.ok(!/auto-?update|auto-?move|automatically (update|move|mutate)/i.test(
    r.pipeline_stage_recommendation + ' ' + r.task_recommendation));
});

test('manual paste mode works without any external API or network', () => {
  // The module has no imports of http / https / fetch / electron / ipc.
  const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'response-desk.js'), 'utf8');
  assert.ok(!/require\(['"]https?['"]\)/.test(src), 'must not require http(s)');
  assert.ok(!/require\(['"]electron['"]\)/.test(src), 'must not require electron');
  assert.ok(!/\bfetch\s*\(/.test(src), 'must not call fetch');
  // And it must still produce a usable output.
  const r = rd.runResponseDesk({ replyText: 'How much does this cost?' });
  assert.ok(r.intent && r.urgency_score >= 0);
});

test('deal-value boost lifts revenue_score for commercial categories', () => {
  const noVal = rd.runResponseDesk({ replyText: "We're ready to move forward" });
  const withVal = rd.runResponseDesk({ replyText: "We're ready to move forward", dealValue: 500000 });
  assert.ok(withVal.revenue_score >= noVal.revenue_score);
});

test('deal-value boost does NOT lift revenue on unsubscribe / spam', () => {
  const u = rd.runResponseDesk({ replyText: 'Please unsubscribe me.', dealValue: 1000000 });
  const s = rd.runResponseDesk({ replyText: 'Invest in our crypto token now!', dealValue: 1000000 });
  assert.strictEqual(u.revenue_score, 0);
  assert.strictEqual(s.revenue_score, 0);
});

test('all 11 categories are exported', () => {
  assert.deepStrictEqual(
    Array.from(rd.CATEGORIES).sort(),
    [
      'hot_buying_signal','human_review_required','meeting_request',
      'need_more_info','not_now_nurture','objection','pricing_request',
      'procurement_restricted','referral_or_wrong_contact',
      'spam_or_irrelevant','unsubscribe_or_do_not_contact'
    ]
  );
});

console.log('\n── Response Desk — renderer wiring (static-source) ──');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

test('renderer uses "Response Desk" — Reply Analyzer label retired', () => {
  // The nav button + pane title should now say "Response Desk".
  assert.ok(/>Response Desk</.test(html), 'nav/title must read Response Desk');
  // No nav label / pane title still reads "Reply Analyzer" verbatim.
  assert.ok(!/<span class="brief-head">Reply Analyzer<\/span>/.test(html),
    'old pane-title "Reply Analyzer" must be gone');
});

test('renderer has no Send Email / auto-send surface in Response Desk', () => {
  // Extract a region around the Response Desk pane to scan locally.
  const startIdx = html.indexOf('id="tab-reply"');
  assert.ok(startIdx > 0, 'tab-reply pane must exist');
  // Look ~600 lines of HTML after the tab start for any sending controls.
  const region = html.slice(startIdx, startIdx + 12000);
  assert.ok(!/Send Email/i.test(region), 'no Send Email button in Response Desk pane');
  assert.ok(!/onclick=["'][^"']*sendReply\(/i.test(region), 'no sendReply onclick');
  assert.ok(!/onclick=["'][^"']*dispatchReply\(/i.test(region), 'no dispatchReply onclick');
  assert.ok(!/onclick=["'][^"']*autoSend\(/i.test(region), 'no autoSend onclick');
});

test('renderer surfaces "Draft only — not sent" safety language in Response Desk', () => {
  const startIdx = html.indexOf('id="tab-reply"');
  const region = html.slice(startIdx, startIdx + 12000);
  assert.ok(/Draft only — not sent|draft-only|human approval/i.test(region),
    'Response Desk must show explicit draft-only / human-approval language');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} response-desk tests ===`
  : `=== FAIL — ${failed}/${total} response-desk tests failed ===`);
if (failed > 0) process.exit(1);

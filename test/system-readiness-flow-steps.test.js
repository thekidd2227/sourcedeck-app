/**
 * System Readiness flow-steps decontamination tests (Phase 21E).
 *
 * Phase 21C real-navigation QA failed one screen: the System Readiness tab's
 * "9-Stage Revenue Pipeline" card (rendered by renderFlow()) showed internal
 * operator labels — PROD-02..05 and the Instantly campaign ID 4595758. This
 * test locks in their removal and confirms the safe, product-neutral copy
 * that replaced them, while guarding the surrounding protected features.
 *
 * Static + VM-based; never executes app/renderer code or touches the network.
 *
 * Run:  node test/system-readiness-flow-steps.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== System Readiness flow-steps — decontamination ===\n');

function getRenderFlowBody() {
  const m = HTML.match(/function renderFlow\(\)\{([\s\S]*?)\n\}/);
  assert.ok(m, 'renderFlow() not found');
  return m[1];
}

function getSystemReadinessPane() {
  const m = HTML.match(/<div class="tab-pane" id="tab-sysflow">([\s\S]*?)<div class="tab-pane"/i)
       || HTML.match(/<div class="tab-pane" id="tab-sysflow">([\s\S]*?)<\/main>/i);
  assert.ok(m, 'tab-sysflow pane not found');
  return m[1];
}

// 1. The active System Readiness flow-step source area must carry no internal
//    scenario IDs, campaign IDs, webhook tokens, Gmail fake IDs, or Airtable fake IDs.
test('renderFlow flow-step source area carries no internal labels/IDs', () => {
  const body = getRenderFlowBody();
  for (const term of [
    'PROD-02',
    'PROD-03',
    'PROD-04',
    'PROD-05',
    '4595758',
    '8125092',
    'ti5tlit9s',
    'jpu2xj',
    'appXXXXXXXX',
    'M3 writeback',
    'Instantly Insert',
    'Notion Sync (Auto)',
    'Reply Analysis (Auto)',
    'Booking Triggered',
    'ACTIVE'
  ]) {
    assert.ok(!body.includes(term), 'renderFlow still references internal label: ' + term);
  }
});

// 2. The exact safe five-step copy is present in renderFlow().
test('renderFlow safe five-step copy preserved', () => {
  const body = getRenderFlowBody();
  const expected = [
    ['Assessment Form', 'New intake is received and queued for review.'],
    ['CRM Sync', 'Qualified records can sync to your connected workspace when configured.'],
    ['Outreach Queue', 'Approved prospects can be prepared for outreach review when configured.'],
    ['Reply Review', 'Imported replies are classified and turned into draft-only next actions.'],
    ['Booking Review', 'Qualified booking signals can create follow-up tasks when configured.']
  ];

  for (const [title, description] of expected) {
    assert.ok(body.includes(title), 'expected neutral flow-step title missing: ' + title);
    assert.ok(body.includes(description), 'expected neutral flow-step description missing: ' + description);
  }
});

// 3. The static System Readiness pane markup itself carries no PROD/campaign/fake-ID
//    contamination.
test('System Readiness pane markup carries no PROD/campaign/fake-ID labels', () => {
  const pane = getSystemReadinessPane();
  for (const term of ['PROD-02', 'PROD-03', 'PROD-04', 'PROD-05', '4595758', '8125092', 'ti5tlit9s', 'jpu2xj', 'appXXXXXXXX']) {
    assert.ok(!pane.includes(term), 'System Readiness pane still contains: ' + term);
  }
});

// 4. System Readiness copy still contains the safe, user-facing labels.
test('System Readiness safe copy preserved', () => {
  for (const s of [
    'System Readiness',
    '9-Stage Revenue Pipeline',
    'CRM Sync',
    'Outreach Queue',
    'Reply Review',
    'Booking Review',
    'No webhooks active',
    'No integrations configured',
    'No HTTP standards published'
  ]) {
    assert.ok(HTML.includes(s), 'missing safe System Readiness copy: ' + s);
  }
});

// 5. Renderer still boots: every inline <script> block parses.
test('renderer still boots — all inline <script> blocks parse', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 6. Response Desk Import Email workflow copy still exists.
test('Response Desk Import Email copy preserved', () => {
  assert.ok(HTML.includes('Import Email'), 'Import Email control missing');
  assert.ok(/draft-only/i.test(HTML), 'draft-only copy missing');
  assert.ok(/human approval/i.test(HTML), 'human approval copy missing');
});

// 7. No Send Email button introduced anywhere.
test('no Send Email button present', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a "Send Email" button is present');
});

// 8. SAM Sprint Free = 1 NAICS and no auto-send copy remain.
test('SAM Sprint Free=1 NAICS copy preserved', () => {
  assert.ok(HTML.includes('Free users: 1 NAICS'), 'Free=1 NAICS copy missing');
  assert.ok(/no auto-send/i.test(HTML), 'SAM Sprint no auto-send copy missing');
});

// 9. Phase 20G .btn-gold and responsive guards remain.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(HTML.includes('Phase 20G guard'), 'Phase 20G guard comment missing');
  assert.ok(HTML.includes('.btn-gold'), '.btn-gold rule missing');
  assert.ok(HTML.includes('899px'), '899px responsive guard missing');
  assert.ok(HTML.includes('900px'), '900px responsive guard missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} system-readiness-flow-steps checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 21F — System Readiness tab removal regression test.
 *
 * The internal "System Readiness" / "System Flow" (sysflow) tab was an
 * admin/readiness screen with no buyer-facing purpose. It was removed from the
 * primary UI (nav button, pane, openTab dispatch, renderFlow). This test makes
 * sure it does not come back and that protected features survive.
 *
 * Static + VM-based; never executes app/renderer code or touches the network.
 *
 * Run:  node test/remove-system-readiness-tab.test.js
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

console.log('\n=== Phase 21F — System Readiness tab removed ===\n');

// 1. No primary nav button for the sysflow tab / System Readiness / System Flow.
test('no nav button for sysflow / System Readiness / System Flow', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button still present');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav button label present');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav button label present');
});

// 2. No tab pane for tab-sysflow.
test('no tab-sysflow pane exists', () => {
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane still present');
});

// 3. No buyer-facing System Readiness copy remains.
test('no buyer-facing System Readiness copy remains', () => {
  for (const s of [
    '9-Stage Revenue Pipeline',
    'id="flow-steps"',
    'No webhooks active',
    'No integrations configured',
    'No HTTP standards published'
  ]) {
    assert.ok(!HTML.includes(s), 'buyer-facing System Readiness copy still present: ' + s);
  }
  // The visible "System Readiness" / "System Flow" pane-title brief-head is gone.
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title present');
});

// 4. Renderer still boots — every inline <script> block parses.
test('renderer still boots — all inline <script> blocks parse', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 5. Protected features remain intact.
test('Response Desk Import Email + no Send Email + draft-only/human-approval preserved', () => {
  assert.ok(HTML.includes('Import Email'), 'Import Email control missing');
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a "Send Email" button is present');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
  assert.ok(/human approval/i.test(HTML), 'human approval copy missing');
});

test('SAM Sprint Free=1 NAICS + no auto-send preserved', () => {
  assert.ok(HTML.includes('Free users: 1 NAICS'), 'Free=1 NAICS copy missing');
  assert.ok(!/auto_send\s*[:=]\s*true/.test(HTML), 'auto_send:true present');
});

test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(HTML.includes('Phase 20G guard'), 'Phase 20G guard comment missing');
  assert.ok(HTML.includes('.btn-gold'), '.btn-gold rule missing');
});

test('Ad Engine / AI Lead Builder labels intact', () => {
  assert.ok(/brief-head">Ad Engine</.test(HTML), 'Ad Engine pane title missing');
  assert.ok(/>AI Lead Builder</.test(HTML), 'AI Lead Builder label missing');
});

// 6. No operator contamination reintroduced.
test('no PROD/campaign/token/fake-ID contamination', () => {
  for (const t of ['PROD-02','PROD-03','PROD-04','PROD-05','4595758','8125092','ti5tlit9s','jpu2xj']) {
    assert.ok(!HTML.includes(t), 'contaminant present: ' + t);
  }
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} remove-system-readiness-tab checks ===\n`);
process.exit(failed ? 1 : 0);

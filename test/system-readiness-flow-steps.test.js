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

// 1. No internal PROD scenario IDs or the Instantly campaign ID anywhere.
test('sourcedeck.html contains no PROD-02..05 or campaign ID 4595758', () => {
  for (const term of ['PROD-02', 'PROD-03', 'PROD-04', 'PROD-05', '4595758']) {
    assert.ok(!HTML.includes(term), 'forbidden internal label still present: ' + term);
  }
});

// 2. Webhook tokens and the fake Gmail connection ID must be absent file-wide
//    (these were fully removed by the earlier default-state cleanup; this is a
//    standing guard).
test('no webhook tokens or fake Gmail connection ID present anywhere', () => {
  const forbidden = [
    'ti5tlit9s9ir0sr1vha7vqjyemcuvlnq', // PROD-05 webhook token
    'jpu2xjxufd8x7yt3qnsk9ntxd0ns77jk', // LCC webhook token
    '8125092'                            // fake Gmail connection ID
  ];
  for (const term of forbidden) {
    assert.ok(!HTML.includes(term), 'forbidden operator ID/token still present: ' + term);
  }
});

// 2b. The FLOW-STEP descriptions (renderFlow body) carry no scenario IDs,
//     campaign ID, fake Airtable base ID, or internal automation codenames.
//     (A code-level `AT_BASE='appXXX…'` placeholder constant lives elsewhere
//     and is not a rendered flow-step description; it is out of scope here.)
test('renderFlow flow-step descriptions carry no internal labels/IDs', () => {
  const m = HTML.match(/function renderFlow\(\)\{([\s\S]*?)\n\}/);
  assert.ok(m, 'renderFlow() not found');
  const body = m[1];
  for (const term of ['PROD-', '4595758', 'appXXXXXXXX', 'M3 writeback', 'Instantly Insert', 'Notion Sync (Auto)', 'Reply Analysis (Auto)', 'Booking Triggered']) {
    assert.ok(!body.includes(term), 'renderFlow still references internal label: ' + term);
  }
  // safe replacement titles are present
  for (const t of ['CRM Sync', 'Outreach Queue', 'Reply Review', 'Booking Review']) {
    assert.ok(body.includes(t), 'expected neutral flow-step title missing: ' + t);
  }
});

// 2c. The System Readiness pane markup itself carries no PROD/campaign/fake-ID
//     contamination.
test('System Readiness pane markup carries no PROD/campaign/fake-ID labels', () => {
  const m = HTML.match(/<div class="tab-pane" id="tab-sysflow">([\s\S]*?)<\/div>\s*<!--/i)
         || HTML.match(/<div class="tab-pane" id="tab-sysflow">([\s\S]*?)<div class="tab-pane"/i);
  assert.ok(m, 'tab-sysflow pane not found');
  const pane = m[1];
  for (const term of ['PROD-0', '4595758', 'appXXXXXXXX', '8125092']) {
    assert.ok(!pane.includes(term), 'System Readiness pane still contains: ' + term);
  }
});

// 3. System Readiness copy still contains the safe, user-facing labels.
test('System Readiness safe copy preserved', () => {
  for (const s of [
    'System Readiness',
    '9-Stage Revenue Pipeline',
    'No webhooks active',
    'No integrations configured',
    'No HTTP standards published'
  ]) {
    assert.ok(HTML.includes(s), 'missing safe System Readiness copy: ' + s);
  }
});

// 4. Renderer still boots: every inline <script> block parses.
test('renderer still boots — all inline <script> blocks parse', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 5. Response Desk Import Email workflow copy still exists.
test('Response Desk Import Email copy preserved', () => {
  assert.ok(HTML.includes('Import Email'), 'Import Email control missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
});

// 6. No Send Email button introduced anywhere.
test('no Send Email button present', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a "Send Email" button is present');
});

// 7. SAM Sprint Free = 1 NAICS copy remains.
test('SAM Sprint Free=1 NAICS copy preserved', () => {
  assert.ok(HTML.includes('Free users: 1 NAICS'), 'Free=1 NAICS copy missing');
});

// 8. Phase 20G .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(HTML.includes('Phase 20G guard'), 'Phase 20G guard comment missing');
  assert.ok(HTML.includes('.btn-gold'), '.btn-gold rule missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} system-readiness-flow-steps checks ===\n`);
process.exit(failed ? 1 : 0);

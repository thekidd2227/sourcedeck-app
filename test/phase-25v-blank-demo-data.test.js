/**
 * Phase 25V — Blank-canvas default / demo data gating test.
 *
 * Asserts a fresh user sees no sample agency / vendor / prime / stakeholder /
 * past-performance data by default, and that demo/sample data only loads via
 * an explicit operator action (never auto-preloaded on boot).
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-blank-demo-data.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25V — Blank canvas / demo gating ===\n');

// 1. No sample values rendered as default field values.
test('no sample agency/vendor/prime values as default field values', () => {
  assert.ok(!/value="Sample Agency/.test(HTML), 'no Sample Agency default value');
  assert.ok(!/value="Sample Prime/.test(HTML), 'no Sample Prime default value');
  assert.ok(!/value="Sample Vendor/.test(HTML), 'no Sample Vendor default value');
  assert.ok(!/value="SAMPLE-SOL-DEMO-0001"/.test(HTML), 'no SAMPLE solicitation default value');
  assert.ok(!/value="sample core capability/.test(HTML), 'no sample core capability default');
  assert.ok(!/value="sample differentiator/.test(HTML), 'no sample differentiator default');
});

// 2. No sample rows rendered as default <option> or <tr> data.
test('no sample opportunity/past-performance rows are default-rendered', () => {
  assert.ok(!/<option[^>]*>SAMPLE — Demo Only Opportunity/.test(HTML),
    'no SAMPLE demo opportunity default option');
  assert.ok(!/<td[^>]*>SAMPLE Past Performance Project/.test(HTML),
    'no SAMPLE past performance row default-rendered');
});

// 3. Default GovCon tables render empty-state copy (no fake rows).
test('default GovCon tables render empty-state copy', () => {
  assert.ok(/No vendor quote needs added yet/.test(HTML), 'vendor empty state present');
  assert.ok(/No prime partner rows added yet/.test(HTML), 'prime empty state present');
  assert.ok(/No past performance records added yet/.test(HTML), 'past performance empty state present');
});

// 4. Demo data loads only via an explicit operator action.
test('demo data loads only by explicit operator action', () => {
  assert.ok(/onclick="gcDemoLoadSample\(\)"/.test(HTML), 'explicit Load Sample Demo Data control present');
  // The default demo state is "not loaded".
  assert.ok(/Demo data not loaded\. Working with operator-entered data only\./.test(HTML),
    'default demo state is "not loaded"');
});

// 5. Demo data is NOT auto-loaded on boot.
test('demo data is not auto-preloaded on boot', () => {
  // gcDemoLoadSample must not be invoked from an automatic init/boot path.
  // The only invocation is the explicit button onclick handler.
  const calls = (HTML.match(/gcDemoLoadSample\(\)/g) || []).length;
  assert.ok(calls <= 1, 'gcDemoLoadSample should only be wired to the explicit button; found ' + calls + ' calls');
  assert.ok(!/DOMContentLoaded[\s\S]{0,400}gcDemoLoadSample\(\)/.test(HTML),
    'gcDemoLoadSample must not run on DOMContentLoaded');
  // Sample loading is gated behind isDemoActive() (a stored flag), not default.
  assert.ok(/isDemoActive\(\)/.test(HTML), 'demo gating flag check present');
});

// 6. Stakeholder sample data fully gone (no sample even in demo builders for it).
test('no stakeholder sample data anywhere in runtime', () => {
  assert.ok(!/data-stakeholder-category=/.test(HTML), 'no stakeholder sample rows');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V blank-demo-data checks ===\n`);
process.exit(failed ? 1 : 0);

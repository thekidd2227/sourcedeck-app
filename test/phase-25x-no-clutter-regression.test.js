/**
 * Phase 25X — No-clutter regression.
 *
 * Asserts the rejected standalone SAM Search sidebar / broken CSS snippet is
 * absent, there is no duplicate SAM search section, GovCon Outreach OS stays
 * removed, no heavy Human Review panels, and no unsafe send/submit controls.
 *
 * Run:  node test/phase-25x-no-clutter-regression.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — No-clutter regression ===\n');

test('no standalone SAM Search sidebar tab', () => {
  assert.ok(!/data-tab="samsearch"/.test(HTML), 'no samsearch data-tab');
  assert.ok(!/<button[^>]*data-tab="samsearch"/.test(HTML), 'no SAM Search sidebar button');
  assert.ok(!/>SAM Search<\/button>/.test(HTML), 'no "SAM Search" sidebar button label');
});

test('rejected broken CSS snippet classes are absent', () => {
  for (const cls of ['ss-layout', 'ss-form-col', 'ss-profile-strip']) {
    assert.ok(!new RegExp('class="[^"]*' + cls).test(HTML), 'broken class present: ' + cls);
  }
});

test('exactly one canonical SAM.gov search section (no duplicate)', () => {
  assert.strictEqual((HTML.match(/data-gc-tab-sam-filters="true"/g) || []).length, 1, 'exactly one SAM filter row');
  // Find Opportunities is still the one canonical search tab.
  assert.strictEqual((HTML.match(/data-gc-tab-page="find-opportunities"/g) || []).length, 1, 'one Find Opportunities page');
});

test('GovCon Outreach OS stays removed', () => {
  assert.ok(!/class="gc-os-helper"/.test(HTML), 'gc-os-helper absent');
  assert.ok(!/>GovCon Outreach OS</.test(HTML), 'GovCon Outreach OS title absent');
});

test('no heavy Human Review Required panels', () => {
  const heavy = (HTML.match(/border:1px solid rgba\(110,31,44,0\.45\)[^>]*>\s*<div[^>]*>Human Review Required<\/div>/g) || []).length;
  assert.strictEqual(heavy, 0, 'heavy Human Review Required panels must be absent');
});

test('preserved: NAICS Finder, Saved NAICS Profiles, result-count selector', () => {
  assert.ok(/id="naics-finder-modal"/.test(HTML), 'NAICS Finder preserved');
  assert.ok(/id="gc-tab-sam-limit"/.test(HTML), 'result-count selector preserved');
  for (const n of ['25','50','75','100']) assert.ok(new RegExp('>' + n + '<').test(HTML), 'result-count option preserved: ' + n);
});

test('no unsafe send/submit/upload controls', () => {
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email control');
  assert.ok(!/>Submit Bid</.test(HTML), 'no Submit Bid control');
  assert.ok(!/>Submit Quote</.test(HTML), 'no Submit Quote control');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X no-clutter-regression checks ===\n`);
process.exit(failed ? 1 : 0);

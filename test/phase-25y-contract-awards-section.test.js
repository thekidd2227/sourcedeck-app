/**
 * Phase 25Y — Contract Awards section (GovCon tab + Dashboard shortcut).
 * Run:  node test/phase-25y-contract-awards-section.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Contract Awards section ===\n');

test('Contract Awards GovCon tab + page exist (Phase 25R: labeled "Federal Procurement Data")', () => {
  assert.ok(/data-gc-tab="contract-awards"/.test(HTML), 'Contract Awards tab button (id retained)');
  assert.ok(/data-gc-tab-page="contract-awards"/.test(HTML), 'Contract Awards tab page (id retained)');
  assert.ok(/id="gc-tab-contract-awards"/.test(HTML), 'Contract Awards section (id retained)');
  assert.ok(/>Federal Procurement Data</.test(HTML), 'surface relabeled "Federal Procurement Data"');
});

test('Dashboard shortcut to Contract Awards exists', () => {
  assert.ok(/data-dash-card="contract-awards"/.test(HTML), 'dashboard card present');
  assert.ok(/gcTabSwitch\('contract-awards'\)/.test(HTML), 'dashboard opens contract awards tab');
});

test('search fields exist', () => {
  for (const id of ['gc-ca-keyword','gc-ca-naics','gc-ca-agency','gc-ca-awardee','gc-ca-solnum','gc-ca-place','gc-ca-dates','gc-ca-max','gc-ca-source']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'missing field: ' + id);
  }
});

test('Open SAM.gov Contracting button + paste/structure/save controls', () => {
  assert.ok(/Open SAM\.gov Contracting/.test(HTML) && /gcCaOpenContracting/.test(HTML), 'open contracting');
  assert.ok(/sam\.gov\/contracting/.test(HTML), 'links to sam.gov/contracting');
  assert.ok(/Paste Award Data/.test(HTML) && /gcCaStructurePasted/.test(HTML), 'paste + structure');
  assert.ok(/Save Award Intelligence/.test(HTML) && /gcCaSaveIntel/.test(HTML), 'save award intel');
});

test('safety caveat present; no fabricated awards by default', () => {
  assert.ok(/Award data depends on available public sources\. Verify before relying on it\./.test(HTML), 'verify caveat present');
  assert.ok(/never fabricates? awards?/i.test(HTML), 'no-fabrication statement');
  // default state is an empty placeholder, not seeded award rows
  assert.ok(/id="gc-ca-empty"/.test(HTML), 'empty default state present');
  assert.ok(!/awardee: 'Sample/.test(HTML), 'no seeded sample awardee');
});

test('no complete-incumbent-search claim; no auto-search on load', () => {
  assert.ok(/does not claim a complete incumbent search|no complete-incumbent-search claim/i.test(HTML), 'no complete-incumbent claim');
  assert.ok(!/DOMContentLoaded[\s\S]{0,200}gcCaRunSearch\(/.test(HTML), 'no auto award search on load');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y contract-awards-section checks ===\n`);
process.exit(failed ? 1 : 0);

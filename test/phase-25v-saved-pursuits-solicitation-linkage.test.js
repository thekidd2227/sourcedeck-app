/**
 * Phase 25V — Saved pursuits → Solicitation Workspace linkage test.
 *
 * Asserts that saved/pursuing opportunities feed the Solicitation, Vendors,
 * Pricing, and Prime Partners selectors, that selecting one loads its
 * metadata, and that no SAMPLE demo opportunity is the default.
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-saved-pursuits-solicitation-linkage.test.js
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

console.log('\n=== Phase 25V — Saved pursuits → Solicitation linkage ===\n');

// 1. Saved Pursuits tab shows saved/pursuing opportunities.
test('Saved Pursuits tab reads saved/pursuing opportunities', () => {
  assert.ok(/data-gc-tab="saved-pursuits"/.test(HTML), 'Saved Pursuits tab exists');
  assert.ok(/userStatus === 'saved' \|\| o\.userStatus === 'pursuing'/.test(HTML),
    'Saved Pursuits filters on userStatus saved/pursuing');
});

// 2. Solicitation Workspace selector is fed by saved pursuits.
test('Solicitation Workspace selector linked to saved pursuits', () => {
  assert.ok(/id="gc-sol-opp-select"/.test(HTML), 'Solicitation Workspace selector exists');
  assert.ok(/window\.sd\.govcon\.opportunities\.list/.test(HTML),
    'saved pursuits read from sd.govcon.opportunities.list');
  assert.ok(/function savedPursuits\(\)/.test(HTML) || /savedPursuits\(\)/.test(HTML),
    'savedPursuits() helper present');
  assert.ok(/gcV25SolHook/.test(HTML), 'tab hook wires saved pursuits into selectors');
});

// 3. Selecting a pursuit loads its metadata.
test('selecting a saved pursuit loads solicitation metadata', () => {
  assert.ok(/gcV25RenderSolMeta/.test(HTML), 'metadata renderer present');
  // metadata covers the required fields
  for (const field of ['Title', 'Agency', 'Solicitation', 'NAICS', 'Due date', 'Place of performance', 'Source URL', 'Notes']) {
    assert.ok(new RegExp(field).test(HTML), 'metadata field missing: ' + field);
  }
});

// 4. Empty-state copy when no saved pursuits.
test('empty-state copy when no saved solicitations', () => {
  assert.ok(/No saved solicitations yet\. Save or mark pursue from Find Opportunities, upload a solicitation, or download a package/.test(HTML),
    'empty-state copy present');
});

// 5. No SAMPLE demo opportunity preloaded as default.
test('no SAMPLE demo opportunity is the default selection', () => {
  // The selectors default to a neutral "no solicitation" / "not linked" option.
  assert.ok(/— Not linked —/.test(HTML), 'Solicitation selector default is neutral');
  assert.ok(/— No solicitation selected/.test(HTML), 'Vendors/Pricing/Prime selectors default neutral');
  // SAMPLE opportunity only appears inside the explicit demo loader, never as
  // a default-rendered option value.
  assert.ok(!/<option[^>]*>SAMPLE — Demo Only Opportunity/.test(HTML),
    'SAMPLE demo opportunity must not be a default <option>');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V saved-pursuits-linkage checks ===\n`);
process.exit(failed ? 1 : 0);

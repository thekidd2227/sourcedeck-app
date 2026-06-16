/**
 * Phase 25V — Prime Partners as its own GovCon page test.
 *
 * Asserts Prime Partner Finder is promoted to its own GovCon tab, supports
 * add/edit/delete rows, persists by solicitation id, and sends no outreach.
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-prime-partner-page.test.js
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

console.log('\n=== Phase 25V — Prime Partners page ===\n');

// 1. Prime Partners is its own GovCon tab/page.
test('Prime Partners is its own GovCon tab/page', () => {
  assert.ok(/data-gc-tab="prime-partners"/.test(HTML), 'Prime Partners tab button present');
  assert.ok(/data-gc-tab-page="prime-partners"/.test(HTML), 'Prime Partners tab page present');
  assert.ok(/id="gc-ppf-page"/.test(HTML), 'Prime Partners page section present');
  assert.ok(/>Prime Partners</.test(HTML), 'Prime Partners label present');
});

// 2. Add / edit / delete prime partner rows.
test('Prime Partners supports add/edit/delete rows', () => {
  assert.ok(/id="gc-ppf-intake-form"/.test(HTML), 'prime partner intake form present');
  assert.ok(/gcPpfAddPartner/.test(HTML), 'add prime partner handler present');
  assert.ok(/id="gc-ppf-tbody"/.test(HTML), 'prime partner table body present');
  // The renderer wires per-row edit/delete controls.
  assert.ok(/gcPpfRender/.test(HTML), 'prime partner render handler present');
  assert.ok(/gcPpfDelete|gcPpfRemove|gcPpfEdit|data-ppf-/.test(HTML),
    'prime partner row edit/delete affordance present');
});

// 3. Per-solicitation persistence.
test('prime partner rows persist by solicitation id', () => {
  assert.ok(/id="gc-ppf-sol-select"/.test(HTML), 'prime partner solicitation selector present');
  assert.ok(/gcPpfSolSelect/.test(HTML), 'prime partner selector handler present');
  assert.ok(/sd\.govcon\.primePartners\.bySol\.v1/.test(HTML), 'prime partner per-solicitation archive present');
});

// 4. Moved out of Past Performance into its own page.
test('Prime Partner Finder moved out of Past Performance section', () => {
  const ppStart = HTML.indexOf('data-gc-tab-page="past-performance"');
  // The Past Performance tab page ends where the Prime Partners page begins.
  const ppfPageStart = HTML.indexOf('id="gc-ppf-page"');
  assert.ok(ppStart > 0, 'Past Performance tab page present');
  assert.ok(ppfPageStart > 0, 'Prime Partners page present');
  // The prime partner intake form lives inside the Prime Partners page,
  // which is AFTER the Past Performance page in the document.
  const intakeIdx = HTML.indexOf('id="gc-ppf-intake-form"');
  assert.ok(intakeIdx > ppfPageStart, 'prime partner intake form is inside the Prime Partners page');
});

// 5. No auto-outreach.
test('no prime partner auto-outreach', () => {
  assert.ok(/Partner outreach is not sent from SourceDeck/.test(HTML), 'no-outreach copy preserved');
  assert.ok(!/Send Partner Outreach|Contact Prime/.test(HTML), 'no auto-contact control');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V prime-partner-page checks ===\n`);
process.exit(failed ? 1 : 0);

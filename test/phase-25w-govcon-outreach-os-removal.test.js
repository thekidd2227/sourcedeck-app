/**
 * Phase 25W — GovCon Outreach OS removal sentinel (kept removed).
 *
 * Phase 25V removed the GovCon Outreach OS card. This sentinel asserts it
 * stays gone from every active GovCon tab and that no unsafe send/submit
 * controls exist.
 *
 * Run:  node test/phase-25w-govcon-outreach-os-removal.test.js
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

console.log('\n=== Phase 25W — GovCon Outreach OS removal ===\n');

test('GovCon Outreach OS card is absent from the runtime', () => {
  assert.ok(!/class="gc-os-helper"/.test(HTML), 'gc-os-helper card must be absent');
  assert.ok(!/>GovCon Outreach OS</.test(HTML), '"GovCon Outreach OS" title must be absent');
});

test('Outreach OS journey copy is absent', () => {
  assert.ok(!/Find opportunities → score fit → prepare draft outreach/.test(HTML), 'journey copy absent');
  assert.ok(!/identify prime partners → review and approve/.test(HTML), 'journey tail copy absent');
  assert.ok(!/Drafts only\. Human approval required\. Follow solicitation instructions and communication windows\./.test(HTML), 'outreach drafts-only blurb absent');
});

test('only a small safety footer remains (if any)', () => {
  assert.ok(/Draft-only workspace\. SourceDeck does not submit, upload, or send external messages\./.test(HTML),
    'concise safety footer present');
});

test('no unsafe send/submit controls anywhere', () => {
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email control');
  assert.ok(!/>Submit Bid</.test(HTML), 'no Submit Bid control');
  assert.ok(!/>Submit Quote</.test(HTML), 'no Submit Quote control');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W govcon-outreach-os-removal checks ===\n`);
process.exit(failed ? 1 : 0);

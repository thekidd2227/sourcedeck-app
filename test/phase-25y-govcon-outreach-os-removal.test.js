/**
 * Phase 25Y — GovCon Outreach OS stays removed (incl. Contract Awards tab).
 * Run:  node test/phase-25y-govcon-outreach-os-removal.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — GovCon Outreach OS removal ===\n');

test('GovCon Outreach OS card absent', () => {
  assert.ok(!/class="gc-os-helper"/.test(HTML), 'gc-os-helper absent');
  assert.ok(!/>GovCon Outreach OS</.test(HTML), 'title absent');
});

test('old outreach journey phrase absent', () => {
  assert.ok(!/Find opportunities → score fit → prepare draft outreach/.test(HTML), 'journey copy absent');
  assert.ok(!/identify prime partners → review and approve/.test(HTML), 'journey tail absent');
});

test('no large bottom Human Review Required panels', () => {
  const heavy = (HTML.match(/border:1px solid rgba\(110,31,44,0\.45\)[^>]*>\s*<div[^>]*>Human Review Required<\/div>/g) || []).length;
  assert.strictEqual(heavy, 0, 'heavy Human Review panels absent');
});

test('small safety footer allowed', () => {
  assert.ok(/Draft-only\.|Draft only\./.test(HTML), 'concise draft-only footer present');
});

test('no send/submit/upload controls', () => {
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email');
  assert.ok(!/>Submit Bid</.test(HTML), 'no Submit Bid');
  assert.ok(!/>Submit Quote</.test(HTML), 'no Submit Quote');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y outreach-os-removal checks ===\n`);
process.exit(failed ? 1 : 0);

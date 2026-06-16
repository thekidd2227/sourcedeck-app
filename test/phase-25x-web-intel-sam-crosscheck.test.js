/**
 * Phase 25X — Web Intel ↔ SAM.gov cross-check + verify-on-source labeling.
 *
 * Run:  node test/phase-25x-web-intel-sam-crosscheck.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — Web Intel SAM cross-check ===\n');

test('Check in SAM.gov action exists and queries by solnum/title', () => {
  assert.ok(/Check in SAM\.gov/.test(HTML), 'Check in SAM.gov control present');
  const fn = HTML.slice(HTML.indexOf('window.gcWiCheckSam = async function'), HTML.indexOf('window.gcWiCheckSam = async function') + 1400);
  assert.ok(/sd\.govcon\.samSearch/.test(fn), 'cross-check uses SAM.gov API');
  assert.ok(/filters\.solnum/.test(fn) && /filters\.keyword/.test(fn), 'queries by solnum/title');
});

test('matched → upgrade label; unmatched → verify manually', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcWiCheckSam = async function'), HTML.indexOf('window.gcWiCheckSam = async function') + 1400);
  assert.ok(/samMatched = true/.test(fn), 'sets matched flag');
  assert.ok(/SAM\.gov matched/.test(HTML), 'matched label present');
  assert.ok(/Not matched in SAM\.gov — verify source manually\./.test(HTML), 'unmatched message present');
});

test('saved Web Intel results are labeled verify-on-source, not SAM-verified', () => {
  assert.ok(/Web Intel — verify on source/.test(HTML), 'verify-on-source label present');
  const save = HTML.slice(HTML.indexOf('window.gcWiSave = async function'), HTML.indexOf('window.gcWiSave = async function') + 1400);
  assert.ok(/source: 'Web Intel'/.test(save), 'saved record source is Web Intel');
  assert.ok(/sourceLabel: 'Web Intel — verify on source'/.test(save), 'saved record carries verify-on-source label');
  assert.ok(/Not SAM\.gov-verified until matched\./.test(HTML), 'not-verified-until-matched copy present');
});

test('no auto cross-check on page load', () => {
  assert.ok(!/DOMContentLoaded[\s\S]{0,200}gcWiCheckSam\(/.test(HTML), 'cross-check does not auto-run on load');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X web-intel-sam-crosscheck checks ===\n`);
process.exit(failed ? 1 : 0);

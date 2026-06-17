/**
 * Phase 25Y — Real saved pursuits never show sample/demo extraction sections.
 * Run:  node test/phase-25y-no-sample-extraction-for-real-pursuit.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — No sample extraction for real pursuit ===\n');

test('selecting a pursuit resets demo/foreign extraction before showing it', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcSolResetForSelection = function'), HTML.indexOf('window.gcSolResetForSelection = function') + 700);
  assert.ok(/state\.solId === id && state\.real/.test(fn), 'keeps only this pursuit\'s real extraction');
  assert.ok(/real: false/.test(fn), 'resets to a non-demo empty state otherwise');
  assert.ok(/renderPanels\(fresh\)/.test(fn), 'renders empty panels on mismatch');
});

test('extraction never emits sections without real source text', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcSolExtract = async function'), HTML.indexOf('window.gcSolExtract = async function') + 2200);
  assert.ok(/if \(!text\.trim\(\)\)/.test(fn), 'guards on empty source text');
  assert.ok(/return;/.test(fn), 'returns without generating sections when empty');
});

test('SAMPLE/Demo-Only strings only live inside the explicit demo loader', () => {
  // The demo loader exists (explicit, gated) but sample strings must not be
  // emitted by the extraction path. The extraction function must not contain
  // any "Sample — Demo Only" literal.
  const ex = HTML.slice(HTML.indexOf('function extractFromText('), HTML.indexOf('function extractFromText(') + 2600);
  assert.ok(!/Sample — Demo Only/.test(ex), 'extractor emits no demo strings');
  const solExtract = HTML.slice(HTML.indexOf('window.gcSolExtract = function'), HTML.indexOf('window.gcSolExtract = function') + 1700);
  assert.ok(!/Sample — Demo Only/.test(solExtract), 'gcSolExtract emits no demo strings');
});

test('demo data only loads via explicit operator action (default blank)', () => {
  assert.ok(/onclick="gcDemoLoadSample\(\)"/.test(HTML), 'explicit demo loader control');
  assert.ok(/Demo data not loaded\. Working with operator-entered data only\./.test(HTML), 'default demo state is not-loaded');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y no-sample-extraction checks ===\n`);
process.exit(failed ? 1 : 0);

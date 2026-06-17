/**
 * Phase 25Y — Extract Requirements runs against real source material.
 * Run:  node test/phase-25y-solicitation-extract-real-source.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Extract from real source ===\n');

test('Extract combines pasted text + fetched/imported linked source', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcSolExtract = function'), HTML.indexOf('window.gcSolExtract = function') + 1700);
  assert.ok(/gcW25CollectSourceText\(\)/.test(fn), 'pulls linked source text');
  assert.ok(/extractFromText\(text\)/.test(fn), 'runs extractor over combined text');
  assert.ok(/before extraction/.test(fn), 'asks for source when none present');
});

test('extraction tags the active solicitation + marks it real', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcSolExtract = function'), HTML.indexOf('window.gcSolExtract = function') + 1700);
  assert.ok(/state\.solId =/.test(fn), 'stamps solId');
  assert.ok(/state\.real = true/.test(fn), 'marks extraction as real');
});

test('selecting a pursuit clears foreign/demo extraction', () => {
  assert.ok(/window\.gcSolResetForSelection = function/.test(HTML), 'reset-for-selection present');
  assert.ok(/gcSolResetForSelection\(id\)/.test(HTML), 'reset wired into selection');
});

test('Solicitation Center shows attachments status + needs message', () => {
  assert.ok(/id="gc-sol-source-materials"/.test(HTML), 'source materials panel');
  assert.ok(/No solicitation package selected yet/.test(HTML), 'package-needed guidance');
});

test('extraction output covers the required sections', () => {
  for (const label of ['Solicitation Summary', 'Section L', 'Section M', 'PWS / SOW', 'Required Forms', 'Deadlines', 'Risks', 'Compliance Matrix']) {
    assert.ok(HTML.indexOf(label) >= 0, 'missing output section: ' + label);
  }
});

test('place of performance + POC available from metadata', () => {
  assert.ok(/Place of performance/.test(HTML), 'place of performance shown');
  assert.ok(/Point of contact/.test(HTML), 'point of contact shown');
});

test('no send/submit/upload controls in the workspace', () => {
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email');
  assert.ok(!/>Submit Bid</.test(HTML), 'no Submit Bid');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y extract-real-source checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 25W — Extract Requirements from linked saved-pursuit source.
 *
 * Asserts the local extractor turns source text into a structured
 * Solicitation Summary + FAR-aligned sections + compliance matrix starter,
 * that Extract Requirements prefers package extraction and retains linked source fallback,
 * and that no legal-certification claim is made.
 *
 * Run:  node test/phase-25w-extract-requirements-linked-source.test.js
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

console.log('\n=== Phase 25W — Extract Requirements linked source ===\n');

test('Extract Requirements prefers package extraction + keeps linked source fallback', () => {
  const start = HTML.indexOf('window.gcSolExtract = function');
  const body = HTML.slice(start, start + 1800);
  assert.ok(/gcABExtractPackageToCenter/.test(body), 'package extraction path present');
  assert.ok(/gcW25CollectSourceText\(\)/.test(body), 'extract pulls linked description/imported text');
  assert.ok(/extractFromText\(text\)/.test(body), 'extract runs the local extractor over combined text');
});

test('extractor produces a Solicitation Summary + structured sections', () => {
  const start = HTML.indexOf('function extractFromText(');
  const body = HTML.slice(start, start + 2200);
  assert.ok(/summary:/.test(body), 'summary produced');
  for (const key of ['sectionL', 'sectionM', 'pws', 'forms', 'deadlines', 'risks']) {
    assert.ok(body.indexOf(key) >= 0, 'extractor section missing: ' + key);
  }
});

test('compliance matrix starter is built from the extraction', () => {
  assert.ok(/function buildMatrixFromExtraction\(/.test(HTML), 'compliance matrix starter builder present');
  assert.ok(/gcSolBuildMatrix/.test(HTML), 'build matrix handler present');
});

test('extraction output panels cover the required sections', () => {
  for (const label of ['Section L', 'Section M', 'PWS / SOW', 'Required Forms', 'Deadlines', 'Risks', 'Compliance Matrix']) {
    assert.ok(HTML.indexOf(label) >= 0, 'output section label missing: ' + label);
  }
});

test('no positive legal-certification claim (negative posture preserved)', () => {
  // "certified compliant" / "legal advice" only appear inside negative
  // disclaimers ("This is not legal advice", 'never says "certified compliant"').
  // Assert those disclaimers exist and that no positive claim is emitted.
  assert.ok(/never says "certified compliant"/.test(HTML), 'negative "certified compliant" posture documented');
  assert.ok(/not legal advice/i.test(HTML), '"not legal advice" disclaimer present');
  // The extractor must not stamp a certification onto its output.
  const exStart = HTML.indexOf('window.gcSolExtract = function');
  const exBody = HTML.slice(exStart, exStart + 900);
  assert.ok(!/certified compliant/i.test(exBody), 'extract output makes no certification claim');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W extract-requirements-linked-source checks ===\n`);
process.exit(failed ? 1 : 0);

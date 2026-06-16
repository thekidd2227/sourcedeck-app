/**
 * Phase 25V — Stakeholder Graph removal test.
 *
 * Asserts the Stakeholder Graph feature (UI section, sample rows, nav/tour
 * reference, and JS handlers) is fully removed from the runtime, with no
 * hidden sidebar link left behind.
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-stakeholder-graph-removal.test.js
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

console.log('\n=== Phase 25V — Stakeholder Graph removal ===\n');

// 1. Section removed.
test('Stakeholder Graph section removed', () => {
  assert.ok(!/id="gc-stakeholder-graph"/.test(HTML), '#gc-stakeholder-graph must be removed');
  assert.ok(!/class="gc-stakeholder-graph"/.test(HTML), 'gc-stakeholder-graph class must be removed');
  assert.ok(!/data-section="govcon-stakeholder-graph"/.test(HTML), 'stakeholder data-section must be removed');
});

// 2. Sub-maps removed.
test('Stakeholder maps removed', () => {
  for (const id of ['gc-stakeholder-by-opportunity','gc-stakeholder-by-agency','gc-stakeholder-teaming','gc-stakeholder-internal-owner']) {
    assert.ok(!new RegExp('id="' + id + '"').test(HTML), id + ' must be removed');
  }
  assert.ok(!/Opportunity stakeholder map/.test(HTML), 'Opportunity stakeholder map removed');
  assert.ok(!/Account \/ agency stakeholder map/.test(HTML), 'Account/agency stakeholder map removed');
});

// 3. Sample stakeholder rows removed.
test('Stakeholder sample rows removed', () => {
  assert.ok(!/data-stakeholder-category=/.test(HTML), 'stakeholder sample rows must be removed');
  assert.ok(!/data-stakeholder-warning=/.test(HTML), 'stakeholder restricted warnings must be removed');
});

// 4. JS handlers removed.
test('Stakeholder Graph JS handlers removed', () => {
  assert.ok(!/window\.gcLoadStakeholderGraph/.test(HTML), 'gcLoadStakeholderGraph must be removed');
  assert.ok(!/window\.gcRenderStakeholderGraph/.test(HTML), 'gcRenderStakeholderGraph must be removed');
  assert.ok(!/function gcSyntheticInternalOwner/.test(HTML), 'gcSyntheticInternalOwner must be removed');
});

// 5. No nav/tour link left.
test('no Stakeholder Graph nav/tour link remains', () => {
  assert.ok(!/data-tour-feature="stakeholder-graph"/.test(HTML), 'stakeholder tour feature must be removed');
  assert.ok(!/<button[^>]*data-tab="stakeholder/.test(HTML), 'no stakeholder sidebar/nav button');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V stakeholder-removal checks ===\n`);
process.exit(failed ? 1 : 0);

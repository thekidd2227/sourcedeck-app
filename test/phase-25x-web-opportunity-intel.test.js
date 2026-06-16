/**
 * Phase 25X — Web Opportunity Intel placement + form + output.
 *
 * Asserts Web Intel lives inside GovCon → Find Opportunities (internal mode,
 * not a sidebar tab, not a second SAM search), with the full parameter set,
 * output table, and active-only parsing.
 *
 * Run:  node test/phase-25x-web-opportunity-intel.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — Web Opportunity Intel ===\n');

const FIND = HTML.slice(HTML.indexOf('id="gc-tab-find-opportunities"'), HTML.indexOf('<!-- /gc-find-mode-web -->'));

test('Web Intel is an internal mode of Find Opportunities (not a sidebar tab)', () => {
  assert.ok(/id="gc-find-mode-toggle"/.test(FIND), 'mode toggle present');
  assert.ok(/data-gc-find-mode="sam"/.test(FIND), 'SAM mode button present');
  assert.ok(/data-gc-find-mode="web"/.test(FIND), 'Web Intel mode button present');
  assert.ok(/id="gc-find-mode-web"/.test(FIND), 'Web Intel panel present');
  assert.ok(!/data-tab="samsearch"/.test(HTML), 'no standalone SAM Search sidebar tab');
  assert.ok(!/data-tab="webintel"/.test(HTML), 'no Web Intel sidebar tab');
});

test('SAM.gov API search is the default mode and remains canonical', () => {
  assert.ok(/data-gc-find-mode="sam" aria-selected="true"/.test(FIND), 'SAM mode default selected');
  assert.ok(/id="gc-find-mode-sam"/.test(FIND), 'SAM search panel preserved');
  assert.ok(/id="gc-tab-sam-filters"/.test(FIND), 'canonical SAM filter row preserved');
  // exactly one SAM filter row (no duplicate SAM search section)
  assert.strictEqual((HTML.match(/data-gc-tab-sam-filters="true"/g) || []).length, 1, 'exactly one SAM search filter row');
});

test('Web Intel form has the full parameter set', () => {
  for (const id of ['gc-wi-naics','gc-wi-setaside','gc-wi-pop','gc-wi-agency','gc-wi-type','gc-wi-dollars','gc-wi-deadline','gc-wi-keywords','gc-wi-source-group','gc-wi-max']) {
    assert.ok(new RegExp('id="' + id + '"').test(FIND), 'missing web intel field: ' + id);
  }
  for (const sg of ['federal','defense','civilian','state-local','aggregators']) {
    assert.ok(new RegExp('value="' + sg + '"').test(FIND), 'missing source group: ' + sg);
  }
  for (const mx of ['10','25','50']) assert.ok(new RegExp('<option value="' + mx + '"').test(FIND), 'missing max-results option: ' + mx);
});

test('run / plan / copy / paste controls exist, no auto-run', () => {
  assert.ok(/Run Web Intel Search/.test(FIND) && /gcWiRunSearch/.test(HTML), 'run search control');
  assert.ok(/Generate Search Plan/.test(FIND) && /gcWiGenerateSearchPlan/.test(HTML), 'generate plan control');
  assert.ok(/Copy Search Prompt/.test(FIND) && /gcWiCopyPrompt/.test(HTML), 'copy prompt control');
  assert.ok(/Paste Web Search Results for Structuring/.test(FIND) && /gcWiStructurePasted/.test(HTML), 'paste-results control');
  // no auto-run: run only fires from explicit button onclick
  assert.ok(!/DOMContentLoaded[\s\S]{0,200}gcWiRunSearch\(\)/.test(HTML), 'web search does not auto-run on load');
});

test('output table + actions exist', () => {
  assert.ok(/id="gc-wi-results"/.test(FIND), 'results container');
  assert.ok(/function renderResults\(/.test(HTML), 'results renderer');
  for (const a of ['gcWiOpenSource','gcWiSave','gcWiSendToWorkspace','gcWiCheckSam','gcWiAddNote']) {
    assert.ok(HTML.indexOf(a) >= 0, 'missing action: ' + a);
  }
});

test('parser is active-only and requires title + source URL', () => {
  const pr = HTML.slice(HTML.indexOf('function parseResults('), HTML.indexOf('function parseResults(') + 2200);
  assert.ok(/expired\|awarded\|cancell\|closed/.test(pr), 'drops expired/awarded/cancelled/closed');
  assert.ok(/!title \|\| !\/\^https\?:/.test(pr), 'requires title + source URL');
  assert.ok(/duplicate/.test(pr), 'flags duplicates');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X web-opportunity-intel checks ===\n`);
process.exit(failed ? 1 : 0);

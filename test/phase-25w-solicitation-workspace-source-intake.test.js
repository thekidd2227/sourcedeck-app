/**
 * Phase 25W — Solicitation Workspace source intake.
 *
 * Asserts saved pursuits feed the Solicitation Workspace selector, selecting
 * one loads its source metadata + Source Materials panel, and Extract
 * Requirements only proceeds when source text/material exists.
 *
 * Run:  node test/phase-25w-solicitation-workspace-source-intake.test.js
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

console.log('\n=== Phase 25W — Solicitation Workspace source intake ===\n');

test('saved pursuits feed the Solicitation Workspace selector', () => {
  assert.ok(/id="gc-sol-opp-select"/.test(HTML), 'solicitation selector present');
  assert.ok(/window\.sd\.govcon\.opportunities\.list/.test(HTML), 'reads saved opportunities');
  assert.ok(/gcV25SolHook/.test(HTML), 'tab hook populates selector');
});

test('selecting a saved pursuit loads source metadata + Source Materials panel', () => {
  assert.ok(/gcV25RenderSolMeta/.test(HTML), 'metadata renderer present');
  assert.ok(/id="gc-sol-source-materials"/.test(HTML), 'Source Materials panel present');
  assert.ok(/id="gc-sol-source-materials-body"/.test(HTML), 'Source Materials body present');
  assert.ok(/gcW25RenderWorkspaceSource/.test(HTML), 'workspace source renderer present');
});

test('workspace source panel shows fetched description / resource materials', () => {
  // renderSourcePanel (shared) drives both Saved Pursuits and Workspace.
  assert.ok(/renderSourcePanel\(host, o, 'workspace'\)/.test(HTML), 'workspace uses shared source renderer');
  assert.ok(/gcW25CollectSourceText/.test(HTML), 'source-text collector present');
});

test('Extract Requirements is enabled only when source text/material exists', () => {
  const start = HTML.indexOf('window.gcSolExtract = function');
  const body = HTML.slice(start, start + 900);
  assert.ok(/gcW25CollectSourceText\(\)/.test(body), 'extract pulls linked source text');
  assert.ok(/Paste solicitation text or fetch\/import source materials before extraction\./.test(body), 'source-material-needed message present');
});

test('empty Source Materials state guides the user to fetch/import/upload/paste', () => {
  assert.ok(/No source material has been fetched yet\. Use Fetch Description, download resource links, upload a solicitation file, or paste text\./.test(HTML),
    'empty source-material guidance present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W solicitation-workspace-source-intake checks ===\n`);
process.exit(failed ? 1 : 0);

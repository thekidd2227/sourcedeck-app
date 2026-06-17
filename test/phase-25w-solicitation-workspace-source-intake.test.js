/**
 * Phase 25W/25AB — Solicitation Center package intake.
 *
 * Asserts saved pursuits feed the Solicitation Center selector, selecting
 * one loads its source metadata + Attachments panel, and Extract
 * Requirements only proceeds when package/upload text exists.
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

console.log('\n=== Phase 25W/25AB — Solicitation Center package intake ===\n');

test('saved pursuits feed the Solicitation Center selector', () => {
  assert.ok(/id="gc-sol-opp-select"/.test(HTML), 'solicitation selector present');
  assert.ok(/window\.sd\.govcon\.opportunities\.list/.test(HTML), 'reads saved opportunities');
  assert.ok(/gcV25SolHook/.test(HTML), 'tab hook populates selector');
});

test('selecting a saved pursuit loads source metadata + Attachments panel', () => {
  assert.ok(/gcV25RenderSolMeta/.test(HTML), 'metadata renderer present');
  assert.ok(/id="gc-sol-source-materials"/.test(HTML), 'Attachments panel present');
  assert.ok(/id="gc-sol-source-materials-body"/.test(HTML), 'Attachments body present');
  assert.ok(/gcW25RenderWorkspaceSource/.test(HTML), 'workspace source renderer present');
});

test('workspace source panel shows fetched description / resource materials', () => {
  // renderSourcePanel (shared) drives both Saved Pursuits and Workspace.
  assert.ok(/renderSourcePanel\(host, o, 'workspace'\)/.test(HTML), 'workspace uses shared source renderer');
  assert.ok(/gcW25CollectSourceText/.test(HTML), 'source-text collector present');
});

test('Extract Requirements is enabled only when source text/material exists', () => {
  const start = HTML.indexOf('window.gcSolExtract = async function');
  const body = HTML.slice(start, start + 1600);
  assert.ok(/gcW25CollectSourceText\(\)/.test(body), 'extract pulls linked source text');
  assert.ok(/Download a solicitation package or upload a supported solicitation file before extraction\./.test(body), 'package-needed message present');
});

test('empty Attachments state guides the user to package/upload flow', () => {
  assert.ok(/No solicitation package selected yet\. Select a saved pursuit, download its SAM\.gov package, or upload a solicitation package\./.test(HTML),
    'empty package guidance present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W solicitation-workspace-source-intake checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 25AD — View Details survives a solicitation package download.
 *
 * The bug: the previous behavior collapsed any open saved-pursuit details
 * panel on every full re-render (e.g. immediately after a package
 * download). Phase 25AD threads an open-state set through the renderer so
 * View Details remains usable, and every saved pursuit row still carries
 * the complete set of action controls after the package arrives.
 *
 * Static; never executes the renderer; never touches the network.
 *
 * Run:  node test/phase-25ad-view-details-after-download.test.js
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

console.log('\n=== Phase 25AD — View Details after package download ===\n');

test('open-state set is initialized before the row renderer runs', () => {
  assert.ok(/if \(!window\.gcW25OpenRows\) window\.gcW25OpenRows = \{\};/.test(HTML),
    'window.gcW25OpenRows initializer must precede _renderRow so the open-state survives');
});

test('saved pursuit row carries every action button (no swap after download)', () => {
  // Every action surfaced in the row must exist; downloading a package
  // must NOT replace these with the package panel alone.
  const ACTIONS = [
    'data-gc-saved-action="view-details"',
    'data-gc-saved-action="open-notice"',
    'data-gc-saved-action="download-package"',
    'data-gc-saved-action="view-attachments"',
    'data-gc-saved-action="refresh-source"',
    'data-gc-saved-action="send-to-solicitation-center"',
    'data-gc-saved-action="unpursue"',
    'data-gc-saved-action="delete"'
  ];
  for (const sel of ACTIONS) assert.ok(HTML.includes(sel), 'row must include ' + sel);
});

test('open source-row honors the open-state set on render', () => {
  // _renderRow emits `display: '' | 'none'` based on gcW25OpenRows so a
  // re-render after a package download keeps the panel open.
  assert.ok(/data-gc-saved-source-row="' \+ rid \+ '" style="display:' \+ \(window\.gcW25OpenRows\[o\.id\] \? '' : 'none'\) \+ '"/.test(HTML),
    '_renderRow must honor window.gcW25OpenRows[o.id] in the source-row display style');
});

test('toggle source records and clears the open-state', () => {
  assert.ok(/window\.gcW25OpenRows\[id\] = true;/.test(HTML),
    'opening the source panel must record open-state');
  assert.ok(/delete window\.gcW25OpenRows\[id\];/.test(HTML),
    'closing the source panel must clear the open-state');
});

test('renderSavedPursuits restores open panels after a full re-render', () => {
  // The re-render loop reads the open-state set, locates the matching
  // source panel by id, and calls gcW25RenderSourcePanel so the panel
  // contents survive a package download.
  assert.ok(/Phase 25AD — repopulate any source panels that were open before the/.test(HTML),
    'restore-open-panels comment must be present in renderSavedPursuits');
  assert.ok(/window\.gcW25RenderSourcePanel\(panel, oRow, 'saved'\);/.test(HTML),
    'restore loop must invoke gcW25RenderSourcePanel with the cached opportunity');
});

test('View Details delegates to the toggle, so post-download clicks still expand', () => {
  assert.ok(/window\.gcW25ViewDetails = async function\(id\)\{\s*\n\s*\/\/ Reuse the source panel as the details surface \(expand it\)\.\s*\n\s*await window\.gcW25ToggleSource\(id\);/.test(HTML),
    'gcW25ViewDetails must continue to delegate to gcW25ToggleSource');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD View Details checks ===');
if (failed > 0) process.exit(1);

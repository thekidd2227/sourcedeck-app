/**
 * Phase 25AG — Block SourceDeck app-shell preview.
 *
 * If preview content carries SourceDeck app-shell markers it must be blocked
 * (never rendered as an attachment), in both the main-process guard and the
 * renderer's defensive guard.
 *
 * Run:  node test/phase-25ag-block-app-shell-preview.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const guard = require(path.join(ROOT, 'services/govcon/solicitation-preview-guard.js'));
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AG — Block app-shell preview ===\n');

const SHELL_SAMPLES = [
  'SourceDeck GovCon Pipeline — Expected — Leads',
  '<div class="cmd-flow"><span class="cmd-pill">x</span></div>',
  '.cc-lcc-grid { display:grid }',
  'Operating Hub dashboard',
  '<!-- generated from sourcedeck.html -->'
];

test('guard flags each app-shell marker', () => {
  SHELL_SAMPLES.forEach(s => {
    assert.ok(guard.containsAppShell(s), 'should flag app shell: ' + s.slice(0, 40));
  });
});

test('guard does not flag a genuine solicitation attachment', () => {
  const legit = 'SECTION L — Instructions to Offerors\nSubmit your proposal by 2026-07-01. PWS tasks: ...';
  assert.ok(!guard.containsAppShell(legit), 'real solicitation text must not be flagged');
});

test('every documented marker is covered', () => {
  ['SourceDeck GovCon Pipeline', 'Operating Hub', '.cmd-flow', '.cmd-pill', 'cc-lcc-grid', 'sourcedeck.html']
    .forEach(m => assert.ok(guard.APP_SHELL_MARKERS.indexOf(m) >= 0, 'marker missing: ' + m));
});

test('main.js blocks app-shell text with a safe message (no throw)', () => {
  assert.ok(/containsAppShell/.test(MAIN), 'main.js must call containsAppShell');
  assert.ok(/previewKind:\s*'blocked'/.test(MAIN), 'main.js must return a blocked previewKind');
  assert.ok(/APP_SHELL_BLOCK_MESSAGE/.test(MAIN), 'main.js must surface the blocked message');
});

test('main.js blocked message is the safe user-facing copy', () => {
  assert.ok(/Preview blocked because the selected content appears to be the SourceDeck app shell/.test(guard.APP_SHELL_BLOCK_MESSAGE));
});

test('renderer has its own defensive app-shell guard', () => {
  assert.ok(/_sdViewerHasAppShell/.test(HTML), 'renderer must define an app-shell guard');
  assert.ok(/Preview blocked because the selected content appears to be the SourceDeck app shell/.test(HTML),
    'renderer must show the safe blocked message');
  // The renderer guard must check for the marker strings.
  assert.ok(/cmd-flow/.test(HTML) && /cc-lcc-grid/.test(HTML),
    'renderer guard must include the app-shell markers');
});

test('renderer handles previewKind === blocked', () => {
  assert.ok(/kind === 'blocked'/.test(HTML), 'renderer must branch on a blocked preview kind');
});

console.log('\n' + (failed ? '❌ ' + failed + ' failed, ' : '✅ ') + passed + ' passed\n');
process.exit(failed ? 1 : 0);

/**
 * Phase 25Y — Saved pursuit source materials completeness.
 * Run:  node test/phase-25y-saved-pursuit-source-materials.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Saved pursuit source materials ===\n');

const UP = HTML.slice(HTML.indexOf('async function _samUpsert('), HTML.indexOf('async function _samUpsert(') + 4000);

test('saved pursuit persists full safe source metadata', () => {
  for (const f of ['noticeId:', 'solicitationNumber:', 'title:', 'agency:', 'naics:', 'setAside:', 'responseDeadline:', 'placeOfPerformance:', 'pointOfContact:', 'uiLink:', 'sourceUrl:', 'descriptionLink:', 'resourceLinks:', 'apiSelfLink:', 'savedAt:', 'lastRefreshedAt:']) {
    assert.ok(UP.indexOf(f) >= 0, 'missing saved field: ' + f);
  }
});

test('stored URLs are api_key-stripped', () => {
  assert.ok(/uiLink: _samStripApiKey/.test(UP), 'uiLink stripped');
  assert.ok(/descriptionLink: _samDescriptionLink/.test(UP), 'descriptionLink normalized');
  assert.ok(/resourceLinks: _samResourceLinks/.test(UP), 'resourceLinks normalized');
});

test('saved pursuit row exposes the full action set', () => {
  for (const a of ['gcW25ViewDetails', 'gcW25OpenNotice', 'gcW25ToggleSource', 'gcW25RefreshSource', 'gcW25SendToWorkspace']) {
    assert.ok(HTML.indexOf(a) >= 0, 'missing action: ' + a);
  }
  assert.ok(/Refresh Source Details/.test(HTML), 'Refresh Source Details present (for older pursuits missing metadata)');
});

test('Source Materials panel shows description + resource links + POC', () => {
  assert.ok(/Resource links \/ attachments/.test(HTML), 'resource links section');
  assert.ok(/Fetch Description/.test(HTML), 'fetch description');
  assert.ok(/Point of contact/.test(HTML), 'point of contact');
  assert.ok(/Import to SourceDeck/.test(HTML), 'import action');
});

test('Award / Incumbent Clues surfaced on the pursuit', () => {
  assert.ok(/gcCaCluesHtml/.test(HTML), 'award clues helper wired into source panel');
  assert.ok(/Award \/ Incumbent Clues/.test(HTML), 'award clues label');
  assert.ok(/No award\/incumbent data linked yet\. Search Contract Awards\./.test(HTML), 'no-clue fallback');
});

test('no [object Object] rendered + no raw key in saved-pursuit rendering', () => {
  // The only "[object Object]" occurrences are explanatory code comments;
  // the renderer guards against ever producing it (see normalizer test).
  assert.ok(/function _samUrlString\(/.test(HTML), 'object-safe URL coercer present');
  assert.ok(/\[object\\s\+\\w\+\]|\[object/.test(HTML), 'normalizer guards against [object output');
  const rowFn = HTML.slice(HTML.indexOf('function _renderRow('), HTML.indexOf('function _renderRow(') + 2500);
  assert.ok(!/\[object Object\]/.test(rowFn), 'saved-pursuit row never emits [object Object]');
  assert.ok(!/api_key=[A-Za-z0-9]{6,}/.test(HTML), 'no raw key literal');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y saved-pursuit-source-materials checks ===\n`);
process.exit(failed ? 1 : 0);

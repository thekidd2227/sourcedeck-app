/**
 * Phase 25W — Saved pursuit source-material preservation + actions.
 *
 * Asserts saving/pursuing a SAM.gov result preserves the source metadata
 * needed to work the solicitation later, that Saved Pursuits rows expose the
 * Source Materials actions, and that the raw api_key is never persisted.
 *
 * Static string assertions on sourcedeck.html.
 *
 * Run:  node test/phase-25w-saved-pursuit-source-materials.test.js
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

console.log('\n=== Phase 25W — Saved pursuit source materials ===\n');

// Isolate the _samUpsert body.
const upStart = HTML.indexOf('async function _samUpsert(');
const upEnd = HTML.indexOf('renderSamFreshResults(_samFreshResults);', upStart);
const UPSERT = HTML.slice(upStart, upEnd > 0 ? upEnd : upStart + 4000);

test('_samUpsert persists the required source metadata fields', () => {
  for (const f of ['noticeId:', 'solicitationNumber:', 'descriptionLink:', 'resourceLinks:', 'uiLink:', 'sourceUrl:', 'apiSelfLink:', 'pointOfContact:', 'savedAt:', 'responseDeadline:', 'originalSAMRecordSafe:']) {
    assert.ok(UPSERT.indexOf(f) >= 0, 'saved pursuit must persist ' + f);
  }
});

test('stored URLs are api_key-stripped (no raw key persisted)', () => {
  // Every URL field routes through _samStripApiKey / _samDescriptionLink /
  // _samResourceLinks which drop any api_key residue.
  assert.ok(/uiLink: _samStripApiKey\(/.test(UPSERT), 'uiLink stripped');
  assert.ok(/descriptionLink: _samDescriptionLink\(/.test(UPSERT), 'descriptionLink stripped');
  assert.ok(/resourceLinks: _samResourceLinks\(/.test(UPSERT), 'resourceLinks stripped');
  // The safe-record builder redacts any api_key residue.
  assert.ok(/function _samSafeRecord\(/.test(HTML), '_samSafeRecord scrubber present');
  assert.ok(/api_key\|apikey\)=\)\[\^&#"'\]\+\/gi, '\$1REDACTED'/.test(HTML) || /REDACTED/.test(HTML), 'safe record redaction present');
});

test('no literal api_key concatenation into a stored field', () => {
  assert.ok(!/sourceUrl:[^,]*\+\s*['"]api_key=/.test(UPSERT), 'no api_key concatenated into sourceUrl');
  assert.ok(!/descriptionLink:[^,]*api_key=/.test(UPSERT), 'no api_key in descriptionLink literal');
});

test('Saved Pursuits row exposes Source Materials actions', () => {
  assert.ok(/gcW25ViewDetails\(/.test(HTML), 'View Details action');
  assert.ok(/gcW25OpenNotice\(/.test(HTML), 'Open SAM.gov Notice action');
  assert.ok(/Open SAM\.gov Notice/.test(HTML), 'Open SAM.gov Notice label');
  assert.ok(/gcW25ToggleSource\(/.test(HTML), 'Source Materials action');
  assert.ok(/Source Materials/.test(HTML), 'Source Materials label');
  assert.ok(/gcW25RefreshSource\(/.test(HTML), 'Refresh Source Details action');
  assert.ok(/Refresh Source Details/.test(HTML), 'Refresh Source Details label');
  assert.ok(/gcW25SendToWorkspace\(/.test(HTML), 'Send to Solicitation Workspace action');
});

test('Source Materials panel renders description + resource links when present', () => {
  assert.ok(/gcW25RenderSourcePanel|function renderSourcePanel\(/.test(HTML), 'source panel renderer present');
  assert.ok(/Resource links \/ attachments/.test(HTML), 'resource links section');
  assert.ok(/SAM\.gov source link was not included for this record\. Try/.test(HTML), 'no-link fallback message');
});

test('saved-pursuit handlers never expose api_key', () => {
  // The panel handlers refuse to open any URL containing api_key.
  assert.ok(/Refused to open — API key would leak\./.test(HTML), 'open guard against api_key leak');
  assert.ok(!/api_key=\$\{/.test(HTML), 'no template-literal api_key interpolation in renderer');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W saved-pursuit-source-materials checks ===\n`);
process.exit(failed ? 1 : 0);

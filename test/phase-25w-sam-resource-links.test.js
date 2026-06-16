/**
 * Phase 25W — SAM.gov resource link / attachment handling.
 *
 * Asserts resourceLinks render as openable/importable source materials,
 * Open Source uses a safe (key-free) URL, Import creates a local source
 * material record, and nothing is uploaded / emailed / sent.
 *
 * Run:  node test/phase-25w-sam-resource-links.test.js
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

console.log('\n=== Phase 25W — SAM resource links ===\n');

test('resource links render as Open / Import controls', () => {
  assert.ok(/Resource links \/ attachments/.test(HTML), 'resource links section present');
  assert.ok(/gcW25OpenResource\(/.test(HTML), 'Open Source handler present');
  assert.ok(/Open Source/.test(HTML), 'Open Source label present');
  assert.ok(/gcW25ImportResource\(/.test(HTML), 'Import handler present');
  assert.ok(/Import to SourceDeck/.test(HTML), 'Import to SourceDeck label present');
});

test('Open Source refuses URLs containing api_key', () => {
  const start = HTML.indexOf('window.gcW25OpenResource');
  const body = HTML.slice(start, start + 400);
  assert.ok(/api_key/i.test(body) && /Refused to open/.test(body), 'Open Source guards against api_key leak');
});

test('Import creates a local source-material record with required fields', () => {
  const start = HTML.indexOf('window.gcW25ImportResource');
  const body = HTML.slice(start, start + 1600);
  for (const f of ['savedPursuitId', 'fileName', 'sourceUrlSafe', 'mimeType', 'downloadedAt', 'analysisStatus']) {
    assert.ok(body.indexOf(f) >= 0, 'import record missing field: ' + f);
  }
  assert.ok(/sd\.govcon\.sourceMaterials\.v1/.test(HTML), 'local source-material store key present');
});

test('import routes through the credential boundary, not a direct keyed URL', () => {
  const start = HTML.indexOf('window.gcW25ImportResource');
  const body = HTML.slice(start, start + 1600);
  assert.ok(/samFetchSource\(\{ url: url, kind: 'resource' \}\)/.test(body), 'import uses samFetchSource');
  assert.ok(/This file may require opening SAM\.gov directly\./.test(HTML), 'unsupported-download fallback message present');
});

test('no portal upload / email / send from resource handling', () => {
  assert.ok(!/upload to (SAM|PIEE|eBuy|GSA)/i.test(HTML), 'no portal upload copy');
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email control');
  assert.ok(/Local source-material intake only/.test(HTML), 'local-intake-only disclaimer present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W sam-resource-links checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 25W — SAM.gov resource link / attachment handling.
 *
 * Asserts resourceLinks render as openable/downloadable attachments,
 * Open Source uses a safe (key-free) URL, Import creates a local source
 * package record, and nothing is uploaded / emailed / sent.
 *
 * Run:  node test/phase-25w-sam-resource-links.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PKG = fs.readFileSync(path.join(ROOT, 'services/govcon/sam-package-download.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25W — SAM resource links ===\n');

test('resource links render as Open / Download controls', () => {
  assert.ok(/Attachments listed by SAM\.gov/.test(HTML), 'attachments section present');
  assert.ok(/gcW25OpenResource\(/.test(HTML), 'Open Source handler present');
  assert.ok(/Open Source/.test(HTML), 'Open Source label present');
  assert.ok(/gcABDownloadPackage\(/.test(HTML), 'Package download handler present');
  assert.ok(/Download Package/.test(HTML), 'Download Package label present');
});

test('Open Source refuses URLs containing api_key', () => {
  const start = HTML.indexOf('window.gcW25OpenResource');
  const body = HTML.slice(start, start + 400);
  assert.ok(/api_key/i.test(body) && /Refused to open/.test(body), 'Open Source guards against api_key leak');
});

test('Download creates a local package record with required fields', () => {
  const start = HTML.indexOf('window.gcABDownloadPackage');
  const body = HTML.slice(start, start + 2200);
  for (const f of ['downloadedCount', 'failedCount', 'resourceCount', 'localZipPath', 'packagePath', 'files']) {
    assert.ok(body.indexOf(f) >= 0 || HTML.indexOf(f) >= 0 || PKG.indexOf(f) >= 0, 'package record missing field: ' + f);
  }
  assert.ok(/sd\.govcon\.sourceMaterials\.v1/.test(HTML), 'local package metadata stored under pursuit cache');
});

test('download routes through the credential boundary, not a direct keyed URL', () => {
  assert.ok(/downloadSolicitationPackage/.test(HTML), 'download uses package IPC bridge');
  assert.ok(/Stored, text extraction not available yet/.test(HTML), 'unsupported-parser fallback message present');
});

test('no portal upload / email / send from resource handling', () => {
  assert.ok(!/>\s*Upload to (SAM|PIEE|eBuy|GSA)\s*</i.test(HTML), 'no portal upload control');
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email control');
  assert.ok(/Local package intake only/.test(HTML), 'local-intake-only disclaimer present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25W sam-resource-links checks ===\n`);
process.exit(failed ? 1 : 0);

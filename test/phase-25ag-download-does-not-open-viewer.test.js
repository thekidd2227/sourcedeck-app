/**
 * Phase 25AG — Download must not auto-open the viewer.
 *
 * Clicking "Download Solicitation Package" downloads files and updates the
 * package state/status only. It must NOT open the right-side viewer or
 * auto-preview any file. The viewer opens only when the user clicks View on
 * a downloaded attachment.
 *
 * Run:  node test/phase-25ag-download-does-not-open-viewer.test.js
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

console.log('\n=== Phase 25AG — Download does not open viewer ===\n');

function sliceFn(name) {
  const start = HTML.indexOf('window.' + name + ' = ');
  assert.ok(start >= 0, name + ' not found');
  // Find the matching end heuristically: next "window." top-level assignment.
  const after = HTML.indexOf('\n  window.', start + 10);
  return HTML.slice(start, after > start ? after : start + 4000);
}

const downloadFn = sliceFn('gcABDownloadPackage');

test('download handler does not call gcACPreviewFile', () => {
  assert.ok(!/gcACPreviewFile/.test(downloadFn),
    'download must not invoke the preview populator');
});

test('download handler does not open the right-side viewer', () => {
  assert.ok(!/sdRightFileViewerOpen/.test(downloadFn),
    'download must not open the viewer');
});

test('download handler does not auto-select / auto-view a file', () => {
  assert.ok(!/gcABViewAttachment/.test(downloadFn),
    'download must not auto-trigger View on any attachment');
});

test('viewer is hidden by default in the DOM', () => {
  const aside = HTML.slice(HTML.indexOf('id="sd-right-file-viewer"'),
    HTML.indexOf('id="sd-right-file-viewer"') + 600);
  assert.ok(/\bhidden\b/.test(aside), 'viewer must carry the hidden attribute by default');
  assert.ok(/aria-hidden="true"/.test(aside), 'viewer must be aria-hidden by default');
});

test('viewer open is reached only through gcACPreviewFile (the View path)', () => {
  // sdRightFileViewerOpen is called inside gcACPreviewFile (View path) and
  // defined once; it must not be called from the download handler.
  const previewFn = sliceFn('gcACPreviewFile');
  assert.ok(/sdRightFileViewerOpen/.test(previewFn),
    'View path (gcACPreviewFile) is the only opener');
});

test('only the View button wires gcABViewAttachment → gcACPreviewFile', () => {
  // The View button calls gcABViewAttachment, which calls gcACPreviewFile.
  assert.ok(/onclick="gcABViewAttachment\(/.test(HTML), 'View button must call gcABViewAttachment');
  const viewFn = sliceFn('gcABViewAttachment');
  assert.ok(/gcACPreviewFile/.test(viewFn), 'View must populate the viewer via gcACPreviewFile');
});

test('default viewer body invites an explicit View click (no persistent file dump)', () => {
  assert.ok(/Click <strong>View<\/strong> on a downloaded attachment/.test(HTML),
    'idle viewer body must prompt for an explicit View click');
});

console.log('\n' + (failed ? '❌ ' + failed + ' failed, ' : '✅ ') + passed + ' passed\n');
process.exit(failed ? 1 : 0);

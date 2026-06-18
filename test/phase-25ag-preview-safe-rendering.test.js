/**
 * Phase 25AG — Safe preview rendering.
 *
 * The renderer must never assign raw file text to innerHTML, never use
 * srcdoc/iframe/webview for package content, and must keep Open Local File a
 * separate explicit action (View never calls openExternal).
 *
 * Run:  node test/phase-25ag-preview-safe-rendering.test.js
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

console.log('\n=== Phase 25AG — Safe preview rendering ===\n');

// Isolate the gcACPreviewFile function body for targeted assertions.
function sliceFn(name) {
  const start = HTML.indexOf('window.' + name + ' = ');
  assert.ok(start >= 0, name + ' not found');
  // Grab a generous window of the function source.
  return HTML.slice(start, start + 6000);
}
const previewFn = sliceFn('gcACPreviewFile');

test('preview text is rendered via textContent (not innerHTML)', () => {
  assert.ok(/_sdViewerTextBlock/.test(previewFn),
    'text body should be built by the textContent block builder');
  // The text block builder must use textContent for the file body.
  const block = HTML.slice(HTML.indexOf('function _sdViewerTextBlock'),
    HTML.indexOf('function _sdViewerTextBlock') + 600);
  assert.ok(/pre\.textContent\s*=/.test(block),
    'file text must be assigned through textContent');
});

test('preview function never assigns preview.text to innerHTML', () => {
  assert.ok(!/innerHTML\s*=\s*[^;]*preview\.text/.test(previewFn),
    'preview.text must never be assigned to innerHTML');
  assert.ok(!/innerHTML\s*=\s*lines\.join/.test(previewFn),
    'the old innerHTML = lines.join() dump must be gone');
});

test('preview function does not assign extracted snippet to innerHTML', () => {
  assert.ok(!/innerHTML\s*=\s*[^;]*snippet/.test(previewFn),
    'extracted snippet must not be assigned to innerHTML');
});

test('no srcdoc usage anywhere in the renderer', () => {
  // Guard against actual srcdoc usage (attribute or property), not the word
  // appearing in an explanatory comment.
  assert.ok(!/srcdoc\s*=/.test(HTML), 'srcdoc attribute/property must never be used');
  assert.ok(!/setAttribute\(\s*['"]srcdoc/.test(HTML), 'srcdoc must never be set via setAttribute');
});

test('no iframe/webview used to render package content', () => {
  // The viewer renders text/image/pdf-object only — no iframe/webview tags.
  assert.ok(!/<iframe/i.test(previewFn), 'no iframe in the preview renderer');
  assert.ok(!/<webview/i.test(previewFn), 'no webview in the preview renderer');
});

test('View → gcACPreviewFile never calls openExternal', () => {
  assert.ok(!/openExternal/.test(previewFn),
    'the preview path must not open an external window');
});

test('Open Local File remains a separate explicit control', () => {
  assert.ok(/id="sd-right-file-viewer-open-local"/.test(HTML),
    'Open Local File button must still exist');
  assert.ok(/gcABOpenLocalPackageFolder/.test(HTML),
    'Open Local File must route to the explicit folder-open handler');
});

test('PDF preview uses object/embed (not iframe) for an approved local file', () => {
  assert.ok(/createElement\('object'\)/.test(previewFn) || /<object/.test(previewFn),
    'PDF should use an object element, not an iframe');
});

console.log('\n' + (failed ? '❌ ' + failed + ' failed, ' : '✅ ') + passed + ' passed\n');
process.exit(failed ? 1 : 0);

/**
 * Phase 25AD — Right-side attached file viewer.
 *
 * Asserts:
 *   - The viewer DOM lives at body root (attached to the SourceDeck app
 *     shell, not a popup) and exposes the documented element ids.
 *   - The inline preview <aside data-gc-ac-preview-pane> from Phase 25AC
 *     is retired (it is no longer the rendering surface).
 *   - The renderer wires View → gcACPreviewFile() → right-side viewer.
 *   - gcACPreviewFile() requests the file through the credential boundary
 *     and falls back gracefully for unsupported types.
 *   - Open Local File and Close controls are bound.
 *   - preload exposes previewPackageFile; main.js validates the path
 *     against the canonical solicitations root and refuses anything
 *     outside it.
 *
 * Run:  node test/phase-25ad-right-side-file-viewer.test.js
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

console.log('\n=== Phase 25AD — Right-side attached file viewer ===\n');

// ───── DOM scaffold ─────

test('right-side viewer scaffold lives at body root with all documented ids', () => {
  assert.ok(/id="sd-right-file-viewer"/.test(HTML),
    '#sd-right-file-viewer container missing');
  assert.ok(/data-sd-right-file-viewer="true"/.test(HTML),
    'viewer must carry data-sd-right-file-viewer for selector tests');
  assert.ok(/id="sd-right-file-viewer-title"/.test(HTML),  'title element missing');
  assert.ok(/id="sd-right-file-viewer-meta"/.test(HTML),   'meta element missing');
  assert.ok(/id="sd-right-file-viewer-body"/.test(HTML),   'body element missing');
  assert.ok(/id="sd-right-file-viewer-close"/.test(HTML),  'close button missing');
  assert.ok(/id="sd-right-file-viewer-open-local"/.test(HTML), 'open-local button missing');
});

test('viewer is docked to the right edge of the app shell (no popup window)', () => {
  // Position fixed + right:0 + width caps confirm a docked attached panel
  // rather than a separate OS/browser window.
  assert.ok(/position:fixed;[^"]*right:0/.test(HTML),
    'viewer must be position:fixed; right:0 (attached to the app shell)');
  assert.ok(/max-width:46vw/.test(HTML),
    'viewer must cap its width so the left content stays usable');
});

test('viewer open/close helpers are exposed on window', () => {
  assert.ok(/window\.sdRightFileViewerOpen = function/.test(HTML),
    'window.sdRightFileViewerOpen helper missing');
  assert.ok(/window\.sdRightFileViewerClose = function/.test(HTML),
    'window.sdRightFileViewerClose helper missing');
});

test('Close + Open Local File controls are wired through event listeners', () => {
  assert.ok(/btnClose\.addEventListener\('click', function\(\)\{ window\.sdRightFileViewerClose\(\); \}\)/.test(HTML),
    'Close button must call sdRightFileViewerClose()');
  assert.ok(/window\.gcABOpenLocalPackageFolder\(pid\)/.test(HTML),
    'Open Local File button must call gcABOpenLocalPackageFolder() with the current pursuit id');
});

// ───── Inline preview retirement ─────

test('inline Phase 25AC preview aside is retired from renderSourcePanel', () => {
  // The Phase 25AC small inline `<aside data-gc-ac-preview-pane>` block
  // was emitted from renderSourcePanel. Phase 25AD retires it — the
  // right-side viewer is now the sole preview surface.
  assert.ok(!/parts\.push\('<aside data-gc-ac-preview-pane="true"/.test(HTML),
    'small inline preview aside must be retired (right-side viewer is the only preview surface)');
});

// ───── Renderer → viewer wiring ─────

test('View button on a file row triggers gcACPreviewFile (populates right-side viewer)', () => {
  assert.ok(/onclick="gcABViewAttachment\(/.test(HTML),
    'each file row must keep its View action');
  assert.ok(/if \(typeof window\.gcACPreviewFile === 'function'\) window\.gcACPreviewFile\(id, idx\);/.test(HTML),
    'gcABViewAttachment must delegate to gcACPreviewFile');
});

test('gcACPreviewFile requests the file through the credential boundary', () => {
  assert.ok(/window\.gcACPreviewFile = async function/.test(HTML),
    'window.gcACPreviewFile must be the async right-side populator');
  assert.ok(/window\.sd\.govcon\.previewPackageFile/.test(HTML),
    'gcACPreviewFile must call window.sd.govcon.previewPackageFile');
});

test('gcACPreviewFile renders kind:text, kind:image, kind:pdf, kind:fallback branches', () => {
  // Each branch shows up as a literal kind check in the renderer.
  assert.ok(/preview\.kind === 'text'/.test(HTML),  'text branch missing');
  assert.ok(/preview\.kind === 'image'/.test(HTML), 'image branch missing');
  assert.ok(/preview\.kind === 'pdf'/.test(HTML),   'pdf branch missing');
  // The fallback message exists for unsupported types. Phase 25AG
  // dropped the "yet" hedge ("not available for this file type yet"
  // → "not available for this file type") and unified the Office
  // fallback copy.
  assert.ok(/Inline preview is not available for this file type\b/.test(HTML),
    'fallback message for unsupported file types missing');
  assert.ok(/Office preview (not available yet|is not available inline)\. Use Open Local File\./.test(HTML),
    'Office fallback copy missing');
});

// ───── preload + main.js wiring ─────

test('preload exposes previewPackageFile through the credential boundary', () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.ok(/previewPackageFile:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('govcon:preview-package-file', payload\)/.test(preload),
    'preload must expose previewPackageFile via govcon:preview-package-file');
});

test('main.js validates preview path against the canonical solicitations root', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert.ok(/ipcMain\.handle\('govcon:preview-package-file'/.test(main),
    'govcon:preview-package-file IPC handler missing in main.js');
  // The handler joins the canonical solicitations root and refuses
  // anything outside it via the standard relative-path check.
  assert.ok(/path\.join\(app\.getPath\('userData'\), 'govcon', 'solicitations'\)/.test(main),
    'preview handler must scope to userData/govcon/solicitations');
  assert.ok(/rel\.startsWith\('\.\.'\) \|\| path\.isAbsolute\(rel\)/.test(main),
    'preview handler must refuse paths outside the canonical root');
  assert.ok(/'invalid_file_path'/.test(main),
    'preview handler must return invalid_file_path for out-of-root requests');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD right-side viewer checks ===');
if (failed > 0) process.exit(1);

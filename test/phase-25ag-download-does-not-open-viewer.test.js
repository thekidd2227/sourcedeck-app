// Phase 25AG · Download Solicitation Package does not auto-open the viewer
// ──────────────────────────────────────────────────────────────────────
// The right-side viewer (#sd-right-file-viewer) must only become
// visible after the user clicks View on a specific file row.
// gcABDownloadPackage must never call gcACPreviewFile or
// sdRightFileViewerOpen, even on success.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Download does not open viewer');

// ── Locate gcABDownloadPackage body ──────────────────────────────────
const dlStart = html.indexOf('window.gcABDownloadPackage = async function');
assert(dlStart > 0, 'gcABDownloadPackage handler is defined');
// Body ends at the next "window." declaration at the same depth — we
// scan forward to the next `window.gc` assignment.
const dlEndIdx = html.indexOf('\n  window.', dlStart + 40);
const dlBody = html.slice(dlStart, dlEndIdx === -1 ? dlStart + 8000 : dlEndIdx);

assert(!/gcACPreviewFile\(/.test(dlBody),
  'gcABDownloadPackage body never calls gcACPreviewFile()');
assert(!/sdRightFileViewerOpen\(/.test(dlBody),
  'gcABDownloadPackage body never calls sdRightFileViewerOpen()');
assert(!/\bgcABViewAttachment\(/.test(dlBody),
  'gcABDownloadPackage body never calls gcABViewAttachment()');

// ── Locate gcABViewAttachment body — that IS the call site for View ──
const viewStart = html.indexOf('window.gcABViewAttachment = function');
assert(viewStart > 0, 'gcABViewAttachment handler is defined');
const viewEndIdx = html.indexOf('\n  window.', viewStart + 40);
const viewBody = html.slice(viewStart, viewEndIdx === -1 ? viewStart + 4000 : viewEndIdx);
assert(/gcACPreviewFile\(/.test(viewBody),
  'gcABViewAttachment is what drives gcACPreviewFile (per-file View action)');

// ── sdRightFileViewerOpen invocations must live inside gcACPreviewFile.
//    That function's body is bracketed by its `window.gcACPreviewFile =`
//    declaration and the next sibling `\n  window.` assignment. ──────────
const previewStart = html.indexOf('window.gcACPreviewFile = async function');
assert(previewStart > 0, 'gcACPreviewFile is defined');
const previewEnd = html.indexOf('\n  window.', previewStart + 40);
const previewBody = html.slice(previewStart, previewEnd === -1 ? html.length : previewEnd);
const previewOpens = (previewBody.match(/sdRightFileViewerOpen\s*\(/g) || []).length;
const totalOpens = (html.match(/sdRightFileViewerOpen\s*\(/g) || []).length;
assert(totalOpens === previewOpens && previewOpens > 0,
  'Every sdRightFileViewerOpen() call lives inside gcACPreviewFile (' +
  previewOpens + ' inside / ' + totalOpens + ' total)');

console.log(process.exitCode ? 'Phase 25AG · download does not open viewer: FAILED' : 'Phase 25AG · download does not open viewer: OK');

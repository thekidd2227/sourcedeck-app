// Phase 25AG · Office (DOC/DOCX/XLS/XLSX) fallback
// ──────────────────────────────────────────────────────────────────────
// Office documents are not supported inline. The IPC layer returns
// kind:'fallback' reason:'unsupported_type'. The renderer surfaces a
// clear "Office preview is not available inline. Use Open Local File"
// message, optionally with a bounded extracted-text snippet when one
// is present on the per-file state.

const fs = require('fs');
const path = require('path');

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Office (DOC/DOCX/XLS/XLSX) fallback');

// ── Office extensions are NOT in TEXT_EXT / IMAGE_EXT / PDF_EXT ─────
const textExtMatch = mainSrc.match(/const TEXT_EXT = \[([^\]]+)\]/);
assert(textExtMatch, 'TEXT_EXT is defined');
['.doc', '.docx', '.xls', '.xlsx'].forEach(ext => {
  assert(!textExtMatch[1].includes("'" + ext + "'"),
    'TEXT_EXT does not include ' + ext);
});

// ── IPC returns reason:'unsupported_type' for files not matched by
//    any allowlist ─────────────────────────────────────────────────
assert(/reason: 'unsupported_type'/.test(mainSrc),
  'IPC handler returns unsupported_type for non-matching extensions');

// ── Renderer surfaces Office-specific copy ──────────────────────────
const previewStart = html.indexOf('window.gcACPreviewFile = async function');
const previewEnd = html.indexOf('\n  window.', previewStart + 40);
const previewBody = html.slice(previewStart, previewEnd === -1 ? html.length : previewEnd);

assert(/Office preview is not available inline\. Use Open Local File/.test(previewBody),
  'Office fallback copy: "Office preview is not available inline. Use Open Local File."');
assert(/docx\?\|xlsx\?/.test(previewBody),
  'Office regex docx?|xlsx? selects DOC/DOCX/XLS/XLSX files');

// ── Optional bounded extracted-text snippet ─────────────────────────
assert(/allowSnippet = \(reason === 'unsupported_type' \|\| reason === 'metadata-only'\)/.test(previewBody),
  'Snippet path is only entered for unsupported_type / metadata-only — never for blocked / oversized');
assert(/\.slice\(0, 4000\)/.test(previewBody),
  'Extracted snippet is bounded to 4000 characters');
assert(/Draft preview from extracted text/.test(previewBody),
  'Snippet header: "Draft preview from extracted text — verify against the original document."');

console.log(process.exitCode ? 'Phase 25AG · office fallback: FAILED' : 'Phase 25AG · office fallback: OK');

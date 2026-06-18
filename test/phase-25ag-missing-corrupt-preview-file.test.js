// Phase 25AG · Missing / corrupt preview file
// ──────────────────────────────────────────────────────────────────────
// When the underlying package file is missing or unreadable the IPC
// returns reason:'file_unreadable' / 'not_a_file' / 'read_failed'. The
// renderer must:
//   - not crash
//   - clear the loading shimmer (busy state)
//   - show a clear, generic fallback message
//   - not surface stack traces or raw error messages

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Missing / corrupt preview file');

const previewStart = html.indexOf('window.gcACPreviewFile = async function');
assert(previewStart > 0, 'gcACPreviewFile is defined');
const previewEnd = html.indexOf('\n  window.', previewStart + 40);
const previewBody = html.slice(previewStart, previewEnd === -1 ? html.length : previewEnd);

// ── Renderer maps missing/corrupt reasons to a single generic copy ──
const corruptReasons = ['file_unreadable', 'not_a_file', 'read_failed', 'invalid_file_path', 'remote_url_refused', 'no_file_path'];
corruptReasons.forEach(r => {
  assert(previewBody.indexOf(r) >= 0,
    'Missing/corrupt branch handles reason: ' + r);
});
assert(/Preview unavailable for this file\. Re-download the package or use Open Local File\./.test(previewBody),
  'Missing/corrupt copy: "Preview unavailable for this file. Re-download the package or use Open Local File."');

// ── Exception during preview → generic "Preview failed" copy ────────
assert(/setFallback\('Preview failed\. Re-download the package or use Open Local File\.'\)/.test(previewBody),
  'catch branch surfaces generic Preview failed copy');

// ── No raw error message / stack trace leaks ────────────────────────
assert(!/setFallback\(.*e\.message/.test(previewBody),
  'Error e.message is never piped to setFallback');
assert(!/setFallback\(.*e\.stack/.test(previewBody),
  'Error e.stack is never piped to setFallback');

// ── Busy state always cleared in finally ────────────────────────────
assert(/} finally \{[\s\S]{0,250}sdClearActionBusy\(busyEl\)/.test(previewBody),
  'finally block clears the busy state so loading shimmer never sticks');

// ── Try block wraps the whole preview pipeline ──────────────────────
assert(/try \{[\s\S]+\} catch \(e\) \{[\s\S]+\} finally \{/.test(previewBody),
  'Whole preview pipeline is wrapped in try/catch/finally');

// ── Missing file in saved state shows specific "Attachment not found"
//    title, not the loading shimmer ──────────────────────────────────
assert(/'Attachment not found'/.test(previewBody),
  '"Attachment not found" title surfaces when saved state has no file at idx');

console.log(process.exitCode ? 'Phase 25AG · missing/corrupt: FAILED' : 'Phase 25AG · missing/corrupt: OK');

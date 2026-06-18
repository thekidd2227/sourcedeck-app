// Phase 25AG · Renderer-side safe rendering of preview content
// ──────────────────────────────────────────────────────────────────────
// The Phase 25S/25AC viewer assigned preview HTML via innerHTML after
// running esc() on the text. That's functionally safe but kept the
// raw-innerHTML surface available to a future accident. Phase 25AG
// builds the body via DOM nodes (createElement + textContent) so file
// content is never assigned as a string of HTML.
//
// This test pins the contract: inside gcACPreviewFile, file-derived
// preview text/snippet content reaches the DOM via .textContent, not
// via innerHTML/srcdoc/iframe/webview.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Renderer-side safe preview rendering');

const previewStart = html.indexOf('window.gcACPreviewFile = async function');
assert(previewStart > 0, 'gcACPreviewFile is defined');
const previewEnd = html.indexOf('\n  window.', previewStart + 40);
const previewBody = html.slice(previewStart, previewEnd === -1 ? html.length : previewEnd);

// ── No bodyEl.innerHTML = … for preview content ─────────────────────
assert(!/bodyEl\.innerHTML\s*=\s*lines/.test(previewBody),
  'gcACPreviewFile no longer assigns lines.join() to bodyEl.innerHTML');
// The only innerHTML assignment allowed is clearing or replacing with
// loading copy — we're cleaning the body in clearBody() via DOM removal,
// not innerHTML. Verify no innerHTML survives in the function.
assert(!/innerHTML\s*=/.test(previewBody),
  'No innerHTML assignment survives anywhere in gcACPreviewFile');

// ── Body building uses DOM constructors + textContent ───────────────
assert(/document\.createElement\('pre'\)|makeEl\('pre'/.test(previewBody),
  '<pre> blocks for preview content are constructed via createElement / makeEl');
assert(/preEl\.textContent = String\(preview\.text \|\| ''\)/.test(previewBody),
  'preview.text reaches the DOM via textContent (never innerHTML)');
assert(/snipPre\.textContent = snippet/.test(previewBody),
  'Extracted snippet reaches the DOM via textContent (never innerHTML)');

// ── No srcdoc / iframe / webview for arbitrary package HTML ─────────
assert(!/srcdoc/i.test(previewBody),
  'gcACPreviewFile never uses srcdoc');
assert(!/<iframe/i.test(previewBody),
  'gcACPreviewFile never uses <iframe>');
assert(!/<webview/i.test(previewBody),
  'gcACPreviewFile never uses <webview>');

// ── Fallback message branches surface the canonical reasons ─────────
const reasons = [
  'html_not_previewable',
  'app_shell_preview_blocked',
  'too_large',
  'unsupported_type',
  'file_unreadable',
  'read_failed'
];
reasons.forEach(r => {
  assert(previewBody.indexOf(r) >= 0,
    'Fallback branch handles reason: ' + r);
});

// ── Defensive busy-state cleanup in finally ─────────────────────────
assert(/} finally {[\s\S]{0,200}sdClearActionBusy/.test(previewBody),
  'Busy state is cleared in a finally block (missing/corrupt file does not stick)');

// ── catch-side surfaces a generic, non-leaking message ──────────────
assert(/} catch \(e\) \{[\s\S]{0,200}setFallback\('Preview failed/.test(previewBody),
  'catch branch shows a generic "Preview failed" message (no stack trace)');

// ── Local app-shell guard on extracted snippet ─────────────────────
assert(/SourceDeck GovCon Pipeline\|\\\.cmd-flow\|\\\.cmd-pill\|cc-lcc-grid/.test(previewBody),
  'Extracted-snippet branch also scrubs SourceDeck UI markers locally');

console.log(process.exitCode ? 'Phase 25AG · safe rendering: FAILED' : 'Phase 25AG · safe rendering: OK');

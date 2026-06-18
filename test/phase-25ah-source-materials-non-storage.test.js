// Phase 25AH (follow-up) · Renderer never stores rejected source-fetch bodies
// ──────────────────────────────────────────────────────────────────────
// gcW25FetchDescription / gcW25ImportResource must NOT persist
// sm.description.text or sm.resources[].text when the IPC returns
// { ok:false }. They must surface a reason-specific toast and store
// only safe status metadata.
//
// This test also pins the stale-source sanitizer that
// gcW25CollectSourceText now runs against existing localStorage, plus
// the new gcW25ClearSourceMaterials repair action.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AH · renderer source-material non-storage');

// ── gcW25FetchDescription stores only safe metadata on rejection ────
function bodyOf(decl){
  const start = html.indexOf('window.' + decl + ' = async function');
  if (start < 0) return '';
  const end = html.indexOf('\n  window.', start + 40);
  return html.slice(start, end === -1 ? start + 6000 : end);
}

const fetchDescBody = bodyOf('gcW25FetchDescription');
assert(fetchDescBody.length > 0, 'gcW25FetchDescription is defined');
assert(/status: 'rejected'/.test(fetchDescBody),
  'Rejected description fetch records status: rejected');
assert(/rejectionReason: reason/.test(fetchDescBody),
  'Rejected description fetch records rejectionReason');
assert(/text: ''/.test(fetchDescBody),
  'Rejected description fetch stores empty text (NEVER the rejected body)');
assert(/_w25RejectionMessage\(reason\)/.test(fetchDescBody),
  'Rejected description toast routes through _w25RejectionMessage(reason)');

const importResourceBody = bodyOf('gcW25ImportResource');
assert(importResourceBody.length > 0, 'gcW25ImportResource is defined');
assert(/var isHtml = \/text\\\/html\|application\\\/xhtml\/i\.test\(ct\)/.test(importResourceBody),
  'gcW25ImportResource detects text/html responses and refuses to store them');
assert(/if \(!isHtml/.test(importResourceBody),
  'Text body is only stored when content-type is not HTML');
assert(/analysisStatus = rec\.text \? 'imported' :/.test(importResourceBody),
  'Resource analysisStatus reflects rejected vs imported vs binary');

// ── _w25RejectionCopy table includes every safe reason code ─────────
[
  'app_shell_html_response',
  'sam_login_html_response',
  'non_attachment_html_response',
  'unexpected_html_response',
  'http_error',
  'no_api_key',
  'invalid_url',
  'fetch_failed'
].forEach(reason => {
  assert(html.indexOf(reason + ':') >= 0,
    '_w25RejectionCopy includes reason: ' + reason);
});

// ── Stale source-material sanitizer ─────────────────────────────────
assert(/function _w25LooksLikeBadSource\(text\)/.test(html),
  '_w25LooksLikeBadSource helper is defined');
assert(/function _w25SanitizeSourceMaterials\(sm, persistIfDirty, id\)/.test(html),
  '_w25SanitizeSourceMaterials helper is defined');
assert(/_w25SanitizeSourceMaterials\(getSM\(id\), true, id\)/.test(html),
  'gcW25CollectSourceText runs the sanitizer with persist-if-dirty');
assert(/'stale_html_sanitized'/.test(html),
  'Sanitizer marks dropped entries with rejectionReason stale_html_sanitized');

// ── gcW25ClearSourceMaterials repair action ─────────────────────────
const clearBody = bodyOf('gcW25ClearSourceMaterials');
assert(clearBody.length > 0, 'window.gcW25ClearSourceMaterials is defined');
assert(/sm\.description\.text = ''/.test(clearBody),
  'Clear action zeroes sm.description.text');
assert(/sm\.description\.status = 'cleared'/.test(clearBody),
  'Clear action marks description.status = cleared');
assert(/sm\.resources\[i\]\.text = ''/.test(clearBody),
  'Clear action zeroes each resource text');
assert(/return \{ ok: true \}/.test(clearBody),
  'Clear action returns { ok:true } on success');

console.log(process.exitCode ? 'Phase 25AH · renderer source-material non-storage: FAILED' : 'Phase 25AH · renderer source-material non-storage: OK');

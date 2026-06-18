// Phase 25AH (follow-up) · Stale source-material sanitizer runtime
// ──────────────────────────────────────────────────────────────────────
// Drives _w25LooksLikeBadSource and _w25SanitizeSourceMaterials in a
// vm sandbox so the actual logic is exercised, not just regex-matched.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AH · sanitizer runtime');

// Locate the W25 IIFE that owns the helpers. We anchor to the SM_KEY
// declaration ("sd.govcon.sourceMaterials.v1") which is unique to the
// W25 IIFE, then walk backward to its (function(){ wrapper.
const smKeyIdx = html.indexOf("var SM_KEY = 'sd.govcon.sourceMaterials.v1'");
assert(smKeyIdx > 0, 'W25 SM_KEY anchor found');
const iifeStart = html.lastIndexOf('(function(){', smKeyIdx);
const iifeEnd = html.indexOf('</script>', iifeStart);
const iife = html.slice(iifeStart, iifeEnd);
assert(/function _w25LooksLikeBadSource/.test(iife),
  'Sliced IIFE contains _w25LooksLikeBadSource');

const sandbox = {
  document: {
    getElementById: function(){ return null; },
    querySelector: function(){ return null; },
    querySelectorAll: function(){ return []; },
    addEventListener: function(){},
    readyState: 'complete'
  },
  window: { sd: null, toast: function(){} },
  localStorage: { _data: {}, getItem: function(k){ return this._data[k] || null; }, setItem: function(k, v){ this._data[k] = v; }, removeItem: function(k){ delete this._data[k]; } },
  setTimeout: function(fn){ try { fn(); } catch (e) {} },
  console: console
};
vm.createContext(sandbox);
const expose = "window._w25LooksLikeBadSource = _w25LooksLikeBadSource; window._w25SanitizeSourceMaterials = _w25SanitizeSourceMaterials;";
vm.runInContext(iife.replace(/\}\)\(\);?\s*$/, expose + ' })();'), sandbox);

const bad = sandbox.window._w25LooksLikeBadSource;
const sanitize = sandbox.window._w25SanitizeSourceMaterials;

// ── _w25LooksLikeBadSource ──────────────────────────────────────────
assert(bad('SOLICITATION SF1449. The Department seeks janitorial services.') === false,
  'Real solicitation text is NOT flagged');
assert(bad('<!doctype html><html><body>hi</body></html>') === true,
  'Generic HTML document is flagged');
assert(bad('<html><head><title>x</title></head><body>SourceDeck GovCon Pipeline\n.cmd-flow { } .cmd-pill { }</body></html>') === true,
  'App-shell HTML is flagged');
assert(bad('SAM.gov Sign In - please log in to continue') === true,
  'SAM.gov sign-in copy is flagged');
assert(bad('<meta charset="utf-8"><meta http-equiv="content-type">closing</html>') === true,
  'meta+closing-html pattern is flagged');
assert(bad('SourceDeck saves the day') === false,
  'Single mention of SourceDeck is NOT flagged (avoids false positives)');
assert(bad('') === false, 'Empty is safe');
assert(bad(null) === false, 'null is safe');
assert(bad(undefined) === false, 'undefined is safe');

// ── _w25SanitizeSourceMaterials drops bad description + bad resources
const stale = {
  description: { text: '<!doctype html><html><body>SourceDeck GovCon Pipeline .cmd-flow .cmd-pill</body></html>', fetchedAt: '2026-01-01' },
  resources: [
    { fileName: 'a.txt', text: 'SOLICITATION SF1449. Real text.' },
    { fileName: 'b.html', text: '<html><body>SourceDeck GovCon Pipeline\n.cmd-flow {} .cc-lcc-grid</body></html>' },
    { fileName: 'c.txt', text: '' }
  ]
};
const out = sanitize(JSON.parse(JSON.stringify(stale)), false, null);
assert(out.description.text === '',
  'Stale description.text is zeroed (got "' + out.description.text + '")');
assert(out.description.status === 'rejected',
  'Sanitized description.status = rejected');
assert(out.description.rejectionReason === 'stale_html_sanitized',
  'Sanitized description.rejectionReason = stale_html_sanitized');
assert(out.resources[0].text === 'SOLICITATION SF1449. Real text.',
  'Real-text resource is preserved');
assert(out.resources[1].text === '',
  'Bad-text resource is zeroed');
assert(out.resources[1].analysisStatus === 'rejected',
  'Bad-text resource analysisStatus = rejected');
assert(out.resources[1].rejectionReason === 'stale_html_sanitized',
  'Bad-text resource rejectionReason = stale_html_sanitized');

console.log(process.exitCode ? 'Phase 25AH · sanitizer runtime: FAILED' : 'Phase 25AH · sanitizer runtime: OK');

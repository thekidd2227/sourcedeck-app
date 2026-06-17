/**
 * Phase 25X — Open SAM.gov source link handling (re-verification).
 *
 * Keyword-search rows must still expose a working "Open SAM.gov Source"
 * action that routes through the credential boundary, never opens an
 * api_key-bearing URL, and falls back to a public sam.gov/opp/{id}/view URL
 * when no clean source link is present.
 *
 * Mixes static wiring checks with a runtime exercise of the URL builder.
 *
 * Run:  node test/phase-25x-open-sam-source-links.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

let failed = 0;
function assert(c, m){ if (!c){ console.error('  ✗ ' + m); failed = 1; } else { console.log('  ✓ ' + m); } }

console.log('\n=== Phase 25X — Open SAM.gov source links ===\n');

// ── search rows render the Open SAM.gov Source action ────────────────────
assert(/data-gc-sam-fresh-action="open-sam-source"/.test(HTML), 'search rows expose open-sam-source action');
assert(/onclick="gcTabSamOpenSource\(/.test(HTML), 'rows call gcTabSamOpenSource(id)');
assert(/Open SAM\.gov Source/.test(HTML), 'Open SAM.gov Source label present');

// ── handler routes through the robust external opener ────────────────────
const handler = HTML.slice(HTML.indexOf('window.gcTabSamOpenSource = function'), HTML.indexOf('window.gcTabSamOpenSource = function') + 900);
assert(/gcOpenExternal/.test(handler), 'handler prefers gcOpenExternal (IPC bridge)');
assert(/_samSafeUrl\(r\)/.test(handler), 'handler resolves a safe (key-stripped) URL');
assert(/api_key/i.test(handler), 'handler still guards against api_key leakage on the fallback path');

// ── IPC boundary refuses credential URLs ─────────────────────────────────
assert(/openExternal:\s*\(url\)\s*=>\s*ipcRenderer\.invoke\('open-external'/.test(PRELOAD), 'preload open-external bridge present');
assert(/ipcMain\.handle\('open-external'/.test(MAIN), 'main open-external handler present');
assert(/refused_credential_url/.test(MAIN), 'main refuses api_key-bearing URLs');

// ── runtime: _samSafeUrl behavior ────────────────────────────────────────
function bootUrl(){
  const sandbox = {
    document: { getElementById: function(){ return null; }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, addEventListener: function(){}, readyState: 'complete' },
    window: {}, localStorage: { getItem: function(){ return null; }, setItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} }, console: console
  };
  const iifeStart = HTML.indexOf('/* Phase 25N — GovCon tab-page switcher');
  const iifeEnd = HTML.indexOf('</script>', iifeStart);
  let iife = HTML.slice(iifeStart, iifeEnd);
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);
  return sandbox.window;
}
const W = bootUrl();
assert(typeof W.gcSamSafeUrl === 'function', 'gcSamSafeUrl is exposed for verification');

// prefers a clean uiLink
assert(W.gcSamSafeUrl({ uiLink: 'https://sam.gov/opp/ABC/view' }) === 'https://sam.gov/opp/ABC/view', 'clean uiLink passes through');
// strips api_key from an api.sam.gov url and falls back to public notice url
const stripped = W.gcSamSafeUrl({ noticeId: 'NID9', url: 'https://api.sam.gov/opp/NID9?api_key=SECRETKEY123' });
assert(!/api_key/i.test(stripped), 'no api_key in resolved URL');
assert(/sam\.gov\/opp\/NID9\/view/.test(stripped), 'falls back to public sam.gov notice URL built from noticeId');
// builds a public URL from noticeId when nothing else is present
assert(W.gcSamSafeUrl({ noticeId: 'XYZ' }) === 'https://sam.gov/opp/XYZ/view', 'builds public notice URL from noticeId');

console.log('\n' + (failed ? 'FAIL' : 'PASS') + ' — Phase 25X open SAM.gov source links\n');
process.exit(failed ? 1 : 0);

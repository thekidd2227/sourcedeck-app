// Phase 25U · SAM source-open regression guard
// ──────────────────────────────────────────────────────────────────────
// Tightens the Phase 25S "Open SAM.gov Source" contract. Phase 25U
// changes a lot of the SAM search surface; this test pins the
// invariants that must survive:
//   - safe-URL builder still strips api_key
//   - View Details still opens an in-app modal (not a toast)
//   - row template never embeds [object Object] / null / undefined
//     for any normalized field

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25U · SAM source-open regression guard');

// ── Phase 25S helpers still present ─────────────────────────────────
[
  '_samSafeUrl',
  '_samStripApiKey',
  '_samPopString',
  '_samAgencyString',
  '_samRowNaics',
  '_samRowSetAside',
  '_samRenderViewDetails',
  'gcTabSamCloseDetails',
  'gcTabSamOpenSource',
  'gcTabSamViewDetails'
].forEach(function(n){
  assert(html.indexOf(n) >= 0, n + ' still defined');
});

// ── No raw api_key value in renderer (defensive regex literals OK) ──
(function(){
  var matches = (html.match(/api_key=[^\s'")]*/g) || []);
  var bad = matches.filter(function(m){
    if (m === 'api_key=…' || m === 'api_key=') return false;
    if (m === 'api_key=[^&#]*&?/gi,' || m === 'api_key=[^&#]*&?') return false;
    return true;
  });
  assert(bad.length === 0,
    'No raw "api_key=<value>" literal in renderer (offending: ' + JSON.stringify(bad) + ')');
})();

// ── Row template + upsert payload still normalize fields ───────────
assert(/_esc\(_samRowNaics\(r\) \|\| '—'\)/.test(html),
  'Row template renders "—" when NAICS is missing');
assert(/_esc\(_samRowSetAside\(r\) \|\| '—'\)/.test(html),
  'Row template renders "—" when set-aside is missing');
assert(/_esc\(pop \|\| '—'\)/.test(html),
  'Row template renders "—" when place of performance is missing');
assert(/placeOfPerformance: _samPopString\(r\.placeOfPerformance\)/.test(html),
  'Upsert payload normalizes placeOfPerformance via _samPopString');
assert(/sourceUrl: _samSafeUrl\(r\)/.test(html),
  'Upsert payload normalizes sourceUrl via _samSafeUrl');

// ── _samSafeUrl + _samStripApiKey behaviour ────────────────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('window.gcTabSamOpenSource ='));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);
  var sandbox = {
    document: {
      getElementById: function(){ return null; },
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: { sd: null, toast: function(){} },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  var expose = "window._samSafeUrl = _samSafeUrl; window._samStripApiKey = _samStripApiKey; window._samPopString = _samPopString;";
  vm.runInContext(iife.replace(/\}\)\(\);?\s*$/, expose + ' })();'), sandbox);

  // Strip api_key.
  assert(!/api_key/i.test(sandbox.window._samStripApiKey('https://api.sam.gov/x?api_key=SECRET&y=1')),
    '_samStripApiKey removes api_key= from a SAM URL');
  // Safe URL from uiLink.
  assert(sandbox.window._samSafeUrl({ uiLink: 'https://sam.gov/opp/abc/view' }) === 'https://sam.gov/opp/abc/view',
    '_samSafeUrl prefers uiLink');
  // Safe URL from noticeId.
  assert(sandbox.window._samSafeUrl({ noticeId: 'NID-1' }) === 'https://sam.gov/opp/NID-1/view',
    '_samSafeUrl builds sam.gov/opp/{noticeId}/view from noticeId');
  // Safe URL never carries api_key.
  var url = sandbox.window._samSafeUrl({ url: 'https://api.sam.gov/x?api_key=SECRET', noticeId: 'NID-X' });
  assert(!/api_key/i.test(url), 'Safe URL with api.sam.gov source never carries api_key');
  // Place-of-performance never renders [object Object].
  var pop = sandbox.window._samPopString({ city: { name: 'Austin' }, state: { code: 'TX' } });
  assert(!/\[object Object\]/.test(pop),
    'Place-of-performance object renders to text (no [object Object])');
} catch (e) {
  assert(false, 'Sandbox failed: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25U · SAM source-open regression: FAILED' : 'Phase 25U · SAM source-open regression: OK');

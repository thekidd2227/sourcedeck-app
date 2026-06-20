// Phase 25S · SAM.gov Open Source URL repair
// ──────────────────────────────────────────────────────────────────────
// The defect: "Open SAM.gov Source" tried to send the buyer to the
// raw r.uiLink || r.url chain. When SAM.gov returned an api.sam.gov
// URL containing api_key=… the credential leaked into the system
// browser history. When the API returned no uiLink the button was a
// no-op.
//
// Phase 25S contract:
//   1. _samStripApiKey removes any api_key=… segment from a URL.
//   2. _samSafeUrl prefers uiLink, then builds
//      https://sam.gov/opp/{noticeId}/view from noticeId. (Removal phase:
//      attachment/resource links are never consulted.)
//   3. gcTabSamOpenSource refuses to open URLs that still carry
//      api_key after stripping.
//   4. The renderer never includes api_key in any DOM output.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25S · SAM.gov Open Source URL repair');

// ── Helpers defined ─────────────────────────────────────────────────
assert(/function _samStripApiKey\(url\)/.test(html),
  '_samStripApiKey(url) helper is defined');
assert(/function _samSafeUrl\(r\)/.test(html),
  '_samSafeUrl(r) helper is defined');

// ── gcTabSamOpenSource refuses URLs that still contain api_key ──────
assert(/_samSafeUrl\(r\)/.test(html),
  'gcTabSamOpenSource uses _samSafeUrl(r) to derive the URL');
assert(/Refused to open source URL/.test(html),
  'Open Source refuses URLs that still carry api_key after stripping');
assert(/window\.open\(url, '_blank'/.test(html),
  'Open Source still calls window.open with _blank (no shell.openExternal bridge)');

// ── Sandbox: prove the URL helpers do what we say ───────────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('window.gcTabSamOpenSource ='));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(id){
    var el = { _value: '', value: '', _innerHTML: '', _options: [] };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    el.parentElement = { querySelector: function(){ return null; } };
    el.style = { display: '' };
    inputs[id] = el;
    return el;
  }
  var sandbox = {
    document: {
      getElementById: function(id){ return inputs[id] || fakeEl(id); },
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

  var expose = "window._samStripApiKey = _samStripApiKey; window._samSafeUrl = _samSafeUrl;";
  var spliced = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.runInContext(spliced, sandbox);

  // ── _samStripApiKey ────────────────────────────────────────────────
  var stripped = sandbox.window._samStripApiKey(
    'https://api.sam.gov/opportunities/v2/search?api_key=ABC123&noticeId=xyz'
  );
  assert(!/api_key/i.test(stripped),
    'Stripped URL does not contain api_key (got "' + stripped + '")');
  assert(/noticeId=xyz/.test(stripped),
    'Stripped URL preserves other query params');

  var stripped2 = sandbox.window._samStripApiKey('https://example.com/x?api_key=SECRET');
  assert(!/api_key/i.test(stripped2),
    'Stripped URL with only api_key drops the parameter entirely');

  // ── _samSafeUrl preference order ──────────────────────────────────
  var url1 = sandbox.window._samSafeUrl({ uiLink: 'https://sam.gov/opp/abc/view' });
  assert(url1 === 'https://sam.gov/opp/abc/view',
    'uiLink preferred when present');

  // Removal phase — attachment/resource links are no longer consulted. When
  // uiLink is missing, _samSafeUrl builds the canonical sam.gov/opp/{id}/view.
  var url2 = sandbox.window._samSafeUrl({
    uiLink: '',
    noticeId: 'abc'
  });
  assert(url2 === 'https://sam.gov/opp/abc/view',
    'noticeId fallback builds canonical URL (resourceLinks no longer used)');

  var url3 = sandbox.window._samSafeUrl({ noticeId: 'NID-12345' });
  assert(url3 === 'https://sam.gov/opp/NID-12345/view',
    'noticeId fallback builds sam.gov/opp/{noticeId}/view (got "' + url3 + '")');

  // The crucial one: a raw api.sam.gov URL with api_key MUST not pass through.
  var url4 = sandbox.window._samSafeUrl({
    url: 'https://api.sam.gov/opportunities/v2/search?api_key=SECRET&id=42',
    noticeId: 'NID-42'
  });
  assert(url4 === 'https://sam.gov/opp/NID-42/view',
    'api.sam.gov URL is replaced by sam.gov/opp/{noticeId}/view');
  assert(!/api_key/i.test(url4),
    'No api_key in the returned safe URL');
  assert(!/api\.sam\.gov/i.test(url4),
    'No api.sam.gov host in the returned safe URL');

  // No uiLink, no resourceLinks, no noticeId → empty string.
  var url5 = sandbox.window._samSafeUrl({});
  assert(url5 === '',
    'Empty row produces an empty safe URL (Open button shows the warn toast)');
} catch (e){
  assert(false, 'Sandbox simulation failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25S · SAM Open Source: FAILED' : 'Phase 25S · SAM Open Source: OK');

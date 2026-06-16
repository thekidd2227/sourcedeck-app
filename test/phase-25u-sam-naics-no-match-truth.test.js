// Phase 25U · SAM.gov NAICS no-match truth
// ──────────────────────────────────────────────────────────────────────
// After the sanitizer fix, SAM.gov filters by NAICS server-side. The
// renderer's zero-match copy must honestly reflect what was actually
// searched — never say "SAM.gov returned 25 rows" when those 25 rows
// were a broad fallback because the NAICS got dropped.
//
// This test exercises the renderer's `_samRenderZeroMatch` with both
// shapes (returned=0 and returned>0) and verifies the copy.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25U · SAM.gov NAICS no-match truth');

// ── Renderer expands broader-mode NAICS before the IPC call ─────────
assert(/if \(filters\.naicsMode === 'broader'/.test(html),
  "Renderer branches on broader mode before sending to IPC");
assert(/window\.naicsRelatedCodes\(code/.test(html),
  'Broader-mode IPC payload is expanded via naicsRelatedCodes');
assert(/ipcFilters\.naics = expanded\.join\(','\)/.test(html),
  'Expanded NAICS family is joined and sent as ipcFilters.naics');

// ── Zero-match copy distinguishes returned=0 vs returned>0 ──────────
assert(/SAM\.gov returned 0 matching records/.test(html),
  'When returned=0, message says "SAM.gov returned 0 matching records"');
assert(/SourceDeck reviewed ' \+ returned \+ ' SAM\.gov record/.test(html),
  'When returned>0, message says "SourceDeck reviewed N SAM.gov records"');
assert(/SourceDeck searched SAM\.gov using NAICS/.test(html),
  'Returned-0 copy includes "SourceDeck searched SAM.gov using NAICS X"');

// ── Old misleading copy is gone ─────────────────────────────────────
assert(!/SAM\.gov returned ' \+ returned \+ ' row[^"]*but none matched NAICS/.test(html),
  'Old "SAM.gov returned N rows but none matched NAICS" copy is removed');

// ── No-match panel still surfaces when NAICS is set regardless of count
assert(/if \(filters\.naics && filters\.naicsMode !== 'keyword-only'\)\{[\s\S]*_samRenderZeroMatch/.test(html),
  'Renderer always shows the zero-match panel when NAICS is set and mode is not keyword-only');

// ── Sandbox: drive _samRenderZeroMatch directly ─────────────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('function _samRenderZeroMatch'));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(){
    var el = { _value: '', value: '', _innerHTML: '', _textContent: '', _options: [] };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    Object.defineProperty(el, 'textContent', { get: function(){ return el._textContent; }, set: function(v){ el._textContent = v; } });
    el.parentElement = { querySelector: function(){ return null; } };
    el.style = { display: '' };
    return el;
  }
  function ge(id){ if (!inputs[id]) inputs[id] = fakeEl(); return inputs[id]; }
  var sandbox = {
    document: {
      getElementById: ge,
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: { sd: null, toast: function(){}, naicsRelatedCodes: function(){ return []; } },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  var expose = "window._samRenderZeroMatch = _samRenderZeroMatch;";
  var spliced = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.runInContext(spliced, sandbox);

  // Case A — returned=0.
  sandbox.window._samRenderZeroMatch({ naics: '541611' }, 0);
  var html_A = inputs['gc-tab-sam-zero-match']._innerHTML;
  assert(/SourceDeck searched SAM\.gov using NAICS 541611/.test(html_A),
    'returned=0: copy says "SourceDeck searched SAM.gov using NAICS 541611"');
  assert(/SAM\.gov returned 0 matching records/.test(html_A),
    'returned=0: copy says "SAM.gov returned 0 matching records"');

  // Case B — returned=12 (rows came back from SAM but were dropped
  // post-server by the broader-prefix or set-aside backstop).
  sandbox.window._samRenderZeroMatch({ naics: '541611' }, 12);
  var html_B = inputs['gc-tab-sam-zero-match']._innerHTML;
  assert(/SourceDeck reviewed 12 SAM\.gov record/.test(html_B),
    'returned=12: copy says "SourceDeck reviewed 12 SAM.gov record(s)"');
  assert(/found 0 that passed the active filters/.test(html_B),
    'returned=12: copy says "found 0 that passed the active filters"');

  // Both should still surface the no-unrelated disclaimer.
  assert(/SourceDeck does not show unrelated NAICS results as matches/.test(html_A) &&
         /SourceDeck does not show unrelated NAICS results as matches/.test(html_B),
    'Both zero-match copies retain the no-unrelated-results disclaimer');
} catch (e) {
  assert(false, 'Sandbox failed: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25U · NAICS no-match truth: FAILED' : 'Phase 25U · NAICS no-match truth: OK');

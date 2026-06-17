// Phase 25T · NAICS zero-match UX
// ──────────────────────────────────────────────────────────────────────
// When SAM.gov returns rows but exact NAICS filtering drops them all,
// the buyer used to see a dead-end status message. Phase 25T replaces
// that with an actionable panel: broaden family · ignore NAICS · open
// Find NAICS · save-anyway · change result count, plus a list of
// related codes pulled from the local NAICS library.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25T · NAICS zero-match UX');

// ── DOM scaffolding ─────────────────────────────────────────────────
assert(/id="gc-tab-sam-zero-match"/.test(html),
  'Zero-match panel container #gc-tab-sam-zero-match exists');
assert(/data-gc-sam-zero-match="true"/.test(html),
  'Zero-match container carries data-gc-sam-zero-match attribute');

// ── Required actions, copy, helpers ─────────────────────────────────
[
  /Broaden NAICS family/,
  /Ignore NAICS for this search/,
  /Open Find NAICS/,
  /Save this NAICS anyway/,
  /Change result count/,
  /No exact NAICS matches found/,
  /SourceDeck does not show unrelated NAICS results as matches/
].forEach(function(re){
  assert(re.test(html), 'Zero-match panel contains: ' + re.source);
});

// ── Status line carries mode descriptor ─────────────────────────────
assert(/NAICS ignored by user/.test(html),
  'Status line can announce ignored NAICS');
assert(/broadened NAICS family/.test(html),
  'Status line can announce broadened NAICS family + code');
assert(/applied NAICS/.test(html),
  'Status line can announce applied NAICS + code');

// ── Saved profile entries carry verified/source flags ───────────────
assert(/verified: !!row/.test(html),
  'Saved profile entries record verified flag from local library lookup');
assert(/source: row \? 'local-library' : 'manual'/.test(html),
  "Saved profile entries record source as local-library or manual");

// ── Sandbox: drive a zero-match through gcTabSearchSam and confirm
//    the panel renders, status line shows mode descriptor, and the
//    Save-anyway / broaden / ignore handlers flip state. ─────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('window.gcTabSearchSam ='));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(){
    var el = { _value: '', value: '', _innerHTML: '', _textContent: '', _options: [], _checked: false, focus: function(){}, click: function(){} };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    Object.defineProperty(el, 'textContent', { get: function(){ return el._textContent; }, set: function(v){ el._textContent = v; } });
    Object.defineProperty(el, 'options', { get: function(){ return { length: el._options.length }; } });
    el.parentElement = { querySelector: function(){ return null; } };
    el.style = { display: '' };
    return el;
  }
  function ge(id){ if (!inputs[id]) inputs[id] = fakeEl(); return inputs[id]; }
  ge('gc-tab-sam-limit')._value = '25';
  ge('gc-tab-f-naics')._value = '541618';
  ge('gc-tab-f-naics-mode')._value = 'apply';

  var sandbox = {
    document: {
      getElementById: ge,
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: {
      sd: {
        credentials: { status: function(){ return Promise.resolve({ present: { 'sam-gov': true } }); } },
        govcon: {
          samSearch: function(){
            return Promise.resolve({
              opportunities: [
                { noticeId: 'a', naicsCode: '334519', title: 'X' },
                { noticeId: 'b', naicsCode: '333415', title: 'Y' },
                { noticeId: 'c', naicsCode: '333611', title: 'Z' }
              ]
            });
          }
        },
        govconOpportunities: { upsert: function(){ return Promise.resolve(); }, list: function(){ return Promise.resolve([]); } }
      },
      toast: function(){},
      naicsLookupCode: function(c){
        if (c === '541618') return { code: c, verified: true, label: 'Other Management Consulting Services', section: '54' };
        return { code: c, verified: false };
      },
      naicsRelatedCodes: function(){
        return [
          { code: '541611', label: 'Administrative Management', section: '54' },
          { code: '541330', label: 'Engineering Services', section: '54' }
        ];
      },
      naicsFinderOpen: function(){ inputs['naics-finder-modal'] = inputs['naics-finder-modal'] || fakeEl(); inputs['naics-finder-modal'].style.display = 'flex'; }
    },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);

  return sandbox.window.gcTabSearchSam().then(async function(){
    // Drain microtasks.
    for (var i = 0; i < 8; i++) await Promise.resolve();

    // Zero-match panel is visible.
    var zm = inputs['gc-tab-sam-zero-match'];
    assert(zm && zm.style.display === '',
      'Zero-match panel becomes visible (display === "")');
    assert(zm && /No exact NAICS matches found/.test(zm._innerHTML),
      'Zero-match panel renders the "No exact NAICS matches found" headline');
    assert(zm && /SourceDeck does not show unrelated NAICS results as matches/.test(zm._innerHTML),
      'Zero-match panel renders the no-unrelated-matches disclaimer');
    assert(zm && /541611/.test(zm._innerHTML),
      'Zero-match panel includes related code suggestion (541611)');

    // Status line shows mode descriptor.
    var st = inputs['gc-tab-sam-search-status'];
    assert(st && /applied NAICS 541618/.test(st._textContent),
      'Status line announces applied NAICS 541618 mode (got "' + (st && st._textContent) + '")');
    assert(st && /visible 0/.test(st._textContent),
      'Status line announces visible 0 count');
    assert(st && /returned 3/.test(st._textContent),
      'Status line announces returned 3 count');

    // Broaden handler flips the mode.
    sandbox.window.gcTabSamBroaderSearch();
    await Promise.resolve();
    assert(inputs['gc-tab-f-naics-mode']._value === 'broaden',
      'gcTabSamBroaderSearch flips the mode selector to broaden');

    // Ignore handler flips the mode and preserves NAICS field.
    inputs['gc-tab-f-naics-mode']._value = 'apply';
    sandbox.window.gcTabSamKeywordOnly();
    await Promise.resolve();
    assert(inputs['gc-tab-f-naics-mode']._value === 'ignore',
      'gcTabSamKeywordOnly flips the mode selector to ignore');
    assert(inputs['gc-tab-f-naics']._value === '541618',
      'gcTabSamKeywordOnly preserves the NAICS field value');

    // ApplyRelated populates the NAICS field with the chosen related code.
    inputs['gc-tab-f-naics-mode']._value = 'broaden';
    sandbox.window.gcTabSamApplyRelated('541330');
    await Promise.resolve();
    assert(inputs['gc-tab-f-naics']._value === '541330',
      'gcTabSamApplyRelated populates the NAICS field with the selected related code');
    assert(inputs['gc-tab-f-naics-mode']._value === 'apply',
      'gcTabSamApplyRelated resets mode to Apply NAICS for the related-code search');

    console.log(process.exitCode ? 'Phase 25T · NAICS zero-match UX: FAILED' : 'Phase 25T · NAICS zero-match UX: OK');
    process.exit(process.exitCode ? 1 : 0);
  }).catch(function(err){
    assert(false, 'Async exercise failed: ' + err.message);
    console.log('Phase 25T · NAICS zero-match UX: FAILED');
    process.exit(1);
  });
} catch (e) {
  assert(false, 'Sandbox failed to bootstrap: ' + e.message);
  console.log('Phase 25T · NAICS zero-match UX: FAILED');
  process.exit(1);
}

// Phase 25T · NAICS fallback search modes
// ──────────────────────────────────────────────────────────────────────
// The buyer can choose how strict the NAICS filter is per search:
//   - Apply NAICS (default) — only rows whose NAICS matches exactly.
//   - Broaden NAICS family — match by 4-digit prefix family.
//   - Ignore NAICS — skip the NAICS filter entirely for one search.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25T · NAICS fallback search');

// ── DOM scaffolding ─────────────────────────────────────────────────
assert(/id="gc-tab-f-naics-mode"/.test(html),
  'NAICS mode selector #gc-tab-f-naics-mode exists');
assert(/data-gc-tab-naics-mode="true"/.test(html),
  'NAICS mode selector carries data-gc-tab-naics-mode attribute');
assert(/<option value="apply" selected>Apply NAICS<\/option>/.test(html),
  'Default mode is Apply NAICS');
assert(/<option value="broaden">Broaden NAICS family<\/option>/.test(html),
  'Broaden NAICS family option present');
assert(/<option value="ignore">Ignore NAICS<\/option>/.test(html),
  'Ignore NAICS option present');

// ── Handlers ────────────────────────────────────────────────────────
[
  'gcTabSamBroaderSearch',
  'gcTabSamKeywordOnly',
  'gcTabSamApplyRelated',
  'gcTabSamSaveNaicsAnyway',
  'gcTabSamChangeResultCount'
].forEach(function(fn){
  assert(html.indexOf('window.' + fn + ' =') >= 0,
    'window.' + fn + ' is defined');
});

// ── _samFilters reads naicsMode ─────────────────────────────────────
assert(/filters\.naicsMode = mode/.test(html),
  '_samFilters records the active NAICS mode on the filters object');

// ── Ignore mode drops NAICS from the IPC payload ────────────────────
assert(/filters\.naicsMode === 'ignore'[\s\S]*delete ipcFilters\.naics/.test(html),
  'Ignore mode strips NAICS from the IPC payload before the SAM call');

// ── Broaden mode uses prefix matching ───────────────────────────────
assert(/mode === 'broaden'/.test(html),
  '_samMatchesNaics branches on broaden mode');
assert(/wanted\[i\]\.slice\(0, 4\)/.test(html),
  'Broaden mode uses 4-digit prefix matching');

// ── Sandbox: simulate apply vs broaden vs ignore ────────────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('window.gcTabSearchSam ='));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(){
    var el = { _value: '', value: '', _innerHTML: '' };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
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
    window: { sd: null, toast: function(){} },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  var expose = "window._samApplyLocalFilters = _samApplyLocalFilters; window._samMatchesNaics = _samMatchesNaics;";
  var spliced = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.runInContext(spliced, sandbox);

  var rows = [
    { noticeId: 'a', naicsCode: '541618' },  // exact match for 541618
    { noticeId: 'b', naicsCode: '541611' },  // sibling — broader match
    { noticeId: 'c', naicsCode: '334519' },  // unrelated
    { noticeId: 'd', naicsCode: '541990' }   // sibling — broader match
  ];

  // Apply: only 541618 row survives.
  var exact = sandbox.window._samApplyLocalFilters(rows, {
    naics: '541618', naicsMode: 'apply'
  });
  assert(exact.length === 1 && exact[0].noticeId === 'a',
    'Apply mode keeps only the exact NAICS 541618 row');

  // Broaden: 5416-prefix rows pass (541618, 541611); 541990 (5419)
  // and 334519 drop because they don't share the 4-digit prefix.
  var broader = sandbox.window._samApplyLocalFilters(rows, {
    naics: '541618', naicsMode: 'broaden'
  });
  assert(broader.length === 2,
    'Broaden mode keeps 5416-prefix family (got ' + broader.length + ')');
  assert(broader.every(function(r){ return /^5416/.test(r.naicsCode); }),
    'Every broaden-mode row shares the 5416 four-digit prefix');
  assert(broader.every(function(r){ return r.naicsCode !== '334519'; }),
    'Broaden mode drops the unrelated 334519 row');

  // Ignore: NAICS filter is bypassed.
  var keywordOnly = sandbox.window._samApplyLocalFilters(rows, {
    naics: '541618', naicsMode: 'ignore'
  });
  assert(keywordOnly.length === 4,
    'Ignore mode does NOT apply the NAICS backstop (all rows pass)');

  // Defaulting to Apply when mode is missing.
  var noMode = sandbox.window._samApplyLocalFilters(rows, { naics: '541618' });
  assert(noMode.length === 1,
    'Missing mode defaults to Apply NAICS (only exact 541618 row passes)');
} catch (e) {
  assert(false, 'Sandbox failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25T · NAICS fallback search: FAILED' : 'Phase 25T · NAICS fallback search: OK');

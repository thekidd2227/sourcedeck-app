// Phase 25S · SAM.gov filter enforcement
// ──────────────────────────────────────────────────────────────────────
// The defect: a buyer entered NAICS 541611 in the Find Opportunities
// filter and got back results carrying NAICS 334519, 333415, 333611.
// SAM.gov's API does not always honor every filter we pass, so we add
// a local backstop that re-filters the returned rows against the
// user's intent before render. We also surface active filter chips so
// the buyer can see WHY a search returned 0 rows.
//
// Phase 25S contract:
//   1. _samApplyLocalFilters drops rows whose normalized NAICS does
//      not match any of the requested codes.
//   2. _samApplyLocalFilters drops rows whose set-aside descriptor
//      does not match the requested set-aside (with the dropdown
//      code → SAM.gov description aliases applied).
//   3. _samActiveFilterSummary produces the human-readable chip text.
//   4. _samRenderFilterChips writes the summary to
//      #gc-tab-sam-active-filters.
//   5. The DOM elements #gc-tab-sam-active-filters and
//      #gc-tab-sam-details-modal both exist inside
//      #gc-tab-find-opportunities.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25S · SAM.gov filter enforcement');

// ── DOM scaffolding ─────────────────────────────────────────────────
assert(/id="gc-tab-sam-active-filters"/.test(html),
  'Active filter chip container #gc-tab-sam-active-filters exists');
assert(/data-gc-sam-active-filters="true"/.test(html),
  'Filter chip container carries data-gc-sam-active-filters attribute');
assert(/id="gc-tab-sam-details-modal"/.test(html),
  'View Details modal #gc-tab-sam-details-modal exists');
assert(/id="gc-tab-sam-details-body"/.test(html),
  'View Details body #gc-tab-sam-details-body exists');
assert(/data-gc-sam-details-modal="true"/.test(html),
  'Details modal carries data-gc-sam-details-modal attribute');

// ── Helper functions defined ────────────────────────────────────────
[
  '_samApplyLocalFilters',
  '_samMatchesNaics',
  '_samMatchesSetAside',
  '_samRowNaics',
  '_samRowSetAside',
  '_samNaicsList',
  '_samActiveFilterSummary',
  '_samRenderFilterChips',
  '_samRenderViewDetails'
].forEach(function(fn){
  assert(html.indexOf('function ' + fn) >= 0,
    'Helper function ' + fn + ' is defined');
});

// ── gcTabSearchSam wiring ───────────────────────────────────────────
assert(/_samApplyLocalFilters\s*\(\s*raw\s*,\s*filters\s*\)/.test(html),
  'gcTabSearchSam re-filters the IPC response with _samApplyLocalFilters');
assert(/_samRenderFilterChips\s*\(\s*filters\s*\)/.test(html),
  'gcTabSearchSam renders the active filter chips');
assert(/returned\s*'\s*\+\s*returned\s*\+\s*'\s*·\s*visible\s*'\s*\+\s*res\.length/.test(html),
  'Status line reports both returned (pre-filter) and visible (post-filter) counts');
assert(/none matched/.test(html) || /none matched the/.test(html),
  'Status line explains why post-filter is 0 when raw was non-zero');

// ── Sandbox: exercise the filter logic on synthetic rows ────────────
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('window.gcTabSearchSam ='));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(id){
    var el = { _value: '', value: '', _innerHTML: '', _options: [], _checked: false };
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
  vm.runInContext(iife, sandbox);

  // Expose the inner helpers for testing by reflecting from the
  // running IIFE — we already validated their names via static regex.
  // Build a second smaller eval that re-defines the helpers in the
  // same scope, then exposes them on window.
  var expose = "window._samApplyLocalFilters = _samApplyLocalFilters; "
             + "window._samMatchesNaics = _samMatchesNaics; "
             + "window._samMatchesSetAside = _samMatchesSetAside; "
             + "window._samActiveFilterSummary = _samActiveFilterSummary; "
             + "window._samRenderFilterChips = _samRenderFilterChips; "
             + "window._samRowNaics = _samRowNaics; "
             + "window._samRowSetAside = _samRowSetAside;";
  // Splice the expose into the same IIFE so identifiers resolve.
  var spliced = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.runInContext(spliced, sandbox);

  var rows = [
    { noticeId: 'a', naicsCode: '541611', typeOfSetAsideDescription: 'Total Small Business' },
    { noticeId: 'b', naicsCode: '334519', typeOfSetAsideDescription: 'Total Small Business' },
    { noticeId: 'c', naicsCode: '541611', typeOfSetAsideDescription: 'Service-Disabled Veteran-Owned Small Business' },
    { noticeId: 'd', naicsCodes: [{ code: '541611' }], typeOfSetAside: 'WOSB' }
  ];

  var got1 = sandbox.window._samApplyLocalFilters(rows, { naics: '541611' });
  assert(got1.length === 3, 'NAICS 541611 filter drops the 334519 row (got ' + got1.length + '/4)');
  assert(got1.every(function(r){ return r.noticeId !== 'b'; }),
    'Filter result excludes the 334519 row');

  var got2 = sandbox.window._samApplyLocalFilters(rows, { naics: '541611', setAside: 'sdvosbc' });
  assert(got2.length === 1 && got2[0].noticeId === 'c',
    'NAICS + SDVOSB filter narrows to the matching row');

  var got3 = sandbox.window._samApplyLocalFilters(rows, { setAside: 'wosb' });
  assert(got3.length === 1 && got3[0].noticeId === 'd',
    'Set-aside WOSB matches via alias (typeOfSetAside="WOSB")');

  // No filter values: return everything.
  var got4 = sandbox.window._samApplyLocalFilters(rows, {});
  assert(got4.length === 4, 'No filters → all rows pass');

  // Active filter summary
  var sum = sandbox.window._samActiveFilterSummary({
    keyword: 'janitorial', naics: '541611', setAside: 'sdvosbc',
    placeOfPerformance: 'TX', dueWithinDays: 30
  });
  assert(/Keyword: janitorial/.test(sum), 'Summary includes keyword');
  assert(/NAICS: 541611/.test(sum), 'Summary includes NAICS');
  assert(/Set-aside: sdvosbc/.test(sum), 'Summary includes set-aside');
  assert(/Place: TX/.test(sum), 'Summary includes place of performance');
  assert(/Closing within: 30 days/.test(sum), 'Summary includes due-within');

  // Render the chips to the fake DOM
  sandbox.window._samRenderFilterChips({ naics: '541611' });
  var host = inputs['gc-tab-sam-active-filters'];
  assert(host && /NAICS: 541611/.test(host._innerHTML),
    'Filter chip container shows the active NAICS filter');
} catch (e){
  assert(false, 'Sandbox simulation failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25S · SAM filter enforcement: FAILED' : 'Phase 25S · SAM filter enforcement: OK');

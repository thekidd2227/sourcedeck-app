/**
 * Phase 25X — SAM filter diagnostics.
 *
 * When SAM.gov returns rows but the visible list differs, the renderer must
 * explain WHY — distinguishing (a) precise local keyword hits, (b) reliance
 * on SAM.gov's server-side full-text relevance (description-only matches),
 * and (c) rows removed by structural NAICS / set-aside filters. This guards
 * against the silent "returned N · visible 0" failure mode.
 *
 * Run:  node test/phase-25x-sam-filter-diagnostics.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
let failed = 0;
function assert(c, m){ if (!c){ console.error('  ✗ ' + m); failed = 1; } else { console.log('  ✓ ' + m); } }

console.log('\n=== Phase 25X — SAM filter diagnostics ===\n');

// ── static guards: diagnostic plumbing exists ────────────────────────────
assert(/_samLastFilterDiag/.test(html), 'renderer tracks a _samLastFilterDiag object');
assert(/keywordFallback/.test(html) && /keywordStrong/.test(html), 'diag records keywordStrong + keywordFallback');
assert(/keyword matched by SAM\.gov full-text/.test(html), 'status descriptor for server-side relevance present');
assert(/returned ' \+ returned \+ ' · visible/.test(html), 'status line shows returned + visible counts');

// ── runtime: exercise _samApplyLocalFilters + diag directly ──────────────
function bootDiag(){
  const sandbox = {
    document: { getElementById: function(){ return null; }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, addEventListener: function(){}, readyState: 'complete' },
    window: {}, localStorage: { getItem: function(){ return null; }, setItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} }, console: console
  };
  const iifeStart = html.indexOf('/* Phase 25N — GovCon tab-page switcher');
  const iifeEnd = html.indexOf('</script>', iifeStart);
  let iife = html.slice(iifeStart, iifeEnd);
  const expose = ' window._samApplyLocalFilters = _samApplyLocalFilters; window._samGetFilterDiag = function(){ return _samLastFilterDiag; }; ';
  iife = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);
  return sandbox.window;
}

const W = bootDiag();

// description delivered as a LINK → keyword invisible locally
const descLink = 'https://api.sam.gov/opportunities/v2/opportunities/x/description';
const rowsDescOnly = [
  { noticeId: '1', title: 'Base Ops Support', naicsCode: '561720', description: descLink },
  { noticeId: '2', title: 'Facility Maintenance', naicsCode: '561720', description: descLink }
];
const rowsTitle = [
  { noticeId: '3', title: 'Janitorial Services A', naicsCode: '561720', description: descLink },
  { noticeId: '4', title: 'Janitorial Services B', naicsCode: '561720', description: descLink }
];

// (a) fallback: keyword set, no local hit → all rows kept, fallback flagged
let out = W._samApplyLocalFilters(rowsDescOnly, { keyword: 'janitorial', naicsMode: 'keyword-only' });
let d = W._samGetFilterDiag();
assert(out.length === 2, 'fallback keeps both server-relevant rows');
assert(d.keywordFallback === true && d.keywordStrong === 0, 'diag flags fallback (no local hit)');
assert(d.returned === 2 && d.structural === 2, 'diag records returned + structural counts');

// (b) strong: keyword in title → no fallback
out = W._samApplyLocalFilters(rowsTitle, { keyword: 'janitorial', naicsMode: 'keyword-only' });
d = W._samGetFilterDiag();
assert(out.length === 2 && d.keywordStrong === 2 && d.keywordFallback === false, 'diag flags strong local matches, no fallback');

// (c) structural removal: set-aside drops everything → visible 0 honestly
out = W._samApplyLocalFilters(rowsDescOnly.map(function(r){ return Object.assign({}, r, { typeOfSetAsideDescription: 'Total Small Business' }); }), { keyword: 'janitorial', setAside: 'wosb', naicsMode: 'keyword-only' });
d = W._samGetFilterDiag();
assert(out.length === 0 && d.structural === 0 && d.returned === 2, 'diag attributes 0 visible to structural (set-aside) removal, not keyword');

// (d) no keyword: diag has no fallback, returns structural untouched
out = W._samApplyLocalFilters(rowsDescOnly, { naicsMode: 'exact' });
d = W._samGetFilterDiag();
assert(out.length === 2 && d.keywordFallback === false && d.keywordStrong === 0, 'no-keyword path leaves rows + clean diag');

console.log('\n' + (failed ? 'FAIL' : 'PASS') + ' — Phase 25X filter diagnostics\n');
process.exit(failed ? 1 : 0);

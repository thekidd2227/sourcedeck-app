/**
 * Phase 25X — SAM.gov keyword search produces VISIBLE results.
 *
 * Regression target (P0): a keyword search ("janitorial") returned 25 rows
 * from SAM.gov but showed 0 because the local keyword relevance backstop
 * rejected every row. Root cause: SAM.gov's v2 list payload delivers the
 * opportunity `description` only as a LINK, never inline text, so the local
 * haystack (title/agency/NAICS/solnum) cannot see the keyword even though
 * SAM.gov's server-side `q` full-text search matched it in the description
 * body. The local matcher therefore must NEVER drop server-relevant rows.
 *
 * This test runs the real renderer IIFE in a sandbox and drives
 * gcTabSearchSam end-to-end against mock SAM responses.
 *
 * Run:  node test/phase-25x-sam-keyword-visible-results.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
let failed = 0;
function assert(c, m){ if (!c){ console.error('  ✗ ' + m); failed = 1; } else { console.log('  ✓ ' + m); } }

console.log('\n=== Phase 25X — SAM keyword visible results ===\n');

// Build a sandbox that executes the GovCon tab IIFE and lets us set the
// filter-input values + the rows the mock SAM.gov search returns.
function makeSandbox(opts){
  opts = opts || {};
  const inputs = opts.inputs || {};
  const rows = opts.rows || [];
  const captured = { ipcFilters: null };

  function el(extra){ return Object.assign({ value: '', style: {}, _innerHTML: '', set innerHTML(v){ this._innerHTML = v; }, get innerHTML(){ return this._innerHTML; }, setAttribute: function(){}, textContent: '' }, extra || {}); }
  const results = el(); const empty = el({ style: { display: '' } });
  const status = el(); const zero = el(); const chips = el(); const naicsVal = el();
  const limitEl = el({ value: String(opts.limit || 25) });
  const elements = {
    'gc-tab-find-results': results,
    'gc-tab-find-empty': empty,
    'gc-tab-sam-search-status': status,
    'gc-tab-sam-zero-match': zero,
    'gc-tab-sam-active-filters': chips,
    'gc-tab-f-naics-validation': naicsVal,
    'gc-tab-sam-limit': limitEl,
    'gc-tab-sam-key-status': el(),
    'gc-tab-sam-key-missing': el({ style: { display: '' } }),
    'gc-tab-search-sam-btn': el({ disabled: false }),
    'gc-tab-f-keyword': el({ value: inputs.keyword || '' }),
    'gc-tab-f-naics': el({ value: inputs.naics || '' }),
    'gc-tab-f-setaside': el({ value: inputs.setAside || '' }),
    'gc-tab-f-pop': el({ value: '' }),
    'gc-tab-f-due': el({ value: '' }),
    'gc-tab-f-status': el({ value: '' }),
    'gc-tab-f-naics-mode': el({ value: inputs.naicsMode || 'exact' })
  };

  const sandbox = {
    document: {
      getElementById: function(id){ return elements[id] || null; },
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: {
      sd: {
        credentials: { status: function(){ return Promise.resolve({ present: { 'sam-gov': true } }); } },
        govcon: {
          samSearch: function(f){ captured.ipcFilters = f; return Promise.resolve(rows.slice()); },
          opportunities: { upsert: function(){ return Promise.resolve({ ok: true }); }, list: function(){ return Promise.resolve().then(function(){ return []; }); } }
        }
      },
      toast: function(){},
      open: function(){},
      naicsRelatedCodes: function(){ return []; },
      naicsLookupCode: function(){ return { verified: true, label: 'x' }; }
    },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };

  const iifeStart = html.indexOf('/* Phase 25N — GovCon tab-page switcher');
  const iifeEnd = html.indexOf('</script>', iifeStart);
  let iife = html.slice(iifeStart, iifeEnd);
  // expose internals for assertions
  const expose = ' window._samGetFilterDiag = function(){ return _samLastFilterDiag; }; window._samApplyLocalFilters = _samApplyLocalFilters; ';
  iife = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);
  return { sandbox, elements, results, status, zero, captured };
}

function rowCount(s){ return (s.results._innerHTML.match(/data-gc-sam-fresh-row="/g) || []).length; }

async function run(){
  // The DESCRIPTION-link scenario: SAM.gov matched "janitorial" in the
  // description body server-side, but the list rows carry description ONLY
  // as a URL and the titles do NOT contain the keyword. The OLD code hid
  // all of these. They MUST now be visible.
  const descLinkRows = [];
  for (let i = 0; i < 25; i++){
    descLinkRows.push({
      noticeId: 'NID-' + i, solicitationNumber: 'SOL-' + i,
      title: 'Base Operations Support Services ' + i,           // no "janitorial"
      fullParentPathName: 'Department of the Army',
      naicsCode: '561720',
      typeOfSetAsideDescription: '',
      postedDate: '2026-06-01', responseDeadLine: '2026-07-15',
      description: 'https://api.sam.gov/opportunities/v2/opportunities/NID-' + i + '/description' // a LINK, not text
    });
  }

  // ── keyword-only mode: the user-reported failure exactly ──────────────
  let s = makeSandbox({ inputs: { keyword: 'janitorial', naics: '561720, 238', naicsMode: 'keyword-only' }, rows: descLinkRows, limit: 25 });
  await s.sandbox.window.gcTabSearchSam();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert(rowCount(s) === 25, 'keyword-only: all 25 SAM.gov rows are VISIBLE (got ' + rowCount(s) + ', was 0 before fix)');
  assert(/visible 25/.test(s.status.textContent), 'status line reports visible 25, not visible 0');
  assert(/keyword: janitorial/.test(s.status.textContent), 'status line surfaces the active keyword');
  assert(/keyword matched by SAM\.gov full-text/.test(s.status.textContent), 'status explains rows came from server-side relevance');
  assert(s.zero._innerHTML === '' || s.zero.style.display === 'none', 'no false "0 matches" zero-match panel shown');
  // keyword-only must NOT pass NAICS to SAM.gov
  assert(!s.captured.ipcFilters.naics, 'keyword-only strips NAICS from the IPC payload');
  assert(s.captured.ipcFilters.keyword === 'janitorial', 'keyword is still sent to SAM.gov in the IPC payload');

  // ── keyword present in TITLE: locally verifiable, still all visible ───
  const titleRows = descLinkRows.slice(0, 10).map(function(r, i){ return Object.assign({}, r, { title: 'Janitorial Services Contract ' + i }); });
  let s2 = makeSandbox({ inputs: { keyword: 'janitorial', naicsMode: 'exact' }, rows: titleRows, limit: 25 });
  await s2.sandbox.window.gcTabSearchSam();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert(rowCount(s2) === 10, 'title-match: all 10 rows visible (got ' + rowCount(s2) + ')');
  assert(/keyword matched locally/.test(s2.status.textContent), 'status notes locally-verified keyword match');

  // ── mixed: 3 title-hits + 22 description-only — ALL 25 visible, hits first
  const mixed = titleRows.slice(0, 3).concat(descLinkRows.slice(0, 22));
  let s3 = makeSandbox({ inputs: { keyword: 'janitorial', naicsMode: 'keyword-only' }, rows: mixed, limit: 25 });
  await s3.sandbox.window.gcTabSearchSam();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert(rowCount(s3) === 25, 'mixed set: ALL 25 rows visible — no genuine row hidden (got ' + rowCount(s3) + ')');
  const diag = s3.sandbox.window._samGetFilterDiag();
  assert(diag.keywordStrong === 3 && diag.keywordFallback === false, 'diag: 3 strong hits, no fallback in mixed set');
  // strong rows promoted to top
  const firstRowId = (s3.results._innerHTML.match(/data-gc-sam-fresh-row="([^"]+)"/) || [])[1];
  assert(/^NID-/.test(firstRowId) || /SOL-/.test(firstRowId), 'a promoted (title-hit) row renders first');

  // ── structural filter (set-aside) genuinely removes all → honest 0 ────
  const saRows = descLinkRows.map(function(r){ return Object.assign({}, r, { typeOfSetAsideDescription: 'Total Small Business' }); });
  let s4 = makeSandbox({ inputs: { keyword: 'janitorial', setAside: 'wosb', naicsMode: 'keyword-only' }, rows: saRows, limit: 25 });
  await s4.sandbox.window.gcTabSearchSam();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert(rowCount(s4) === 0, 'set-aside mismatch: honestly 0 visible (the set-aside, not the keyword, removed them)');
  assert(/set-aside/.test(s4.zero._innerHTML), 'zero panel attributes the empty result to the set-aside filter');

  console.log('\n' + (failed ? 'FAIL' : 'PASS') + ' — Phase 25X keyword visible results\n');
  process.exit(failed ? 1 : 0);
}

run().catch(function(e){ console.error('Sandbox crashed: ' + e.stack); process.exit(1); });

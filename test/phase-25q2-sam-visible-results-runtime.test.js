// Phase 25Q-2 · SAM.gov visible results runtime
// ──────────────────────────────────────────────────────────────────────
// Phase 25Q shipped a fix that rendered fresh SAM.gov results into
// #gc-tab-find-results — and the sandbox unit test passed. In live
// usage the rows still vanished. Root cause: refreshSavedPursuitsPreview
// shared the same #gc-tab-find-results / #gc-tab-find-empty elements,
// and was called immediately after renderSamFreshResults (and again
// after every Save / Mark Pursue, and again on every tab activation).
// Because it `await`ed sd.govcon.opportunities.list() — which resolves
// AFTER the render call — the next microtask wiped innerHTML to '' and
// re-showed the empty state.
//
// Phase 25Q-2 makes refreshSavedPursuitsPreview a no-op (saved
// opportunities live exclusively on the Saved Pursuits tab now). This
// test asserts that after gcTabSearchSam resolves AND all queued
// microtasks drain, the freshly-rendered rows are still in the DOM
// and the empty state is hidden.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25Q-2 · SAM visible results runtime');

// ── refreshSavedPursuitsPreview no longer mutates the find-results
//    container ─────────────────────────────────────────────────────
const previewStart = html.indexOf('async function refreshSavedPursuitsPreview');
const previewEnd = html.indexOf('window.gcTabRenderSavedPursuits', previewStart);
const previewBody = html.slice(previewStart, previewEnd);
assert(!/listEl\.innerHTML = ''/.test(previewBody),
  'refreshSavedPursuitsPreview no longer wipes #gc-tab-find-results innerHTML');
assert(!/emptyEl\.style\.display = ''/.test(previewBody),
  'refreshSavedPursuitsPreview no longer re-shows the empty state');
assert(/return;/.test(previewBody),
  'refreshSavedPursuitsPreview returns immediately (no-op)');

// ── Sandbox simulation: drain microtasks before asserting state ─────
async function simulate(limit){
  var iifeStart = html.indexOf('/* Phase 25N — GovCon tab-page switcher');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var resultsEl = { _innerHTML: '', _display: 'none', style: { set display(v){ resultsEl._display = v; }, get display(){ return resultsEl._display; } }, set innerHTML(v){ resultsEl._innerHTML = v; }, get innerHTML(){ return resultsEl._innerHTML; } };
  var emptyEl = { _display: '', style: { set display(v){ emptyEl._display = v; }, get display(){ return emptyEl._display; } } };
  var statusEl = { _txt: '', _display: 'none', style: { set display(v){ statusEl._display = v; }, get display(){ return statusEl._display; } }, set textContent(v){ statusEl._txt = v; }, get textContent(){ return statusEl._txt; } };
  var limitEl = { value: String(limit) };
  var pillEl = { textContent: '', style: { color: '' }, setAttribute: function(){} };
  var bannerEl = { style: { _d:'', set display(v){ bannerEl.style._d = v; }, get display(){ return bannerEl.style._d; } } };
  var btnEl = { disabled: false };

  // Mock `sd.govcon.opportunities.list` to resolve AFTER samSearch
  // does — this is the exact ordering that masked the bug in
  // production. We add a tiny resolved-promise hop to force the
  // saved-pursuits preview to land on the microtask queue AFTER the
  // fresh render writes innerHTML.
  var sandbox = {
    document: {
      getElementById: function(id){
        if (id === 'gc-tab-find-results') return resultsEl;
        if (id === 'gc-tab-find-empty') return emptyEl;
        if (id === 'gc-tab-sam-search-status') return statusEl;
        if (id === 'gc-tab-sam-limit') return limitEl;
        if (id === 'gc-tab-sam-key-status') return pillEl;
        if (id === 'gc-tab-sam-key-missing') return bannerEl;
        if (id === 'gc-tab-search-sam-btn') return btnEl;
        return null;
      },
      querySelectorAll: function(){ return []; },
      querySelector: function(){ return null; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: {
      sd: {
        credentials: { status: function(){ return Promise.resolve({ present: { 'sam-gov': true } }); } },
        govcon: {
          samSearch: function(filters){
            var n = (filters && filters.limit) || 25;
            var rows = [];
            for (var i = 0; i < n; i++){
              rows.push({
                noticeId: 'NID-' + i,
                solicitationNumber: 'SOL-' + i,
                title: 'Mock opp ' + i,
                fullParentPathName: 'Mock Agency',
                naicsCode: '561720',
                typeOfSetAsideDescription: 'SDVOSB',
                postedDate: '2026-06-01',
                responseDeadLine: '2026-07-15',
                placeOfPerformance: { city: 'San Diego', state: 'CA' },
                description: 'Mock description ' + i,
                uiLink: 'https://sam.gov/opp/mock-' + i
              });
            }
            return Promise.resolve(rows);
          },
          opportunities: {
            upsert: function(){ return Promise.resolve({ ok: true }); },
            // Resolves async — same microtask ordering as the live IPC.
            list: function(){ return Promise.resolve().then(function(){ return []; }); }
          }
        }
      },
      toast: function(){},
      open: function(){}
    },
    localStorage: { getItem: function(){ return null; }, setItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch(e){} },
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);

  await sandbox.window.gcTabSearchSam();
  for (var i = 0; i < 8; i++){ await Promise.resolve(); }
  return { resultsEl: resultsEl, emptyEl: emptyEl, statusEl: statusEl, sandbox: sandbox };
}

async function sandboxSaveFlow(){
  var s = await simulate(25);
  s.sandbox.window.gcTabSamSave('NID-0');
  for (var i = 0; i < 8; i++){ await Promise.resolve(); }
  var rowsAfter = (s.resultsEl._innerHTML.match(/data-gc-sam-fresh-row="/g) || []).length;
  assert(rowsAfter === 25,
    'After Save click, 25 rows still in DOM (got ' + rowsAfter + ')');
  assert(s.emptyEl._display === 'none',
    'After Save click, empty state stays hidden');
  assert(/data-gc-sam-fresh-status-pill="NID-0"[^>]*>saved</.test(s.resultsEl._innerHTML),
    'Row 0 status pill updates to "saved" after Save');
}

async function run(){
  // ── 50-row scenario: matches the user-reported screenshot ─────────
  var s50 = await simulate(50);
  assert(s50.resultsEl._display === '',
    'After 50-row search + microtask drain, #gc-tab-find-results is visible');
  assert(s50.emptyEl._display === 'none',
    'After 50-row search + microtask drain, empty state is hidden');
  var rows50 = (s50.resultsEl._innerHTML.match(/data-gc-sam-fresh-row="/g) || []).length;
  assert(rows50 === 50,
    'Exactly 50 rows render in DOM after microtask drain (got ' + rows50 + ')');
  assert(s50.resultsEl._innerHTML.length > 0,
    'innerHTML is NOT wiped to empty string after microtask drain');
  assert(/Mock opp 0/.test(s50.resultsEl._innerHTML),
    'First row title is visible in rendered DOM');
  assert(/Mock opp 49/.test(s50.resultsEl._innerHTML),
    'Last row title is visible in rendered DOM');
  assert(/Showing up to 50 results/.test(s50.statusEl._txt),
    'Status line announces "Showing up to 50 results"');

  // ── 25 / 75 / 100 scenarios: confirm selector controls visible row count
  for (var i = 0; i < 3; i++){
    var lim = [25, 75, 100][i];
    var s = await simulate(lim);
    var rows = (s.resultsEl._innerHTML.match(/data-gc-sam-fresh-row="/g) || []).length;
    assert(rows === lim,
      'Selector at ' + lim + ' renders exactly ' + lim + ' rows (got ' + rows + ')');
    assert(s.resultsEl._display === '',
      'Selector at ' + lim + ': results container stays visible');
    assert(s.emptyEl._display === 'none',
      'Selector at ' + lim + ': empty state stays hidden');
  }

  var actions = ['view-details','save-to-sourcedeck','mark-pursue','archive','open-sam-source'];
  actions.forEach(function(a){
    assert(s50.resultsEl._innerHTML.indexOf('data-gc-sam-fresh-action="' + a + '"') >= 0,
      'Rendered row contains action button: ' + a);
  });

  await sandboxSaveFlow();

  console.log(process.exitCode ? 'Phase 25Q-2 · SAM visible results runtime: FAILED' : 'Phase 25Q-2 · SAM visible results runtime: OK');
  process.exit(process.exitCode ? 1 : 0);
}

run().catch(function(e){
  assert(false, 'Sandbox simulation crashed: ' + e.message);
  console.log('Phase 25Q-2 · SAM visible results runtime: FAILED');
  process.exit(1);
});

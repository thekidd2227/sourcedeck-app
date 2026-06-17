// Phase 25Q · SAM.gov results rendering
// ──────────────────────────────────────────────────────────────────────
// The Phase 25Q defect: after Search SAM.gov, the user sees the toast
// "Returned 25 opportunities. Open Saved Pursuits or refresh after
// saving." but no rows render in Find Opportunities. Root cause: the
// pre-25Q gcTabSearchSam fetched results, surfaced the count, then
// called refreshSavedPursuitsPreview() — which only renders saved /
// pursuing rows pulled from sd.govcon.opportunities.list().
//
// Phase 25Q caches the fresh results in a module-level array and
// renders them into #gc-tab-find-results so the buyer can review
// them immediately, save individually, or mark pursue.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25Q · SAM.gov results rendering');

// ── Search button + results container present ───────────────────────
assert(/id="gc-tab-search-sam-btn"[^>]*onclick="gcTabSearchSam\(\)"/.test(html),
  'Search SAM.gov button calls gcTabSearchSam()');
assert(/id="gc-tab-find-results"/.test(html),
  'Fresh-results container #gc-tab-find-results exists');
assert(/id="gc-tab-find-empty"/.test(html),
  'Empty-state container #gc-tab-find-empty exists');

// ── gcTabSearchSam renders results into #gc-tab-find-results ────────
assert(/_samFreshResults = res/.test(html),
  'gcTabSearchSam caches the fresh results in a module-level array');
assert(/renderSamFreshResults\(res\)/.test(html),
  'gcTabSearchSam renders the fresh results immediately');
assert(/function renderSamFreshResults\(rows\)/.test(html),
  'renderSamFreshResults() is defined');

// ── Pre-25Q misleading copy is gone ─────────────────────────────────
assert(!html.includes('Open Saved Pursuits or refresh after saving'),
  'Pre-25Q "Open Saved Pursuits or refresh after saving" copy is removed');

// ── New post-results copy steers the user to review-then-save ───────
assert(/Review results below, then save or mark pursue/.test(html),
  'Phase 25Q steers user to review-then-save copy');

// ── Empty-state copy when no results matched ────────────────────────
assert(/No SAM\.gov opportunities matched this search\. Adjust filters or increase result count\./.test(html),
  'Phase 25Q "no results" empty-state copy is present');

// ── Error-state copy bounds key/url leakage ─────────────────────────
assert(/SAM\.gov search failed\. Check your key, filters, or network connection\./.test(html),
  'Phase 25Q error-state copy is present');

// ── Per-result row fields present in the row HTML builder ───────────
const fields = [
  'r.title || \'(untitled)\'',
  'r.agency || r.fullParentPathName',
  'r.solicitationNumber || r.noticeId',
  'r.naicsCode || r.naics',
  'r.responseDeadLine || r.dueDate',
  'r.postedDate || r.publishDate',
  'r.typeOfSetAsideDescription || r.setAside'
];
fields.forEach(function(f){
  assert(html.indexOf(f) >= 0,
    'Row HTML builder reads field expression: ' + f);
});
assert(/Live SAM\.gov|SAM\.gov/.test(html),
  'Each row labels its source as SAM.gov / Live SAM.gov');

// ── Per-row actions: View Details, Save, Mark Pursue, Archive, Open Source
const actions = [
  { attr: 'data-gc-sam-fresh-action="view-details"',       handler: 'gcTabSamViewDetails' },
  { attr: 'data-gc-sam-fresh-action="save-to-sourcedeck"', handler: 'gcTabSamSave' },
  { attr: 'data-gc-sam-fresh-action="mark-pursue"',        handler: 'gcTabSamMarkPursue' },
  { attr: 'data-gc-sam-fresh-action="archive"',            handler: 'gcTabSamArchive' },
  { attr: 'data-gc-sam-fresh-action="open-sam-source"',    handler: 'gcTabSamOpenSource' }
];
actions.forEach(function(a){
  assert(html.includes(a.attr),
    'Per-row action wired: ' + a.attr);
  assert(html.includes('window.' + a.handler + ' ='),
    'Handler window.' + a.handler + ' is defined');
});

// ── No auto-search on page load ─────────────────────────────────────
assert(!/setTimeout\([^,]*gcTabSearchSam\b/.test(html),
  'No setTimeout that auto-invokes gcTabSearchSam()');
assert(!/addEventListener\([^)]*DOMContentLoaded[^)]*gcTabSearchSam/.test(html),
  'No DOMContentLoaded listener that auto-calls gcTabSearchSam()');

// ── No raw key copy anywhere ────────────────────────────────────────
// Phase 25S — the only legitimate "api_key=" literals are:
//   1. Documentation/comment placeholder text: api_key=…
//   2. The _samStripApiKey defensive regex literal: api_key=[^&#]*&?
// Anything resembling a real key value (api_key=<alphanum>) is a
// credential leak.
(function(){
  var matches = (html.match(/api_key=[^\s'")]*/g) || []);
  var bad = matches.filter(function(m){
    // Allow comment placeholder ellipsis.
    if (m === 'api_key=…' || m === 'api_key=') return false;
    // Allow the defensive regex literal.
    if (m === 'api_key=[^&#]*&?/gi,' || m === 'api_key=[^&#]*&?') return false;
    return true;
  });
  assert(bad.length === 0,
    'No raw "api_key=<value>" literal in renderer (offending: ' + JSON.stringify(bad) + ')');
})();
assert(!/sam-gov-key:\s*[a-zA-Z0-9]/.test(html),
  'No raw SAM.gov key literal in renderer');

// ── Sandbox simulation: feed gcTabSearchSam a mocked result set and
//    prove rows land in #gc-tab-find-results ──────────────────────────
try {
  // Extract the Phase 25N IIFE (which now contains the Phase 25Q
  // search + render functions) and run it in a sandbox.
  var iifeStart = html.indexOf('/* Phase 25N — GovCon tab-page switcher');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  // Build a minimal DOM mock that tracks innerHTML / display writes
  // on the two target elements.
  var resultsEl = { _innerHTML: '', _display: 'none', style: { set display(v){ resultsEl._display = v; }, get display(){ return resultsEl._display; } }, set innerHTML(v){ resultsEl._innerHTML = v; }, get innerHTML(){ return resultsEl._innerHTML; } };
  var emptyEl = { _display: '', style: { set display(v){ emptyEl._display = v; }, get display(){ return emptyEl._display; } }, hasAttribute: function(){ return false; }, removeAttribute: function(){}, setAttribute: function(){}, classList: { add:function(){}, remove:function(){} } };
  var statusEl = { _innerHTML: '', _display: 'none', style: { set display(v){ statusEl._display = v; }, get display(){ return statusEl._display; } }, set textContent(v){ statusEl._innerHTML = v; }, get textContent(){ return statusEl._innerHTML; } };
  var limitEl = { value: '50' };
  var pillEl = { textContent: '', style: { color: '', setProperty:function(){} }, setAttribute: function(){} };
  var bannerEl = { style: { _display:'', set display(v){ bannerEl.style._display = v; }, get display(){ return bannerEl.style._display; } } };
  var btnEl = { disabled: false };

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
            // Return a mocked SAM.gov payload — caller asked for `limit`.
            var n = (filters && filters.limit) || 25;
            var rows = [];
            for (var i = 0; i < n; i++){
              rows.push({
                noticeId: 'NID-' + i,
                solicitationNumber: 'SOL-' + i,
                title: 'Mock opportunity ' + i,
                fullParentPathName: 'Mock Agency',
                naicsCode: '561720',
                typeOfSetAsideDescription: 'SDVOSB',
                postedDate: '2026-06-01',
                responseDeadLine: '2026-07-15',
                placeOfPerformance: { city: 'San Diego', state: 'CA' },
                description: 'Mock description for opportunity ' + i,
                uiLink: 'https://sam.gov/opp/mock-' + i
              });
            }
            return Promise.resolve(rows);
          },
          opportunities: { upsert: function(){ return Promise.resolve({ ok: true }); }, list: function(){ return Promise.resolve([]); } }
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

  // Trigger a search and let the promise resolve.
  var searchPromise = sandbox.window.gcTabSearchSam();
  return Promise.resolve(searchPromise)
    .then(function(){
      assert(resultsEl._display === '',
        'After search, #gc-tab-find-results display flips to "" (visible)');
      assert(emptyEl._display === 'none',
        'After search with results, empty state hides (display=none)');
      assert(/<tbody data-gc-sam-fresh-tbody="true">/.test(resultsEl._innerHTML),
        'Results tbody is rendered with Phase 25Q data attribute');
      assert(/Mock opportunity 0/.test(resultsEl._innerHTML),
        'Mocked row title appears in rendered HTML');
      // Limit selector defaults to 50 in this sandbox; rows must be ≤ 50.
      var rowCount = (resultsEl._innerHTML.match(/data-gc-sam-fresh-row="/g) || []).length;
      assert(rowCount === 50,
        '50 rows rendered when limit selector is set to 50 (got ' + rowCount + ')');
      assert(/Showing up to 50 results/.test(statusEl._innerHTML),
        'Status line confirms the selected limit');
    })
    .then(function(){
      console.log(process.exitCode ? 'Phase 25Q · SAM results rendering: FAILED' : 'Phase 25Q · SAM results rendering: OK');
      process.exit(process.exitCode ? 1 : 0);
    })
    .catch(function(e){
      assert(false, 'Sandbox simulation crashed: ' + e.message);
      console.log('Phase 25Q · SAM results rendering: FAILED');
      process.exit(1);
    });
} catch (e) {
  assert(false, 'Sandbox simulation failed to bootstrap: ' + e.message);
  console.log('Phase 25Q · SAM results rendering: FAILED');
  process.exit(1);
}

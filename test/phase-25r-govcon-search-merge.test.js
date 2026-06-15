// Phase 25R · GovCon SAM search section merge
// ──────────────────────────────────────────────────────────────────────
// Only one active SAM.gov search form exists in Find Opportunities.
// The duplicate Phase 25M "GovCon Pipeline — Search SAM.gov · Save ·
// Pursue" section is routed to hidden-internal and never appears on
// the Find Opportunities tab. The canonical section carries the
// merged filter row (keyword, NAICS, set-aside, place of performance,
// closing window, status) plus the Phase 25Q result-count selector
// and Save / Mark Pursue actions.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25R · GovCon SAM search section merge');

// ── Duplicate Phase 25M pipeline retired from find-opportunities ────
const samPipelineMatch = html.match(/<section[^>]*id="gc-sam-pipeline"[^>]*>/);
assert(samPipelineMatch, '#gc-sam-pipeline section still exists in DOM (Phase 23C reachability invariant)');
if (samPipelineMatch){
  assert(/data-gc-tab-page="hidden-internal"/.test(samPipelineMatch[0]),
    '#gc-sam-pipeline is routed to hidden-internal (not find-opportunities)');
  assert(!/data-gc-tab-page="find-opportunities"/.test(samPipelineMatch[0]),
    '#gc-sam-pipeline is no longer routed to find-opportunities');
}

// ── Exactly one Search SAM.gov primary button in Find Opportunities ─
const findStart = html.indexOf('id="gc-tab-find-opportunities"');
const findEnd = html.indexOf('</section>', findStart);
const find = html.slice(findStart, findEnd);
const searchButtonsInFind = (find.match(/onclick="gcTabSearchSam/g) || []).length;
assert(searchButtonsInFind === 2,
  'Find Opportunities exposes exactly two Search-handler buttons: 🔎 Search SAM.gov + ↻ Refresh (both call gcTabSearchSam, got ' + searchButtonsInFind + ')');

// ── Merged filter row present ───────────────────────────────────────
const filters = [
  { id: 'gc-tab-f-keyword',  label: 'Keyword' },
  { id: 'gc-tab-f-naics',    label: 'NAICS' },
  { id: 'gc-tab-f-setaside', label: 'Set-aside' },
  { id: 'gc-tab-f-pop',      label: 'Place of Performance' },
  { id: 'gc-tab-f-due',      label: 'Closing within (days)' },
  { id: 'gc-tab-f-status',   label: 'Status / type' }
];
filters.forEach(function(f){
  assert(find.includes('id="' + f.id + '"'),
    'Filter field "' + f.label + '" (#' + f.id + ') is in the canonical Find Opportunities section');
});

// ── Find NAICS button exists ────────────────────────────────────────
assert(/id="gc-tab-find-naics-btn"/.test(find),
  'Find NAICS button is wired in the canonical section');
assert(/onclick="naicsFinderOpen\(\)"/.test(find),
  'Find NAICS button opens the NAICS Finder modal');

// ── Result-count selector with 25/50/75/100, default 25 ─────────────
assert(/id="gc-tab-sam-limit"/.test(find),
  'Result-count selector #gc-tab-sam-limit is in the canonical section');
[25, 50, 75, 100].forEach(function(v){
  assert(find.includes('value="' + v + '"'),
    'Result-count option ' + v + ' is present');
});
assert(/<option value="25" selected>/.test(find),
  'Default result-count is 25');

// ── Refresh + Clear filters buttons ─────────────────────────────────
assert(/id="gc-tab-refresh-btn"/.test(find),
  'Refresh button is present');
assert(/id="gc-tab-clear-filters-btn"/.test(find),
  'Clear filters button is present');

// ── Single canonical results container ──────────────────────────────
const findResultsCount = (find.match(/id="gc-tab-find-results"/g) || []).length;
assert(findResultsCount === 1,
  'Exactly one canonical results container #gc-tab-find-results inside the section');

// ── Filters are read by gcTabSearchSam via _samFilters ──────────────
assert(/function _samFilters\(\)/.test(html),
  '_samFilters() reader is defined');
assert(/var raw = await window\.sd\.govcon\.samSearch\(filters\)/.test(html),
  'gcTabSearchSam passes the merged filters object to sd.govcon.samSearch');
assert(/window\.gcTabClearFilters/.test(html),
  'window.gcTabClearFilters helper is defined');

// ── Status line includes "visible" count (per Phase 25R contract) ───
assert(html.includes("' · visible '"),
  'Status line announces visible row count');

// ── No "Search SAM.gov · Save · Pursue" copy on find-opportunities ──
assert(!find.includes('Search SAM.gov · Save · Pursue'),
  'The retired Phase 25M "Search SAM.gov · Save · Pursue" headline is not on the Find Opportunities tab');

console.log(process.exitCode ? 'Phase 25R · GovCon SAM search section merge: FAILED' : 'Phase 25R · GovCon SAM search section merge: OK');

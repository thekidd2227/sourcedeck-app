// Phase 25M · In-app SAM.gov search + Save / Mark Pursue / Open Source
// ──────────────────────────────────────────────────────────────────────
// Asserts the GovCon Pipeline renders SAM.gov opportunity search
// inside SourceDeck (not a new browser tab/window), wires the search
// through the secure credential boundary (sd.govcon.samSearch), and
// surfaces per-row Save to SourceDeck / Mark Pursue / Archive / Open
// SAM.gov Source / View Details actions. Search is user-triggered
// only — no auto-search on page load.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25M · In-app SAM.gov search + save');

// ── Pipeline section present ─────────────────────────────────────────
assert(/id="gc-sam-pipeline"/.test(html),
  'GovCon Pipeline section exists in the renderer');
assert(/data-phase-25m="sam-pipeline"/.test(html),
  'GovCon Pipeline carries the Phase 25M marker');

// ── User-triggered search button + filters ───────────────────────────
const searchButton = /<button[^>]*id="gc-sam-search-btn"[^>]*data-gc-sam-action="search"[^>]*onclick="gcSamSearchRun\(\)"/;
assert(searchButton.test(html),
  'Search SAM.gov button is present and wired to gcSamSearchRun()');
assert(/id="gc-sam-refresh-btn"/.test(html),
  'Refresh button is present');
assert(/id="gc-sam-clear-btn"/.test(html),
  'Clear filters button is present');

const filterFields = [
  'gc-sam-f-keyword',
  'gc-sam-f-naics',
  'gc-sam-f-setaside',
  'gc-sam-f-pop',
  'gc-sam-f-due',
  'gc-sam-f-status'
];
filterFields.forEach(function(id){
  assert(html.includes('id="' + id + '"'),
    'Filter field ' + id + ' is present');
});

// ── Results render inside SourceDeck (same screen, not new browser) ──
assert(/<tbody id="gc-sam-results-tbody"/.test(html),
  'Results table body renders inside the GovCon Pipeline section');

// ── Per-row actions ──────────────────────────────────────────────────
const requiredRowActions = [
  'view-details',
  'save-to-sourcedeck',
  'mark-pursue',
  'archive',
  'open-sam-source'
];
requiredRowActions.forEach(function(a){
  const re = new RegExp("data-gc-sam-action=\"" + a + "\"");
  assert(re.test(html),
    'Result row exposes data-gc-sam-action="' + a + '"');
});
const requiredHandlers = [
  'gcSamSearchRun',
  'gcSamSaveOpportunity',
  'gcSamMarkPursue',
  'gcSamArchiveOpportunity',
  'gcSamViewDetails',
  'gcSamOpenSource',
  'gcSamClearFilters',
  'gcSamRefreshKeyStatus'
];
requiredHandlers.forEach(function(fn){
  assert(html.includes('window.' + fn + ' ='),
    'window.' + fn + ' is defined');
});

// ── SAM search bridge uses the existing IPC ──────────────────────────
assert(/window\.sd\.govcon\.samSearch\(filters\)/.test(html),
  'gcSamSearchRun routes through window.sd.govcon.samSearch()');
assert(/window\.sd\.govcon\.opportunities\.upsert\(opp\)/.test(html),
  'Save / Mark Pursue / Archive route through sd.govcon.opportunities.upsert()');

// ── No auto-search on page load ──────────────────────────────────────
const pipelineSlice = html.slice(html.indexOf('Phase 25M — GovCon SAM Pipeline'));
assert(/No auto-search on load/.test(pipelineSlice) || /no auto-search on page load/.test(pipelineSlice),
  'Pipeline source comment acknowledges no-auto-search-on-load posture');
assert(!/setTimeout\(\s*gcSamSearchRun/.test(html),
  'No setTimeout that auto-invokes gcSamSearchRun()');
assert(!/addEventListener\([^)]*DOMContentLoaded[^)]*gcSamSearchRun/.test(html),
  'No DOMContentLoaded listener that calls gcSamSearchRun() directly');

// ── Open SAM.gov Source opens external browser ───────────────────────
assert(/window\.open\(url, '_blank', 'noopener,noreferrer'\)/.test(html),
  'Open SAM.gov Source uses window.open with safe rel attributes');

// ── Result row schema fields (verified by source comment) ────────────
const resultFields = [
  'title', 'agency', 'solicitationNumber', 'noticeId', 'naics',
  'setAside', 'postedDate', 'dueDate', 'placeOfPerformance',
  'sourceUrl', 'importedAt', 'userStatus'
];
resultFields.forEach(function(f){
  assert(html.indexOf(f + ':') > 0,
    'Result schema field "' + f + '" exists in upsert payload');
});

// ── Dashboard active pursuits surface refresh on save/pursue ─────────
assert(/window\.renderDashboardLaunchpad/.test(html),
  'Save / Mark Pursue trigger Dashboard launchpad refresh');

console.log(process.exitCode ? 'Phase 25M · In-app SAM.gov search + save: FAILED' : 'Phase 25M · In-app SAM.gov search + save: OK');

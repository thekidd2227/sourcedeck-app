// Phase 25Q · Save / Mark Pursue linkage from fresh SAM results
// ──────────────────────────────────────────────────────────────────────
// When the user clicks Save to SourceDeck or Mark Pursue on a fresh
// SAM.gov result row, the opportunity flows through
// sd.govcon.opportunities.upsert with the right userStatus and the
// downstream surfaces (Saved Pursuits preview, Dashboard active
// pursuits, Proposal Workspace selector) refresh.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25Q · SAM save / mark-pursue linkage');

// ── Save / Mark Pursue / Archive handlers go through upsert ─────────
assert(/window\.gcTabSamSave\s*=\s*async function\(id\)/.test(html),
  'window.gcTabSamSave is defined as async');
assert(/window\.gcTabSamMarkPursue\s*=\s*async function\(id\)/.test(html),
  'window.gcTabSamMarkPursue is defined as async');
assert(/window\.gcTabSamArchive\s*=\s*async function\(id\)/.test(html),
  'window.gcTabSamArchive is defined as async');
assert(/_samUpsert\(id,\s*'saved'\)/.test(html),
  'Save handler calls _samUpsert(id, "saved")');
assert(/_samUpsert\(id,\s*'pursuing'\)/.test(html),
  'Mark Pursue handler calls _samUpsert(id, "pursuing")');
assert(/_samUpsert\(id,\s*'archived'\)/.test(html),
  'Archive handler calls _samUpsert(id, "archived")');

// ── _samUpsert builds the schema-correct opportunity payload ────────
// Take a generous slice — the function ends with `return opp; }` and
// we want every field declaration in between.
const upsertStart = html.indexOf('async function _samUpsert');
const upsertBody = html.slice(upsertStart, upsertStart + 4000);
const requiredFields = [
  'id: stableId',
  "source: 'SAM.gov'",
  'title: ',
  'agency: ',
  'solicitationNumber: ',
  'noticeId: ',
  'naics: ',
  'setAside: ',
  'postedDate: ',
  'dueDate: ',
  'placeOfPerformance: ',
  'sourceUrl: ',
  'userStatus: userStatus'
];
requiredFields.forEach(function(f){
  assert(upsertBody.indexOf(f) >= 0,
    '_samUpsert payload carries field: ' + f);
});
assert(/window\.sd\.govcon\.opportunities\.upsert\(opp\)/.test(upsertBody),
  '_samUpsert calls sd.govcon.opportunities.upsert(opp)');

// ── Saved Pursuits preview refresh ─────────────────────────────────
assert(/refreshSavedPursuitsPreview\(\)/.test(html),
  'gcTabSearchSam + save handlers call refreshSavedPursuitsPreview()');

// ── Dashboard launchpad refresh ────────────────────────────────────
assert(/window\.renderDashboardLaunchpad\(\{\}\)/.test(html),
  'Save / Mark Pursue trigger Dashboard launchpad refresh');

// ── Proposal Workspace selector reads sd.govcon.opportunities.list ─
// (Phase 25M established this contract; we verify the SourceDeck
// renderer still calls list() for the SAM-imported optgroup so the
// saved opportunity flows to the selector.)
assert(/sd\.govcon\.opportunities\.list/.test(html),
  'Renderer still calls sd.govcon.opportunities.list() (Phase 25M contract: feeds Proposal Workspace selector)');

// ── No submit/send/upload controls on the Find Opportunities tab ───
const findStart = html.indexOf('id="gc-tab-find-opportunities"');
const findEnd = html.indexOf('</section>', findStart);
const find = html.slice(findStart, findEnd);
[/>\s*Submit Bid\s*</, />\s*Submit Quote\s*</, />\s*Send Email\s*</, /\bupload to SAM\b/i, /\bupload to PIEE\b/i, /\bupload to eBuy\b/i].forEach(function(re){
  assert(!re.test(find),
    'Find Opportunities does NOT contain forbidden control: ' + re);
});

// ── View Details + Open SAM.gov Source surface but never submit ────
assert(/window\.gcTabSamViewDetails/.test(html),
  'View Details handler is defined');
assert(/window\.gcTabSamOpenSource/.test(html),
  'Open SAM.gov Source handler is defined');
assert(/window\.open\(url, '_blank', 'noopener,noreferrer'\)/.test(html),
  'Open SAM.gov Source uses window.open with safe rel');

console.log(process.exitCode ? 'Phase 25Q · SAM save / pursue linkage: FAILED' : 'Phase 25Q · SAM save / pursue linkage: OK');

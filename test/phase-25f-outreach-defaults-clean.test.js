'use strict';

/**
 * Phase 25F — Outreach Defaults Clean
 *
 * Asserts the Outreach inputs and Outreach sample rows do not surface
 * operator-flavored or auto-loaded data on a clean buyer cold-open.
 *
 * Day 0 GUI testing surfaced that the Outreach pane shipped:
 * - input placeholder "561710 561720" (Janitorial + Landscape NAICS)
 * - input placeholder "janitorial, pest"
 * - input placeholder "MD or 20782" (operator state + ZIP)
 * - 18 hardcoded data-or-source="sample" rows that auto-rendered
 *   regardless of the demo-mode toggle state
 * - empty-state copy "Loading GovCon opportunities from Airtable..."
 *
 * Phase 25F retires those defaults. Sample rows are hidden by default
 * via inline display:none + the data-phase-25f marker; gcDemoLoadSample()
 * / gcDemoClearSample() now toggle them in unison with the demo banner.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Outreach NAICS input placeholder is neutral', () => {
  // Old placeholder "561710 561720" suggested a specific operator
  // vertical (janitorial + landscape services). The new placeholder
  // is illustrative only.
  assert.doesNotMatch(
    HTML,
    /id="out-naics"[^>]*placeholder="561710 561720"/,
    'old "561710 561720" placeholder must be retired'
  );
  assert.match(
    HTML,
    /id="out-naics"[^>]*placeholder="NAICS codes \(e\.g\. 541330\)"/,
    'NAICS placeholder must be neutral guidance'
  );
});

test('Outreach keywords input placeholder is neutral', () => {
  assert.doesNotMatch(
    HTML,
    /id="out-keywords"[^>]*placeholder="janitorial, pest"/,
    'old "janitorial, pest" placeholder must be retired'
  );
  assert.match(
    HTML,
    /id="out-keywords"[^>]*placeholder="keywords \(e\.g\. facility services\)"/
  );
});

test('Outreach place-of-performance input placeholder is neutral', () => {
  assert.doesNotMatch(
    HTML,
    /id="out-place"[^>]*placeholder="MD or 20782"/,
    'old "MD or 20782" placeholder must be retired'
  );
  assert.match(
    HTML,
    /id="out-place"[^>]*placeholder="state or ZIP"/
  );
});

test('All Outreach sample rows are hidden by default via inline display:none', () => {
  // Phase 25F: every gc-or-row with data-or-source="sample" must also
  // carry the data-phase-25f marker AND start with display:none in
  // its inline style. The visibility is toggled at runtime by
  // gcDemoLoadSample() / gcDemoClearSample().
  const SAMPLE_ROW = /<div class="gc-or-row" data-or-source="sample" data-phase-25f="sample-hidden-by-default" style="display:none;/g;
  const matches = HTML.match(SAMPLE_ROW) || [];
  assert.ok(
    matches.length >= 18,
    'expected ≥ 18 hidden Outreach sample rows (found ' + matches.length + ')'
  );
  // Defense in depth: no gc-or-row with data-or-source="sample" may
  // ship WITHOUT the data-phase-25f marker (catches a future
  // contributor adding a new sample row that auto-renders).
  const ALL_SAMPLE_ROWS = HTML.match(/<div class="gc-or-row" data-or-source="sample"/g) || [];
  assert.equal(
    matches.length,
    ALL_SAMPLE_ROWS.length,
    'every gc-or-row[data-or-source="sample"] must carry the Phase 25F hidden marker'
  );
});

test('gcDemoLoadSample / gcDemoClearSample wire the sample-row visibility helper', () => {
  // The demo toggle helper must exist and must be invoked from both
  // the load and clear functions plus the init() cold-open path.
  assert.match(
    HTML,
    /function gcSetSampleRowVisibility\(visible\)/,
    'gcSetSampleRowVisibility helper must exist'
  );
  assert.match(
    HTML,
    /gcDemoLoadSample[\s\S]{0,800}gcSetSampleRowVisibility\(true\)/,
    'gcDemoLoadSample must reveal sample rows'
  );
  assert.match(
    HTML,
    /gcDemoClearSample[\s\S]{0,800}gcSetSampleRowVisibility\(false\)/,
    'gcDemoClearSample must hide sample rows'
  );
  // The init() function reads the persisted demo flag and reapplies
  // the visibility on cold open so a stale localStorage demo flag
  // still reveals rows correctly.
  assert.match(
    HTML,
    /function init\(\)\{\s*var active = isDemoActive\(\);\s*setBanner\(active\);[\s\S]{0,300}gcSetSampleRowVisibility\(active\)/,
    'init() must sync sample row visibility with the persisted demo flag'
  );
});

test('GovCon Pipeline empty-state copy no longer reads "Loading GovCon opportunities from Airtable…"', () => {
  assert.doesNotMatch(
    HTML,
    /Loading GovCon opportunities from Airtable/,
    'old Airtable loading copy must be retired'
  );
  assert.match(
    HTML,
    /No GovCon opportunities loaded yet\. Configure your profile or run an approved opportunity search\./,
    'new empty-state copy must replace the Airtable loading message'
  );
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25f-outreach-defaults-clean\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25f-outreach-defaults-clean.test.js'
  );
});

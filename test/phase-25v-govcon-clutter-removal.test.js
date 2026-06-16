/**
 * Phase 25V — GovCon clutter removal regression test.
 *
 * Asserts the GovCon workspace no longer carries the heavy clutter the
 * user flagged:
 *   - "GovCon Outreach OS" helper card removed.
 *   - Large bottom "Human Review Required" warning panels removed and
 *     replaced with a small concise safety footer.
 *   - "Scope" GovCon tab removed (lives in Proposal Workspace intake).
 *   - "Stakeholder Graph" removed from the runtime.
 * The no-send / draft-only safety posture is preserved in concise copy.
 *
 * Static string assertions only; never executes app/renderer code.
 *
 * Run:  node test/phase-25v-govcon-clutter-removal.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25V — GovCon clutter removal ===\n');

// 1. GovCon Outreach OS card removed.
test('GovCon Outreach OS helper card removed', () => {
  assert.ok(!/class="gc-os-helper"/.test(HTML), 'gc-os-helper card must be removed');
  assert.ok(!/>GovCon Outreach OS</.test(HTML), '"GovCon Outreach OS" card title must be removed');
  assert.ok(!/Find opportunities → score fit → prepare draft outreach/.test(HTML),
    'Outreach OS journey copy must be removed');
});

// 2. Heavy human-review bottom panels removed; concise footer present.
test('heavy "Human Review Required" bottom panels replaced with concise footers', () => {
  // The burgundy bottom panels used rgba(110,31,44,...) backgrounds with a
  // "Human Review Required" mono label inside a padded block. The concise
  // footers use the gc-safety-footer class.
  assert.ok(/class="[^"]*gc-safety-footer/.test(HTML), 'concise safety footer must exist');
  assert.ok(/Draft-only workspace\. SourceDeck does not submit, upload, or send external messages\./.test(HTML),
    'concise safety footer copy must exist');
  // The three big panels (Solicitation / Vendors+Pricing / Past Performance)
  // must no longer render the heavy burgundy "Human Review Required" block.
  const heavyPanels = (HTML.match(/border:1px solid rgba\(110,31,44,0\.45\)[^>]*>\s*<div[^>]*>Human Review Required<\/div>/g) || []).length;
  assert.strictEqual(heavyPanels, 0, 'heavy Human Review Required panels must be removed; found ' + heavyPanels);
});

// 3. Safety boundary copy preserved (concise, not stripped).
test('no-send / no-submit boundary copy preserved', () => {
  assert.ok(/SourceDeck does not submit bids/.test(HTML), 'no-submit boundary copy preserved');
  assert.ok(/does not submit, upload, or send external messages/.test(HTML),
    'concise no-send/no-upload boundary copy preserved');
});

// 4. Scope tab removed.
test('Scope GovCon tab removed', () => {
  assert.ok(!/data-gc-tab="scope"/.test(HTML), 'Scope tab button must be removed');
  assert.ok(!/data-gc-tab-page="scope"/.test(HTML), 'Scope tab page must be removed');
  assert.ok(!/id="gc-tab-scope"/.test(HTML), 'gc-tab-scope section must be removed');
});

// 5. Stakeholder Graph removed from runtime.
test('Stakeholder Graph removed from runtime', () => {
  assert.ok(!/id="gc-stakeholder-graph"/.test(HTML), '#gc-stakeholder-graph must be removed');
  assert.ok(!/data-stakeholder-category=/.test(HTML), 'stakeholder sample rows must be removed');
  assert.ok(!/window\.gcLoadStakeholderGraph/.test(HTML), 'gcLoadStakeholderGraph must be removed');
  assert.ok(!/data-tour-feature="stakeholder-graph"/.test(HTML), 'stakeholder tour feature must be removed');
});

// 6. Canonical Find Opportunities + NAICS + result-count preserved.
test('canonical GovCon search surfaces preserved', () => {
  assert.ok(/data-gc-tab="find-opportunities"/.test(HTML), 'Find Opportunities tab preserved');
  assert.ok(/id="gc-tab-sam-limit"/.test(HTML), 'result-count selector preserved');
  assert.ok(/data-gc-tab-naics-validation="true"/.test(HTML) || /naics/i.test(HTML),
    'NAICS finder preserved');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V clutter-removal checks ===\n`);
process.exit(failed ? 1 : 0);

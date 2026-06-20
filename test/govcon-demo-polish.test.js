/**
 * Phase 23A — GovCon Demo Polish regression test.
 *
 * Asserts the Demo Mode + Sample Data Loader control exists, that sample
 * data builders carry SAMPLE / Demo only / Replace before proposal use
 * labels, that the Phase 22B duplicate vendor-needs card is disambiguated,
 * that the stale Phase 22C placeholder toast is gone, that the Submission
 * Readiness empty state no longer reads like a failed score, and that
 * Past Performance has a structured CPARS rating dropdown. Confirms
 * previously merged invariants are still intact: Phase 22B-22F surfaces,
 * Response Desk Import Email + no Send Email, SAM Sprint Free=1 NAICS,
 * System Readiness/Flow remains removed, .btn-gold guard, every inline
 * <script> block still parses (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-demo-polish.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 23A — GovCon Demo Polish ===\n');

// 1. Demo Mode / sample loader control exists.
test('Demo Mode section + Load Sample button exist', () => {
  assert.ok(/id="gc-demo-mode"/.test(HTML), 'gc-demo-mode section id missing');
  assert.ok(/data-section="govcon-demo-mode"/.test(HTML), 'data-section anchor missing');
  assert.ok(/id="gc-demo-load-btn"/.test(HTML), 'Load Sample button missing');
  assert.ok(/Load Sample GovCon Demo Data/.test(HTML), 'Load Sample label missing');
  assert.ok(/onclick="gcDemoLoadSample\(\)"/.test(HTML), 'gcDemoLoadSample() onclick missing');
});

// 2. Sample data banner exists when demo data is loaded.
test('Demo Mode banner + label exist', () => {
  assert.ok(/id="gc-demo-banner"/.test(HTML), 'gc-demo-banner element missing');
  assert.ok(/SAMPLE DEMO DATA — Replace before proposal use/.test(HTML),
    'sample-demo-data banner copy missing');
  assert.ok(/id="gc-demo-state"/.test(HTML), 'gc-demo-state surface missing');
});

// 3. Sample data is visibly labeled sample/demo-only.
test('every sample row builder includes SAMPLE / Demo only / Replace labels', () => {
  // Pull the inline-script content where the sample builders live.
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  const demoBlock = scripts.find(s => /buildSampleCaptureBoard|buildSampleVendorQuotes|buildSamplePastPerformance|buildSamplePrimePartners/.test(s));
  assert.ok(demoBlock, 'Phase 23A demo-mode inline script not found');
  // Every builder must include the SAMPLE label and at least one of {Demo only, Replace before proposal use}.
  for (const builder of [
    /buildSampleCaptureBoard\s*\(\)\s*\{[\s\S]*?^\s*\}/m,
    /buildSampleVendorQuotes\s*\(\)\s*\{[\s\S]*?^\s*\}/m,
    /buildSamplePastPerformance\s*\(\)\s*\{[\s\S]*?^\s*\}/m,
    /buildSamplePrimePartners\s*\(\)\s*\{[\s\S]*?^\s*\}/m
  ]) {
    const m = builder.exec(demoBlock);
    assert.ok(m, 'sample data builder regex did not match');
    assert.ok(/SAMPLE/.test(m[0]), 'sample builder missing "SAMPLE" label: ' + m[0].slice(0, 60));
    assert.ok(/Demo [Oo]nly|Replace before proposal use/.test(m[0]),
      'sample builder missing "Demo only" / "Replace before proposal use" label: ' + m[0].slice(0, 60));
  }
});

// 4. Clear sample data control exists.
test('Clear Sample Demo Data control exists', () => {
  assert.ok(/id="gc-demo-clear-btn"/.test(HTML), 'Clear Sample button missing');
  assert.ok(/Clear Sample Demo Data/.test(HTML), 'Clear Sample label missing');
  assert.ok(/onclick="gcDemoClearSample\(\)"/.test(HTML), 'gcDemoClearSample() onclick missing');
});

// 5. No sample data appears as real submitted/completed/awarded status.
test('sample data does not imply real submitted / completed / awarded status', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  const demoBlock = scripts.find(s => /buildSampleSubmissionState/.test(s));
  assert.ok(demoBlock, 'sample submission-state builder missing');
  // No 'Ready for Human Review' / 'submitted' / 'awarded' / 'won' in sample data.
  for (const re of [
    /['"]Ready for Human Review['"]/,
    /submitted\s*[:=]\s*true/i,
    /awarded\s*[:=]\s*true/i,
    /completed\s*[:=]\s*true/i,
    /'awarded'/i,
    /'won'/i
  ]) {
    assert.ok(!re.test(demoBlock), 'sample data implies real submitted/completed/awarded status: ' + re);
  }
  // The sample final-human-approval row MUST NOT be 'Reviewed'.
  assert.ok(/final_human_approval_recorded:\s*'Not started'/.test(demoBlock),
    'sample final_human_approval_recorded should remain "Not started"');
});

// 6. Duplicate vendor-needs wording is clarified.
test('Phase 22B Vendor Needs card is disambiguated from Phase 22D Vendor Quote Room', () => {
  // Phase 22B card relabeled to "Vendor Needs (capture board)"
  assert.ok(/Vendor Needs \(capture board\)/.test(HTML),
    'Phase 22B vendor card relabel "Vendor Needs (capture board)" missing');
  // Phase 22D Vendor / Subcontractor Needs label still exists (Vendor Quote Room).
  assert.ok(/Vendor \/ Subcontractor Needs/.test(HTML),
    'Phase 22D Vendor / Subcontractor Needs label missing');
  // Phase 22B empty-state copy points to the Vendor Quote Room.
  assert.ok(/Detailed vendor quote rows live in the Vendor Quote Room below/.test(HTML),
    'Phase 22B empty-state should redirect to Vendor Quote Room below');
});

// 7. Stale Phase 22C placeholder copy is gone.
test('stale "Solicitation Workspace placeholder — Phase 22C ships the full surface." copy is gone', () => {
  assert.ok(!/Solicitation Workspace placeholder — Phase 22C ships the full surface\./.test(HTML),
    'stale placeholder toast still present');
  assert.ok(!/ships the full surface/.test(HTML),
    'stale "ships the full surface" copy still present');
});

// 8. Solicitation Workspace current copy exists.
test('Solicitation Center copy is removed', () => {
  assert.ok(!/Open the Solicitation Center below/.test(HTML), 'removed Solicitation Center copy still present');
});

// 9. Submission readiness empty state is not misleading.
test('Submission readiness empty state shows "—%" or "No package started"', () => {
  // Score default must be "—%" instead of "0%" so the cold open doesn't look like a failed score.
  assert.ok(/id="gc-sub-score"[^>]*>—%</.test(HTML),
    'default score should render "—%" (Phase 23A polish)');
  // Status default must be neutral.
  assert.ok(/id="gc-sub-status"[^>]*>No package started</.test(HTML),
    'default readiness status should render "No package started" (Phase 23A polish)');
  // The renderer must have an "untouched" check that prevents stale "0% / Not Ready" cold open.
  assert.ok(/function isUntouched\b/.test(HTML),
    'isUntouched() check missing — score must not show 0%/Not Ready until operator interacts');
});

// 10. CPARS / performance note field has safer structured or "Not entered" handling.
test('Past Performance has structured CPARS rating dropdown with "Not entered" default', () => {
  assert.ok(/id="gc-pp-f-cpars-rating"/.test(HTML), 'CPARS rating dropdown missing');
  for (const v of ['Not entered', 'Exceptional', 'Very Good', 'Satisfactory', 'Marginal', 'Unsatisfactory']) {
    assert.ok(new RegExp('<option[^>]*value="' + v + '"').test(HTML),
      'CPARS rating option missing: ' + v);
  }
  // Persisted into the record.
  assert.ok(/cparsRating:\s*\(v\('gc-pp-f-cpars-rating'\)/.test(HTML),
    'gcPpAddRecord should persist cparsRating');
});

// 11. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 12. No Submit Bid button exists.
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'a Submit Bid button is present');
  assert.ok(!/onclick="submitBid\b/i.test(HTML), 'a submitBid() onclick is wired');
});

// 13. No Submit Quote button exists.
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'a Submit Quote button is present');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML), 'a submitQuote() onclick is wired');
});

// 14. No auto-send behavior exists.
test('no positive auto-send copy or behavior', () => {
  assert.ok(!/auto_send\s*[:=]\s*true/i.test(HTML), 'auto_send:true present');
  assert.ok(!/send automatically/i.test(HTML), 'positive "send automatically" phrase present');
});

// 15. No auto-submit behavior exists.
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto[-_]submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
  assert.ok(!/Export and submit/i.test(HTML), 'positive "Export and submit" phrase present');
});

// 16. No fake submitted status exists (Phase 23A sample data must not imply real submission).
test('no fake "submitted" / "ready to submit" status anywhere', () => {
  // The sample submission state must not include "Ready for Human Review" or similar.
  assert.ok(!/sample[^a-z]*submitted/i.test(HTML), 'sample submitted status present');
  assert.ok(!/awarded\s*[:=]\s*true/i.test(HTML), 'awarded:true present');
});

// 17. No unsupported compliance claim exists.
test('no positive FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / watsonx-live / signed-and-notarized claim', () => {
  // These can only appear in NEGATED contexts (do-not-claim lists, fixtures).
  // For the renderer specifically, no positive claim:
  const renderer = HTML;
  // We only allow these strings if they sit inside the existing do-not-claim guards.
  // The renderer must NOT add a NEW positive assertion.
  for (const re of [
    /\bSourceDeck (?:is|holds) (?:FedRAMP authorized|SOC ?2 certified|CMMC certified|HIPAA certified|HITRUST certified|ISO 27001 certified)/i,
    /\bwatsonx (?:is|runs) live in production\b/i,
    /\bsigned and notarized\s+(?:macOS )?build\b(?!\s*\(unless)/i
  ]) {
    assert.ok(!re.test(renderer), 'positive compliance/runtime claim added: ' + re);
  }
});

// 18. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 19. Phase 22B Capture Command Center remains.
test('Phase 22B Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 20. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(!/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace removed');
  for (const id of []) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 21. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
  for (const id of ['gc-vqr-intake-form','gc-vqr-table','gc-pr-out-price','gc-pr-out-margin','gc-pr-quote-compare-table','gc-pr-margin-warn','gc-pr-missing-warn']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22D anchor missing: ' + id);
  }
});

// 22. Phase 22E Past Performance / Capability / Prime Partner remains.
test('Phase 22E Past Performance + Capability + Prime Partner remains intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf', 'gc-pp-intake-form', 'gc-cs-outline', 'gc-ppf-intake-form', 'gc-pp-tbody', 'gc-ppf-tbody']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22E anchor missing: ' + id);
  }
});

// 23. Phase 22F Submission Readiness Gate remains.
test('Phase 22F Submission Readiness Gate remains intact', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'Submission Readiness Gate section missing');
  for (const id of ['gc-sub-score','gc-sub-status','gc-sub-package-status','gc-sub-checklist-body','gc-pkg-export','gc-pkg-preview']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22F anchor missing: ' + id);
  }
});

// 24. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
});

// 25. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 26. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 7, 'expected ≥7 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 27. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 23A govcon-demo-polish checks ===\n`);
process.exit(failed ? 1 : 0);

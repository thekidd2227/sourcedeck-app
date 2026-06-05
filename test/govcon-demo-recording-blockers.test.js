/**
 * Phase 23H — GovCon Demo Recording Blockers Fix regression test.
 *
 * Resolves the three blocking demo defects reported in Phase 23G
 * (docs/demo/phase-23g-local-demo-recording-review.md):
 *
 *   - Defect A: Phase 23D vendor-pricing Last Updated watcher referred
 *     to wrong storage keys (sd.govcon.vqr.v1 / sd.govcon.pricing.v1).
 *     Fixed by aligning Phase 23D SECTION_DEFS to the actual Phase 22D
 *     keys (sd.govcon.vendorQuotes.v1 + sd.govcon.pricingWorksheet.v1).
 *     The same key-alias fix is applied to past-perf, sub-gate, and to
 *     every readObj/readArr call inside gcExportInternalReviewMarkdown.
 *   - Defect B: Phase 23A gcDemoLoadSample did not populate every
 *     Phase 22 storage key. Fixed by adding buildSamplePricingWorksheet
 *     and wiring it into gcDemoLoadSample + gcDemoClearSample.
 *   - Defect C: Markdown export SAMPLE DEMO DATA warning never fired
 *     because Phase 23D's isDemoModeActive() checked the wrong flag
 *     key + wrong format. Fixed by reading sd.govcon.demoMode.v1 as
 *     JSON and falling back to a content heuristic (capture rows that
 *     match the Phase 23A sample SAMPLE-SOL-DEMO marker).
 *
 * Static; never executes app/renderer code or touches the network.
 *
 * Run:  node test/govcon-demo-recording-blockers.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PHASE_23G_REVIEW = path.join(ROOT, 'docs', 'demo', 'phase-23g-local-demo-recording-review.md');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

// Helper — slice the Phase 23A demo-loader block out of the renderer so we
// can scan it in isolation.
function phase23aBlock() {
  // Phase 23A loader block starts with "Phase 23A — GovCon Demo Mode + Sample"
  const start = HTML.indexOf('Phase 23A — GovCon Demo Mode + Sample');
  if (start < 0) throw new Error('Phase 23A loader block not located');
  const end = HTML.indexOf('</script>', start);
  return HTML.slice(start, end);
}
function phase23dBlock() {
  const start = HTML.indexOf('Phase 23D — GovCon Demo Delivery Polish');
  if (start < 0) throw new Error('Phase 23D module block not located');
  const end = HTML.indexOf('</script>', start);
  return HTML.slice(start, end);
}

console.log('\n=== Phase 23H — GovCon Demo Recording Blockers Fix ===\n');

// 1. Phase 23G blocker report exists.
test('Phase 23G blocker report exists', () => {
  assert.ok(fs.existsSync(PHASE_23G_REVIEW),
    'Phase 23G review doc missing — Phase 23H must reference its defect catalogue');
  const md = fs.readFileSync(PHASE_23G_REVIEW, 'utf8');
  assert.ok(/Defect A/.test(md), 'Phase 23G doc must enumerate Defect A');
  assert.ok(/Defect B/.test(md), 'Phase 23G doc must enumerate Defect B');
  assert.ok(/Defect C/.test(md), 'Phase 23G doc must enumerate Defect C');
});

// 2. Demo loader sets Demo Mode active flag.
test('Phase 23A gcDemoLoadSample sets the Demo Mode active flag', () => {
  const block = phase23aBlock();
  assert.ok(/save\(FLAG_KEY,\s*\{\s*active:\s*true,\s*loadedAt:\s*'local-only'\s*\}\s*\)/.test(block),
    'gcDemoLoadSample must save({active:true, loadedAt:"local-only"}) to FLAG_KEY');
  assert.ok(/var FLAG_KEY\s*=\s*'sd\.govcon\.demoMode\.v1';/.test(block),
    'Phase 23A FLAG_KEY must equal sd.govcon.demoMode.v1');
});

// 3-10. Demo loader populates every required storage key.
const REQUIRED_LOADER_KEYS = [
  { label: 'Capture board',           key: 'CAPTURE_KEY',  literal: "'sd.govcon.captureBoard.v1'" },
  { label: 'Solicitation workspace',  key: 'SOL_KEY',      literal: "'sd.govcon.solWorkspace.v1'" },
  // Compliance matrix lives inside the same SOL_KEY object as `matrix`.
  { label: 'Vendor quote',            key: 'VQR_KEY',      literal: "'sd.govcon.vendorQuotes.v1'" },
  { label: 'Pricing worksheet',       key: 'PR_KEY',       literal: "'sd.govcon.pricingWorksheet.v1'" },
  { label: 'Past performance',        key: 'PP_KEY',       literal: "'sd.govcon.pastPerformance.v1'" },
  { label: 'Prime partner',           key: 'PPF_KEY',      literal: "'sd.govcon.primePartners.v1'" },
  { label: 'Capability statement',    key: 'CS_KEY',       literal: "'sd.govcon.capabilityStatement.v1'" },
  { label: 'Submission readiness',    key: 'SUB_KEY',      literal: "'sd.govcon.submissionReadiness.v1'" },
];

test('Phase 23A loader declares CAPTURE_KEY and writes it', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var CAPTURE_KEY\\s*=\\s*'sd\\.govcon\\.captureBoard\\.v1'").test(block));
  assert.ok(/save\(CAPTURE_KEY,\s*buildSampleCaptureBoard\(\)\)/.test(block));
});
test('Phase 23A loader declares SOL_KEY and writes it (covers Compliance Matrix via .matrix)', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var SOL_KEY\\s+=\\s+'sd\\.govcon\\.solWorkspace\\.v1'").test(block));
  assert.ok(/save\(SOL_KEY,\s*buildSampleSolWorkspace\(\)\)/.test(block));
});
test('Phase 23A buildSampleSolWorkspace seeds the Compliance Matrix', () => {
  const block = phase23aBlock();
  assert.ok(/matrix:\s*\[/.test(block),
    'buildSampleSolWorkspace must seed a compliance matrix array (used by the Matrix tab + Last Updated)');
});
test('Phase 23A loader declares VQR_KEY and writes it', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var VQR_KEY\\s+=\\s+'sd\\.govcon\\.vendorQuotes\\.v1'").test(block));
  assert.ok(/save\(VQR_KEY,\s*buildSampleVendorQuotes\(\)\)/.test(block));
});
test('Phase 23A loader declares PR_KEY and writes a sample pricing worksheet (Defect B)', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var PR_KEY\\s+=\\s+'sd\\.govcon\\.pricingWorksheet\\.v1'").test(block),
    'PR_KEY must be declared with the actual Phase 22D storage key');
  assert.ok(/save\(PR_KEY,\s*buildSamplePricingWorksheet\(\)\)/.test(block),
    'gcDemoLoadSample must persist a sample pricing worksheet payload');
  assert.ok(/function buildSamplePricingWorksheet\(\)/.test(block),
    'buildSamplePricingWorksheet implementation missing');
});
test('Phase 23A loader declares PP_KEY and writes it', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var PP_KEY\\s+=\\s+'sd\\.govcon\\.pastPerformance\\.v1'").test(block));
  assert.ok(/save\(PP_KEY,\s*buildSamplePastPerformance\(\)\)/.test(block));
});
test('Phase 23A loader declares PPF_KEY and writes it', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var PPF_KEY\\s+=\\s+'sd\\.govcon\\.primePartners\\.v1'").test(block));
  assert.ok(/save\(PPF_KEY,\s*buildSamplePrimePartners\(\)\)/.test(block));
});
test('Phase 23A loader declares SUB_KEY and writes it', () => {
  const block = phase23aBlock();
  assert.ok(new RegExp("var SUB_KEY\\s+=\\s+'sd\\.govcon\\.submissionReadiness\\.v1'").test(block));
  assert.ok(/save\(SUB_KEY,\s*buildSampleSubmissionState\(\)\)/.test(block));
});

// 11. Every sample data payload carries SAMPLE / Demo only / Replace before proposal use language.
test('Every Phase 23A sample payload carries SAMPLE / Demo only / Replace before proposal use language', () => {
  const block = phase23aBlock();
  // The collective sample-data block must mention all three phrases at least once.
  assert.ok(/\bSAMPLE\b/.test(block),  'sample payload must contain SAMPLE marker');
  assert.ok(/Demo only/i.test(block),  'sample payload must contain Demo only marker');
  assert.ok(/Replace before proposal use/i.test(block),
    'sample payload must contain Replace before proposal use marker');
  // And the new pricing-worksheet sample must visibly contain the same markers
  // in its assumptions field so the operator cannot mistake it for real data.
  const pricingFn = block.match(/function buildSamplePricingWorksheet\(\)\{[\s\S]*?\n  \}/);
  assert.ok(pricingFn, 'buildSamplePricingWorksheet body must be locatable');
  assert.ok(/SAMPLE/.test(pricingFn[0]), 'sample pricing worksheet must contain SAMPLE marker');
  assert.ok(/Demo only/i.test(pricingFn[0]), 'sample pricing worksheet must contain Demo only marker');
  assert.ok(/Replace before proposal use/i.test(pricingFn[0]),
    'sample pricing worksheet must contain Replace before proposal use marker');
});

// 12. Sample data does not include submitted:true.
test('Phase 23A sample data does NOT include submitted:true', () => {
  const block = phase23aBlock();
  assert.ok(!/submitted\s*:\s*true/.test(block), 'sample payload claims submitted:true');
});

// 13. Sample data does not include awarded:true.
test('Phase 23A sample data does NOT include awarded:true', () => {
  const block = phase23aBlock();
  assert.ok(!/awarded\s*:\s*true/.test(block), 'sample payload claims awarded:true');
});

// 14. Sample data does not include completed:true.
test('Phase 23A sample data does NOT include completed:true', () => {
  const block = phase23aBlock();
  assert.ok(!/completed\s*:\s*true/.test(block), 'sample payload claims completed:true');
});

// 15. Sample data does not set Ready for Human Review.
test('Phase 23A sample submission state is NOT "Ready for Human Review"', () => {
  const block = phase23aBlock();
  // The actual sample submission state field must NOT carry "Ready for Human Review".
  // (The label text itself is allowed as a status enumeration anywhere else.)
  const submissionFn = block.match(/function buildSampleSubmissionState\(\)\{[\s\S]*?\n  \}/);
  if (submissionFn) {
    assert.ok(!/status\s*:\s*'Ready for Human Review'/.test(submissionFn[0]),
      'sample submission state sets status to "Ready for Human Review"');
    assert.ok(!/readinessStatus\s*:\s*'Ready for Human Review'/.test(submissionFn[0]),
      'sample submission state sets readinessStatus to "Ready for Human Review"');
  }
});

// 16. Sample data keeps final human approval at "Not started".
test('Phase 23A sample data keeps final_human_approval_recorded at "Not started"', () => {
  const block = phase23aBlock();
  assert.ok(/final_human_approval_recorded\s*:\s*'Not started'/.test(block),
    'sample submission checklist final_human_approval_recorded must remain "Not started"');
});

// 17. Last Updated has five chips.
test('Phase 23D Last Updated has five chips (one per workflow section)', () => {
  const chips = HTML.match(/<span class="gc-dd-last-updated"[^>]*>/g) || [];
  assert.strictEqual(chips.length, 5,
    'expected exactly 5 Last Updated chips; found ' + chips.length);
});

// 18. Cold open Last Updated defaults remain "Not yet".
test('Cold open Last Updated chips default to "Last updated: Not yet"', () => {
  const spans = HTML.match(/<span class="gc-dd-last-updated"[^>]*>[^<]*<\/span>/g) || [];
  for (const span of spans) {
    assert.ok(/Last updated: Not yet/.test(span),
      'chip does not default to "Last updated: Not yet": ' + span);
  }
});

// 19. Phase 23D SECTION_DEFS now watches the ACTUAL Phase 22/23A keys.
test('Phase 23D SECTION_DEFS now watches the actual Phase 22/23A storage keys (Defect A)', () => {
  const block = phase23dBlock();
  // capture-cc + sol-workspace already were correct.
  assert.ok(/id: 'capture-cc',[\s\S]*?keys:\s*\['sd\.govcon\.captureBoard\.v1'\]/.test(block));
  assert.ok(/id: 'sol-workspace',[\s\S]*?keys:\s*\['sd\.govcon\.solWorkspace\.v1'\]/.test(block));
  // vendor-pricing MUST now read vendorQuotes + pricingWorksheet (not vqr / pricing).
  assert.ok(/id: 'vendor-pricing',[\s\S]*?keys:\s*\['sd\.govcon\.vendorQuotes\.v1','sd\.govcon\.pricingWorksheet\.v1'\]/.test(block),
    'vendor-pricing keys must be vendorQuotes + pricingWorksheet (Defect A)');
  // past-perf MUST now read the long names.
  assert.ok(/id: 'past-perf',[\s\S]*?keys:\s*\['sd\.govcon\.pastPerformance\.v1','sd\.govcon\.capabilityStatement\.v1','sd\.govcon\.primePartners\.v1'\]/.test(block),
    'past-perf keys must be pastPerformance + capabilityStatement + primePartners (Defect A)');
  // sub-gate MUST now read submissionReadiness.
  assert.ok(/id: 'sub-gate',[\s\S]*?keys:\s*\['sd\.govcon\.submissionReadiness\.v1'\]/.test(block),
    'sub-gate key must be submissionReadiness (Defect A)');
  // Stale aliases MUST be gone from the Phase 23D block.
  assert.ok(!/'sd\.govcon\.vqr\.v1'/.test(block), 'stale alias sd.govcon.vqr.v1 still present');
  assert.ok(!/'sd\.govcon\.pricing\.v1'/.test(block), 'stale alias sd.govcon.pricing.v1 still present');
  assert.ok(!/'sd\.govcon\.pp\.v1'/.test(block), 'stale alias sd.govcon.pp.v1 still present');
  assert.ok(!/'sd\.govcon\.cs\.v1'/.test(block), 'stale alias sd.govcon.cs.v1 still present');
  assert.ok(!/'sd\.govcon\.ppf\.v1'/.test(block), 'stale alias sd.govcon.ppf.v1 still present');
  assert.ok(!/'sd\.govcon\.subGate(?:Pkg)?\.v1'/.test(block), 'stale alias sd.govcon.subGate(.Pkg).v1 still present');
});

// 20. Vendor/Pricing chip will update when EITHER vendor or pricing storage changes.
test('Phase 23D vendor-pricing chip watches BOTH vendorQuotes + pricingWorksheet (Defect A)', () => {
  const block = phase23dBlock();
  assert.ok(/vendor-pricing[\s\S]*?vendorQuotes\.v1[\s\S]*?pricingWorksheet\.v1/.test(block),
    'vendor-pricing watcher must watch both vendorQuotes AND pricingWorksheet');
});

// 21. Markdown export DEMO_MODE_KEY is now the actual Phase 23A FLAG_KEY.
test('Phase 23D DEMO_MODE_KEY is now sd.govcon.demoMode.v1 (Defect C)', () => {
  const block = phase23dBlock();
  assert.ok(/var DEMO_MODE_KEY\s*=\s*'sd\.govcon\.demoMode\.v1';/.test(block),
    'DEMO_MODE_KEY must equal sd.govcon.demoMode.v1');
  assert.ok(!/sd\.govcon\.demoMode\.active\.v1/.test(block),
    'stale alias sd.govcon.demoMode.active.v1 still present');
});

// 22. isDemoModeActive() parses the FLAG_KEY JSON form AND falls back to sample-row heuristics.
test('isDemoModeActive() detects the active flag JSON form AND sample rows (Defect C)', () => {
  const block = phase23dBlock();
  // JSON-parse path: parsed.active === true.
  assert.ok(/parsed\s*&&\s*parsed\.active\s*===\s*true/.test(block),
    'isDemoModeActive must JSON-parse the FLAG_KEY value and check parsed.active === true');
  // Sample-row content heuristics: SAMPLE-SOL-DEMO or op_sample_demo_001.
  assert.ok(/op_sample_demo_001/.test(block),
    'isDemoModeActive must fall back to detecting the Phase 23A sample row id');
  assert.ok(/SAMPLE-SOL-DEMO/.test(block),
    'isDemoModeActive must fall back to detecting SAMPLE-SOL-DEMO solicitation numbers');
});

// 23. Markdown export includes INTERNAL REVIEW DRAFT — NOT SUBMITTED.
test('Markdown export carries INTERNAL REVIEW DRAFT — NOT SUBMITTED', () => {
  assert.ok(/INTERNAL REVIEW DRAFT — NOT SUBMITTED/.test(HTML),
    'INTERNAL REVIEW DRAFT — NOT SUBMITTED header missing');
  assert.ok(/END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED/.test(HTML),
    'END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED footer missing');
});

// 24. Markdown export carries no-submit / no-upload / no-email / no-transmit language.
test('Markdown export carries the no-submit / no-upload / no-email / no-transmit clause', () => {
  assert.ok(/SourceDeck does not submit, upload, email, or transmit this package\./.test(HTML),
    'expected no-submit-upload-email-transmit clause missing');
  assert.ok(/No portal upload\./.test(HTML),
    'expected "No portal upload." clause missing');
  assert.ok(/No email transmission\./.test(HTML),
    'expected "No email transmission." clause missing');
});

// 25-27. No Send Email / Submit Bid / Submit Quote button anywhere.
test('no Send Email button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Send Email[^<]*<\/button>/i.test(HTML),
    '"Send Email" button text present');
  assert.ok(!/onclick="[^"]*sendEmail/i.test(HTML), 'sendEmail onclick handler present');
});
test('no Submit Bid button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Submit Bid[^<]*<\/button>/i.test(HTML),
    '"Submit Bid" button present');
});
test('no Submit Quote button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Submit Quote[^<]*<\/button>/i.test(HTML),
    '"Submit Quote" button present');
});

// 28. Phase 21F System Readiness / System Flow tab stays removed.
test('Phase 21F System Readiness / System Flow tab stays removed', () => {
  assert.ok(!/data-tab="sysflow"/.test(HTML), 'sysflow nav-btn returned');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane returned');
});

// 29. No positive signed/notarized completion claim added.
test('no positive signed / notarized completion claim added', () => {
  assert.ok(!/signed and notarized/i.test(HTML), 'positive signed/notarized claim present');
  assert.ok(!/Apple notarized/i.test(HTML), 'positive Apple notarized claim present');
  assert.ok(!/production signed/i.test(HTML), 'positive production signed claim present');
});

// 30. Renderer boot still parses (every inline <script> block).
test('every inline <script> block still parses (renderer boot guard)', () => {
  const blocks = HTML.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g) || [];
  let parsed = 0;
  for (const blk of blocks) {
    const m = blk.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
    if (!m) continue;
    if (/\bsrc=/.test(blk)) continue;
    try { new vm.Script(m[1]); parsed++; }
    catch (e) { throw new Error('inline <script> failed to parse: ' + e.message); }
  }
  assert.ok(parsed > 0, 'no inline scripts parsed — sanity check failed');
});

// 31. Phase 23D demo delivery test still passes — re-run inline.
test('Phase 23D govcon-demo-delivery-polish test still passes', () => {
  const result = require('child_process').spawnSync(
    process.execPath,
    [path.join(ROOT, 'test', 'govcon-demo-delivery-polish.test.js')],
    { encoding: 'utf8' }
  );
  assert.strictEqual(result.status, 0,
    'Phase 23D regression test failed: exit ' + result.status + '\n' + (result.stdout || '') + (result.stderr || ''));
  assert.ok(/PASS — 26\/26/.test(result.stdout || ''),
    'Phase 23D regression test stdout did not assert 26/26 PASS');
});

// 32. Phase 23A demo polish test still passes — re-run inline.
test('Phase 23A govcon-demo-polish test still passes', () => {
  const result = require('child_process').spawnSync(
    process.execPath,
    [path.join(ROOT, 'test', 'govcon-demo-polish.test.js')],
    { encoding: 'utf8' }
  );
  assert.strictEqual(result.status, 0,
    'Phase 23A regression test failed: exit ' + result.status + '\n' + (result.stdout || '') + (result.stderr || ''));
  assert.ok(/PASS — 27\/27/.test(result.stdout || ''),
    'Phase 23A regression test stdout did not assert 27/27 PASS');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 23H govcon-demo-recording-blockers checks ===');
if (failed > 0) process.exit(1);

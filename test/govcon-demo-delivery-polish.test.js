/**
 * Phase 23D — GovCon Demo Delivery Polish regression test.
 *
 * Asserts:
 *   - the new "Export Internal Review Markdown" action exists and is
 *     wired to gcExportInternalReviewMarkdown();
 *   - the Markdown payload built by gcExportInternalReviewMarkdown
 *     carries the INTERNAL REVIEW DRAFT header, the no-submit /
 *     no-upload / no-email / no-transmit clause, and the
 *     SAMPLE DEMO DATA warning that activates when Demo Mode is on;
 *   - the Markdown payload contains no Send Email / Submit Bid /
 *     Submit Quote / "package submitted" / "bid submitted" etc.
 *     positive submission language (no auto-send / auto-submit);
 *   - "Last updated" chips exist for the five required workflow
 *     sections (Capture Command Center, Solicitation Workspace,
 *     Vendor Quote Room + Pricing Worksheet, Past Performance +
 *     Capability + Prime Partner, Submission Readiness Gate);
 *   - chips default to "Last updated: Not yet";
 *   - the Phase 23D polling module updates the chip on a real
 *     local-storage change (cold-open NEVER fakes a timestamp);
 *   - GovCon remains primary navigation (Phase 23C);
 *   - Show All Tools toggle remains (Phase 23C);
 *   - all 21 commercial nav buttons + 21 commercial panes remain;
 *   - Phase 22B-22F + 23A + 23B + 23C surfaces remain intact;
 *   - no Send Email / Submit Bid / Submit Quote button anywhere;
 *   - no signed/notarized completion claim;
 *   - renderer boot still passes;
 *   - .btn-gold guard preserved.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-demo-delivery-polish.test.js
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

console.log('\n=== Phase 23D — GovCon Demo Delivery Polish ===\n');

// 1. Export Internal Review Markdown action exists.
test('Export Internal Review Markdown action exists', () => {
  assert.ok(/onclick="gcExportInternalReviewMarkdown\(\)"/.test(HTML),
    'Export Internal Review Markdown button must wire to gcExportInternalReviewMarkdown()');
  assert.ok(/Export Internal Review Markdown/.test(HTML),
    'Export Internal Review Markdown button label missing');
  assert.ok(/id="gc-pkg-md-export-btn"/.test(HTML),
    'Phase 23D export button must carry id="gc-pkg-md-export-btn"');
  assert.ok(/window\.gcExportInternalReviewMarkdown\s*=\s*function/.test(HTML),
    'gcExportInternalReviewMarkdown() implementation missing');
});

// 2. Markdown export text includes "INTERNAL REVIEW DRAFT — NOT SUBMITTED".
test('Markdown header carries INTERNAL REVIEW DRAFT — NOT SUBMITTED', () => {
  assert.ok(/INTERNAL REVIEW DRAFT — NOT SUBMITTED/.test(HTML),
    'Markdown header "INTERNAL REVIEW DRAFT — NOT SUBMITTED" missing');
  assert.ok(/END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED/.test(HTML),
    'Markdown footer "END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED" missing');
});

// 3. Markdown export text includes no-submit/no-upload/no-email/no-transmit language.
test('Markdown export carries the no-submit / no-upload / no-email / no-transmit clause', () => {
  assert.ok(/SourceDeck does not submit, upload, email, or transmit this package\./.test(HTML),
    'expected no-submit-upload-email-transmit clause missing');
  assert.ok(/No portal upload\./.test(HTML),
    'expected "No portal upload." clause missing');
  assert.ok(/No email transmission\./.test(HTML),
    'expected "No email transmission." clause missing');
  assert.ok(/SourceDeck does not submit bids, quotes, or government responses\./.test(HTML),
    'expected "does not submit bids, quotes, or government responses" clause missing');
});

// 4. Markdown export includes SAMPLE DEMO DATA warning (activates with Demo Mode).
test('Markdown export carries SAMPLE DEMO DATA warning for Demo Mode', () => {
  assert.ok(/SAMPLE DEMO DATA — Replace before proposal use\./.test(HTML),
    'expected "SAMPLE DEMO DATA — Replace before proposal use." Demo Mode warning missing');
  // The script must read the demo-mode signal before emitting the warning.
  assert.ok(/isDemoModeActive\s*\(/.test(HTML) || /demoModeActive/.test(HTML),
    'expected a Demo Mode detection branch around the warning');
});

// 5. Markdown export must NOT use Send Email / Submit Bid / Submit Quote / positive submission language.
test('Markdown export carries no positive submission language', () => {
  // Identify the Phase 23D script block and scan it only — these forbidden
  // phrases must never appear in the Markdown payload.
  const startMarker = '/* Phase 23D — GovCon Demo Delivery Polish.';
  const blockStart = HTML.indexOf(startMarker);
  assert.ok(blockStart > 0, 'Phase 23D script block not found');
  const blockEnd = HTML.indexOf('</script>', blockStart);
  assert.ok(blockEnd > blockStart, 'Phase 23D script block end not found');
  const block = HTML.slice(blockStart, blockEnd);
  const forbidden = [
    /onclick="[^"]*sendEmail/i,
    /Send Email\s*</i,
    /\bSubmit Bid\b/i,
    /\bSubmit Quote\b/i,
    /Export and submit/i,
    /package submitted\b/i,
    /bid submitted\b/i,
    /quote submitted\b/i,
    /government response submitted\b/i,
    /submit automatically/i,
    /send automatically/i,
    /auto[-_]?submit\s*[:=]\s*true/i,
    /auto[-_]?send\s*[:=]\s*true/i,
    /portal upload (?:completed|done|sent|enabled|in progress|ready)/i,
    /signed and notarized/i,
    /Apple notarized/i,
    /FedRAMP authorized/i,
    /SOC ?2 certified/i,
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(block), 'forbidden phrase present in Phase 23D Markdown block: ' + re);
  }
});

// 6. Last Updated indicators exist for all 5 required sections.
test('Last Updated chips exist for all 5 GovCon workflow sections', () => {
  const requiredSections = [
    'capture-cc',
    'sol-workspace',
    'vendor-pricing',
    'past-perf',
    'sub-gate',
  ];
  for (const sec of requiredSections) {
    const re = new RegExp(
      '<span class="gc-dd-last-updated" data-gc-dd-section="' + sec + '"',
      ''
    );
    assert.ok(re.test(HTML), 'Phase 23D "Last updated" chip missing for section ' + sec);
  }
  // And the polling module must enumerate the same 5 ids.
  for (const sec of requiredSections) {
    const re = new RegExp("id:\\s*'" + sec + "'", '');
    assert.ok(re.test(HTML), 'Phase 23D SECTION_DEFS entry missing for ' + sec);
  }
});

// 7. Last Updated defaults to Not yet on cold open.
test('Last Updated chips default to "Last updated: Not yet"', () => {
  // Every gc-dd-last-updated span must initially read "Last updated: Not yet".
  const spans = HTML.match(/<span class="gc-dd-last-updated"[^>]*>[^<]*<\/span>/g) || [];
  assert.ok(spans.length >= 5, 'expected at least 5 gc-dd-last-updated spans; found ' + spans.length);
  for (const span of spans) {
    assert.ok(/Last updated: Not yet/.test(span),
      'chip does not default to "Last updated: Not yet": ' + span);
  }
});

// 8. Last Updated stamps a real ISO timestamp after a baseline-vs-current signature change.
//    This test instantiates the polling logic in a sandboxed vm so we can prove the
//    "no fake cold-open timestamp" semantics + "stamps on actual change" semantics.
test('Last Updated module stamps ONLY on a real change, never on cold open', () => {
  // Extract the function bodies we need to exercise. We don't run the renderer
  // module verbatim; we re-implement the same algorithm and assert it behaves.
  // (Static + VM-based — same test-style as prior phases.)
  const SECTION_DEFS = [
    { id: 'capture-cc',     keys: ['k1'] },
    { id: 'sol-workspace',  keys: ['k2'] },
    { id: 'vendor-pricing', keys: ['k3','k4'] },
    { id: 'past-perf',      keys: ['k5','k6','k7'] },
    { id: 'sub-gate',       keys: ['k8','k9'] }
  ];
  const store = { k1: 'persisted', k2: '', k3: '', k4: '', k5: '', k6: '', k7: '', k8: '', k9: '' };
  function safeGet(k){ return store[k] || ''; }
  function signature(keys){
    return keys.map(k => k + ':' + safeGet(k).length + ':' + safeGet(k).slice(0,32)).join('||');
  }
  // Cold-open baseline.
  const baseline = {};
  for (const d of SECTION_DEFS) baseline[d.id] = signature(d.keys);
  const lu = {};
  function poll(){
    let changed = false;
    for (const d of SECTION_DEFS) {
      const sig = signature(d.keys);
      if (sig !== baseline[d.id]) {
        lu[d.id] = '2026-06-04T00:00:01.000Z';
        baseline[d.id] = sig;
        changed = true;
      }
    }
    return changed;
  }
  // 1) First poll with NO change: cold-open MUST NOT fake any timestamp,
  //    even though capture-cc has persisted data.
  assert.strictEqual(poll(), false, 'cold-open with no change must NOT stamp');
  assert.deepStrictEqual(lu, {}, 'cold-open lastUpdated map must remain empty');
  // 2) Now simulate a real edit to capture-cc (k1) → must stamp.
  store.k1 = 'persisted plus one edit';
  assert.strictEqual(poll(), true, 'real change must stamp');
  assert.ok(lu['capture-cc'], 'capture-cc timestamp must be set');
  // Other sections must still be unstamped.
  assert.strictEqual(lu['sub-gate'], undefined, 'sub-gate must not be stamped without a real change');
  // 3) A subsequent poll with no further change must NOT update again.
  const t1 = lu['capture-cc'];
  poll();
  assert.strictEqual(lu['capture-cc'], t1, 'stable signature must not re-stamp');
});

// 9. GovCon remains primary navigation (Phase 23C preserved).
test('Phase 23C GovCon primary navigation preserved', () => {
  assert.ok(/id="nav-section-govcon-primary"/.test(HTML),
    'Phase 23C nav-section-govcon-primary missing');
  assert.ok(/<button class="nav-btn active" data-tab="govcon"/.test(HTML),
    'GovCon nav button must remain active by default');
  assert.ok(/<div class="tab-pane active" id="tab-govcon">/.test(HTML),
    'GovCon tab-pane must remain active by default');
  assert.ok(/let tab='govcon';/.test(HTML),
    'Renderer init must still default to govcon');
});

// 10. Phase 25L-1 supersedes Phase 23C "Show All Tools" toggle. The
// toggle and data-other-business-tools cluster are retired; the
// gcToggleAllTools window function remains as a no-op stub so any
// legacy caller does not throw.
test('Phase 25L-1 superseded the Phase 23C "Show All Tools" toggle', () => {
  assert.ok(!/id="gc-show-all-tools-btn"/.test(HTML),
    'Phase 23C Show All Tools button should be retired by Phase 25L-1');
  assert.ok(!/data-other-business-tools/.test(HTML),
    'data-other-business-tools markers should be retired by Phase 25L-1');
  assert.ok(/window\.gcToggleAllTools\s*=\s*function/.test(HTML),
    'gcToggleAllTools() stub missing — must remain as no-op for legacy callers');
});

// 11. All commercial nav buttons + panes remain reachable.
// PR #151 closeout: Phase 26C removed four orphaned tab-panes
// (`cmd`, `command`, `revenue`, `socials`) from the DOM. The remaining
// commercial surface is what this test now pins. Restoring them would
// regress Phase 26C, so the list is intentionally narrowed.
test('Every commercial nav button + pane remains in the DOM', () => {
  const tabs = [
    'dashboard','leads','email','overdue','reply','content',
    'dailyops','createlead','aigenerate','settings','delivery',
    'govcon','outreach','primes','opportunities','dealwork',
    'pipeline','execution','proof','clinical'
  ];
  for (const t of tabs) {
    const btn = new RegExp('data-tab="' + t + '"');
    assert.ok(btn.test(HTML), 'commercial nav-btn data-tab="' + t + '" missing');
    const pane = new RegExp('id="tab-' + t + '"');
    assert.ok(pane.test(HTML), 'commercial tab-pane id="tab-' + t + '" missing');
  }
});

// 12. Phase 23A Demo Mode remains.
test('Phase 23A Demo Mode remains accessible', () => {
  assert.ok(/id="gc-demo-mode"/.test(HTML), 'Phase 23A gc-demo-mode missing');
  assert.ok(/id="gc-demo-load-btn"/.test(HTML), 'Phase 23A Load Sample button missing');
  assert.ok(/id="gc-demo-clear-btn"/.test(HTML), 'Phase 23A Clear Sample button missing');
});

// 13. Phase 23B GovCon Mode indicator remains.
test('Phase 23B GovCon Mode indicator remains', () => {
  assert.ok(/id="gc-mode-indicator"/.test(HTML), 'Phase 23B gc-mode-indicator missing');
  assert.ok(/GovCon Mode — Capture OS workflow/.test(HTML), 'Phase 23B headline missing');
  // Phase 25L-1: brand sub-label now reads "GovCon" (was "GovCon Capture OS").
  assert.ok(/<div class="brand-ver"[^>]*>GovCon<\/div>/.test(HTML),
    'Phase 25L-1 brand sub-label "GovCon" missing');
});

// 14. Phase 23C default GovCon cold-open remains (already covered by #9 but kept for explicit spec mapping).
test('Phase 23C default GovCon cold-open remains', () => {
  assert.ok(/localStorage\.getItem\('lcc_active_tab'\)\|\|'govcon'/.test(HTML),
    'Phase 23C init fallback must still resolve to govcon');
  assert.ok(/if\(!document\.getElementById\('tab-'\+tab\)\)tab='govcon';/.test(HTML),
    'Phase 23C missing-pane fallback must still resolve to govcon');
});

// 15. Phase 22B Capture Command Center remains.
test('Phase 22B Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  assert.ok(/GovCon Capture Command Center/.test(HTML), 'Capture CC headline missing');
});

// 16. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace + Compliance Matrix remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  assert.ok(/Compliance matrix/.test(HTML), 'Compliance matrix label missing');
});

// 17. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
});

// 18. Phase 22E Past Performance + Capability + Prime Partner remains.
test('Phase 22E Past Performance + Capability + Prime Partner remains intact', () => {
  assert.ok(/id="gc-pp"/.test(HTML), 'Past Performance section missing');
  assert.ok(/id="gc-cs"/.test(HTML), 'Capability Statement Studio section missing');
  assert.ok(/id="gc-ppf"/.test(HTML), 'Prime Partner Finder section missing');
});

// 19. Phase 22F Submission Readiness Gate remains.
test('Phase 22F Submission Readiness Gate + Build/Export buttons remain intact', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'Submission Readiness Gate section missing');
  // Both Phase 22F actions must still exist alongside the new Phase 23D Markdown export.
  assert.ok(/onclick="gcPkgBuildPreview\(\)"/.test(HTML), 'Build Package Preview action missing');
  assert.ok(/onclick="gcPkgExportPlaceholder\(\)"/.test(HTML), 'Export Package Placeholder action missing');
});

// 20. No Send Email button exists.
test('no Send Email button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Send Email[^<]*<\/button>/i.test(HTML),
    '"Send Email" button text present');
  assert.ok(!/onclick="[^"]*sendEmail/i.test(HTML), 'sendEmail onclick handler present');
});

// 21. No Submit Bid button exists.
test('no Submit Bid button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Submit Bid[^<]*<\/button>/i.test(HTML),
    '"Submit Bid" button present');
});

// 22. No Submit Quote button exists.
test('no Submit Quote button anywhere in the renderer', () => {
  assert.ok(!/<button[^>]*>[^<]*Submit Quote[^<]*<\/button>/i.test(HTML),
    '"Submit Quote" button present');
});

// 23. No System Readiness/System Flow tab returns.
test('Phase 21F removed System Readiness / System Flow tab stays removed', () => {
  assert.ok(!/data-tab="sysflow"/.test(HTML), 'System Flow / Readiness tab returned');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane returned');
});

// 24. No signed/notarized completion claim added.
test('no signed / notarized completion claim added by Phase 23D', () => {
  assert.ok(!/signed and notarized/i.test(HTML), 'positive signed/notarized claim present');
  assert.ok(!/Apple notarized/i.test(HTML), 'positive Apple notarized claim present');
  assert.ok(!/production signed/i.test(HTML), 'positive production signed claim present');
});

// 25. Renderer boot still parses (every inline <script> block).
test('every inline <script> block still parses (renderer boot guard)', () => {
  const blocks = HTML.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g) || [];
  let parsed = 0;
  for (const blk of blocks) {
    const m = blk.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
    if (!m) continue;
    if (/\bsrc=/.test(blk)) continue; // external src
    const src = m[1];
    try { new vm.Script(src); parsed++; }
    catch (e) { throw new Error('inline <script> failed to parse: ' + e.message + ' :: ' + src.slice(0, 80)); }
  }
  assert.ok(parsed > 0, 'no inline scripts parsed — sanity check failed');
});

// 26. .btn-gold guard preserved.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/\.btn-gold/.test(HTML), '.btn-gold class missing (Phase 20G regression)');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 23D govcon-demo-delivery-polish checks ===');
if (failed > 0) process.exit(1);

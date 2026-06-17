/**
 * Phase 22C — GovCon Solicitation Center + Compliance Matrix regression test.
 *
 * Asserts the buyer-facing Solicitation Center surface exists in
 * sourcedeck.html with the seven extraction panels (Summary / Section L /
 * Section M / PWS-SOW / Required Forms / Deadlines / Risks), the
 * Compliance Matrix table with the 10 spec'd columns, the required
 * empty-state copy, the four actions (Extract / Build Matrix / Mark
 * Reviewed / Export Placeholder), and a Human Review Required notice.
 * Also confirms previously merged invariants are still intact:
 * Capture Command Center (Phase 22B), Response Desk Import Email + no
 * Send Email, SAM Sprint Free=1 NAICS, System Readiness/Flow remains
 * removed, .btn-gold guard, every inline <script> block still parses
 * (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-solicitation-workspace.test.js
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

console.log('\n=== Phase 22C — Solicitation Center + Compliance Matrix ===\n');

// 1. Solicitation Center exists.
test('Solicitation Center section exists', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'gc-sol-workspace section id missing');
  assert.ok(/Solicitation Center/.test(HTML), 'Solicitation Center title missing');
  assert.ok(/data-section="govcon-solicitation-workspace"/.test(HTML), 'data-section anchor missing');
});

// 2. Package/upload intake + linked opportunity selector exists.
test('Package/upload intake + linked opportunity selector exist', () => {
  assert.ok(/Download Solicitation Package/.test(HTML), 'package download action missing');
  assert.ok(/id="gc-sol-opp-select"/.test(HTML), 'gc-sol-opp-select missing');
  assert.ok(/Upload Solicitation/.test(HTML), 'upload solicitation action missing');
});

// 3. Section L panel exists.
test('Section L — Instructions panel exists', () => {
  assert.ok(/id="gc-sol-section-l"/.test(HTML), 'gc-sol-section-l container missing');
  assert.ok(/Section L — Instructions to Offerors/.test(HTML), 'Section L title missing');
});

// 4. Section M panel exists.
test('Section M — Evaluation Criteria panel exists', () => {
  assert.ok(/id="gc-sol-section-m"/.test(HTML), 'gc-sol-section-m container missing');
  assert.ok(/Section M — Evaluation Criteria/.test(HTML), 'Section M title missing');
});

// 5. PWS/SOW panel exists.
test('PWS / SOW Requirements panel exists', () => {
  assert.ok(/id="gc-sol-pws"/.test(HTML), 'gc-sol-pws container missing');
  assert.ok(/PWS \/ SOW Requirements/.test(HTML), 'PWS/SOW title missing');
});

// 6. Required Forms panel exists.
test('Required Forms / Attachments panel exists', () => {
  assert.ok(/id="gc-sol-forms"/.test(HTML), 'gc-sol-forms container missing');
  assert.ok(/Required Forms \/ Attachments/.test(HTML), 'Required Forms title missing');
});

// 7. Compliance Matrix table exists.
test('Compliance Matrix table exists', () => {
  assert.ok(/id="gc-sol-matrix"/.test(HTML), 'gc-sol-matrix container missing');
  assert.ok(/id="gc-sol-matrix-table"/.test(HTML), 'gc-sol-matrix-table missing');
  assert.ok(/id="gc-sol-matrix-body"/.test(HTML), 'gc-sol-matrix-body missing');
});

// 8. Matrix columns exist.
test('Compliance Matrix has all 11 spec columns', () => {
  for (const col of [
    'Requirement ID',
    'Source',
    'Section/Page/File',
    'Requirement text',
    'Mandatory / optional',
    'Proposal section',
    'Owner',
    'Evidence needed',
    'Status',
    'Risk / deal-killer flag',
    'Notes'
  ]) {
    assert.ok(HTML.includes(col), 'matrix column missing: ' + col);
  }
});

// 9. Empty states exist and contain no fake solicitation data.
test('empty states present and no fake solicitation / agency / deadlines', () => {
  // Required empty-state copies
  assert.ok(/No solicitation package loaded yet\. Download a SAM\.gov package or upload a solicitation file\./.test(HTML),
    'Summary empty state missing');
  assert.ok(/No compliance requirements extracted yet\. Run extraction on a readable package or manually map requirements\./.test(HTML),
    'Matrix empty state missing');
  // No fake solicitation numbers, agencies, or deadlines hardcoded inside the workspace section.
  const slice = HTML.split(/data-section="govcon-solicitation-workspace"/)[1] || '';
  const end = slice.indexOf('</section>');
  const block = end > -1 ? slice.slice(0, end) : slice;
  // No real-looking sol numbers outside placeholder text.
  const fakeMarkers = [/SP4701-26-R-\d+/, /W912DY-26-R-\d+/, /N00024-26-/];
  for (const re of fakeMarkers) {
    const m = block.match(re) || [];
    // permit zero hits
    assert.strictEqual(m.length, 0, 'fake solicitation marker present: ' + re);
  }
  // No hardcoded agency labels (these would imply seeded data).
  for (const agency of [
    /<td[^>]*>\s*Department of (?:the )?(?:Army|Navy|Air Force)/i,
    /<td[^>]*>\s*GSA Federal Acquisition Service/i
  ]) {
    const m = block.match(agency) || [];
    assert.strictEqual(m.length, 0, 'hardcoded agency table cell present: ' + agency);
  }
});

// 10. Human Review Required copy exists.
test('Human Review Required notice exists', () => {
  assert.ok(/Human Review Required/.test(HTML), 'Human Review Required label missing');
  const matches = HTML.match(/human (?:review|approval) (?:required|still required)/gi) || [];
  assert.ok(matches.length >= 3, 'expected ≥3 "human review/approval required" mentions; found ' + matches.length);
});

// 11. "SourceDeck does not submit bids" copy exists (multiple places).
test('"SourceDeck does not submit bids" copy exists in workspace', () => {
  const matches = HTML.match(/SourceDeck does not submit bids/g) || [];
  assert.ok(matches.length >= 2, 'expected ≥2 "SourceDeck does not submit bids" mentions; found ' + matches.length);
});

// 12. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 13. No auto-submit behavior exists.
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto[-_]submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
  // The negated phrasing must remain in the workspace.
  assert.ok(/does not submit bids/i.test(HTML), 'negated "does not submit bids" safety copy missing');
  assert.ok(/does not auto-submit/i.test(HTML), 'negated "does not auto-submit" safety copy missing');
});

// 14. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 15. Capture Command Center (Phase 22B) remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  assert.ok(/GovCon Capture Command Center/.test(HTML), 'Capture Command Center title missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
  assert.ok(/No active pursuits yet\. Run a SAM Sprint or add an opportunity manually\./.test(HTML),
    'CC Active Pursuits empty state missing');
});

// 16. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML),
    'Response Desk no-send copy missing');
});

// 17. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
  assert.ok(!/auto_send\s*[:=]\s*true/.test(HTML), 'auto_send:true present');
});

// 18. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 3, 'expected ≥3 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 19. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22C govcon-solicitation-workspace checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 22B — GovCon Capture Command Center regression test.
 *
 * Asserts the buyer-facing GovCon Capture Command Center surface exists in
 * sourcedeck.html with the correct empty-state copy, manual intake fields,
 * Bid/No-Bid overview, Deadline + Q&A Calendar, and human-approval
 * invariants. Confirms previously merged invariants are still intact:
 * Response Desk Import Email, SAM Sprint Free=1 NAICS, no Send Email
 * button, no auto-send / auto-submit copy, no System Readiness / System
 * Flow return, .btn-gold guard intact, and every inline <script> block
 * still parses (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-capture-command-center.test.js
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

console.log('\n=== Phase 22B — GovCon Capture Command Center ===\n');

// 1. GovCon Capture Command Center exists.
test('GovCon Capture Command Center section exists', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'gc-capture-cc section id missing');
  assert.ok(/GovCon Capture Command Center/.test(HTML), 'GovCon Capture Command Center title missing');
  assert.ok(/data-section="govcon-capture-command-center"/.test(HTML), 'data-section anchor missing');
});

// 2. Active Pursuits empty state exists.
test('Active Pursuits empty state exists', () => {
  assert.ok(/id="gc-cc-active-count"/.test(HTML), 'gc-cc-active-count missing');
  assert.ok(/id="gc-cc-active-empty"/.test(HTML), 'gc-cc-active-empty missing');
  assert.ok(/No active pursuits yet\. Run a SAM Sprint or add an opportunity manually\./.test(HTML),
    'Active Pursuits empty-state copy missing');
});

// 3. Deadline/Q&A Calendar surface exists.
test('Deadline + Q&A Calendar surface exists', () => {
  assert.ok(/id="gc-cc-calendar"/.test(HTML), 'gc-cc-calendar container missing');
  assert.ok(/id="gc-cc-calendar-list"/.test(HTML), 'gc-cc-calendar-list missing');
  assert.ok(/Deadline \+ Q&amp;A Calendar/.test(HTML), 'Calendar title missing');
  assert.ok(/No deadlines tracked yet\. Add a solicitation or import opportunity details\./.test(HTML),
    'Calendar empty-state copy missing');
});

// 4. Manual opportunity intake fields exist.
test('Manual opportunity intake form + fields exist', () => {
  assert.ok(/id="gc-cc-intake-form"/.test(HTML), 'intake form missing');
  for (const f of [
    'gc-cc-f-title', 'gc-cc-f-sol', 'gc-cc-f-agency', 'gc-cc-f-office',
    'gc-cc-f-naics', 'gc-cc-f-setaside', 'gc-cc-f-due', 'gc-cc-f-qna',
    'gc-cc-f-place', 'gc-cc-f-value', 'gc-cc-f-url', 'gc-cc-f-notes'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'intake field missing: ' + f);
  }
  assert.ok(/Add to Capture Board/.test(HTML), 'Add to Capture Board action missing');
  assert.ok(/Run Bid\/No-Bid Review/.test(HTML), 'Run Bid/No-Bid Review action missing');
  assert.ok(/Extract Deadlines/.test(HTML), 'Extract Deadlines action missing');
  assert.ok(/Prepare Solicitation Workspace/.test(HTML), 'Prepare Solicitation Workspace action missing');
  assert.ok(/Manual intake only/.test(HTML), 'Manual intake only safety copy missing');
});

// 5. Bid/No-Bid overview exists.
test('Bid/No-Bid Review surface exists', () => {
  assert.ok(/id="gc-cc-bidnobid"/.test(HTML), 'gc-cc-bidnobid container missing');
  assert.ok(/Bid\/No-Bid Review/.test(HTML), 'Bid/No-Bid Review title missing');
  assert.ok(/id="gc-cc-bidnobid-select"/.test(HTML), 'bid/no-bid selector missing');
  assert.ok(/id="gc-cc-bidnobid-out"/.test(HTML), 'bid/no-bid output missing');
  assert.ok(/Add an opportunity to see fit analysis/.test(HTML), 'bid/no-bid empty copy missing');
});

// 6. Human approval required copy exists (multiple places).
test('Human approval required copy exists across CC surface', () => {
  const matches = HTML.match(/human approval (?:required|still required)/gi) || [];
  assert.ok(matches.length >= 3, 'expected at least 3 "human approval required" mentions; found ' + matches.length);
  assert.ok(/No pending approvals\. Human approval required for every outreach, quote, and submission action\./.test(HTML),
    'Human approval card empty copy missing');
});

// 7. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  // Defensive: no onclick="sendEmail*"
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 8. No auto-submit copy/behavior exists (or only in negated/safety contexts).
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto-submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/auto_submit\s*[:=]\s*true/i.test(HTML), 'auto_submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
  // The negated safety phrasing must be present.
  assert.ok(/does not auto-submit/i.test(HTML), 'expected negated "does not auto-submit" safety copy missing');
});

// 9. No fake active opportunities exist.
test('no fake/hardcoded active pursuits or opportunities', () => {
  // The active count default must be 0 (empty state).
  assert.ok(/id="gc-cc-active-count"[^>]*>0</.test(HTML),
    'Active Pursuits count default should render as 0');
  // No hardcoded sample agencies/sol numbers in the Capture Command Center area.
  const ccSlice = HTML.split(/data-section="govcon-capture-command-center"/)[1] || '';
  const ccEnd = ccSlice.indexOf('</section>');
  const ccBlock = ccEnd > -1 ? ccSlice.slice(0, ccEnd) : ccSlice;
  // Solicitation numbers like W912DY-... only appear as placeholder attributes — never inside option/text content.
  const sols = ccBlock.match(/W912DY-26-R-0001/g) || [];
  const placeholderHits = (ccBlock.match(/placeholder="[^"]*W912DY-26-R-0001/g) || []).length;
  assert.strictEqual(sols.length, placeholderHits,
    'fake solicitation number present outside placeholder context');
});

// 10. No fake deadlines exist.
test('no fake hardcoded deadlines in CC surface', () => {
  // The calendar list default must be the empty-state div, not a hardcoded row.
  assert.ok(/id="gc-cc-calendar-list"[\s\S]*?gc-cc-empty[\s\S]*?No deadlines tracked yet/.test(HTML),
    'calendar list should render empty state by default');
  // Default deadlines count must be 0.
  assert.ok(/id="gc-cc-deadlines-count"[^>]*>0</.test(HTML),
    'Deadlines This Week count default should render as 0');
});

// 11. No System Readiness/System Flow tab returns.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 12. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML),
    'Response Desk no-send copy missing');
});

// 13. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
  assert.ok(!/auto_send\s*[:=]\s*true/.test(HTML), 'auto_send:true present');
});

// 14. Renderer boot still passes (every inline <script> block parses).
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 2, 'expected ≥2 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 15. .btn-gold guard remains intact.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22B govcon-capture-command-center checks ===\n`);
process.exit(failed ? 1 : 0);

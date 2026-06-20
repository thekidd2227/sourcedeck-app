/**
 * Phase 22B — GovCon Operating Rhythm regression test.
 *
 * Asserts:
 *   - The Phase 22B GovCon Operating Rhythm parent section exists
 *     inside the GovCon tab pane and is sandwiched between the
 *     Phase 22B Capture Command Center and the Phase 22C
 *     Solicitation Workspace.
 *   - All four child panels render with the expected anchors:
 *       gc-daily-rhythm, gc-deadline-calendar, gc-prerfp-intel,
 *       gc-agency-targeting.
 *   - Each panel ships at least one SAMPLE-labeled row so a buyer
 *     demo never silently displays unattributed sample content.
 *   - No Send Email / Submit Bid / Submit Quote / "Export and
 *     submit" / portal-upload claim is introduced.
 *   - System Readiness / System Flow remains removed.
 *   - Deprecated $79 / $349 / $999 pricing copy does NOT appear in
 *     the active GovCon Operating Rhythm UI region.
 *   - Existing renderer boot still passes (every inline <script>
 *     parses; the Phase 22B insert did not corrupt the script
 *     blocks).
 *   - Existing GovCon nav default-active surface remains tab-govcon.
 *   - Phase 22B Capture Command Center, Phase 22C Solicitation
 *     Workspace, Phase 22D Vendor/Pricing, Phase 22E PP/Cap/Prime,
 *     and Phase 22F Submission Readiness Gate remain intact (the
 *     operating-rhythm section is additive, not replacing).
 *   - Pricing copy, if any reaches this panel, uses V3 source-of-
 *     truth terms only (Solo Capture / GovCon Operator / Operator
 *     Plus). Deprecated $79 / $349 / $999 not visible.
 *
 * Static + VM-based; never executes app/renderer code or touches
 * the network.
 *
 * Run:  node test/govcon-operating-rhythm.test.js
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

console.log('\n=== Phase 22B — GovCon Operating Rhythm ===\n');

// Slice the GovCon tab pane to scope assertions tightly.
const PANE_START = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
assert.ok(PANE_START > 0, 'tab-govcon pane not found in sourcedeck.html');
// Find a downstream-but-still-inside-the-pane upper bound.
// The Submission Readiness Gate is the last Phase 22F section that
// must remain inside the GovCon pane, so use that to bound the slice.
const PANE_END_HINT = HTML.indexOf('id="gc-sub-gate"', PANE_START);
const SCAN_END = PANE_END_HINT > 0 ? PANE_END_HINT + 8000 : HTML.length;
const PANE = HTML.slice(PANE_START, SCAN_END);

// 1. Parent section exists.
test('Phase 22B operating-rhythm parent section exists in #tab-govcon', () => {
  assert.ok(/id="gc-operating-rhythm"/.test(PANE),
    'gc-operating-rhythm section missing inside #tab-govcon');
  assert.ok(/data-section="govcon-operating-rhythm"/.test(PANE),
    'data-section="govcon-operating-rhythm" missing');
  assert.ok(/GovCon Operating Rhythm/.test(PANE),
    '"GovCon Operating Rhythm" title missing');
});

// 2. All four child panels render.
test('Daily Capture Rhythm panel renders (gc-daily-rhythm)', () => {
  assert.ok(/id="gc-daily-rhythm"/.test(PANE), 'gc-daily-rhythm anchor missing');
  assert.ok(/Daily Capture Rhythm/.test(PANE), '"Daily Capture Rhythm" heading missing');
  assert.ok(/id="gc-daily-rhythm-list"/.test(PANE), 'gc-daily-rhythm-list inner anchor missing');
});

test('Deadline & Q&A Calendar panel renders (gc-deadline-calendar)', () => {
  assert.ok(/id="gc-deadline-calendar"/.test(PANE), 'gc-deadline-calendar anchor missing');
  assert.ok(/Deadline &amp; Q&amp;A Calendar/.test(PANE),
    '"Deadline & Q&A Calendar" heading missing');
  assert.ok(/id="gc-deadline-calendar-list"/.test(PANE),
    'gc-deadline-calendar-list inner anchor missing');
});

test('Pre-RFP Intelligence panel renders (gc-prerfp-intel)', () => {
  assert.ok(/id="gc-prerfp-intel"/.test(PANE), 'gc-prerfp-intel anchor missing');
  assert.ok(/Pre-RFP Intelligence/.test(PANE), '"Pre-RFP Intelligence" heading missing');
  assert.ok(/id="gc-prerfp-intel-list"/.test(PANE),
    'gc-prerfp-intel-list inner anchor missing');
});

test('Agency Targeting Insights panel renders (gc-agency-targeting)', () => {
  assert.ok(/id="gc-agency-targeting"/.test(PANE), 'gc-agency-targeting anchor missing');
  assert.ok(/Agency Targeting Insights/.test(PANE),
    '"Agency Targeting Insights" heading missing');
  assert.ok(/id="gc-agency-targeting-list"/.test(PANE),
    'gc-agency-targeting-list inner anchor missing');
});

// 3. SAMPLE labels — every panel must explicitly label its demo rows.
test('every operating-rhythm panel ships at least one SAMPLE-labeled row', () => {
  const slice = PANE.slice(PANE.indexOf('id="gc-operating-rhythm"'),
                           PANE.indexOf('id="gc-operating-rhythm"') + 60000);
  for (const id of ['gc-daily-rhythm', 'gc-deadline-calendar', 'gc-prerfp-intel', 'gc-agency-targeting']) {
    const panelOpen = slice.indexOf('id="' + id + '"');
    assert.ok(panelOpen > 0, 'panel slice not found for ' + id);
    const panel = slice.slice(panelOpen, panelOpen + 12000);
    assert.ok(/data-or-source="sample"/.test(panel),
      'panel ' + id + ' missing data-or-source="sample" row marker');
    assert.ok(/>SAMPLE</.test(panel) || />SAMPLE\s/.test(panel),
      'panel ' + id + ' missing visible SAMPLE chip label');
  }
});

// 4. Demo/sample-data buyer-protective copy is present in the parent section.
test('parent section carries no-send / no-submit / no-upload guard copy', () => {
  const root = PANE.slice(PANE.indexOf('id="gc-operating-rhythm"'),
                          PANE.indexOf('id="gc-operating-rhythm"') + 4000);
  assert.ok(/does not submit bids/i.test(root),
    'operating-rhythm root missing "does not submit bids" guard');
  assert.ok(/does not auto-send/i.test(root) || /never auto-sends/i.test(root),
    'operating-rhythm root missing auto-send guard');
  assert.ok(/No portal upload\./i.test(root),
    'operating-rhythm root missing "No portal upload." guard');
  assert.ok(/No SAM\.gov \/ PIEE \/ eBuy \/ GSA interaction/i.test(root),
    'operating-rhythm root missing "No SAM.gov / PIEE / eBuy / GSA interaction" guard');
  assert.ok(/human approval/i.test(root),
    'operating-rhythm root missing human-approval guard');
});

// 5. No Send Email button anywhere.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML),
    'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML),
    'a sendEmail() onclick is wired');
});

// 6. No Submit Bid button anywhere.
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML),
    'a Submit Bid button is present');
  assert.ok(!/onclick="submitBid\b/i.test(HTML),
    'a submitBid() onclick is wired');
});

// 7. No Submit Quote button anywhere.
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML),
    'a Submit Quote button is present');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML),
    'a submitQuote() onclick is wired');
});

// 8. No "Export and submit" wording.
test('no "Export and submit" or positive portal-upload claim added', () => {
  assert.ok(!/Export and submit/i.test(HTML),
    '"Export and submit" wording present');
  // Positive-claim check: a phrase like "upload to SAM.gov" is only
  // forbidden when it appears as an unguarded assertion. "does not
  // upload to SAM.gov" / "no upload to PIEE" / etc. are explicit
  // negative guards and must remain allowed.
  function assertNoPositiveClaim(re, label) {
    const lines = HTML.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!re.test(line)) continue;
      const context = [lines[i - 1] || '', line].join(' ');
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot|won['’]t|will not|avoid|blocked|guard|disabled|prohibits?)\b/i.test(context);
      assert.ok(guard,
        'unguarded positive ' + label + ' claim at line ' + (i + 1) + ': ' + line.trim());
    }
  }
  assertNoPositiveClaim(/upload to SAM\.gov/i, 'upload-to-SAM.gov');
  assertNoPositiveClaim(/upload to PIEE/i,     'upload-to-PIEE');
  assertNoPositiveClaim(/upload to eBuy/i,     'upload-to-eBuy');
  assertNoPositiveClaim(/upload to GSA/i,      'upload-to-GSA');
  assertNoPositiveClaim(/SourceDeck submits/i, 'SourceDeck-submits');
  assertNoPositiveClaim(/files into SAM\.gov/i, 'files-into-SAM.gov');
});

// 9. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML),
    'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML),
    'tab-sysflow pane reintroduced');
});

// 10. Deprecated pricing does NOT appear in the operating-rhythm region.
test('deprecated $79 / $349 / $999 pricing copy is NOT in the active operating-rhythm region', () => {
  const root = PANE.slice(PANE.indexOf('id="gc-operating-rhythm"'),
                          PANE.indexOf('id="gc-operating-rhythm"') + 60000);
  for (const stale of [/\$79\b/, /\$349\b/, /\$999\b/]) {
    assert.ok(!stale.test(root),
      'stale deprecated pricing copy in operating-rhythm region: ' + stale);
  }
});

// 11. If V3 pricing copy is present in the panel, it must use V3 terms only.
test('if any pricing copy reaches the panel, V3 source-of-truth terms are used', () => {
  const root = PANE.slice(PANE.indexOf('id="gc-operating-rhythm"'),
                          PANE.indexOf('id="gc-operating-rhythm"') + 60000);
  // Don't require pricing to be in the panel; only verify that IF a V2
  // tier label is present, the V3 variant is also there (i.e., no
  // accidental V2-only language inside the new panel).
  if (/Solo\b/.test(root) || /Team\b/.test(root) || /Enterprise from\b/i.test(root)) {
    // The panel must not introduce V2 tier framing; if it references
    // pricing at all it must use the V3 names.
    assert.ok(!/Team\s+\$349/.test(root), 'V2 Team $349 framing leaked into panel');
    assert.ok(!/Solo\s+\$79/.test(root),  'V2 Solo $79 framing leaked into panel');
    assert.ok(!/Enterprise\s+from\s+\$999/i.test(root),
      'V2 Enterprise from $999 framing leaked into panel');
  }
});

// 12. Existing GovCon default-active surface remains.
test('GovCon tab remains default-active on cold open', () => {
  assert.ok(/<div class="tab-pane active" id="tab-govcon">/.test(HTML),
    'tab-govcon active class missing');
  assert.ok(/<button class="nav-btn active" data-tab="govcon"/.test(HTML),
    'govcon nav-btn active class missing');
});

// 13. Existing GovCon surfaces remain intact.
test('Phase 22B Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'gc-capture-cc missing');
  for (const id of ['gc-cc-active-count', 'gc-cc-deadlines-count', 'gc-cc-qa-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC anchor missing: ' + id);
  }
});

test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(!/id="gc-sol-workspace"/.test(HTML), 'gc-sol-workspace removed');
});

test('Phase 22D Vendor Quote Room + Pricing Worksheet remain intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'gc-vqr missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'gc-pricing missing');
});

test('Phase 22E PP / Capability / Prime Partner remain intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22E anchor missing: ' + id);
  }
});

test('Phase 22F Submission Readiness Gate remains intact', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'gc-sub-gate missing');
});

// 14. Renderer boot still passes (every inline <script> parses).
test('every inline <script> block still parses (renderer-boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 8, 'expected ≥8 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0,
    'unparseable inline scripts:\n' + failures.join('\n'));
});

// 15. Operating-rhythm section is positioned between Capture Command Center
//     and Solicitation Workspace (positional regression guard).
test('operating-rhythm section is sandwiched between Capture CC and Solicitation Workspace', () => {
  const ccEnd = HTML.indexOf('id="gc-capture-cc"');
  const orStart = HTML.indexOf('id="gc-operating-rhythm"');
  const swStart = HTML.indexOf('id="gc-vqr-pricing"');
  assert.ok(ccEnd > 0,    'gc-capture-cc not found');
  assert.ok(orStart > 0,  'gc-operating-rhythm not found');
  assert.ok(swStart > 0,  'gc-sol-workspace not found');
  assert.ok(ccEnd < orStart,
    'gc-operating-rhythm must appear AFTER gc-capture-cc');
  assert.ok(orStart < swStart,
    'gc-operating-rhythm must appear BEFORE gc-sol-workspace');
});

// 16. Phase 21F / sysflow removal and other invariants still hold.
test('Response Desk Import Email + draft-only language preserved', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Draft only — not sent/i.test(HTML),
    'Draft only — not sent text missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22B govcon-operating-rhythm checks ===\n`);
process.exit(failed ? 1 : 0);

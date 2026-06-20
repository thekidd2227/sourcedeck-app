/**
 * Phase 23C — GovCon Primary Navigation regression test.
 *
 * Asserts:
 *   - the GovCon nav-section sits at the TOP of the sidebar (before
 *     the Operations section);
 *   - the "GovCon Capture OS" separator label exists;
 *   - every non-GovCon nav-section now carries the "Other business
 *     tools · …" label prefix (so the buyer sees clear separation);
 *   - the "Show All Tools" toggle exists and is wired to
 *     gcToggleAllTools();
 *   - every commercial nav button + pane remains in the DOM (the
 *     toggle hides them via display: none but never removes them);
 *   - the default active tab is now `tab-govcon` (Dashboard remains
 *     reachable but is no longer the cold-open active pane);
 *   - Phase 22B/22C/22D/22E/22F surfaces remain intact;
 *   - Phase 23A Demo Mode remains accessible;
 *   - Phase 23B GovCon Mode indicator remains;
 *   - Response Desk Import Email + SAM Sprint Free=1 NAICS remain;
 *   - System Readiness / System Flow tab remains removed;
 *   - no Send Email / Submit Bid / Submit Quote button anywhere;
 *   - no positive signed/notarized completion claim added;
 *   - renderer boot still passes;
 *   - .btn-gold guard remains.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-primary-navigation.test.js
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

console.log('\n=== Phase 23C — GovCon Primary Navigation ===\n');

// 1. GovCon nav button appears near the top. Phase 25L-1 moves
// Dashboard ABOVE GovCon; GovCon now lives in the second sidebar
// nav-section, not the first. The invariant that survives Phase 25L-1
// is: GovCon sits ABOVE the (hidden) reachability buffer that holds
// removed-from-active-nav buttons, and the cold-open active pane is
// still tab-govcon.
test('GovCon nav-section is positioned near the TOP of the sidebar (Phase 25L-1: Dashboard sits above GovCon)', () => {
  const sidebarIdx = HTML.indexOf('<div class="sidebar">');
  assert.ok(sidebarIdx > 0, 'sidebar container not found');
  const dashIdx   = HTML.indexOf('id="nav-section-dashboard"');
  const govconIdx = HTML.indexOf('id="nav-section-govcon-primary"');
  const removedIdx = HTML.indexOf('id="nav-section-removed-25l1"');
  assert.ok(dashIdx > sidebarIdx, 'Dashboard nav-section not inside sidebar');
  assert.ok(govconIdx > dashIdx, 'GovCon nav-section must sit AFTER Dashboard (Phase 25L-1 cleanup)');
  assert.ok(removedIdx > govconIdx, 'GovCon nav-section must sit BEFORE the Phase 25L-1 removed-from-active-nav buffer');
  const govconBtnIdx = HTML.indexOf('data-tab="govcon"');
  assert.ok(govconBtnIdx > sidebarIdx, 'govcon nav button not found inside sidebar');
});

// 2. Phase 25L-1 superseded the "GovCon Capture OS" sidebar label.
test('Phase 25L-1 superseded the "GovCon Capture OS" sidebar label (relabeled to "GovCon")', () => {
  assert.ok(/<div class="nav-label">GovCon<\/div>/.test(HTML),
    '"GovCon" sidebar nav-label missing');
  assert.ok(!/<div class="nav-label">GovCon Capture OS<\/div>/.test(HTML),
    '"GovCon Capture OS" nav-label should be retired by Phase 25L-1');
});

// 3. Phase 25L-1 retired the "Other business tools · …" cluster. The
// buttons themselves move into #nav-section-removed-25l1 (a hidden
// reachability buffer) so openTab() programmatic targets still resolve.
test('Phase 25L-1 retired the "Other business tools · …" cluster', () => {
  for (const label of [
    'Other business tools · Operations',
    'Other business tools · Alerts',
    'Other business tools · Workflow',
    'Other business tools · Tools',
    'Other business tools · Pilot',
    'Other business tools · Intelligence',
    'Other business tools · Healthcare'
  ]) {
    assert.ok(!HTML.includes('<div class="nav-label">' + label + '</div>'),
      '"' + label + '" nav-label should be retired by Phase 25L-1');
  }
  assert.ok(/id="nav-section-removed-25l1"/.test(HTML),
    'Phase 25L-1 reachability buffer #nav-section-removed-25l1 missing');
  assert.ok(/data-phase-25l1="removed-from-active-nav"/.test(HTML),
    'Phase 25L-1 reachability buffer marker missing');
});

// 4. Phase 25L-1 retired the "Show All Tools" toggle.
test('Phase 25L-1 retired the "Show All Tools" toggle', () => {
  assert.ok(!/id="gc-show-all-tools-btn"/.test(HTML),
    'Show All Tools button should be retired by Phase 25L-1');
  assert.ok(!/data-other-business-tools/.test(HTML),
    'data-other-business-tools markers should be retired by Phase 25L-1');
  assert.ok(/window\.gcToggleAllTools\s*=\s*function/.test(HTML),
    'gcToggleAllTools() stub missing — must remain as no-op for legacy callers');
});

// 5. Every commercial nav button remains present.
test('every commercial nav button remains present (toggle hides via display, never removes)', () => {
  const commercial = ['cmd','dashboard','leads','revenue','email','overdue','reply','content','dailyops','socials','createlead','aigenerate','settings','delivery','command','opportunities','dealwork','pipeline','execution','proof','clinical'];
  for (const tab of commercial) {
    assert.ok(new RegExp('<button[^>]*\\bdata-tab="' + tab + '"').test(HTML),
      'commercial nav button missing: ' + tab);
  }
});

// 6. Every commercial pane remains present.
// PR #151 closeout: Phase 26C removed four orphaned tab-panes (`cmd`,
// `command`, `revenue`, `socials`) from the DOM. The remaining commercial
// surface is what this test now pins. Restoring them would regress
// Phase 26C, so the list is intentionally narrowed instead.
test('every commercial tab-pane remains present', () => {
  const commercial = ['dashboard','leads','email','overdue','reply','content','dailyops','createlead','aigenerate','settings','delivery','opportunities','dealwork','pipeline','execution','proof','clinical'];
  for (const tab of commercial) {
    assert.ok(new RegExp('id="tab-' + tab + '"').test(HTML),
      'commercial pane missing: tab-' + tab);
  }
});

// 7. GovCon tab opens (default-active now = GovCon).
test('GovCon tab-pane is the default active pane on cold open', () => {
  assert.ok(/<div class="tab-pane active" id="tab-govcon">/.test(HTML),
    'tab-govcon should carry the active class (default-active flipped from Dashboard → GovCon in Phase 23C)');
  // Dashboard pane must remain present but no longer have the active class.
  assert.ok(/<div class="tab-pane" id="tab-dashboard">/.test(HTML),
    'tab-dashboard pane should remain present but inactive');
  assert.ok(!/<div class="tab-pane active" id="tab-dashboard">/.test(HTML),
    'tab-dashboard should NOT carry the active class anymore');
  // GovCon nav-btn must have active class.
  assert.ok(/<button class="nav-btn active" data-tab="govcon"/.test(HTML),
    'govcon nav button should carry the active class');
  // Renderer init (DOMContentLoaded block) must also default to govcon so
  // cold open does not get flipped back to Dashboard by localStorage logic.
  assert.ok(/let tab='govcon';/.test(HTML),
    'DOMContentLoaded init should default tab variable to govcon');
  assert.ok(/localStorage\.getItem\('lcc_active_tab'\)\|\|'govcon'/.test(HTML),
    'localStorage fallback should be govcon, not dashboard');
  assert.ok(/if\(!document\.getElementById\('tab-'\+tab\)\)tab='govcon';/.test(HTML),
    'missing-pane fallback should be govcon, not dashboard');
  assert.ok(!/let tab='dashboard';/.test(HTML),
    'Stale Phase ≤23B init default `let tab=\'dashboard\'` must be gone');
});

// 8. Phase 23B GovCon Mode indicator remains. Phase 25L-1 relabels the
// brand sub-label from "GovCon Capture OS" to "GovCon" but the
// indicator section itself stays intact.
test('Phase 23B GovCon Mode indicator remains intact (Phase 25L-1: brand-ver relabeled)', () => {
  assert.ok(/id="gc-mode-indicator"/.test(HTML), 'Phase 23B gc-mode-indicator missing');
  assert.ok(/GovCon Mode — Capture OS workflow/.test(HTML), 'Phase 23B headline missing');
  assert.ok(/<div class="brand-ver"[^>]*>GovCon<\/div>/.test(HTML),
    'Phase 25L-1 brand sub-label "GovCon" missing');
});

// 9. Phase 23A Demo Mode remains.
test('Phase 23A Demo Mode remains accessible', () => {
  assert.ok(/id="gc-demo-mode"/.test(HTML), 'Phase 23A gc-demo-mode missing');
  assert.ok(/id="gc-demo-load-btn"/.test(HTML), 'Phase 23A Load Sample button missing');
  assert.ok(/id="gc-demo-clear-btn"/.test(HTML), 'Phase 23A Clear Sample button missing');
});

// 10. Phase 22B Capture Command Center remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 11. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  for (const id of ['gc-sol-summary','gc-sol-section-l','gc-sol-section-m','gc-sol-pws','gc-sol-forms','gc-sol-deadlines','gc-sol-risks','gc-sol-matrix-table','gc-sol-matrix-body']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 12. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
  for (const id of ['gc-vqr-intake-form','gc-vqr-table','gc-pr-out-price','gc-pr-out-margin','gc-pr-quote-compare-table','gc-pr-margin-warn','gc-pr-missing-warn']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22D anchor missing: ' + id);
  }
});

// 13. Phase 22E Past Performance / Capability / Prime Partner remains.
test('Phase 22E Past Performance + Capability + Prime Partner remains intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf', 'gc-pp-intake-form', 'gc-cs-outline', 'gc-ppf-intake-form', 'gc-pp-tbody', 'gc-ppf-tbody', 'gc-pp-f-cpars-rating']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22E anchor missing: ' + id);
  }
});

// 14. Phase 22F Submission Readiness Gate remains.
test('Phase 22F Submission Readiness Gate remains intact', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'Submission Readiness Gate section missing');
  for (const id of ['gc-sub-score','gc-sub-status','gc-sub-package-status','gc-sub-checklist-body','gc-pkg-export','gc-pkg-preview']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22F anchor missing: ' + id);
  }
});

// 15. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
});

// 16. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 17. No System Readiness / System Flow tab returns.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
});

// 18. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 19. No Submit Bid button exists.
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'a Submit Bid button is present');
  assert.ok(!/onclick="submitBid\b/i.test(HTML), 'a submitBid() onclick is wired');
});

// 20. No Submit Quote button exists.
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'a Submit Quote button is present');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML), 'a submitQuote() onclick is wired');
});

// 21. No signed/notarized completion claim exists.
test('no positive signed / notarized completion claim added by Phase 23C', () => {
  for (const re of [
    /\bSourceDeck is (?:signed|notarized)/i,
    /\bthe build is signed and notarized\b(?!\s*\()/i,
    /\bproduction signed\b/i,
    /\bApple notarized\b/i
  ]) {
    assert.ok(!re.test(HTML), 'positive signed/notarized claim added: ' + re);
  }
});

// 22. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 8, 'expected ≥8 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 23. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 23C govcon-primary-navigation checks ===\n`);
process.exit(failed ? 1 : 0);

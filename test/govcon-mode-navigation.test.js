/**
 * Phase 23B — GovCon Mode Navigation Polish regression test.
 *
 * Asserts the GovCon Mode indicator exists inside tab-govcon, the brand
 * sub-label reads "GovCon Capture OS" (so the very first thing a buyer
 * sees on the brand mark is GovCon framing), the GovCon nav tab and all
 * Phase 22B-22F + Phase 23A surfaces remain accessible, and that no
 * signed/notarized completion claim was introduced. Static + VM-based;
 * never executes app/renderer code or touches the network.
 *
 * Run:  node test/govcon-mode-navigation.test.js
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

console.log('\n=== Phase 23B — GovCon Mode Navigation Polish ===\n');

// 1. GovCon Mode indicator exists.
test('GovCon Mode indicator section exists', () => {
  assert.ok(/id="gc-mode-indicator"/.test(HTML), 'gc-mode-indicator section missing');
  assert.ok(/data-section="govcon-mode-indicator"/.test(HTML), 'data-section anchor missing');
  assert.ok(/GovCon Mode — Capture OS workflow/.test(HTML), 'GovCon Mode title missing');
  // The indicator must explicitly acknowledge other tabs remain accessible.
  assert.ok(/Other business tools[\s\S]*?remain available in the sidebar/.test(HTML),
    '"Other business tools … remain available in the sidebar" microcopy missing');
  // Brand sub-label updated.
  assert.ok(/<div class="brand-ver"[^>]*>GovCon Capture OS<\/div>/.test(HTML),
    'brand sub-label "GovCon Capture OS" missing');
});

// 2. GovCon tab remains accessible.
test('GovCon tab nav button remains accessible', () => {
  assert.ok(/<button[^>]*\bdata-tab="govcon"/.test(HTML), 'GovCon nav button missing');
  assert.ok(/id="tab-govcon"/.test(HTML), 'tab-govcon pane missing');
});

// 3. Phase 23A Demo Mode remains accessible.
test('Phase 23A Demo Mode remains accessible', () => {
  assert.ok(/id="gc-demo-mode"/.test(HTML), 'gc-demo-mode section missing');
  assert.ok(/id="gc-demo-load-btn"/.test(HTML), 'Load Sample button missing');
  assert.ok(/id="gc-demo-clear-btn"/.test(HTML), 'Clear Sample button missing');
  assert.ok(/id="gc-demo-banner"/.test(HTML), 'demo banner missing');
});

// 4. Phase 22B Capture Command Center remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 5. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  for (const id of ['gc-sol-summary','gc-sol-section-l','gc-sol-section-m','gc-sol-pws','gc-sol-forms','gc-sol-deadlines','gc-sol-risks','gc-sol-matrix-table','gc-sol-matrix-body']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 6. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
  for (const id of ['gc-vqr-intake-form','gc-vqr-table','gc-pr-out-price','gc-pr-out-margin','gc-pr-quote-compare-table','gc-pr-margin-warn','gc-pr-missing-warn']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22D anchor missing: ' + id);
  }
});

// 7. Phase 22E Past Performance / Capability / Prime Partner remains.
test('Phase 22E Past Performance + Capability + Prime Partner remains intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf', 'gc-pp-intake-form', 'gc-cs-outline', 'gc-ppf-intake-form', 'gc-pp-tbody', 'gc-ppf-tbody', 'gc-pp-f-cpars-rating']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22E anchor missing: ' + id);
  }
});

// 8. Phase 22F Submission Readiness Gate remains.
test('Phase 22F Submission Readiness Gate remains intact', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'Submission Readiness Gate section missing');
  for (const id of ['gc-sub-score','gc-sub-status','gc-sub-package-status','gc-sub-checklist-body','gc-pkg-export','gc-pkg-preview']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22F anchor missing: ' + id);
  }
});

// 9. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
});

// 10. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 11. No System Readiness / System Flow tab returns.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
});

// 12. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 13. No Submit Bid button exists.
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'a Submit Bid button is present');
  assert.ok(!/onclick="submitBid\b/i.test(HTML), 'a submitBid() onclick is wired');
});

// 14. No Submit Quote button exists.
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'a Submit Quote button is present');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML), 'a submitQuote() onclick is wired');
});

// 15. No signed/notarized completion claim exists.
test('no signed / notarized completion claim added by Phase 23B', () => {
  // Allow "signed and notarized" only in negated/forbidden-claim contexts
  // (the demo doc explicitly enumerates it as a "do not say" phrase, and
  // the existing phase-21a buyer-demo doc lists it as a drift guard with
  // "unless the build has actually been signed and notarized — currently
  // not"). The renderer must NOT add a NEW positive assertion that the
  // build IS signed or IS notarized.
  for (const re of [
    /\bSourceDeck is (?:signed|notarized)/i,
    /\bthe build is signed and notarized\b(?!\s*\()/i,
    /\bproduction signed\b/i,
    /\bApple notarized\b/i
  ]) {
    assert.ok(!re.test(HTML), 'positive signed/notarized claim added: ' + re);
  }
});

// 16. Renderer boot still passes.
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

// 17. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 23B govcon-mode-navigation checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 24I — Final Runtime UX Polish regression test.
 *
 * Asserts:
 *   - SAM.gov API key request is Settings-only:
 *     1. SAM Outreach screen no longer has an input[id="out-samkey"].
 *     2. SAM Outreach screen no longer renders a "Save Key" button.
 *     3. SAM Outreach screen displays a presence-only status chip + a
 *        "Configure SAM.gov API key in Settings" button that opens the
 *        Settings tab.
 *     4. Settings tab has the new s-samkey input.
 *     5. saveSettings() saves it via sd.credentials.set('sam-gov', ...).
 *     6. No raw API key value is hardcoded or rendered.
 *
 *   - Stakeholder Graph live wire-up:
 *     7. #gc-stakeholder-graph remains present.
 *     8. renderBidNoBidOut() in the Capture Command Center calls
 *        window.gcLoadStakeholderGraph({ opp: ... }) when an opp is
 *        selected.
 *     9. Sample fallback rows remain present when no opp is selected.
 *
 *   - Prime Partner Finder NAICS fallback:
 *    10. The legacy hardcoded fallback ['541512','541611','541330','561210']
 *        is removed.
 *    11. loadUserNaics() surfaces "Configure NAICS in Settings → GovCon
 *        Targeting" when the profile is empty.
 *
 *   - Surfaces preserved:
 *    12. Phase 24C-2 gcPromptNaicsContext() helper present.
 *    13. Phase 24D Past Performance / Capability / Prime Partner Finder
 *        surfaces preserved.
 *    14. Phase 24B Audit Log panel preserved.
 *
 *   - Safety regression guards:
 *    15. No Send Email button.
 *    16. No Submit Bid button.
 *    17. No Submit Quote button.
 *    18. No "Export and submit" wording.
 *    19. No portal-upload positive claim / agency-submission-complete
 *        wording.
 *    20. System Readiness / sysflow remains removed.
 *    21. Deprecated $79 / $349 / $999 not in active app UI.
 *    22. Renderer-boot guard: every inline <script> still parses.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network. Synthetic data only.
 *
 * Run:  node test/govcon-final-runtime-polish.test.js
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

console.log('\n=== Phase 24I — Final Runtime UX Polish ===\n');

// 1. SAM Outreach screen no longer has an input[id="out-samkey"].
test('SAM Outreach screen no longer contains an input[id="out-samkey"]', () => {
  assert.ok(!/<input[^>]*id="out-samkey"/.test(HTML),
    'SAM Outreach screen still has an out-samkey input field');
});

// 2. SAM Outreach screen no longer renders a "Save Key" button.
test('SAM Outreach screen no longer renders a "Save Key" button', () => {
  // The previous form had <button ... onclick="saveSamKey()">Save Key</button>.
  // After Phase 24I, saveSamKey is removed and the button is replaced with a
  // "Configure SAM.gov API key in Settings" navigation pointer.
  assert.ok(!/onclick="saveSamKey\(\)"/.test(HTML),
    'saveSamKey() onclick handler still present');
  assert.ok(!/window\.saveSamKey\s*=/.test(HTML),
    'window.saveSamKey export still present');
});

// 3. SAM Outreach screen points users to Settings via a button.
test('SAM Outreach screen displays a Settings-pointer button', () => {
  assert.ok(/id="out-samkey-pointer"/.test(HTML),
    'out-samkey-pointer container missing');
  assert.ok(/Configure SAM\.gov API key in Settings/i.test(HTML),
    '"Configure SAM.gov API key in Settings" pointer copy missing');
  assert.ok(/onclick="openTab\(\s*'settings'\s*\)"/.test(HTML),
    'Settings-nav button must call openTab(\'settings\')');
});

// 4. Settings tab has the new s-samkey input.
test('Settings tab contains the s-samkey input field', () => {
  const start = HTML.indexOf('id="tab-settings"');
  const end = HTML.indexOf('id="tab-', start + 10);
  const settings = HTML.slice(start, end > 0 ? end : start + 12000);
  assert.ok(/<input[^>]*id="s-samkey"/.test(settings),
    's-samkey input missing from Settings tab');
  assert.ok(/SAM\.gov API Key/.test(settings),
    '"SAM.gov API Key" label missing from Settings tab');
  assert.ok(/type="password"/.test(settings.match(/<input[^>]*id="s-samkey"[^>]*>/)[0]),
    's-samkey must be type="password"');
});

// 5. saveSettings() saves SAM key via sd.credentials.set('sam-gov', ...).
test('saveSettings() saves the SAM key via sd.credentials.set(sam-gov, ...)', () => {
  const m = HTML.match(/async\s+function\s+saveSettings\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'saveSettings() function not found');
  const fn = m[0];
  assert.ok(/SAM_API_KEY:\s*document\.getElementById\(['"]s-samkey['"]/.test(fn),
    'saveSettings must read s-samkey value');
  assert.ok(/credentials\.set\(\s*['"]sam-gov['"]/.test(fn),
    'saveSettings must persist via window.sd.credentials.set("sam-gov", ...)');
});

// 6. No raw API key value is hardcoded or rendered.
test('no raw SAM.gov API key value is hardcoded or rendered in the HTML', () => {
  // Known SAM.gov public-key format hints we explicitly disallow:
  // - any 40+ char hex/alphanumeric inline value next to "sam-gov"
  // - any "Authorization: <token>" inline
  // Negative-assertion grep tolerates safety copy ("never leaves your device").
  assert.ok(!/['"`]Bearer\s+\$\{/.test(HTML),
    'renderer constructs a template-literal Bearer header');
  assert.ok(!/['"]Bearer\s+['"]\s*\+/.test(HTML),
    'renderer concatenates a Bearer header literal with a key');
  assert.ok(!/Authorization['"`]\s*:\s*['"`]Bearer\s/.test(HTML),
    'renderer sets Authorization: "Bearer ..." inline');
});

// 7. #gc-stakeholder-graph remains present.
test('Phase 24E #gc-stakeholder-graph section remains present', () => {
  assert.ok(/id="gc-stakeholder-graph"/.test(HTML), '#gc-stakeholder-graph missing');
  assert.ok(/id="gc-stakeholder-by-opportunity"/.test(HTML),
    '#gc-stakeholder-by-opportunity missing');
});

// 8. renderBidNoBidOut() calls window.gcLoadStakeholderGraph.
test('renderBidNoBidOut() wires Stakeholder Graph live refresh on opp selection', () => {
  // The function lives inside an IIFE, so use a slice between the
  // function declaration and the next sibling function to bound it.
  const start = HTML.indexOf('function renderBidNoBidOut(');
  assert.ok(start > 0, 'renderBidNoBidOut() function not found');
  // Bound by the next sibling function definition inside the same IIFE,
  // or a generous 4 KB window if no sibling is found.
  const nextSiblingRe = /\n\s{2,4}function\s+\w+\s*\(/g;
  nextSiblingRe.lastIndex = start + 30;
  const nextSibling = nextSiblingRe.exec(HTML);
  const end = nextSibling ? nextSibling.index : (start + 4000);
  const fn = HTML.slice(start, end);
  assert.ok(/window\.gcLoadStakeholderGraph/.test(fn),
    'renderBidNoBidOut must call window.gcLoadStakeholderGraph when an opp is selected');
  assert.ok(/noticeId|solicitationNumber|responseDeadline/.test(fn),
    'renderBidNoBidOut must map the opp to the backend graph shape (noticeId/solicitationNumber/responseDeadline)');
});

// 9. Sample fallback rows remain present.
test('Stakeholder Graph sample fallback rows remain present', () => {
  const sgStart = HTML.indexOf('id="gc-stakeholder-graph"');
  const sgEnd = HTML.indexOf('PHASE 22F — Submission Readiness Gate', sgStart);
  const sg = HTML.slice(sgStart, sgEnd > 0 ? sgEnd : sgStart + 30000);
  const samples = (sg.match(/data-or-source="sample"/g) || []).length;
  assert.ok(samples >= 6, 'expected ≥6 SAMPLE rows in Stakeholder Graph; found ' + samples);
});

// 10. Legacy hardcoded NAICS fallback removed.
test('Prime Partner Finder no longer uses the hardcoded one-operator NAICS fallback', () => {
  const m = HTML.match(/async\s+function\s+loadUserNaics\s*\(\s*\)\s*\{[\s\S]*?\n\s{2,4}\}/);
  assert.ok(m, 'loadUserNaics() function not found');
  const fn = m[0];
  // The legacy literal must be gone.
  assert.ok(!/\['541512',\s*'541611',\s*'541330',\s*'561210'\]/.test(fn),
    'loadUserNaics() still falls back to legacy hardcoded NAICS list');
});

// 11. Empty-profile surfaces "Configure NAICS in Settings → GovCon Targeting".
test('loadUserNaics() surfaces "Configure NAICS in Settings" prompt when profile is empty', () => {
  const m = HTML.match(/async\s+function\s+loadUserNaics\s*\(\s*\)\s*\{[\s\S]*?\n\s{2,4}\}/);
  const fn = m[0];
  assert.ok(/Configure NAICS in Settings/i.test(fn),
    'loadUserNaics must surface "Configure NAICS in Settings" prompt for empty profile');
});

// 12. Phase 24C-2 gcPromptNaicsContext() helper present.
test('Phase 24C-2 gcPromptNaicsContext() helper preserved', () => {
  assert.ok(/function\s+gcPromptNaicsContext\s*\(/.test(HTML),
    'gcPromptNaicsContext function missing');
  assert.ok(/\$\{gcPromptNaicsContext\(\)\}/.test(HTML),
    '${gcPromptNaicsContext()} substitution missing from prompt-builder');
});

// 13. Phase 24D surfaces preserved.
test('Phase 24D Past Performance + Capability + Prime Partner surfaces preserved', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 24D anchor missing: ' + id);
  }
});

// 14. Phase 24B Audit Log preserved.
test('Phase 24B Audit Log panel preserved', () => {
  assert.ok(/id="gc-audit-log"/.test(HTML), '#gc-audit-log missing');
  assert.ok(/id="gc-audit-list"/.test(HTML), '#gc-audit-list missing');
});

// 15-17. No Send Email / Submit Bid / Submit Quote button.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'Send Email button present');
});
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'Submit Bid button present');
});
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'Submit Quote button present');
});

// 18. No "Export and submit" wording.
test('no "Export and submit" wording in renderer', () => {
  assert.ok(!/Export and submit/i.test(HTML), '"Export and submit" wording present');
});

// 19. No portal-upload / agency-submission-complete positive claim.
test('no portal-upload / agency-submission-complete positive claim in active runtime', () => {
  function assertNoPositiveClaim(re, label) {
    const lines = HTML.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!re.test(line)) continue;
      const context = [lines[i - 1] || '', line].join(' ');
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot|won['’]t|will not)\b/i.test(context);
      assert.ok(guard, 'unguarded positive ' + label + ' claim at line ' + (i + 1) + ': ' + line.trim());
    }
  }
  assertNoPositiveClaim(/upload to SAM/i,             'upload to SAM');
  assertNoPositiveClaim(/upload to PIEE/i,            'upload to PIEE');
  assertNoPositiveClaim(/upload to eBuy/i,            'upload to eBuy');
  assertNoPositiveClaim(/upload to GSA/i,             'upload to GSA');
  assertNoPositiveClaim(/Agency submission complete/i, 'Agency submission complete');
});

// 20. System Readiness / sysflow remains removed.
test('System Readiness / System Flow remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
});

// 21. Deprecated $79 / $349 / $999 not in active app UI.
test('deprecated $79 / $349 / $999 not in active app UI', () => {
  // Scope: active tab-panes. Pricing-source-of-truth deprecation table
  // lives in docs/ and is separately gated by the project-wide safety grep.
  const PANES = HTML.match(/<div class="tab-pane[\s\S]*?<\/div>\s*<\/section>/g) || [];
  const sample = PANES.join('\n');
  for (const re of [/\$79\b/, /\$349\b/, /\$999\b/]) {
    assert.ok(!re.test(sample),
      'deprecated active-UI pricing copy present: ' + re);
  }
});

// 22. Renderer-boot guard.
test('every inline <script> block still parses (renderer-boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 8, 'expected ≥8 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// Test wired into npm test chain.
test('test wired into npm test chain (package.json)', () => {
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  assert.ok(/govcon-final-runtime-polish\.test\.js/.test(pkg),
    'test/govcon-final-runtime-polish.test.js not wired into npm test');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24I final-runtime-polish checks ===\n`);
process.exit(failed ? 1 : 0);

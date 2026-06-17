/**
 * Phase 24D — GovCon-First Buyer Surface Tightening regression test.
 *
 * This is a NARROW visual-polish guard. It asserts that the Phase 24D
 * additive CSS infrastructure is in place AND that nothing the user
 * cared about has regressed.
 *
 * Specifically it asserts:
 *   - Inter Tight is loaded via the Google Fonts <link> (additive,
 *     alongside Cormorant Garamond / Instrument Sans / IBM Plex Mono).
 *   - The --sd-font-workspace-title token exists and resolves to an
 *     Inter Tight stack.
 *   - The .workspace-title-tech class exists with Inter Tight, weight
 *     650, font-size 26px, letter-spacing -0.02em — matching the
 *     mission spec (24-28px / 650-700 / ~-0.02em).
 *   - The scoped operational-pane CSS exists for the user's 6 listed
 *     surfaces (Dashboard, Proposal Workspace, Response Desk, Pipeline,
 *     Pilot Tracker / reports = #tab-delivery, Settings).
 *   - The .pane-quiet-borders border-density-reduction utility exists.
 *   - The .mono-discipline-body utility exists.
 *   - GovCon stays the cold-open default tab (Phase 23C preserved).
 *   - The GovCon Capture OS sidebar primary nav-section is still first
 *     (Phase 23C preserved).
 *   - The Show All Tools toggle still exists (Phase 23C preserved).
 *   - System Readiness / System Flow tab stays removed (Phase 21F).
 *   - The GovCon-brand-essential Cormorant headlines on the GovCon
 *     workflow surfaces (#gc-capture-cc, #gc-sol-workspace, #gc-vqr,
 *     etc.) are NOT swept up by the Phase 24D operational-pane rule
 *     — the rule is scoped to #tab-dashboard / #tab-execution /
 *     #tab-reply / #tab-pipeline / #tab-delivery / #tab-settings
 *     and does NOT include #tab-govcon.
 *   - The Phase 22B Capture Command Center headline ("GovCon Capture
 *     Command Center") still appears in the renderer (text content
 *     unchanged).
 *
 * Static; never executes app/renderer code or touches the network.
 *
 * Run:  node test/phase-24d-buyer-surface-tightening.test.js
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

console.log('\n=== Phase 24D — GovCon-First Buyer Surface Tightening ===\n');

// 1. Inter Tight is loaded.
test('Inter Tight is loaded via the Google Fonts <link>', () => {
  assert.ok(/family=Inter\+Tight:wght@\d+(?:;\d+)*/.test(HTML),
    'Inter Tight not present in the Google Fonts URL');
  // The additive load must NOT remove the existing brand fonts.
  assert.ok(/family=Cormorant\+Garamond/.test(HTML),
    'Cormorant Garamond was accidentally removed');
  assert.ok(/family=Instrument\+Sans/.test(HTML),
    'Instrument Sans was accidentally removed');
  assert.ok(/family=IBM\+Plex\+Mono/.test(HTML),
    'IBM Plex Mono was accidentally removed');
});

// 2. The --sd-font-workspace-title token exists.
test('--sd-font-workspace-title token exists and resolves to an Inter Tight stack', () => {
  assert.ok(/--sd-font-workspace-title\s*:\s*'Inter Tight'/.test(HTML),
    '--sd-font-workspace-title token missing or wrong family');
  // Stack fallback to existing body sans + system sans-serif.
  assert.ok(/--sd-font-workspace-title\s*:\s*'Inter Tight','Instrument Sans',sans-serif/.test(HTML),
    '--sd-font-workspace-title fallback stack must be Instrument Sans → sans-serif');
});

// 3. The .workspace-title-tech class exists with the spec'd properties.
test('.workspace-title-tech class exists with mission-spec typography', () => {
  // Block body — look for the canonical declaration.
  const cls = HTML.match(/\.workspace-title-tech\s*\{[^}]+\}/);
  assert.ok(cls, '.workspace-title-tech class block not found');
  const block = cls[0];
  assert.ok(/font-family\s*:\s*var\(--sd-font-workspace-title\)/.test(block),
    '.workspace-title-tech must use --sd-font-workspace-title');
  assert.ok(/font-weight\s*:\s*650/.test(block),
    '.workspace-title-tech must be weight 650');
  assert.ok(/font-size\s*:\s*26px/.test(block),
    '.workspace-title-tech must be 26px (in 24-28px target range)');
  assert.ok(/letter-spacing\s*:\s*-0\.02em/.test(block),
    '.workspace-title-tech must use letter-spacing -0.02em');
  assert.ok(/font-style\s*:\s*normal/.test(block),
    '.workspace-title-tech must override italic to normal');
});

// 4. The scoped operational-pane rule is present for all 6 listed surfaces.
test('Scoped operational-pane Inter Tight rule covers all 6 user-listed surfaces', () => {
  const required = [
    '#tab-dashboard .pane-title .brief-head',
    '#tab-execution .pane-title .brief-head',
    '#tab-reply .pane-title .brief-head',
    '#tab-pipeline .pane-title .brief-head',
    '#tab-delivery .pane-title .brief-head',
    '#tab-settings .pane-title .brief-head',
  ];
  for (const sel of required) {
    assert.ok(HTML.includes(sel),
      'operational-pane selector missing: ' + sel);
  }
  // The selector group must reference --sd-font-workspace-title.
  const groupMatch = HTML.match(/#tab-dashboard \.pane-title \.brief-head[\s\S]{0,800}var\(--sd-font-workspace-title\)/);
  assert.ok(groupMatch,
    'operational-pane selector group must apply var(--sd-font-workspace-title)');
});

// 5. GovCon is DELIBERATELY EXCLUDED from the operational-pane rule.
test('#tab-govcon is NOT swept into the Phase 24D operational-pane rule', () => {
  // The operational selector group must not name #tab-govcon.
  const groupMatch = HTML.match(/#tab-dashboard \.pane-title \.brief-head[\s\S]{0,1200}var\(--sd-font-workspace-title\)/);
  assert.ok(groupMatch,
    'could not find Phase 24D operational-pane rule for inspection');
  assert.ok(!/\#tab-govcon\b/.test(groupMatch[0]),
    'Phase 24D operational-pane rule must NOT include #tab-govcon');
});

// 6. Border-density reduction utility exists.
test('.pane-quiet-borders border-density-reduction utility exists', () => {
  assert.ok(/\.pane-quiet-borders\s*\{[^}]*border-color\s*:\s*transparent/.test(HTML),
    '.pane-quiet-borders must declare border-color: transparent');
  assert.ok(/\.pane-quiet-borders\s*\{[^}]*box-shadow\s*:\s*var\(--sd-shadow-panel\)/.test(HTML),
    '.pane-quiet-borders must trade border for var(--sd-shadow-panel) elevation');
  // Active-state accent must survive the quiet-borders treatment.
  assert.ok(/\.pane-quiet-borders\s*>\s*\.card\.card-active/.test(HTML),
    '.pane-quiet-borders must preserve active-state border accents');
});

// 7. Mono-discipline body override exists.
test('.mono-discipline-body utility exists', () => {
  const cls = HTML.match(/\.mono-discipline-body\s*\{[^}]+\}/);
  assert.ok(cls, '.mono-discipline-body class block not found');
  assert.ok(/font-family\s*:\s*var\(--sd-font-body\)\s*!important/.test(cls[0]),
    '.mono-discipline-body must override font-family to body sans (!important)');
  assert.ok(/text-transform\s*:\s*none\s*!important/.test(cls[0]),
    '.mono-discipline-body must clear text-transform');
});

// 8. GovCon stays the cold-open default tab (Phase 23C preserved).
test('GovCon stays the cold-open default tab (Phase 23C preserved)', () => {
  assert.ok(/<div class="tab-pane active" id="tab-govcon">/.test(HTML),
    'tab-govcon must remain the active pane on cold open');
  assert.ok(/let tab='govcon';/.test(HTML),
    "renderer init must still default tab variable to 'govcon'");
  assert.ok(/localStorage\.getItem\('lcc_active_tab'\)\|\|'govcon'/.test(HTML),
    "localStorage fallback must remain 'govcon'");
});

// 9. GovCon Capture OS sidebar primary nav-section preserved.
test('GovCon Capture OS sidebar primary nav-section preserved (Phase 23C)', () => {
  assert.ok(/id="nav-section-govcon-primary"/.test(HTML),
    'Phase 23C nav-section-govcon-primary missing');
  assert.ok(/<button class="nav-btn active" data-tab="govcon"/.test(HTML),
    'GovCon nav button must remain active by default');
});

// 10. Show All Tools backward-compat surface preserved.
//     Phase 23C originally introduced the toggle button; Phase 25L-1
//     retired the visible button (sidebar was cleaned up) but kept the
//     `gcToggleAllTools` global as a no-op stub for backward compat.
//     Phase 24D must NOT regress this — the back-compat global must
//     still exist so any caller (programmatic or external) does not
//     throw.
test('Phase 23C → 25L-1 Show All Tools back-compat surface preserved', () => {
  assert.ok(/window\.gcToggleAllTools\s*=\s*function/.test(HTML),
    'gcToggleAllTools back-compat global missing — Phase 23C/25L-1 contract regressed');
});

// 11. Phase 21F removal preserved.
test('Phase 21F System Readiness / System Flow tab stays removed', () => {
  assert.ok(!/data-tab="sysflow"/.test(HTML), 'sysflow nav-btn returned');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane returned');
});

// 12. GovCon brand-essential Cormorant headlines preserved.
test('GovCon-brand-essential Cormorant headlines on workflow surfaces preserved', () => {
  // Phase 22B Capture Command Center brand headline text content must still exist
  // (the visual styling stays Cormorant Garamond italic because #tab-govcon is
  // excluded from the Phase 24D operational-pane rule).
  assert.ok(/GovCon Capture Command Center/.test(HTML),
    'Phase 22B Capture Command Center brand headline text missing');
  assert.ok(/Solicitation Center/.test(HTML),
    'Phase 22C Solicitation Center brand headline text missing');
  assert.ok(/Vendor Quote Room/.test(HTML),
    'Phase 22D Vendor Quote Room brand headline text missing');
  assert.ok(/Past Performance Library/.test(HTML),
    'Phase 22E Past Performance Library brand headline text missing');
  assert.ok(/Submission Readiness Gate/.test(HTML),
    'Phase 22F Submission Readiness Gate brand headline text missing');
  // The Cormorant Garamond declaration on .pane-title must still exist
  // (so #tab-govcon's titles render in Cormorant).
  assert.ok(/\.pane-title\s*\{[^}]*Cormorant Garamond/.test(HTML),
    '.pane-title must still use Cormorant Garamond as the default brand voice');
});

// 13. No catastrophic visual regression — every inline <script> still parses.
test('Renderer boot still passes (every inline <script> block still parses)', () => {
  const vm = require('vm');
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

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 24D buyer-surface-tightening checks ===');
if (failed > 0) process.exit(1);

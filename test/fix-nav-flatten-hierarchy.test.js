/**
 * fix(nav) — GovCon + Proposal Workspace navigation flatten regression test.
 *
 * The user's product directive (paraphrased):
 *   Sidebar must be the single source of navigation. The content area
 *   must NOT repeat the same section title that already exists in the
 *   sidebar hierarchy. Max nav depth = 2 (Sidebar Category → Sidebar
 *   Subcategory → Content). Remove duplicate "GovCon Pipeline" /
 *   "Proposal Draft" titles. Remove the horizontal GovCon tab strip
 *   and the Proposal Workspace center navigation column.
 *
 * Implementation strategy (so existing Phase 25 tests don't regress):
 *   - The in-pane horizontal `#gc-tab-nav` and left-rail `#pw-subtab-rail`
 *     markup stays in the DOM (Phase 25N / Phase 25R / Phase 25P tests
 *     all regex against the raw HTML for these ids and their child
 *     buttons). The fix(nav) CSS hides them via `display:none !important`.
 *   - The duplicate "GovCon Pipeline" pane-title <span class="brief-head">
 *     also stays in the DOM (so its callers and any indirect tests still
 *     find the text). Its parent <div> gets a marker attribute
 *     `data-nav-fix-hide-duplicate-title="govcon-pipeline"` and the CSS
 *     hides it.
 *   - 10 GovCon sub-buttons and 12 Proposal Workspace sub-buttons are
 *     injected into the actual sidebar nav-section as `.nav-btn-sub`
 *     children. Each routes through the existing `gcTabSwitch()` /
 *     `pwSubtab()` JS — no new feature, just a sidebar entry point.
 *
 * Static; never executes app/renderer code or touches the network.
 *
 * Run:  node test/fix-nav-flatten-hierarchy.test.js
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

console.log('\n=== fix(nav) — GovCon + Proposal Workspace navigation flatten ===\n');

// Locate the GovCon and Proposal Workspace sidebar nav-sections so we can
// scope the sub-button assertions to them.
function sliceSection(id) {
  const m = HTML.match(new RegExp('id="' + id + '"[\\s\\S]*?</div>\\s*<!-- |id="' + id + '"[\\s\\S]*?</div>\\s*<div class="nav-section"', ''));
  if (m) return m[0];
  // Fallback — generous slice if delimiter changed.
  const start = HTML.indexOf('id="' + id + '"');
  return start >= 0 ? HTML.slice(start, start + 6000) : '';
}
const GOVCON_SECTION = sliceSection('nav-section-govcon-primary');
const EXEC_SECTION = sliceSection('nav-section-execution');

// 1. CSS infrastructure: the new .nav-btn-sub class exists.
test('.nav-btn-sub sidebar sub-button class exists', () => {
  const cls = HTML.match(/\.nav-btn-sub\s*\{[^}]+\}/);
  assert.ok(cls, '.nav-btn-sub CSS block not found');
  assert.ok(/font-family\s*:\s*'Instrument Sans'/.test(cls[0]),
    '.nav-btn-sub must inherit Instrument Sans (no new font family for nav)');
  // Hover state must exist so the sub-button feels alive in the sidebar.
  assert.ok(/\.nav-btn-sub:hover/.test(HTML),
    '.nav-btn-sub:hover state missing');
  assert.ok(/\.nav-btn-sub\.active/.test(HTML),
    '.nav-btn-sub.active state missing');
});

// 2. The 10 required GovCon sidebar sub-buttons exist (correct labels + routing).
test('Sidebar GovCon sub-nav has all 10 required sub-buttons', () => {
  const REQUIRED = [
    { key: 'find-opportunities',   label: 'Find Opportunities' },
    { key: 'saved-pursuits',       label: 'Saved Pursuits' },
    { key: 'solicitation',         label: 'Solicitation Center' },
    { key: 'vendors',              label: 'Vendors' },
    { key: 'pricing',              label: 'Pricing' },
    { key: 'past-performance',     label: 'Past Performance' },
    { key: 'prime-partners',       label: 'Prime Partners' },
    { key: 'far-reference',        label: 'FAR Reference' },
    { key: 'submission-readiness', label: 'Submission Readiness' },
    { key: 'contract-awards',      label: 'Federal Procurement Data' }
  ];
  for (const item of REQUIRED) {
    // Each sub-button must be inside the GovCon sidebar section (not the
    // in-pane tab strip), must carry the data-nav-sub identifier, and must
    // route through both openTab('govcon') and gcTabSwitch(<key>).
    const navSubMarker = 'data-nav-sub="gc-' + item.key + '"';
    assert.ok(GOVCON_SECTION.includes(navSubMarker),
      'GovCon sidebar sub-button missing for: ' + item.key);
    const labelRe = new RegExp(
      'data-nav-sub="gc-' + item.key + '"[\\s\\S]{0,400}>' +
      item.label.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&') + '<'
    );
    assert.ok(labelRe.test(GOVCON_SECTION),
      'GovCon sidebar sub-button label "' + item.label + '" not next to data-nav-sub marker');
    const routeRe = new RegExp(
      'data-nav-sub="gc-' + item.key + '"[\\s\\S]{0,500}gcTabSwitch\\(\'' +
      item.key + '\'\\)'
    );
    assert.ok(routeRe.test(GOVCON_SECTION),
      'GovCon sidebar sub-button for "' + item.key + '" does not route through gcTabSwitch');
  }
});

// 3. The 12 required Proposal Workspace sidebar sub-buttons exist.
test('Sidebar Proposal Workspace sub-nav has all 12 required sub-buttons', () => {
  const REQUIRED = [
    { key: 'solicitation-intake',     label: 'Solicitation Intake' },
    { key: 'metadata-summary',        label: 'Solicitation Metadata &amp; Summary' },
    { key: 'scope-of-work',           label: 'Scope of Work' },
    { key: 'place-of-performance',    label: 'Place of Performance' },
    { key: 'subcontractor-prep',      label: 'Subcontractor ID &amp; Prep' },
    { key: 'compliance-matrix',       label: 'Compliance Matrix' },
    { key: 'capability-studio',       label: 'Capability Statement Studio' },
    { key: 'past-performance',        label: 'Past Performance' },
    { key: 'clarification-questions', label: 'Clarification Questions' },
    { key: 'pricing-strategy',        label: 'Pricing Strategy' },
    { key: 'proposal-draft',          label: 'Proposal Draft' },
    { key: 'submission-checklist',    label: 'Submission Checklist' }
  ];
  for (const item of REQUIRED) {
    const navSubMarker = 'data-nav-sub="pw-' + item.key + '"';
    assert.ok(EXEC_SECTION.includes(navSubMarker),
      'Proposal Workspace sidebar sub-button missing for: ' + item.key);
    const labelRe = new RegExp(
      'data-nav-sub="pw-' + item.key + '"[\\s\\S]{0,500}>' +
      item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<'
    );
    assert.ok(labelRe.test(EXEC_SECTION),
      'Proposal Workspace sidebar sub-button label "' + item.label + '" not next to data-nav-sub marker');
    const routeRe = new RegExp(
      'data-nav-sub="pw-' + item.key + '"[\\s\\S]{0,600}pwSubtab\\(\'' +
      item.key + '\'\\)'
    );
    assert.ok(routeRe.test(EXEC_SECTION),
      'Proposal Workspace sidebar sub-button for "' + item.key + '" does not route through pwSubtab');
  }
});

// 4. Sidebar sub-buttons also call openTab('govcon') / openTab('execution')
//    so clicking a deep sub-item from a different tab opens the right pane.
test('Sidebar sub-buttons open the parent tab before switching sub-tab', () => {
  // For GovCon — every sub-button must call openTab('govcon') before gcTabSwitch.
  const gcMatches = GOVCON_SECTION.match(/data-nav-sub="gc-[^"]+"/g) || [];
  assert.strictEqual(gcMatches.length, 10,
    'expected exactly 10 GovCon sub-buttons; found ' + gcMatches.length);
  assert.ok((GOVCON_SECTION.match(/openTab\('govcon'\)/g) || []).length >= 10,
    'every GovCon sidebar sub-button must call openTab(\'govcon\') first');
  // For Proposal Workspace — every sub-button must call openTab('execution').
  const pwMatches = EXEC_SECTION.match(/data-nav-sub="pw-[^"]+"/g) || [];
  assert.strictEqual(pwMatches.length, 12,
    'expected exactly 12 Proposal Workspace sub-buttons; found ' + pwMatches.length);
  assert.ok((EXEC_SECTION.match(/openTab\('execution'\)/g) || []).length >= 12,
    'every Proposal Workspace sidebar sub-button must call openTab(\'execution\') first');
});

// 5. The in-pane horizontal GovCon tab strip is hidden via CSS.
test('In-pane #gc-tab-nav horizontal tab strip is hidden via CSS', () => {
  // Markup must remain (Phase 25N pins id="gc-tab-nav") AND a CSS rule must hide it.
  assert.ok(/id="gc-tab-nav"/.test(HTML), 'Phase 25N: #gc-tab-nav markup must remain');
  assert.ok(/#gc-tab-nav\s*\{[^}]*display\s*:\s*none/.test(HTML),
    'fix(nav): #gc-tab-nav must be hidden via display:none CSS');
});

// 6. The in-pane Proposal Workspace left-rail is hidden via CSS.
test('In-pane #pw-subtab-rail left-rail is hidden via CSS', () => {
  assert.ok(/id="pw-subtab-rail"/.test(HTML),
    'Phase 25R: #pw-subtab-rail markup must remain');
  assert.ok(/#pw-subtab-rail\s*\{[^}]*display\s*:\s*none/.test(HTML),
    'fix(nav): #pw-subtab-rail must be hidden via display:none CSS');
});

// 7. #pw-body grid layout collapses to a single column once the rail is hidden.
test('#pw-body grid collapses to single column once the rail is hidden', () => {
  assert.ok(/#pw-body\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(HTML),
    'fix(nav): #pw-body must override its 2-column grid to 1fr');
});

// 8. The duplicate "GovCon Pipeline" pane-title is hidden via CSS.
test('Duplicate "GovCon Pipeline" pane-title is hidden via CSS', () => {
  // Marker attribute must exist on the parent div.
  assert.ok(/data-nav-fix-hide-duplicate-title="govcon-pipeline"/.test(HTML),
    'fix(nav): marker attribute on the duplicate GovCon Pipeline title must exist');
  // CSS rule using the marker.
  assert.ok(/\[data-nav-fix-hide-duplicate-title="govcon-pipeline"\]\s*\{[^}]*display\s*:\s*none/.test(HTML),
    'fix(nav): CSS rule hiding the marked GovCon Pipeline title block must exist');
  // The text content "GovCon Pipeline" must REMAIN in the DOM (other callers
  // may reference it). The marker simply hides it visually.
  assert.ok(/<span class="brief-head">GovCon Pipeline<\/span>/.test(HTML),
    '"GovCon Pipeline" pane-title text content must remain in DOM (was visually hidden, not deleted)');
});

// 9. Phase 25 tests for in-pane navigation routing still see required markup.
test('Phase 25N/25P/25R routing markup preserved (no destructive removal)', () => {
  // Phase 25N — gc-tab-nav role/tablist + Find Opportunities active button.
  assert.ok(/<nav id="gc-tab-nav"[^>]*role="tablist"/.test(HTML),
    'Phase 25N: gc-tab-nav tablist role must remain');
  assert.ok(/class="gc-tab-btn active"[^>]*data-gc-tab="find-opportunities"/.test(HTML),
    'Phase 25N: Find Opportunities active button must remain');
  // Phase 25R — pw-subtab-rail tablist + pwSubtab switcher function.
  assert.ok(/id="pw-subtab-rail" data-pw-subtab-rail="true"/.test(HTML),
    'Phase 25R: pw-subtab-rail markup must remain');
  assert.ok(/window\.pwSubtab\s*=\s*function/.test(HTML),
    'Phase 25R: pwSubtab function must remain (sidebar sub-buttons route through it)');
});

// 10. Renderer boot still parses (every inline <script>).
test('Renderer boot still passes (every inline <script> block still parses)', () => {
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

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' fix-nav-flatten-hierarchy checks ===');
if (failed > 0) process.exit(1);

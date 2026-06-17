/**
 * Phase 25R — Proposal Workspace + GovCon nav refactor, extraction honesty,
 * disclaimer relocation. Static string assertions on sourcedeck.html.
 * Run:  node test/phase-25r-proposal-govcon-nav.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25R — Proposal/GovCon nav + extraction honesty ===\n');

const PW = HTML.slice(HTML.indexOf('id="tab-execution"'), HTML.indexOf('id="tab-proof"'));

// ── Task 2: Proposal Workspace left-rail sub-tabs ──────────────────────
test('Proposal Workspace renders left-rail sub-tabs (panel switch, not scroll)', () => {
  assert.ok(/id="pw-subtab-rail"/.test(PW), 'sub-tab rail present');
  assert.ok(/window\.pwSubtab = function/.test(HTML), 'pwSubtab panel switcher present');
  assert.ok(/panels\[i\]\.style\.display = \(panels\[i\]\.getAttribute\('data-pw-panel'\) === id\)/.test(HTML), 'switcher shows one panel at a time');
});
test('all 12 Proposal Workspace sub-tabs present', () => {
  ['solicitation-intake','metadata-summary','scope-of-work','place-of-performance','subcontractor-prep','compliance-matrix','capability-studio','past-performance','clarification-questions','pricing-strategy','proposal-draft','submission-checklist']
    .forEach(function(id){ assert.ok(new RegExp('data-pw-subtab="' + id + '"').test(PW), 'sub-tab missing: ' + id); assert.ok(new RegExp('data-pw-panel="' + id + '"').test(PW), 'panel missing: ' + id); });
});
test('Capability Statement Studio + Clarification Questions are sub-tab panels', () => {
  assert.ok(/id="pw-capability-studio"[^>]*data-pw-panel="capability-studio"/.test(PW), 'capability studio is a panel');
  assert.ok(/id="pw-first-impression"[^>]*data-pw-panel="clarification-questions"/.test(PW), 'clarification questions is a panel');
});
test('no duplicate in-pane "Proposal Workspace" H1; sidebar label retained', () => {
  assert.ok(!/<div class="pane-title"><span class="brief-head">Proposal Workspace<\/span><\/div>/.test(PW), 'in-pane H1 removed');
  assert.ok(/data-tab="execution"[\s\S]{0,900}Proposal Workspace/.test(HTML), 'sidebar Proposal Workspace label retained');
});

// ── Task 4: "Section-by-section" language removed from UI ──────────────
test('no "Section-by-section"/"Human approval gate" subtitle in the pane', () => {
  assert.ok(!/<div class="pane-sub">Section-by-section internal review drafting · Human approval gate on every section<\/div>/.test(HTML), 'subtitle removed');
  assert.ok(!/Human approval gate on every section/.test(PW), 'no human-approval-gate subtitle in pane');
});

// ── Task 3: GovCon sub-tabs + Audit Log relocation ─────────────────────
test('GovCon renders the 9 specified sub-tabs', () => {
  ['find-opportunities','saved-pursuits','solicitation','vendors','pricing','past-performance','prime-partners','far-reference','contract-awards']
    .forEach(function(t){ assert.ok(new RegExp('data-gc-tab="' + t + '"').test(HTML), 'GovCon sub-tab missing: ' + t); });
  assert.ok(/data-gc-tab="solicitation"[\s\S]{0,400}Solicitation Center/.test(HTML), '"Solicitation Center" label');
  assert.ok(/data-gc-tab="contract-awards"[\s\S]{0,400}Federal Procurement Data/.test(HTML), '"Federal Procurement Data" label');
});
test('Audit Log is NOT a GovCon tab', () => {
  assert.ok(!/data-gc-tab="audit-log"/.test(HTML), 'audit-log GovCon tab button removed');
  assert.ok(!/data-gc-tab-page="audit-log"/.test(HTML), 'audit-log GovCon tab page removed');
});
test('Audit Log IS under Settings', () => {
  assert.ok(/id="settings-audit-log"/.test(HTML), 'Settings audit-log section present');
  assert.ok(/id="tab-settings"[\s\S]*?id="settings-audit-log"/.test(HTML), 'audit-log lives inside Settings pane');
});

// ── Task 1: extraction honesty ─────────────────────────────────────────
test('extraction cannot show success with zero populated fields (FAILED + retry path)', () => {
  const fn = HTML.slice(HTML.indexOf('window.pwSolExtractKeyDetails = function'), HTML.indexOf('window.pwSolExtractKeyDetails = function') + 2200);
  assert.ok(/_pwCountPopulated\(/.test(fn), 'counts populated fields');
  assert.ok(/populated === 0/.test(fn) && /rec\.status = 'failed'/.test(fn), 'zero fields → FAILED');
  assert.ok(!/Extracted into 6 FAR-aligned sections/.test(HTML), 'never claims fixed FAR-section count');
  assert.ok(/No structured data could be extracted from this document\./.test(HTML), 'honest failure message');
  assert.ok(/pwSolRetryExtraction/.test(HTML) && /pwSolViewExtractionLog/.test(HTML) && /pwSolManualMapping/.test(HTML), 'Retry / View Log / Manual Mapping present');
});
test('PDF/DOCX parsing is stated plainly, not faked; paste path populates fields', () => {
  assert.ok(/PDF\/DOCX text extraction is not available in this build/.test(HTML), 'PDF/DOCX parsing stated as unavailable');
  // Paste/txt path runs the real heuristic parser.
  assert.ok(/rec\.extracted = result;/.test(HTML) && /function extract\(text\)/.test(HTML), 'paste/txt path runs the parser');
});

// ── Task 5: disclaimer relocation; guardrails intact ───────────────────
test('no "Internal review only" banner on operational screens', () => {
  assert.ok(!/id="pw-disclaimer"/.test(HTML), 'Proposal Workspace internal-review banner removed');
  // operational GovCon FAR screen no longer carries the strong banner
  assert.ok(!/<strong style="color:var\(--gold2\)">Internal review only\.<\/strong>/.test(HTML), 'FAR internal-review banner removed');
});
test('consolidated disclaimer present in Help/FAQ and Settings/Legal', () => {
  assert.ok(/data-help-legal-disclaimer="true"/.test(HTML), 'Help/FAQ disclaimer present');
  assert.ok(/id="settings-legal"/.test(HTML), 'Settings/Legal disclaimer present');
  assert.ok(/not legal review, not compliance certification, and not final proposals/.test(HTML), 'disclaimer wording present');
});
test('no-send / no-submit / no-upload guardrails intact (behavioral)', () => {
  // Text relocated, but the behavioral posture text + guards remain.
  assert.ok(/does not send, submit, or upload/i.test(HTML), 'no-send posture text retained');
  assert.ok(!/>\s*Send Email\s*</.test(PW), 'no Send Email control in Proposal Workspace');
  assert.ok(!/>\s*Submit Bid\s*</.test(HTML) && !/>\s*Submit Quote\s*</.test(HTML), 'no submit controls');
});

// ── Phase 25Q not regressed ────────────────────────────────────────────
test('Phase 25Q SAM rendering + 25/50/75/100 result-count selector preserved', () => {
  assert.ok(/id="gc-tab-sam-limit"/.test(HTML), 'result-count selector present');
  ['25','50','75','100'].forEach(function(n){ assert.ok(new RegExp('value="' + n + '"').test(HTML), 'result-count option ' + n); });
  assert.ok(/gcTabRenderSamFreshResults|renderSamFreshResults/.test(HTML), 'SAM results renderer present');
  assert.ok(/data-gc-tab-page="find-opportunities"/.test(HTML), 'Find Opportunities preserved');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25R nav/extraction checks ===\n`);
process.exit(failed ? 1 : 0);

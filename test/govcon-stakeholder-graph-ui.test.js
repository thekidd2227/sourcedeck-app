/**
 * Phase 24E — Stakeholder Graph UI regression test.
 *
 * Implements the 21-criterion test contract from
 * docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network. Synthetic data only.
 *
 * Run:  node test/govcon-stakeholder-graph-ui.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

const PANE_START = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
assert.ok(PANE_START > 0, 'tab-govcon pane not found');
const PANE = HTML.slice(PANE_START);

// Tight slice around the new section for forbidden-phrase scanning.
const SG_START = HTML.indexOf('id="gc-stakeholder-graph"');
assert.ok(SG_START > 0, 'gc-stakeholder-graph anchor not found');
const SG_END_HINT = HTML.indexOf('PHASE 22F — Submission Readiness Gate', SG_START);
const SG_PANEL = HTML.slice(SG_START, SG_END_HINT > 0 ? SG_END_HINT : SG_START + 30000);

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 24E — Stakeholder Graph UI ===\n');

// Criterion 1
test('Stakeholder Graph parent #gc-stakeholder-graph exists in #tab-govcon', () => {
  assert.ok(/<section[^>]*id="gc-stakeholder-graph"/.test(PANE),
    '#gc-stakeholder-graph section missing inside #tab-govcon');
  assert.ok(/data-section="govcon-stakeholder-graph"/.test(PANE),
    'data-section="govcon-stakeholder-graph" missing');
  assert.ok(/Stakeholder Graph/.test(PANE), '"Stakeholder Graph" title missing');
});

// Criterion 2
test('Account/agency stakeholder map renders (gc-stakeholder-by-agency)', () => {
  assert.ok(/id="gc-stakeholder-by-agency"/.test(SG_PANEL),
    '#gc-stakeholder-by-agency anchor missing');
});

// Criterion 3
test('Opportunity stakeholder map renders (gc-stakeholder-by-opportunity)', () => {
  assert.ok(/id="gc-stakeholder-by-opportunity"/.test(SG_PANEL),
    '#gc-stakeholder-by-opportunity anchor missing');
});

// Criterion 4 — prime/vendor/internal-owner relationships render
test('partner_prime_or_sub AND internal_owner categories both render in sample state', () => {
  assert.ok(/data-stakeholder-category="partner_prime_or_sub"/.test(SG_PANEL),
    'partner_prime_or_sub marker missing');
  assert.ok(/data-stakeholder-category="internal_owner"/.test(SG_PANEL),
    'internal_owner marker missing');
  assert.ok(/id="gc-stakeholder-teaming"/.test(SG_PANEL),
    '#gc-stakeholder-teaming view missing');
  assert.ok(/id="gc-stakeholder-internal-owner"/.test(SG_PANEL),
    '#gc-stakeholder-internal-owner view missing');
});

// Criterion 5 — role labels are clear
test('every sample row carries a non-empty role label', () => {
  const rowRe = /<div class="gc-sg-row"[\s\S]*?<\/div>\s*<\/div>/g;
  const rows = SG_PANEL.match(rowRe) || [];
  assert.ok(rows.length >= 6, 'expected at least 6 sample rows; found ' + rows.length);
  for (const row of rows) {
    // Each row has a font-size:11.5px;color:var(--text);font-weight:600 line
    const roleMatch = row.match(/font-size:11\.5px;color:var\(--text\);font-weight:600">([^<]{3,})</);
    assert.ok(roleMatch, 'a sample row has no >=3-char role label: ' + row.slice(0, 100));
  }
});

// Criterion 6 — allowed engagement posture is visible
test('every sample row carries a data-posture attribute with a known posture', () => {
  const known = ['restricted', 'reference_only', 'research_target', 'outreach_candidate', 'engagement_candidate', 'internal'];
  const rows = SG_PANEL.match(/<div class="gc-sg-row"[^>]*data-posture="([^"]+)"/g) || [];
  assert.ok(rows.length >= 6, 'expected at least 6 rows with data-posture; found ' + rows.length);
  for (const row of rows) {
    const m = row.match(/data-posture="([^"]+)"/);
    assert.ok(m && known.indexOf(m[1]) !== -1,
      'unknown posture value: ' + (m && m[1]));
  }
});

// Criterion 7 — prohibited engagement warning is visible (sample state has at least one restricted)
test('at least one [data-stakeholder-warning="restricted"] element rendered in the sample state', () => {
  assert.ok(/data-stakeholder-warning="restricted"/.test(SG_PANEL),
    'no restricted-posture warning rendered in sample state');
  assert.ok(/Restricted communication window/i.test(SG_PANEL),
    'restricted-window warning copy missing');
});

// Criterion 8 — sample/demo labels are visible
test('every sample row carries data-or-source="sample" AND a visible SAMPLE chip', () => {
  const sourceMatches = (SG_PANEL.match(/data-or-source="sample"/g) || []).length;
  const chipMatches = (SG_PANEL.match(/>SAMPLE</g) || []).length;
  assert.ok(sourceMatches >= 6, 'expected ≥6 data-or-source="sample" markers; found ' + sourceMatches);
  assert.ok(chipMatches >= 6, 'expected ≥6 visible SAMPLE chips; found ' + chipMatches);
});

// Criterion 9 — internal capture planning disclaimer verbatim
test('Stakeholder Graph parent carries the verbatim internal-capture-planning disclaimer', () => {
  const DISC = 'Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes.';
  assert.ok(SG_PANEL.includes(DISC),
    'verbatim disclaimer not found in #gc-stakeholder-graph');
});

// Criterion 10 — no Send Email / Submit Bid / Submit Quote
test('no Send Email / Submit Bid / Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'Send Email button present');
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML),           'Submit Bid button present');
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML),         'Submit Quote button present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML),         'sendEmail onclick wired');
  assert.ok(!/onclick="submitBid\b/i.test(HTML),         'submitBid onclick wired');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML),       'submitQuote onclick wired');
});

// Criterion 11 — no portal-upload positive claim in the panel
test('no portal-upload positive claim in the Stakeholder Graph panel', () => {
  function assertNoPositiveClaim(re, label) {
    const lines = SG_PANEL.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!re.test(line)) continue;
      const context = [lines[i - 1] || '', line].join(' ');
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot|won['’]t|will not)\b/i.test(context);
      assert.ok(guard, 'unguarded positive ' + label + ' claim: ' + line.trim());
    }
  }
  assertNoPositiveClaim(/upload to SAM/i,  'upload-to-SAM');
  assertNoPositiveClaim(/upload to PIEE/i, 'upload-to-PIEE');
  assertNoPositiveClaim(/upload to eBuy/i, 'upload-to-eBuy');
  assertNoPositiveClaim(/upload to GSA/i,  'upload-to-GSA');
});

// Criterion 12 — no autonomous submission
test('no auto_send / auto_submit / submit-automatically copy in panel', () => {
  for (const re of [
    /auto_send\s*:\s*true/i,
    /auto_submit\s*:\s*true/i,
    /submit automatically/i,
    /send automatically/i
  ]) {
    assert.ok(!re.test(SG_PANEL), 'positive autonomous-submission phrasing present: ' + re);
  }
  assert.ok(!/Export and submit/i.test(SG_PANEL),
    '"Export and submit" wording present');
});

// Criterion 13 — no improper CO/COR outreach language (12 forbidden phrases)
test('none of the 12 forbidden phrases appears in the Stakeholder Graph panel', () => {
  const FORBIDDEN = [
    'Contact CO',
    'Email COR',
    'Influence buyer',
    'Submit to agency',
    'Send to contracting officer',
    'Guaranteed award',
    'Preferred relationship',
    'Backchannel',
    'Circumvent competition',
    'Lobby this office',
    'Agency submission complete'
  ];
  for (const phrase of FORBIDDEN) {
    assert.ok(!SG_PANEL.includes(phrase),
      'forbidden phrase present in panel: ' + phrase);
  }
  // "Portal upload" (as a positive claim) is forbidden; allowed only in
  // negative-assertion copy ("No portal upload"). Implemented via the
  // assertNoPositiveClaim pattern.
  function assertNoPositiveClaim(re, label) {
    const lines = SG_PANEL.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!re.test(line)) continue;
      const context = [lines[i - 1] || '', line].join(' ');
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot|won['’]t|will not)\b/i.test(context);
      assert.ok(guard, 'unguarded positive ' + label + ' claim: ' + line.trim());
    }
  }
  assertNoPositiveClaim(/Portal upload/i, 'Portal upload');
});

// Criterion 14 — no unsupported compliance / revenue / signing claims
test('no FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-notarized / Apple-notarized claim in panel', () => {
  for (const re of [
    /FedRAMP certified/i,
    /SOC ?2 certified/i,
    /CMMC certified/i,
    /HIPAA certified/i,
    /HITRUST/i,
    /ISO 27001 certified/i,
    /signed and notarized/i,
    /Apple notarized/i,
    /production signed/i,
    /guaranteed award/i,
    /guaranteed revenue/i
  ]) {
    if (re.test(SG_PANEL)) {
      const lines = SG_PANEL.split(/\r?\n/);
      const hit = lines.find(l => re.test(l)) || '';
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot)\b/i.test(hit);
      assert.ok(guard, 'unguarded positive claim matching ' + re + ': ' + hit.trim());
    }
  }
});

// Criterion 15 — System Readiness / System Flow remains absent
test('System Readiness / System Flow remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
});

// Criterion 16 — Phase 24B audit log remains visible
test('Phase 24B Audit Log panel #gc-audit-log remains intact', () => {
  assert.ok(/id="gc-audit-log"/.test(HTML), 'gc-audit-log panel missing');
  assert.ok(/id="gc-audit-list"/.test(HTML), 'gc-audit-list anchor missing');
  assert.ok(/function gcAuditRefresh\b/.test(HTML), 'gcAuditRefresh function missing');
});

// Criterion 17 — Phase 24C NAICS profile behavior remains intact
test('Phase 24C profile-driven NAICS loader + filter render remain intact', () => {
  assert.ok(/let\s+APPROVED_NAICS\s*=\s*\[\s*\]/.test(HTML),
    'APPROVED_NAICS empty-default declaration missing');
  assert.ok(/function\s+gcRenderNaicsFilter\s*\(/.test(HTML),
    'gcRenderNaicsFilter function missing');
  assert.ok(/function\s+gcLoadTargetingNaics\s*\(/.test(HTML) || /async\s+function\s+gcLoadTargetingNaics\s*\(/.test(HTML),
    'gcLoadTargetingNaics function missing');
});

// Criterion 18 — Phase 24D Past Performance / Capability Statement surfaces remain intact
test('Phase 24D Past Performance + Capability + Prime Partner surfaces remain intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 24D anchor missing: ' + id);
  }
});

// Criterion 19 — renderer boot passes
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

// Criterion 20 — npm test passes (exit 0) — verified by harness; this test
// only asserts that the new test is wired into the npm test chain.
test('test wired into npm test chain (package.json)', () => {
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  assert.ok(/govcon-stakeholder-graph-ui\.test\.js/.test(pkg),
    'test/govcon-stakeholder-graph-ui.test.js not wired into npm test');
});

// Criterion 21 — safety grep clean on changed surface (positive checks)
test('panel ships the verbatim backend safety note (FAR 3.104)', () => {
  assert.ok(/FAR 3\.104/.test(SG_PANEL), 'FAR 3.104 reference missing');
  assert.ok(/restricted communication window/i.test(SG_PANEL),
    'restricted-window safety note missing');
});

// Renderer architecture guards — synthetic marker, IPC consumer, empty-state helper.

test('gcLoadStakeholderGraph() calls window.sd.govcon.stakeholders IPC', () => {
  const m = HTML.match(/async\s+function\s+gcLoadStakeholderGraph\s*\([\s\S]*?\n\}/);
  assert.ok(m, 'gcLoadStakeholderGraph function not found');
  const fn = m[0];
  assert.ok(/window\.sd\.govcon\.stakeholders\s*\(/.test(fn),
    'gcLoadStakeholderGraph must call window.sd.govcon.stakeholders');
  assert.ok(!/fetch\s*\(/.test(fn), 'gcLoadStakeholderGraph must not call fetch');
});

test('gcSyntheticInternalOwner() returns synthetic: true marker', () => {
  const m = HTML.match(/function\s+gcSyntheticInternalOwner\s*\([\s\S]*?\n\}/);
  assert.ok(m, 'gcSyntheticInternalOwner function not found');
  const fn = m[0];
  assert.ok(/synthetic\s*:\s*true/.test(fn),
    'gcSyntheticInternalOwner must mark synthetic: true');
  assert.ok(/category\s*:\s*['"]internal_owner['"]/.test(fn),
    'gcSyntheticInternalOwner must set category: internal_owner');
});

test('synthetic UI rows carry data-synthetic="true" marker', () => {
  // Every data-stakeholder-category="internal_owner" row must also carry
  // data-synthetic="true" so it can never be sent through a backend-
  // expecting code path.
  const re = /data-stakeholder-category="internal_owner"(?:(?!<\/div>).)*?data-synthetic="true"/s;
  assert.ok(re.test(SG_PANEL),
    'internal_owner row missing data-synthetic="true" marker');
});

test('preload.js still exposes window.sd.govcon.stakeholders IPC (no boundary regression)', () => {
  assert.ok(/stakeholders\s*:\s*\(payload\)\s*=>/.test(PRELOAD),
    'window.sd.govcon.stakeholders bridge missing from preload');
  assert.ok(/ipcRenderer\.invoke\(['"]govcon:stakeholders-for-opp['"]/.test(PRELOAD),
    'govcon:stakeholders-for-opp IPC invocation missing from preload');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24E stakeholder-graph-ui checks ===\n`);
process.exit(failed ? 1 : 0);

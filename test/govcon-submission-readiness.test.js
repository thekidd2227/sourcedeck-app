/**
 * Phase 22F — Submission Readiness Gate + Human-Approved Package Export
 * regression test.
 *
 * Asserts the Submission Readiness Gate and Human-Approved Package Export
 * surfaces exist in sourcedeck.html with the 13 spec'd checklist items,
 * 4 status options, advisory score/status surfaces, package form fields,
 * 10 included-section checkboxes, Build Preview / Export Placeholder
 * actions, and explicit "SourceDeck does not submit bids, quotes, or
 * government responses" / "SourceDeck does not submit, upload, email, or
 * transmit this package" copy. Confirms previously merged invariants
 * still intact: Phase 22B Capture Command Center, Phase 22C Solicitation
 * Workspace, Phase 22D Vendor Quote Room + Pricing Worksheet, Phase 22E
 * Past Performance + Capability Statement + Prime Partner Finder,
 * Response Desk Import Email + no Send Email, SAM Sprint Free=1 NAICS,
 * System Readiness/Flow remains removed, .btn-gold guard, every inline
 * <script> block still parses (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-submission-readiness.test.js
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

console.log('\n=== Phase 22F — Submission Readiness Gate + Human-Approved Package Export ===\n');

// 1. Submission Readiness Gate exists.
test('Submission Readiness Gate section exists', () => {
  assert.ok(/id="gc-sub-gate"/.test(HTML), 'gc-sub-gate section id missing');
  assert.ok(/Submission Readiness Gate/.test(HTML), 'Submission Readiness Gate title missing');
  assert.ok(/data-section="govcon-submission-readiness-gate"/.test(HTML), 'data-section anchor missing');
});

// 2. Submission readiness score exists.
test('submission readiness score surface exists', () => {
  assert.ok(/id="gc-sub-score"/.test(HTML), 'gc-sub-score surface missing');
  // Phase 23A polish: default = "—%" (em-dash) until the operator starts the
  // checklist. The older "0%" baseline read as a failed score on cold open;
  // the polished default avoids that perception. computeReadiness still
  // returns the numeric score once any item is touched. Accept either.
  assert.ok(/id="gc-sub-score"[^>]*>(?:—%|0%)</.test(HTML),
    'default score should render "—%" (Phase 23A polish) or "0%" (Phase 22F baseline)');
});

// 3. Readiness status exists.
test('readiness status surface exists', () => {
  assert.ok(/id="gc-sub-status"/.test(HTML), 'gc-sub-status surface missing');
  // Phase 23A polish: default = "No package started" until any checklist
  // interaction. Once any item is touched, the renderer transitions through
  // "Not Ready" / "Needs Review" / "Ready for Human Review" per Phase 22F.
  // Accept either.
  assert.ok(/id="gc-sub-status"[^>]*>(?:No package started|Not Ready)</.test(HTML),
    'default readiness status should render "No package started" (Phase 23A polish) or "Not Ready" (Phase 22F baseline)');
});

// 4. Required document checklist exists.
test('Submission Package Checklist table exists', () => {
  assert.ok(/id="gc-sub-checklist-table"/.test(HTML), 'gc-sub-checklist-table missing');
  assert.ok(/id="gc-sub-checklist-body"/.test(HTML), 'gc-sub-checklist-body missing');
  assert.ok(/Submission Package Checklist/.test(HTML), 'Submission Package Checklist title missing');
});

// 5. All checklist items exist.
test('all 13 spec checklist items are listed in the renderer', () => {
  for (const label of [
    'Solicitation reviewed',
    'Deadlines reviewed',
    'Q&A / amendments reviewed',
    'Compliance matrix reviewed',
    'Required forms identified',
    'Proposal sections mapped',
    'Pricing worksheet reviewed',
    'Vendor quotes reviewed',
    'Past performance selected',
    'Capability statement reviewed',
    'Prime / teaming notes reviewed',
    'Risk notes reviewed',
    'Final human approval recorded'
  ]) {
    assert.ok(HTML.includes(label), 'checklist item missing: ' + label);
  }
});

// 6. Checklist status options include Not started / In progress / Reviewed / Blocked.
test('checklist status options include Not started / In progress / Reviewed / Blocked', () => {
  // The renderer JS embeds the STATUSES array literal.
  for (const s of ['Not started', 'In progress', 'Reviewed', 'Blocked']) {
    assert.ok(HTML.includes("'" + s + "'") || HTML.includes('"' + s + '"'),
      'status not declared in renderer: ' + s);
  }
});

// 7. Default checklist is not fake-complete.
test('checklist defaults are Not started (no fake completion)', () => {
  // The default literal must declare 'Not started' as the seed status for every item.
  assert.ok(/STATUS_WEIGHT\s*=\s*\{[\s\S]*?'Not started':\s*0/.test(HTML),
    'STATUS_WEIGHT seed for Not started missing');
  // Default render row says "Checklist initializing… (defaults to Not started; SourceDeck does not auto-complete items)".
  assert.ok(/defaults to Not started; SourceDeck does not auto-complete items/.test(HTML),
    'default empty-state copy missing or implies auto-completion');
});

// 8. Human approval status exists.
test('Human Approval status surface exists', () => {
  assert.ok(/id="gc-sub-approval-status"/.test(HTML), 'gc-sub-approval-status missing');
  assert.ok(/Human Approval Status/.test(HTML), 'Human Approval Status label missing');
  // Default = "Not recorded"
  assert.ok(/id="gc-sub-approval-status"[^>]*>Not recorded</.test(HTML),
    'default approval status should render Not recorded');
});

// 9. Human-Approved Package Export exists.
test('Human-Approved Package Export section exists', () => {
  assert.ok(/id="gc-pkg-export"/.test(HTML), 'gc-pkg-export section missing');
  assert.ok(/Human-Approved Package Export/.test(HTML), 'Human-Approved Package Export title missing');
  assert.ok(/data-section="govcon-human-approved-package-export"/.test(HTML),
    'data-section anchor missing');
});

// 10. Package name / solicitation number / export notes fields exist.
test('package form fields exist (name / solicitation / notes)', () => {
  for (const id of ['gc-pkg-f-name', 'gc-pkg-f-sol', 'gc-pkg-f-notes']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'package field missing: ' + id);
  }
});

// 11. Included sections checklist exists.
test('included-sections checklist (10 boxes) exists', () => {
  for (const id of [
    'gc-pkg-inc-opp', 'gc-pkg-inc-sol', 'gc-pkg-inc-compliance',
    'gc-pkg-inc-pricing', 'gc-pkg-inc-vendor', 'gc-pkg-inc-pp',
    'gc-pkg-inc-cs', 'gc-pkg-inc-ppf', 'gc-pkg-inc-risk',
    'gc-pkg-inc-checklist'
  ]) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'included-section checkbox missing: ' + id);
  }
});

// 12. Build Package Preview action exists.
test('Build Package Preview action exists', () => {
  assert.ok(/onclick="gcPkgBuildPreview\(\)"/.test(HTML), 'Build Package Preview action missing');
  assert.ok(/Build Package Preview/.test(HTML), 'Build Package Preview label missing');
  assert.ok(/id="gc-pkg-preview"/.test(HTML), 'gc-pkg-preview output container missing');
});

// 13. Export Package Placeholder action exists.
test('Export Package Placeholder action exists', () => {
  assert.ok(/onclick="gcPkgExportPlaceholder\(\)"/.test(HTML), 'Export Package Placeholder action missing');
  assert.ok(/Export Package Placeholder/.test(HTML), 'Export Package Placeholder label missing');
});

// 14. "SourceDeck does not submit bids, quotes, or government responses" copy exists.
test('"SourceDeck does not submit bids, quotes, or government responses" copy exists (≥2)', () => {
  const matches = HTML.match(/SourceDeck does not submit bids, quotes, or government responses/g) || [];
  assert.ok(matches.length >= 2,
    'expected ≥2 "SourceDeck does not submit bids, quotes, or government responses" mentions; found ' + matches.length);
});

// 15. "SourceDeck does not submit, upload, email, or transmit this package" copy exists.
test('"SourceDeck does not submit, upload, email, or transmit this package" copy exists (≥3)', () => {
  const matches = HTML.match(/SourceDeck does not submit, upload, email, or transmit this package/g) || [];
  assert.ok(matches.length >= 3,
    'expected ≥3 "SourceDeck does not submit, upload, email, or transmit this package" mentions; found ' + matches.length);
});

// 16. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 17. No Submit Bid button exists.
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'a Submit Bid button is present');
  assert.ok(!/onclick="submitBid\b/i.test(HTML), 'a submitBid() onclick is wired');
});

// 18. No Submit Quote button exists.
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'a Submit Quote button is present');
  assert.ok(!/onclick="submitQuote\b/i.test(HTML), 'a submitQuote() onclick is wired');
});

// 19. No auto-send behavior exists.
test('no positive auto-send copy or behavior', () => {
  assert.ok(!/auto_send\s*[:=]\s*true/i.test(HTML), 'auto_send:true present');
  assert.ok(!/send automatically/i.test(HTML), 'positive "send automatically" phrase present');
  assert.ok(!/outreach sent\b/i.test(HTML), 'positive "outreach sent" phrase present');
  assert.ok(!/capability statement sent/i.test(HTML), 'positive "capability statement sent" phrase present');
  assert.ok(!/partner outreach sent/i.test(HTML), 'positive "partner outreach sent" phrase present');
});

// 20. No auto-submit behavior exists.
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto[-_]submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
  assert.ok(!/Export and submit/i.test(HTML), 'positive "Export and submit" phrase present');
  // No positive "package submitted / bid submitted / quote submitted / government response submitted / portal upload"
  for (const re of [
    /package submitted\b/i,
    /bid submitted\b/i,
    /quote submitted\b/i,
    /government response submitted\b/i,
    /upload to SAM/i,
    /upload to PIEE/i,
    /upload to eBuy/i,
    /upload to GSA/i,
    /portal upload (?:completed|done|sent|enabled|in progress|ready)/i
  ]) {
    assert.ok(!re.test(HTML), 'forbidden positive phrase present: ' + re);
  }
  // The NEGATED safety phrase "No portal upload." must remain.
  assert.ok(/No portal upload\./.test(HTML),
    'expected negated "No portal upload." safety microcopy missing');
});

// 21. No fake submitted status exists by default.
test('no fake submitted / completed status by default', () => {
  // Default Final Package Status reads "No package prepared".
  assert.ok(/id="gc-sub-package-status"[^>]*>No package prepared</.test(HTML),
    'default Final Package Status should render "No package prepared"');
  // The preview container default shows the no-package-preview empty state.
  assert.ok(/id="gc-pkg-preview"[\s\S]*?No package preview generated yet/.test(HTML),
    'gc-pkg-preview should render the no-preview empty state by default');
});

// 22. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 23. Phase 22B Capture Command Center remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 24. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  for (const id of ['gc-sol-summary','gc-sol-section-l','gc-sol-section-m','gc-sol-pws','gc-sol-forms','gc-sol-deadlines','gc-sol-risks','gc-sol-matrix-table','gc-sol-matrix-body']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 25. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
  for (const id of ['gc-vqr-intake-form','gc-vqr-table','gc-pr-out-price','gc-pr-out-margin','gc-pr-quote-compare-table','gc-pr-margin-warn','gc-pr-missing-warn']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22D anchor missing: ' + id);
  }
});

// 26. Phase 22E Past Performance / Capability / Prime Partner remains.
test('Phase 22E Past Performance + Capability + Prime Partner remains intact', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf', 'gc-pp-intake-form', 'gc-cs-outline', 'gc-ppf-intake-form', 'gc-pp-tbody', 'gc-ppf-tbody']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22E anchor missing: ' + id);
  }
});

// 27. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML), 'Response Desk no-send copy missing');
});

// 28. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 29. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 6, 'expected ≥6 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 30. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22F govcon-submission-readiness checks ===\n`);
process.exit(failed ? 1 : 0);

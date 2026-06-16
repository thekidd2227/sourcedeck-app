/**
 * Phase 22E — Past Performance Library + Capability Statement Studio +
 * Prime Partner Finder regression test.
 *
 * Asserts the three new buyer-facing surfaces exist in sourcedeck.html
 * with manual intake fields, required statuses, advisory/no-send copy,
 * and empty-state defaults. Confirms previously merged invariants still
 * intact: Phase 22B Capture Command Center, Phase 22C Solicitation
 * Workspace, Phase 22D Vendor Quote Room + Pricing Worksheet, Response
 * Desk Import Email + no Send Email, SAM Sprint Free=1 NAICS, System
 * Readiness/Flow remains removed, .btn-gold guard, every inline <script>
 * block still parses (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-past-performance-prime.test.js
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

console.log('\n=== Phase 22E — Past Performance + Capability Statement + Prime Partner Finder ===\n');

// 1. Past Performance Library exists.
test('Past Performance Library section exists', () => {
  assert.ok(/id="gc-pp"/.test(HTML), 'gc-pp section id missing');
  assert.ok(/Past Performance Library/.test(HTML), 'Past Performance Library title missing');
  assert.ok(/data-section="govcon-past-performance-library"/.test(HTML), 'data-section anchor missing');
});

// 2. Past performance manual fields exist.
test('past performance manual intake fields exist', () => {
  assert.ok(/id="gc-pp-intake-form"/.test(HTML), 'pp intake form missing');
  for (const f of [
    'gc-pp-f-title', 'gc-pp-f-agency', 'gc-pp-f-naics', 'gc-pp-f-contract',
    'gc-pp-f-pop', 'gc-pp-f-value', 'gc-pp-f-role', 'gc-pp-f-scope',
    'gc-pp-f-tags', 'gc-pp-f-cpars', 'gc-pp-f-evidence'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'pp field missing: ' + f);
  }
  // Role dropdown values
  for (const role of ['Prime', 'Sub', 'Teaming Partner']) {
    assert.ok(new RegExp('<option[^>]*value="' + role + '"').test(HTML),
      'role option missing: ' + role);
  }
});

// 3. Past performance empty state exists.
test('past performance empty state copy exists', () => {
  assert.ok(/No past performance records added yet\. Add relevant projects manually\./.test(HTML),
    'past performance empty-state copy missing');
  assert.ok(/Past performance suggestions are advisory and must be reviewed before proposal use/.test(HTML),
    'past performance advisory copy missing');
});

// 4. Capability Statement Studio exists.
test('Capability Statement Studio section exists', () => {
  assert.ok(/id="gc-cs"/.test(HTML), 'gc-cs section id missing');
  assert.ok(/Capability Statement Studio/.test(HTML), 'Capability Statement Studio title missing');
  assert.ok(/data-section="govcon-capability-statement-studio"/.test(HTML), 'data-section anchor missing');
});

// 5. Capability statement fields exist.
test('capability statement fields exist', () => {
  for (const f of [
    'gc-cs-f-agency', 'gc-cs-f-sol', 'gc-cs-f-naics', 'gc-cs-f-certs',
    'gc-cs-f-core', 'gc-cs-f-diff', 'gc-cs-f-pp-select'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'cs field missing: ' + f);
  }
  assert.ok(/id="gc-cs-outline"/.test(HTML), 'cs outline container missing');
  // Phase 25V — "Build Capability Statement Outline (draft)" renamed to
  // "Build Capability Statement"; output renamed to Capability Statement Preview.
  assert.ok(/Build Capability Statement</.test(HTML), 'cs build button missing');
});

// 6. Capability statement draft/human review copy exists.
test('"Capability statement output is a draft. Review before sending." copy exists', () => {
  assert.ok(/Capability statement output is a draft\. Review before sending\./.test(HTML),
    'capability-statement draft+review copy missing');
});

// 7. "SourceDeck does not send capability statements or outreach" copy exists.
test('"SourceDeck does not send capability statements or outreach" copy exists', () => {
  const matches = HTML.match(/SourceDeck does not send capability statements or outreach/g) || [];
  assert.ok(matches.length >= 2, 'expected ≥2 "SourceDeck does not send capability statements or outreach" mentions; found ' + matches.length);
});

// 8. Prime Partner Finder exists.
test('Prime Partner Finder section exists', () => {
  assert.ok(/id="gc-ppf"/.test(HTML), 'gc-ppf section id missing');
  assert.ok(/Prime Partner Finder/.test(HTML), 'Prime Partner Finder title missing');
  assert.ok(/data-section="govcon-prime-partner-finder"/.test(HTML), 'data-section anchor missing');
});

// 9. Prime partner fields exist.
test('prime partner manual intake fields exist', () => {
  assert.ok(/id="gc-ppf-intake-form"/.test(HTML), 'ppf intake form missing');
  for (const f of [
    'gc-ppf-f-naics', 'gc-ppf-f-agency', 'gc-ppf-f-location',
    'gc-ppf-f-prime', 'gc-ppf-f-status', 'gc-ppf-f-fit',
    'gc-ppf-f-contact', 'gc-ppf-f-angle'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'ppf field missing: ' + f);
  }
});

// 10. Partner status dropdown includes all required statuses.
test('partner status dropdown includes Research / Shortlist / Contacted manually / Interested / Not a fit / Follow up later', () => {
  for (const s of ['Research', 'Shortlist', 'Contacted manually', 'Interested', 'Not a fit', 'Follow up later']) {
    assert.ok(new RegExp('<option[^>]*value="' + s + '"').test(HTML),
      'partner status option missing: ' + s);
  }
});

// 11. "Partner outreach is not sent from SourceDeck" copy exists.
test('"Partner outreach is not sent from SourceDeck" copy exists', () => {
  const matches = HTML.match(/Partner outreach is not sent from SourceDeck/g) || [];
  assert.ok(matches.length >= 1, '"Partner outreach is not sent from SourceDeck" copy missing');
  // The "Contacted manually means..." explanation must be present.
  assert.ok(/"Contacted manually" means the user records outside activity/i.test(HTML) ||
            /Contacted manually means the user records outside activity/i.test(HTML),
    '"Contacted manually means the user records outside activity" copy missing');
});

// 12. No fake past performance rows exist by default.
test('past performance table renders empty-state by default (no fake rows)', () => {
  assert.ok(/id="gc-pp-tbody"[\s\S]*?No past performance records added yet/.test(HTML),
    'past performance tbody should render empty state by default');
  // No hardcoded fake project titles / agencies / contract numbers within the section.
  const slice = HTML.split(/data-section="govcon-past-performance-library"/)[1] || '';
  const end = slice.indexOf('</section>');
  const block = end > -1 ? slice.slice(0, end) : slice;
  for (const fake of [/W912DY-26-R-\d+/, /SP4701-26-R-\d+/, /Department of (?:the )?(?:Army|Navy|Air Force)/i]) {
    const m = block.match(fake) || [];
    const placeholderHits = (block.match(new RegExp('placeholder="[^"]*' + fake.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) || []).length;
    assert.strictEqual(m.length, placeholderHits,
      'fake past performance marker present outside placeholder context: ' + fake);
  }
});

// 13. No fake prime partner rows exist by default.
test('prime partner table renders empty-state by default (no fake rows)', () => {
  assert.ok(/id="gc-ppf-tbody"[\s\S]*?No prime partner rows added yet/.test(HTML),
    'prime partner tbody should render empty state by default');
  // No hardcoded fake prime names in the Prime Partner Finder section block.
  const slice = HTML.split(/data-section="govcon-prime-partner-finder"/)[1] || '';
  const end = slice.indexOf('</section>');
  const block = end > -1 ? slice.slice(0, end) : slice;
  for (const fake of [/Lockheed Martin/i, /Northrop Grumman/i, /Booz Allen/i, /Raytheon/i, /General Dynamics/i]) {
    const m = block.match(fake) || [];
    assert.strictEqual(m.length, 0, 'fake prime partner name present: ' + fake);
  }
});

// 14. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 15. No auto-send behavior exists.
test('no positive auto-send copy or behavior', () => {
  assert.ok(!/auto_send\s*[:=]\s*true/i.test(HTML), 'auto_send:true present');
  assert.ok(!/send automatically/i.test(HTML), 'positive "send automatically" phrase present');
  assert.ok(!/capability statement sent/i.test(HTML), 'positive "capability statement sent" phrase present');
  assert.ok(!/partner outreach sent/i.test(HTML), 'positive "partner outreach sent" phrase present');
  assert.ok(!/teaming outreach sent/i.test(HTML), 'positive "teaming outreach sent" phrase present');
  // Negated safety phrasing must be present.
  assert.ok(/does not send capability statements or outreach/i.test(HTML),
    'expected negated "does not send capability statements or outreach" copy missing');
  assert.ok(/Partner outreach is not sent from SourceDeck/i.test(HTML),
    'expected negated "Partner outreach is not sent from SourceDeck" copy missing');
});

// 16. No auto-submit behavior exists.
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto[-_]submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
});

// 17. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 18. Phase 22B Capture Command Center remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  assert.ok(/GovCon Capture Command Center/.test(HTML), 'Capture Command Center title missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 19. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Workspace remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  assert.ok(/Solicitation Workspace/.test(HTML), 'Solicitation Workspace title missing');
  for (const id of ['gc-sol-summary','gc-sol-section-l','gc-sol-section-m','gc-sol-pws','gc-sol-forms','gc-sol-deadlines','gc-sol-risks','gc-sol-matrix-table','gc-sol-matrix-body']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 20. Phase 22D Vendor Quote Room + Pricing Worksheet remains.
test('Phase 22D Vendor Quote Room + Pricing Worksheet remains intact', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room section missing');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet section missing');
  assert.ok(/Vendor Quote Room/.test(HTML), 'Vendor Quote Room title missing');
  assert.ok(/Pricing Worksheet/.test(HTML), 'Pricing Worksheet title missing');
  for (const id of ['gc-vqr-intake-form','gc-vqr-table','gc-pr-out-price','gc-pr-out-margin','gc-pr-quote-compare-table','gc-pr-margin-warn','gc-pr-missing-warn']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 22D anchor missing: ' + id);
  }
});

// 21. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML),
    'Response Desk no-send copy missing');
});

// 22. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 23. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 5, 'expected ≥5 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 24. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22E govcon-past-performance-prime checks ===\n`);
process.exit(failed ? 1 : 0);

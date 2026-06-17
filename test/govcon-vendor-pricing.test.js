/**
 * Phase 22D — Vendor Quote Room + Pricing Worksheet regression test.
 *
 * Asserts the Vendor Quote Room + Pricing Worksheet surfaces exist in
 * sourcedeck.html with the manual intake fields, status dropdown, credential
 * checklist, pricing fields, quote comparison table, margin warning surface,
 * and required safety copy ("SourceDeck does not submit bids or quotes",
 * "no vendor outreach is sent from SourceDeck", "human approval required").
 * Confirms previously merged invariants are still intact: Phase 22B Capture
 * Command Center, Phase 22C Solicitation Workspace, Response Desk Import
 * Email + no Send Email, SAM Sprint Free=1 NAICS, System Readiness/Flow
 * remains removed, .btn-gold guard, every inline <script> block still
 * parses (renderer boot guard).
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-vendor-pricing.test.js
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

console.log('\n=== Phase 22D — Vendor Quote Room + Pricing Worksheet ===\n');

// 1. Vendor Quote Room exists.
test('Vendor Quote Room section exists', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'gc-vqr section id missing');
  assert.ok(/Vendor Quote Room/.test(HTML), 'Vendor Quote Room title missing');
  assert.ok(/data-section="govcon-vendor-quote-room"/.test(HTML), 'data-section anchor missing');
});

// 2. Vendor/subcontractor needs panel exists.
test('Vendor / Subcontractor Needs panel exists', () => {
  assert.ok(/data-vqr="needs"/.test(HTML), 'needs card missing');
  assert.ok(/Vendor \/ Subcontractor Needs/.test(HTML), 'Vendor / Subcontractor Needs title missing');
  assert.ok(/id="gc-vqr-needs-count"/.test(HTML), 'gc-vqr-needs-count missing');
  assert.ok(/id="gc-vqr-needs-empty"/.test(HTML), 'gc-vqr-needs-empty missing');
  assert.ok(/No vendor quote needs added yet\. Add a required trade, service, or supplier manually\./.test(HTML),
    'needs empty-state copy missing');
});

// 3. Vendor manual fields exist.
test('vendor manual intake fields exist', () => {
  assert.ok(/id="gc-vqr-intake-form"/.test(HTML), 'vendor intake form missing');
  for (const f of [
    'gc-vqr-f-category', 'gc-vqr-f-vendor', 'gc-vqr-f-contact',
    'gc-vqr-f-email', 'gc-vqr-f-phone', 'gc-vqr-f-amount',
    'gc-vqr-f-status', 'gc-vqr-f-cert-notes', 'gc-vqr-f-risk-notes'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'vendor intake field missing: ' + f);
  }
});

// 4. Quote status dropdown includes all required statuses.
test('quote status dropdown includes Needed / Requested manually / Received / Missing / Expired / Excluded', () => {
  for (const s of ['Needed', 'Requested manually', 'Received', 'Missing', 'Expired', 'Excluded']) {
    assert.ok(new RegExp('<option[^>]*value="' + s + '"').test(HTML),
      'quote status option missing: ' + s);
  }
});

// 5. Credential checklist exists.
test('credential checklist fields exist', () => {
  for (const c of [
    'gc-vqr-f-cred-license', 'gc-vqr-f-cred-insurance',
    'gc-vqr-f-cred-bonding', 'gc-vqr-f-cred-w9',
    'gc-vqr-f-cred-sam', 'gc-vqr-f-cred-cage',
    'gc-vqr-f-cred-clearance'
  ]) {
    assert.ok(new RegExp('id="' + c + '"').test(HTML), 'credential checkbox missing: ' + c);
  }
  assert.ok(/Credential checklist/.test(HTML), 'credential checklist label missing');
});

// 6. Human approval required copy exists.
test('human approval required copy exists across Phase 22D surface', () => {
  const matches = HTML.match(/human (?:review|approval) (?:required|still required)/gi) || [];
  assert.ok(matches.length >= 4, 'expected ≥4 human review/approval required mentions; found ' + matches.length);
  assert.ok(/Human Review Required/.test(HTML), 'Human Review Required label missing');
});

// 7. "No vendor outreach is sent from SourceDeck" copy exists.
test('"No quote requests are sent from SourceDeck. Vendor outreach requires human approval." copy exists', () => {
  assert.ok(/No quote requests are sent from SourceDeck\. Vendor outreach requires human approval\./.test(HTML),
    'no-quote-requests-sent copy missing');
  assert.ok(/SourceDeck does not send vendor outreach/.test(HTML),
    '"SourceDeck does not send vendor outreach" copy missing');
});

// 8. Pricing Worksheet exists.
test('Pricing Worksheet section exists', () => {
  assert.ok(/id="gc-pricing"/.test(HTML), 'gc-pricing section id missing');
  assert.ok(/Pricing Worksheet/.test(HTML), 'Pricing Worksheet title missing');
  assert.ok(/data-section="govcon-pricing-worksheet"/.test(HTML), 'data-section anchor missing');
});

// 9. Pricing fields exist.
test('pricing fields exist (labor, materials, vendor, travel, equipment, overhead, profit, contingency)', () => {
  for (const f of [
    'gc-pr-f-labor', 'gc-pr-f-materials', 'gc-pr-f-vendor', 'gc-pr-f-travel',
    'gc-pr-f-equipment', 'gc-pr-f-overhead', 'gc-pr-f-profit', 'gc-pr-f-contingency'
  ]) {
    assert.ok(new RegExp('id="' + f + '"').test(HTML), 'pricing field missing: ' + f);
  }
  assert.ok(/id="gc-pr-out-price"/.test(HTML), 'estimated price output missing');
  assert.ok(/id="gc-pr-out-margin"/.test(HTML), 'estimated margin output missing');
  assert.ok(/id="gc-pr-assumptions"/.test(HTML), 'pricing assumptions textarea missing');
});

// 10. Quote comparison table exists.
test('Quote comparison table exists', () => {
  assert.ok(/id="gc-pr-quote-compare-table"/.test(HTML), 'quote comparison table missing');
  assert.ok(/id="gc-pr-quote-compare-tbody"/.test(HTML), 'quote comparison tbody missing');
  assert.ok(/Quote Comparison/.test(HTML), 'Quote Comparison title missing');
});

// 11. Margin warning surface exists.
test('margin warning + missing-cost warning surfaces exist', () => {
  assert.ok(/id="gc-pr-margin-warn"/.test(HTML), 'margin warning surface missing');
  assert.ok(/id="gc-pr-missing-warn"/.test(HTML), 'missing-cost warning surface missing');
});

// 12. Pricing advisory copy exists.
test('"Pricing output is advisory and must be reviewed before bid submission." copy exists', () => {
  assert.ok(/Pricing output is advisory and must be reviewed before bid submission\./.test(HTML),
    'pricing advisory copy missing');
});

// 13. "SourceDeck does not submit bids or quotes" copy exists.
test('"SourceDeck does not submit bids or quotes" copy exists in pricing area', () => {
  const matches = HTML.match(/SourceDeck does not submit bids or quotes/g) || [];
  assert.ok(matches.length >= 2, 'expected ≥2 "SourceDeck does not submit bids or quotes" mentions; found ' + matches.length);
});

// 14. No fake vendor quote rows exist by default.
test('vendor quotes table renders empty-state by default (no fake rows)', () => {
  assert.ok(/id="gc-vqr-tbody"[\s\S]*?No vendor quote needs added yet/.test(HTML),
    'vendor quotes tbody should render empty state by default');
  // No hardcoded vendor names.
  const slice = HTML.split(/data-section="govcon-vendor-quote-room"/)[1] || '';
  const end = slice.indexOf('</section>');
  const block = end > -1 ? slice.slice(0, end) : slice;
  for (const fake of [/Acme Trade Services LLC/, /Jane Operator/]) {
    const m = block.match(fake) || [];
    const placeholderHits = (block.match(new RegExp('placeholder="[^"]*' + fake.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) || []).length;
    assert.strictEqual(m.length, placeholderHits,
      'fake vendor identifier present outside placeholder context: ' + fake);
  }
});

// 15. No fake pricing rows exist by default.
test('quote comparison table renders empty-state by default (no fake pricing rows)', () => {
  assert.ok(/id="gc-pr-quote-compare-tbody"[\s\S]*?No vendor quotes received yet\. Add manual quote entries above to compare\./.test(HTML),
    'quote comparison tbody should render empty state by default');
  // Default outputs must be $0.00 / —
  assert.ok(/id="gc-pr-out-price"[^>]*>\$0\.00</.test(HTML), 'estimated price default should render $0.00');
  assert.ok(/id="gc-pr-out-margin"[^>]*>—</.test(HTML), 'estimated margin default should render em-dash');
});

// 16. No Send Email button exists.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a Send Email button is present');
  assert.ok(!/onclick="sendEmail\b/i.test(HTML), 'a sendEmail() onclick is wired');
});

// 17. No auto-send behavior exists.
test('no positive auto-send copy or behavior', () => {
  assert.ok(!/auto_send\s*[:=]\s*true/i.test(HTML), 'auto_send:true present');
  assert.ok(!/send automatically/i.test(HTML), 'positive "send automatically" phrase present');
  assert.ok(!/quote request sent/i.test(HTML), 'positive "quote request sent" phrase present');
  assert.ok(!/vendor outreach sent/i.test(HTML), 'positive "vendor outreach sent" phrase present');
  // Negated safety phrasing must be present.
  assert.ok(/does not send vendor outreach/i.test(HTML),
    'expected negated "does not send vendor outreach" safety copy missing');
});

// 18. No auto-submit behavior exists.
test('no positive auto-submit copy or behavior', () => {
  assert.ok(!/auto[-_]submit\s*[:=]\s*true/i.test(HTML), 'auto-submit:true present');
  assert.ok(!/submit automatically/i.test(HTML), 'positive "submit automatically" phrase present');
  assert.ok(/does not submit bids or quotes/i.test(HTML),
    'expected negated "does not submit bids or quotes" safety copy missing');
});

// 19. System Readiness / System Flow remains removed.
test('System Readiness / System Flow tab remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
  assert.ok(!/brief-head">\s*System Readiness\s*</.test(HTML), 'System Readiness pane title reintroduced');
});

// 20. Phase 22B Capture Command Center remains.
test('Phase 22B GovCon Capture Command Center remains intact', () => {
  assert.ok(/id="gc-capture-cc"/.test(HTML), 'Capture Command Center section missing');
  assert.ok(/GovCon Capture Command Center/.test(HTML), 'Capture Command Center title missing');
  for (const id of ['gc-cc-active-count','gc-cc-deadlines-count','gc-cc-qa-count','gc-cc-bidnobid-count','gc-cc-solready-count','gc-cc-vendor-count','gc-cc-proposal-count','gc-cc-approval-count']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CC card missing: ' + id);
  }
});

// 21. Phase 22C Solicitation Workspace remains.
test('Phase 22C Solicitation Center remains intact', () => {
  assert.ok(/id="gc-sol-workspace"/.test(HTML), 'Solicitation Workspace section missing');
  assert.ok(/Solicitation Center/.test(HTML), 'Solicitation Center title missing');
  for (const id of ['gc-sol-summary','gc-sol-section-l','gc-sol-section-m','gc-sol-pws','gc-sol-forms','gc-sol-deadlines','gc-sol-risks','gc-sol-matrix-table','gc-sol-matrix-body']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Solicitation Workspace anchor missing: ' + id);
  }
});

// 22. Response Desk Import Email remains.
test('Response Desk Import Email control remains intact', () => {
  assert.ok(/Import Email/.test(HTML), 'Import Email control missing');
  assert.ok(/Response Desk/.test(HTML), 'Response Desk label missing');
  assert.ok(/never auto-sends, never auto-submits/.test(HTML),
    'Response Desk no-send copy missing');
});

// 23. SAM Sprint Free=1 NAICS remains.
test('SAM Sprint Free=1 NAICS copy remains', () => {
  assert.ok(/Free users: 1 NAICS/.test(HTML), 'Free=1 NAICS copy missing');
});

// 24. Renderer boot still passes.
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 4, 'expected ≥4 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 25. .btn-gold guard remains.
test('Phase 20G .btn-gold guard preserved', () => {
  assert.ok(/Phase 20G guard/.test(HTML), 'Phase 20G guard comment missing');
  assert.ok(/\.btn-gold\b/.test(HTML), '.btn-gold rule missing');
  assert.ok(/linear-gradient\(135deg,#f3d684,#d4a843\)/.test(HTML),
    'Phase 20G cool-gold gradient missing');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 22D govcon-vendor-pricing checks ===\n`);
process.exit(failed ? 1 : 0);

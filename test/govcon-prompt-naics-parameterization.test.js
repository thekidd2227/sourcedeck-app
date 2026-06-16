/**
 * Phase 24C-2 — AI Prompt-Builder NAICS Parameterization regression test.
 *
 * Asserts that:
 *   1. The legacy operator-specific NAICS bullet list (`- 531311 …
 *      Residential Property Managers` etc.) is no longer present as
 *      active prompt-builder scaffolding inside any inline <script>
 *      template literal in sourcedeck.html.
 *   2. The new helper gcPromptNaicsContext() is wired into both
 *      previously-duplicated prompt-builder template literals via the
 *      `${gcPromptNaicsContext()}` substitution.
 *   3. gcPromptNaicsContext() returns the neutral fallback phrase
 *      "the configured target NAICS categories" when the runtime
 *      profile cache (window.APPROVED_NAICS) is empty, and renders a
 *      deduplicated bulleted list when the cache is populated.
 *   4. The prompt-builder still carries GovCon targeting context
 *      (the "COMMERCIAL TARGETING DISCIPLINE" header + "NAICS
 *      TARGETING RULES (BINDING)" header).
 *   5. The prompt-builder still carries a human-review boundary
 *      (the existing "fewer real leads beats more fabricated leads"
 *      / "downstream validation will hard-reject" / "EXCLUDE" rule
 *      scaffold remains).
 *   6. The prompt-builder never instructs the model to Send Email,
 *      Submit Bid, Submit Quote, "Export and submit", or upload to
 *      SAM / PIEE / eBuy / GSA portals (positive claim).
 *   7. System Readiness / System Flow removal preserved.
 *   8. Phase 24B Audit Log panel preserved.
 *   9. Phase 24C profile-driven NAICS dropdown preserved.
 *  10. Phase 24D Past Performance / Capability Statement surfaces
 *      preserved.
 *  11. Phase 24E Stakeholder Graph surface preserved.
 *  12. Renderer boot guard: every inline <script> still parses.
 *  13. Deprecated $79 / $349 / $999 pricing not reintroduced as
 *      active app UI.
 *
 * Synthetic-fixture comparison: the test evaluates the prompt-builder
 * helper twice with mocked APPROVED_NAICS cache states (populated vs
 * empty) to verify the prompt context substitution is profile-driven
 * and falls back to the neutral phrase when the profile is empty.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network. Synthetic data only.
 *
 * Run:  node test/govcon-prompt-naics-parameterization.test.js
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

console.log('\n=== Phase 24C-2 — Prompt NAICS Parameterization ===\n');

// 1. Legacy operator-specific NAICS bullet list is not present as active prompt copy.
test('legacy operator-specific NAICS bullet list is removed from active prompt scaffolding', () => {
  const legacyBlocks = [
    /- 531311 — Residential Property Managers/,
    /- 531312 — Nonresidential Property Managers/,
    /- 238220 — Plumbing, Heating, and Air-Conditioning Contractors/,
    /- 561720 — Janitorial Services/,
    /- 561320 — Temporary Help Services/
  ];
  for (const re of legacyBlocks) {
    assert.ok(!re.test(HTML),
      'legacy operator-specific NAICS bullet still present in active prompt copy: ' + re);
  }
});

// 2. gcPromptNaicsContext() helper exists and is wired into both prompt blocks.
test('gcPromptNaicsContext() helper exists and is exposed on window', () => {
  assert.ok(/function\s+gcPromptNaicsContext\s*\(/.test(HTML),
    'gcPromptNaicsContext function definition missing');
  assert.ok(/window\.gcPromptNaicsContext\s*=\s*gcPromptNaicsContext/.test(HTML),
    'gcPromptNaicsContext must be exposed on window');
});

test('${gcPromptNaicsContext()} substitution appears in both prompt-builder template literals', () => {
  const subs = (HTML.match(/\$\{gcPromptNaicsContext\(\)\}/g) || []).length;
  assert.strictEqual(subs, 2,
    'expected exactly 2 ${gcPromptNaicsContext()} substitutions (one per prompt block); found ' + subs);
});

// 3. Synthetic fixture comparison — eval the helper with mocked APPROVED_NAICS.
test('gcPromptNaicsContext() returns neutral fallback when APPROVED_NAICS is empty', () => {
  // Extract the helper body and exercise it in an isolated VM context.
  const helper = HTML.match(/function\s+gcPromptNaicsContext\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(helper, 'gcPromptNaicsContext source not found');
  const ctx = { window: { APPROVED_NAICS: [] }, Array: Array, Set: Set, String: String };
  vm.createContext(ctx);
  vm.runInContext(helper[0] + '\nout = gcPromptNaicsContext();', ctx);
  assert.strictEqual(ctx.out, 'the configured target NAICS categories',
    'empty-profile fallback must be the neutral phrase');
});

test('gcPromptNaicsContext() renders deduplicated bullet list when APPROVED_NAICS is populated', () => {
  const helper = HTML.match(/function\s+gcPromptNaicsContext\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  const ctx = {
    window: { APPROVED_NAICS: ['541512', '541611', '541512', ' 561210 ', ''] },
    Array: Array, Set: Set, String: String
  };
  vm.createContext(ctx);
  vm.runInContext(helper[0] + '\nout = gcPromptNaicsContext();', ctx);
  // Deduplicated, trimmed, blank-stripped.
  assert.strictEqual(ctx.out, '- 541512\n- 541611\n- 561210',
    'populated-profile output must be a deduplicated, trimmed, bulleted list');
});

// 4. Prompt-builder still carries GovCon targeting context.
test('prompt-builder still carries GovCon targeting context headers', () => {
  assert.ok(/COMMERCIAL TARGETING DISCIPLINE — APPROVED NAICS \/ SERVICE CLUSTERS \(BINDING\)/.test(HTML),
    'COMMERCIAL TARGETING DISCIPLINE header missing from prompt scaffolding');
  assert.ok(/NAICS TARGETING RULES \(BINDING\):/.test(HTML),
    'NAICS TARGETING RULES (BINDING) header missing from prompt scaffolding');
  assert.ok(/PREFER — a candidate business MUST clearly map to one of the configured NAICS/.test(HTML),
    'PREFER rule wording missing or still mentions "approved" instead of "configured"');
});

// 5. Prompt-builder still carries human-review boundary.
test('prompt-builder still carries verification / human-review boundary', () => {
  assert.ok(/VERIFICATION STANDARD — EVERY LEAD MUST PASS/.test(HTML),
    'verification standard header missing');
  assert.ok(/Fewer real leads beats more fabricated leads/i.test(HTML),
    'human-review boundary copy missing');
  assert.ok(/EXCLUDE the lead entirely/i.test(HTML),
    'human-review exclusion rule missing');
});

// 6. No autonomous-action prompts.
test('prompt-builder does not instruct Send Email / Submit Bid / Submit Quote / Export and submit / portal-upload', () => {
  // Locate the prompt-builder slices (between "COMMERCIAL TARGETING DISCIPLINE"
  // and the corresponding closing backtick template-literal boundary).
  const promptIndices = [];
  let from = 0, idx;
  const headerRe = /COMMERCIAL TARGETING DISCIPLINE — APPROVED NAICS/g;
  while ((idx = headerRe.exec(HTML)) !== null) promptIndices.push(idx.index);
  assert.ok(promptIndices.length >= 2, 'expected ≥2 prompt-builder headers; found ' + promptIndices.length);
  // Take a generous 8 KB window after each header for prompt-body scan.
  for (const start of promptIndices) {
    const slice = HTML.slice(start, start + 8000);
    // Positive-only check — the renderer overall has "no Send Email" guards;
    // here we just check the prompt body itself never instructs autonomous action.
    function assertNoPositiveInstruction(re, label) {
      const lines = slice.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!re.test(line)) continue;
        const context = [lines[i - 1] || '', line].join(' ');
        const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot|forbidden)\b/i.test(context);
        assert.ok(guard, 'prompt-builder contains unguarded "' + label + '" instruction: ' + line.trim());
      }
    }
    assertNoPositiveInstruction(/Send Email/i,                'Send Email');
    assertNoPositiveInstruction(/Submit Bid/i,                'Submit Bid');
    assertNoPositiveInstruction(/Submit Quote/i,              'Submit Quote');
    assertNoPositiveInstruction(/Export and submit/i,         'Export and submit');
    assertNoPositiveInstruction(/upload to SAM/i,             'upload to SAM');
    assertNoPositiveInstruction(/upload to PIEE/i,            'upload to PIEE');
    assertNoPositiveInstruction(/upload to eBuy/i,            'upload to eBuy');
    assertNoPositiveInstruction(/upload to GSA/i,             'upload to GSA');
  }
});

// 7. System Readiness / System Flow remains removed.
test('System Readiness / System Flow remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
});

// 8-11. Surfaces preserved.
test('Phase 24B Audit Log panel preserved', () => {
  assert.ok(/id="gc-audit-log"/.test(HTML), '#gc-audit-log missing');
  assert.ok(/id="gc-audit-list"/.test(HTML), '#gc-audit-list missing');
  assert.ok(/function gcAuditRefresh\b/.test(HTML), 'gcAuditRefresh function missing');
});

test('Phase 24C profile-driven NAICS dropdown preserved', () => {
  assert.ok(/let\s+APPROVED_NAICS\s*=\s*\[\s*\]/.test(HTML),
    'APPROVED_NAICS empty-default declaration missing');
  assert.ok(/function\s+gcRenderNaicsFilter\s*\(/.test(HTML),
    'gcRenderNaicsFilter function missing');
  assert.ok(/async\s+function\s+gcLoadTargetingNaics\s*\(/.test(HTML),
    'gcLoadTargetingNaics function missing');
});

test('Phase 24D Past Performance / Capability Statement surfaces preserved', () => {
  for (const id of ['gc-pp', 'gc-cs', 'gc-ppf']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Phase 24D anchor missing: ' + id);
  }
});

test('Phase 25V — Stakeholder Graph surface removed from runtime', () => {
  // Phase 24E added a Stakeholder Graph; Phase 25V retired it as unhelpful
  // clutter. The runtime UI must no longer surface it.
  assert.ok(!/id="gc-stakeholder-graph"/.test(HTML), '#gc-stakeholder-graph must be removed');
  assert.ok(!/id="gc-stakeholder-by-opportunity"/.test(HTML),
    '#gc-stakeholder-by-opportunity must be removed');
  assert.ok(!/id="gc-stakeholder-internal-owner"/.test(HTML),
    '#gc-stakeholder-internal-owner must be removed');
});

// 12. Renderer boot guard.
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

// 13. Deprecated $79 / $349 / $999 active app UI pricing not reintroduced.
test('deprecated $79 / $349 / $999 pricing is not reintroduced as active app UI', () => {
  // Scope: scan only buyer-visible HTML (the rendered tab panes). Pricing
  // doc references in source-of-truth and historical audit docs are
  // separately verified by the project-wide safety grep.
  const PANES = HTML.match(/<div class="tab-pane[\s\S]*?<\/div>\s*<\/section>/g) || [];
  const sample = PANES.join('\n');
  for (const re of [/\$79\b/, /\$349\b/, /\$999\b/]) {
    assert.ok(!re.test(sample),
      'deprecated active-UI pricing copy reintroduced: ' + re);
  }
});

// Wired into npm test chain.
test('test wired into npm test chain (package.json)', () => {
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  assert.ok(/govcon-prompt-naics-parameterization\.test\.js/.test(pkg),
    'test/govcon-prompt-naics-parameterization.test.js not wired into npm test');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24C-2 prompt-naics-parameterization checks ===\n`);
process.exit(failed ? 1 : 0);

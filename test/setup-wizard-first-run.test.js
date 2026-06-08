/**
 * Phase 24K — First-Run Setup Wizard + New Profile Onboarding Gate.
 *
 * Asserts the wizard contract:
 *   - 11 steps with explicit data-step="1..11"
 *   - new Step 1: Welcome / What SourceDeck does
 *   - new Step 10: Quick Setup Tour (15 features + video placeholder)
 *   - new Step 11: Finish + Final Confirmation checklist
 *   - persistent setup-complete state via localStorage
 *   - cold-launch auto-open via DOMContentLoaded
 *   - Settings "Run Setup Wizard" reopen button
 *   - SAM.gov API key in wizard AND in Settings; NOT on SAM search screen
 *   - all 15 named features covered in the Quick Setup Tour
 *   - 5 verbatim Final Confirmation checkboxes
 *   - no Send Email / Submit Bid / Submit Quote / Export-and-submit
 *   - System Readiness / sysflow removal preserved
 *   - deprecated $79 / $349 / $999 not in active app UI
 *   - renderer boot guard
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network. Synthetic data only.
 *
 * Run:  node test/setup-wizard-first-run.test.js
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

console.log('\n=== Phase 24K — First-Run Setup Wizard ===\n');

// 1. Wizard exists.
test('GovCon Setup Wizard exists with open/close handlers', () => {
  assert.ok(/id="govcon-wizard"/.test(HTML), '#govcon-wizard modal missing');
  assert.ok(/function openGovconSetupWizard/.test(HTML), 'openGovconSetupWizard missing');
  assert.ok(/function closeGovconSetupWizard/.test(HTML), 'closeGovconSetupWizard missing');
});

// 2. First-run / missing-setup-complete trigger.
test('first-run gate via gcMaybeAutoOpenWizard + DOMContentLoaded', () => {
  assert.ok(/function\s+gcMaybeAutoOpenWizard\s*\(/.test(HTML),
    'gcMaybeAutoOpenWizard function missing');
  assert.ok(/window\.gcMaybeAutoOpenWizard\s*=/.test(HTML),
    'gcMaybeAutoOpenWizard not exposed on window');
  assert.ok(/DOMContentLoaded[^}]*gcMaybeAutoOpenWizard/.test(HTML),
    'DOMContentLoaded must trigger gcMaybeAutoOpenWizard on cold launch');
});

// 3. New-profile / profile-aware trigger.
test('new-profile fall-open: profile-complete check + corrupt-state fallback opens wizard', () => {
  const m = HTML.match(/async\s+function\s+gcMaybeAutoOpenWizard\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'gcMaybeAutoOpenWizard body not found');
  const fn = m[0];
  assert.ok(/govconSetupComplete\s*\(/.test(fn),
    'gcMaybeAutoOpenWizard must consult govconSetupComplete()');
  assert.ok(/refreshGovconSetupState/.test(fn),
    'gcMaybeAutoOpenWizard must refresh setup state before deciding');
  assert.ok(/openGovconSetupWizard/.test(fn),
    'gcMaybeAutoOpenWizard must call openGovconSetupWizard on missing setup');
});

// 4. Setup-complete state suppresses auto-open.
test('persistent setup-complete state via localStorage (sd.govcon.setupComplete)', () => {
  assert.ok(/function\s+gcIsSetupComplete\s*\(/.test(HTML),
    'gcIsSetupComplete helper missing');
  assert.ok(/localStorage\.setItem\(\s*['"]sd\.govcon\.setupComplete['"]\s*,\s*['"]1['"]/.test(HTML),
    'gcWizFinish must persist setupComplete=1');
  assert.ok(/localStorage\.getItem\(\s*['"]sd\.govcon\.setupComplete['"]/.test(HTML),
    'gcIsSetupComplete must read sd.govcon.setupComplete from localStorage');
  const fn = HTML.match(/async\s+function\s+gcMaybeAutoOpenWizard\s*\(\s*\)\s*\{[\s\S]*?\n\}/)[0];
  assert.ok(/gcIsSetupComplete\s*\(/.test(fn),
    'gcMaybeAutoOpenWizard must short-circuit when setupComplete is true');
});

// 5. Reopen from Settings + GovCon nav.
test('Wizard reopen entry points present (Settings + GovCon pane + GovCon command)', () => {
  // Settings → Run Setup Wizard
  assert.ok(/id="s-run-setup-wizard"[^>]*onclick="openGovconSetupWizard\(\)"/.test(HTML),
    'Settings tab must have s-run-setup-wizard button calling openGovconSetupWizard()');
  // The existing GovCon pane "⚙ Setup" button preserved (Phase 24K
  // does not remove existing reopen affordances).
  const matches = (HTML.match(/onclick="openGovconSetupWizard\(\)"/g) || []).length;
  assert.ok(matches >= 3, 'expected ≥3 openGovconSetupWizard() callers (GovCon pane + Settings + Workspace readiness); found ' + matches);
});

// 6. Welcome step (Step 1).
test('Step 1 — Welcome / What SourceDeck does', () => {
  assert.ok(/<div class="gcwiz-step active" data-step="1">/.test(HTML),
    'Step 1 must be the default-active step');
  assert.ok(/Welcome to SourceDeck/.test(HTML),
    '"Welcome to SourceDeck" step heading missing');
  assert.ok(/SourceDeck helps you organize GovCon pursuits from opportunity discovery to internal-review package/.test(HTML),
    'Verbatim Welcome copy missing');
  assert.ok(/You stay in control of every send, upload, submission, and decision\./.test(HTML),
    'Verbatim "you stay in control" copy missing');
});

// 7. Company basics guidance.
test('Step 2 — Business profile preserved with required fields', () => {
  assert.ok(/<div class="gcwiz-step" data-step="2">[\s\S]*?Business profile/.test(HTML),
    'Step 2 (Business profile) anchor missing or out of position');
  for (const id of ['gcwiz-company', 'gcwiz-website', 'gcwiz-bizemail', 'gcwiz-bizphone', 'gcwiz-contactname']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Business field missing: ' + id);
  }
});

// 8. GovCon targeting guidance.
test('Step 4 — GovCon targeting (NAICS, agencies, certifications) preserved', () => {
  assert.ok(/<div class="gcwiz-step" data-step="4">[\s\S]*?GovCon targeting/.test(HTML),
    'Step 4 (GovCon targeting) anchor missing or out of position');
  for (const id of ['gcwiz-certs', 'gcwiz-naics', 'gcwiz-agencies']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Targeting field missing: ' + id);
  }
});

// 9. Concise "what to input" language.
test('Wizard steps include concise "what to input" guidance', () => {
  // The new wording groups general API key guidance:
  assert.ok(/Only add keys for services you plan to use\. You can skip keys now and add them later in Settings\./.test(HTML),
    'General API key "what to input" copy missing');
});

// 10. Concise "why it matters" language.
test('Wizard steps explain why each input matters', () => {
  // Several existing helpers explain rationale; one new SAM-specific
  // line spells out why the key is gathered:
  assert.ok(/SourceDeck uses this key only for authorized SAM\.gov opportunity lookup/.test(HTML),
    'SAM key "why" copy missing');
  assert.ok(/Used as default context for SAM search, outreach, and prime-partner matching/.test(HTML),
    'Targeting "why" copy missing (existing GovCon Targeting help text)');
});

// 11. API keys / integrations step exists.
test('Step 5 — SAM.gov API key + Step 6 — AI agent API key + Step 7 — Creative key', () => {
  assert.ok(/<div class="gcwiz-step" data-step="5">[\s\S]*?SAM\.gov API key/.test(HTML),
    'Step 5 SAM.gov API key missing');
  assert.ok(/<div class="gcwiz-step" data-step="6">[\s\S]*?AI agent API key/.test(HTML),
    'Step 6 AI agent API key missing');
  assert.ok(/<div class="gcwiz-step" data-step="7">[\s\S]*?Creative \/ imaging API key/.test(HTML),
    'Step 7 Creative API key missing');
});

// 12. SAM.gov API key with other API key requests.
test('SAM.gov key wizard input + save adapter present in API-keys group', () => {
  assert.ok(/id="gcwiz-sam"/.test(HTML), 'gcwiz-sam input missing');
  assert.ok(/onclick="gcWizSaveSam\(\)"/.test(HTML), 'gcWizSaveSam handler not wired');
  assert.ok(/credentials\.set\(\s*['"]sam-gov['"]/.test(HTML),
    'wizard must save SAM key via sd.credentials.set("sam-gov", ...)');
});

// 13. Wizard explains SAM key is also available in Settings.
test('Wizard explains SAM.gov API key is also available in Settings', () => {
  assert.ok(/Add your SAM\.gov API key here during setup, or manage it later in Settings/.test(HTML),
    'Verbatim "manage it later in Settings" copy missing for SAM step');
});

// 14. Wizard uses existing credential save pattern.
test('Wizard SAM key save uses sd.credentials.set("sam-gov", ...) main-process boundary', () => {
  // Already covered by #12; this is an alias for the test contract numbering.
  assert.ok(/credentials\.set\(\s*['"]sam-gov['"]/.test(HTML),
    'credential save adapter missing');
});

// 15. Settings contains SAM.gov API key setup/input.
test('Settings tab contains s-samkey input and saveSettings persistence', () => {
  assert.ok(/<input[^>]*id="s-samkey"/.test(HTML),
    's-samkey input missing from Settings tab');
  assert.ok(/SAM_API_KEY:\s*document\.getElementById\(['"]s-samkey['"]/.test(HTML),
    'saveSettings must read s-samkey value');
});

// 16. SAM search screen does NOT include SAM API key input.
test('SAM search screen has no out-samkey input field', () => {
  assert.ok(!/<input[^>]*id="out-samkey"/.test(HTML),
    'SAM search screen still has out-samkey input (Phase 24I regression)');
  assert.ok(!/onclick="saveSamKey\(\)"/.test(HTML),
    'SAM search screen still has Save Key button (Phase 24I regression)');
});

// 17. SAM search screen does not ask user to paste credentials.
test('SAM search screen does not contain "paste your API key" copy', () => {
  // The out-samkey-pointer container exists; it must not contain
  // paste/enter-key language. The Phase 24I status-only chip + Settings
  // button are the only allowed copy there.
  const startIdx = HTML.indexOf('id="out-samkey-pointer"');
  assert.ok(startIdx > 0, 'out-samkey-pointer container missing');
  const slice = HTML.slice(startIdx, startIdx + 1500);
  assert.ok(!/paste[^<]*api key/i.test(slice),
    'SAM search screen contains "paste your API key" copy');
  assert.ok(!/enter[^<]*api key/i.test(slice),
    'SAM search screen contains "enter your API key" copy');
});

// 18. SAM search screen points to Setup Wizard or Settings.
test('SAM search screen points to Settings via openTab(settings)', () => {
  const startIdx = HTML.indexOf('id="out-samkey-pointer"');
  const slice = HTML.slice(startIdx, startIdx + 1500);
  assert.ok(/openTab\(\s*'settings'\s*\)/.test(slice),
    'SAM search screen must point to Settings');
  assert.ok(/Configure SAM\.gov API key in Settings/i.test(slice),
    'SAM search screen must surface the Settings-nav copy');
});

// 19. No API key value is hardcoded or visible in renderer.
test('no raw API key value is hardcoded or constructed inline', () => {
  assert.ok(!/['"`]Bearer\s+\$\{/.test(HTML),
    'renderer constructs a template-literal Bearer header');
  assert.ok(!/['"]Bearer\s+['"]\s*\+/.test(HTML),
    'renderer concatenates a Bearer header literal with a key');
  assert.ok(!/Authorization['"`]\s*:\s*['"`]Bearer\s/.test(HTML),
    'renderer sets Authorization: "Bearer ..." inline');
});

// 20. Wizard includes Quick Setup Tour / feature walkthrough.
test('Step 10 — Quick Setup Tour with feature walkthrough', () => {
  assert.ok(/<div class="gcwiz-step" data-step="10">[\s\S]*?Quick Setup Tour/.test(HTML),
    'Step 10 (Quick Setup Tour) anchor missing or out of position');
});

// 21. Quick Setup Tour covers all 15 required features.
test('Quick Setup Tour covers all 15 required features (data-tour-feature markers)', () => {
  const required = [
    'capture-command-center',
    'operating-rhythm',
    'solicitation-workspace',
    'compliance-matrix',
    'vendor-quote-room',
    'pricing-worksheet',
    'past-performance-library',
    'capability-statement-studio',
    'prime-partner-finder',
    'stakeholder-graph',
    'submission-readiness-gate',
    'internal-review-markdown-export',
    'audit-log',
    'response-desk',
    'sam-sprint'
  ];
  for (const feat of required) {
    assert.ok(new RegExp('data-tour-feature="' + feat + '"').test(HTML),
      'Quick Setup Tour missing feature: ' + feat);
  }
});

// 22. Video placeholder.
test('Quick Setup Tour shows "Video walkthrough pending" placeholder', () => {
  assert.ok(/id="gcwiz-tour-video"/.test(HTML), 'gcwiz-tour-video container missing');
  assert.ok(/Video walkthrough pending\. Use the quick text tour below\./.test(HTML),
    'Verbatim video placeholder copy missing');
});

// 23. Final confirmation checklist exists.
test('Step 11 — Final Confirmation checklist with 5 items', () => {
  assert.ok(/<div class="gcwiz-step" data-step="11">/.test(HTML),
    'Step 11 (Finish) data-step missing');
  assert.ok(/id="gcwiz-final-confirm"/.test(HTML),
    'gcwiz-final-confirm container missing');
  for (const id of [
    'gcwiz-confirm-internal-review',
    'gcwiz-confirm-approve-externally',
    'gcwiz-confirm-sam-key-locations',
    'gcwiz-confirm-sam-search-no-paste',
    'gcwiz-confirm-replace-sample'
  ]) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'Final confirmation checkbox missing: ' + id);
  }
});

// 24. Final confirmation includes no-send/no-submit/no-upload understanding.
test('Final confirmation includes internal-review + approve-externally items', () => {
  assert.ok(/I understand SourceDeck prepares internal review materials\./.test(HTML),
    'verbatim "internal review materials" confirmation copy missing');
  assert.ok(/I understand I approve and send\/upload\/submit externally\./.test(HTML),
    'verbatim "approve and send/upload/submit externally" confirmation copy missing');
});

// 25. Final confirmation states SAM key locations.
test('Final confirmation states SAM key is in Setup Wizard and Settings', () => {
  assert.ok(/I understand SAM\.gov API key setup is available in Setup Wizard and Settings\./.test(HTML),
    'verbatim "SAM.gov API key setup is available in Setup Wizard and Settings" missing');
  assert.ok(/I understand the SAM search screen does not ask me to paste credentials\./.test(HTML),
    'verbatim "SAM search screen does not ask me to paste credentials" missing');
  assert.ok(/I understand demo\/sample data must be replaced before real use\./.test(HTML),
    'verbatim "demo/sample data must be replaced" missing');
});

// 26-29. No Send Email / Submit Bid / Submit Quote / Export-and-submit anywhere.
test('no Send Email button anywhere in renderer', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'Send Email button present');
});
test('no Submit Bid button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Bid\s*</i.test(HTML), 'Submit Bid button present');
});
test('no Submit Quote button anywhere in renderer', () => {
  assert.ok(!/>\s*Submit Quote\s*</i.test(HTML), 'Submit Quote button present');
});
test('no "Export and submit" wording in renderer', () => {
  assert.ok(!/Export and submit/i.test(HTML), '"Export and submit" wording present');
});

// 30. No portal-upload / agency-submission-complete positive claim.
test('no positive portal-upload / agency-submission-complete claim in active runtime', () => {
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
  assertNoPositiveClaim(/upload to SAM/i,              'upload to SAM');
  assertNoPositiveClaim(/upload to PIEE/i,             'upload to PIEE');
  assertNoPositiveClaim(/Agency submission complete/i, 'Agency submission complete');
});

// 31. System Readiness / sysflow remains removed.
test('System Readiness / System Flow remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
});

// 32. Deprecated $79 / $349 / $999 not in active app UI.
test('deprecated $79 / $349 / $999 not in active app UI', () => {
  const PANES = HTML.match(/<div class="tab-pane[\s\S]*?<\/div>\s*<\/section>/g) || [];
  const sample = PANES.join('\n');
  for (const re of [/\$79\b/, /\$349\b/, /\$999\b/]) {
    assert.ok(!re.test(sample), 'deprecated active-UI pricing copy present: ' + re);
  }
});

// 33. Renderer-boot guard.
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

// Wizard step count: 11 total.
test('wizard step count is exactly 11 (Phase 24K adds Welcome + Quick Setup Tour)', () => {
  for (let i = 1; i <= 11; i++) {
    assert.ok(new RegExp('data-step="' + i + '"').test(HTML), 'missing wizard step ' + i);
  }
  assert.ok(/_GC_WIZ_MAX\s*=\s*11/.test(HTML),
    '_GC_WIZ_MAX must be 11');
  assert.ok(/Step 1 of 11/.test(HTML),
    'progress label must read "Step 1 of 11"');
});

// Test wired into npm test chain.
test('test wired into npm test chain (package.json)', () => {
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  assert.ok(/setup-wizard-first-run\.test\.js/.test(pkg),
    'test/setup-wizard-first-run.test.js not wired into npm test');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24K setup-wizard-first-run checks ===\n`);
process.exit(failed ? 1 : 0);

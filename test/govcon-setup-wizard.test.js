/**
 * GovCon First-Time Setup Wizard tests.
 *
 * Static/source assertions over the renderer + preload to confirm:
 *   - wizard exists with profile/SAM/safety steps
 *   - SAM credential is presence-only (no raw key read, no auth header)
 *   - safety + procurement-integrity language is present
 *   - readiness banner reflects GovCon setup state with safe wording
 *   - no compliance/certification claims
 *
 * Pure node assert; no Electron, no network. Run:
 *   node test/govcon-setup-wizard.test.js
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

const html    = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

console.log('\n── govcon setup wizard ──');

test('wizard entry + close functions exist', () => {
  assert.ok(/function openGovconSetupWizard/.test(html), 'openGovconSetupWizard missing');
  assert.ok(/function closeGovconSetupWizard/.test(html), 'closeGovconSetupWizard missing');
});

test('wizard has 9 steps incl. business, capability, targeting, SAM, AI, creative, social, safety, finish', () => {
  for (let i = 1; i <= 9; i++) {
    assert.ok(new RegExp('data-step="' + i + '"').test(html), 'missing step ' + i);
  }
  assert.ok(/Business profile/.test(html), 'business profile step copy missing');
  assert.ok(/SAM\.gov (access|API key)/.test(html), 'SAM step copy missing');
});

test('wizard collects profile fields (company, certs, NAICS, agencies)', () => {
  assert.ok(/id="gcwiz-company"/.test(html));
  assert.ok(/id="gcwiz-certs"/.test(html));
  assert.ok(/id="gcwiz-naics"/.test(html));
  assert.ok(/id="gcwiz-agencies"/.test(html));
  for (const cert of ['SDVOSB', 'VOSB', '8(a)', 'WOSB', 'HUBZone', 'Small Business', 'Other']) {
    assert.ok(html.includes('value="' + cert + '"'), 'cert missing: ' + cert);
  }
});

test('SAM credential is presence-only via safe adapter', () => {
  // saves through sd.credentials.set('sam-gov', ...)
  assert.ok(/credentials\.set\(\s*['"]sam-gov['"]/.test(html), 'must save SAM via sd.credentials.set');
  // status check is presence-only
  assert.ok(/present\s*&&\s*[^;]*\['sam-gov'\]|present\['sam-gov'\]/.test(html), 'SAM presence check missing');
  // raw key cleared from DOM after save
  assert.ok(/input\.value\s*=\s*''/.test(html), 'SAM input must be cleared after save');
});

test('renderer never reads a raw SAM key or builds a SAM auth header', () => {
  // strip comments so descriptive text is not matched
  const code = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/credentials\.get\(/.test(code), 'renderer must not call credentials.get()');
  // no Authorization/x-api-key header built around api.sam.gov in renderer
  assert.ok(!/api\.sam\.gov[\s\S]{0,160}(Authorization|x-api-key|api_key=)/.test(code),
    'renderer must not build a SAM auth header');
});

test('preload exposes presence-only credential surface (no raw key, no header)', () => {
  assert.ok(/credentials:\s*\{[\s\S]*status[\s\S]*set[\s\S]*remove/.test(preload), 'credentials surface missing');
  const pcode = preload.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/['"]Authorization['"]\s*:/.test(pcode), 'preload must not set Authorization');
  assert.ok(!/['"]x-api-key['"]\s*:/.test(pcode), 'preload must not set x-api-key');
  assert.ok(!/credentials\.get\(/.test(pcode), 'preload must not expose credentials.get');
});

test('wizard safety copy requires human review + disclaims approval/compliance/bid', () => {
  assert.ok(/human review/i.test(html), 'human review language missing');
  assert.ok(/does not approve outreach, certify compliance, or make final bid decisions/i.test(html),
    'disclaimer language missing');
});

test('procurement-integrity guardrails referenced in wizard copy', () => {
  assert.ok(/RED_RESTRICTED/.test(html), 'RED_RESTRICTED reference missing');
  assert.ok(/KILL/.test(html) && /irreversible/i.test(html), 'KILL irreversibility reference missing');
});

test('wizard/banner copy does NOT claim compliant/certified/safe-to-send/fully-operational', () => {
  // Only check the GovCon wizard + setup-banner regions for forbidden marketing claims.
  const wizStart = html.indexOf('FIRST-TIME GOVCON SETUP WIZARD');
  const wizEnd = html.indexOf('LEAD DETAIL PANEL');
  const region = html.slice(wizStart, wizEnd);
  assert.ok(wizStart >= 0 && wizEnd > wizStart, 'wizard region not found');
  assert.ok(!/\bfully operational\b/i.test(region), 'must not claim fully operational');
  assert.ok(!/\bsafe to send\b/i.test(region), 'must not claim safe to send');
  assert.ok(!/\b(is|are)\s+compliant\b/i.test(region), 'must not claim compliant');
  assert.ok(!/\bcertified\b/i.test(region), 'must not claim certified');
});

test('GovCon setup banner uses approved state vocabulary', () => {
  assert.ok(/Setup incomplete/.test(html), 'Setup incomplete state missing');
  assert.ok(/Ready for review/.test(html), 'Ready for review state missing');
  assert.ok(/Demo data/.test(html), 'Demo data state missing');
  assert.ok(/Manual review required|require[s]? human review|requires? human review|manual review/i.test(html),
    'manual/human review language missing');
});

test('readiness banner includes GovCon profile + SAM key state items', () => {
  assert.ok(/GovCon profile incomplete/.test(html), 'GovCon profile readiness item missing');
  assert.ok(/SAM\.gov key missing/.test(html), 'SAM key readiness item missing');
  assert.ok(/wrCredentialPresent\('sam-gov'\)/.test(html), 'SAM presence check in readiness missing');
});

test('wizard auto-opens once per session when setup incomplete', () => {
  assert.ok(/lcc_govcon_wizard_seen/.test(html), 'session guard for wizard auto-open missing');
  assert.ok(/govconSetupComplete\(\)/.test(html), 'setup-complete gate missing');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} govcon-setup-wizard tests ===`
  : `=== FAIL — ${failed}/${total} govcon-setup-wizard tests failed ===`);
if (failed > 0) process.exit(1);

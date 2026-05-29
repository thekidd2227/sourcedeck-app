/**
 * GovCon Outreach OS — integration test.
 *
 * Confirms the merged GovCon surfaces (Capture Suite, SAM Opportunity
 * Outreach, Prime Partner Finder, Setup Wizard, readiness banners,
 * Official Q&A / email drafting, exports, scheduled SAM search) are
 * wired as one coherent product, with no duplicate subsystems, the
 * credential boundary intact, and no-auto-send / procurement guardrails
 * present.
 *
 * Static/source assertions; no Electron, no network. Run:
 *   node test/govcon-outreach-os-integration.test.js
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
const R = (p) => { try { return fs.readFileSync(path.join(__dirname, '..', p), 'utf8'); } catch { return ''; } };
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');

const html    = R('sourcedeck.html');
const preload = R('preload.js');
const pkg     = R('package.json');
const outreachSvc = R('services/govcon/opportunity-outreach.js');
const primeSvc    = R('services/govcon/prime-partner-finder.js');

console.log('\n── govcon outreach os integration ──');

test('preload exposes both outreach and primes namespaces under one govcon root', () => {
  assert.strictEqual((preload.match(/\bgovcon:\s*\{/g) || []).length, 1, 'must have exactly one govcon root namespace');
  assert.ok(/\boutreach\s*:\s*\{/.test(preload), 'outreach namespace missing');
  assert.ok(/\bprimes\s*:\s*\{/.test(preload), 'primes namespace missing');
});

test('package test script includes outreach, primes, setup wizard, and integration tests', () => {
  for (const t of [
    'govcon-opportunity-outreach.test.js',
    'prime-partner-finder.test.js',
    'govcon-setup-wizard.test.js',
    'govcon-outreach-os-integration.test.js'
  ]) assert.ok(pkg.includes(t), 'test script missing: ' + t);
  assert.ok(pkg.includes('govcon:outreach-os:audit'), 'audit npm script missing');
  assert.ok(pkg.includes('govcon:smoke'), 'smoke npm script missing');
});

test('sourcedeck.html includes Outreach, Prime Partners, GovCon setup, and readiness banner surfaces', () => {
  assert.ok(/id="tab-outreach"/.test(html), 'Outreach tab missing');
  assert.ok(/id="tab-primes"/.test(html), 'Prime Partners tab missing');
  assert.ok(/openGovconSetupWizard\(\)/.test(html), 'GovCon setup entry missing');
  assert.ok(/govcon-setup-banner/.test(html) && /workspace-readiness/.test(html), 'readiness banner missing');
});

test('no duplicate GovCon root namespace / SAM search service / email engine', () => {
  // single govcon preload root
  assert.strictEqual((preload.match(/\bgovcon:\s*\{/g) || []).length, 1);
  // single SAM search service base URL
  const sam = R('services/govcon/sam-search.js');
  assert.ok(/api\.sam\.gov\/opportunities/.test(sam), 'sam-search base URL missing');
  // email drafting is orchestrated only by the approved services — there
  // is no second standalone email-draft engine file.
  const emailEngines = ['email-compliance.js', 'opportunity-outreach.js', 'prime-partner-finder.js']
    .filter(f => fs.existsSync(path.join(__dirname, '..', 'services/govcon', f)));
  assert.ok(emailEngines.length >= 1, 'expected approved email orchestration services');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'services/govcon/email-engine.js')),
    'must not introduce a second email engine (email-engine.js)');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'services/govcon/sam-search-2.js')),
    'must not introduce a second SAM search service');
});

test('no auto-send language/API path in renderer/preload', () => {
  const code = decomment(html) + '\n' + decomment(preload);
  assert.ok(!/\b(nodemailer|sendgrid|mailgun|smtp|createTransport|sendMail)\b/i.test(code),
    'no email transport/send path may exist in renderer/preload');
});

test('outreach service asserts requiresApproval:true and sendingEnabled:false', () => {
  assert.ok(/requiresApproval\s*=\s*true|requiresApproval:\s*true/.test(outreachSvc), 'outreach requiresApproval missing');
  assert.ok(/sendingEnabled\s*=\s*false|sendingEnabled:\s*false/.test(outreachSvc), 'outreach sendingEnabled missing');
});

test('prime-partner service asserts requiresApproval:true and sendingEnabled:false', () => {
  assert.ok(/requiresApproval\s*=\s*true|requiresApproval:\s*true/.test(primeSvc), 'primes requiresApproval missing');
  assert.ok(/sendingEnabled\s*=\s*false|sendingEnabled:\s*false/.test(primeSvc), 'primes sendingEnabled missing');
});

test('restricted-window official Q&A guardrail exists', () => {
  const win = R('services/govcon/outreach-window.js');
  assert.ok(/RED_RESTRICTED/.test(win), 'RED_RESTRICTED missing');
  assert.ok(/draftsAllowed:\s*false/.test(win), 'RED_RESTRICTED must block drafts');
  assert.ok(/official Q&A|official solicitation Q&A/i.test(win), 'official Q&A routing missing');
});

test('KILL irreversible + AI cannot override deterministic verdicts', () => {
  const fc = R('services/govcon/fast-cash.js');
  const sol = R('services/govcon/solicitation-analysis.js');
  assert.ok(/KILL stays KILL|Previously killed/.test(fc), 'KILL irreversibility missing');
  assert.ok(/cannot\s+(override|.*KILL)/i.test(sol), 'AI-override prohibition missing');
});

test('setup wizard safety language exists', () => {
  assert.ok(/human review/i.test(html), 'human review language missing');
  assert.ok(/does not approve outreach, certify compliance, or make final bid decisions/i.test(html),
    'wizard safety disclaimer missing');
});

test('export secret stripping remains present', () => {
  const exp = R('services/govcon/export.js');
  assert.ok(/api[_-]?key|authorization|secret|token|credential/i.test(exp), 'export secret patterns missing');
  assert.ok(/strip|continue|skip|redact/i.test(exp), 'export strip logic missing');
});

test('credential boundary: preload presence-only, no get / auth headers', () => {
  const p = decomment(preload);
  assert.ok(/credentials:\s*\{[\s\S]*?status[\s\S]*?set[\s\S]*?remove/.test(preload), 'credentials surface missing');
  assert.ok(!/credentials\s*:\s*\{[\s\S]*?\bget\b\s*:/.test(p), 'preload must not expose credentials.get');
  assert.ok(!/['"]Authorization['"]\s*:/.test(p), 'preload must not build Authorization header');
  assert.ok(!/['"]x-api-key['"]\s*:/.test(p), 'preload must not build x-api-key header');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} govcon-outreach-os-integration tests ===`
  : `=== FAIL — ${failed}/${total} govcon-outreach-os-integration tests failed ===`);
if (failed > 0) process.exit(1);

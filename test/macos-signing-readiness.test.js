/**
 * Phase 17A — macOS signing & notarization readiness tests.
 *
 * Confirms the readiness module is presence-only, classifies stable
 * statuses correctly, redacts cred-shaped values, never echoes
 * credentials, and that the CLI behaves safely in dev vs strict mode.
 *
 * Pure Node assert; no network; no Apple credentials are read or
 * required. Run:
 *   node test/macos-signing-readiness.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const r = require('../services/release/macos-signing-readiness');
const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

console.log('\n── env presence status ──');

test('STATUS exposes the seven stable codes', () => {
  for (const k of ['READY_TO_SIGN','PARTIAL_SIGNING','BLOCKED_NOTARIZE_OFF','BLOCKED_MISSING_SIGNING','BLOCKED_MISSING_ENTITLEMENTS','UNSIGNED_DEV_OK','UNKNOWN']) {
    assert.ok(typeof r.STATUS[k] === 'string' && r.STATUS[k].length, 'missing STATUS.' + k);
  }
});

test('env status is presence-only (never echoes values)', () => {
  const env = { CSC_LINK: 'data:application/x-pkcs12;base64,XXXXXXXXX', CSC_KEY_PASSWORD: 'hunter2-very-secret', APPLE_ID: 'me@example.com', APPLE_APP_SPECIFIC_PASSWORD: 'a-very-secret-password', APPLE_TEAM_ID: 'TEAMID0000' };
  const st = r.getMacSigningEnvStatus(env);
  const j = JSON.stringify(st);
  for (const v of ['XXXXXXXXX', 'hunter2-very-secret', 'me@example.com', 'a-very-secret-password', 'TEAMID0000', 'data:application/x-pkcs12']) {
    assert.ok(!j.includes(v), 'value leaked: ' + v);
  }
  assert.strictEqual(st.signing.complete, true);
  assert.strictEqual(st.notarize.complete, true);
});

test('env status missing[] lists only names, not values', () => {
  const st = r.getMacSigningEnvStatus({});
  assert.deepStrictEqual(st.signing.missing.sort(), ['CSC_KEY_PASSWORD', 'CSC_LINK'].sort());
  assert.ok(st.notarize.missing.includes('APPLE_ID'));
});

console.log('\n── classify (dev mode) ──');

test('dev mode without any creds → unsigned_dev_ok', () => {
  const report = r.validateMacSigningConfig(REPO_ROOT, {});
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'dev', env: {} }), r.STATUS.UNSIGNED_DEV_OK);
});

test('dev mode with full env + notarize:false → blocked_notarize_off', () => {
  const env = { CSC_LINK: '.', CSC_KEY_PASSWORD: '.', APPLE_ID: '.', APPLE_APP_SPECIFIC_PASSWORD: '.', APPLE_TEAM_ID: '.' };
  // Synthesize a validation report with notarize flag explicitly false (matches current package.json on main).
  const report = Object.assign({}, r.validateMacSigningConfig(REPO_ROOT, env), { packageJsonNotarizeFlag: false });
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'dev', env }), r.STATUS.BLOCKED_NOTARIZE_OFF);
});

test('dev mode signing-only (notarize env missing) → partial_signing', () => {
  const env = { CSC_LINK: '.', CSC_KEY_PASSWORD: '.' };
  const report = r.validateMacSigningConfig(REPO_ROOT, env);
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'dev', env }), r.STATUS.PARTIAL_SIGNING);
});

console.log('\n── classify (strict / public release) ──');

test('strict mode without creds → blocked_missing_signing', () => {
  const report = r.validateMacSigningConfig(REPO_ROOT, {});
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'strict', env: {} }), r.STATUS.BLOCKED_MISSING_SIGNING);
});

test('strict mode with full env + notarize:false → blocked_notarize_off', () => {
  const env = { CSC_LINK: '.', CSC_KEY_PASSWORD: '.', APPLE_ID: '.', APPLE_APP_SPECIFIC_PASSWORD: '.', APPLE_TEAM_ID: '.' };
  const report = Object.assign({}, r.validateMacSigningConfig(REPO_ROOT, env), { packageJsonNotarizeFlag: false });
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'strict', env }), r.STATUS.BLOCKED_NOTARIZE_OFF);
});

test('strict mode with full env + notarize:true → ready_to_sign', () => {
  const env = { CSC_LINK: '.', CSC_KEY_PASSWORD: '.', APPLE_ID: '.', APPLE_APP_SPECIFIC_PASSWORD: '.', APPLE_TEAM_ID: '.' };
  const report = Object.assign({}, r.validateMacSigningConfig(REPO_ROOT, env), { packageJsonNotarizeFlag: true });
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'strict', env }), r.STATUS.READY_TO_SIGN);
});

test('strict mode with App Store Connect API env + notarize:true → ready_to_sign', () => {
  const env = { CSC_LINK: '.', CSC_KEY_PASSWORD: '.', APPLE_API_KEY: '.', APPLE_API_KEY_ID: '.', APPLE_API_ISSUER: '.' };
  const report = Object.assign({}, r.validateMacSigningConfig(REPO_ROOT, env), { packageJsonNotarizeFlag: true });
  assert.strictEqual(r.classifyMacSigningReadiness(report, { mode: 'strict', env }), r.STATUS.READY_TO_SIGN);
});

console.log('\n── redaction ──');

test('redaction strips CSC/APPLE env assignments, PEM, Developer ID, base64/hex blobs', () => {
  const dirty = [
    'CSC_KEY_PASSWORD=hunter2-very-secret',
    'APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop',
    'Developer ID Application: My Company LLC (TEAM123)',
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN…\n-----END PRIVATE KEY-----',
    '-----BEGIN CERTIFICATE-----\nABCDE…\n-----END CERTIFICATE-----',
    'a'.repeat(80),
    'F'.repeat(64)
  ].join('\n');
  const out = r.redactSigningReadinessReport(dirty);
  assert.ok(!/hunter2-very-secret/.test(out), 'CSC_KEY_PASSWORD value leaked');
  assert.ok(!/abcd-efgh-ijkl-mnop/.test(out), 'APPLE_APP_SPECIFIC_PASSWORD value leaked');
  assert.ok(!/My Company LLC \(TEAM123\)/.test(out), 'Developer ID identity leaked');
  assert.ok(!/-----BEGIN PRIVATE KEY-----[\s\S]*-----END PRIVATE KEY-----/.test(out), 'PEM private key leaked');
  assert.ok(!/-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/.test(out), 'PEM cert leaked');
  assert.ok(!/a{40,}/.test(out), 'long base64 leaked');
  assert.ok(!/F{32,}/.test(out), 'long hex leaked');
  assert.ok(/REDACTED/.test(out));
});

console.log('\n── readiness report shape ──');

test('buildMacSigningReadinessReport returns presence-only structure', () => {
  const env = { CSC_LINK: 'this-should-not-leak', CSC_KEY_PASSWORD: 'this-should-not-leak-either' };
  const rep = r.buildMacSigningReadinessReport(REPO_ROOT, env, { mode: 'dev' });
  const j = JSON.stringify(rep);
  assert.ok(!/this-should-not-leak/.test(j), 'env value leaked');
  assert.ok(rep.envStatus && rep.envStatus.signing && rep.envStatus.signing.present);
  assert.ok(typeof rep.status === 'string' && rep.status.length);
  assert.ok(Array.isArray(rep.remediation) && rep.remediation.length);
});

console.log('\n── CLI ──');

test('CLI default (no creds) prints unsigned_dev_ok and exits 0', () => {
  const out = execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/macos-signing-readiness.js')], { cwd: REPO_ROOT, env: {} });
  const s = String(out);
  assert.ok(/status:\s+unsigned_dev_ok/.test(s));
  assert.ok(!/hunter2|abcd-efgh/.test(s));
});

test('CLI --strict (no creds) exits 1 with blocked_missing_signing', () => {
  let exitCode = 0; let stdout = '';
  try { execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/macos-signing-readiness.js'), '--strict'], { cwd: REPO_ROOT, env: {} }); }
  catch (e) { exitCode = e.status; stdout = String(e.stdout || ''); }
  assert.strictEqual(exitCode, 1, 'strict mode must exit 1');
  assert.ok(/blocked_missing_signing/.test(stdout));
});

test('CLI --json emits a JSON document with no secret values', () => {
  const env = { CSC_LINK: 'this-should-not-leak-link', CSC_KEY_PASSWORD: 'this-should-not-leak-pass' };
  const out = String(execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/macos-signing-readiness.js'), '--json'], { cwd: REPO_ROOT, env }));
  // Parseable JSON-ish (the redactor may rewrite long blobs, but the top-level structure must parse).
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.module, 'macos-signing-readiness');
  assert.ok(parsed.envStatus && parsed.envStatus.signing);
  assert.ok(!/this-should-not-leak/.test(out), 'env value leaked into CLI --json output');
});

console.log('\n── release-check + troubleshooting REL-020 integration ──');

test('release-check.js points at the new readiness script', () => {
  const rc = fs.readFileSync(path.join(REPO_ROOT, 'scripts/release-check.js'), 'utf8');
  assert.ok(/release:mac-signing-readiness:strict/.test(rc),
    'release-check should mention release:mac-signing-readiness:strict');
});

test('troubleshooting REL-020 remediation references the new readiness script', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'services/troubleshooting/troubleshooting-agent.js'), 'utf8');
  // The finding block is verifiable by string presence.
  assert.ok(/REL-020/.test(src));
  assert.ok(/release:mac-signing-readiness/.test(src),
    'REL-020 remediation must mention release:mac-signing-readiness');
});

test('REL-020 keeps autoRepairAllowed:false and requiresHumanApproval:true (via makeFinding invariant)', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'services/troubleshooting/troubleshooting-agent.js'), 'utf8');
  // The agent's makeFinding always sets these; the file-wide invariant
  // check throws if any finding flips them.
  assert.ok(/autoRepairAllowed:\s*false/.test(src));
  assert.ok(/requiresHumanApproval:\s*true/.test(src));
});

test('docs do not claim the app is signed/notarized', () => {
  const audit = fs.readFileSync(path.join(REPO_ROOT, 'docs/audits/macos-signing-release-readiness-audit.md'), 'utf8');
  const NEG = /\b(no|not|never|without|nothing|must\s+not|do\s+not|don'?t|cannot|until|unless|requires?|pending|blocked)\b/i;
  const claimRe = /\b(SourceDeck|the app)\s+is\s+(signed|notarized|fully\s+signed)\b/ig;
  let m;
  while ((m = claimRe.exec(audit)) !== null) {
    const lineStart = audit.lastIndexOf('\n', m.index) + 1;
    let lineEnd = audit.indexOf('\n', m.index);
    if (lineEnd < 0) lineEnd = audit.length;
    const line = audit.slice(lineStart, lineEnd);
    if (!NEG.test(line)) throw new Error('audit claims app is signed/notarized: "' + line.trim() + '"');
  }
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} macos-signing-readiness tests ===`
  : `=== FAIL — ${failed}/${total} macos-signing-readiness tests failed ===`);
if (failed > 0) process.exit(1);

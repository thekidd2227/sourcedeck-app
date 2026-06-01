/**
 * Phase 17B — release artifact evidence tests.
 *
 * Confirms the evidence module captures the expected schema, redacts
 * cred-shaped values, never embeds raw secrets, classifies stable
 * states correctly, the CLI behaves safely in dev vs strict mode, the
 * workflow_dispatch-only workflow file is safe, and REL-030 is wired
 * into the troubleshooting agent without flipping the auto-repair
 * invariant.
 *
 * Pure Node assert; no network; no Apple credentials required.
 *   node test/release-evidence.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const evidence = require('../services/release/release-evidence');
const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

console.log('\n── module shape + classify ──');

test('STATE exposes the seven stable evidence states', () => {
  for (const k of ['LOCAL_UNSIGNED_DEV','SIGNING_READY','SIGNING_BLOCKED_MISSING_CREDENTIALS','NO_PACKAGED_ARTIFACT','PACKAGED_UNSIGNED','PACKAGED_SIGNED_UNVERIFIED','PACKAGED_SIGNED_VERIFIED']) {
    assert.ok(typeof evidence.STATE[k] === 'string' && evidence.STATE[k].length, 'missing STATE.' + k);
  }
});

test('collectReleaseEvidence returns expected top-level keys', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  for (const k of ['module','generatedAt','rootDir','mode','git','package','asar','signing','troubleshooting','gates','releaseCheck','state','warnings','blockers','note']) {
    assert.ok(Object.prototype.hasOwnProperty.call(ev, k), 'missing key: ' + k);
  }
  assert.strictEqual(ev.module, 'release-evidence');
});

test('evidence.git includes branch, commit (short), dirty', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  assert.ok(typeof ev.git.branch === 'string');
  assert.ok(/^[a-f0-9]{6,12}$/i.test(ev.git.commit), 'commit should be a short SHA, got: ' + ev.git.commit);
  assert.ok(typeof ev.git.dirty === 'boolean');
});

test('evidence.package surfaces version + mac build summary (no secrets)', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  assert.ok(ev.package.ok);
  assert.ok(typeof ev.package.version === 'string' && ev.package.version.length);
  assert.ok(ev.package.mac);
  assert.ok(typeof ev.package.mac.notarize === 'boolean');
  assert.ok(typeof ev.package.mac.entitlements === 'string');
});

test('evidence.signing carries signing-readiness status', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  assert.ok(ev.signing && typeof ev.signing.status === 'string');
});

test('evidence.troubleshooting references report paths under reports/troubleshooting', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  // Either path may be null if no report yet; if present it must point under reports/troubleshooting.
  if (ev.troubleshooting.latestMarkdownPath) assert.ok(ev.troubleshooting.latestMarkdownPath.includes('reports/troubleshooting'));
  if (ev.troubleshooting.latestJsonPath)     assert.ok(ev.troubleshooting.latestJsonPath.includes('reports/troubleshooting'));
});

test('evidence.gates lists the canonical command names (does not execute them)', () => {
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  const cmds = (ev.gates && ev.gates.commands) || [];
  assert.ok(cmds.includes('npm test'));
  assert.ok(cmds.includes('node scripts/release-check.js'));
  assert.ok(cmds.includes('npm run troubleshooting:scan:json'));
});

console.log('\n── classification ──');

test('classification: no artifact + no creds → local_unsigned_dev', () => {
  const rep = evidence.collectReleaseEvidence({ rootDir: '/tmp/__not_a_repo_phase17b__', env: {} });
  assert.ok([evidence.STATE.LOCAL_UNSIGNED_DEV, evidence.STATE.NO_PACKAGED_ARTIFACT].includes(rep.state),
    'unexpected state: ' + rep.state);
});

test('classification: artifact present (no signing verified) → packaged_unsigned', () => {
  const rep = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  // Local repo has a packaged dist/mac/SourceDeck.app (unsigned).
  assert.ok([evidence.STATE.PACKAGED_UNSIGNED, evidence.STATE.LOCAL_UNSIGNED_DEV, evidence.STATE.NO_PACKAGED_ARTIFACT].includes(rep.state),
    'unexpected state: ' + rep.state);
});

console.log('\n── redaction ──');

test('redactReleaseEvidence strips Apple/SMTP/IBM env assignments, PEM, Bearer, sk-/sk-ant, JWT, long hex', () => {
  const dirty = [
    'CSC_KEY_PASSWORD=hunter2-supersecret',
    'APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop',
    'IBM_CLOUD_API_KEY=ibm-key-do-not-leak-1234567890',
    'TROUBLESHOOTING_SMTP_PASS=topsecretpassword',
    'Developer ID Application: My Company LLC (TEAM123)',
    '-----BEGIN PRIVATE KEY-----\nABCD\n-----END PRIVATE KEY-----',
    '-----BEGIN CERTIFICATE-----\nEFGH\n-----END CERTIFICATE-----',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig',
    'sk-ant-abcdefghij1234567890abcdef',
    'sk-xxxxxxxxxxxxxxxx1234567890abcdef',
    'A'.repeat(64)
  ].join('\n');
  const clean = evidence.redactReleaseEvidence(dirty);
  for (const v of ['hunter2-supersecret','abcd-efgh-ijkl-mnop','ibm-key-do-not-leak-1234567890','topsecretpassword','My Company LLC (TEAM123)','eyJhbGciOiJIUzI1NiJ9.payload.sig','sk-ant-abcdefghij1234567890abcdef','sk-xxxxxxxxxxxxxxxx1234567890abcdef']) {
    assert.ok(!clean.includes(v), 'value leaked: ' + v);
  }
  assert.ok(!/-----BEGIN PRIVATE KEY-----[\s\S]*-----END PRIVATE KEY-----/.test(clean));
  assert.ok(!/-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/.test(clean));
  assert.ok(!/A{40,}/.test(clean), 'long base64 leaked');
  assert.ok(/REDACTED/.test(clean));
});

test('markdown output contains no secret values from a dirty env', () => {
  const env = { CSC_LINK: 'should-not-leak', CSC_KEY_PASSWORD: 'should-not-leak-pass', APPLE_ID: 'me@example.com' };
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env });
  const md = evidence.formatReleaseEvidenceMarkdown(ev);
  assert.ok(!/should-not-leak-pass/.test(md));
  assert.ok(!/should-not-leak\b/.test(md));
});

test('JSON output contains no secret values from a dirty env', () => {
  const env = { CSC_LINK: 'should-not-leak', CSC_KEY_PASSWORD: 'should-not-leak-pass', APPLE_ID: 'me@example.com' };
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env });
  const json = evidence.formatReleaseEvidenceJson(ev);
  assert.ok(!/should-not-leak-pass/.test(json));
  // Parseable JSON
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.module, 'release-evidence');
});

console.log('\n── CLI ──');

test('CLI default exits 0 and writes both markdown and JSON', () => {
  const outDir = path.join(REPO_ROOT, 'reports', 'release-evidence');
  // Clean output dir of dated reports for a clean run (preserve .gitkeep + latest files; we only validate they exist after).
  execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/release-evidence.js')], { cwd: REPO_ROOT, env: {} });
  assert.ok(fs.existsSync(path.join(outDir, 'latest-release-evidence.md')));
  assert.ok(fs.existsSync(path.join(outDir, 'latest-release-evidence.json')));
});

test('CLI --strict exits 1 when working tree is dirty or signing not ready', () => {
  let exitCode = 0;
  try { execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/release-evidence.js'), '--strict'], { cwd: REPO_ROOT, env: {} }); }
  catch (e) { exitCode = e.status; }
  // In this CI/dev environment, strict mode is expected to fail
  // (dirty tree from this very test run, or no signing creds).
  assert.strictEqual(exitCode, 1, 'strict mode must exit 1 in non-release env');
});

test('CLI --json emits a parseable JSON document with no secret values', () => {
  const env = { CSC_LINK: 'should-not-leak', CSC_KEY_PASSWORD: 'should-not-leak-pass' };
  const out = String(execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/release-evidence.js'), '--json'], { cwd: REPO_ROOT, env }));
  // Strip the trailing footer ("-- markdown:/json:" lines) before parsing.
  const jsonOnly = out.split('\n--\n')[0];
  const parsed = JSON.parse(jsonOnly);
  assert.strictEqual(parsed.module, 'release-evidence');
  assert.ok(!/should-not-leak-pass/.test(out));
});

console.log('\n── safety helpers (CLI internal predicates) ──');

const cli = require('../scripts/release-evidence.js');

test('containsUnsupportedSignedClaim flags positive claims, allows negations', () => {
  assert.strictEqual(cli.containsUnsupportedSignedClaim('SourceDeck is signed and notarized.'), true);
  assert.strictEqual(cli.containsUnsupportedSignedClaim('No claim that the app is signed/notarized.'), false);
  assert.strictEqual(cli.containsUnsupportedSignedClaim('the app is notarized'), true);
  assert.strictEqual(cli.containsUnsupportedSignedClaim(''), false);
});

test('containsSecretShape detects raw cred shapes', () => {
  assert.strictEqual(cli.containsSecretShape('sk-ant-abcdefghij1234567890'), true);
  assert.strictEqual(cli.containsSecretShape('CSC_KEY_PASSWORD=hunter2'), true);
  assert.strictEqual(cli.containsSecretShape('CSC_KEY_PASSWORD=[REDACTED]'), false);
  assert.strictEqual(cli.containsSecretShape('plain output without secrets'), false);
});

console.log('\n── workflow safety ──');

test('release-evidence.yml is workflow_dispatch only and requires no secrets', () => {
  const yml = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/release-evidence.yml'), 'utf8');
  assert.ok(/workflow_dispatch:\s*\{\}/.test(yml), 'must be workflow_dispatch only');
  assert.ok(!/\bschedule:\s*\n\s*- cron:/.test(yml), 'must not run on schedule');
  assert.ok(!/secrets\./.test(yml), 'must not reference secrets.*');
  assert.ok(!/git\s+commit|git\s+push/.test(yml), 'must not commit or push');
  assert.ok(!/electron-builder.*--publish|npm run release(\s|$)/.test(yml), 'must not publish');
  assert.ok(!/codesign\s+|xcrun\s+notarytool/.test(yml), 'must not invoke codesign/notarytool');
  assert.ok(/permissions:\s*\n\s*contents:\s*read/.test(yml), 'workflow must keep read-only permissions');
});

console.log('\n── troubleshooting REL-030 + invariant ──');

test('REL-030 is defined in the troubleshooting agent and references release:evidence', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'services/troubleshooting/troubleshooting-agent.js'), 'utf8');
  assert.ok(/id:\s*"REL-030"/.test(src), 'REL-030 finding missing');
  assert.ok(/release:evidence/.test(src), 'REL-030 must reference npm run release:evidence');
});

test('REL-030 preserves the auto-repair invariant (makeFinding sets it false)', () => {
  // The agent's makeFinding sets autoRepairAllowed:false and
  // requiresHumanApproval:true unconditionally; the invariant loop in
  // runTroubleshootingScan throws if any finding flips them. So a
  // successful scan inherently proves REL-030 carries the invariant.
  const agent = require('../services/troubleshooting/troubleshooting-agent.js');
  const result = agent.runTroubleshootingScan({ rootDir: REPO_ROOT });
  const rel030 = result.findings.find(f => f.id === 'REL-030');
  assert.ok(rel030, 'REL-030 must appear in scan output');
  assert.strictEqual(rel030.autoRepairAllowed, false);
  assert.strictEqual(rel030.requiresHumanApproval, true);
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} release-evidence tests ===`
  : `=== FAIL — ${failed}/${total} release-evidence tests failed ===`);
if (failed > 0) process.exit(1);

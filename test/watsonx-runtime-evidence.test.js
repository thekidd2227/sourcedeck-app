/**
 * Phase 18A — IBM watsonx runtime evidence tests.
 *
 * Confirms: presence-only env reporting; stable state classification;
 * redaction of every IBM/watsonx secret + identifier shape; markdown/JSON
 * evidence carries no raw secrets; the probe CLI is safe and offline when
 * no env is present (exit 0 default / exit 1 strict / writes redacted
 * reports); the troubleshooting WX-006 finding appears and preserves the
 * auto-repair invariant; release evidence surfaces a watsonx summary; and
 * the renderer/preload never build watsonx auth headers or store watsonx
 * keys in localStorage.
 *
 * Pure Node assert; the CLI tests run with an EMPTY env so NO outbound
 * IBM call is ever attempted.
 *   node test/watsonx-runtime-evidence.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const wx = require('../services/ai/watsonx-runtime-evidence');
const REPO_ROOT = path.resolve(__dirname, '..');
const PROBE = path.join(REPO_ROOT, 'scripts/watsonx-runtime-probe.js');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

console.log('\n── state constants + env presence ──');

test('STATE exposes the nine stable runtime states', () => {
  for (const k of ['NOT_CONFIGURED','CONFIGURED_MISSING_REQUIRED_ENV','IAM_TOKEN_FAILED','PROJECT_OR_SPACE_INVALID','MODEL_OR_DEPLOYMENT_INVALID','RUNTIME_REQUEST_FAILED','RUNTIME_REQUEST_SUCCEEDED','BLOCKED_BY_IBM_CONFIG','VERIFIED_READY']) {
    assert.ok(typeof wx.STATE[k] === 'string' && wx.STATE[k].length, 'missing STATE.' + k);
  }
});

test('getWatsonxEnvStatus is presence-only — never returns values', () => {
  const env = { WATSONX_API_KEY: 'super-secret-key-zzz', WATSONX_PROJECT_ID: '11111111-2222-3333-4444-555555555555' };
  const s = wx.getWatsonxEnvStatus(env);
  const json = JSON.stringify(s);
  assert.ok(!json.includes('super-secret-key-zzz'), 'api key value leaked');
  assert.ok(!json.includes('555555555555'), 'project id value leaked');
  // present is booleans only
  for (const v of Object.values(s.present)) assert.strictEqual(typeof v, 'boolean');
  assert.strictEqual(s.hasApiKey, true);
  assert.strictEqual(s.hasBinding, true);
  assert.strictEqual(s.configured, true);
});

test('empty env → not_configured; partial env → configured_missing_required_env', () => {
  const none = wx.classifyWatsonxRuntimeEvidence({ env: wx.getWatsonxEnvStatus({}) });
  assert.strictEqual(none, wx.STATE.NOT_CONFIGURED);
  const partial = wx.classifyWatsonxRuntimeEvidence({ env: wx.getWatsonxEnvStatus({ WATSONX_API_KEY: 'x' }) });
  assert.strictEqual(partial, wx.STATE.CONFIGURED_MISSING_REQUIRED_ENV);
});

console.log('\n── classification ──');

const fullEnv = wx.getWatsonxEnvStatus({ WATSONX_API_KEY: 'x', WATSONX_PROJECT_ID: 'p' });

test('iam failure → iam_token_failed → blocked_by_ibm_config', () => {
  const st = wx.classifyWatsonxRuntimeEvidence({ env: fullEnv, attempted: { iam: true }, iam: { ok: false, status: 400 } });
  assert.strictEqual(st, wx.STATE.IAM_TOKEN_FAILED);
  assert.strictEqual(wx.rollupWatsonxRuntimeOutcome(st), wx.STATE.BLOCKED_BY_IBM_CONFIG);
});

test('runtime project/space error → project_or_space_invalid', () => {
  const st = wx.classifyWatsonxRuntimeEvidence({ env: fullEnv, attempted: { iam: true, runtime: true }, iam: { ok: true }, runtime: { ok: false, status: 400, error: 'watsonx_http_400', detail: 'project_id is not associated with a WML instance' } });
  assert.strictEqual(st, wx.STATE.PROJECT_OR_SPACE_INVALID);
});

test('runtime model error → model_or_deployment_invalid', () => {
  const st = wx.classifyWatsonxRuntimeEvidence({ env: fullEnv, attempted: { iam: true, runtime: true }, iam: { ok: true }, runtime: { ok: false, status: 400, error: 'model_not_supported' } });
  assert.strictEqual(st, wx.STATE.MODEL_OR_DEPLOYMENT_INVALID);
});

test('runtime success → runtime_request_succeeded → verified_ready', () => {
  const st = wx.classifyWatsonxRuntimeEvidence({ env: fullEnv, attempted: { iam: true, runtime: true }, iam: { ok: true }, runtime: { ok: true, status: 200 } });
  assert.strictEqual(st, wx.STATE.RUNTIME_REQUEST_SUCCEEDED);
  assert.strictEqual(wx.rollupWatsonxRuntimeOutcome(st), wx.STATE.VERIFIED_READY);
  assert.strictEqual(wx.isVerifiedReady(wx.STATE.VERIFIED_READY), true);
});

console.log('\n── redaction ──');

test('redactWatsonxEvidence masks IBM/watsonx keys, Bearer, JWT, ids, long hex/base64', () => {
  const dirty = [
    'WATSONX_API_KEY=watsonx-key-do-not-leak-123456',
    'IBM_CLOUD_API_KEY=ibm-key-do-not-leak-7890',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payloadpart.signature',
    'project_id 11111111-2222-3333-4444-555555555555',
    'space_id: abcdef01-2345-6789-abcd-ef0123456789',
    'deployment_id=deadbeefdeadbeefdeadbeefdeadbeef0011',
    'sk-abcdefghij1234567890abcdef',
    'A'.repeat(64),
    'F'.repeat(40)
  ].join('\n');
  const clean = wx.redactWatsonxEvidence(dirty);
  for (const v of ['watsonx-key-do-not-leak-123456','ibm-key-do-not-leak-7890','eyJhbGciOiJIUzI1NiJ9.payloadpart.signature','11111111-2222-3333-4444-555555555555','abcdef01-2345-6789-abcd-ef0123456789','sk-abcdefghij1234567890abcdef']) {
    assert.ok(!clean.includes(v), 'value leaked: ' + v);
  }
  assert.ok(!/A{40,}/.test(clean), 'long base64 leaked');
  assert.ok(/REDACT/i.test(clean), 'redaction marker missing');
});

test('redactWatsonxEvidence deep-redacts objects and drops secret-named keys', () => {
  const obj = wx.redactWatsonxEvidence({ apiKey: 'leak-me', nested: { token: 'leak-me-too', detail: 'Bearer abcdefghijklmnop1234' } });
  const json = JSON.stringify(obj);
  assert.ok(!json.includes('leak-me'), 'apiKey value leaked');
  assert.ok(!json.includes('leak-me-too'), 'nested token leaked');
  assert.ok(!/Bearer\s+abcdefghijklmnop1234/.test(json), 'bearer leaked');
});

test('built evidence markdown + JSON carry no raw secret from a dirty runtime detail', () => {
  const result = {
    env: fullEnv,
    attempted: { iam: true, runtime: true },
    iam: { ok: true },
    runtime: { ok: false, status: 401, error: 'watsonx_http_401', detail: 'Authorization: Bearer eyJleak.partpart.sigsig — project_id 11111111-2222-3333-4444-555555555555', responseTextPresent: false }
  };
  const evidence = wx.buildWatsonxRuntimeEvidence(result);
  const md = wx.formatWatsonxRuntimeEvidenceMarkdown(evidence);
  const json = wx.formatWatsonxRuntimeEvidenceJson(evidence);
  for (const out of [md, json]) {
    assert.ok(!out.includes('eyJleak.partpart.sigsig'), 'JWT leaked');
    assert.ok(!out.includes('11111111-2222-3333-4444-555555555555'), 'project id leaked');
  }
  assert.strictEqual(JSON.parse(json).module, 'watsonx-runtime-evidence');
});

console.log('\n── probe CLI (offline; empty env) ──');

test('CLI --json exits 0 with not_configured and no env attempt', () => {
  const out = String(execFileSync(process.execPath, [PROBE, '--json'], { cwd: REPO_ROOT, env: {} }));
  const parsed = JSON.parse(out.split('\n--\n')[0]);
  assert.strictEqual(parsed.state, 'not_configured');
  assert.strictEqual(parsed.attempted.iam, false);
  assert.strictEqual(parsed.verifiedReady, false);
});

test('CLI --strict exits 1 when not verified_ready', () => {
  let code = 0;
  try { execFileSync(process.execPath, [PROBE, '--strict'], { cwd: REPO_ROOT, env: {} }); }
  catch (e) { code = e.status; }
  assert.strictEqual(code, 1, 'strict must exit 1 without verified_ready');
});

test('CLI --evidence writes redacted reports (no secrets) and exits 0', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wx-evidence-'));
  // Dirty env values must never reach the report (no required binding →
  // no network attempt, and presence-only reporting).
  const env = { WATSONX_API_KEY: 'should-not-leak-key' };
  execFileSync(process.execPath, [PROBE, '--evidence', '--out', outDir], { cwd: REPO_ROOT, env });
  const md = fs.readFileSync(path.join(outDir, 'latest-watsonx-runtime-evidence.md'), 'utf8');
  const json = fs.readFileSync(path.join(outDir, 'latest-watsonx-runtime-evidence.json'), 'utf8');
  assert.ok(!md.includes('should-not-leak-key'), 'api key leaked into markdown');
  assert.ok(!json.includes('should-not-leak-key'), 'api key leaked into json');
  assert.strictEqual(JSON.parse(json).state, 'configured_missing_required_env');
  fs.rmSync(outDir, { recursive: true, force: true });
});

console.log('\n── troubleshooting WX-006 + invariant ──');

test('WX-006 appears in the scan and preserves auto-repair invariant', () => {
  const agent = require('../services/troubleshooting/troubleshooting-agent.js');
  const result = agent.runTroubleshootingScan({ rootDir: REPO_ROOT });
  const f = result.findings.find(x => x.id === 'WX-006');
  assert.ok(f, 'WX-006 must appear in scan output');
  assert.strictEqual(f.autoRepairAllowed, false);
  assert.strictEqual(f.requiresHumanApproval, true);
  // Without captured evidence it must be MANUAL (never FAIL just for absence).
  assert.ok(['manual', 'pass', 'warn'].includes(f.status), 'WX-006 must not FAIL for absent IBM env; got ' + f.status);
  assert.ok(/watsonx:runtime-probe/.test(f.remediation), 'WX-006 must reference the probe scripts');
});

console.log('\n── release evidence integration ──');

test('release evidence surfaces a watsonxRuntime summary block', () => {
  const evidence = require('../services/release/release-evidence');
  const ev = evidence.collectReleaseEvidence({ rootDir: REPO_ROOT, env: {} });
  assert.ok(Object.prototype.hasOwnProperty.call(ev, 'watsonxRuntime'), 'missing watsonxRuntime key');
  assert.strictEqual(typeof ev.watsonxRuntime.verifiedReady, 'boolean');
  const md = evidence.formatReleaseEvidenceMarkdown(ev);
  assert.ok(/watsonx runtime evidence/i.test(md), 'markdown missing watsonx section');
});

console.log('\n── renderer / preload boundary ──');

test('renderer + preload never build watsonx Authorization/Bearer/x-api-key', () => {
  const renderer = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');
  const preload = fs.readFileSync(path.join(REPO_ROOT, 'preload.js'), 'utf8');
  const authBuild = /Authorization\s*:\s*[`'"]\s*Bearer[^`'"]*WATSONX|['"`]x-api-key['"`]\s*:\s*[`'"]?\s*\$?\{?\s*WATSONX/;
  assert.ok(!authBuild.test(renderer), 'renderer builds watsonx auth header');
  assert.ok(!authBuild.test(preload), 'preload builds watsonx auth header');
});

test('renderer + preload never store watsonx/IBM keys in localStorage', () => {
  const renderer = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');
  const preload = fs.readFileSync(path.join(REPO_ROOT, 'preload.js'), 'utf8');
  const lsKey = /localStorage[^\n]*(WATSONX|IBM_CLOUD)/i;
  assert.ok(!lsKey.test(renderer), 'renderer stores watsonx/IBM key in localStorage');
  assert.ok(!lsKey.test(preload), 'preload stores watsonx/IBM key in localStorage');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} watsonx-runtime-evidence tests ===`
  : `=== FAIL — ${failed}/${total} watsonx-runtime-evidence tests failed ===`);
if (failed > 0) process.exit(1);

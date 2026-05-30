/**
 * watsonx runtime-context tests (OPEN-002 repair).
 *
 * Confirms the deterministic readiness diagnostic classifies the
 * common failure modes, redacts secret-shaped values, never echoes
 * tokens / project IDs / trace IDs, and that the renderer/preload
 * never builds auth headers for watsonx.
 *
 * Pure Node assert; no network. Run:
 *   node test/watsonx-runtime-context.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const r = require('../services/ai/watsonx-readiness');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

const html    = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
const audit   = fs.readFileSync(path.join(__dirname, '..', 'docs/audits/watsonx-runtime-context-audit.md'), 'utf8');
const kbLedger = fs.readFileSync(path.join(__dirname, '..', 'docs/troubleshooting-knowledge-base/error-repair-ledger.md'), 'utf8');

console.log('\n── watsonx readiness classifier ──');

test('STATUS constants are stable and exhaustive', () => {
  for (const k of ['READY', 'PROVIDER_DISABLED', 'MISSING_CREDENTIALS', 'MISSING_PROJECT_ID',
                   'MISSING_REGION_OR_URL', 'UNAUTHORIZED_401', 'FORBIDDEN_403',
                   'NETWORK_ERROR', 'UNKNOWN_ERROR']) {
    assert.ok(typeof r.STATUS[k] === 'string' && r.STATUS[k].length, 'missing STATUS.' + k);
  }
});

test('missing credentials classified', () => {
  assert.strictEqual(r.classifyWatsonxError({ missing: ['WATSONX_API_KEY'] }), r.STATUS.MISSING_CREDENTIALS);
});

test('missing project id classified', () => {
  assert.strictEqual(r.classifyWatsonxError({ missing: ['WATSONX_PROJECT_ID (or WATSONX_SPACE_ID)'] }), r.STATUS.MISSING_PROJECT_ID);
});

test('missing region/url classified', () => {
  assert.strictEqual(r.classifyWatsonxError({ missing: ['WATSONX_URL'] }), r.STATUS.MISSING_REGION_OR_URL);
});

test('401 classified as unauthorized_401', () => {
  assert.strictEqual(r.classifyWatsonxError({ status: 401 }), r.STATUS.UNAUTHORIZED_401);
  assert.strictEqual(r.classifyWatsonxError({ error: 'iam_auth_failed' }), r.STATUS.UNAUTHORIZED_401);
});

test('403 classified as forbidden_403', () => {
  assert.strictEqual(r.classifyWatsonxError({ status: 403 }), r.STATUS.FORBIDDEN_403);
  assert.strictEqual(r.classifyWatsonxError({ error: 'watsonx_http_403' }), r.STATUS.FORBIDDEN_403);
});

test('network failure classified safely', () => {
  assert.strictEqual(r.classifyWatsonxError({ error: 'network_error' }), r.STATUS.NETWORK_ERROR);
  assert.strictEqual(r.classifyWatsonxError({ error: 'fetch ENOTFOUND iam.cloud.ibm.com' }), r.STATUS.NETWORK_ERROR);
});

test('provider disabled classified', () => {
  assert.strictEqual(r.classifyWatsonxError({ providerDisabled: true }), r.STATUS.PROVIDER_DISABLED);
});

test('redactWatsonxError masks project_id, space_id, trace, and tokens', () => {
  const body = '{"errors":[{"code":"no_associated_service_instance_error","message":"project_id 6b51cbcb-3dd7-4316-9bec-6a555c8f19cd is not associated with a WML instance"}],"trace":"1413b61981839b7112f55615f6c64513","status_code":403}';
  const redacted = r.redactWatsonxError({ status: 403, error: 'watsonx_http_403', detail: body });
  const out = JSON.stringify(redacted);
  // Specific id and trace values must not leak
  assert.ok(!/6b51cbcb-3dd7-4316/.test(out), 'project_id value leaked');
  assert.ok(!/1413b61981839b7112f55615f6c64513/.test(out), 'trace value leaked');
  // Useful non-sensitive code survives
  assert.ok(/no_associated_service_instance_error/.test(out), 'safe IBM code missing from detail');
  // Accept either escaped or unescaped JSON quoting around status_code:403.
  assert.ok(/status_code\\?"?\s*:\s*403/.test(out), 'status_code missing');
});

test('readiness report never includes API keys, tokens, bearer values, or sk- shapes', () => {
  const fakeBody = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig sk-ant-abcdefghij1234567890 AKIAIOSFODNN7EXAMPLE';
  const cfg = { target: 'watsonx', configured: true, missing: [], url: 'https://us-south.ml.cloud.ibm.com', modelId: 'ibm/granite-13b-chat-v2', projectId: 'set', spaceId: null, apiKeyPresent: true };
  const rep = r.buildWatsonxReadinessReport(cfg, { present: { watsonx: true } }, { status: 403, error: 'watsonx_http_403', detail: fakeBody });
  const s = JSON.stringify(rep);
  assert.ok(!/eyJhbGciOiJIUzI1NiI/.test(s), 'JWT leaked');
  assert.ok(!/sk-ant-abcdefghij1234567890/.test(s), 'sk-ant key leaked');
  assert.ok(!/AKIAIOSFODNN7EXAMPLE/.test(s), 'AWS key leaked');
  assert.ok(!/Bearer\s+eyJ/.test(s), 'Bearer+token leaked');
});

test('readiness ready=true only when configured and no last error', () => {
  const cfg = { target: 'watsonx', configured: true, missing: [], url: 'https://us-south.ml.cloud.ibm.com', modelId: 'ibm/granite-13b-chat-v2', projectId: 'set', spaceId: null, apiKeyPresent: true };
  const rep = r.buildWatsonxReadinessReport(cfg, { present: { watsonx: true } }, null);
  assert.strictEqual(rep.ready, true);
  assert.strictEqual(rep.status, r.STATUS.READY);
});

test('readiness ready=false when missing fields', () => {
  const cfg = { target: 'watsonx', configured: false, missing: ['WATSONX_API_KEY'], url: null, modelId: null, projectId: null, spaceId: null };
  const rep = r.buildWatsonxReadinessReport(cfg, { present: {} }, null);
  assert.strictEqual(rep.ready, false);
  assert.strictEqual(rep.status, r.STATUS.MISSING_CREDENTIALS);
});

test('remediation steps exist for every status', () => {
  for (const status of Object.values(r.STATUS)) {
    const steps = r.getWatsonxRemediationSteps({ status });
    assert.ok(Array.isArray(steps) && steps.length, 'no steps for ' + status);
  }
});

test('403 remediation copy explicitly references account/project/region/IAM', () => {
  const steps = r.getWatsonxRemediationSteps({ status: r.STATUS.FORBIDDEN_403 }).join(' | ');
  assert.ok(/IBM account/i.test(steps), 'account missing');
  assert.ok(/project/i.test(steps), 'project missing');
  assert.ok(/region/i.test(steps), 'region missing');
  assert.ok(/model/i.test(steps), 'model access missing');
  assert.ok(/IAM/i.test(steps), 'IAM missing');
});

console.log('\n── renderer / preload boundary ──');

const decom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');

test('renderer does not build watsonx Authorization/Bearer/x-api-key', () => {
  const code = decom(html);
  // Allow descriptive references (comments/disclaimers); ban actual header construction.
  assert.ok(!/watsonx[\s\S]{0,200}['"]Authorization['"]\s*:/i.test(code), 'renderer Authorization for watsonx');
  assert.ok(!/watsonx[\s\S]{0,200}['"]x-api-key['"]\s*:/i.test(code), 'renderer x-api-key for watsonx');
  assert.ok(!/iam\.cloud\.ibm\.com[\s\S]{0,200}(Authorization|Bearer|apikey:)/i.test(code), 'renderer talking to IAM');
});

test('preload exposes only safe watsonx readiness method (no headers, no get-raw)', () => {
  const p = decom(preload);
  assert.ok(/watsonxReadiness\s*:/.test(p), 'safe watsonxReadiness method missing');
  assert.ok(!/['"]Authorization['"]\s*:/.test(p), 'preload Authorization');
  assert.ok(!/['"]x-api-key['"]\s*:/.test(p), 'preload x-api-key');
  assert.ok(!/credentials\s*:\s*\{[\s\S]*?\bget\b\s*:/.test(p), 'preload exposes credentials.get');
});

test('UI contains safe 403 remediation copy', () => {
  assert.ok(/watsonx readiness/i.test(html), 'readiness panel missing');
  assert.ok(/watsonx credentials are stored securely/i.test(html), 'disclaimer copy missing');
  assert.ok(/Run readiness check/.test(html), 'check button missing');
});

test('public docs do not claim watsonx is fully operational', () => {
  for (const f of [audit, kbLedger]) {
    assert.ok(!/watsonx[\s\S]{0,80}fully operational/i.test(f), 'fully-operational claim found');
  }
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} watsonx-runtime-context tests ===`
  : `=== FAIL — ${failed}/${total} watsonx-runtime-context tests failed ===`);
if (failed > 0) process.exit(1);

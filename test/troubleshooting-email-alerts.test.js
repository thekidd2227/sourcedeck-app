/**
 * Phase 16B — troubleshooting email-alert tests.
 *
 * Confirms the alert formatter / redactor / shouldSend gate / transport
 * stub stay safe-by-default: no live email, no secrets in body, no real
 * dependency, no auto-repair claims, no CI failure on missing config.
 *
 * Pure Node assert; no network. Run:
 *   node test/troubleshooting-email-alerts.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const alerts = require('../services/troubleshooting/troubleshooting-alerts');
const transport = require('../services/troubleshooting/troubleshooting-email-transport');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }
async function atest(name, fn) { try { await fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

const REPO_ROOT = path.resolve(__dirname, '..');

function makeResult(overrides) {
  return Object.assign({
    agent: 'sourcedeck-daily-troubleshooting-agent',
    version: 'test',
    schema: 1,
    rootDir: REPO_ROOT,
    startedAt: '2026-06-01T04:00:00Z',
    finishedAt: '2026-06-01T04:00:05Z',
    summary: { counts: { pass: 5, fail: 0, warn: 0, manual: 0, total: 5 }, failuresBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, criticalOrHighFail: 0 },
    findings: []
  }, overrides || {});
}

const FAIL_RESULT = makeResult({
  summary: { counts: { pass: 3, fail: 2, warn: 0, manual: 1, total: 6 }, failuresBySeverity: { critical: 1, high: 1, medium: 0, low: 0, info: 0 }, criticalOrHighFail: 2 },
  findings: [
    { id: 'CB-001', status: 'fail', severity: 'critical', category: 'credential_boundary', title: 'Bearer leak', remediation: 'Move to main process. Authorization: Bearer abcdef1234567890abcdef1234567890', autoRepairAllowed: false, requiresHumanApproval: true },
    { id: 'GC-002', status: 'fail', severity: 'high', category: 'govcon_safety', title: 'KILL bypass', remediation: 'Restore irreversibility', autoRepairAllowed: false, requiresHumanApproval: true },
    { id: 'WX-005', status: 'manual', severity: 'high', category: 'watsonx', title: 'OPEN-002 partially fixed', remediation: 'Operator action: IBM-side runtime migration', autoRepairAllowed: false, requiresHumanApproval: true }
  ]
});
const PASS_RESULT = makeResult();
const MANUAL_ONLY_RESULT = makeResult({
  summary: { counts: { pass: 4, fail: 0, warn: 0, manual: 2, total: 6 }, failuresBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, criticalOrHighFail: 0 },
  findings: [
    { id: 'WX-005', status: 'manual', severity: 'high', category: 'watsonx', title: 'OPEN-002 partial', remediation: '...', autoRepairAllowed: false, requiresHumanApproval: true },
    { id: 'REL-020', status: 'manual', severity: 'medium', category: 'release_readiness', title: 'macOS signing', remediation: '...', autoRepairAllowed: false, requiresHumanApproval: true }
  ]
});

console.log('\n── formatter ──');

test('subject includes status and severity count for FAIL', () => {
  const subj = alerts.buildTroubleshootingEmailSubject(FAIL_RESULT);
  assert.ok(/SourceDeck/.test(subj));
  assert.ok(/FAIL/.test(subj));
  assert.ok(/2 critical\/high/.test(subj));
  assert.ok(/1 manual/.test(subj));
});

test('subject reflects PASS / PASS (manual review)', () => {
  assert.ok(/PASS$|^\[SourceDeck\] Troubleshooting PASS/.test(alerts.buildTroubleshootingEmailSubject(PASS_RESULT)));
  assert.ok(/PASS \(manual review\)/.test(alerts.buildTroubleshootingEmailSubject(MANUAL_ONLY_RESULT)));
});

test('body includes no-auto-repair warning', () => {
  const body = alerts.buildTroubleshootingEmailBody(FAIL_RESULT, {});
  assert.ok(/No auto-repair was performed\. Human review is required\./.test(body));
});

test('body includes report paths when provided', () => {
  const body = alerts.buildTroubleshootingEmailBody(FAIL_RESULT, { markdownReportPath: '/tmp/r.md', jsonReportPath: '/tmp/r.json' });
  assert.ok(/markdown: \/tmp\/r\.md/.test(body));
  assert.ok(/json:\s+\/tmp\/r\.json/.test(body));
});

test('body lists critical/high failures and remediation', () => {
  const body = alerts.buildTroubleshootingEmailBody(FAIL_RESULT, {});
  assert.ok(/CB-001/.test(body));
  assert.ok(/GC-002/.test(body));
  assert.ok(/Remediation summary/.test(body));
});

test('body does NOT include full raw JSON of the result', () => {
  const body = alerts.buildTroubleshootingEmailBody(FAIL_RESULT, {});
  assert.ok(!/\{[^}]*"requiresHumanApproval"/.test(body), 'raw JSON of finding leaked');
});

console.log('\n── shouldSend gate ──');

test('shouldSend returns true for critical/high failures', () => {
  assert.strictEqual(alerts.shouldSendTroubleshootingAlert(FAIL_RESULT, {}), true);
});

test('shouldSend returns false on pass/manual-only by default', () => {
  assert.strictEqual(alerts.shouldSendTroubleshootingAlert(PASS_RESULT, {}), false);
  assert.strictEqual(alerts.shouldSendTroubleshootingAlert(MANUAL_ONLY_RESULT, {}), false);
});

test('shouldSend returns true for manual-only ONLY when alertOnManual:true', () => {
  assert.strictEqual(alerts.shouldSendTroubleshootingAlert(MANUAL_ONLY_RESULT, { alertOnManual: true }), true);
  assert.strictEqual(alerts.shouldSendTroubleshootingAlert(PASS_RESULT, { alertOnManual: true }), false, 'pure pass should still not alert');
});

console.log('\n── redaction ──');

test('redaction strips Bearer tokens, sk-/sk-ant- keys, JWT, long hex, AWS keys, IBM env values', () => {
  const dirty = [
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload-part.signature-part-1234',
    'sk-ant-abcdefghij1234567890abcdef',
    'sk-xxxxxxxxxxxxxxxx0123456789abcdef',
    'AKIAIOSFODNN7EXAMPLE',
    'IBM_CLOUD_API_KEY=hunter2-very-secret',
    'WATSONX_API_KEY=topsecretkeymaterial',
    'trace=' + 'a'.repeat(40),
    'Authorization: secret-thing'
  ].join('\n');
  const out = alerts.redactTroubleshootingAlert(dirty);
  assert.ok(!/eyJhbGciOiJIUzI1NiJ9\.payload-part\.signature-part-1234/.test(out), 'JWT leak');
  assert.ok(!/sk-ant-abcdefghij1234567890abcdef/.test(out), 'sk-ant leak');
  assert.ok(!/sk-xxxxxxxxxxxxxxxx0123456789abcdef/.test(out), 'sk- leak');
  assert.ok(!/AKIAIOSFODNN7EXAMPLE/.test(out), 'AWS key leak');
  assert.ok(!/hunter2-very-secret/.test(out), 'IBM key value leak');
  assert.ok(!/topsecretkeymaterial/.test(out), 'watsonx key value leak');
  assert.ok(!/[Aa]{40,}/.test(out), 'long hex blob leak');
  assert.ok(/REDACTED/.test(out));
});

console.log('\n── transport stub ──');

(async () => {
  await atest('transport returns mode:disabled when SEND flag unset', async () => {
    const res = await transport.sendTroubleshootingEmail({ to: 'x@y.z', subject: 's', body: 'b', options: { env: {} } });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.mode, 'disabled');
  });

  await atest('transport returns mode:missing_config when enabled but missing envs', async () => {
    const env = { SEND_TROUBLESHOOTING_EMAIL: 'true' };
    const res = await transport.sendTroubleshootingEmail({ to: 'x@y.z', subject: 's', body: 'b', options: { env } });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.mode, 'missing_config');
    assert.ok(Array.isArray(res.status.missing) && res.status.missing.length > 0);
  });

  await atest('transport returns mode:dry_run regardless of enablement when dryRun:true', async () => {
    const env = { SEND_TROUBLESHOOTING_EMAIL: 'true', TROUBLESHOOTING_EMAIL_TO: 'a@b.c', TROUBLESHOOTING_EMAIL_FROM: 'b@c.d', TROUBLESHOOTING_SMTP_HOST: 'smtp.x', TROUBLESHOOTING_SMTP_PORT: '587', TROUBLESHOOTING_SMTP_USER: 'u', TROUBLESHOOTING_SMTP_PASS: 'p' };
    const res = await transport.sendTroubleshootingEmail({ to: 'a@b.c', subject: 's', body: 'b', options: { env, dryRun: true } });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.mode, 'dry_run');
  });

  await atest('transport never throws and never returns sent:true in this phase', async () => {
    const env = { SEND_TROUBLESHOOTING_EMAIL: 'true', TROUBLESHOOTING_EMAIL_TO: 'a@b.c', TROUBLESHOOTING_EMAIL_FROM: 'b@c.d', TROUBLESHOOTING_SMTP_HOST: 'smtp.x', TROUBLESHOOTING_SMTP_PORT: '587', TROUBLESHOOTING_SMTP_USER: 'u', TROUBLESHOOTING_SMTP_PASS: 'p' };
    const res = await transport.sendTroubleshootingEmail({ to: 'a@b.c', subject: 's', body: 'b', options: { env } });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.mode, 'prepared_no_send');
  });

  await atest('getEmailTransportStatus never echoes user/pass values', () => {
    const env = { SEND_TROUBLESHOOTING_EMAIL: 'true', TROUBLESHOOTING_EMAIL_TO: 'a@b.c', TROUBLESHOOTING_EMAIL_FROM: 'b@c.d', TROUBLESHOOTING_SMTP_HOST: 'smtp.x', TROUBLESHOOTING_SMTP_PORT: '587', TROUBLESHOOTING_SMTP_USER: 'hunter2-username', TROUBLESHOOTING_SMTP_PASS: 'hunter2-password' };
    const st = transport.getEmailTransportStatus(env);
    const j = JSON.stringify(st);
    assert.ok(!/hunter2-username/.test(j), 'user value leaked');
    assert.ok(!/hunter2-password/.test(j), 'pass value leaked');
  });

  console.log('\n── CLI safety (dry-run; no secrets) ──');

  await atest('--email-dry-run works without secrets and never sends', () => {
    const out = execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts/run-troubleshooting-agent.js'), '--email-dry-run', '--reports-dir', path.join(REPO_ROOT, 'reports/troubleshooting')], { cwd: REPO_ROOT, env: Object.assign({}, process.env, { SEND_TROUBLESHOOTING_EMAIL: '' }) });
    const s = String(out);
    // Either no alert (no critical/high) or dry_run; never live-sent.
    assert.ok(/Email alert/.test(s) || /no critical\/high failures/.test(s));
    assert.ok(!/mode:\s*sent/i.test(s), 'must not report sent');
    assert.ok(!/hunter2/i.test(s), 'must not echo any secret-shaped string');
  });

  await atest('workflow yml uses dry-run only and does not commit/push or require email secrets', () => {
    const yml = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/daily-troubleshooting-agent.yml'), 'utf8');
    assert.ok(/troubleshooting:email-dry-run/.test(yml), 'workflow must invoke email dry-run');
    assert.ok(!/git\s+commit|git\s+push/.test(yml), 'workflow must not commit or push');
    // Forbid an actual assignment that enables live send; mentioning the
    // env-var name in a safety comment is acceptable.
    assert.ok(!/SEND_TROUBLESHOOTING_EMAIL\s*[:=]\s*["']?true["']?/i.test(yml),
      'workflow must not set live-send flag');
    assert.ok(/permissions:\s*\n\s*contents:\s*read/.test(yml), 'workflow must keep read-only permissions');
  });

  await atest('no auto-repair claims in alert/transport modules', () => {
    const a = fs.readFileSync(path.join(REPO_ROOT, 'services/troubleshooting/troubleshooting-alerts.js'), 'utf8');
    const t = fs.readFileSync(path.join(REPO_ROOT, 'services/troubleshooting/troubleshooting-email-transport.js'), 'utf8');
    for (const src of [a, t]) {
      assert.ok(!/autoRepairAllowed\s*:\s*true/.test(src), 'autoRepairAllowed:true in source');
      assert.ok(!/auto[- ]repair (enabled|allowed)\s*:?\s*true/i.test(src), 'auto-repair enabled claim');
    }
  });

  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} troubleshooting-email-alerts tests ===`
    : `=== FAIL — ${failed}/${total} troubleshooting-email-alerts tests failed ===`);
  if (failed > 0) process.exit(1);
})();

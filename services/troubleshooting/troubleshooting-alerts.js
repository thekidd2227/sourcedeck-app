// services/troubleshooting/troubleshooting-alerts.js
//
// Phase 16B — safe, deterministic email-alert formatter for the Daily
// Troubleshooting Agent.
//
// HARD RULES enforced here:
//   - Build only. No I/O. No network. No transmit.
//   - Output is presence/summary only. The full raw JSON report is NEVER
//     embedded in the email body.
//   - The body is run through redactTroubleshootingAlert() before it
//     leaves this module so any cred-shaped string in evidence/
//     remediation cannot leak (Bearer, sk-/sk-ant-, IBM keys,
//     Authorization, JWT-style payloads, long hex blobs).
//   - Default-deny send: shouldSendTroubleshootingAlert returns false
//     unless there is at least one CRITICAL/HIGH `fail`. Manual items
//     do not trigger unless { alertOnManual: true }.
//   - Carries forward the "No auto-repair was performed. Human review
//     is required." footer on every body.

'use strict';

const NO_AUTO_REPAIR_NOTE = 'No auto-repair was performed. Human review is required.';

function _str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }

function _truncate(s, max) {
  const t = _str(s);
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// ── Severity / status filters ─────────────────────────────────────────

function _isFail(f) { return f && f.status === 'fail'; }
function _isManual(f) { return f && f.status === 'manual'; }
function _isCriticalOrHighFail(f) {
  return _isFail(f) && (f.severity === 'critical' || f.severity === 'high');
}

// ── Decision ──────────────────────────────────────────────────────────

function shouldSendTroubleshootingAlert(result, options) {
  const opts = options || {};
  const summary = (result && result.summary) || {};
  const findings = (result && result.findings) || [];
  const criticalOrHigh = typeof summary.criticalOrHighFail === 'number'
    ? summary.criticalOrHighFail
    : findings.filter(_isCriticalOrHighFail).length;
  if (criticalOrHigh > 0) return true;
  if (opts.alertOnManual === true) {
    const manualCount = findings.filter(_isManual).length;
    if (manualCount > 0) return true;
  }
  return false;
}

// ── Summary digest used by subject + body ─────────────────────────────

function summarizeTroubleshootingFindings(result) {
  const summary = (result && result.summary) || {};
  const counts = summary.counts || { pass: 0, fail: 0, warn: 0, manual: 0, total: 0 };
  const sev = summary.failuresBySeverity || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const findings = (result && result.findings) || [];
  const failures = findings.filter(_isFail);
  const criticalOrHigh = failures.filter(_isCriticalOrHighFail);
  const manuals = findings.filter(_isManual);

  let overall;
  if ((counts.fail || 0) === 0 && (counts.warn || 0) === 0) overall = manuals.length > 0 ? 'pass_manual_only' : 'pass';
  else if (criticalOrHigh.length > 0) overall = 'fail_critical_high';
  else if ((counts.fail || 0) > 0) overall = 'fail_other';
  else overall = 'warn';

  return {
    overall,
    counts,
    failuresBySeverity: sev,
    criticalOrHighFailCount: criticalOrHigh.length,
    manualCount: manuals.length,
    topCriticalOrHigh: criticalOrHigh.slice(0, 10).map(f => ({
      id: f.id, severity: f.severity, category: f.category, title: f.title
    })),
    topManual: manuals.slice(0, 10).map(f => ({
      id: f.id, severity: f.severity, category: f.category, title: f.title
    }))
  };
}

// ── Subject ───────────────────────────────────────────────────────────

function buildTroubleshootingEmailSubject(result) {
  const s = summarizeTroubleshootingFindings(result);
  const ch = s.criticalOrHighFailCount;
  const tag = s.overall === 'fail_critical_high' ? 'FAIL' :
              s.overall === 'fail_other'         ? 'FAIL' :
              s.overall === 'warn'               ? 'WARN' :
              s.overall === 'pass_manual_only'   ? 'PASS (manual review)' :
                                                   'PASS';
  const sevPart = ch > 0 ? ` · ${ch} critical/high` : '';
  const manualPart = s.manualCount > 0 ? ` · ${s.manualCount} manual` : '';
  return `[SourceDeck] Troubleshooting ${tag}${sevPart}${manualPart}`;
}

// ── Redaction ─────────────────────────────────────────────────────────

// Run the body through these patterns before it leaves the formatter.
// Pure regex; no I/O. Order matters — most specific first.
const REDACTION_PATTERNS = [
  // PEM private keys
  { rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, repl: '[REDACTED_PEM_PRIVATE_KEY]' },
  // Authorization: Bearer …
  { rx: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]+/gi, repl: 'Authorization: Bearer [REDACTED]' },
  { rx: /Authorization\s*:\s*[A-Za-z0-9._\-]+/gi, repl: 'Authorization: [REDACTED]' },
  // Bare Bearer tokens
  { rx: /\bBearer\s+[A-Za-z0-9._\-]+/g, repl: 'Bearer [REDACTED]' },
  // Anthropic / OpenAI key shapes
  { rx: /\bsk-ant-[A-Za-z0-9_\-]{8,}\b/g, repl: '[REDACTED_ANTHROPIC_KEY]' },
  { rx: /\bsk-[A-Za-z0-9_\-]{16,}\b/g,    repl: '[REDACTED_OPENAI_KEY]' },
  // AWS access key id
  { rx: /\bAKIA[0-9A-Z]{16}\b/g, repl: '[REDACTED_AWS_ACCESS_KEY]' },
  // IBM Cloud / IAM API key envs and bare values
  { rx: /\b(?:IBM_CLOUD_API_KEY|WATSONX_API_KEY)\s*=\s*\S+/gi, repl: '$1=[REDACTED]' },
  // JWT-shaped strings (three base64-ish chunks separated by dots)
  { rx: /\bey[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{4,}\b/g, repl: '[REDACTED_JWT]' },
  // Long hex blobs (32+ chars) often trace ids / hashes / opaque secrets
  { rx: /\b[A-Fa-f0-9]{32,}\b/g, repl: '[REDACTED_LONG_HEX]' },
  // x-api-key headers
  { rx: /['"]x-api-key['"]\s*:\s*['"][^'"]+['"]/gi, repl: '"x-api-key":"[REDACTED]"' },
  // JSON-encoded "api_key" / "secret" / "token" / "bearer" values
  { rx: /"(api[_-]?key|secret|token|bearer)"\s*:\s*"[^"]+"/gi, repl: '"$1":"[REDACTED]"' }
];

function redactTroubleshootingAlert(text) {
  let out = _str(text);
  for (const p of REDACTION_PATTERNS) out = out.replace(p.rx, p.repl);
  return out;
}

// ── Body ──────────────────────────────────────────────────────────────

function buildTroubleshootingEmailBody(result, options) {
  const opts = options || {};
  const s = summarizeTroubleshootingFindings(result);
  const lines = [];
  lines.push(`SourceDeck Daily Troubleshooting Alert`);
  lines.push(`Scan started:  ${_str(result && result.startedAt)}`);
  lines.push(`Scan finished: ${_str(result && result.finishedAt)}`);
  lines.push(`Overall status: ${s.overall}`);
  lines.push('');
  lines.push(`Counts: pass=${s.counts.pass||0}  fail=${s.counts.fail||0}  warn=${s.counts.warn||0}  manual=${s.counts.manual||0}  total=${s.counts.total||0}`);
  const sev = s.failuresBySeverity;
  lines.push(`Failures by severity: critical=${sev.critical||0}  high=${sev.high||0}  medium=${sev.medium||0}  low=${sev.low||0}`);
  lines.push('');

  if (s.topCriticalOrHigh.length) {
    lines.push(`Critical / high failures (top ${s.topCriticalOrHigh.length}):`);
    for (const f of s.topCriticalOrHigh) {
      lines.push(`  • [${f.severity.toUpperCase()}] ${f.id} (${f.category}) — ${_truncate(f.title, 160)}`);
    }
    lines.push('');
  }

  if (s.topManual.length) {
    lines.push(`Manual-review items (top ${s.topManual.length}):`);
    for (const f of s.topManual) {
      lines.push(`  • [${f.severity.toUpperCase()}] ${f.id} (${f.category}) — ${_truncate(f.title, 160)}`);
    }
    lines.push('');
  }

  // Remediation summary — per-id one-liners. Already-classified text only.
  const findings = (result && result.findings) || [];
  const remediable = findings.filter(_isCriticalOrHighFail).slice(0, 10);
  if (remediable.length) {
    lines.push(`Remediation summary:`);
    for (const f of remediable) {
      const rem = Array.isArray(f.remediation) ? f.remediation.join(' ') : _str(f.remediation);
      if (rem) lines.push(`  • ${f.id}: ${_truncate(rem, 220)}`);
    }
    lines.push('');
  }

  // Report file paths — caller passes these so we don't touch disk here.
  if (opts.markdownReportPath || opts.jsonReportPath) {
    lines.push(`Report files:`);
    if (opts.markdownReportPath) lines.push(`  markdown: ${_str(opts.markdownReportPath)}`);
    if (opts.jsonReportPath)     lines.push(`  json:     ${_str(opts.jsonReportPath)}`);
    lines.push('');
  }

  lines.push(NO_AUTO_REPAIR_NOTE);
  lines.push('');
  lines.push('— SourceDeck Daily Troubleshooting Agent');

  return redactTroubleshootingAlert(lines.join('\n'));
}

module.exports = {
  buildTroubleshootingEmailSubject,
  buildTroubleshootingEmailBody,
  shouldSendTroubleshootingAlert,
  redactTroubleshootingAlert,
  summarizeTroubleshootingFindings,
  NO_AUTO_REPAIR_NOTE
};

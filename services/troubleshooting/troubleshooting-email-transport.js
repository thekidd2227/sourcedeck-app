// services/troubleshooting/troubleshooting-email-transport.js
//
// Phase 16B — safe-by-default email transport STUB for the Daily
// Troubleshooting Agent.
//
// THIS MODULE INTENTIONALLY DOES NOT SEND EMAIL.
// It returns the prepared payload metadata so callers can verify wiring
// without any external side effect. A real SMTP/nodemailer integration
// is a separate, gated step that requires:
//   1. SEND_TROUBLESHOOTING_EMAIL === "true"
//   2. Every required env var present
//   3. Explicit approval recorded in the KB
//
// Defaults guarantee that:
//   - Live email is OFF unless the explicit env flag is set.
//   - Missing config NEVER throws — returns { sent:false, mode:'missing_config' }.
//   - No secret values are ever printed or echoed in the result.

'use strict';

const REQUIRED_ENV = Object.freeze([
  'TROUBLESHOOTING_EMAIL_TO',
  'TROUBLESHOOTING_EMAIL_FROM',
  'TROUBLESHOOTING_SMTP_HOST',
  'TROUBLESHOOTING_SMTP_PORT',
  'TROUBLESHOOTING_SMTP_USER',
  'TROUBLESHOOTING_SMTP_PASS'
]);

function _str(v) { return typeof v === 'string' ? v.trim() : ''; }

// Renderer-/log-safe presence-only env snapshot. NEVER returns values
// for secret-shaped vars (USER, PASS). Returns a list of missing var
// NAMES only.
function getEmailTransportStatus(envIn) {
  const env = envIn || process.env || {};
  const present = {};
  const missing = [];
  for (const name of REQUIRED_ENV) {
    if (_str(env[name])) present[name] = true;
    else missing.push(name);
  }
  const enabled = _str(env.SEND_TROUBLESHOOTING_EMAIL) === 'true';
  return Object.freeze({
    enabled,
    configured: missing.length === 0,
    missing,
    // Non-secret echo: host:port + to/from only (never USER/PASS values).
    host:  present.TROUBLESHOOTING_SMTP_HOST ? _str(env.TROUBLESHOOTING_SMTP_HOST) : null,
    port:  present.TROUBLESHOOTING_SMTP_PORT ? _str(env.TROUBLESHOOTING_SMTP_PORT) : null,
    to:    present.TROUBLESHOOTING_EMAIL_TO   ? _str(env.TROUBLESHOOTING_EMAIL_TO)   : null,
    from:  present.TROUBLESHOOTING_EMAIL_FROM ? _str(env.TROUBLESHOOTING_EMAIL_FROM) : null,
    note: 'Live SMTP send is intentionally NOT implemented in this phase. This stub returns prepared payload metadata only.'
  });
}

// Decision + payload-prep entry point. Inputs:
//   { to?, subject, body, options? { dryRun?, env?, alertOnManual? } }
// Output (never throws):
//   { sent, mode, status, recipient, subjectLength, bodyLength, error? }
async function sendTroubleshootingEmail(input) {
  const inp = input || {};
  const opts = inp.options || {};
  const env = opts.env || process.env || {};
  const status = getEmailTransportStatus(env);

  const subject = _str(inp.subject);
  const body    = _str(inp.body);
  const to      = _str(inp.to) || _str(env.TROUBLESHOOTING_EMAIL_TO);

  // Explicit dry-run never sends, regardless of config.
  if (opts.dryRun === true) {
    return Object.freeze({
      sent: false, mode: 'dry_run', status,
      recipient: to || null,
      subjectLength: subject.length, bodyLength: body.length
    });
  }
  // Default-deny: off unless env explicitly enables.
  if (!status.enabled) {
    return Object.freeze({
      sent: false, mode: 'disabled', status,
      recipient: to || null,
      subjectLength: subject.length, bodyLength: body.length
    });
  }
  // Enabled but config missing → no send, no throw.
  if (!status.configured) {
    return Object.freeze({
      sent: false, mode: 'missing_config', status,
      recipient: to || null,
      subjectLength: subject.length, bodyLength: body.length
    });
  }
  // Enabled + configured: STILL no live send in this phase. Return a
  // safe payload-prepared mode so callers can confirm wiring without
  // any external side effect. A real SMTP send is a future, separately
  // gated step.
  return Object.freeze({
    sent: false, mode: 'prepared_no_send', status,
    recipient: to || null,
    subjectLength: subject.length, bodyLength: body.length,
    note: 'Live transmission is intentionally NOT implemented in this phase.'
  });
}

module.exports = {
  sendTroubleshootingEmail,
  getEmailTransportStatus,
  REQUIRED_ENV
};

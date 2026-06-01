// services/release/macos-signing-readiness.js
//
// Phase 17A — deterministic macOS signing & notarization readiness
// diagnostic. NO Apple credentials are read here; we read PRESENCE of
// the env var names only, plus the public packaging config in
// `package.json`. The renderer-/log-safe output never contains a value.
//
// HARD RULES enforced here:
//   - Presence-only checks. Never return secret values.
//   - Required env names are checked by NAME, never by value.
//   - Do not require credentials in CI; local dev returns a
//     non-blocking `unsigned_dev_ok` state.
//   - `--strict` / public-release callers get `blocked_*` codes when
//     required env or config is missing.
//   - Redactor sweeps any text payload before it leaves this module so
//     a caller cannot accidentally surface a secret-shaped value
//     (CSC_KEY_PASSWORD, APPLE_APP_SPECIFIC_PASSWORD, p12 paths, etc.).
//
// Pure functions. No network. No I/O except synchronous local file
// existence checks under `rootDir`.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── stable classification codes ──────────────────────────────────────
const STATUS = Object.freeze({
  READY_TO_SIGN:               'ready_to_sign',
  PARTIAL_SIGNING:             'partial_signing',
  BLOCKED_NOTARIZE_OFF:        'blocked_notarize_off',
  BLOCKED_MISSING_SIGNING:     'blocked_missing_signing',
  BLOCKED_MISSING_ENTITLEMENTS:'blocked_missing_entitlements',
  UNSIGNED_DEV_OK:             'unsigned_dev_ok',
  UNKNOWN:                     'unknown'
});

// Env vars we recognize (by NAME only).
const SIGNING_ENV = Object.freeze(['CSC_LINK', 'CSC_KEY_PASSWORD']);
const NOTARIZE_ENV = Object.freeze(['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']);
// Alternative notarization via App Store Connect API key.
const NOTARIZE_API_ENV = Object.freeze(['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']);

function _str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }

// Presence-only env snapshot. NEVER returns values.
function getMacSigningEnvStatus(envIn) {
  const env = envIn || process.env || {};
  const present = {};
  const missing = [];
  for (const n of SIGNING_ENV) (env[n] && _str(env[n]).length > 0) ? (present[n] = true) : missing.push(n);
  const signingComplete = missing.length === 0;

  const notMissing = []; const notPresent = {};
  for (const n of NOTARIZE_ENV) (env[n] && _str(env[n]).length > 0) ? (notPresent[n] = true) : notMissing.push(n);
  const notarizeComplete = notMissing.length === 0;

  const apiMissing = []; const apiPresent = {};
  for (const n of NOTARIZE_API_ENV) (env[n] && _str(env[n]).length > 0) ? (apiPresent[n] = true) : apiMissing.push(n);
  const notarizeApiComplete = apiMissing.length === 0;

  return Object.freeze({
    signing: { present, missing, complete: signingComplete },
    notarize: { present: notPresent, missing: notMissing, complete: notarizeComplete },
    notarizeApi: { present: apiPresent, missing: apiMissing, complete: notarizeApiComplete },
    anyNotarize: notarizeComplete || notarizeApiComplete,
    note: 'Presence-only — no values are read or returned by this module.'
  });
}

// Validate the public packaging config + filesystem prerequisites.
// All checks are presence/existence; no secrets touched.
function validateMacSigningConfig(rootDir, envIn) {
  const root = rootDir || process.cwd();
  const env = envIn || process.env || {};
  const out = {
    rootDir: root,
    envStatus: getMacSigningEnvStatus(env),
    packageJsonNotarizeFlag: null,
    entitlementsFilePresent: false,
    entitlementsRelPath: null,
    iconFilePresent: false,
    iconRelPath: null,
    hardenedRuntime: null,
    fileChecks: { ok: true, missing: [] }
  };

  // Read package.json safely.
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch (_) {}
  const mac = (pkg && pkg.build && pkg.build.mac) || null;
  if (mac) {
    out.packageJsonNotarizeFlag = mac.notarize === true ? true : (mac.notarize === false ? false : null);
    out.hardenedRuntime = mac.hardenedRuntime === true ? true : (mac.hardenedRuntime === false ? false : null);
    if (typeof mac.entitlements === 'string') {
      out.entitlementsRelPath = mac.entitlements;
      out.entitlementsFilePresent = fs.existsSync(path.join(root, mac.entitlements));
    }
    if (typeof mac.icon === 'string') {
      out.iconRelPath = mac.icon;
      out.iconFilePresent = fs.existsSync(path.join(root, mac.icon));
    }
  }
  if (out.entitlementsRelPath && !out.entitlementsFilePresent) out.fileChecks.missing.push(out.entitlementsRelPath);
  if (out.iconRelPath && !out.iconFilePresent) out.fileChecks.missing.push(out.iconRelPath);
  if (out.fileChecks.missing.length) out.fileChecks.ok = false;
  return Object.freeze(out);
}

// Classify the validation report into a stable status. The `mode`
// option chooses whether missing Apple env is non-blocking (local dev)
// or blocking (`strict`/public release).
function classifyMacSigningReadiness(report, options) {
  const r = report || {};
  const opts = options || {};
  const mode = opts.mode === 'strict' ? 'strict' : 'dev';
  const env = r.envStatus || getMacSigningEnvStatus(opts.env || process.env);

  // Entitlements / icon are required REGARDLESS of mode.
  if (r.fileChecks && r.fileChecks.ok === false) return STATUS.BLOCKED_MISSING_ENTITLEMENTS;

  // strict: production gate.
  if (mode === 'strict') {
    if (!env.signing.complete) return STATUS.BLOCKED_MISSING_SIGNING;
    if (!env.anyNotarize) return STATUS.BLOCKED_MISSING_SIGNING;
    if (r.packageJsonNotarizeFlag !== true) return STATUS.BLOCKED_NOTARIZE_OFF;
    return STATUS.READY_TO_SIGN;
  }

  // dev mode (default).
  if (!env.signing.complete && !env.anyNotarize) return STATUS.UNSIGNED_DEV_OK;
  if (env.signing.complete && env.anyNotarize && r.packageJsonNotarizeFlag === true) return STATUS.READY_TO_SIGN;
  if (env.signing.complete && env.anyNotarize && r.packageJsonNotarizeFlag !== true) return STATUS.BLOCKED_NOTARIZE_OFF;
  return STATUS.PARTIAL_SIGNING;
}

// Strip any cred-shaped value that might have been included in a free-
// text remediation/report payload. Order matters; most specific first.
const REDACTION_PATTERNS = [
  { rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, repl: '[REDACTED_PEM_PRIVATE_KEY]' },
  { rx: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, repl: '[REDACTED_PEM_CERT]' },
  { rx: /\b(CSC_KEY_PASSWORD|APPLE_APP_SPECIFIC_PASSWORD|CSC_LINK|APPLE_ID|APPLE_TEAM_ID|APPLE_API_KEY|APPLE_API_KEY_ID|APPLE_API_ISSUER)\s*=\s*\S+/g, repl: '$1=[REDACTED]' },
  { rx: /Developer ID Application:[^\n"]+/g, repl: 'Developer ID Application: [REDACTED]' },
  { rx: /\bp12\s*:\s*\S+/gi, repl: 'p12: [REDACTED]' },
  { rx: /\b[A-Za-z0-9+/]{60,}={0,2}\b/g, repl: '[REDACTED_LONG_BASE64]' },
  { rx: /\b[A-Fa-f0-9]{32,}\b/g, repl: '[REDACTED_LONG_HEX]' }
];

function redactSigningReadinessReport(text) {
  let out = _str(text);
  for (const p of REDACTION_PATTERNS) out = out.replace(p.rx, p.repl);
  return out;
}

function getMacSigningRemediationSteps(report) {
  const r = report || {};
  const status = r.status || classifyMacSigningReadiness(r, { mode: 'dev' });
  switch (status) {
    case STATUS.READY_TO_SIGN:
      return ['Ready to sign and notarize. Run `npm run build:mac` then `node scripts/release-check.js --publish`.'];
    case STATUS.UNSIGNED_DEV_OK:
      return [
        'Local dev only — no Apple credentials present. This is acceptable for development.',
        'For a public release, run `npm run release:mac-signing-readiness:strict` from a signing environment.'
      ];
    case STATUS.PARTIAL_SIGNING:
      return [
        'Signing or notarization env partially present.',
        'For signing: set CSC_LINK and CSC_KEY_PASSWORD.',
        'For notarization: set APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID, or APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER.',
        'Then re-run `npm run release:mac-signing-readiness:strict`.'
      ];
    case STATUS.BLOCKED_NOTARIZE_OFF:
      return [
        'Signing/notarization env present but package.json `build.mac.notarize` is false.',
        'Flip `"notarize": true` in package.json before producing a public release artifact.',
        'Re-run `npm run release:mac-signing-readiness:strict` to confirm.'
      ];
    case STATUS.BLOCKED_MISSING_SIGNING:
      return [
        'Strict / public-release gate: required Apple signing or notarization env is missing.',
        'Set CSC_LINK + CSC_KEY_PASSWORD (signing) and either the 3 APPLE_* envs or the 3 APPLE_API_* envs (notarization).',
        'Do not publish a macOS build until `npm run release:mac-signing-readiness:strict` reports ready_to_sign.'
      ];
    case STATUS.BLOCKED_MISSING_ENTITLEMENTS:
      return [
        'Required packaging files are missing (entitlements plist and/or app icon).',
        'Restore the file(s) listed in the readiness report under fileChecks.missing.'
      ];
    default:
      return ['Unable to classify macOS signing readiness; inspect the validation report.'];
  }
}

// Build the complete, renderer-safe readiness report (no values).
function buildMacSigningReadinessReport(rootDir, envIn, options) {
  const opts = options || {};
  const validation = validateMacSigningConfig(rootDir, envIn);
  const status = classifyMacSigningReadiness(validation, { mode: opts.mode || 'dev', env: opts.env });
  const remediation = getMacSigningRemediationSteps({ status });
  return Object.freeze({
    module: 'macos-signing-readiness',
    mode: opts.mode === 'strict' ? 'strict' : 'dev',
    rootDir: validation.rootDir,
    envStatus: validation.envStatus,
    packageJsonNotarizeFlag: validation.packageJsonNotarizeFlag,
    hardenedRuntime: validation.hardenedRuntime,
    entitlements: { path: validation.entitlementsRelPath, present: validation.entitlementsFilePresent },
    icon: { path: validation.iconRelPath, present: validation.iconFilePresent },
    fileChecks: validation.fileChecks,
    status,
    ready: status === STATUS.READY_TO_SIGN,
    remediation,
    note: 'Presence-only. No Apple credentials are read or returned by this module.'
  });
}

// Human-readable formatter (passes the result through the redactor as a
// belt-and-braces step).
function formatMacSigningReadinessReport(report) {
  const r = report || {};
  const lines = [];
  lines.push('── macOS Signing & Notarization Readiness ──');
  lines.push(`mode:                ${r.mode || 'dev'}`);
  lines.push(`status:              ${r.status || 'unknown'}`);
  lines.push(`ready:               ${r.ready === true ? 'yes' : 'no'}`);
  lines.push(`notarize flag:       ${r.packageJsonNotarizeFlag === true ? 'true' : r.packageJsonNotarizeFlag === false ? 'false' : 'unknown'}`);
  lines.push(`hardenedRuntime:     ${r.hardenedRuntime === true ? 'true' : 'unknown/false'}`);
  lines.push(`entitlements path:   ${(r.entitlements && r.entitlements.path) || 'unknown'}  present: ${(r.entitlements && r.entitlements.present) ? 'yes' : 'no'}`);
  lines.push(`icon path:           ${(r.icon && r.icon.path) || 'unknown'}  present: ${(r.icon && r.icon.present) ? 'yes' : 'no'}`);
  if (r.envStatus) {
    lines.push(`signing env:         present=${Object.keys(r.envStatus.signing.present || {}).join(',') || 'none'}; missing=${(r.envStatus.signing.missing || []).join(',') || 'none'}`);
    lines.push(`notarize env:        present=${Object.keys(r.envStatus.notarize.present || {}).join(',') || 'none'}; missing=${(r.envStatus.notarize.missing || []).join(',') || 'none'}`);
    lines.push(`notarize API env:    present=${Object.keys(r.envStatus.notarizeApi.present || {}).join(',') || 'none'}; missing=${(r.envStatus.notarizeApi.missing || []).join(',') || 'none'}`);
  }
  if (r.fileChecks && r.fileChecks.missing && r.fileChecks.missing.length) {
    lines.push(`missing files:       ${r.fileChecks.missing.join(', ')}`);
  }
  lines.push('');
  lines.push('Remediation:');
  for (const step of (r.remediation || [])) lines.push('  • ' + step);
  lines.push('');
  lines.push(r.note || 'Presence-only. No Apple credentials are read or returned by this module.');
  return redactSigningReadinessReport(lines.join('\n'));
}

module.exports = {
  STATUS,
  SIGNING_ENV,
  NOTARIZE_ENV,
  NOTARIZE_API_ENV,
  getMacSigningEnvStatus,
  validateMacSigningConfig,
  classifyMacSigningReadiness,
  redactSigningReadinessReport,
  getMacSigningRemediationSteps,
  buildMacSigningReadinessReport,
  formatMacSigningReadinessReport
};

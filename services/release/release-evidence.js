// services/release/release-evidence.js
//
// Phase 17B — deterministic, secrets-free release artifact evidence
// capture for SourceDeck.
//
// HARD RULES enforced here:
//   - Presence-only for any credential-shaped field. Never includes
//     raw values for Apple env, SMTP env, AI provider keys, IBM keys,
//     Bearer tokens, JWTs, or certificates/private keys.
//   - Captures evidence; does NOT sign, notarize, build, publish, or
//     upload anything externally.
//   - Pure functions plus synchronous local FS / `git` / `asar list`
//     subprocess calls. No network.
//   - Every text payload that leaves this module passes through
//     `redactReleaseEvidence()` as a belt-and-braces guard.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProc = require('node:child_process');

const signingReadiness = require('./macos-signing-readiness.js');

// Stable evidence states.
const STATE = Object.freeze({
  LOCAL_UNSIGNED_DEV:               'local_unsigned_dev',
  SIGNING_READY:                    'signing_ready',
  SIGNING_BLOCKED_MISSING_CREDENTIALS: 'signing_blocked_missing_credentials',
  NO_PACKAGED_ARTIFACT:             'no_packaged_artifact',
  PACKAGED_UNSIGNED:                'packaged_unsigned',
  PACKAGED_SIGNED_UNVERIFIED:       'packaged_signed_unverified',
  PACKAGED_SIGNED_VERIFIED:         'packaged_signed_verified'
});

const REQUIRED_ASAR_FILES = Object.freeze([
  '/main.js',
  '/preload.js',
  '/sourcedeck.html',
  '/chartnav-integration.js'
]);

// ── tiny helpers ────────────────────────────────────────────────────
function _str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
function _exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function _gitCmd(rootDir, args) {
  try {
    return childProc.execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) { return ''; }
}

// ── package metadata (no secrets) ───────────────────────────────────
function collectPackageMetadata(rootDir) {
  const root = rootDir || process.cwd();
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch (_) {}
  if (!pkg) return { ok: false };
  const build = pkg.build || {};
  const mac = build.mac || {};
  return {
    ok: true,
    name: _str(pkg.name),
    version: _str(pkg.version),
    productName: _str(pkg.productName || (build.productName || '')),
    appId: _str(build.appId),
    files: Array.isArray(build.files) ? build.files.slice() : [],
    mac: {
      notarize: mac.notarize === true,
      hardenedRuntime: mac.hardenedRuntime === true,
      entitlements: _str(mac.entitlements),
      icon: _str(mac.icon),
      targets: Array.isArray(mac.target) ? mac.target.map(t => t.target) : []
    }
  };
}

// ── asar metadata ───────────────────────────────────────────────────
function collectAsarMetadata(rootDir) {
  const root = rootDir || process.cwd();
  const appPath = path.join(root, 'dist', 'mac', 'SourceDeck.app');
  const asarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');
  const out = {
    present: _exists(asarPath),
    path: path.relative(root, asarPath),
    appPath: path.relative(root, appPath),
    requiredFiles: { ok: false, expected: REQUIRED_ASAR_FILES.slice(), missing: REQUIRED_ASAR_FILES.slice() },
    entries: 0
  };
  if (!out.present) return out;
  const asarBin = path.join(root, 'node_modules', '.bin', 'asar');
  if (!_exists(asarBin)) {
    out.requiredFiles.note = 'asar binary not installed; cannot list entries';
    return out;
  }
  try {
    const listing = childProc.execFileSync(asarBin, ['list', asarPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const entries = new Set(listing.split('\n').filter(Boolean));
    out.entries = entries.size;
    const missing = REQUIRED_ASAR_FILES.filter(f => !entries.has(f));
    out.requiredFiles = { ok: missing.length === 0, expected: REQUIRED_ASAR_FILES.slice(), missing };
  } catch (e) {
    out.requiredFiles = { ok: false, expected: REQUIRED_ASAR_FILES.slice(), missing: REQUIRED_ASAR_FILES.slice(), error: 'asar_list_failed' };
  }
  return out;
}

// ── signing readiness evidence (delegates) ──────────────────────────
function collectSigningReadinessEvidence(rootDir, env, opts) {
  const o = opts || {};
  return signingReadiness.buildMacSigningReadinessReport(rootDir || process.cwd(), env || process.env, { mode: o.mode || 'dev' });
}

// ── troubleshooting evidence (paths + summary) ──────────────────────
function collectTroubleshootingEvidence(rootDir) {
  const root = rootDir || process.cwd();
  const dir = path.join(root, 'reports', 'troubleshooting');
  const latestMd = path.join(dir, 'latest-troubleshooting-report.md');
  const latestJson = path.join(dir, 'latest-troubleshooting-report.json');
  const out = {
    latestMarkdownPath: _exists(latestMd) ? path.relative(root, latestMd) : null,
    latestJsonPath:     _exists(latestJson) ? path.relative(root, latestJson) : null,
    summary: null
  };
  if (out.latestJsonPath) {
    try {
      const j = JSON.parse(fs.readFileSync(latestJson, 'utf8'));
      out.summary = j.summary || null;
    } catch (_) {}
  }
  return out;
}

// ── watsonx runtime evidence (paths + redacted summary) ─────────────
// Reads the latest captured watsonx runtime evidence if a report exists.
// Presence-only summary; never fails release:evidence when watsonx is
// not configured. The underlying report is already redacted by the
// probe; we re-redact any free text on the way out.
function collectWatsonxRuntimeEvidence(rootDir) {
  const root = rootDir || process.cwd();
  const dir = path.join(root, 'reports', 'watsonx-runtime');
  const latestMd = path.join(dir, 'latest-watsonx-runtime-evidence.md');
  const latestJson = path.join(dir, 'latest-watsonx-runtime-evidence.json');
  const out = {
    present: _exists(latestJson) || _exists(latestMd),
    latestMarkdownPath: _exists(latestMd) ? path.relative(root, latestMd) : null,
    latestJsonPath:     _exists(latestJson) ? path.relative(root, latestJson) : null,
    state: null,
    outcome: null,
    verifiedReady: false,
    blockedReason: null
  };
  if (out.latestJsonPath) {
    try {
      const j = JSON.parse(fs.readFileSync(latestJson, 'utf8'));
      out.state = j.state || null;
      out.outcome = j.outcome || null;
      out.verifiedReady = j.verifiedReady === true;
      out.blockedReason = j.blockedReason || null;
    } catch (_) {}
  }
  return out;
}

// ── gate evidence (NOT run here; reports the COMMANDS that should run) ──
function collectGateEvidence() {
  // We do NOT execute gates here — that's the CLI/runner's job and
  // tests should not invoke long-running gates from a unit module.
  // Instead, surface the canonical command names. Callers (CLI / CI)
  // can write per-gate ok/ran flags via a follow-up call if desired.
  return {
    commands: Object.freeze([
      'npm test',
      'npm run release:mac-signing-readiness',
      'npm run troubleshooting:scan',
      'npm run troubleshooting:scan:json',
      'npm run troubleshooting:email-dry-run',
      'npm run govcon:smoke',
      'npm run govcon:outreach-os:audit',
      'npm run phase13:rc-check',
      'npm run i18n:audit',
      'node scripts/release-check.js'
    ]),
    note: 'These commands should be run by the CLI / CI; this module does not execute them.'
  };
}

// ── redaction (belt-and-braces on any free-text payload) ────────────
const REDACTION_PATTERNS = [
  { rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, repl: '[REDACTED_PEM_PRIVATE_KEY]' },
  { rx: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, repl: '[REDACTED_PEM_CERT]' },
  { rx: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]+/gi, repl: 'Authorization: Bearer [REDACTED]' },
  { rx: /\bBearer\s+[A-Za-z0-9._\-]+/g, repl: 'Bearer [REDACTED]' },
  { rx: /\bsk-ant-[A-Za-z0-9_\-]{8,}\b/g, repl: '[REDACTED_ANTHROPIC_KEY]' },
  { rx: /\bsk-[A-Za-z0-9_\-]{16,}\b/g,    repl: '[REDACTED_OPENAI_KEY]' },
  { rx: /\bAKIA[0-9A-Z]{16}\b/g, repl: '[REDACTED_AWS_ACCESS_KEY]' },
  { rx: /\b(CSC_LINK|CSC_KEY_PASSWORD|APPLE_ID|APPLE_APP_SPECIFIC_PASSWORD|APPLE_TEAM_ID|APPLE_API_KEY|APPLE_API_KEY_ID|APPLE_API_ISSUER|IBM_CLOUD_API_KEY|WATSONX_API_KEY|TROUBLESHOOTING_SMTP_USER|TROUBLESHOOTING_SMTP_PASS)\s*=\s*\S+/g, repl: '$1=[REDACTED]' },
  { rx: /Developer ID Application:[^\n"]+/g, repl: 'Developer ID Application: [REDACTED]' },
  { rx: /\bey[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{4,}\b/g, repl: '[REDACTED_JWT]' },
  { rx: /\b[A-Fa-f0-9]{32,}\b/g, repl: '[REDACTED_LONG_HEX]' },
  { rx: /['"]x-api-key['"]\s*:\s*['"][^'"]+['"]/gi, repl: '"x-api-key":"[REDACTED]"' },
  { rx: /"(api[_-]?key|secret|token|bearer)"\s*:\s*"[^"]+"/gi, repl: '"$1":"[REDACTED]"' }
];
function redactReleaseEvidence(text) {
  let out = _str(text);
  for (const p of REDACTION_PATTERNS) out = out.replace(p.rx, p.repl);
  return out;
}

// ── classification: pick a stable evidence state ────────────────────
function _classifyState(evidence) {
  const ev = evidence || {};
  const sign = ev.signing || {};
  const asar = ev.asar || {};
  const signedVerified = ev.releaseCheck && ev.releaseCheck.codesignVerified === true;
  if (asar.present && signedVerified) return STATE.PACKAGED_SIGNED_VERIFIED;
  if (asar.present && ev.releaseCheck && ev.releaseCheck.codesignAttempted === true && signedVerified !== true) return STATE.PACKAGED_SIGNED_UNVERIFIED;
  if (asar.present) return STATE.PACKAGED_UNSIGNED;
  // No artifact present.
  if (sign.status === signingReadiness.STATUS.READY_TO_SIGN) return STATE.SIGNING_READY;
  if (sign.status === signingReadiness.STATUS.BLOCKED_MISSING_SIGNING) return STATE.SIGNING_BLOCKED_MISSING_CREDENTIALS;
  if (sign.status === signingReadiness.STATUS.UNSIGNED_DEV_OK) return STATE.LOCAL_UNSIGNED_DEV;
  return STATE.NO_PACKAGED_ARTIFACT;
}

// ── top-level collect ───────────────────────────────────────────────
function collectReleaseEvidence(options) {
  const opts = options || {};
  const root = opts.rootDir || process.cwd();
  const env = opts.env || process.env;
  const mode = opts.mode === 'strict' ? 'strict' : 'dev';

  const branch = _gitCmd(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  // Use the short SHA — a 7-char prefix is the conventional public form
  // and avoids the long-hex redactor pattern (>= 32 hex chars).
  const commit = _gitCmd(root, ['rev-parse', '--short', 'HEAD']);
  const dirtyOut = _gitCmd(root, ['status', '--porcelain']);
  const dirty = dirtyOut.length > 0;

  const pkg = collectPackageMetadata(root);
  const asar = collectAsarMetadata(root);
  const signing = collectSigningReadinessEvidence(root, env, { mode });
  const troubleshooting = collectTroubleshootingEvidence(root);
  const watsonxRuntime = collectWatsonxRuntimeEvidence(root);
  const gates = collectGateEvidence();

  const evidence = {
    module: 'release-evidence',
    generatedAt: opts.generatedAt || new Date().toISOString(),
    rootDir: root,
    mode,
    git: { branch, commit, dirty },
    package: pkg,
    asar,
    signing,
    troubleshooting,
    watsonxRuntime,
    gates,
    releaseCheck: opts.releaseCheck || { ok: null, warnings: [], codesignAttempted: false, codesignVerified: null },
    warnings: [],
    blockers: [],
    note: 'Presence-only; no Apple credentials, SMTP credentials, AI provider keys, IBM keys, or signing identities are included.'
  };

  // Warnings / blockers.
  if (dirty) evidence.warnings.push('Working tree is dirty; consider committing changes before capturing release evidence.');
  if (pkg.ok && pkg.mac && pkg.mac.entitlements && !_exists(path.join(root, pkg.mac.entitlements))) {
    evidence.blockers.push('Missing entitlements file: ' + pkg.mac.entitlements);
  }
  if (pkg.ok && pkg.mac && pkg.mac.icon && !_exists(path.join(root, pkg.mac.icon))) {
    evidence.blockers.push('Missing icon file: ' + pkg.mac.icon);
  }
  if (asar.present && asar.requiredFiles && asar.requiredFiles.ok === false && asar.requiredFiles.missing && asar.requiredFiles.missing.length) {
    evidence.blockers.push('Packaged asar is missing required files: ' + asar.requiredFiles.missing.join(', '));
  }
  if (mode === 'strict') {
    if (signing.status !== signingReadiness.STATUS.READY_TO_SIGN) {
      evidence.blockers.push('Strict mode: signing readiness is "' + signing.status + '" (expected ready_to_sign).');
    }
    if (dirty) evidence.blockers.push('Strict mode: working tree must be clean.');
  }

  evidence.state = _classifyState(evidence);
  return Object.freeze(evidence);
}

// ── formatters ──────────────────────────────────────────────────────
function formatReleaseEvidenceJson(evidence) {
  return redactReleaseEvidence(JSON.stringify(evidence, null, 2));
}

function formatReleaseEvidenceMarkdown(evidence) {
  const e = evidence || {};
  const lines = [];
  lines.push('# Release Evidence — SourceDeck');
  lines.push('');
  lines.push('- Generated: ' + (e.generatedAt || ''));
  lines.push('- Module:    ' + (e.module || ''));
  lines.push('- Mode:      ' + (e.mode || 'dev'));
  lines.push('- State:     **' + (e.state || 'unknown') + '**');
  lines.push('');
  lines.push('## Git');
  lines.push('- branch: ' + ((e.git && e.git.branch) || '(unknown)'));
  lines.push('- commit: ' + ((e.git && e.git.commit) || '(unknown)'));
  lines.push('- dirty:  ' + ((e.git && e.git.dirty) === true ? 'yes' : 'no'));
  lines.push('');
  lines.push('## Package');
  const p = e.package || {};
  lines.push('- name:        ' + p.name);
  lines.push('- version:     ' + p.version);
  lines.push('- productName: ' + p.productName);
  lines.push('- appId:       ' + p.appId);
  if (p.mac) {
    lines.push('- mac.notarize:        ' + p.mac.notarize);
    lines.push('- mac.hardenedRuntime: ' + p.mac.hardenedRuntime);
    lines.push('- mac.entitlements:    ' + p.mac.entitlements);
    lines.push('- mac.icon:            ' + p.mac.icon);
    lines.push('- mac.targets:         ' + (p.mac.targets || []).join(', '));
  }
  lines.push('');
  lines.push('## Packaged asar');
  const a = e.asar || {};
  lines.push('- present: ' + (a.present ? 'yes' : 'no'));
  lines.push('- path:    ' + (a.path || ''));
  if (a.present) {
    lines.push('- entries: ' + (a.entries || 0));
    if (a.requiredFiles) {
      lines.push('- required files ok: ' + (a.requiredFiles.ok ? 'yes' : 'no'));
      if (a.requiredFiles.missing && a.requiredFiles.missing.length) {
        lines.push('- missing required files: ' + a.requiredFiles.missing.join(', '));
      }
    }
  }
  lines.push('');
  lines.push('## Signing readiness');
  const s = e.signing || {};
  lines.push('- status:                ' + (s.status || ''));
  lines.push('- ready:                 ' + (s.ready === true ? 'yes' : 'no'));
  lines.push('- packageJsonNotarize:   ' + (s.packageJsonNotarizeFlag === true ? 'true' : 'false'));
  if (s.entitlements) lines.push('- entitlements present:  ' + (s.entitlements.present ? 'yes' : 'no'));
  if (s.icon)         lines.push('- icon present:          ' + (s.icon.present ? 'yes' : 'no'));
  lines.push('');
  lines.push('## Troubleshooting');
  const t = e.troubleshooting || {};
  lines.push('- latest markdown: ' + (t.latestMarkdownPath || '(none)'));
  lines.push('- latest json:     ' + (t.latestJsonPath || '(none)'));
  if (t.summary) {
    lines.push('- counts: pass=' + (t.summary.counts && t.summary.counts.pass) +
               ' fail=' + (t.summary.counts && t.summary.counts.fail) +
               ' warn=' + (t.summary.counts && t.summary.counts.warn) +
               ' manual=' + (t.summary.counts && t.summary.counts.manual));
  }
  lines.push('');
  lines.push('## watsonx runtime evidence');
  const wx = e.watsonxRuntime || {};
  lines.push('- present:        ' + (wx.present ? 'yes' : 'no'));
  lines.push('- state:          ' + (wx.state || '(none)'));
  lines.push('- outcome:        ' + (wx.outcome || '(none)'));
  lines.push('- verified_ready: ' + (wx.verifiedReady === true ? 'yes' : 'no'));
  if (wx.blockedReason) lines.push('- blocked reason: ' + wx.blockedReason);
  if (wx.latestJsonPath) lines.push('- latest json:    ' + wx.latestJsonPath);
  lines.push('');
  lines.push('## Release-check summary');
  const rc = e.releaseCheck || {};
  lines.push('- ok:                ' + (rc.ok === null ? 'unknown' : (rc.ok ? 'yes' : 'no')));
  lines.push('- codesign attempted: ' + (rc.codesignAttempted ? 'yes' : 'no'));
  lines.push('- codesign verified:  ' + (rc.codesignVerified === null ? 'unknown' : (rc.codesignVerified ? 'yes' : 'no')));
  if (rc.warnings && rc.warnings.length) {
    lines.push('- warnings:');
    for (const w of rc.warnings) lines.push('  • ' + w);
  }
  lines.push('');
  lines.push('## Gate commands (run by CLI / CI; this module does not execute them)');
  for (const c of (e.gates && e.gates.commands) || []) lines.push('- `' + c + '`');
  lines.push('');
  if (e.warnings && e.warnings.length) {
    lines.push('## Warnings');
    for (const w of e.warnings) lines.push('- ' + w);
    lines.push('');
  }
  if (e.blockers && e.blockers.length) {
    lines.push('## Blockers');
    for (const b of e.blockers) lines.push('- ' + b);
    lines.push('');
  }
  lines.push('---');
  lines.push(e.note || '');
  return redactReleaseEvidence(lines.join('\n'));
}

module.exports = {
  STATE,
  REQUIRED_ASAR_FILES,
  collectReleaseEvidence,
  collectPackageMetadata,
  collectAsarMetadata,
  collectSigningReadinessEvidence,
  collectTroubleshootingEvidence,
  collectWatsonxRuntimeEvidence,
  collectGateEvidence,
  redactReleaseEvidence,
  formatReleaseEvidenceMarkdown,
  formatReleaseEvidenceJson
};

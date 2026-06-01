#!/usr/bin/env node
/**
 * macOS Signing & Notarization Readiness — CLI (Phase 17A).
 *
 * Usage:
 *   node scripts/macos-signing-readiness.js
 *   node scripts/macos-signing-readiness.js --json
 *   node scripts/macos-signing-readiness.js --strict
 *
 * Exit semantics:
 *   0 — local dev OK or already ready_to_sign
 *   1 — under --strict, when required production signing config is missing
 *   1 — at any time, when required packaging files (entitlements/icon)
 *       are missing — that block both dev and release
 *
 * NEVER prints a secret value. Presence-only. No Apple credentials read.
 */
'use strict';

const path = require('node:path');
const r = require('../services/release/macos-signing-readiness.js');

function parseArgs(argv) {
  const opts = { json: false, strict: false, rootDir: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--root') opts.rootDir = argv[++i] || opts.rootDir;
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        [
          'macOS Signing & Notarization Readiness',
          '',
          'Usage: node scripts/macos-signing-readiness.js [--json] [--strict] [--root <dir>]',
          '',
          '  --json       emit JSON report on stdout',
          '  --strict     treat missing production signing env as failure (exit 1)',
          '  --root <d>   repo root (default: cwd)',
          ''
        ].join('\n')
      );
      process.exit(0);
    }
  }
  return opts;
}

function decideExit(report, strict) {
  // Missing entitlements/icon always blocks.
  if (report.status === r.STATUS.BLOCKED_MISSING_ENTITLEMENTS) return 1;
  // Strict mode blocks on missing production signing config.
  if (strict && (
    report.status === r.STATUS.BLOCKED_MISSING_SIGNING ||
    report.status === r.STATUS.BLOCKED_NOTARIZE_OFF ||
    report.status === r.STATUS.PARTIAL_SIGNING
  )) return 1;
  return 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = r.buildMacSigningReadinessReport(opts.rootDir, process.env, { mode: opts.strict ? 'strict' : 'dev' });

  if (opts.json) {
    // The report is already presence-only. Pass through the redactor as
    // a belt-and-braces guard for any free-text fields.
    const text = JSON.stringify(report, null, 2);
    process.stdout.write(r.redactSigningReadinessReport(text) + '\n');
  } else {
    process.stdout.write(r.formatMacSigningReadinessReport(report) + '\n');
  }
  process.exit(decideExit(report, opts.strict));
}

if (require.main === module) main();

module.exports = { parseArgs, decideExit };

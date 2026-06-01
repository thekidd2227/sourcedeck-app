#!/usr/bin/env node
/**
 * Release Artifact Evidence — CLI (Phase 17B).
 *
 * Usage:
 *   node scripts/release-evidence.js
 *   node scripts/release-evidence.js --json
 *   node scripts/release-evidence.js --markdown
 *   node scripts/release-evidence.js --out <reports-dir>
 *   node scripts/release-evidence.js --strict
 *
 * Default: writes both markdown and JSON to:
 *   reports/release-evidence/latest-release-evidence.{md,json}
 *   reports/release-evidence/<YYYY-MM-DD>-release-evidence.{md,json}
 *
 * Exit semantics:
 *   0 — local unsigned dev or any non-blocking signing/asar state
 *   1 — under --strict, when any of:
 *       • working tree dirty
 *       • required asar files missing
 *       • strict signing readiness != ready_to_sign
 *       • a positive "signed/notarized" claim detected in the generated text
 *       • a secret-shaped fragment appears in the generated text
 *
 * NEVER prints raw secret values. Presence-only. No Apple credentials
 * are read by this script.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const evidence = require('../services/release/release-evidence.js');

function parseArgs(argv) {
  const opts = {
    json: false,
    markdown: true,
    out: null,
    strict: false,
    rootDir: process.cwd()
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--markdown') opts.markdown = true;
    else if (a === '--out') opts.out = argv[++i] || null;
    else if (a === '--root') opts.rootDir = argv[++i] || opts.rootDir;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        [
          'Release Artifact Evidence',
          '',
          'Usage: node scripts/release-evidence.js [--json] [--markdown] [--out <dir>] [--strict]',
          ''
        ].join('\n')
      );
      process.exit(0);
    }
  }
  return opts;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function today() { return new Date().toISOString().slice(0, 10); }

// Belt-and-braces guard: any positive "is signed/notarized" claim in the
// generated text fails the strict run (the redactor handles secrets;
// this looks at claim copy).
function containsUnsupportedSignedClaim(text) {
  // Only block positive claims; allow negations.
  const lines = String(text || '').split('\n');
  const NEG = /\b(no|not|never|without|nothing|must\s+not|do\s+not|don'?t|cannot|until|unless|requires?|pending|blocked|will\s+not)\b/i;
  const claim = /\b(SourceDeck|the app)\s+is\s+(signed|notarized|fully\s+signed)\b/i;
  return lines.some(l => claim.test(l) && !NEG.test(l));
}

// Belt-and-braces secret scan over the generated text. The redactor
// already ran; if anything still looks secret-shaped, fail strict.
function containsSecretShape(text) {
  const s = String(text || '');
  return /\bsk-(ant-)?[A-Za-z0-9_-]{12,}\b/.test(s) ||
         /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s) ||
         /-----BEGIN CERTIFICATE-----/.test(s) ||
         /\bAKIA[0-9A-Z]{16}\b/.test(s) ||
         /\b(CSC_KEY_PASSWORD|APPLE_APP_SPECIFIC_PASSWORD)\s*=\s*[^\[\s]/.test(s);
}

function decideExit(report, mode, generatedText) {
  if (mode !== 'strict') return 0;
  if (report.blockers && report.blockers.length) return 1;
  if (containsUnsupportedSignedClaim(generatedText)) return 1;
  if (containsSecretShape(generatedText)) return 1;
  return 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = evidence.collectReleaseEvidence({
    rootDir: opts.rootDir,
    env: process.env,
    mode: opts.strict ? 'strict' : 'dev'
  });

  const outDir = opts.out || path.join(opts.rootDir, 'reports', 'release-evidence');
  ensureDir(outDir);
  const md = evidence.formatReleaseEvidenceMarkdown(report);
  const json = evidence.formatReleaseEvidenceJson(report);
  const ts = today();

  // Always write both markdown + JSON; the flags only affect stdout.
  const mdPaths = [
    path.join(outDir, 'latest-release-evidence.md'),
    path.join(outDir, ts + '-release-evidence.md')
  ];
  const jsonPaths = [
    path.join(outDir, 'latest-release-evidence.json'),
    path.join(outDir, ts + '-release-evidence.json')
  ];
  for (const p of mdPaths)   fs.writeFileSync(p, md);
  for (const p of jsonPaths) fs.writeFileSync(p, json);

  // stdout: respect --json / --markdown.
  if (opts.json) process.stdout.write(json + '\n');
  else process.stdout.write(md + '\n');
  process.stdout.write('\n--\n');
  process.stdout.write('markdown: ' + mdPaths[mdPaths.length - 1] + '\n');
  process.stdout.write('json:     ' + jsonPaths[jsonPaths.length - 1] + '\n');

  process.exit(decideExit(report, opts.strict ? 'strict' : 'dev', md + '\n' + json));
}

if (require.main === module) main();

module.exports = { parseArgs, decideExit, containsUnsupportedSignedClaim, containsSecretShape };

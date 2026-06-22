#!/usr/bin/env node
/**
 * SourceDeck Paid Distribution Readiness Gate.
 *
 * This is a presence-only operational gate. It verifies that the repository is
 * configured for the professional distribution path and that required external
 * checkout/licensing/release variables are present without printing secrets.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DOCS = [
  'docs/distribution/sourceDeck-professional-paid-distribution-runbook.md'
];

const REQUIRED_REPO_FILES = [
  'package.json',
  'build/entitlements.mac.plist',
  'build/icon.icns'
];

const OPTIONAL_SECRET_GROUPS = [
  {
    id: 'apple_signing',
    label: 'Apple Developer ID signing/notarization',
    vars: [
      'CSC_LINK',
      'CSC_KEY_PASSWORD',
      'APPLE_ID',
      'APPLE_APP_SPECIFIC_PASSWORD',
      'APPLE_TEAM_ID'
    ],
    requiredForStrict: true
  },
  {
    id: 'lemon_squeezy',
    label: 'Lemon Squeezy checkout and license keys',
    vars: [
      'LEMONSQUEEZY_STORE_ID',
      'LEMONSQUEEZY_PRODUCT_ID',
      'LEMONSQUEEZY_VARIANT_ID',
      'LEMONSQUEEZY_WEBHOOK_SECRET'
    ],
    requiredForStrict: true
  },
  {
    id: 'release_publish',
    label: 'GitHub release publishing',
    vars: [
      'GH_TOKEN'
    ],
    requiredForStrict: false
  }
];

function parseArgs(argv) {
  const opts = { json: false, strict: false, rootDir: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--root') opts.rootDir = argv[++i] || opts.rootDir;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write([
        'SourceDeck Paid Distribution Readiness',
        '',
        'Usage: node scripts/distribution-readiness.js [--json] [--strict] [--root <dir>]',
        '',
        '  --json       emit JSON report',
        '  --strict     fail when production checkout/licensing/signing env is missing',
        '  --root <d>   repo root (default: cwd)',
        ''
      ].join('\n'));
      process.exit(0);
    }
  }
  return opts;
}

function exists(rootDir, rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function loadPackage(rootDir) {
  const packagePath = path.join(rootDir, 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
}

function presentEnv(env, name) {
  return Boolean(env[name] && String(env[name]).trim());
}

function buildReport(rootDir, env, options = {}) {
  const pkg = loadPackage(rootDir);
  const build = pkg.build || {};
  const mac = build.mac || {};
  const publish = Array.isArray(build.publish) ? build.publish : [];
  const githubPublish = publish.find((p) => p && p.provider === 'github');

  const repoFiles = REQUIRED_REPO_FILES.map((rel) => ({ path: rel, present: exists(rootDir, rel) }));
  const docs = REQUIRED_DOCS.map((rel) => ({ path: rel, present: exists(rootDir, rel) }));
  const secretGroups = OPTIONAL_SECRET_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    requiredForStrict: group.requiredForStrict,
    variables: group.vars.map((name) => ({ name, present: presentEnv(env, name) })),
    ready: group.vars.every((name) => presentEnv(env, name))
  }));

  const checks = [
    {
      id: 'notarize_true',
      label: 'macOS notarization is enabled in package.json',
      pass: mac.notarize === true,
      required: true
    },
    {
      id: 'hardened_runtime',
      label: 'macOS hardened runtime is enabled',
      pass: mac.hardenedRuntime === true,
      required: true
    },
    {
      id: 'mac_dmg_target',
      label: 'macOS DMG target is configured',
      pass: Array.isArray(mac.target) && mac.target.some((target) => target && target.target === 'dmg'),
      required: true
    },
    {
      id: 'mac_zip_target',
      label: 'macOS ZIP target is configured for updater support',
      pass: Array.isArray(mac.target) && mac.target.some((target) => target && target.target === 'zip'),
      required: true
    },
    {
      id: 'github_release_target',
      label: 'GitHub Releases publish target is configured',
      pass: Boolean(githubPublish && githubPublish.owner && githubPublish.repo),
      required: true,
      details: githubPublish ? `${githubPublish.owner}/${githubPublish.repo}` : null
    },
    ...repoFiles.map((file) => ({
      id: `repo_file:${file.path}`,
      label: `Required repository file exists: ${file.path}`,
      pass: file.present,
      required: true
    })),
    ...docs.map((doc) => ({
      id: `doc:${doc.path}`,
      label: `Distribution documentation exists: ${doc.path}`,
      pass: doc.present,
      required: true
    }))
  ];

  if (options.strict) {
    for (const group of secretGroups.filter((g) => g.requiredForStrict)) {
      checks.push({
        id: `secret_group:${group.id}`,
        label: `Production secret group is present: ${group.label}`,
        pass: group.ready,
        required: true
      });
    }
  }

  const failedRequired = checks.filter((check) => check.required && !check.pass);
  const warnings = secretGroups
    .filter((group) => !group.ready)
    .map((group) => `${group.label} env is incomplete; this is expected before final production signing/checkout setup.`);

  return {
    generatedAt: new Date().toISOString(),
    mode: options.strict ? 'strict' : 'dev',
    status: failedRequired.length ? 'blocked' : (warnings.length ? 'ready_with_warnings' : 'ready'),
    checks,
    secretGroups,
    warnings
  };
}

function formatReport(report) {
  const lines = [];
  lines.push('SourceDeck Paid Distribution Readiness');
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  for (const check of report.checks) {
    lines.push(`${check.pass ? 'PASS' : 'FAIL'} — ${check.label}${check.details ? ` (${check.details})` : ''}`);
  }
  if (report.warnings.length) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }
  lines.push('');
  lines.push('No secret values printed. Presence-only check.');
  return lines.join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = buildReport(opts.rootDir, process.env, { strict: opts.strict });
  if (opts.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else process.stdout.write(`${formatReport(report)}\n`);
  process.exit(report.status === 'blocked' ? 1 : 0);
}

if (require.main === module) main();

module.exports = { parseArgs, buildReport, formatReport };

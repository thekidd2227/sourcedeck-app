#!/usr/bin/env node
/**
 * SourceDeck Daily Troubleshooting Agent — CLI runner (Phase 16A).
 *
 * Usage:
 *   node scripts/run-troubleshooting-agent.js
 *   node scripts/run-troubleshooting-agent.js --json
 *   node scripts/run-troubleshooting-agent.js --markdown
 *   node scripts/run-troubleshooting-agent.js --out reports/custom.md
 *   node scripts/run-troubleshooting-agent.js --strict
 *
 * Exit semantics:
 *   0 — all findings pass, or only manual / low / medium items remain
 *   1 — any critical or high severity failure (always)
 *   1 — any medium failure (only under --strict)
 *
 * Never modifies product code. Reports are written to reports/troubleshooting/.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  runTroubleshootingScan,
  formatTroubleshootingReport,
  SEVERITIES,
  STATUSES,
} = require("../services/troubleshooting/troubleshooting-agent.js");
const alerts = require("../services/troubleshooting/troubleshooting-alerts.js");
const transport = require("../services/troubleshooting/troubleshooting-email-transport.js");

function parseArgs(argv) {
  const opts = {
    json: false,
    markdown: true,
    out: null,
    strict: false,
    rootDir: process.cwd(),
    reportsDir: null,
    email: false,
    emailDryRun: false,
    alertOnManual: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--markdown") opts.markdown = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--out") opts.out = argv[++i] || null;
    else if (a === "--root") opts.rootDir = argv[++i] || opts.rootDir;
    else if (a === "--reports-dir") opts.reportsDir = argv[++i] || null;
    else if (a === "--email") opts.email = true;
    else if (a === "--email-dry-run") opts.emailDryRun = true;
    else if (a === "--alert-on-manual") opts.alertOnManual = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp() {
  process.stdout.write(
    [
      "SourceDeck Daily Troubleshooting Agent",
      "",
      "Usage: node scripts/run-troubleshooting-agent.js [--json] [--markdown] [--out <path>] [--strict]",
      "",
      "Options:",
      "  --json             also emit JSON report",
      "  --markdown         emit markdown report (default)",
      "  --out <path>       override primary output path",
      "  --strict           treat medium failures as failure too",
      "  --root <dir>       repo root (default: cwd)",
      "  --reports-dir <d>  override reports directory (used by tests)",
      "  --email            build email alert and attempt send (gated by SEND_TROUBLESHOOTING_EMAIL=true + config)",
      "  --email-dry-run    build email alert payload but never send",
      "  --alert-on-manual  also alert on manual-only findings",
      "  -h, --help         show this help",
    ].join("\n") + "\n"
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function severityBadge(severity) {
  switch (severity) {
    case SEVERITIES.CRITICAL:
      return "CRITICAL";
    case SEVERITIES.HIGH:
      return "HIGH";
    case SEVERITIES.MEDIUM:
      return "med";
    case SEVERITIES.LOW:
      return "low";
    default:
      return "info";
  }
}

function printSummary(result) {
  const { summary, findings } = result;
  const lines = [];
  lines.push("");
  lines.push("─── SourceDeck Daily Troubleshooting ───");
  lines.push(`  pass:   ${summary.counts.pass || 0}`);
  lines.push(`  fail:   ${summary.counts.fail || 0}`);
  lines.push(`  warn:   ${summary.counts.warn || 0}`);
  lines.push(`  manual: ${summary.counts.manual || 0}`);
  lines.push(`  total:  ${summary.counts.total}`);
  lines.push(`  critical/high failures: ${summary.criticalOrHighFail}`);
  lines.push("");

  const failsOrWarns = findings.filter(
    (f) => f.status === STATUSES.FAIL || f.status === STATUSES.WARN
  );
  if (failsOrWarns.length) {
    lines.push("Findings requiring attention:");
    for (const f of failsOrWarns) {
      lines.push(
        `  [${severityBadge(f.severity).padEnd(8)}] ${f.status.padEnd(4)} ${f.id} — ${f.title}`
      );
      if (f.file) lines.push(`             file: ${f.file}`);
      if (f.remediation) lines.push(`             remediation: ${f.remediation}`);
    }
    lines.push("");
  } else {
    lines.push("✓ no fail/warn findings");
    lines.push("");
  }

  const manual = findings.filter((f) => f.status === STATUSES.MANUAL);
  if (manual.length) {
    lines.push("Manual-only items (do not block the run):");
    for (const f of manual) {
      lines.push(`  - ${f.id}: ${f.title}`);
    }
    lines.push("");
  }

  lines.push("Auto-repair is disabled for every finding. Operator review required.");
  process.stdout.write(lines.join("\n") + "\n");
}

function decideExit(result, strict) {
  const { summary } = result;
  if (summary.criticalOrHighFail > 0) return 1;
  if (strict && (summary.failuresBySeverity.medium || 0) > 0) return 1;
  return 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = runTroubleshootingScan({ rootDir: opts.rootDir });

  const reportsDir = opts.reportsDir || path.join(opts.rootDir, "reports/troubleshooting");
  ensureDir(reportsDir);

  const md = formatTroubleshootingReport(result, { format: "markdown" });
  const mdPaths = [
    path.join(reportsDir, "latest-troubleshooting-report.md"),
    path.join(reportsDir, `${today()}-troubleshooting-report.md`),
  ];
  if (opts.out) mdPaths.unshift(opts.out);
  for (const p of mdPaths) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, md);
  }

  if (opts.json) {
    const json = formatTroubleshootingReport(result, { format: "json" });
    const jsonPaths = [
      path.join(reportsDir, "latest-troubleshooting-report.json"),
      path.join(reportsDir, `${today()}-troubleshooting-report.json`),
    ];
    for (const p of jsonPaths) {
      ensureDir(path.dirname(p));
      fs.writeFileSync(p, json);
    }
  }

  printSummary(result);
  process.stdout.write(`\nMarkdown report: ${mdPaths[mdPaths.length - 1]}\n`);
  if (opts.json) {
    process.stdout.write(
      `JSON report:     ${path.join(reportsDir, `${today()}-troubleshooting-report.json`)}\n`
    );
  }

  // ── Email alert (safe by default) ──
  // --email-dry-run always dry-runs.
  // --email goes through transport, which is OFF unless
  // SEND_TROUBLESHOOTING_EMAIL=true AND every required SMTP env var is set.
  // Either way, exit code reflects scan severity, never email config.
  if (opts.email || opts.emailDryRun) {
    handleEmailAlert(result, reportsDir, opts).catch((err) => {
      process.stdout.write(
        `\nEmail alert error (non-fatal): ${(err && err.code) || "unknown"}\n`
      );
    });
  }

  process.exit(decideExit(result, opts.strict));
}

async function handleEmailAlert(result, reportsDir, opts) {
  const should = alerts.shouldSendTroubleshootingAlert(result, {
    alertOnManual: !!opts.alertOnManual,
  });
  const mdPath = path.join(reportsDir, `${today()}-troubleshooting-report.md`);
  const jsonPath = opts.json
    ? path.join(reportsDir, `${today()}-troubleshooting-report.json`)
    : null;
  if (!should) {
    process.stdout.write(
      "\nEmail alert: no critical/high failures — no alert dispatched.\n"
    );
    return;
  }
  const subject = alerts.buildTroubleshootingEmailSubject(result);
  const body = alerts.buildTroubleshootingEmailBody(result, {
    markdownReportPath: mdPath,
    jsonReportPath: jsonPath,
  });
  const env = process.env || {};
  const dryRun = opts.emailDryRun === true;
  const status = transport.getEmailTransportStatus(env);
  const res = await transport.sendTroubleshootingEmail({
    to: status.to,
    subject,
    body,
    options: { dryRun, env, alertOnManual: !!opts.alertOnManual },
  });
  const lines = [];
  lines.push("\nEmail alert:");
  lines.push(`  mode:       ${res.mode}`);
  lines.push(`  enabled:    ${status.enabled}`);
  lines.push(`  configured: ${status.configured}`);
  if (status.missing && status.missing.length) {
    lines.push(`  missing:    ${status.missing.join(", ")}`);
  }
  lines.push(`  subject:    ${subject}`);
  lines.push(`  body bytes: ${body.length}`);
  if (res.mode === "disabled") {
    lines.push(
      "  note: SEND_TROUBLESHOOTING_EMAIL is not 'true'; no email was sent."
    );
  } else if (res.mode === "missing_config") {
    lines.push(
      "  note: enablement flag is set but SMTP config envs are missing; no email was sent."
    );
  } else if (res.mode === "dry_run") {
    lines.push("  note: --email-dry-run requested; payload prepared, never sent.");
  } else if (res.mode === "prepared_no_send") {
    lines.push(
      "  note: live transmission is intentionally NOT implemented in this phase; payload prepared, never sent."
    );
  }
  process.stdout.write(lines.join("\n") + "\n");
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, decideExit };

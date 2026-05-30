/**
 * Tests — SourceDeck Daily Troubleshooting Agent (Phase 16A).
 *
 * Plain Node assertions to match the project's test style. Exits 1 on
 * any assertion failure. Fixtures live under test/fixtures/troubleshooting-agent/
 * and contain only synthetic strings (no real keys).
 */

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const agent = require("../services/troubleshooting/troubleshooting-agent.js");
const {
  runTroubleshootingScan,
  runCredentialBoundaryChecks,
  runComplianceClaimChecks,
  runDemoDownloadAccessChecks,
  runGovConSafetyChecks,
  runWatsonxReadinessPolicyChecks,
  runReleaseReadinessChecks,
  runSourceDeckHealthChecks,
  runKnowledgeBaseIntegrityChecks,
  formatTroubleshootingReport,
  classifyTroubleshootingFinding,
  CATEGORIES,
  SEVERITIES,
  STATUSES,
} = agent;

const REPO_ROOT = path.resolve(__dirname, "..");
const FIXTURE_ROOT = path.join(REPO_ROOT, "test/fixtures/troubleshooting-agent");

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log("  ✅", msg);
  } else {
    failed += 1;
    failures.push(msg);
    console.log("  ❌", msg);
  }
}

function find(findings, id) {
  return findings.find((f) => f.id === id);
}

function findByPrefix(findings, prefix) {
  return findings.filter((f) => f.id.startsWith(prefix));
}

console.log("\n── troubleshooting-agent: shape + invariants ──");

{
  const result = runTroubleshootingScan({ rootDir: REPO_ROOT });
  assert(typeof result === "object" && result !== null, "runTroubleshootingScan returns an object");
  assert(typeof result.startedAt === "string", "result has startedAt");
  assert(typeof result.finishedAt === "string", "result has finishedAt");
  assert(Array.isArray(result.findings), "result.findings is an array");
  assert(result.findings.length > 0, "result.findings is non-empty");
  assert(typeof result.summary === "object", "result.summary is an object");
  assert(typeof result.summary.counts === "object", "summary.counts is an object");
  assert(
    result.findings.every((f) => f.autoRepairAllowed === false),
    "every finding has autoRepairAllowed === false (hard invariant)"
  );
  assert(
    result.findings.every((f) => f.requiresHumanApproval === true),
    "every finding has requiresHumanApproval === true (hard invariant)"
  );
  assert(
    result.findings.every((f) => typeof f.id === "string" && f.id.length > 0),
    "every finding has a non-empty string id"
  );
  assert(
    result.findings.every((f) => Object.values(STATUSES).includes(f.status)),
    "every finding has a valid status"
  );
  assert(
    result.findings.every((f) => Object.values(SEVERITIES).includes(f.severity)),
    "every finding has a valid severity"
  );
}

console.log("\n── runCredentialBoundaryChecks ──");

{
  const findings = runCredentialBoundaryChecks(path.join(FIXTURE_ROOT, "bad-cred-renderer"));
  const cred001 = find(findings, "CRED-001");
  const cred002 = find(findings, "CRED-002");
  const cred003 = find(findings, "CRED-003");
  const cred004 = find(findings, "CRED-004");
  assert(cred001 && cred001.status === STATUSES.FAIL, "CRED-001 fails when renderer setItem('lcc_OPENAI_KEY')");
  assert(cred001 && cred001.severity === SEVERITIES.CRITICAL, "CRED-001 severity is critical");
  assert(cred002 && cred002.status === STATUSES.FAIL, "CRED-002 fails on direct fetch to api.openai.com / api.anthropic.com");
  assert(cred003 && cred003.status === STATUSES.FAIL, "CRED-003 fails on Bearer/x-api-key header build in renderer");
  assert(cred004 && cred004.status === STATUSES.FAIL, "CRED-004 fails on raw sk-* assignment to window.*_KEY");
}

{
  const findings = runCredentialBoundaryChecks(path.join(FIXTURE_ROOT, "bad-cred-preload"));
  const cred010 = find(findings, "CRED-010");
  assert(cred010 && cred010.status === STATUSES.FAIL, "CRED-010 fails when preload exposes credentials.get");
  assert(cred010 && cred010.severity === SEVERITIES.CRITICAL, "CRED-010 severity is critical");
}

{
  // On the live repo, the credential boundary checks should all pass (or be
  // pass + presence-check fails only when fixture lacks ancillary files).
  const findings = runCredentialBoundaryChecks(REPO_ROOT);
  const cred001 = find(findings, "CRED-001");
  const cred002 = find(findings, "CRED-002");
  const cred003 = find(findings, "CRED-003");
  const cred010 = find(findings, "CRED-010");
  assert(cred001.status === STATUSES.PASS, "CRED-001 passes on current main");
  assert(cred002.status === STATUSES.PASS, "CRED-002 passes on current main");
  assert(cred003.status === STATUSES.PASS, "CRED-003 passes on current main");
  assert(cred010.status === STATUSES.PASS, "CRED-010 passes on current main (preload has no raw getter)");
}

console.log("\n── runComplianceClaimChecks ──");

{
  const findings = runComplianceClaimChecks(path.join(FIXTURE_ROOT, "bad-claims-renderer"));
  const claim001 = find(findings, "CLAIM-001");
  const claim002 = find(findings, "CLAIM-002");
  const claim003 = find(findings, "CLAIM-003");
  const claim004 = find(findings, "CLAIM-004");
  const claim005 = find(findings, "CLAIM-005");
  assert(claim001 && claim001.status === STATUSES.FAIL, "CLAIM-001 fails on SOC 2 / FedRAMP / HIPAA certified / HITRUST / ISO 27001");
  assert(claim002 && claim002.status === STATUSES.FAIL, "CLAIM-002 fails on 'watsonx fully operational' / 'Powered by IBM watsonx'");
  assert(claim002 && claim002.severity === SEVERITIES.CRITICAL, "CLAIM-002 severity is critical (OPEN-002 gate)");
  assert(claim003 && claim003.status === STATUSES.FAIL, "CLAIM-003 fails on 'guarantees awards' / 'wins contracts' / 'autonomously decides'");
  assert(claim004 && claim004.status === STATUSES.FAIL, "CLAIM-004 fails on owner identifiers (Jean-Max Charles / jeanmax@ / @arcg.ai)");
  assert(claim005 && claim005.status === STATUSES.FAIL, "CLAIM-005 fails on owner-area-code phone signatures");
}

{
  const findings = runComplianceClaimChecks(REPO_ROOT);
  for (const id of ["CLAIM-001", "CLAIM-002", "CLAIM-003", "CLAIM-004", "CLAIM-005"]) {
    const f = find(findings, id);
    assert(f && f.status === STATUSES.PASS, `${id} passes on current main`);
  }
}

console.log("\n── runDemoDownloadAccessChecks ──");

{
  const demoBad = path.join(FIXTURE_ROOT, "bad-demo");
  const findings = runDemoDownloadAccessChecks(demoBad);
  const demo = find(findings, "DEMO-001");
  assert(demo && demo.status === STATUSES.FAIL, "DEMO-001 fails on forbidden public demo/download CTAs");
}

{
  const findings = runDemoDownloadAccessChecks(REPO_ROOT);
  const demo = find(findings, "DEMO-001");
  assert(demo && demo.status === STATUSES.PASS, "DEMO-001 passes on current main");
}

console.log("\n── runGovConSafetyChecks ──");

{
  const findings = runGovConSafetyChecks(path.join(FIXTURE_ROOT, "bad-govcon"));
  const g001 = find(findings, "GOVCON-001");
  const g002 = find(findings, "GOVCON-002");
  const g003 = find(findings, "GOVCON-003");
  const g004 = find(findings, "GOVCON-004");
  assert(g001 && g001.status === STATUSES.FAIL, "GOVCON-001 fails when RED_RESTRICTED missing in outreach-window");
  assert(g002 && g002.status === STATUSES.FAIL, "GOVCON-002 fails when KILL verdict missing in fast-cash");
  assert(g003 && g003.status === STATUSES.FAIL, "GOVCON-003 fails when premium-content-agent has autoPost:true");
  assert(g004 && g004.status === STATUSES.FAIL, "GOVCON-004 fails when opportunity-outreach has autoSend:true");
}

{
  const findings = runGovConSafetyChecks(REPO_ROOT);
  for (const id of ["GOVCON-001", "GOVCON-002", "GOVCON-003", "GOVCON-004", "GOVCON-005"]) {
    const f = find(findings, id);
    assert(f && f.status === STATUSES.PASS, `${id} passes on current main`);
  }
}

console.log("\n── runWatsonxReadinessPolicyChecks ──");

{
  const findings = runWatsonxReadinessPolicyChecks(path.join(FIXTURE_ROOT, "bad-watsonx"));
  const wx001 = find(findings, "WX-001");
  const wx002 = find(findings, "WX-002");
  const wx004 = find(findings, "WX-004");
  const wx005 = find(findings, "WX-005");
  assert(wx001 && wx001.status === STATUSES.PASS, "WX-001 passes (file present in fixture)");
  assert(wx002 && wx002.status === STATUSES.FAIL, "WX-002 fails when required watsonx statuses are missing");
  assert(wx004 && wx004.status === STATUSES.FAIL, "WX-004 fails when readiness UI is missing from renderer");
  assert(wx005 && wx005.status === STATUSES.MANUAL, "WX-005 is manual (OPEN-002 IBM-side action)");
}

{
  const findings = runWatsonxReadinessPolicyChecks(REPO_ROOT);
  assert(find(findings, "WX-001").status === STATUSES.PASS, "WX-001 passes on current main");
  assert(find(findings, "WX-002").status === STATUSES.PASS, "WX-002 passes on current main (all classifications present)");
  assert(find(findings, "WX-004").status === STATUSES.PASS, "WX-004 passes on current main (readiness UI present)");
  assert(find(findings, "WX-005").status === STATUSES.MANUAL, "WX-005 stays manual until IBM-side action");
}

console.log("\n── runReleaseReadinessChecks ──");

{
  const findings = runReleaseReadinessChecks(REPO_ROOT);
  assert(find(findings, "REL-001").status === STATUSES.PASS, "REL-001 passes (release-check.js exists)");
  assert(find(findings, "REL-002").status === STATUSES.PASS, "REL-002 passes (privacy gate intact)");
  for (const s of ["test", "govcon:smoke", "govcon:outreach-os:audit", "phase13:rc-check", "i18n:audit"]) {
    const f = find(findings, `REL-010:${s}`);
    assert(f && f.status === STATUSES.PASS, `REL-010 confirms script "${s}" present`);
  }
  const macSign = find(findings, "REL-020");
  assert(macSign && (macSign.status === STATUSES.PASS || macSign.status === STATUSES.MANUAL), "REL-020 returns pass or manual (signing env aware)");
}

console.log("\n── runSourceDeckHealthChecks ──");

{
  const findings = runSourceDeckHealthChecks(REPO_ROOT);
  assert(find(findings, "HEALTH-001").status === STATUSES.PASS, "HEALTH-001 passes — MOCK_LEADS empty");
  assert(find(findings, "HEALTH-002").status === STATUSES.PASS, "HEALTH-002 passes — PROMPT_LIBRARY empty (object form)");
}

console.log("\n── runKnowledgeBaseIntegrityChecks ──");

{
  const findings = runKnowledgeBaseIntegrityChecks(REPO_ROOT);
  const kbFiles = findByPrefix(findings, "KB-001:");
  assert(kbFiles.length === 7, "KB-001 covers all 7 KB files");
  assert(kbFiles.every((f) => f.status === STATUSES.PASS), "all 7 KB files exist on current main");
  assert(find(findings, "KB-002").status === STATUSES.PASS, "KB-002 confirms OPEN-002 still PARTIALLY FIXED");
  assert(find(findings, "KB-003").status === STATUSES.PASS, "KB-003 confirms agent-rules.md has daily checklist");
  assert(find(findings, "KB-004").status === STATUSES.PASS, "KB-004 confirms playbooks cover credential + watsonx");
}

console.log("\n── formatter + classifier ──");

{
  const result = runTroubleshootingScan({ rootDir: REPO_ROOT });
  const md = formatTroubleshootingReport(result, { format: "markdown" });
  const json = formatTroubleshootingReport(result, { format: "json" });
  assert(md.includes("# SourceDeck Daily Troubleshooting Report"), "markdown report contains title");
  assert(md.includes("| status | count |"), "markdown report contains summary table");
  assert(md.includes("Auto-repair is disabled"), "markdown report ends with auto-repair disclaimer");
  const parsed = JSON.parse(json);
  assert(parsed.agent === "sourcedeck-daily-troubleshooting-agent", "JSON report carries agent identifier");
  assert(parsed.findings.length === result.findings.length, "JSON report includes all findings");

  // Classifier
  assert(classifyTroubleshootingFinding({ status: "pass", severity: "low" }) === "ok", "classifier: pass → ok");
  assert(classifyTroubleshootingFinding({ status: "manual", severity: "high" }) === "manual", "classifier: manual → manual");
  assert(classifyTroubleshootingFinding({ status: "fail", severity: "critical" }) === "blocker", "classifier: critical fail → blocker");
  assert(classifyTroubleshootingFinding({ status: "fail", severity: "high" }) === "blocker", "classifier: high fail → blocker");
  assert(classifyTroubleshootingFinding({ status: "warn", severity: "medium" }) === "warn:medium", "classifier: warn → warn:medium");
}

console.log("\n── CLI runner (temp dir, no live files) ──");

{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sd-ts-agent-"));
  // Run the CLI with --reports-dir pointed at tmp so we never touch the
  // real reports/ dir during tests.
  const cli = path.join(REPO_ROOT, "scripts/run-troubleshooting-agent.js");
  const r = spawnSync(process.execPath, [cli, "--json", "--reports-dir", tmp], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert(r.status === 0, "CLI exits 0 on current main");
  const written = fs.readdirSync(tmp);
  assert(
    written.includes("latest-troubleshooting-report.md"),
    "CLI writes latest markdown report to --reports-dir"
  );
  assert(
    written.includes("latest-troubleshooting-report.json"),
    "CLI writes latest JSON report to --reports-dir when --json passed"
  );
  assert(
    written.some((f) => /^\d{4}-\d{2}-\d{2}-troubleshooting-report\.md$/.test(f)),
    "CLI writes timestamped markdown report"
  );
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("\n── strict mode + exit semantics ──");

{
  const { decideExit } = require("../scripts/run-troubleshooting-agent.js");

  // Synthetic result shapes — exercise the decideExit branches directly.
  const cleanResult = {
    summary: { counts: {}, failuresBySeverity: {}, criticalOrHighFail: 0 },
  };
  const highFailResult = {
    summary: { counts: {}, failuresBySeverity: { high: 1 }, criticalOrHighFail: 1 },
  };
  const mediumFailResult = {
    summary: { counts: {}, failuresBySeverity: { medium: 1 }, criticalOrHighFail: 0 },
  };

  assert(decideExit(cleanResult, false) === 0, "exit 0 when no fails");
  assert(decideExit(highFailResult, false) === 1, "exit 1 on high fail (default)");
  assert(decideExit(highFailResult, true) === 1, "exit 1 on high fail (strict)");
  assert(decideExit(mediumFailResult, false) === 0, "exit 0 on medium fail (default)");
  assert(decideExit(mediumFailResult, true) === 1, "exit 1 on medium fail (strict)");
}

console.log("\n── workflow file present + safe ──");

{
  const wf = path.join(REPO_ROOT, ".github/workflows/daily-troubleshooting-agent.yml");
  assert(fs.existsSync(wf), "daily-troubleshooting-agent.yml exists");
  const yml = fs.readFileSync(wf, "utf8");
  assert(/on:\s*[\s\S]*schedule:/.test(yml), "workflow has schedule trigger");
  assert(/workflow_dispatch/.test(yml), "workflow has manual dispatch");
  assert(!/secrets\./.test(yml), "workflow does not reference any secrets");
  assert(/upload-artifact@v\d+/.test(yml), "workflow uploads artifact");
  assert(!/git commit|git push/.test(yml), "workflow does not commit or push");
  assert(/permissions:\s*\n\s*contents:\s*read/.test(yml), "workflow uses contents: read only");
}

console.log("\n── auto-repair invariant (final sweep) ──");

{
  const result = runTroubleshootingScan({ rootDir: REPO_ROOT });
  const violations = result.findings.filter(
    (f) => f.autoRepairAllowed !== false || f.requiresHumanApproval !== true
  );
  assert(violations.length === 0, "no finding declares autoRepairAllowed:true (NAR-001..NAR-010)");
}

console.log(`\n=== ${failed === 0 ? "PASS" : "FAIL"} — ${passed}/${passed + failed} troubleshooting-agent tests ===`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log("  -", f);
  process.exit(1);
}

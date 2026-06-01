/**
 * SourceDeck Daily Troubleshooting Agent — scan engine (Phase 16A).
 *
 * Local/repo-native. Does not auto-repair, does not commit, does not push,
 * does not expose or print secrets. Every finding it emits is human-review-only.
 *
 * The agent reads its rules from `docs/troubleshooting-knowledge-base/`.
 * See `docs/audits/daily-troubleshooting-agent-audit.md` for the rule→check
 * mapping. CommonJS to match the existing services/ pattern.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const AGENT_VERSION = "0.1.0";
const SCHEMA_VERSION = "phase-16a";

// Hard categories — must stay enumerated so the auto-repair invariant
// is impossible to relax without reading the KB (NAR-001..NAR-010).
const CATEGORIES = Object.freeze({
  CREDENTIAL_BOUNDARY: "credential_boundary",
  COMPLIANCE_CLAIM: "compliance_claim",
  DEMO_DOWNLOAD_ACCESS: "demo_download_access",
  GOVCON_SAFETY: "govcon_safety",
  WATSONX_READINESS_POLICY: "watsonx_readiness_policy",
  RELEASE_READINESS: "release_readiness",
  SOURCEDECK_HEALTH: "sourcedeck_health",
  KB_INTEGRITY: "kb_integrity",
});

const SEVERITIES = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
});

const STATUSES = Object.freeze({
  PASS: "pass",
  FAIL: "fail",
  WARN: "warn",
  MANUAL: "manual",
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function rel(rootDir, file) {
  return path.relative(rootDir, file) || file;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Build a finding. Always sets autoRepairAllowed=false and
 * requiresHumanApproval=true — these are invariants this phase ships.
 */
function makeFinding({
  id,
  severity,
  category,
  title,
  status,
  evidence = "",
  file = null,
  remediation = "",
}) {
  return {
    id,
    severity,
    category,
    title,
    status,
    evidence,
    file,
    remediation,
    autoRepairAllowed: false,
    requiresHumanApproval: true,
  };
}

function classifyTroubleshootingFinding(finding) {
  // Stable, deterministic classifier so reports/tests can rely on it.
  if (!finding || typeof finding !== "object") return "info";
  const { severity, status } = finding;
  if (status === STATUSES.PASS) return "ok";
  if (status === STATUSES.MANUAL) return "manual";
  if (status === STATUSES.WARN) return `warn:${severity || "low"}`;
  if (status === STATUSES.FAIL) {
    if (severity === SEVERITIES.CRITICAL) return "blocker";
    if (severity === SEVERITIES.HIGH) return "blocker";
    return `fail:${severity || "low"}`;
  }
  return "info";
}

// --------------------------------------------------------------------------
// A. Credential boundary
// --------------------------------------------------------------------------

const FORBIDDEN_RENDERER_SET_KEYS = [
  /localStorage\s*\.\s*setItem\s*\(\s*['"`]lcc_OPENAI_KEY/,
  /localStorage\s*\.\s*setItem\s*\(\s*['"`]lcc_CLAUDE_KEY/,
  /localStorage\s*\.\s*setItem\s*\(\s*['"`]lcc_ANTHROPIC_KEY/,
  /localStorage\s*\.\s*setItem\s*\(\s*['"`]lcc_WATSONX_KEY/,
];

const FORBIDDEN_RENDERER_DIRECT_FETCH = [
  /fetch\s*\(\s*['"`]https:\/\/api\.openai\.com/,
  /fetch\s*\(\s*['"`]https:\/\/api\.anthropic\.com/,
];

// Authorization/Bearer/x-api-key builds in renderer/preload that reference a
// raw key variable. Allowed: server-side providers in services/ai/providers/*.
const FORBIDDEN_RENDERER_AUTH_BUILDS = [
  /Authorization\s*:\s*[`'"]\s*Bearer\s*\$\{?\s*(?:OPENAI_KEY|CLAUDE_KEY|ANTHROPIC_KEY|WATSONX_API_KEY)/,
  /['"`]x-api-key['"`]\s*:\s*[`'"]?\s*\$?\{?\s*(?:OPENAI_KEY|CLAUDE_KEY|ANTHROPIC_KEY|WATSONX_API_KEY)/,
];

// preload may expose presence/status/set/remove but NOT a raw getter.
const FORBIDDEN_PRELOAD_RAW_GETTERS = [
  /credentials\s*:\s*\{[^}]*get\s*:/s,
  /exposeInMainWorld\([^)]*get(?:ApiKey|Credential)Raw/i,
];

function runCredentialBoundaryChecks(rootDir) {
  const findings = [];
  const rendererPath = path.join(rootDir, "sourcedeck.html");
  const preloadPath = path.join(rootDir, "preload.js");

  const renderer = readFileSafe(rendererPath);
  const preload = readFileSafe(preloadPath);

  if (renderer == null) {
    findings.push(
      makeFinding({
        id: "CRED-000",
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.CREDENTIAL_BOUNDARY,
        title: "sourcedeck.html missing — cannot verify renderer boundary",
        status: STATUSES.FAIL,
        file: "sourcedeck.html",
        remediation: "Confirm sourcedeck-app working tree is checked out at repo root.",
      })
    );
  } else {
    // CRED-001: legacy localStorage SET for AI keys
    for (const pat of FORBIDDEN_RENDERER_SET_KEYS) {
      if (pat.test(renderer)) {
        findings.push(
          makeFinding({
            id: "CRED-001",
            severity: SEVERITIES.CRITICAL,
            category: CATEGORIES.CREDENTIAL_BOUNDARY,
            title: "Renderer writes AI provider key to localStorage",
            status: STATUSES.FAIL,
            file: "sourcedeck.html",
            evidence: `pattern matched: ${pat.source}`,
            remediation:
              "Remove the setItem call. AI provider keys must be stored via main-process safeStorage (PREV-001). See docs/troubleshooting-knowledge-base/diagnostic-playbooks.md.",
          })
        );
      }
    }
    if (!findings.some((f) => f.id === "CRED-001")) {
      findings.push(
        makeFinding({
          id: "CRED-001",
          severity: SEVERITIES.CRITICAL,
          category: CATEGORIES.CREDENTIAL_BOUNDARY,
          title: "No renderer localStorage.setItem for AI provider keys",
          status: STATUSES.PASS,
          file: "sourcedeck.html",
        })
      );
    }

    // CRED-002: direct fetch to provider APIs from renderer
    for (const pat of FORBIDDEN_RENDERER_DIRECT_FETCH) {
      if (pat.test(renderer)) {
        findings.push(
          makeFinding({
            id: "CRED-002",
            severity: SEVERITIES.CRITICAL,
            category: CATEGORIES.CREDENTIAL_BOUNDARY,
            title: "Renderer makes direct fetch to AI provider API",
            status: STATUSES.FAIL,
            file: "sourcedeck.html",
            evidence: `pattern matched: ${pat.source}`,
            remediation:
              "Route through window.sd.ai.generate() IPC (PREV-003). Provider fetches must live in services/ai/providers/* under main process.",
          })
        );
      }
    }
    if (!findings.some((f) => f.id === "CRED-002")) {
      findings.push(
        makeFinding({
          id: "CRED-002",
          severity: SEVERITIES.CRITICAL,
          category: CATEGORIES.CREDENTIAL_BOUNDARY,
          title: "No direct AI provider fetches from renderer",
          status: STATUSES.PASS,
          file: "sourcedeck.html",
        })
      );
    }

    // CRED-003: Authorization/Bearer/x-api-key construction in renderer
    for (const pat of FORBIDDEN_RENDERER_AUTH_BUILDS) {
      if (pat.test(renderer)) {
        findings.push(
          makeFinding({
            id: "CRED-003",
            severity: SEVERITIES.CRITICAL,
            category: CATEGORIES.CREDENTIAL_BOUNDARY,
            title: "Renderer constructs Bearer/x-api-key header with raw key",
            status: STATUSES.FAIL,
            file: "sourcedeck.html",
            evidence: `pattern matched: ${pat.source}`,
            remediation:
              "Headers must be built in main-process provider modules only. Renderer must not see raw keys (PREV-002).",
          })
        );
      }
    }
    if (!findings.some((f) => f.id === "CRED-003")) {
      findings.push(
        makeFinding({
          id: "CRED-003",
          severity: SEVERITIES.CRITICAL,
          category: CATEGORIES.CREDENTIAL_BOUNDARY,
          title: "No Bearer/x-api-key header builds in renderer",
          status: STATUSES.PASS,
          file: "sourcedeck.html",
        })
      );
    }

    // CRED-004: window.*_KEY assignments with raw key shape
    const rawKeyAssignment = /window\.(OPENAI_KEY|CLAUDE_KEY|ANTHROPIC_KEY)\s*=\s*['"`](sk-[A-Za-z0-9-]{8,}|sk-ant-[A-Za-z0-9-]{8,})/;
    if (rawKeyAssignment.test(renderer)) {
      findings.push(
        makeFinding({
          id: "CRED-004",
          severity: SEVERITIES.CRITICAL,
          category: CATEGORIES.CREDENTIAL_BOUNDARY,
          title: "Renderer assigns raw provider key shape to window.*_KEY",
          status: STATUSES.FAIL,
          file: "sourcedeck.html",
          evidence: "raw key pattern (sk-*) assigned to window.*_KEY",
          remediation:
            "window.*_KEY must only hold sentinel presence strings like '<openai_credential_present>' (PREV-002).",
        })
      );
    } else {
      findings.push(
        makeFinding({
          id: "CRED-004",
          severity: SEVERITIES.CRITICAL,
          category: CATEGORIES.CREDENTIAL_BOUNDARY,
          title: "No raw provider key assigned to window.*_KEY",
          status: STATUSES.PASS,
          file: "sourcedeck.html",
        })
      );
    }
  }

  // Preload boundary
  if (preload == null) {
    findings.push(
      makeFinding({
        id: "CRED-010",
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.CREDENTIAL_BOUNDARY,
        title: "preload.js missing — cannot verify preload boundary",
        status: STATUSES.FAIL,
        file: "preload.js",
        remediation: "Confirm sourcedeck-app working tree is checked out at repo root.",
      })
    );
  } else {
    let preloadViolation = null;
    for (const pat of FORBIDDEN_PRELOAD_RAW_GETTERS) {
      if (pat.test(preload)) {
        preloadViolation = pat.source;
        break;
      }
    }
    findings.push(
      makeFinding({
        id: "CRED-010",
        severity: SEVERITIES.CRITICAL,
        category: CATEGORIES.CREDENTIAL_BOUNDARY,
        title: "preload exposes only presence/status surface (no raw key getter)",
        status: preloadViolation ? STATUSES.FAIL : STATUSES.PASS,
        file: "preload.js",
        evidence: preloadViolation ? `pattern matched: ${preloadViolation}` : "",
        remediation: preloadViolation
          ? "Remove raw credential getter from preload. Expose status/set/remove only (PREV-004)."
          : "",
      })
    );
  }

  // Presence of enforcement test files
  const requiredTests = [
    "test/credential-boundary-openai-claude.test.js",
    "test/credential-boundary.test.js",
    "test/renderer-ai-migration.test.js",
  ];
  for (const t of requiredTests) {
    const present = fileExists(path.join(rootDir, t));
    findings.push(
      makeFinding({
        id: `CRED-020:${t}`,
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.CREDENTIAL_BOUNDARY,
        title: `Required credential-boundary test exists: ${t}`,
        status: present ? STATUSES.PASS : STATUSES.FAIL,
        file: t,
        remediation: present ? "" : "Restore the test file. It enforces PREV-001..PREV-005.",
      })
    );
  }

  return findings;
}

// --------------------------------------------------------------------------
// B. Compliance / public-claim checks
// --------------------------------------------------------------------------

// Mirrors KB D-001 exactly. Bare "CMMC" / "HIPAA" appear legitimately in
// user-facing wizard placeholders inviting operators to describe their own
// differentiators — those are not SourceDeck claims. Use the specific
// claim-shaped phrases the KB enumerates.
const CERT_CLAIM_PHRASES = [
  "SOC 2",
  "FedRAMP",
  "HIPAA certified",
  "HITRUST",
  "ISO 27001",
];

const WATSONX_LIVE_PHRASES = [
  "watsonx live",
  "watsonx fully operational",
  "Powered by IBM watsonx",
  "production watsonx",
];

const FORBIDDEN_OUTCOME_CLAIMS = [
  "guarantees awards",
  "guaranteed contract",
  "wins contracts",
  "autonomously decides",
];

const OWNER_IDENTIFIERS = [
  "Jean-Max Charles",
  "jeanmax@",
  "@arcg.ai",
];

// Mirrors KB F-004 exactly — owner area-code signatures, not generic
// US phone patterns (which match placeholders + validation-comment examples).
const PHONE_PATTERNS = [
  /\(212\)\s*663/,
  /\(718\)\s*320/,
];

function runComplianceClaimChecks(rootDir) {
  const findings = [];
  const renderer = readFileSafe(path.join(rootDir, "sourcedeck.html"));
  if (renderer == null) return findings;

  function flagPhrases(id, phrases, severity, remediation) {
    const hits = phrases.filter((p) => renderer.includes(p));
    findings.push(
      makeFinding({
        id,
        severity,
        category: CATEGORIES.COMPLIANCE_CLAIM,
        title: `No shipped-source matches for: ${phrases.join(" | ")}`,
        status: hits.length ? STATUSES.FAIL : STATUSES.PASS,
        file: "sourcedeck.html",
        evidence: hits.length ? `matched phrases: ${hits.join(", ")}` : "",
        remediation: hits.length ? remediation : "",
      })
    );
  }

  flagPhrases(
    "CLAIM-001",
    CERT_CLAIM_PHRASES,
    SEVERITIES.HIGH,
    "Remove or guard the certification claim. SourceDeck holds none of these certifications. Operator-review required (NAR-009)."
  );

  flagPhrases(
    "CLAIM-002",
    WATSONX_LIVE_PHRASES,
    SEVERITIES.CRITICAL,
    "Remove watsonx 'live' / 'fully operational' wording. OPEN-002 is PARTIALLY FIXED; public copy gate stays closed until a real readiness check returns 'ready'."
  );

  flagPhrases(
    "CLAIM-003",
    FORBIDDEN_OUTCOME_CLAIMS,
    SEVERITIES.HIGH,
    "Remove outcome / autonomy overclaim. SourceDeck does not guarantee awards and does not act autonomously on GovCon decisions."
  );

  flagPhrases(
    "CLAIM-004",
    OWNER_IDENTIFIERS,
    SEVERITIES.HIGH,
    "Remove owner identifier from shipped source (SD-2026-001 / privacy gate)."
  );

  const phoneHits = PHONE_PATTERNS.flatMap((p) => renderer.match(new RegExp(p, "g")) || []);
  findings.push(
    makeFinding({
      id: "CLAIM-005",
      severity: SEVERITIES.HIGH,
      category: CATEGORIES.COMPLIANCE_CLAIM,
      title: "No US phone numbers in shipped renderer source",
      status: phoneHits.length ? STATUSES.FAIL : STATUSES.PASS,
      file: "sourcedeck.html",
      evidence: phoneHits.length ? `${phoneHits.length} match(es)` : "",
      remediation: phoneHits.length ? "Remove the phone number; privacy gate (SD-2026-001)." : "",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// C. Demo / download access
// --------------------------------------------------------------------------

const FORBIDDEN_PUBLIC_DEMO_CTA = [
  "Join for Free",
  "Free demo",
  "Book Enterprise Demo",
  "Install pack",
  "Enable in workspace",
];

function runDemoDownloadAccessChecks(rootDir) {
  const findings = [];
  const renderer = readFileSafe(path.join(rootDir, "sourcedeck.html"));
  if (renderer == null) return findings;

  const hits = FORBIDDEN_PUBLIC_DEMO_CTA.filter((p) => renderer.includes(p));
  findings.push(
    makeFinding({
      id: "DEMO-001",
      severity: SEVERITIES.MEDIUM,
      category: CATEGORIES.DEMO_DOWNLOAD_ACCESS,
      title: "No forbidden public demo/download CTAs in shipped app HTML",
      status: hits.length ? STATUSES.FAIL : STATUSES.PASS,
      file: "sourcedeck.html",
      evidence: hits.length ? `matched: ${hits.join(", ")}` : "",
      remediation: hits.length
        ? "All access surfaces must route through request-access only (SD-2026-011). Remove or rephrase the CTA."
        : "",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// D. GovCon safety
// --------------------------------------------------------------------------

function runGovConSafetyChecks(rootDir) {
  const findings = [];

  const govconChecks = [
    {
      id: "GOVCON-001",
      title: "RED_RESTRICTED window present in outreach-window service",
      file: "services/govcon/outreach-window.js",
      mustContain: /RED_RESTRICTED/,
      severity: SEVERITIES.CRITICAL,
      remediation:
        "Restore RED_RESTRICTED policy. Active solicitation + COR/program-office contact must block ALL outreach drafts.",
    },
    {
      id: "GOVCON-002",
      title: "KILL verdict present in fast-cash decision module",
      file: "services/govcon/fast-cash.js",
      mustContain: /\bKILL\b/,
      severity: SEVERITIES.CRITICAL,
      remediation: "Restore KILL verdict. KILL stays KILL — irreversible drop (per fast-cash header).",
    },
    {
      id: "GOVCON-003",
      title: "Premium content agent does not auto-post",
      file: "services/govcon/premium-content-agent.js",
      mustNotContain: /\bautoPost\s*[:=]\s*true\b|autoPublish\s*\(\s*\)/,
      severity: SEVERITIES.HIGH,
      remediation:
        "Premium content agent must require human approval before any publish/post action. Remove auto-publish path.",
    },
    {
      id: "GOVCON-004",
      title: "Outreach module does not auto-send",
      file: "services/govcon/opportunity-outreach.js",
      mustNotContain: /\bautoSend\s*[:=]\s*true\b|sendImmediately\s*\(\s*\)/,
      severity: SEVERITIES.CRITICAL,
      remediation:
        "Outreach must require human approval before send. Remove auto-send path; preserve outreach-window gate.",
    },
  ];

  for (const c of govconChecks) {
    const filePath = path.join(rootDir, c.file);
    const src = readFileSafe(filePath);
    if (src == null) {
      findings.push(
        makeFinding({
          id: c.id,
          severity: c.severity,
          category: CATEGORIES.GOVCON_SAFETY,
          title: `${c.title} (file missing)`,
          status: STATUSES.FAIL,
          file: c.file,
          remediation: `Missing file ${c.file}. ${c.remediation}`,
        })
      );
      continue;
    }
    if (c.mustContain) {
      const ok = c.mustContain.test(src);
      findings.push(
        makeFinding({
          id: c.id,
          severity: c.severity,
          category: CATEGORIES.GOVCON_SAFETY,
          title: c.title,
          status: ok ? STATUSES.PASS : STATUSES.FAIL,
          file: c.file,
          evidence: ok ? "" : `expected pattern not found: ${c.mustContain.source}`,
          remediation: ok ? "" : c.remediation,
        })
      );
    } else if (c.mustNotContain) {
      const bad = c.mustNotContain.test(src);
      findings.push(
        makeFinding({
          id: c.id,
          severity: c.severity,
          category: CATEGORIES.GOVCON_SAFETY,
          title: c.title,
          status: bad ? STATUSES.FAIL : STATUSES.PASS,
          file: c.file,
          evidence: bad ? `forbidden pattern matched: ${c.mustNotContain.source}` : "",
          remediation: bad ? c.remediation : "",
        })
      );
    }
  }

  // Human-approval language must remain documented somewhere obvious
  const playbooks = readFileSafe(
    path.join(rootDir, "docs/troubleshooting-knowledge-base/diagnostic-playbooks.md")
  );
  const humanApprovalPresent =
    playbooks &&
    /(human[- ]approval|human review|human[- ]in[- ]the[- ]loop|approval[- ]required|review gate|pre-publish review|requires? approval)/i.test(
      playbooks
    );
  findings.push(
    makeFinding({
      id: "GOVCON-005",
      severity: SEVERITIES.MEDIUM,
      category: CATEGORIES.GOVCON_SAFETY,
      title: "Human-approval language present in diagnostic-playbooks.md",
      status: humanApprovalPresent ? STATUSES.PASS : STATUSES.FAIL,
      file: "docs/troubleshooting-knowledge-base/diagnostic-playbooks.md",
      remediation: humanApprovalPresent
        ? ""
        : "Re-add human-approval / human-review language to the diagnostic playbooks.",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// E. Watsonx readiness policy
// --------------------------------------------------------------------------

function runWatsonxReadinessPolicyChecks(rootDir) {
  const findings = [];
  const readinessFile = path.join(rootDir, "services/ai/watsonx-readiness.js");
  const readiness = readFileSafe(readinessFile);
  const renderer = readFileSafe(path.join(rootDir, "sourcedeck.html"));
  const preload = readFileSafe(path.join(rootDir, "preload.js"));

  // E-001: file exists
  findings.push(
    makeFinding({
      id: "WX-001",
      severity: SEVERITIES.CRITICAL,
      category: CATEGORIES.WATSONX_READINESS_POLICY,
      title: "watsonx readiness module exists",
      status: readiness ? STATUSES.PASS : STATUSES.FAIL,
      file: "services/ai/watsonx-readiness.js",
      remediation: readiness
        ? ""
        : "Restore services/ai/watsonx-readiness.js — Phase 15B diagnostic surface.",
    })
  );

  if (readiness) {
    // E-002: status enum covers required classifications
    const requiredStatuses = [
      "ready",
      "provider_disabled",
      "missing_credentials",
      "unauthorized_401",
      "forbidden_403",
      "network_error",
    ];
    const missing = requiredStatuses.filter((s) => !readiness.includes(`'${s}'`) && !readiness.includes(`"${s}"`));
    findings.push(
      makeFinding({
        id: "WX-002",
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.WATSONX_READINESS_POLICY,
        title: "watsonx readiness classifies all required statuses",
        status: missing.length ? STATUSES.FAIL : STATUSES.PASS,
        file: "services/ai/watsonx-readiness.js",
        evidence: missing.length ? `missing statuses: ${missing.join(", ")}` : "",
        remediation: missing.length
          ? "Restore the missing status constants — readiness must classify deterministically (E-007)."
          : "",
      })
    );
  }

  // E-003: renderer/preload do not build watsonx auth headers
  const watsonxAuthBuild = /Authorization\s*:\s*[`'"]\s*Bearer[^`'"]*WATSONX|['"`]x-api-key['"`]\s*:\s*[`'"]?\s*\$?\{?\s*WATSONX/;
  for (const [name, src, file] of [
    ["renderer", renderer, "sourcedeck.html"],
    ["preload", preload, "preload.js"],
  ]) {
    if (src == null) continue;
    const bad = watsonxAuthBuild.test(src);
    findings.push(
      makeFinding({
        id: `WX-003:${name}`,
        severity: SEVERITIES.CRITICAL,
        category: CATEGORIES.WATSONX_READINESS_POLICY,
        title: `${name} does not build watsonx Authorization/Bearer/x-api-key`,
        status: bad ? STATUSES.FAIL : STATUSES.PASS,
        file,
        evidence: bad ? "watsonx auth header build detected" : "",
        remediation: bad
          ? "Move watsonx header construction to main-process provider only."
          : "",
      })
    );
  }

  // E-004: watsonx readiness diagnostic UI is wired in renderer.
  // The remediation copy itself is populated dynamically from
  // services/ai/watsonx-readiness.js — checking presence of the
  // diagnostic surface (id + trigger) is the stable invariant.
  if (renderer) {
    const hasReadinessUi =
      /id=["']watsonx-readiness-remediation["']/.test(renderer) &&
      /watsonxReadinessCheck\s*\(/.test(renderer);
    findings.push(
      makeFinding({
        id: "WX-004",
        severity: SEVERITIES.MEDIUM,
        category: CATEGORIES.WATSONX_READINESS_POLICY,
        title: "watsonx readiness diagnostic UI present in renderer",
        status: hasReadinessUi ? STATUSES.PASS : STATUSES.FAIL,
        file: "sourcedeck.html",
        remediation: hasReadinessUi
          ? ""
          : "Restore the watsonx readiness sub-panel (#watsonx-readiness-remediation + watsonxReadinessCheck() trigger) in settings.",
      })
    );
  }

  // E-005: OPEN-002 still partial — manual reminder so operators don't claim watsonx is live
  findings.push(
    makeFinding({
      id: "WX-005",
      severity: SEVERITIES.HIGH,
      category: CATEGORIES.WATSONX_READINESS_POLICY,
      title: "OPEN-002 remains PARTIALLY FIXED — IBM-side action still required",
      status: STATUSES.MANUAL,
      file: "docs/troubleshooting-knowledge-base/open-issues.md",
      remediation:
        "Do not claim watsonx is live. Live readiness from settings panel must report 'ready' before public copy changes.",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// F. Release readiness
// --------------------------------------------------------------------------

const REQUIRED_PACKAGE_SCRIPTS = [
  "test",
  "govcon:smoke",
  "govcon:outreach-os:audit",
  "phase13:rc-check",
  "i18n:audit",
];

function runReleaseReadinessChecks(rootDir) {
  const findings = [];
  const pkgPath = path.join(rootDir, "package.json");
  const pkgRaw = readFileSafe(pkgPath);
  let pkg = null;
  try {
    pkg = pkgRaw ? JSON.parse(pkgRaw) : null;
  } catch {
    pkg = null;
  }

  findings.push(
    makeFinding({
      id: "REL-001",
      severity: SEVERITIES.HIGH,
      category: CATEGORIES.RELEASE_READINESS,
      title: "scripts/release-check.js exists",
      status: fileExists(path.join(rootDir, "scripts/release-check.js"))
        ? STATUSES.PASS
        : STATUSES.FAIL,
      file: "scripts/release-check.js",
      remediation:
        "Restore the release-check script — it owns the privacy gate (F-003).",
    })
  );

  // Privacy-gate strings still scanned by release-check
  const releaseCheckSrc = readFileSafe(path.join(rootDir, "scripts/release-check.js"));
  if (releaseCheckSrc) {
    const hasPrivacyGate =
      /privacy[ _-]?gate/i.test(releaseCheckSrc) &&
      /MOCK_LEADS/.test(releaseCheckSrc) &&
      /PROMPT_LIBRARY/.test(releaseCheckSrc);
    findings.push(
      makeFinding({
        id: "REL-002",
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.RELEASE_READINESS,
        title: "Privacy gate in release-check scans shipped source",
        status: hasPrivacyGate ? STATUSES.PASS : STATUSES.FAIL,
        file: "scripts/release-check.js",
        remediation: hasPrivacyGate
          ? ""
          : "Restore privacy-gate scanning (MOCK_LEADS, PROMPT_LIBRARY) — NAR-003 (do not loosen the blocklist).",
      })
    );
  }

  // Package scripts present
  for (const s of REQUIRED_PACKAGE_SCRIPTS) {
    const present = pkg && pkg.scripts && typeof pkg.scripts[s] === "string";
    findings.push(
      makeFinding({
        id: `REL-010:${s}`,
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.RELEASE_READINESS,
        title: `package.json defines script: ${s}`,
        status: present ? STATUSES.PASS : STATUSES.FAIL,
        file: "package.json",
        remediation: present ? "" : `Restore the "${s}" script in package.json.`,
      })
    );
  }

  // macOS signing — manual unless env says signing is configured
  const signingEnv = !!(process.env.CSC_LINK || process.env.APPLE_ID || process.env.APPLE_TEAM_ID);
  findings.push(
    makeFinding({
      id: "REL-020",
      severity: SEVERITIES.MEDIUM,
      category: CATEGORIES.RELEASE_READINESS,
      title: "macOS signing / notarization configured",
      status: signingEnv ? STATUSES.PASS : STATUSES.MANUAL,
      file: null,
      evidence: signingEnv
        ? "CSC_LINK / APPLE_ID present"
        : "no signing env detected; expected outside a signing environment",
      remediation: signingEnv
        ? "Run `npm run release:mac-signing-readiness:strict` to confirm `ready_to_sign` before publishing."
        : "Sign + notarize only from a configured signing environment. Run `npm run release:mac-signing-readiness` (local dev, non-blocking) or `npm run release:mac-signing-readiness:strict` (release env). Daily scans outside a signing env will report this as manual.",
    })
  );

  // REL-030 — Release Evidence Capture wiring exists and at least one
  // generated report is available. Non-blocking: status is PASS when the
  // module + CLI exist; WARN if neither a latest report nor a dated one
  // has been produced yet. Never FAIL (daily CI must not fail because
  // an operator has not yet captured a release-evidence bundle).
  const evModule = path.join(rootDir, "services", "release", "release-evidence.js");
  const evCli    = path.join(rootDir, "scripts", "release-evidence.js");
  const evDir    = path.join(rootDir, "reports", "release-evidence");
  const latestMd = path.join(evDir, "latest-release-evidence.md");
  const latestJson = path.join(evDir, "latest-release-evidence.json");
  const wired = fs.existsSync(evModule) && fs.existsSync(evCli);
  const captured = fs.existsSync(latestMd) || fs.existsSync(latestJson);
  findings.push(
    makeFinding({
      id: "REL-030",
      severity: SEVERITIES.MEDIUM,
      category: CATEGORIES.RELEASE_READINESS,
      title: "Release Evidence Capture present and reachable",
      status: !wired ? STATUSES.MANUAL : (captured ? STATUSES.PASS : STATUSES.WARN),
      file: null,
      evidence: !wired
        ? "release-evidence module or CLI not present"
        : (captured
            ? "release-evidence reports present under reports/release-evidence/"
            : "module + CLI present but no captured report yet"),
      remediation:
        "Run `npm run release:evidence` to capture a bundle. For a release-environment gate, run `npm run release:evidence:strict` — that exits 1 on dirty tree, missing asar files, or blocked signing readiness. This finding is never FAIL by design; it only surfaces that evidence capture should be exercised.",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// G. SourceDeck health (privacy-gate inputs)
// --------------------------------------------------------------------------

function runSourceDeckHealthChecks(rootDir) {
  const findings = [];
  const renderer = readFileSafe(path.join(rootDir, "sourcedeck.html"));
  if (renderer == null) return findings;

  // MOCK_LEADS must be empty array
  const mockLeads = renderer.match(/MOCK_LEADS\s*=\s*\[([\s\S]*?)\]/);
  const mockLeadsOk = mockLeads && mockLeads[1].trim() === "";
  findings.push(
    makeFinding({
      id: "HEALTH-001",
      severity: SEVERITIES.HIGH,
      category: CATEGORIES.SOURCEDECK_HEALTH,
      title: "MOCK_LEADS is empty in shipped renderer",
      status: mockLeads == null ? STATUSES.WARN : mockLeadsOk ? STATUSES.PASS : STATUSES.FAIL,
      file: "sourcedeck.html",
      evidence:
        mockLeads == null ? "MOCK_LEADS declaration not found (may be renamed)" : mockLeadsOk ? "" : "MOCK_LEADS contains entries",
      remediation:
        mockLeads == null
          ? "Confirm renderer privacy-gate variables are still named as scanned by release-check."
          : mockLeadsOk
          ? ""
          : "Clear MOCK_LEADS before shipping (SD-2026-001).",
    })
  );

  // PROMPT_LIBRARY may ship as either {} or [] depending on shape;
  // release-check.js scans for the {} object form today.
  const promptLib =
    renderer.match(/PROMPT_LIBRARY\s*=\s*\{([\s\S]*?)\};/) ||
    renderer.match(/PROMPT_LIBRARY\s*=\s*\[([\s\S]*?)\]/);
  const promptLibOk = promptLib && promptLib[1].trim() === "";
  findings.push(
    makeFinding({
      id: "HEALTH-002",
      severity: SEVERITIES.HIGH,
      category: CATEGORIES.SOURCEDECK_HEALTH,
      title: "PROMPT_LIBRARY is empty in shipped renderer",
      status: promptLib == null ? STATUSES.WARN : promptLibOk ? STATUSES.PASS : STATUSES.FAIL,
      file: "sourcedeck.html",
      evidence:
        promptLib == null
          ? "PROMPT_LIBRARY declaration not found (may be renamed)"
          : promptLibOk
          ? ""
          : "PROMPT_LIBRARY contains entries",
      remediation:
        promptLib == null
          ? "Confirm renderer privacy-gate variables are still named as scanned by release-check."
          : promptLibOk
          ? ""
          : "Clear PROMPT_LIBRARY before shipping (SD-2026-001).",
    })
  );

  return findings;
}

// --------------------------------------------------------------------------
// H. KB integrity
// --------------------------------------------------------------------------

const KB_FILES = [
  "docs/troubleshooting-knowledge-base/README.md",
  "docs/troubleshooting-knowledge-base/agent-rules.md",
  "docs/troubleshooting-knowledge-base/diagnostic-playbooks.md",
  "docs/troubleshooting-knowledge-base/error-repair-ledger.md",
  "docs/troubleshooting-knowledge-base/evidence-index.md",
  "docs/troubleshooting-knowledge-base/open-issues.md",
  "docs/troubleshooting-knowledge-base/repo-inventory.md",
];

function runKnowledgeBaseIntegrityChecks(rootDir) {
  const findings = [];
  for (const f of KB_FILES) {
    const present = fileExists(path.join(rootDir, f));
    findings.push(
      makeFinding({
        id: `KB-001:${f}`,
        severity: SEVERITIES.MEDIUM,
        category: CATEGORIES.KB_INTEGRITY,
        title: `KB file exists: ${f}`,
        status: present ? STATUSES.PASS : STATUSES.FAIL,
        file: f,
        remediation: present ? "" : "Restore the KB file from history.",
      })
    );
  }

  const openIssues = readFileSafe(path.join(rootDir, "docs/troubleshooting-knowledge-base/open-issues.md"));
  if (openIssues) {
    const partial = /OPEN-002[\s\S]{0,500}PARTIALLY FIXED/i.test(openIssues);
    findings.push(
      makeFinding({
        id: "KB-002",
        severity: SEVERITIES.HIGH,
        category: CATEGORIES.KB_INTEGRITY,
        title: "OPEN-002 still marked PARTIALLY FIXED in open-issues.md",
        status: partial ? STATUSES.PASS : STATUSES.WARN,
        file: "docs/troubleshooting-knowledge-base/open-issues.md",
        remediation: partial
          ? ""
          : "Do not promote OPEN-002 to FIXED until a live readiness 'ready' result is captured (NAR-009 spirit).",
      })
    );
  }

  const agentRules = readFileSafe(path.join(rootDir, "docs/troubleshooting-knowledge-base/agent-rules.md"));
  if (agentRules) {
    findings.push(
      makeFinding({
        id: "KB-003",
        severity: SEVERITIES.MEDIUM,
        category: CATEGORIES.KB_INTEGRITY,
        title: "agent-rules.md contains daily scan checklist",
        status: /Daily Scan Checklist/i.test(agentRules) ? STATUSES.PASS : STATUSES.FAIL,
        file: "docs/troubleshooting-knowledge-base/agent-rules.md",
        remediation: "Restore the daily scan checklist.",
      })
    );
  }

  const playbooks = readFileSafe(path.join(rootDir, "docs/troubleshooting-knowledge-base/diagnostic-playbooks.md"));
  if (playbooks) {
    findings.push(
      makeFinding({
        id: "KB-004",
        severity: SEVERITIES.MEDIUM,
        category: CATEGORIES.KB_INTEGRITY,
        title: "diagnostic-playbooks.md covers credential + watsonx playbooks",
        status:
          /credential/i.test(playbooks) && /watsonx/i.test(playbooks)
            ? STATUSES.PASS
            : STATUSES.FAIL,
        file: "docs/troubleshooting-knowledge-base/diagnostic-playbooks.md",
        remediation: "Restore credential and watsonx diagnostic playbooks.",
      })
    );
  }

  return findings;
}

// --------------------------------------------------------------------------
// Orchestration
// --------------------------------------------------------------------------

function runTroubleshootingScan(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const startedAt = new Date().toISOString();

  const findings = []
    .concat(runCredentialBoundaryChecks(rootDir))
    .concat(runComplianceClaimChecks(rootDir))
    .concat(runDemoDownloadAccessChecks(rootDir))
    .concat(runGovConSafetyChecks(rootDir))
    .concat(runWatsonxReadinessPolicyChecks(rootDir))
    .concat(runReleaseReadinessChecks(rootDir))
    .concat(runSourceDeckHealthChecks(rootDir))
    .concat(runKnowledgeBaseIntegrityChecks(rootDir));

  // Auto-repair invariant: any finding that says otherwise is a bug.
  for (const f of findings) {
    if (f.autoRepairAllowed !== false || f.requiresHumanApproval !== true) {
      throw new Error(
        `[troubleshooting-agent] invariant violation on finding ${f.id}: ` +
          `autoRepairAllowed must be false, requiresHumanApproval must be true`
      );
    }
  }

  const summary = summarize(findings);
  return {
    agent: "sourcedeck-daily-troubleshooting-agent",
    version: AGENT_VERSION,
    schema: SCHEMA_VERSION,
    rootDir,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary,
    findings,
  };
}

function summarize(findings) {
  const counts = { pass: 0, fail: 0, warn: 0, manual: 0, total: findings.length };
  const sev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let criticalOrHighFail = 0;
  for (const f of findings) {
    counts[f.status] = (counts[f.status] || 0) + 1;
    if (f.status === STATUSES.FAIL) {
      sev[f.severity] = (sev[f.severity] || 0) + 1;
      if (f.severity === SEVERITIES.CRITICAL || f.severity === SEVERITIES.HIGH) {
        criticalOrHighFail += 1;
      }
    }
  }
  return { counts, failuresBySeverity: sev, criticalOrHighFail };
}

function formatTroubleshootingReport(result, opts = {}) {
  const lines = [];
  const fmt = opts.format || "markdown";
  const { summary, findings, startedAt } = result;

  if (fmt === "json") {
    return JSON.stringify(result, null, 2);
  }

  lines.push("# SourceDeck Daily Troubleshooting Report");
  lines.push("");
  lines.push(`- agent: ${result.agent}`);
  lines.push(`- version: ${result.version}`);
  lines.push(`- run started: ${startedAt}`);
  lines.push(`- rootDir: ${result.rootDir}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| status | count |`);
  lines.push(`|---|---|`);
  for (const k of ["pass", "fail", "warn", "manual"]) {
    lines.push(`| ${k} | ${summary.counts[k] || 0} |`);
  }
  lines.push(`| total | ${summary.counts.total} |`);
  lines.push("");
  lines.push(`Critical/High failures: **${summary.criticalOrHighFail}**`);
  lines.push("");

  const byCat = {};
  for (const f of findings) {
    (byCat[f.category] = byCat[f.category] || []).push(f);
  }

  for (const cat of Object.keys(byCat).sort()) {
    lines.push(`## Category: ${cat}`);
    lines.push("");
    lines.push("| id | severity | status | title | file |");
    lines.push("|---|---|---|---|---|");
    for (const f of byCat[cat]) {
      const fileCell = f.file || "-";
      lines.push(
        `| ${f.id} | ${f.severity} | ${f.status} | ${escapePipe(f.title)} | ${escapePipe(fileCell)} |`
      );
    }
    lines.push("");
    const failing = byCat[cat].filter(
      (f) => f.status === STATUSES.FAIL || f.status === STATUSES.WARN
    );
    if (failing.length) {
      lines.push(`### Findings requiring attention in ${cat}`);
      lines.push("");
      for (const f of failing) {
        lines.push(`#### ${f.id} — ${escapePipe(f.title)}`);
        lines.push(`- severity: \`${f.severity}\``);
        lines.push(`- status: \`${f.status}\``);
        if (f.file) lines.push(`- file: \`${f.file}\``);
        if (f.evidence) lines.push(`- evidence: ${escapePipe(f.evidence)}`);
        if (f.remediation) lines.push(`- remediation: ${escapePipe(f.remediation)}`);
        lines.push("- autoRepairAllowed: `false`");
        lines.push("- requiresHumanApproval: `true`");
        lines.push("");
      }
    }
  }

  const manual = findings.filter((f) => f.status === STATUSES.MANUAL);
  if (manual.length) {
    lines.push("## Manual-only items");
    lines.push("");
    for (const f of manual) {
      lines.push(`- **${f.id}** — ${escapePipe(f.title)} — ${escapePipe(f.remediation || "")}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("Auto-repair is disabled for every finding. Operator review required.");

  return lines.join("\n") + "\n";
}

function escapePipe(s) {
  return String(s).replace(/\|/g, "\\|");
}

module.exports = {
  AGENT_VERSION,
  SCHEMA_VERSION,
  CATEGORIES,
  SEVERITIES,
  STATUSES,
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
};

# Daily SourceDeck Troubleshooting Agent — Audit

**Phase:** 16A — Daily Troubleshooting Agent
**Repo scope:** `sourcedeck-app` (single-repo agent; cross-repo and site-route checks from the KB are out of scope for this phase)
**Reads from:** `docs/troubleshooting-knowledge-base/agent-rules.md` and related KB files
**Status when written:** main at `0e450b2` (PR #28 merged). All existing gates green.

---

## 1. Existing health / test scripts (current state)

| Surface | Script / file | Purpose | Used by agent? |
|---|---|---|---|
| Privacy gate | `scripts/release-check.js` | Scan shipped source for owner strings, MOCK_LEADS, PROMPT_LIBRARY, default brand neutrality; macOS signing report | **Yes** — invoked indirectly (presence + script-exit check); we do not duplicate its grep logic |
| Test suite | `npm test` | 30+ test files including `credential-boundary*`, `renderer-ai-migration`, `watsonx-runtime-context`, `ibm-readiness`, GovCon suites | **Yes** — presence-check only (agent does not re-run the full suite) |
| GovCon smoke | `scripts/govcon-release-smoke.mjs` | Manual-QA / release-notes presence + structural checks | **Yes** — presence + package-script check |
| GovCon outreach OS | `scripts/govcon-outreach-os-audit.mjs` | Audits outreach-window + RED_RESTRICTED policy | **Yes** — presence + package-script check |
| Phase 13 RC | `scripts/phase-13-rc-check.mjs` | Release-candidate completeness gate | **Yes** — presence + package-script check |
| i18n audit | `scripts/audit-i18n.mjs` | Spanish dictionary completeness | **Yes** — presence + package-script check |
| Premium content agent audit | `scripts/audit-premium-content-agent.mjs` | Content-agent posture / claim safety | **Yes** — presence-check only |

The daily agent **does not** re-run heavyweight gates inside the scan. It verifies that the gates exist, that the package scripts are wired, and reads source files for boundary/claim regressions. Operators run the gates separately (and in CI).

---

## 2. KB rules that map to this phase's checks

Mapped from `docs/troubleshooting-knowledge-base/agent-rules.md`:

| KB rule | Phase 16A coverage |
|---|---|
| A-001 privacy gate clean | `runReleaseReadinessChecks` (presence of `scripts/release-check.js`) |
| A-004 / A-005 / A-005b renderer credential boundary | `runCredentialBoundaryChecks` |
| A-005c credential boundary tests | `runCredentialBoundaryChecks` (presence of test files) |
| A-007 test suite | `runReleaseReadinessChecks` (presence of `npm test` chain) |
| B-005 / B-006 MOCK_LEADS / PROMPT_LIBRARY empty | `runSourceDeckHealthChecks` |
| D-001 no false SOC 2 / FedRAMP / HIPAA / HITRUST / ISO claims | `runComplianceClaimChecks` |
| D-002 no "watsonx live / fully operational" until ready | `runComplianceClaimChecks` + `runWatsonxReadinessPolicyChecks` |
| D-003 no free demo/download CTA (sourcedeck-app surfaces) | `runDemoDownloadAccessChecks` |
| D-006 no owner personal identifiers in shipped HTML | `runComplianceClaimChecks` |
| F-003 release-check exists | `runReleaseReadinessChecks` |
| F-004 no phone numbers in shipped HTML | `runComplianceClaimChecks` |
| E-007 watsonx readiness classifies failures + no header builds in renderer/preload | `runWatsonxReadinessPolicyChecks` |
| PREV-001..005 credential prevention rules | `runCredentialBoundaryChecks` |
| RED_RESTRICTED / KILL / no-auto-send / no-auto-post / human approval | `runGovConSafetyChecks` |
| KB integrity (KB files exist; OPEN-002 still partial; daily checklist + playbooks present) | (KB integrity check inside the engine) |

KB rules out of scope for this phase (target other repos or routes; not this repo):

- A-002 site PII scanner (sourcedeck-site)
- A-003 demo parity (sourcedeck-site)
- A-006 TypeScript compile (ARCGSystems)
- A-008 site server tests
- B-001..B-004 (other repos)
- C-001..C-010 HTTP route checks
- D-004 / D-005 site-only copy
- E-001..E-006 external integrations
- F-001 / F-002 / F-005 (sourcedeck-site)
- G-001..G-005 perf/accessibility

These remain valid KB rules; a later phase (16B+) can add an HTTP / cross-repo wrapper. **This phase deliberately stays local-only and repo-native.**

---

## 3. Auto-repair policy

**Every** finding emitted by this agent has `autoRepairAllowed: false` and `requiresHumanApproval: true`. The agent does not modify product code, never opens PRs by itself, and never amends a commit. Operators see findings via the markdown / JSON report and decide.

Hard exclusions (NAR-001..NAR-010 from the KB) are explicitly enumerated as "never auto-repair" inside the engine constants so future contributors can't relax them without reading the KB.

---

## 4. Findings schema

```js
{
  id: string,                  // stable check id, e.g. "CRED-001"
  severity: "critical" | "high" | "medium" | "low" | "info",
  category: string,            // "credential_boundary" | "compliance_claim" | ...
  title: string,
  status: "pass" | "fail" | "warn" | "manual",
  evidence: string,            // short, secret-free
  file: string | null,         // relative path or null
  remediation: string,         // operator-facing next step
  autoRepairAllowed: false,    // invariant
  requiresHumanApproval: true  // invariant
}
```

Severity / status semantics:
- `critical` + `fail` → exits 1 in strict mode AND in default mode
- `high` + `fail` → exits 1
- `medium` / `low` + `fail` → exits 0 (recorded only)
- `manual` → never fails the run; flagged in summary so an operator knows action is needed (e.g. macOS signing env outside a signing environment; OPEN-002 IBM-side action)

---

## 5. Output / reporting design

- **Default run** prints a readable summary to stdout and writes a markdown report to:
  - `reports/troubleshooting/latest-troubleshooting-report.md`
  - `reports/troubleshooting/YYYY-MM-DD-troubleshooting-report.md`
- **`--json`** writes both `latest-troubleshooting-report.json` and a timestamped JSON file.
- **`--out <path>`** overrides the output path for the primary artifact.
- **`--strict`** treats `high` failures the same as `critical` (already exit-1) AND fails the run if any `medium` failure exists.

Reports are **not** committed by the daily workflow; the GitHub Actions job uploads them as a build artifact.

---

## 6. Manual-only checks (cannot run inside this agent)

| Item | Why it's manual |
|---|---|
| macOS signing/notarization presence in a signing environment | Local/CI machines without signing env will warn. Surface as `manual` so a non-signing CI run still passes. |
| OPEN-002 IBM-side runtime context fix | Requires IBM Support to migrate runtime context; agent only confirms diagnostic surface still exists |
| Live watsonx readiness `ready` confirmation | Requires real settings-panel run with credentials; agent verifies code path + public-copy gate |
| HTTP route reachability | Out of scope; cross-repo / route phase |

These surface as `status: "manual"` so operators know to handle them out-of-band.

---

## 7. Files this phase introduces

| Path | Role |
|---|---|
| `services/troubleshooting/troubleshooting-agent.js` | Scan engine with the named exports |
| `scripts/run-troubleshooting-agent.js` | CLI runner |
| `.github/workflows/daily-troubleshooting-agent.yml` | Scheduled + manual workflow |
| `test/troubleshooting-agent.test.js` | Test suite |
| `test/fixtures/troubleshooting-agent/` | Synthetic fixtures (no real secrets) |
| `docs/release-notes/daily-troubleshooting-agent.md` | Release notes |
| `reports/troubleshooting/.gitkeep` | Reports dir placeholder; daily output is gitignored |
| `.gitignore` (modified) | Ignore generated report files |
| `package.json` (modified) | `troubleshooting:scan`, `:json`, `:strict`; test chain extension |
| `docs/troubleshooting-knowledge-base/{README,agent-rules,open-issues}.md` (modified) | Reflect the daily agent's existence and outputs |

Out-of-scope (future phases): cross-repo runner, HTTP route checks, email notifications, GitHub issue auto-create, Slack/webhook alerts.

# SourceDeck Troubleshooting Agent — Rules & Daily Checklist

Rules for the future SourceDeck Troubleshooting Agent. This agent will run daily automated health checks across all SourceDeck repos and surfaces.

**Last updated:** 2026-05-30
**Agent scope:** All repos + all production surfaces under sourcedeck.app domain
**Implementation status:** Phase 16A — repo-native scan for `sourcedeck-app` only. Cross-repo + HTTP route checks remain a later phase.

## Phase 16A — Daily Agent (shipped 2026-05-30)

The first production-safe version of the agent runs against this repo only. See `services/troubleshooting/troubleshooting-agent.js`, `scripts/run-troubleshooting-agent.js`, and `.github/workflows/daily-troubleshooting-agent.yml`.

Mapping of KB checks to this phase's coverage:

| KB check | Phase 16A finding id | Notes |
|---|---|---|
| A-004 / A-005 / A-005b renderer credential boundary | `CRED-001`, `CRED-002`, `CRED-003`, `CRED-004` | Catches `localStorage.setItem('lcc_OPENAI_KEY'…)`, direct provider fetches, Bearer/x-api-key construction, raw-key window assignment |
| A-005c credential boundary tests present | `CRED-020:*` | Presence-check only; full suite still runs in `npm test` |
| B-005 / B-006 MOCK_LEADS / PROMPT_LIBRARY empty | `HEALTH-001`, `HEALTH-002` | Matches release-check shape ({} for PROMPT_LIBRARY) |
| D-001 false certification claims | `CLAIM-001` | Mirrors KB exact phrases |
| D-002 watsonx live wording | `CLAIM-002` | Critical-severity OPEN-002 gate |
| D-003 free demo/download CTAs (app-side) | `DEMO-001` | App-side only this phase |
| D-006 owner identifiers | `CLAIM-004` | |
| F-003 release gate exists | `REL-001`, `REL-002`, `REL-010:*` | |
| F-004 owner phone signatures | `CLAIM-005` | Mirrors KB `(212) 663`, `(718) 320` |
| E-007 watsonx readiness classifier + safe UI surface | `WX-001`..`WX-005` | WX-005 is `manual` until OPEN-002 IBM-side action completes |
| E-010 watsonx runtime evidence probe (Phase 18A) | `WX-006` | PASS only on `verified_ready`; MANUAL/WARN on `not_configured` / `blocked_by_ibm_config`; FAIL only on app-side regression |
| RED_RESTRICTED / KILL / no-auto-send / no-auto-post | `GOVCON-001`..`GOVCON-004` | |
| Human-approval language in playbooks | `GOVCON-005` | |
| KB integrity (7 files + OPEN-002 partial state) | `KB-001:*`, `KB-002`, `KB-003`, `KB-004` | |

KB checks **not** covered by this phase (target other repos or routes; will be picked up by a later phase):
A-002, A-003, A-006, A-008, B-001..B-004, C-001..C-010, D-004, D-005, E-001..E-006, F-001, F-002, F-005, G-001..G-005.

Hard rules carried into the engine:
- Every finding ships `autoRepairAllowed: false` and `requiresHumanApproval: true`. A runtime assertion throws if any check returns otherwise.
- NAR-001..NAR-010 stay enumerated as "never auto-repair." No engine code path bypasses them.
- The daily workflow uses `permissions: contents: read` and references no secrets.

---

## Daily Scan Checklist

Run all checks below every 24 hours. Log results with timestamp, check ID, pass/fail, and any output captured.

---

### CATEGORY A: Repo Health

| Check ID | Check | Command | Alert Threshold | Related Events |
|---|---|---|---|---|
| A-001 | Privacy gate clean | `cd sourcedeck-app && npm run release:check` | Any failure | SD-2026-001, SD-2026-013 |
| A-002 | Site PII scanner | `cd sourcedeck-site && node scripts/check-private-data.js` | Any failure | SD-2026-013, SD-2026-019 |
| A-003 | Demo parity | `cd sourcedeck-site && node scripts/check-demo-parity.js` | Any failure | SD-2026-013 |
| A-004 | No renderer localStorage writes for AI keys | `grep -c "localStorage.setItem.*lcc_OPENAI_KEY\|localStorage.setItem.*lcc_CLAUDE_KEY" sourcedeck-app/sourcedeck.html` | > 0 | SD-2026-041 (Fixed Phase 15A) |
| A-005 | No direct API fetch to OpenAI/Anthropic from renderer | `grep -cE "fetch\('https://api\.(openai\|anthropic)\.com" sourcedeck-app/sourcedeck.html` | > 0 | SD-2026-041 (Fixed Phase 15A) |
| A-005b | No Bearer/x-api-key header builds in renderer | `grep -cE "Bearer.*OPENAI_KEY\|x-api-key.*CLAUDE_KEY" sourcedeck-app/sourcedeck.html` | > 0 | SD-2026-004, SD-2026-041 |
| A-005c | Credential boundary test suite passes | `node test/credential-boundary-openai-claude.test.js` | Any failure | SD-2026-041 (Phase 15A) |
| A-006 | TypeScript compile | `cd ARCGSystems && npx tsc --noEmit` | Any error | SD-2026-034 |
| A-007 | Test suite (sourcedeck-app) | `cd sourcedeck-app && npm test` | Any failure | SD-2026-005 |
| A-008 | Test suite (sourcedeck-site server) | `cd sourcedeck-site/server && npm test` | Any failure | SD-2026-012 |

---

### CATEGORY B: Build Checks

| Check ID | Check | Command | Alert Threshold | Related Events |
|---|---|---|---|---|
| B-001 | vercel.json framework null (site) | `cat sourcedeck-site/vercel.json \| grep '"framework"'` | Missing or not null | SD-2026-008 |
| B-002 | vercel.json buildCommand empty (site) | `cat sourcedeck-site/vercel.json \| grep '"buildCommand"'` | Missing or non-empty string | SD-2026-008 |
| B-003 | No vercel.json in ARCGSystems root | `test -f ARCGSystems/vercel.json && echo PRESENT` | PRESENT | SD-2026-033 |
| B-004 | Electron in dependencies | `cat arcg-lcc/package.json \| node -e "const p=JSON.parse(require('fs').readFileSync('/dev/stdin')); console.log(p.dependencies?.electron ? 'OK' : 'MISSING')"` | MISSING | SD-2026-036 |
| B-005 | MOCK_LEADS empty | `grep -oP "MOCK_LEADS\s*=\s*\[.*?\]" sourcedeck-app/sourcedeck.html` | Non-empty array | SD-2026-001 |
| B-006 | PROMPT_LIBRARY empty | `grep -c "PROMPT_LIBRARY" sourcedeck-app/sourcedeck.html` | Shows populated content | SD-2026-001 |

---

### CATEGORY C: Route / URL Checks

| Check ID | Check | Method | Alert Threshold | Related Events |
|---|---|---|---|---|
| C-001 | sourcedeck.app returns 200 | HTTP GET | Non-200 | General |
| C-002 | /request-access/ returns 200 | HTTP GET | Non-200 | SD-2026-011 |
| C-003 | /app/demo/ returns 200 or redirect | HTTP GET | 404 | SD-2026-011 |
| C-004 | /app/downloads/ returns 200 | HTTP GET | 404 | SD-2026-014 |
| C-005 | /auth/callback/ NOT cached by SW | Check sw.js NEVER_CACHE_PATHS | Missing | SD-2026-015 |
| C-006 | chartnavmd.com redirects to arcgsystems.com/chartnav | HTTP GET chartnavmd.com | Non-301/302 | SD-2026-009 |
| C-007 | sitemap.xml URLs return 200 | HTTP GET each entry | Any 404 | SD-2026-014 |
| C-008 | /pricing/ returns 200 | HTTP GET | Non-200 | General |
| C-009 | /agents/ returns 200 | HTTP GET | Non-200 | General |
| C-010 | /security/ returns 200 | HTTP GET | Non-200 | General |

---

### CATEGORY D: Compliance / Copy Checks

| Check ID | Check | Command | Alert Threshold | Related Events |
|---|---|---|---|---|
| D-001 | No false certification claims | `grep -rn "SOC 2\|FedRAMP\|HIPAA certified\|HITRUST\|ISO 27001" sourcedeck-site --include="*.html" \| grep -v docs/` | Any match | SD-2026-019 |
| D-002 | No "Powered by IBM watsonx" until smoke test | `grep -rn "Powered by IBM watsonx\|production.*watsonx" sourcedeck-site --include="*.html"` | Any match | SD-2026-019 |
| D-003 | No free demo/download CTAs | `grep -rn "Join for Free\|free demo\|Book Enterprise Demo\|Install pack\|Enable in workspace" sourcedeck-site --include="*.html" \| grep -v request-access` | Any match | SD-2026-011 |
| D-004 | No visible raw email addresses | `grep -rn 'href="mailto:.*">.*@.*</a>' sourcedeck-site/index.html` | Any match rendering email as text | SD-2026-010 |
| D-005 | No arivergrop.com typo (missing 'u') | `grep -rn "arivergrop.com" sourcedeck-site --include="*.html"` | Any match | SD-2026-010 |
| D-006 | No owner personal identifiers | `grep -rn "Jean-Max Charles\|jeanmax@\|@arcg.ai" sourcedeck-site --include="*.html"` | Any match | SD-2026-001 |

---

### CATEGORY E: Integration Health

| Check ID | Check | Method | Alert Threshold | Related Events |
|---|---|---|---|---|
| E-001 | Chatwoot widget loads on site | Browser fetch / JS check | `$chatwoot` undefined | SD-2026-016, SD-2026-017 |
| E-002 | Gemini API returns at least 1 image model | ListModels API call | Empty result | SD-2026-022, SD-2026-023, SD-2026-024 |
| E-003 | ANTHROPIC_API_KEY accessible in CI | CI env check | Env var undefined | SD-2026-027 |
| E-004 | calendar.json committed after each workflow run | git log calendar.json | Not committed within 24h of last workflow | SD-2026-028 |
| E-005 | No posts stuck at `not_started` for >48h | Check calendar.json | Any match | SD-2026-026 |
| E-006 | No posts with past dueAt still unscheduled | Check calendar.json | Any match | SD-2026-030 |
| E-007 | IBM watsonx smoke test (when runtime associated) | `node server/scripts/verify-watsonx.mjs` | Any row failure | SD-2026-006 |

---

### CATEGORY F: Security / Privacy Checks

| Check ID | Check | Command | Alert Threshold | Related Events |
|---|---|---|---|---|
| F-001 | No real Airtable base IDs in demo | `grep -n "app[A-Za-z0-9]{14}" sourcedeck-site/app/demo/index.html \| grep -v "appDEMO\|appXXX"` | Any match | SD-2026-013 |
| F-002 | No real webhook URLs in demo | `grep -n "hook.us2.make.com\|hooks.zapier.com" sourcedeck-site/app/demo/index.html` | Any match | SD-2026-013 |
| F-003 | Release check gate | `cd sourcedeck-app && node scripts/release-check.js` | Any failure | SD-2026-001 |
| F-004 | No phone numbers in shipped HTML | `grep -rn "(212)\|(718)\|(212) 663\|(718) 320" sourcedeck-app/sourcedeck.html` | Any match | SD-2026-001 |
| F-005 | Auth callback excluded from SW cache | `grep "auth/callback" sourcedeck-site/sw.js` | Not found | SD-2026-015 |

---

### CATEGORY G: Performance / Accessibility

| Check ID | Check | Method | Alert Threshold |
|---|---|---|---|
| G-001 | index.html load time | HTTP GET + timing | > 5s |
| G-002 | Largest Contentful Paint | Lighthouse CI | Score < 80 |
| G-003 | No broken images on key pages | HTTP GET each img src | Any 404 |
| G-004 | No console errors on page load | Browser automation | Any error |
| G-005 | Sitemap XML valid format | XML parse | Invalid XML |

---

## Do-Not-Auto-Repair Rules

The agent must NEVER automatically repair the following — require human approval:

| Rule ID | What the agent must NOT auto-repair | Reason |
|---|---|---|
| NAR-001 | Any change to `vercel.json` | Risk of overriding multiple Vercel projects (SD-2026-033) |
| NAR-002 | Any change to `.github/workflows/*.yml` | Modifies CI security posture |
| NAR-003 | Any change to `scripts/release-check.js` blocklist | Loosening blocklist = security regression |
| NAR-004 | Any change to `scripts/check-private-data.js` | Same |
| NAR-005 | Any push to `main` branch of any repo | Requires human review and approval |
| NAR-006 | Any change to `main.js` privacy scrub logic | Core security control |
| NAR-007 | Any credential rotation or removal | Risk of operational disruption |
| NAR-008 | Any Stripe/billing config change | Risk of payment disruption |
| NAR-009 | Any compliance claim addition to public pages | Requires certification evidence |
| NAR-010 | Any change that deletes files from the repo | Risk of data loss |

---

## Approval-Required Rules

The agent may prepare a fix and open a draft PR, but must not merge without human approval:

| Rule ID | Scenario | Required Approver |
|---|---|---|
| APR-001 | Privacy gate failure | Operator |
| APR-002 | Compliance claim discovered on public page | Operator |
| APR-003 | Release artifact with owner data detected | Operator |
| APR-004 | IBM watsonx smoke test failure | Engineering |
| APR-005 | Chatwoot token mismatch | Operator |
| APR-006 | vercel.json fix required | Operator |

---

## Prevention Rules (Phase 15A additions)

These rules enforce the credential boundary repair from OPEN-001. Treat any violation as CRITICAL.

| Rule ID | Rule | Enforcement |
|---|---|---|
| PREV-001 | No AI provider credential may be stored, read, or returned through renderer localStorage | Automated check A-004, A-005, A-005b daily |
| PREV-002 | `window.OPENAI_KEY` and `window.CLAUDE_KEY` must only ever hold `''` or the sentinel strings `'<openai_credential_present>'` / `'<anthropic_credential_present>'` — never raw key values | `test/renderer-ai-migration.test.js` assertion; checked in `npm test` |
| PREV-003 | All AI generation calls must route through `window.sd.ai.generate()` IPC — never direct fetch to openai.com or anthropic.com from renderer | Automated check A-005 + `test/credential-boundary-openai-claude.test.js` Section B |
| PREV-004 | `preload.js` must not expose `credentials.get()` to the renderer — presence-only credential surface only | `test/credential-boundary-openai-claude.test.js` Section C; breaks compilation if violated |
| PREV-005 | Provider services (`services/ai/providers/*.js`) must read credentials via `credentials.get()` inside main process only; never return key value in result | `test/credential-boundary-openai-claude.test.js` Sections D, E |

---

## Alert Levels

| Level | Action |
|---|---|
| CRITICAL | Immediate notification + auto-create GitHub issue + flag for human review before next deploy |
| HIGH | Create GitHub issue + notify via configured channel |
| MEDIUM | Log to open-issues.md + weekly digest |
| LOW | Log to run summary only |

---

## Scan Log Format

Each scan run should create or append to `docs/troubleshooting-knowledge-base/scan-logs/YYYY-MM-DD.json`:

```json
{
  "scan_id": "SCAN-2026-05-29-001",
  "timestamp": "2026-05-29T00:00:00Z",
  "checks_run": 42,
  "checks_passed": 40,
  "checks_failed": 2,
  "failures": [
    {
      "check_id": "D-001",
      "description": "False certification claim found",
      "output": "sourcedeck-site/index.html:142: SOC 2 ready",
      "severity": "CRITICAL",
      "action": "human-review-required",
      "related_event": "SD-2026-019"
    }
  ],
  "repairs_applied": [],
  "repairs_staged_for_approval": []
}
```

---

## Nightly Health Check Summary Email Template

Subject: `SourceDeck Daily Health — [DATE] — [PASS/FAIL/WARN]`

```
Repos checked: 6
Checks run: 42
Passed: [N]
Failed: [N]
Warnings: [N]

CRITICAL failures: [list or "None"]
HIGH failures: [list or "None"]

Repairs auto-applied: [list or "None"]
Repairs pending approval: [list or "None"]

Next action required: [summary or "None — all green"]
```

---

## E-007: watsonx readiness must classify failures without exposing secrets

**Added:** 2026-05-30 (Phase 15B repair for OPEN-002)

**Rule:** Any watsonx-related failure must be classified by
`services/ai/watsonx-readiness.js` into one of the stable statuses
(`ready` · `provider_disabled` · `missing_credentials` ·
`missing_project_id` · `missing_region_or_url` · `unauthorized_401` ·
`forbidden_403` · `network_error` · `unknown_error`). The renderer may
only receive presence/status/remediation; raw IBM/watsonx tokens,
project IDs, space IDs, trace IDs, and bearer values must be redacted
before they reach the renderer.

**Public-copy gate:** SourceDeck must not claim watsonx is "fully
operational" or "live" until a real readiness check from the settings
panel reports `ready` and the evidence is recorded.

**Automated checks (run every `npm test`):**
1. `test/watsonx-runtime-context.test.js` — 18 assertions covering
   classification, redaction, renderer/preload boundary, and safe UI
   copy.
2. `test/ibm-readiness.test.js` — existing 38 assertions cover provider
   redaction.
3. Repo-wide grep for watsonx Authorization/Bearer/x-api-key construction
   in `sourcedeck.html` and `preload.js` is part of the wizard/
   integration tests (boundary section).

---

## E-010: watsonx runtime evidence must be honest (verified or blocked)

**Added:** 2026-06-02 (Phase 18A — watsonx runtime completion)

**Rule:** watsonx is described as verified for an environment **only** when
a real runtime request succeeds and redacted evidence is captured with
outcome `verified_ready`. Any other state is honest-but-not-live:
`not_configured`, `configured_missing_required_env`, or
`blocked_by_ibm_config` (rollup of `iam_token_failed` /
`project_or_space_invalid` / `model_or_deployment_invalid` /
`runtime_request_failed`). SourceDeck must not claim watsonx is live
without `verified_ready` evidence.

**Probe:** `scripts/watsonx-runtime-probe.js` reads env only, attempts a
real IAM exchange + minimal runtime request **only** when required env is
present, and writes redacted evidence to `reports/watsonx-runtime/`
(git-ignored). Required env: `WATSONX_API_KEY` (or `IBM_CLOUD_API_KEY`) and
`WATSONX_PROJECT_ID` (or `WATSONX_SPACE_ID`); URL and model have defaults.

**Finding WX-006:** PASS only on `verified_ready`; MANUAL/WARN on
`not_configured` / `blocked_by_ibm_config`; FAIL only on an app-side
regression (missing probe/module or a captured evidence file containing a
raw secret). Auto-repair stays disabled; human approval required. Daily
CI must not fail just because IBM env is absent.

**Automated check (every `npm test`):**
`test/watsonx-runtime-evidence.test.js` — 17 assertions covering env
presence-only reporting, state classification, redaction, CLI exit
semantics, the WX-006 invariant, release-evidence integration, and the
renderer/preload boundary.

---

## E-008: Email alerts must stay safe-by-default

**Added:** 2026-06-01 (Phase 16B — Email Alert Stub)

**Rule:** The Daily Troubleshooting Agent may prepare email alerts
through `services/troubleshooting/troubleshooting-alerts.js` and
`services/troubleshooting/troubleshooting-email-transport.js`, but
**must not** send a live email unless ALL of the following hold:

1. `SEND_TROUBLESHOOTING_EMAIL=true` is set in the environment.
2. Every required SMTP env var is present
   (`TROUBLESHOOTING_EMAIL_TO/FROM`,
    `TROUBLESHOOTING_SMTP_HOST/PORT/USER/PASS`).
3. A future, separately gated phase ships the live-send code path with
   an audit-recorded approval.

In Phase 16B the transport **never** transmits; the most-affirmative
state it returns is `prepared_no_send`. Dry-run mode
(`--email-dry-run` / `npm run troubleshooting:email-dry-run`) is the
default safe operation in CI.

**Body / payload guardrails:**
- Body is run through `redactTroubleshootingAlert()` (strips Bearer,
  sk-/sk-ant-, IBM keys, `Authorization:` headers, JWT, long hex blobs)
  before leaving the formatter.
- Body **never** embeds the raw JSON report.
- Body always carries the `NO_AUTO_REPAIR_NOTE`.
- `getEmailTransportStatus(env)` never echoes SMTP user/pass values.

**Recipient:** `arcgsystems@gmail.com` is the intended recipient when
the future live-send phase ships. It is **not** hardcoded; it is read
from `TROUBLESHOOTING_EMAIL_TO`.

**Public-copy gate:** Do not claim "SourceDeck sends email alerts" until
the live-send phase ships with evidence captured.

**Automated checks (run every `npm test`):**
1. `test/troubleshooting-email-alerts.test.js` — 18 assertions
   covering subject/body shape, no-auto-repair note, report paths,
   redaction of all common credential shapes, `shouldSend` gate logic,
   transport disabled/missing_config/dry_run/prepared_no_send modes,
   and the CI workflow's read-only / dry-run-only posture.
2. The CI workflow runs `npm run troubleshooting:email-dry-run || true`
   so missing config never fails the daily job.

---

## E-009: macOS signing readiness — local dev non-blocking; public release strict

**Added:** 2026-06-01 (Phase 17A — macOS Signing & Release Packaging Readiness)

**Rule:** macOS signing & notarization readiness is checked by
`services/release/macos-signing-readiness.js` and its CLI
`scripts/macos-signing-readiness.js`.

- **Local dev** (`npm run release:mac-signing-readiness`): MUST exit
  `0` when the only issue is missing Apple credentials. The
  classification returned is `unsigned_dev_ok`. The daily troubleshooting
  agent's REL-020 finding remains `MANUAL` in this state and does not
  fail the daily CI job.
- **Public release / strict mode**
  (`npm run release:mac-signing-readiness:strict`): MUST exit `1` when
  any of these hold:
  - signing env (`CSC_LINK` + `CSC_KEY_PASSWORD`) is missing,
  - both notarization paths (3 `APPLE_*` envs OR 3 `APPLE_API_*` envs)
    are missing,
  - `package.json build.mac.notarize` is not `true`,
  - `build/entitlements.mac.plist` or the app icon is missing.

**Secret guardrails:**
- Env status is presence-only — never echoes values.
- Missing envs are reported as **names**.
- All free-text payloads pass through
  `redactSigningReadinessReport()` which strips `CSC_KEY_PASSWORD=…` /
  `APPLE_APP_SPECIFIC_PASSWORD=…` / PEM certs/keys / Developer ID
  identities / long base64 / long hex blobs.

**Public-copy gate:** Do not claim "SourceDeck is signed / notarized"
in any public surface until a real signed run is captured as evidence.

**Automated checks (run every `npm test`):**
- `test/macos-signing-readiness.test.js` (19 assertions) covers stable
  statuses, dev-vs-strict classification, redaction, presence-only
  shape, CLI exit codes, the `release-check.js` pointer, and REL-020
  remediation reference.
- The CLI test path uses `env: {}` to confirm strict mode exits `1`
  and default mode exits `0` without any Apple credentials.

---

## E-010: Release evidence capture — dev non-blocking; strict release gate

**Added:** 2026-06-01 (Phase 17B — Release Artifact Evidence Capture)

**Rule:** Release evidence is captured by
`services/release/release-evidence.js` and the CLI
`scripts/release-evidence.js`.

- **Local dev** (`npm run release:evidence`): MUST exit `0`. The
  default mode writes `reports/release-evidence/latest-release-evidence.{md,json}`
  and a dated copy. Daily troubleshooting agent surfaces `REL-030` as
  `PASS` (when a report is present) or `WARN` (when wired but no report
  yet) — never `FAIL`.
- **Public release / strict mode**
  (`npm run release:evidence:strict`): MUST exit `1` when any of:
  - working tree is dirty,
  - the packaged asar is missing required files,
  - signing readiness is not `ready_to_sign`,
  - a positive "SourceDeck is signed/notarized" claim is detected in
    the generated text,
  - any secret-shaped fragment leaks past the redactor.

**Secret guardrails:**
- Evidence is presence-only. The redactor strips Bearer / sk- / sk-ant-
  / IBM keys / SMTP credentials / Apple env assignments / PEM
  certificates and private keys / Developer ID identities / long base64
  + long hex blobs.
- Git commit is recorded as a 7-char short SHA so the redactor does
  not falsely strip it.
- The CLI's `containsUnsupportedSignedClaim` and `containsSecretShape`
  predicates fail the strict run if either predicate is true on the
  generated text.

**Public-copy gate:** Do not ship a public macOS release until:
1. `npm run release:mac-signing-readiness:strict` reports `ready_to_sign`.
2. `npm run release:evidence:strict` exits `0` with state
   `packaged_signed_verified`.
3. `codesign --verify --deep --strict` passes on the built artifact.

**Workflow safety:** `.github/workflows/release-evidence.yml` is
`workflow_dispatch`-only, requires no repository secret, never
commits/pushes, never invokes `codesign`/`xcrun notarytool`, never
publishes. It only uploads the evidence + troubleshooting reports as
GitHub Actions artifacts.

**Automated checks (run every `npm test`):**
- `test/release-evidence.test.js` (20 assertions) covers state
  classification, redaction, CLI dev-vs-strict exit codes, workflow
  safety, and the REL-030 finding.
- `test/troubleshooting-agent.test.js` covers the agent's invariant
  loop (NAR-001..NAR-010) which throws if any finding flips
  `autoRepairAllowed` / `requiresHumanApproval`.

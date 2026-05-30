# SourceDeck Troubleshooting Agent — Rules & Daily Checklist

Rules for the future SourceDeck Troubleshooting Agent. This agent will run daily automated health checks across all SourceDeck repos and surfaces.

**Last updated:** 2026-05-29  
**Agent scope:** All repos + all production surfaces under sourcedeck.app domain

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
| A-004 | Renderer credential count | `grep -c "lcc_OPENAI_KEY\|lcc_CLAUDE_KEY" sourcedeck-app/sourcedeck.html` | > 0 unmitigated | SD-2026-041 |
| A-005 | Bearer header count in renderer | `grep -c "'Bearer '\+" sourcedeck-app/sourcedeck.html` | > 0 | SD-2026-004 |
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

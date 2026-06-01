# SourceDeck Error & Repair Knowledge Base

**Created:** 2026-05-29  
**Scope:** All SourceDeck-related repositories  
**Status:** Living document — append new events as they occur

---

## What This Is

A structured audit of every known error, bug, bad implementation, deployment failure, security defect, product logic mistake, and repair event across the SourceDeck ecosystem. Evidence sourced from git history, commit messages, PR descriptions, release notes, QA output files, doc files, and code inspection across all six active repos.

This knowledge base serves three purposes:

1. **Human reference** — operators and engineers can look up any symptom and find root cause + repair pattern
2. **Agent fuel** — the future SourceDeck Troubleshooting Agent reads this to diagnose and classify new incidents without starting from scratch
3. **Prevention ruleset** — every event becomes a prevention rule and an automated check

---

## How This Is Organized

| File | Contents |
|---|---|
| `README.md` | This file — orientation, agent usage instructions |
| `error-repair-ledger.md` | Chronological table of every error and repair event |
| `diagnostic-playbooks.md` | Symptom-based repair guides (reusable) |
| `agent-rules.md` | Daily scan checklist + automated check rules for the future troubleshooting agent |
| `open-issues.md` | Unresolved, partially-fixed, or unverified problems |
| `repo-inventory.md` | Every SourceDeck-related repo: status, framework, purpose |
| `evidence-index.md` | Every source of evidence reviewed during this audit |

---

## Daily Troubleshooting Agent (Phase 16A — shipped 2026-05-30)

The first production-safe version of the agent now lives in this repo:

- **Engine:** [`services/troubleshooting/troubleshooting-agent.js`](../../services/troubleshooting/troubleshooting-agent.js)
- **CLI:** [`scripts/run-troubleshooting-agent.js`](../../scripts/run-troubleshooting-agent.js) — `npm run troubleshooting:scan` / `:json` / `:strict`
- **Daily workflow:** [`.github/workflows/daily-troubleshooting-agent.yml`](../../.github/workflows/daily-troubleshooting-agent.yml) (scheduled + manual)
- **Tests:** [`test/troubleshooting-agent.test.js`](../../test/troubleshooting-agent.test.js)
- **Reports:** `reports/troubleshooting/latest-troubleshooting-report.md` (+ JSON, + timestamped). Gitignored; not committed.

What it covers today: credential boundary, public-claim regressions, demo/download CTA, GovCon safety (RED_RESTRICTED / KILL / no auto-send / no auto-post), watsonx readiness policy (incl. OPEN-002 partial gate), release readiness, app-side privacy-gate inputs, and KB integrity.

What it deliberately does not do (Phase 16A):
- No auto-repair on any finding. Every finding ships `autoRepairAllowed: false` and `requiresHumanApproval: true`.
- No commits, no pushes, no PRs.
- No external email or notifications. Future phase: email to `arcgsystems@gmail.com` only after explicit approval.
- No cross-repo HTTP route checks. The site / cross-repo wrapper is a later phase.

### Daily run lifecycle (current)
1. GitHub Actions invokes `npm run troubleshooting:scan:json` and `node test/troubleshooting-agent.test.js`.
2. The CLI writes markdown + JSON reports to `reports/troubleshooting/`.
3. The workflow uploads the reports as a build artifact (`troubleshooting-reports-<run_id>`, 30-day retention).
4. Workflow exits 1 only on critical/high failures; manual findings (e.g. OPEN-002 IBM-side action, missing macOS signing env) keep the run green.
5. Operator reviews any failed/warn findings before they enter `open-issues.md` or trigger remediation work.

### What the agent does NOT auto-apply
The agent never modifies production code, never opens PRs, never amends commits. NAR-001..NAR-010 (vercel.json, workflow files, release-check blocklist, main pushes, privacy-scrub logic, credential rotation, billing, compliance copy, file deletions) are explicit hard exclusions enumerated in `agent-rules.md` and reflected in engine constants.

### On user-reported incidents:
1. Match reported symptom to entries in `diagnostic-playbooks.md`
2. Run the diagnostic commands listed under the matching playbook
3. Present findings with confidence level: HIGH (exact match), MEDIUM (pattern match), LOW (novel)
4. For LOW confidence, escalate to human

### Escalation rules:
- Always escalate: production data exposure, auth bypass, payment logic errors, compliance claim violations
- Always escalate: anything touching `main` branch of production repos
- Never auto-repair: any change that modifies vercel.json, CI workflows, or release gates

---

## Event ID Format

`SD-YYYY-NNN` where YYYY is the year and NNN is a 3-digit sequence number within that year.

Example: `SD-2026-001` = first recorded event in 2026.

---

## Severity Classification

| Level | Meaning |
|---|---|
| CRITICAL | Data exposure, auth bypass, wrong data shipped to customers |
| HIGH | Deployment blocked, feature broken for all users, security regression |
| MEDIUM | Feature broken for some users, incorrect behavior, copy/UX wrong |
| LOW | Cosmetic, docs, naming, minor inconsistency |

---

## Email alerts (Phase 16B)

The Daily Troubleshooting Agent now prepares optional email alerts for
critical/high failures. Live sending is **disabled by default** and is
intentionally **not implemented** in Phase 16B — the transport stub
returns `disabled` / `missing_config` / `dry_run` / `prepared_no_send`
without external side effects. See `agent-rules.md` (E-008) and
`docs/release-notes/troubleshooting-email-alerts.md` for the safety
contract. Intended recipient when live sending is later approved:
`arcgsystems@gmail.com` (read from `TROUBLESHOOTING_EMAIL_TO` at
runtime; never hardcoded).

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

## How the Future Troubleshooting Agent Should Use This

### On each daily scan:
1. Load `agent-rules.md` — run every check in the daily checklist
2. For any failed check, search `error-repair-ledger.md` for matching category + symptom
3. If a matching event exists, apply the repair pattern from `diagnostic-playbooks.md`
4. If no match exists, flag as a new unknown event and append to `open-issues.md`
5. Never auto-apply repairs marked `requires-human-approval` in `agent-rules.md`
6. Log every scan run with timestamp, checks run, failures found, repairs applied

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

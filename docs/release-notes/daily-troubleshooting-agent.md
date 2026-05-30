# Phase 16A — Daily SourceDeck Troubleshooting Agent

**Shipped:** 2026-05-30
**Branch:** `feat/daily-troubleshooting-agent`
**Repo:** `sourcedeck-app`
**Audit:** [`docs/audits/daily-troubleshooting-agent-audit.md`](../audits/daily-troubleshooting-agent-audit.md)

---

## Summary

First production-safe version of the SourceDeck Troubleshooting Agent. It runs deterministic daily health checks against this repo using the merged Troubleshooting Knowledge Base as its rulebook. **No auto-repair. No commits. No pushes. No secrets. No external email.**

## What landed

| Component | Path |
|---|---|
| Scan engine | `services/troubleshooting/troubleshooting-agent.js` |
| CLI runner | `scripts/run-troubleshooting-agent.js` |
| Daily workflow | `.github/workflows/daily-troubleshooting-agent.yml` |
| Tests + fixtures | `test/troubleshooting-agent.test.js`, `test/fixtures/troubleshooting-agent/**` |
| Audit | `docs/audits/daily-troubleshooting-agent-audit.md` |
| KB updates | `docs/troubleshooting-knowledge-base/{README,agent-rules,open-issues}.md` |
| Package scripts | `troubleshooting:scan`, `troubleshooting:scan:json`, `troubleshooting:scan:strict`; wired into `npm test` |
| Reports dir | `reports/troubleshooting/.gitkeep` (generated reports are gitignored) |

## What it checks

Seven categories of deterministic checks (per finding-id namespace):

| Category | Finding ids |
|---|---|
| Credential boundary | `CRED-001` localStorage SET for AI keys, `CRED-002` direct provider fetch from renderer, `CRED-003` Bearer/x-api-key build in renderer, `CRED-004` raw sk-* assigned to window.*_KEY, `CRED-010` preload exposes raw credentials.get, `CRED-020:*` enforcement test presence |
| Compliance / public claims | `CLAIM-001` SOC 2 / FedRAMP / HIPAA certified / HITRUST / ISO 27001, `CLAIM-002` watsonx live wording (critical / OPEN-002 gate), `CLAIM-003` "wins contracts" / "guarantees awards" / autonomy overclaims, `CLAIM-004` owner identifiers, `CLAIM-005` owner phone signatures |
| Demo / download access | `DEMO-001` forbidden public demo/download CTAs in shipped app HTML |
| GovCon safety | `GOVCON-001` RED_RESTRICTED present, `GOVCON-002` KILL verdict present, `GOVCON-003` no auto-post in premium-content-agent, `GOVCON-004` no auto-send in outreach, `GOVCON-005` human-approval language in playbooks |
| Watsonx readiness policy | `WX-001` readiness module exists, `WX-002` all classifications present, `WX-003:*` no watsonx auth headers in renderer/preload, `WX-004` readiness UI surface present in renderer, `WX-005` OPEN-002 IBM-side action (manual) |
| Release readiness | `REL-001` release-check exists, `REL-002` privacy gate intact, `REL-010:*` required package scripts present, `REL-020` macOS signing env (manual outside signing) |
| SourceDeck health | `HEALTH-001` MOCK_LEADS empty, `HEALTH-002` PROMPT_LIBRARY empty |
| KB integrity | `KB-001:*` all 7 KB files present, `KB-002` OPEN-002 still PARTIALLY FIXED, `KB-003` agent-rules has daily checklist, `KB-004` playbooks cover credential + watsonx |

Current run on `main` (HEAD = `0e450b2`): **43 pass / 0 fail / 0 warn / 2 manual** (manual = OPEN-002 IBM-side action + macOS signing env outside a signing environment).

## How to run

```bash
npm run troubleshooting:scan          # default — markdown report, exit 0 unless critical/high fail
npm run troubleshooting:scan:json     # also emit JSON
npm run troubleshooting:scan:strict   # additionally exit 1 on medium fail
```

Reports land in `reports/troubleshooting/`:
- `latest-troubleshooting-report.md` (always)
- `YYYY-MM-DD-troubleshooting-report.md` (per-day archive)
- `*.json` variants when `--json` is passed

The CLI also supports `--out <path>` and `--reports-dir <dir>` (used by the test suite).

## Daily GitHub Actions workflow

`.github/workflows/daily-troubleshooting-agent.yml` runs every day at 09:15 UTC and on manual `workflow_dispatch`. Steps:

1. `npm ci`
2. `npm run troubleshooting:scan:json`
3. `node test/troubleshooting-agent.test.js`
4. Upload `reports/troubleshooting/` as an artifact (30-day retention)

Workflow uses `permissions: contents: read` only. **No secrets.** Generated reports are uploaded as an artifact, never committed back to the repo.

## What this agent does NOT do (Phase 16A)

- No auto-repair of any finding. Engine invariant: every finding ships `autoRepairAllowed: false` and `requiresHumanApproval: true`; a runtime assertion throws if violated.
- No commits, no pushes, no PR opens, no branch deletes.
- No exposure of raw API keys / Authorization headers / Bearer tokens (engine reads files for boundary regressions; reports surface evidence as pattern-name only).
- No claim that watsonx is live. OPEN-002 stays `PARTIALLY FIXED`; `WX-005` and `CLAIM-002` enforce this from both sides.
- No public pricing-page or other public-copy edits.
- No external monitoring service, no email/Slack/webhook notifications. Future phase: email alerts to `arcgsystems@gmail.com` only after explicit approval.
- No cross-repo HTTP route checks. Site / cross-repo coverage is reserved for a later phase.
- Daily reports are not committed by the workflow (`.gitignore` excludes `reports/troubleshooting/*` except the `.gitkeep`).

## Manual escalation rules

Findings with `status: manual` never fail the workflow. They appear in the report's "Manual-only items" section so operators know action is required outside the agent's reach:

- `WX-005` — IBM-side runtime context migration for OPEN-002
- `REL-020` — macOS signing/notarization is only verifiable from a signing environment

For any `fail` finding, the report's evidence + remediation lines tell an operator what to do. The agent never opens a PR or amends the code on its behalf.

## Do-not-auto-repair policy

Hard rules from the KB (NAR-001..NAR-010) are enforced both by policy and by the engine invariant:

- vercel.json edits
- `.github/workflows/*.yml` edits
- `scripts/release-check.js` blocklist relaxation
- `scripts/check-private-data.js` relaxation
- Pushes to `main`
- `main.js` privacy-scrub edits
- Credential rotation/removal
- Stripe/billing config edits
- Compliance-claim additions to public pages
- File deletions

## Test summary

- `test/troubleshooting-agent.test.js` — **95/95 PASS** (catches historical regressions against synthetic fixtures, exercises the engine on the live repo, CLI temp-dir writes, strict-mode exit semantics, workflow-file safety, and the auto-repair invariant)
- All pre-existing suites unaffected; full `npm test` still green.

## Known warnings (carried, not introduced)

- macOS signing/notarization missing outside a signing environment — surfaced as `manual` so non-signing CI runs stay green.
- OPEN-002 remains `PARTIALLY FIXED`; agent flags it as `manual` until IBM-side action plus a live `ready` readiness response.

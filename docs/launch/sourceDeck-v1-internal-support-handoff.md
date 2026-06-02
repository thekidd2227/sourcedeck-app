# SourceDeck v1 — Internal Support Handoff

For SourceDeck operators and internal support during the controlled-demo
phase. This is a runbook for verifying readiness and reading the built-in
evidence. It changes no runtime behavior and never requires sharing
secrets.

## How to run diagnostics

From the repo root (`/Users/jean-maxcharles/sourcedeck-app`):

```bash
npm test                              # full test suite
npm run troubleshooting:scan          # daily diagnostic agent (human-readable)
npm run troubleshooting:scan:json     # same, JSON
npm run release:evidence              # release artifact evidence bundle
npm run watsonx:runtime-probe         # watsonx runtime diagnosis
npm run watsonx:runtime-probe:evidence# write redacted watsonx evidence
npm run govcon:smoke
npm run govcon:outreach-os:audit
npm run phase13:rc-check
npm run i18n:audit
node scripts/release-check.js
```

All of these are read-only/diagnostic. None send email, publish, sign, or
expose secrets.

## How to read troubleshooting reports

- Reports are written to `reports/troubleshooting/` (git-ignored).
- Each finding has a `status`: `pass`, `warn`, `manual`, or `fail`, and a
  severity. The headline number is **critical/high failures** — that must
  be `0` for a controlled demo.
- `manual` items are intentional human-review reminders (for example, the
  watsonx and macOS-signing readiness reminders). `manual` is not a
  failure.
- Auto-repair is disabled for every finding; all remediation is
  human-reviewed.

## How to read release evidence

- Reports are written to `reports/release-evidence/` (git-ignored).
- The `state` field is the headline. For the controlled demo, expect
  `packaged_unsigned`: the app package exists and required asar files are
  present, but the local macOS artifact is unsigned. That is acceptable
  for a controlled demo and **not** acceptable for a public release.
- `release:evidence:strict` intentionally exits `1` until signing
  readiness is complete and the working tree is clean. That exit is
  expected outside a signing environment — it is a gate, not a bug.

## How to read watsonx evidence

- Reports are written to `reports/watsonx-runtime/` (git-ignored).
- The `outcome` field rolls up to one of: `not_configured`,
  `configured_missing_required_env`, `blocked_by_ibm_config`, or
  `verified_ready`. Only `verified_ready` means a real runtime request
  succeeded for that environment.
- Reporting is presence-only: no IBM keys, bearer tokens, project/space/
  deployment ids, or generated text are stored.
- See `../ai/watsonx-runtime-setup.md` for a state-by-state guide and the
  operator steps to resolve `blocked_by_ibm_config`.
- Do not describe watsonx as live unless the `outcome` is `verified_ready`.

## What to do if gates fail

1. Re-run the failing gate and read the output.
2. For `troubleshooting:scan`, focus on any **critical/high** `fail`
   findings; `manual`/`warn` are review items, not blockers.
3. Confirm you are on the latest `main` and the working tree is clean.
4. If a real blocker is found, report it before changing anything. Within
   the RC freeze, only critical bug fixes, claim cleanup, documentation
   correction, evidence updates, and release-blocker remediation are in
   scope — no new features or runtime/workflow changes.
5. Never bypass a readiness check, and never weaken a credential-boundary
   or human-approval gate to make a gate pass.

## What to never promise

Do not claim watsonx is live (unless `verified_ready` evidence exists). The operator must not claim "IBM watsonx included", "signed and notarized", or any HIPAA / FedRAMP / SOC 2 / CMMC / HITRUST / ISO / government-compliance certification.
Do not promise guaranteed contracts, guaranteed awards, or guaranteed revenue; must not promise unlimited AI, auto-send, or auto-submit.
Human approval remains required for outreach, proposals, pricing,
compliance, bid/no-bid, teaming, publishing, and sending.

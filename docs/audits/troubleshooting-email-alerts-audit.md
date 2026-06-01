# Troubleshooting Email Alerts — Pre-Build Audit (Phase 16B)

Read-only audit before extending the merged Daily Troubleshooting Agent
with a safe-by-default email-alert path.

## Current report generation (Phase 16A, on main)

- `services/troubleshooting/troubleshooting-agent.js` exports
  `runTroubleshootingScan({ rootDir })`. It returns:
  ```
  { agent, version, schema, rootDir, startedAt, finishedAt,
    summary: { counts:{pass,fail,warn,manual,total},
               failuresBySeverity:{critical,high,medium,low,info},
               criticalOrHighFail },
    findings: [ { id, severity, category, title, status, evidence, file,
                  remediation, autoRepairAllowed:false,
                  requiresHumanApproval:true } ] }
  ```
- `STATUSES = pass | fail | warn | manual`.
- `SEVERITIES = critical | high | medium | low | info`.
- A hard invariant throws if any finding flips `autoRepairAllowed`/
  `requiresHumanApproval`.

## Current CLI behavior

- `scripts/run-troubleshooting-agent.js` writes:
  - Markdown: `reports/troubleshooting/<YYYY-MM-DD>-troubleshooting-report.md`
  - JSON: same basename `.json`
- Exit code: `1` on any CRITICAL/HIGH `fail`; `0` otherwise (MEDIUM
  failures bump exit code only under `--strict`). Manual items never
  block.

## Current GitHub Actions workflow

`.github/workflows/daily-troubleshooting-agent.yml` runs the scan, runs
the agent test suite, uploads `reports/troubleshooting/` as an artifact.
It uses `permissions: contents: read`, no commit, no push, no secrets,
no external email.

## Known manual findings (from a clean scan today)

- **WX-005 / OPEN-002** — IBM watsonx runtime context partially fixed;
  IBM-side runtime migration still required.
- **REL-020** — macOS signing / notarization configured manually.

## Safe email-alert design

1. **Formatter** (`services/troubleshooting/troubleshooting-alerts.js`)
   builds a renderer-safe subject + body from the scan result. The body
   contains only counts, finding ids/severities/titles/remediations, and
   the report file paths. The full JSON is **never** embedded.
2. **Redactor** runs over the email body before it leaves the formatter
   and strips `Bearer …`, `sk-…`, `sk-ant-…`, IBM-style keys,
   `Authorization:` header lines, JWT-shaped tokens (eyJ…), and 32+ char
   hex blobs.
3. **shouldSendTroubleshootingAlert** returns `true` only when there is
   at least one CRITICAL or HIGH `fail` (the existing
   `summary.criticalOrHighFail`). Manual-only items do not trigger an
   alert unless `alertOnManual: true`.
4. **Transport stub** (`troubleshooting-email-transport.js`) is **off by
   default**. It refuses to send unless `SEND_TROUBLESHOOTING_EMAIL` is
   the exact string `"true"` AND every required env config is present.
   Otherwise it returns one of `{sent:false, mode:'disabled' |
   'missing_config' | 'dry_run' | 'no_alert'}`. The stub does not import
   any new dependency for this phase and does not actually transmit; it
   returns the prepared payload metadata for inspection. Adding a real
   nodemailer/SMTP layer is a separate, gated step.
5. **CLI** adds `--email`, `--email-dry-run`, `--alert-on-manual`.
   `--email-dry-run` always builds the payload but never sends. `--email`
   will send only if env enablement+config are present, else dry-run.
   The scan's exit code still reflects scan severity, never email
   config status.
6. **GitHub Actions** gets an optional `npm run
   troubleshooting:email-dry-run` step that requires no secrets and
   never fails the job because email is off.

## What is intentionally NOT implemented in this phase

- No real SMTP transmission — even with `SEND_TROUBLESHOOTING_EMAIL=true`,
  the stub returns the payload metadata; live transmission is a future
  step gated on explicit approval, secret provisioning, and a dedicated
  audit.
- No nodemailer/SMTP dependency added.
- No CI secrets / repository secrets configured.
- No auto-repair, no auto-commit, no auto-push (carried over invariants).
- No raw-report JSON in the email body.
- No change to the existing scan, exit codes, KB invariants, or
  no-auto-send/no-auto-post rules.

## Recipient

`arcgsystems@gmail.com` is recorded as the intended recipient in the
env var `TROUBLESHOOTING_EMAIL_TO`. The recipient is **not hardcoded**;
the stub reads it from env at run time. Documentation does not embed any
secret material.

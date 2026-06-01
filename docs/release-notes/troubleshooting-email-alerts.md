# Daily Troubleshooting Agent — Email Alert Stub (Phase 16B)

## What changed

The merged Daily Troubleshooting Agent (Phase 16A) now has a **safe,
disabled-by-default email-alert path**. Nothing in this phase sends a
live email. The pieces shipped:

- `services/troubleshooting/troubleshooting-alerts.js` — pure formatter:
  `buildTroubleshootingEmailSubject`, `buildTroubleshootingEmailBody`,
  `shouldSendTroubleshootingAlert`, `redactTroubleshootingAlert`,
  `summarizeTroubleshootingFindings`.
- `services/troubleshooting/troubleshooting-email-transport.js` —
  disabled-by-default transport stub with
  `sendTroubleshootingEmail({ to, subject, body, options })` and
  `getEmailTransportStatus(env)`. The stub never throws and never
  transmits in this phase; it returns one of
  `disabled` / `missing_config` / `dry_run` / `prepared_no_send`.
- CLI flags on `scripts/run-troubleshooting-agent.js`: `--email`,
  `--email-dry-run`, `--alert-on-manual`.
- npm scripts: `troubleshooting:email-dry-run` and
  `troubleshooting:scan:email`.
- `.github/workflows/daily-troubleshooting-agent.yml` adds two new
  steps: run the new alert test suite, and run
  `npm run troubleshooting:email-dry-run` with a `|| true` guard so the
  job never fails because email is off.
- `test/troubleshooting-email-alerts.test.js` — 18 assertions wired
  into `npm test`.

## Email alert behavior

- **Default state:** OFF.
- An alert is *prepared* only when `shouldSendTroubleshootingAlert`
  returns true: at least one CRITICAL or HIGH failure (or, when
  `--alert-on-manual` is passed, at least one manual finding).
- **No live send in this phase.** Even when
  `SEND_TROUBLESHOOTING_EMAIL=true` and every SMTP env var is set, the
  transport returns `prepared_no_send`. A real send path is a future,
  separately gated step that requires an explicit audit-recorded
  approval.
- Body is **redacted** before it leaves the formatter — Bearer/sk-/
  sk-ant-/IBM keys/Authorization headers/JWT/long hex blobs are
  replaced with `[REDACTED_…]` markers.
- Body **never** includes the full raw JSON report; only counts,
  finding ids/titles/remediations, the manual-item list, and the
  report file paths.
- Body always carries: *"No auto-repair was performed. Human review is
  required."*

## Live-sending requirements (NOT enabled in this phase)

When the future live-send phase ships, it will require all of:

- `SEND_TROUBLESHOOTING_EMAIL=true`
- `TROUBLESHOOTING_EMAIL_TO=arcgsystems@gmail.com`
- `TROUBLESHOOTING_EMAIL_FROM=`
- `TROUBLESHOOTING_SMTP_HOST=`
- `TROUBLESHOOTING_SMTP_PORT=`
- `TROUBLESHOOTING_SMTP_USER=`
- `TROUBLESHOOTING_SMTP_PASS=`

These are read **only in the main process / CI environment** and never
echoed in logs or report output. The transport's status snapshot
exposes host/port/to/from for diagnostics but **never** echoes user/pass
values.

## Recipient

`arcgsystems@gmail.com` is the intended recipient when live-sending is
later approved. It is **not** hard-coded; the transport reads it from
`TROUBLESHOOTING_EMAIL_TO` at runtime.

## Safety invariants carried forward

- No auto-repair, no auto-commit, no auto-push (NAR-001..NAR-010
  invariants from Phase 16A still enforced).
- No new dependency added (no nodemailer / no SMTP library).
- No secrets required for `npm test` or the daily CI workflow.
- `release-check` may still WARN only about macOS signing/notarization.
- Renderer/preload credential boundary untouched.
- RED_RESTRICTED, irreversible KILL, no-auto-send for outreach, and
  no-auto-post for content are unchanged.

## Known limitations

- No real SMTP send — `prepared_no_send` is the most affirmative state
  the transport will return until the live-send phase ships.
- The transport stub does not depend on `nodemailer`. When the real
  send path is added, the dependency choice will be justified in a
  follow-up audit doc and `package.json`.

## Tests run / results

- `npm test` — green incl. new `troubleshooting-email-alerts 18/18`,
  existing `troubleshooting-agent 95/95`, `watsonx-runtime-context 18/18`,
  credential-boundary, architecture-boundary, all GovCon suites.
- `npm run troubleshooting:scan`, `:scan:json`, `:email-dry-run` —
  reports written; "Auto-repair is disabled for every finding."; email
  alert mode prints (`no critical/high failures — no alert dispatched`
  on a clean scan, or `dry_run` when explicitly requested).
- `govcon:smoke`, `govcon:outreach-os:audit`, `phase13:rc-check`,
  `i18n:audit` — all green.
- `release-check` — passes; only the standing macOS-unsigned WARN.

## Rollback guidance

Additive. To roll back, revert the phase commit/PR. The Phase 16A agent,
its tests, the daily workflow's scan + artifact upload, and every prior
guardrail remain unaffected. No data migrations.

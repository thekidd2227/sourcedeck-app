# SourceDeck v1 — Demo-Day Checklist

Run this before every controlled buyer demo. It is a verification
checklist only; it changes nothing.

## A. Sync

- [ ] On `main` and up to date:
  ```bash
  git checkout main && git pull origin main
  ```
- [ ] Working tree is clean (`git status --short` prints nothing).
- [ ] Confirm `main` includes the RC lock (PR #35, merge `15c512f` or
      newer).

## B. Run gates

- [ ] `npm test` → passes.
- [ ] `npm run troubleshooting:scan` → green; `:json` for detail.
- [ ] `npm run troubleshooting:email-dry-run` → dry-run only (no live email).
- [ ] `npm run release:evidence` → writes bundle.
- [ ] `npm run watsonx:runtime-probe` and `:evidence` → writes evidence.
- [ ] `npm run govcon:smoke`, `npm run govcon:outreach-os:audit`,
      `npm run phase13:rc-check`, `npm run i18n:audit` → pass.
- [ ] `node scripts/release-check.js` → passes (an unsigned local macOS
      artifact warning is expected).

## C. Confirm no open PRs

- [ ] `gh pr list --state open` → none (no in-flight changes mid-demo).

## D. Confirm no critical/high troubleshooting failures

- [ ] Troubleshooting summary shows **0 critical/high failures**.
- [ ] `manual` and `warn` items are review reminders, not blockers.

## E. Confirm release evidence state

- [ ] Release evidence `state` is `packaged_unsigned` (acceptable for a
      controlled demo). It must not be described as signed/notarized.

## F. Confirm watsonx state

- [ ] watsonx runtime `outcome` is `not_configured` (or, in a configured
      environment, `verified_ready`). Do not claim watsonx is live unless
      the outcome is `verified_ready`.

## G. Confirm claim language

- [ ] Operators must not make a present-tense watsonx-live claim and must not say "IBM watsonx included".
- [ ] Operators must not claim "signed and notarized".
- [ ] Operators must not claim HIPAA / FedRAMP / SOC 2 / CMMC / HITRUST / ISO / government-compliance.
- [ ] Operators must not promise guaranteed contracts / awards / revenue, unlimited AI, auto-send, or auto-submit.

## H. Confirm human-approval language

- [ ] Operator will state that AI outputs are drafts and that human
      approval is required before sending, publishing, proposal use,
      pricing decisions, compliance decisions, teaming decisions, and
      bid/no-bid decisions.

## I. Opening statement (say out loud)

- [ ] "SourceDeck is release-candidate software for a controlled demo.
      AI-assisted outputs are drafts. A human approves every external
      action." (Human approval is required; SourceDeck does not auto-send or auto-submit.)

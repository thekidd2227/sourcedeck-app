# Release Note — Launch Package / Handoff (Phase 19B)

**Branch:** `docs/launch-package-handoff`
**Type:** Documentation only (no runtime, package, script, test, or
workflow changes).

## What shipped

The final SourceDeck v1 controlled-demo launch package and operator/buyer
handoff:

- `docs/launch/sourceDeck-v1-controlled-demo-launch-package.md` — the
  authoritative launch entry point and posture.
- `docs/launch/sourceDeck-v1-buyer-handoff.md` — buyer-facing guide.
- `docs/launch/sourceDeck-v1-internal-support-handoff.md` — internal
  support / diagnostics runbook.
- `docs/launch/sourceDeck-v1-known-limitations-for-buyers.md` — honest,
  buyer-facing limitations.
- `docs/launch/sourceDeck-v1-demo-day-checklist.md` — pre-demo checklist.
- `docs/audits/launch-package-handoff-audit.md` — packaging audit.

## Launch posture

- Controlled buyer demo: **GO**
- Public signed macOS release: **NO-GO**
- Present-tense watsonx live claim: **NO-GO** unless `verified_ready`
  evidence exists
- New feature work after RC lock: **frozen**

## Safety

- Docs only; no runtime changes.
- No package/script/test/workflow changes.
- No secrets; no live email; no publishing; no signing/notarization.
- Claim discipline: SourceDeck must not assert any compliance certification, must not promise guaranteed contract/award/revenue, must not claim unlimited AI, must not make a present-tense watsonx-live claim, and must not claim it is signed/notarized.
- Human approval remains required for outreach, proposals, pricing,
  compliance, bid/no-bid, teaming, publishing, and sending.

## Verification

All normal gates green at packaging. watsonx runtime state
`not_configured`; release evidence state `packaged_unsigned`;
troubleshooting scan 0 critical/high failures. Expected strict blockers
(`watsonx:runtime-probe:strict`, `release:evidence:strict`) still exit 1
outside a configured/signing environment, as designed.

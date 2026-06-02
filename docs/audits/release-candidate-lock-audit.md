# SourceDeck v1 Release Candidate Lock Audit

**Date:** 2026-06-02  
**Branch:** `chore/release-candidate-lock`  
**Main HEAD audited:** `fb78b25`  
**Decision:** RC-ready for controlled demo; not ready for public signed macOS release; not ready for present-tense managed-watsonx claims.

## Scope

This audit verifies the post-Phase 18A / 18B release-candidate state after:

- PR #29 Daily Troubleshooting Agent
- PR #30 Troubleshooting Email Alert Dry-Run
- PR #31 macOS Signing Readiness
- PR #32 Release Artifact Evidence Capture
- PR #33 Commercial Smoke / Demo Readiness
- PR #34 watsonx Runtime Evidence Probe

This phase makes no runtime feature changes, no package/script/test/workflow changes, no signing changes, no publishing changes, and no live email changes.

## Repo State

- Current branch at audit start: `main`
- Current release branch: `chore/release-candidate-lock`
- `main` included PR #33 merge commit `666e99d`
- `main` included PR #34 merge commit `fb78b25`
- Open PRs at pre-flight: none detected
- Existing stashes were listed and not modified
- `.env.local` and `.env` files were not read, modified, printed, or touched

## Gate Results

Normal gates passed in the pre-lock audit run:

| Gate | Result |
|---|---:|
| `npm test` | PASS |
| `npm run watsonx:runtime-probe` | PASS |
| `npm run watsonx:runtime-probe:json` | PASS |
| `npm run watsonx:runtime-probe:evidence` | PASS |
| `npm run release:evidence` | PASS |
| `npm run release:evidence:json` | PASS |
| `npm run release:mac-signing-readiness` | PASS |
| `npm run troubleshooting:scan` | PASS |
| `npm run troubleshooting:scan:json` | PASS |
| `npm run troubleshooting:email-dry-run` | PASS |
| `npm run govcon:smoke` | PASS |
| `npm run govcon:outreach-os:audit` | PASS |
| `npm run phase13:rc-check` | PASS |
| `npm run i18n:audit` | PASS |
| `node scripts/release-check.js` | PASS with expected unsigned local artifact warning |

Strict blockers:

| Strict Gate | Result | Meaning |
|---|---:|---|
| `npm run watsonx:runtime-probe:strict` | exit `1` | Expected: local IBM/watsonx env is not configured, outcome `not_configured` |
| `npm run release:evidence:strict` | exit `1` | Expected: signing readiness is `blocked_missing_signing` |

## watsonx Runtime State

Current watsonx runtime evidence reports:

- State: `not_configured`
- Outcome: `not_configured`
- `verified_ready`: no
- Latest evidence paths:
  - `reports/watsonx-runtime/latest-watsonx-runtime-evidence.md`
  - `reports/watsonx-runtime/latest-watsonx-runtime-evidence.json`

This is safe for controlled demo language only when described as readiness-gated, BYOK / provider-governed, or premium deployment scoping. SourceDeck must not claim watsonx is live, included, production-ready, or fully operational unless a later strict probe returns `verified_ready`.

## Release Evidence State

Current release evidence reports:

- State: `packaged_unsigned`
- Packaged asar: present
- Required asar files: present
- Signing readiness: `unsigned_dev_ok` in dev mode
- Strict signing state: `blocked_missing_signing`
- Latest evidence paths:
  - `reports/release-evidence/2026-06-02-release-evidence.md`
  - `reports/release-evidence/2026-06-02-release-evidence.json`
  - `reports/release-evidence/latest-release-evidence.md`
  - `reports/release-evidence/latest-release-evidence.json`

This is enough for a controlled demo build, not enough for a public signed/notarized macOS release.

## Claim Cleanup

Two prior wording risks were checked and cleaned:

- `sourcedeck.html`: replaced the prior healthcare compliance label with `Healthcare-sensitive deployment support`.
- `docs/premium-content-agent.md`: softened the opening managed-watsonx wording to `watsonx-ready / provider-governed AI content workflow`.

No FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, ISO 27001, government-compliant, guaranteed contract, guaranteed award, guaranteed revenue, unlimited AI, watsonx live, signed/notarized, auto-send, auto-submit, or autonomous proposal-submission claim is approved for this RC.

## Secret / Credential Boundary

The credential scan found guardrail and migration references only. No raw secret value was reported. Credential claims remain presence-only:

- AI provider credentials remain behind the main-process credential boundary.
- Renderer localStorage migration references are historical cleanup paths, not current raw-key storage.
- Release evidence and watsonx evidence remain redacted / presence-only.

## Human Approval Model

Human approval remains required for:

- outreach
- proposal
- pricing
- compliance
- bid/no-bid
- teaming
- publishing
- sending

Confirmed safety model:

- `autoRepairAllowed:false`
- `requiresHumanApproval:true`
- no autonomous send/post/submit
- email alert path remains dry-run unless separately configured by an operator
- `RED_RESTRICTED` remains guarded
- `KILL` remains irreversible unless user-reviewed evidence changes the record through an explicit operator decision

## Remaining Blockers

1. IBM/watsonx runtime must reach `verified_ready` before any "watsonx live" or present-tense managed-watsonx claim.
2. Apple signing/notarization credentials are required before public signed macOS release.
3. `release:evidence:strict` is expected to block until signing readiness reaches `ready_to_sign`.

## Final Decision

**RC-READY FOR CONTROLLED DEMO.**

**NOT READY FOR PUBLIC SIGNED MAC RELEASE.**

**NOT READY TO CLAIM WATSONX LIVE UNLESS `verified_ready` EXISTS.**

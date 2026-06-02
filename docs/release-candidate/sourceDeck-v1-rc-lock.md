# SourceDeck v1 Release Candidate Lock

**Lock date:** 2026-06-02  
**Main HEAD:** `fb78b25`  
**Release branch:** `chore/release-candidate-lock`  
**Decision:** RC-ready for controlled demo; not ready for public signed macOS release; not ready for present-tense managed-watsonx claims.

## Merged Phase Baseline

The RC baseline includes:

- PR #29 Daily Troubleshooting Agent
- PR #30 Troubleshooting Email Alert Dry-Run
- PR #31 macOS Signing Readiness
- PR #32 Release Artifact Evidence Capture
- PR #33 Commercial Smoke / Demo Readiness
- PR #34 watsonx Runtime Evidence Probe

## Gate Summary

All normal gates passed:

- `npm test`
- `npm run watsonx:runtime-probe`
- `npm run watsonx:runtime-probe:json`
- `npm run watsonx:runtime-probe:evidence`
- `npm run release:evidence`
- `npm run release:evidence:json`
- `npm run release:mac-signing-readiness`
- `npm run troubleshooting:scan`
- `npm run troubleshooting:scan:json`
- `npm run troubleshooting:email-dry-run`
- `npm run govcon:smoke`
- `npm run govcon:outreach-os:audit`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Expected strict blockers:

- `npm run watsonx:runtime-probe:strict` exits `1` because local IBM/watsonx env is not configured and evidence is not `verified_ready`.
- `npm run release:evidence:strict` exits `1` because Apple signing/notarization readiness is not complete.

## Release Evidence State

Release evidence state is `packaged_unsigned`.

The app package evidence exists and confirms required asar files are present. The local macOS artifact is unsigned. This is acceptable for controlled demo use, but not for a public signed release.

## watsonx Runtime State

watsonx runtime evidence is present, but current state is `not_configured` and `verified_ready` is `no`.

Safe language:

- customer-provided AI credentials
- BYOK
- provider-governed AI workflow
- watsonx-ready
- premium / enterprise deployments may include SourceDeck-managed watsonx after scoping and verified readiness

Forbidden language until verified:

- watsonx live
- IBM watsonx included
- watsonx fully operational
- SourceDeck-managed watsonx is ready

## Buyer / Demo Readiness

The RC is ready for controlled buyer demos using the Phase 18B demo runbook and commercial smoke material.

Demo operators must state:

- SourceDeck is release-candidate software.
- AI-assisted outputs are drafts.
- Human review is required before outreach, proposals, pricing, compliance use, bid/no-bid decisions, teaming decisions, publishing, and sending.
- watsonx is readiness-gated and not claimed live unless evidence says `verified_ready`.
- macOS signing/notarization is pending real Apple credentials.

## RC Freeze Rule

After this RC lock:

- No new features.
- No runtime architecture changes.
- No new provider behavior.
- No workflow changes.
- No release publishing.

Allowed changes after RC lock:

- critical bug fixes
- claim cleanup
- documentation correction
- evidence updates
- release-blocker remediation

Any change outside that scope must be treated as a new release-candidate cycle.

## Final Decision

**RC-READY FOR CONTROLLED DEMO.**

**NOT READY FOR PUBLIC SIGNED MAC RELEASE.**

**NOT READY TO CLAIM WATSONX LIVE UNLESS `verified_ready` EXISTS.**

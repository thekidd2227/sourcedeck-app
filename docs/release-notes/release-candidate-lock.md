# Release Candidate Lock

SourceDeck v1 is now locked as a release candidate for controlled demo use.

## Included Baseline

- PR #29 Daily Troubleshooting Agent
- PR #30 Troubleshooting Email Alert Dry-Run
- PR #31 macOS Signing Readiness
- PR #32 Release Artifact Evidence Capture
- PR #33 Commercial Smoke / Demo Readiness
- PR #34 watsonx Runtime Evidence Probe

## What Changed In This Lock

- Added formal RC lock documentation.
- Added go / no-go checklist.
- Added known limitations.
- Added release-candidate lock audit.
- Cleaned unsupported claim wording:
  - removed the prior healthcare compliance label
  - softened the opening managed-watsonx language

## Gate Status

Normal gates passed:

- `npm test`
- `npm run watsonx:runtime-probe`
- `npm run watsonx:runtime-probe:evidence`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run troubleshooting:scan:json`
- `npm run troubleshooting:email-dry-run`
- `npm run govcon:smoke`
- `npm run govcon:outreach-os:audit`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Strict blockers remain expected:

- watsonx strict probe blocks until evidence reaches `verified_ready`.
- release evidence strict blocks until Apple signing/notarization readiness is complete.

## Decision

**RC-ready for controlled demo.**

**Not ready for public signed macOS release.**

**Do not claim watsonx live unless `verified_ready` evidence exists.**

## Freeze Rule

No new features after RC lock. Only bug fixes, claims cleanup, documentation, and evidence updates are allowed unless a new RC cycle is opened.

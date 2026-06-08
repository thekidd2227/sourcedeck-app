# Release Notes — Phase 24L-PREP: Final RC Setup-Wizard Acceptance + Pilot Onboarding QA Contract

**Date:** 2026-06-08
**Type:** Docs / spec / audit only — **no runtime change.**
**Base:** `main @ 7861152` (post-PR #93 Phase 24I, #92 Phase 24J-PREP).

## What this is

Parallel-safe preparation defining exactly how the first-run Setup Wizard, API key onboarding, SAM.gov credential handling, new-profile onboarding, and pilot onboarding QA must be verified **after Phase 24K merges**. Authored while Phase 24K (First-Run Setup Wizard + New Profile Onboarding Gate) proceeds separately. Distinct `phase-24l-*` filenames; no runtime/test/package overlap.

## What was added (docs only)

- `docs/audits/phase-24l-setup-wizard-rc-acceptance-checklist.md` — trigger, content, API key, feature-walkthrough acceptance + hard-stop failures + verification commands.
- `docs/product/phase-24l-pilot-onboarding-qa-contract.md` — onboarding sequence, required/forbidden operator language, hold conditions, success signals.
- `docs/product/phase-24l-api-key-onboarding-boundary-contract.md` — credential placement policy, SAM.gov rule, other-key rule, safe wording, RC grep terms.
- `docs/product/phase-24l-final-rc-readiness-after-setup-wizard.md` — post-24K must-be-true list, final RC sequence, decision options + rule, carried no-go boundaries.
- `docs/release-notes/phase-24l-prep-setup-wizard-rc-acceptance.md` — this note.

## Credential rule (explicit)

> **Setup Wizard and Settings may request the SAM.gov API key; the SAM search / Sprint / Outreach screen may not.**

The search screen may show presence-only status and direct the user to Settings. No key may be printed, exposed, hardcoded, logged, committed, or shown in demos / export screens. (Post-24I, the runtime already satisfies this: SAM key inputs live in Setup Wizard `#gcwiz-sam` and Settings `#s-samkey`; the Outreach screen shows `#out-samkey-status` + a "Configure in Settings" button.)

## Explicitly NOT changed

- **No runtime change** — `sourcedeck.html` untouched.
- **No package / test / service / script change.**
- **No website change.**
- **No pricing change** — `docs/product/pricing-source-of-truth.md` remains canonical and unmodified.
- **No media** — no videos / screenshots / `.qa` output committed.
- **No send / submit / upload behavior** introduced.
- **No deployment / Vercel** change.
- **No Phase 24K runtime or doc** touched.

## Verification (this prep run, `main @ 7861152`, pre-24K baseline)

- `govcon-setup-wizard` 12/12, `govcon-final-runtime-polish` 23/23, `govcon-core-hardening` 15/15, `govcon-prompt-naics-parameterization` 16/16, `govcon-stakeholder-graph-ui` 25/25, `govcon-past-performance-capability-ui` 15/15, `response-desk` 24/24, `response-desk-email-import` 20/20, `default-state-policy` 22/22, `remove-system-readiness-tab` 9/9, `renderer-boot` 7/7, `sam-opportunity-sprint` PASS.
- `npm test` exit 0 (0 ❌). `release:evidence` 44/0/0. `troubleshooting:scan` no fail/warn. `govcon:smoke` PASS. `phase13:rc-check` PASS. `i18n:audit` 31/31. `release-check.js` PASS (macOS signing-not-configured is a benign local-dev warning).
- First-run-wizard-trigger gate **pending** until Phase 24K merges.

## Next action

After Phase 24K merges: **final RC hardening** using the Phase 24F packaging contract, the Phase 24J evidence binder + pilot handoff, and these Phase 24L acceptance/QA/boundary docs — re-run the full gate suite on current `main`, verify the setup-wizard triggers and the SAM-key credential boundary, and cut the RC (public signed release and watsonx live claim remain NO-GO without evidence).

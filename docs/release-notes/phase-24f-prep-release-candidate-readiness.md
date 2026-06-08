# Release Notes — Phase 24F-PREP: Release Candidate Packaging + Buyer Pilot Readiness Contract

**Date:** 2026-06-08
**Type:** Docs / spec / audit only — **no runtime change.**
**Base:** `main @ aa18e4d` (post-PR #87 Phase 24E prep/contract docs).

## What this is

Parallel-safe release preparation for SourceDeck, authored while Phase 24E
(Stakeholder Graph UI) runtime work proceeds separately. It establishes the
contract a later agent uses to run the **final release-candidate hardening
phase** once Phase 24E merges — with no ambiguity.

## What was added (docs only)

- `docs/product/phase-24f-release-candidate-packaging-contract.md` — RC
  definition, exclusions, required artifacts, acceptance criteria, known
  limitations, rollback.
- `docs/product/phase-24f-buyer-pilot-readiness-checklist.md` — ideal buyer,
  exact pilot positioning, boundaries, onboarding steps, success metrics,
  hold conditions.
- `docs/product/phase-24f-support-onboarding-contract.md` — support posture,
  roles, onboarding flow, escalation checklist, what support must not do.
- `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md` —
  boundaries, surfaces, verbatim disclaimers, verification commands,
  hard-stop failures.
- `docs/release-notes/phase-24f-prep-release-candidate-readiness.md` — this
  note.

## Explicitly NOT changed

- **No runtime change** — `sourcedeck.html` untouched.
- **No package / test / service / script change** — `package.json`,
  `package-lock.json`, `test/**`, `services/**`, `scripts/**` untouched.
- **No website change.**
- **No pricing change** — `docs/product/pricing-source-of-truth.md` remains
  canonical and unmodified.
- **No media** committed (no videos / screenshots / `.qa` output).
- **No send / submit / upload behavior** introduced.
- **No deployment / Vercel** change.
- **No Phase 24E runtime file** touched.

## Verification (this prep run)

- `remove-system-readiness-tab` 9/9, `renderer-boot` 7/7,
  `govcon-core-hardening` 15/15, `govcon-past-performance-capability-ui`
  15/15, `response-desk` 24/24, `response-desk-email-import` 20/20,
  `default-state-policy` 22/22, `sam-opportunity-sprint` PASS.
- `npm test` exit 0 (0 ❌). `release:evidence` pass=44 fail=0 warn=0
  manual=3. `troubleshooting:scan` no fail/warn. `govcon:smoke` PASS.
  `phase13:rc-check` PASS. `i18n:audit` 31/31. `release-check.js` PASS
  (macOS signing-not-configured is a benign local-dev warning).
- **Phase 24E runtime still in progress; stakeholder graph runtime gate
  deferred until that PR merges** (`test/govcon-stakeholder-graph-ui.test.js`
  not yet present).

## Next action

After Phase 24E merges, a later agent runs the **final release-candidate
hardening** using the Phase 24F packaging contract, the buyer-pilot and
support/onboarding checklists, and the no-send/no-submit compliance
checklist.

# Release Notes — Phase 24J-PREP: Final RC Evidence Binder + Pilot Handoff Package

**Date:** 2026-06-08
**Type:** Docs / spec / audit only — **no runtime change.**
**Base:** `main @ 253b2a7` (post-PR #91 — Phase 24C-2).

## What this is

Parallel-safe preparation of the **final RC evidence binder** and **pilot handoff package**, authored while Phase 24I (Final Runtime UX Polish) proceeds separately. Once Phase 24I merges, the final RC hardening agent can move immediately using these docs + the Phase 24F packaging contract. Distinct `phase-24j-*` filenames; no runtime/test/package overlap.

## What was added (docs only)

- `docs/audits/phase-24j-final-rc-evidence-binder.md` — executive status (READY FOR FINAL RC HARDENING AFTER PHASE 24I), merged-phase inventory (PR + commit + evidence), final RC gate command list, hard RC acceptance criteria, remaining blockers.
- `docs/product/phase-24j-limited-paid-pilot-handoff.md` — pilot offer, buyer fit, what the buyer gets/does-not-get, onboarding steps (incl. SAM key Settings-only), success metrics.
- `docs/product/phase-24j-operator-demo-runbook.md` — pre-demo setup, demo sequence, required operator language, do-not-say list, hold conditions.
- `docs/product/phase-24j-public-release-no-go-boundaries.md` — GO/NO-GO matrix for controlled demo, limited paid pilot, public signed macOS release, watsonx live claim, website marketing.
- `docs/release-notes/phase-24j-final-rc-evidence-binder.md` — this note.

## Explicitly NOT changed

- **No runtime change** — `sourcedeck.html` untouched.
- **No package / test / service / script change.**
- **No website change.**
- **No pricing change** — `docs/product/pricing-source-of-truth.md` remains canonical and unmodified.
- **No media** — no videos / screenshots / `.qa` output committed.
- **No send / submit / upload behavior** introduced.
- **No deployment / Vercel** change.
- **No Phase 24I runtime file** touched.

## Key RC note — SAM.gov API key must be Settings-only

A hard RC acceptance criterion: **the SAM.gov API key must be configured only in Settings, and the GovCon SAM search screen must not request it** (it may direct the user to Settings). This is the core of Phase 24I and must be verified at RC hardening time.

## Verification (this prep run, `main @ 253b2a7`, pre-24I baseline)

- `remove-system-readiness-tab` 9/9, `renderer-boot` 7/7, `govcon-core-hardening` 15/15, `govcon-prompt-naics-parameterization` 16/16, `govcon-stakeholder-graph-ui` 25/25, `govcon-past-performance-capability-ui` 15/15, `response-desk` 24/24, `response-desk-email-import` 20/20, `default-state-policy` 22/22, `sam-opportunity-sprint` PASS.
- `npm test` exit 0 (0 ❌). `release:evidence` pass=44 fail=0 warn=0 manual=3. `troubleshooting:scan` no fail/warn. `govcon:smoke` PASS. `phase13:rc-check` PASS. `i18n:audit` 31/31. `release-check.js` PASS (macOS signing-not-configured is a benign local-dev warning).
- `test/govcon-final-runtime-polish.test.js` not present — Phase 24I not yet merged; that gate remains **pending**.

## Next action

After Phase 24I merges: **final RC hardening** using this binder + the Phase 24F packaging contract — re-run the full §3 gate suite on current `main`, verify the SAM-key-Settings-only criterion, and cut the RC. Public signed macOS release and present-tense watsonx live claim remain **NO-GO** without their respective evidence.

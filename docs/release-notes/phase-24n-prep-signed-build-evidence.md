# Release Notes — Phase 24N-PREP: Signed Build / Installer Evidence Gate Prep

**Date:** 2026-06-08
**Type:** Docs / spec / audit only — **no runtime change.**
**Base:** `main @ 5637bc3` (post-PR #95 Phase 24K, #94 Phase 24L).

## What this is

Parallel-safe preparation of the **signed build / installer evidence gate** — defining exactly what evidence is required before SourceDeck may claim a signed, notarized, production-ready macOS release. Authored while Phase 24M (Final RC Hardening + Limited Paid Pilot Decision) proceeds separately. Distinct `phase-24n-*` filenames; no runtime/test/package overlap.

## What was added (docs only)

- `docs/audits/phase-24n-signed-build-readiness-audit.md` — executive status **UNSIGNED RC ONLY**, current evidence inventory, hard NO-GO claims, required evidence before public signed release.
- `docs/product/phase-24n-installer-evidence-gate-contract.md` — ordered gate stages, future commands, evidence table, release classification.
- `docs/product/phase-24n-macos-signing-notarization-checklist.md` — pre-signing → signing → notarization → Gatekeeper → evidence capture → claim rules.
- `docs/product/phase-24n-release-artifact-handling-policy.md` — what may/must-not be committed, storage, naming, rollback.
- `docs/release-notes/phase-24n-prep-signed-build-evidence.md` — this note.

## Explicitly NOT done

- **No runtime change** — `sourcedeck.html` untouched.
- **No build created** (no `electron-builder`, `pack:mac`, `build:mac` run).
- **No signing performed** (no `codesign`).
- **No notarization performed** (no `notarytool`).
- **No installer created** (no DMG/ZIP produced).
- **No public release claim** — status is "unsigned development build".
- **No website change.**
- **No pricing change** — `pricing-source-of-truth.md` unchanged.
- **No media** — no videos / screenshots committed.
- **No `.qa` / `reports` / `dist` output committed** (all gitignored; nothing staged).
- **No package / test / service / script change.**
- **No Phase 24M runtime or doc** touched.

## Evidence captured (non-invasive readiness checks; presence-only, no secrets)

- `macos-signing-readiness.test.js` 19/19, `signed-demo-build-readiness.test.js` 25/25, `release-evidence.test.js` 20/20 — PASS.
- `release:mac-signing-readiness`: status `unsigned_dev_ok`, ready **no**, `notarize: false`; hardenedRuntime **true**; entitlements + icon present; signing env **missing** (`CSC_LINK`, `CSC_KEY_PASSWORD`); notarize env **missing** (`APPLE_*`).
- `release:evidence`: `pass=44 fail=0 warn=0 manual=3`; `codesign attempted: no`.
- `release-check.js` (exit 0): signing/notarize env MISSING; **`codesign --verify` fails — artifact "not signed at all"**; local-dev warning only.
- A pre-existing **unsigned** local `dist/mac/SourceDeck.app` was observed (gitignored; not built or committed by this phase).

## Conclusion

**UNSIGNED RC ONLY.** Public signed / Apple-notarized / production-signed claims remain **NO-GO** until a real signing environment completes the Phase 24N signing checklist with captured evidence.

## Next action

After Phase 24M merges (final RC decision), run the **actual Phase 24N Signed Build / Installer Evidence Gate** from a signing environment, using these contracts/checklists, and capture the evidence before any signed/notarized/public-release claim.

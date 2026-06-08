# Phase 25A — Signed Build / Notarization Evidence Result

**Date:** 2026-06-08
**Companion audit:** `docs/audits/phase-25a-combined-launch-readiness-audit.md`.
**Predecessor:** `docs/audits/phase-24n-signed-build-readiness-audit.md`.

---

## CLASSIFICATION

# UNSIGNED LIMITED PILOT READY

This build is suitable for a **limited paid pilot delivered through a direct buyer relationship**. It is **NOT suitable for public release**, **NOT suitable for any "signed and notarized" / "Apple notarized" / "production signed" claim**, and **NOT suitable for posting as a public download**.

---

## Evidence captured (this phase)

| Evidence | Result | Source |
|---|---|---|
| `npm run release:mac-signing-readiness` scan | ✅ scan complete | Phase 25A audit §2 |
| `macOS signing env: MISSING` | ✅ expected local-dev posture | `release-check.js` |
| `notarize env: present=none; missing=APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID` | ✅ expected local-dev posture | `release:mac-signing-readiness` |
| `notarize API env: present=none; missing=APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER` | ✅ expected local-dev posture | `release:mac-signing-readiness` |
| `npm run release:evidence` → `state: local_unsigned_dev` | ✅ correct classification | `release:evidence` |
| `npm run release:evidence` → `warnings: []` | ✅ no warning emitted | `release:evidence` |
| `npm run release:evidence` → `blockers: []` | ✅ no blocker emitted | `release:evidence` |

---

## Evidence NOT captured (signed-release blockers)

The following Phase 24N-required evidence is **NOT** captured. Each missing item is an independent NO-GO blocker for a public signed release.

| Required evidence | Captured? | Status |
|---|---|---|
| Developer ID Application signing identity present | ❌ | **MISSING** — signed release NO-GO |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` present | ❌ | **MISSING** — signed release NO-GO |
| OR `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` present | ❌ | **MISSING** — signed release NO-GO |
| Notarization request submitted | ❌ | **NOT EXECUTED** |
| Notarization accepted by Apple | ❌ | **NOT EXECUTED** |
| Stapling verified (`xcrun stapler validate`) | ❌ | **NOT EXECUTED** |
| Gatekeeper assessment passes (`spctl --assess`) | ❌ | **NOT EXECUTED** (no signed artifact present) |
| Packaged artifact present at `dist/mac/SourceDeck.app` | ❌ | **NOT PRODUCED** |
| Artifact SHA-256 checksum captured | ❌ | **NOT PRODUCED** |

---

## Why this is the correct posture

The Phase 25A combined launch-readiness sprint is **not** a signing/notarization sprint. The sprint scope is:

1. **A.** Classify signing/notarization readiness without claiming what evidence doesn't support.
2. **B.** Align the website to V3 pricing source-of-truth.
3. **C.** Produce the limited paid pilot launch plan and operator runbook.
4. **D.** Issue the final launch-readiness decision (one of three).

The Apple Developer ID Application certificate, the Apple ID with app-specific password (or the Apple API key trio), and the actual `electron-builder` signed-build invocation are **explicitly out of scope** for Phase 25A. They are reserved for a dedicated signing/notarization sprint that the operator must schedule before any public release.

**No Apple credential shall be added to this repo or any committed file.** Per the Phase 24F packaging contract, those credentials live only in the operator's local environment (or the operator's CI secret store, when a CI is provisioned) and are loaded at signing-time only.

---

## Claim rules (verbatim — operator must enforce)

Per the strict Phase 24N rule, while the evidence above remains uncaptured:

1. ❌ Do **not** claim "signed and notarized" anywhere — UI, website, marketing, sales call, pilot letter, operator runbook.
2. ❌ Do **not** claim "Apple notarized" anywhere.
3. ❌ Do **not** claim "production signed" anywhere.
4. ❌ Do **not** post a public download link for the unsigned dev build.
5. ❌ Do **not** publish the unsigned dev build to a public artifact registry, public S3, public GitHub Release, or any public download mirror.
6. ✅ It **is** allowed to deliver the unsigned dev build through a direct pilot relationship, with the operator walking the buyer through Gatekeeper "open anyway", with the buyer informed that the build is an unsigned development RC.
7. ✅ It **is** allowed to say "limited paid pilot — unsigned development RC."
8. ✅ It **is** allowed to say "we are pre-notarization; signing/notarization is on the roadmap."

---

## Path to signed release

When the operator is ready to pursue public signed release, the following sprint sequence applies:

1. **Phase 25B — Apple Developer enrollment** (organization or individual; operator's choice).
2. **Phase 25C — Developer ID Application certificate provisioning** (download into operator-only Keychain).
3. **Phase 25D — Apple API key provisioning** (App Store Connect → Users and Access → Keys → App Manager role).
4. **Phase 25E — Local signed-build dry-run** (`electron-builder --mac --x64 --arm64`) with the Apple API key trio loaded into the operator's local env (never committed).
5. **Phase 25F — Notarization submission + stapling + Gatekeeper assessment + SHA-256 capture.**
6. **Phase 25G — Public release CTA + download page enablement.**
7. **Phase 25H — Website signed-claim language enablement** (replaces the current "unsigned development RC" language with "signed and notarized" — gated on the Phase 25F evidence binder).

Each phase is independent. The operator may stop at any phase without losing pilot momentum, because the limited paid pilot does not require a signed build.

---

## Signature

Phase 25A signing-evidence classification is **UNSIGNED LIMITED PILOT READY**. Public signed release remains **NO-GO**. All "signed and notarized" / "Apple notarized" / "production signed" claims remain **PROHIBITED** until the Phase 25F evidence binder is captured.

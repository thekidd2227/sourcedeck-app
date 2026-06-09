# Phase 25C — Desktop Delivery Boundary

**Date:** 2026-06-09.
**Companion docs:** `docs/product/phase-25c-master-delivery-method.md`, `docs/product/phase-25c-secure-web-pwa-delivery-contract.md`.

This document scopes desktop delivery channels and their boundaries. Desktop delivery is **not** the SourceDeck mass-delivery channel per the Phase 25C master delivery method. The secure web app / PWA is. Desktop channels exist only as documented here.

---

## 1. Desktop channel matrix

| Channel | Status | Permitted use |
|---|---|---|
| **Desktop ZIP (unsigned)** | Internal-only artifact. | Jean-Max / ARCG internal 7-day trial, troubleshooting burn-in. Buyer-style simulation. **Not** mass delivery. **Not** public distribution. |
| **Buyer-style ZIP (unsigned)** | Internal simulation only. | Lets the operator feel a buyer-like delivery flow without buyer involvement. Never sent to a buyer in the current pilot phase. |
| **Unsigned dev/RC build** | Controlled internal/pilot testing only. | Limited paid pilot delivery through a direct buyer relationship (Phase 25A pilot path) — **never** via public download. |
| **Signed desktop installer** | Future optional delivery. | Only after the Phase 25F evidence binder is captured (cert, notarize, staple, Gatekeeper, checksum). |

## 2. Desktop ZIP boundary

The Desktop ZIP package (built by the Phase 25B-Day0B operator script on the operator's Mac) is **internal trial only**.

- ❌ Never sent to a buyer.
- ❌ Never posted to a public artifact registry (S3, GitHub Release, public download mirror, public Dropbox, etc.).
- ❌ Never linked from `sourcedeck.app`.
- ❌ Never advertised as "downloadable" anywhere.
- ❌ Never described as a "release" or "version."
- ✅ Built on the operator's Mac.
- ✅ Lives only on the operator's Desktop.
- ✅ Opened only by the operator (or, in the buyer-style simulation, by the operator playing the buyer role).
- ✅ Includes the canonical "UNSIGNED INTERNAL TRIAL BUILD — NOT FOR PUBLIC DISTRIBUTION" warning in every README and START HERE artifact.

## 3. Buyer-style ZIP boundary

The buyer-style ZIP package (Phase 25B-Day0B / Day0C) is a **structural simulation** of buyer delivery, intended to test the operator's pilot-flow ergonomics. It is **never** a real buyer delivery channel during this pilot phase.

- ❌ Never sent to a buyer.
- ❌ Never posted publicly.
- ❌ Never used as evidence that the desktop channel is "ready."
- ✅ Validates that the operator has the pilot-flow assets organized.
- ✅ Surfaces gaps in the operator's pilot-flow documentation.

## 4. Unsigned dev/RC build boundary

The unsigned dev/RC build is the artifact that powers both the Desktop ZIP and the direct-pilot delivery path. Per Phase 25A, the unsigned dev/RC build is acceptable for a **limited paid pilot delivered through a direct buyer relationship** — but **never** for public release.

- ✅ Delivered through the buyer's secure transfer channel.
- ✅ Operator walks the buyer through macOS Gatekeeper "open anyway" on first launch.
- ✅ Buyer is told (in writing) that the build is an unsigned development RC.
- ❌ Never posted as a public download.
- ❌ Never claimed as "signed and notarized."
- ❌ Never claimed as "Apple notarized."
- ❌ Never claimed as "production signed."

## 5. Signed desktop installer — gating requirements

Before the public-signed-installer channel may be enabled, **all eight** of the following must be true:

1. **Apple Developer ID Application identity** provisioned in the operator's Keychain. (Never committed to this repo.)
2. **Hardened runtime** enabled in `electron-builder` configuration. (`hardenedRuntime: true`, `gatekeeperAssess: true`, entitlements file present.)
3. **Notarization credentials** present locally:
   - Either: `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
   - Or: `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`
4. **Notarization request** submitted to Apple and **accepted**.
5. **Stapling** verified (`xcrun stapler validate dist/mac/SourceDeck.app`).
6. **Gatekeeper assessment** passes (`spctl --assess --verbose=4 dist/mac/SourceDeck.app`).
7. **Artifact SHA-256 checksum** captured and recorded in the release-evidence binder.
8. **Explicit operator approval** for public-installer release, recorded in writing.

Until **all eight** are true, the public-signed-installer claim is **forbidden**:

- ❌ No "signed and notarized" claim anywhere.
- ❌ No "Apple notarized" claim anywhere.
- ❌ No "production signed" claim anywhere.
- ❌ No public download link for the desktop installer.
- ❌ No release note describing the desktop installer as "released."

The future signing/notarization sprint sequence is documented in `docs/product/phase-25a-signed-build-evidence-result.md` §"Path to signed release" (Phase 25B–Phase 25H).

## 6. Distribution boundary summary

| Channel | Distribution path |
|---|---|
| **Desktop ZIP (internal)** | Operator's Mac → operator's Desktop → operator opens. **Stops there.** |
| **Buyer-style ZIP (internal simulation)** | Operator's Mac → operator's Desktop → operator opens (acting as buyer). **Stops there.** |
| **Unsigned dev/RC build (limited pilot)** | Operator's Mac → secure transfer channel → buyer's Mac → buyer opens with Gatekeeper "open anyway." Direct relationship only. |
| **Signed desktop installer (future)** | Apple Developer ID signed + notarized + stapled → public download link from `sourcedeck.app/download/app/` — **only after the Phase 25F evidence binder is captured**. |

## 7. Repository hygiene

To preserve the desktop delivery boundary, the following are **never** committed to either repo:

- ❌ Any `.dmg`, `.zip`, `.pkg` build artifact.
- ❌ Any `.app` bundle.
- ❌ Any `dist/`, `build/`, `release/`, `out/` build-output directory.
- ❌ Any `.cer`, `.p12`, `.pem`, `.key`, `.mobileprovision` credential file.
- ❌ Any `.qa/` test-output directory.
- ❌ Any screenshot, video, or media artifact produced during a trial run.
- ❌ Any signing or notarization credential (Apple Developer ID, Apple ID password, Apple API Key).

These exclusions are enforced by `.gitignore` and re-checked by the Phase 25C audit (`docs/audits/phase-25c-delivery-method-guardrail-audit.md`).

---

## Signature

This document is the canonical desktop delivery boundary. The Desktop ZIP is internal-only. The unsigned dev/RC build is direct-pilot-only. The signed installer is future-only, gated on the Phase 25F evidence binder. No deviation without explicit Tier 2 approval.

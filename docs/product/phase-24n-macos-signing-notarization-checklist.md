# Phase 24N-PREP — macOS Signing / Notarization Checklist

**Date:** 2026-06-08
**Posture:** Docs / spec / audit only. **No signing / notarization performed.** Run by the signing operator from a real signing environment when the signed RC is authorized.
**Companions:** `docs/audits/phase-24n-signed-build-readiness-audit.md`, `docs/product/phase-24n-installer-evidence-gate-contract.md`, `docs/product/phase-24n-release-artifact-handling-policy.md`.

> Every command that reads credentials runs in the secure signing environment. **Never** print, log, or commit a secret. Capture **presence-only** evidence.

---

## A. Pre-signing

- [ ] Confirm app **version** (matches the intended RC).
- [ ] Confirm **bundle identifier** (`appId: app.sourcedeck.lcc`).
- [ ] Confirm **Apple Developer account** access.
- [ ] Confirm **Developer ID Application** certificate present (`CSC_LINK` / keychain identity).
- [ ] Confirm **no secrets in the bundle** (no `.env`, keys, certs, provisioning profiles).
- [ ] Confirm **`.env` not bundled** (electron-builder `files` excludes it; verify the packaged asar).
- [ ] Confirm **pricing / source claims clean** (no `$79`/`$349`/`$999`; pricing aligns to `pricing-source-of-truth.md`).

## B. Signing

- [ ] **Sign app** (electron-builder `build:mac` with signing env present; `mac.hardenedRuntime: true`).
- [ ] **Verify signature** — `codesign --verify --deep --strict --verbose=2 "dist/mac/SourceDeck.app"` passes.
- [ ] **Verify hardened runtime** — flags include `runtime`.
- [ ] **Verify entitlements** — `codesign -d --entitlements :- "dist/mac/SourceDeck.app"` shows the reviewed `build/entitlements.mac.plist` (least-privilege; no release debugging entitlements).

## C. Notarization

- [ ] Set `mac.notarize: true` (currently `false`) and supply notarize credentials (secure).
- [ ] **Submit to Apple notarization** — `xcrun notarytool submit <artifact> --keychain-profile <profile> --wait`.
- [ ] **Wait for `Accepted` status.**
- [ ] **Fetch notarization log** — `xcrun notarytool log <submission-id> --keychain-profile <profile>` (review for issues; store summary, not secrets).
- [ ] **Staple ticket** — `xcrun stapler staple <artifact>`.

## D. Gatekeeper

- [ ] **`spctl` assessment** — `spctl -a -vvv -t install <dmg>` / `-t exec <app>` accepted; source = Developer ID.
- [ ] **Launch test on a clean machine** if possible (no quarantine bypass).
- [ ] **Checksum artifact** — `shasum -a 256 <artifact>`.

## E. Evidence capture

- [ ] **Commands run** (list, without secret values).
- [ ] **Output summaries** (accepted/verified/stapled — presence-only).
- [ ] **Artifact filename(s)** (`SourceDeck-macOS-<arch>.dmg` / `.zip`).
- [ ] **Checksum(s)** recorded.
- [ ] **Timestamp** recorded.
- [ ] **Signer identity redacted / presence-only** (e.g. "Developer ID Application: present" — never the full identity string or team secrets).
- [ ] **No secrets exposed** anywhere in the captured evidence.

## F. Claim rules

**Allowed only after the corresponding evidence exists:**
- "Signed macOS build" — only after §B passes.
- "Apple notarized" — only after §C `Accepted` + stapled.
- "Production release candidate" — only after §B–§E all captured.

**Forbidden without evidence (today's state):**
- "Apple notarized"
- "Production signed"
- "Ready for public download"

Current state: signing/notarize env **missing**, `notarize: false`, `codesign --verify` **fails**. Until §A–§E are complete from a signing environment, use only **"unsigned development build"** framing.

# Phase 24N-PREP — Installer Evidence Gate Contract

**Date:** 2026-06-08
**Posture:** Docs / spec / audit only. **No build / sign / notarize / package performed.** Commands below are **future** execution, run from a signing environment.
**Companions:** `docs/audits/phase-24n-signed-build-readiness-audit.md`, `docs/product/phase-24n-macos-signing-notarization-checklist.md`, `docs/product/phase-24n-release-artifact-handling-policy.md`.

---

## 1. Purpose

Define the exact, ordered gate before SourceDeck can be distributed as a **signed installer**. No stage may be skipped, and no public signed/notarized claim may be made until every stage produces captured evidence (presence-only, no secrets).

---

## 2. Gate stages (ordered)

1. **Build readiness** — tests + release evidence green; entitlements/icon present; no secrets in repo.
2. **Code-sign readiness** — Developer ID Application identity available; hardened runtime on.
3. **Notarization readiness** — `mac.notarize: true` + notarize credentials/API key present (presence-only).
4. **Installer packaging readiness** — electron-builder produces dmg + zip (x64 + arm64).
5. **Artifact verification** — codesign verify, spctl assess, stapler validate, checksum.
6. **Release evidence capture** — commands + output summaries recorded (no secrets); artifact names + checksums.
7. **Distribution approval** — explicit human authorization to publish (GitHub release / website handled separately).

A later stage may not start until the prior stage's evidence is captured.

---

## 3. Required commands for future execution (NOT run in this phase)

> These are documented for the future signing run. **Do not run build/sign/notarize commands in a docs phase.**

```
# Already-available, non-invasive (safe to run anytime):
npm test
npm run release:evidence
npm run release:mac-signing-readiness            # presence-only
npm run release:mac-signing-readiness:strict     # from a signing env: exit 1 if signing config missing
node scripts/release-check.js
npm run phase13:rc-check

# FUTURE — build / package (signing env only):
npm run pack:mac                                 # electron-builder --mac --dir (unsigned dir build)
npm run build:mac                                # electron-builder --mac (dmg + zip)

# FUTURE — verification (macOS, signing env only):
codesign --verify --deep --strict --verbose=2 "dist/mac/SourceDeck.app"
spctl -a -vvv -t exec "dist/mac/SourceDeck.app"
xcrun notarytool submit "dist/SourceDeck-macOS-arm64.dmg" --keychain-profile <profile> --wait
xcrun notarytool log <submission-id> --keychain-profile <profile>
xcrun stapler staple "dist/SourceDeck-macOS-arm64.dmg"
xcrun stapler validate "dist/SourceDeck-macOS-arm64.dmg"
shasum -a 256 dist/SourceDeck-macOS-*.dmg dist/SourceDeck-macOS-*.zip
```

> `<profile>` / credentials are supplied via the secure signing environment — never committed, never printed.

---

## 4. Evidence table (current status)

| Gate | Required evidence | Current status | Blocking issue | Owner action |
|---|---|---|---|---|
| Build readiness | tests green; entitlements/icon present | **PASS** | none | — |
| Code-sign readiness | Developer ID identity; hardened runtime | **BLOCKED** | `CSC_LINK`/`CSC_KEY_PASSWORD` missing | provision signing identity in signing env |
| Notarization readiness | `notarize:true` + notarize creds | **BLOCKED** | `mac.notarize:false`; `APPLE_*` missing | enable notarize + supply notarize creds (secure) |
| Installer packaging | dmg + zip produced | **NOT RUN** | depends on sign readiness | run `build:mac` from signing env |
| Artifact verification | codesign/spctl/stapler/checksum pass | **FAIL** (unsigned) | artifact "not signed at all" | re-verify after signing |
| Release evidence capture | summaries (no secrets) + checksums | **PARTIAL** | `codesign attempted: no` | capture after signing |
| Distribution approval | explicit authorization | **NOT GRANTED** | upstream gates open | human approval after all green |

---

## 5. Release classification

| Class | Definition | Current eligibility |
|---|---|---|
| **Internal dev build** | local unsigned build for development | **YES** |
| **Unsigned RC** | demo/pilot-capable, unsigned, "unsigned development build" framing | **YES** |
| **Controlled buyer demo** | live/screen-share on unsigned build, sample data | **YES** (per Phase 24J no-go doc, after RC gates) |
| **Limited paid pilot** | guided pilot, unsigned build, explicit no-send/no-submit boundary | **CONDITIONAL** (per Phase 24M decision + Phase 24L acceptance) |
| **Public signed release** | signed + notarized + stapled installer, public download | **NO-GO** (no signing evidence) |

The only path from "Unsigned RC" to "Public signed release" is completing every §2 stage with captured §4 evidence.

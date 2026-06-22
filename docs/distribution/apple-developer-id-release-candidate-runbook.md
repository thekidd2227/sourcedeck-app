# SourceDeck Apple Developer ID Release Candidate Runbook

## Executive Standard

SourceDeck should be distributed to paying Mac customers as a **signed and notarized Developer ID application outside the Mac App Store**. This gives customers the normal professional install experience while avoiding App Store review, App Store commercial constraints, and unnecessary B2B distribution friction.[1]

Apple’s off-App-Store Mac distribution path relies on **Developer ID signing** and **notarization**. In practical terms, signing proves the app came from ARCG/SourceDeck, and notarization lets Apple check the app before customers open it through Gatekeeper.[1] Electron Builder supports macOS signing and notarization as part of the packaged build process when the correct certificates and environment variables are available.[2]

## Release Gate Decision

The repository is now configured for `notarize: true`, so the professional release baseline is intentional. Local unsigned builds can still exist for development, but any customer-facing release candidate must pass the signing and notarization gate.

| Build Type | Allowed Audience | Requirement |
|---|---|---|
| Local dev build | Internal engineering only | May be unsigned. |
| Buyer trial package | Internal/demo only unless signed | Should be signed before broad external use. |
| Paid customer release candidate | Paying customers/test customers | Must be signed and notarized. |
| Production customer release | Paying customers | Must be signed, notarized, checksummed, and distributed through the secure fulfillment flow. |

## Apple Account Setup

ARCG/SourceDeck needs an Apple Developer Program membership and a Developer ID Application certificate. This does **not** mean SourceDeck must be listed in the Mac App Store. It only means Apple can identify and notarize the app for direct distribution.[1]

| Item | Owner | Notes |
|---|---|---|
| Apple Developer Program account | ARCG/SourceDeck business owner | Use the business entity if possible, not a random personal account. |
| Developer ID Application certificate | Release operator | Used to sign the macOS app. |
| Apple Team ID | Release operator | Required by notarization tooling. |
| App-specific password or App Store Connect API credentials | Release operator | Used only in CI/local secret storage, never committed. |
| Certificate export password | Release operator | Stored only in secret manager or CI secret store. |

## Required Build Secrets

These values must be stored in the local release machine keychain, GitHub Actions secrets, or another secure CI secret store. They must never be written into the repository.

| Secret | Purpose |
|---|---|
| `CSC_LINK` | Base64 or file reference to the signing certificate used by Electron Builder. |
| `CSC_KEY_PASSWORD` | Password for the certificate file. |
| `APPLE_ID` | Apple ID used for notarization if using Apple ID auth. |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization if using Apple ID auth. |
| `APPLE_TEAM_ID` | Apple Developer Team ID. |
| `GH_TOKEN` | Publishes release artifacts to GitHub Releases if that publish path is used. |

## First Release Candidate Procedure

Run the release candidate from a clean `main` branch after CI is green. The operator should produce the DMG, ZIP, checksum, and release evidence before uploading the artifact to secure distribution storage.

```bash
cd ~/sourcedeck-app && \
git fetch origin && \
git switch main && \
git pull --ff-only origin main && \
npm install && \
npm run license:check && \
npm run distribution:check && \
npm run govcon:smoke && \
npm run troubleshooting:scan && \
npm run release:check && \
npm run pack:mac && \
shasum -a 256 dist/mac/*.dmg dist/mac/*.zip 2>/dev/null || true
```

If the Apple secrets are present and valid, the macOS package step should produce signed/notarized artifacts according to the Electron Builder configuration. If the secrets are missing, the release gate should warn or fail depending on strict mode, and the artifact must not be sent to customers.[2]

## Strict Production Gate

Before a release is sent to paying customers, run the strict commercial readiness gate:

```bash
cd ~/sourcedeck-app && npm run distribution:check -- --strict
```

The strict gate should only pass when the checkout/licensing environment and Apple signing/notarization environment are present. A passing strict gate does not replace a manual artifact verification step; it prevents obvious missing-production-secret mistakes.

## Artifact Evidence Package

Every release candidate should have a small evidence bundle. This makes support, rollback, and enterprise customer trust easier later.

| Evidence File | Required Content |
|---|---|
| `release-version.txt` | App version, git commit, release date. |
| `checksums.txt` | SHA-256 for `.dmg`, `.zip`, and any updater metadata. |
| `validation-log.txt` | Output from license, distribution, smoke, troubleshooting, and release gates. |
| `notarization-log.txt` | Notarization success output or CI reference. |
| `release-notes.md` | Customer-facing changes, fixes, and known limitations. |

## Upload to Secure Distribution

Once the release candidate is signed, notarized, and checksummed, upload it to the private release bucket used by the secure download Worker. The fulfillment service variable `SOURCEDECK_CURRENT_MAC_DMG_KEY` should then point to the new artifact path, and `SOURCEDECK_CURRENT_MAC_SHA256` should match the generated checksum.

| Step | Required Action |
|---|---|
| Upload artifact | Place the `.dmg` in private R2 storage under a versioned key. |
| Update current pointer | Set `SOURCEDECK_CURRENT_MAC_DMG_KEY` to the new `.dmg` key. |
| Update hash | Set `SOURCEDECK_CURRENT_MAC_SHA256` to the release checksum. |
| Test download | Use a test purchase/download token and verify the downloaded hash. |
| Activate app | Install from the downloaded `.dmg` and activate with a Lemon Squeezy test license. |

## Customer-Ready Definition of Done

SourceDeck is ready for first paid customer distribution only when all of the following are true.

| Requirement | Status Rule |
|---|---|
| Checkout | Lemon Squeezy product is live with the correct price, license policy, and receipt copy. |
| License activation | SourceDeck accepts valid licenses and rejects bad ones. |
| Secure download | Purchase produces a time-bound download path, not a permanent public URL. |
| macOS trust | The `.dmg` is signed and notarized with Developer ID. |
| Evidence | SHA-256, validation logs, and release notes are saved. |
| Support | Customer install/activation instructions exist and are linked in receipt/download flow. |

## References

[1]: https://developer.apple.com/macos/distribution/ "Apple Developer — Distributing software for macOS"
[2]: https://www.electron.build/code-signing-mac "Electron Builder — Code Signing macOS"

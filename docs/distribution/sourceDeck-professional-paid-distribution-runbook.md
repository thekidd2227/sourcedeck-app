# SourceDeck Professional Paid Distribution Runbook

## Executive Decision

SourceDeck will use **signed and notarized macOS builds distributed outside the Apple App Store** as the professional customer release path. The fastest A+ commercial stack is **Lemon Squeezy Checkout + Lemon Squeezy license keys + GitHub Releases/Cloudflare R2 download hosting**, with Apple Developer ID signing and notarization applied to every public macOS release.

This path keeps SourceDeck independent from the App Store while removing the unprofessional customer friction caused by unsigned apps. Apple’s macOS distribution guidance confirms that apps can be distributed outside the Mac App Store, but Gatekeeper checks for a **Developer ID certificate**, and notarization gives users more confidence that the software has been checked by Apple before distribution.[^apple-macos-distribution]

## Plain-English System Design

The customer should never receive a random zip file manually sent by email. The customer should pay, receive a license, download a trusted installer, activate the app, and receive future updates through a controlled release channel.

| Layer | Decision | Reason |
|---|---|---|
| Checkout | Lemon Squeezy | Fastest professional launch because checkout, tax handling, digital product delivery, webhooks, and license keys can live in one vendor. |
| License keys | Lemon Squeezy License API | Native license activation and validation avoids building a custom licensing backend for v1. |
| Mac package | Signed and notarized `.dmg` plus `.zip` | `.dmg` is the clean customer install experience; `.zip` supports updater flows. |
| Release hosting | `thekidd2227/sourcedeck-releases` first, Cloudflare R2 later | Existing electron-builder publish target already points to GitHub Releases; R2 can become the private download layer when gated downloads are required. |
| App activation | License key required after install | Prevents unpaid redistribution from becoming the default customer path. |
| Updates | `electron-updater` with signed GitHub releases | Repo already includes `electron-updater`; paid-license enforcement should gate usage, not break secure update delivery. |
| Support evidence | Release evidence bundle per build | Every paid release needs hashes, signing status, notarization status, smoke results, and forbidden-token scan output. |

## Customer Journey

1. Customer buys SourceDeck through a Lemon Squeezy checkout page.
2. Lemon Squeezy generates or assigns a license key for the purchased product.
3. Customer receives a branded purchase confirmation with the download link and license key.
4. Customer downloads the signed/notarized SourceDeck macOS `.dmg`.
5. Customer installs and opens SourceDeck without unsafe Gatekeeper friction.
6. On first launch, SourceDeck asks for the license key.
7. SourceDeck activates the license against the Lemon Squeezy License API.
8. SourceDeck stores a local activation record and periodically validates license status.
9. Future releases are published as signed/notarized builds and delivered through the update channel.

## Release Baseline Already Completed

The repository release baseline has been updated so SourceDeck’s macOS build configuration has `notarize: true` under the electron-builder `mac` configuration. This means the product is now intentionally pointed toward the professional release path.

| Baseline Item | Current State |
|---|---|
| PR #158 GovCon upload ownership fix | Merged into `main`. |
| Automatic SAM.gov package downloading | Removed from the Buyer Trial path. |
| macOS hardened runtime | Enabled. |
| macOS notarization flag | Enabled. |
| GitHub release publishing target | `thekidd2227/sourcedeck-releases`. |
| Local Apple secrets | Not committed and should never be committed. |

## Required Secrets and Accounts

The following values must be configured outside the repository. They belong in the local release machine keychain, GitHub Actions secrets, or the selected deployment platform’s secret store.

| Secret / Account | Required For | Storage Rule |
|---|---|---|
| Apple Developer Program membership | Developer ID certificate and notarization | Account-level setup, not repo data. |
| Developer ID Application certificate | macOS app signing | Local keychain or CI certificate secret only. |
| Apple notarization credentials | Uploading build to Apple notarization service | CI/local secret only. |
| Lemon Squeezy store | Checkout and license creation | Vendor account configuration. |
| Lemon Squeezy product and variant IDs | Mapping purchases to SourceDeck entitlements | Environment variables or config file excluded from git. |
| Lemon Squeezy license API key | Server-side license operations if needed | Server-side only; never ship privileged API keys in the app. |
| Lemon Squeezy webhook signing secret | Validating webhook authenticity | Server-side secret only. |
| GitHub release token | Publishing signed build artifacts | GitHub Actions secret or local env variable. |

## License Enforcement Model

The app should never contain a privileged Lemon Squeezy API key. The desktop app may call the public Lemon Squeezy license activation/validation endpoints using the customer’s license key and instance ID, but any privileged fulfillment, download gating, refund handling, or entitlement mutation must happen server-side.

| Event | System Behavior |
|---|---|
| First launch without license | Show activation screen with license key input. |
| Valid license activation | Store license key fingerprint, activation ID/instance ID, product tier, and validation timestamp locally. |
| Invalid license | Keep the app locked behind activation. |
| License expired/cancelled/refunded | Move app to read-only or locked mode after grace period. |
| Offline user | Allow a limited grace period based on last successful validation. |
| New machine | Require a new activation according to allowed activation limit. |

## Minimum A+ Launch Gates

A SourceDeck customer release is not ready unless every item below passes.

| Gate | Required Result |
|---|---|
| `npm run govcon:smoke` | Pass. |
| `npm run troubleshooting:scan` | 0 fail, 0 warn, manual items documented. |
| `npm run release:check` | Pass or only expected signing-secret warnings before final signed build. |
| macOS signing readiness | Pass on the machine/CI runner producing the customer build. |
| Signed `.dmg` build | Produced successfully. |
| Apple notarization | Accepted and stapled where applicable. |
| ASAR forbidden-token scan | Pass for removed SAM.gov download strings. |
| Hash evidence | SHA-256 recorded for every distributed artifact. |
| License checkout test | Test purchase generates usable license key. |
| Activation test | Fresh install activates with test key and rejects bad key. |
| Refund/cancel test | Refunded/cancelled license is blocked or downgraded. |
| Update test | Existing licensed install updates to the new signed build. |

## Immediate Implementation Sequence

| Step | Owner | Output |
|---|---|---|
| 1 | ARCG/SourceDeck | Keep `notarize: true` on `main`; do not revert it. |
| 2 | ARCG/SourceDeck | Create Apple Developer account access and Developer ID Application certificate. |
| 3 | ARCG/SourceDeck | Create Lemon Squeezy store, product, variant, license key policy, and checkout page. |
| 4 | Engineering | Add SourceDeck license activation screen and local license state. |
| 5 | Engineering | Add release evidence command that records signing, notarization, artifact hashes, and license test result. |
| 6 | Engineering | Run first end-to-end test purchase using Lemon Squeezy test mode. |
| 7 | Engineering | Publish first signed/notarized release candidate to the release channel. |
| 8 | ARCG/SourceDeck | Send controlled buyer download link only after purchase/license creation path is verified. |

## Pricing and Packaging Recommendation

SourceDeck should not launch as a low-price utility. It is operational infrastructure for GovCon execution, not a commodity download. The cleanest first commercial path is a controlled paid pilot with annual licensing.

| Package | Recommended Price | Included |
|---|---:|---|
| SourceDeck GovCon Solo | $997/year | One user, one device activation, core GovCon workspace, manual upload workflow, updates. |
| SourceDeck GovCon Team | $2,997/year | Three users/devices, shared operating process, onboarding session, priority support. |
| SourceDeck GovCon Deployment | $7,500+ setup + annual license | Implementation support, workflow configuration, vendor coordination structure, custom operating model. |

## Security Rules

No Apple signing credential, Lemon Squeezy secret, GitHub token, Stripe key, webhook secret, or privileged license key may be committed to the repository. Customer license validation must be auditable, revocable, and independent of manual email delivery.

## Sources

[^apple-macos-distribution]: Apple Developer, “Distributing software on macOS,” https://developer.apple.com/macos/distribution/.

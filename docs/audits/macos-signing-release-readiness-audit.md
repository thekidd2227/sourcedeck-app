# macOS Signing & Release Packaging — Pre-Repair Audit (Phase 17A)

Read-only audit before adding the deterministic readiness diagnostic.
This phase does not require live Apple credentials.

## Current packaging config

- electron-builder is configured **inside `package.json`** (`build` field).
  There is no separate `electron-builder.yml` / `electron-builder.json`
  / `builder-effective-config.yaml` file in the repo.
- `package.json.build.mac`:
  - `hardenedRuntime: true`
  - `gatekeeperAssess: false`
  - `entitlements: build/entitlements.mac.plist`
  - `entitlementsInherit: build/entitlements.mac.plist`
  - **`notarize: false`** (must be flipped to `true` to actually notarize)
  - targets: dmg + zip on x64 + arm64
- `build/entitlements.mac.plist` is present and minimal
  (`com.apple.security.cs.allow-jit`,
   `…allow-unsigned-executable-memory`,
   `…cs.disable-library-validation`).
- npm scripts:
  - `pack:mac` → `electron-builder --mac --dir` (unsigned dev pack)
  - `build:mac` → `electron-builder --mac`
  - `release` → `electron-builder --mac --win --publish always`
  - `release:check` → `node scripts/release-check.js`

## Current signing / notarization expectations

`scripts/release-check.js` already reads, by presence only:

- **Signing** — `CSC_LINK`, `CSC_KEY_PASSWORD`
- **Notarization** — `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
  `APPLE_TEAM_ID`

On `--publish`, `release-check` fails if any of these are missing. With
no flag, it only logs presence, warns if `dist/mac/SourceDeck.app` is
unsigned, and continues.

## Current release-check warning

In a local dev environment with no Apple credentials and an unsigned
`dist/mac/SourceDeck.app`, the run prints:

```
[release-check] WARN: codesign verify failed (artifact is unsigned or improperly signed)
[release-check] WARN: /…/dist/mac/SourceDeck.app: code object is not signed at all
```

…and exits 0. This warning is the standing OPEN-issue **REL-020 /
WX-005** carry-over: it is **expected** in local dev and must not block
the daily troubleshooting agent.

## Required Apple-side env (production)

Names only — no values are stored or read into the report:

| Purpose | Required env var |
|---|---|
| Signing (electron-builder) | `CSC_LINK`, `CSC_KEY_PASSWORD` |
| Notarization (apple) | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |
| Packaging flag in `package.json` | `build.mac.notarize` must be `true` |
| Optional alternatives (acceptable) | `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` (App Store Connect API key) |

These names are read by **`process.env` in the main process / CI only**.
Renderer never sees them.

## Acceptable vs blocking warnings

| Warning | Local dev | Public release |
|---|---|---|
| Unsigned `dist/mac/SourceDeck.app` | acceptable | **BLOCK** |
| Missing `CSC_LINK` / `CSC_KEY_PASSWORD` | acceptable | **BLOCK** |
| Missing Apple notarization env | acceptable | **BLOCK** |
| `package.json build.mac.notarize: false` | acceptable | **BLOCK** |
| Missing `build/entitlements.mac.plist` | **BLOCK both** | **BLOCK** |
| Missing app icon | acceptable | **BLOCK** |

## Manual production-signing steps (operator)

1. Place the signing identity p12 and its password into the local
   keychain (or set `CSC_LINK` to a base64 of the p12, with
   `CSC_KEY_PASSWORD`).
2. Set Apple notarization env (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
   `APPLE_TEAM_ID`) — or an App Store Connect API key.
3. Flip `"notarize": true` in `package.json` `build.mac`.
4. Run `npm run release:mac-signing-readiness:strict` (Phase 17A) and
   confirm `ready_to_sign`.
5. Build + publish: `npm run build:mac` then `npm run release:check
   --publish` to verify gates.
6. Capture the signed artifact's `codesign --verify --deep` output as
   evidence and revert `notarize` back to `false` after the release
   if desired.

## Target repair (Phase 17A)

Add deterministic, **secrets-free** readiness diagnostics:

1. `services/release/macos-signing-readiness.js` — presence-only env
   status, validate config, classify, redact, format, remediation.
2. `scripts/macos-signing-readiness.js` — CLI with `--json`,
   `--strict`. Exit 0 in local dev unless `--strict`; exit 1 under
   `--strict` if production signing env is missing.
3. Update `scripts/release-check.js` warning text to point at the new
   readiness script; do not fail local dev.
4. Refine REL-020 in the troubleshooting agent to point at
   `npm run release:mac-signing-readiness` and remain `MANUAL` in
   local dev (no Apple env required for daily CI to pass).
5. Tests + KB + release-notes + signing manual.

### Stable classification codes

- `ready_to_sign` — signing env + notarize env + `notarize:true` all
  present; entitlements file exists; icon exists.
- `partial_signing` — signing env present but notarize env absent.
- `blocked_notarize_off` — env present but `package.json notarize:false`.
- `blocked_missing_signing` — strict/public release, no signing env.
- `blocked_missing_entitlements` — entitlements file or icon missing.
- `unsigned_dev_ok` — local dev with no credentials; non-blocking.
- `unknown` — unable to determine.

### Non-goals (this phase)

- No live signing run.
- No Apple credentials added; no `.env.local` written.
- No claim that the app is signed/notarized.
- No dependency added (pure Node, presence-only).

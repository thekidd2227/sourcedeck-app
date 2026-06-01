# macOS Signing & Notarization — Operator Manual

This document tells a release operator how to take a public-release
build of SourceDeck through Apple signing + notarization. It does NOT
contain any credentials and does NOT enable signing in this repo.

## Required Apple-side artifacts (operator provides, locally)

- A valid **Developer ID Application** certificate from Apple, exported
  as a `.p12` with a password.
- An Apple Developer account with an **app-specific password** for the
  signing identity, or an **App Store Connect API key**.
- The team's **Apple Team ID**.

These are never stored in the repo.

## Required environment variables

Set BOTH the signing pair and one of the two notarization paths.

**Signing (electron-builder reads these):**

```
CSC_LINK=<file:// path to your .p12 OR base64 data: URL of the .p12>
CSC_KEY_PASSWORD=<password for the .p12>
```

**Notarization — option A (Apple ID + app-specific password):**

```
APPLE_ID=<your apple id email>
APPLE_APP_SPECIFIC_PASSWORD=<app-specific password>
APPLE_TEAM_ID=<your team id>
```

**Notarization — option B (App Store Connect API key):**

```
APPLE_API_KEY=<path or content of the AuthKey_*.p8 file>
APPLE_API_KEY_ID=<key id>
APPLE_API_ISSUER=<issuer id>
```

**Packaging flag:** flip `package.json` `build.mac.notarize` from
`false` to `true` for the release build, then revert if desired.

## Step-by-step release process

1. From a clean working tree on `main`, run:

   ```
   npm install
   npm test
   npm run troubleshooting:scan
   ```

2. Verify readiness **without** strict mode first (sanity-check the repo
   state):

   ```
   npm run release:mac-signing-readiness
   ```

   Expected: `unsigned_dev_ok` and a non-blocking message.

3. From the signing environment with all envs above set and
   `notarize: true` in `package.json`, run:

   ```
   npm run release:mac-signing-readiness:strict
   ```

   Required: status must be `ready_to_sign` and the CLI must exit `0`.
   If it exits `1`, fix the named missing env(s) or packaging file
   before continuing.

4. Build the macOS artifact:

   ```
   npm run build:mac
   ```

5. Verify the produced artifact:

   ```
   node scripts/release-check.js
   codesign --verify --deep --strict --verbose=2 dist/mac/SourceDeck.app
   spctl --assess --type execute --verbose dist/mac/SourceDeck.app
   xcrun stapler validate dist/mac/SourceDeck.app
   ```

   Expected: `codesign verify: PASS`, `accepted`, `Validated`.

6. Publish (only after steps 1–5 pass):

   ```
   node scripts/release-check.js --publish
   npm run release
   ```

7. Capture evidence in `reports/troubleshooting/` and update
   `docs/troubleshooting-knowledge-base/open-issues.md` REL-020 from
   `MANUAL` to `RESOLVED` for this release.

## Public-release rule

**Do not publish an unsigned macOS build.** The
`scripts/macos-signing-readiness.js --strict` exit code is the gate;
the troubleshooting agent's REL-020 finding remains `MANUAL` outside a
signing environment to keep daily CI green, but a public release MUST
have an in-environment strict pass and a real codesign verify.

## Common failure modes

- `blocked_missing_signing` — set `CSC_LINK` + `CSC_KEY_PASSWORD` and
  the chosen notarization triple.
- `blocked_notarize_off` — env present but `package.json` `notarize`
  is still `false`. Flip it for the release build.
- `blocked_missing_entitlements` — `build/entitlements.mac.plist`
  and/or `build/icon.icns` is missing. Restore from history.
- `partial_signing` — only signing or only notarization env is set;
  add the other.

## What this app will NOT do

- Will not store Apple credentials in the repo or `.env`.
- Will not auto-flip `notarize` to `true`.
- Will not claim the app is publicly signed/notarized in marketing
  copy until a real signed run is captured as evidence.
- Will not invoke `codesign` from the readiness CLI (the existing
  `scripts/release-check.js` does that, only when an artifact exists).

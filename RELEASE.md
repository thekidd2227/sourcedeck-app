# SourceDeck — release / packaging notes

This file documents what is required to cut a real signed + notarized
release of SourceDeck. It is honest about what does and does not happen
out of the box.

## What the dev pack proves vs. what a real release proves

| Command                | Signed | Notarized | Distributable |
|------------------------|--------|-----------|---------------|
| `npm run pack:mac`     | no     | no        | local/dev only |
| `npm run build:mac`    | only if `CSC_*` env present | only if `APPLE_*` env present *and* `mac.notarize: true` | only when both above are true |
| `npm run release`      | required | required | yes |

`npm run pack:mac` produces an unsigned `dist/mac/SourceDeck.app`. It
runs on the developer's machine and is suitable for local QA. It is
**not** distributable — Gatekeeper will refuse to launch it on another
Mac without the user manually right-click → Open.

## macOS signing

electron-builder reads:

| env var               | purpose                                       |
|-----------------------|-----------------------------------------------|
| `CSC_LINK`            | path or base64 of the Developer ID `.p12`     |
| `CSC_KEY_PASSWORD`    | password protecting that `.p12`               |

The `mac.hardenedRuntime: true` + `mac.entitlements` config in
`package.json` is already wired (the hardened runtime is required by
notarization). The entitlements live in
[build/entitlements.mac.plist](build/entitlements.mac.plist) — keep
that list minimal.

## macOS notarization

Notarization is **off by default** (`mac.notarize: false` in
`package.json`). To turn it on for a real release:

1. Set `mac.notarize` to `true` in `package.json`.
2. Export:
   ```
   APPLE_ID=<your apple id email>
   APPLE_APP_SPECIFIC_PASSWORD=<app-specific password from appleid.apple.com>
   APPLE_TEAM_ID=<10-char team id>
   ```
3. Run `npm run build:mac` (or `npm run release`).

`scripts/release-check.js` (`npm run release:check`) verifies the env
is present, the packaged asar contains the required files, and runs
`codesign --verify` against the .app. Run it before publishing — it
refuses to claim a publishable build when any prerequisite is missing.

## What this commit does NOT do

- It does **not** sign or notarize anything. No Apple credentials were
  used.
- It does **not** flip `mac.notarize` to `true`. That's a deliberate
  call by whoever owns the signing identity, and only after the env
  vars above are wired into the CI runner's secrets.
- It does **not** add a Windows code-signing config. Windows signing is
  out of scope for this pass.

## Verifying a packaged build locally

```
npm run pack:mac      # build
npm run release:check # validate the artifact
```

`release:check` will:
- list `app.asar` and confirm `main.js`, `preload.js`,
  `sourcedeck.html`, and `chartnav-integration.js` are all packed
- run `codesign --verify --deep --strict` and report PASS/FAIL
  honestly (a dev pack will fail; a real signed build will pass)
- refuse `--publish` unless all signing + notarization env is present

## Release artifacts

`mac.target` produces:
- `SourceDeck-macOS-x64.dmg`
- `SourceDeck-macOS-arm64.dmg`
- A matching `.zip` for each arch (electron-updater consumes the zip)

`win.target` produces `SourceDeck-Windows-Setup.exe` (NSIS).

`publish.provider: github` writes them to the
`thekidd2227/sourcedeck-releases` repo.

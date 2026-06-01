# Release Artifact Evidence Capture — Pre-Build Audit (Phase 17B)

Read-only audit before adding the deterministic, **secrets-free**
release-evidence module.

## Current packaging scripts (package.json)

- `pack:mac` → `electron-builder --mac --dir` (unsigned dev pack)
- `build:mac` / `build:win` / `build:all` → `electron-builder` builds
- `release` → `electron-builder --mac --win --publish always` (NOT run
  in this phase)
- `prerelease` → `node scripts/release-check.js`
- `release:check` → `node scripts/release-check.js`
- `release:mac-signing-readiness*` → Phase 17A diagnostic CLIs

## Existing artifact paths

- `dist/mac/SourceDeck.app/Contents/Resources/app.asar` — produced by
  `pack:mac` or `build:mac`. Currently UNSIGNED in local dev.
- `dist/builder-debug.yml` — electron-builder debug log.
- `dist/_app_pack/` — unpacked debris (gitignored).
- `release/mac/`, `release/win/` — final distributable artifacts when
  built (gitignored).
- `build/entitlements.mac.plist`, `build/icon.icns`,
  `build/icon-1024.png`, `build/icon.ico`, `build/icon.png`,
  `build/icons.iconset/`.

## Evidence that already exists

- `reports/troubleshooting/<YYYY-MM-DD>-troubleshooting-report.md` /
  `.json` (Phase 16A; gitignored).
- `reports/troubleshooting/latest-troubleshooting-report.md` / `.json`.
- Phase 17A `release:mac-signing-readiness` / `:json` / `:strict` CLI
  output (not written to disk by default — printed to stdout).
- `scripts/release-check.js` stdout (privacy gate + signing env
  presence + asar check + codesign verify).

## Evidence that is missing today

- A single **release-evidence bundle** combining git state, package
  metadata, build config, asar metadata, signing readiness,
  release-check summary, troubleshooting summary, and gate results
  in one report file.
- A repeatable CLI to produce it.
- A workflow-dispatch-only CI workflow to capture it as a build
  artifact.
- A troubleshooting agent finding that surfaces "no evidence captured
  yet" as MANUAL/WARN (not FAIL).

## What can be captured WITHOUT Apple credentials

- Git branch / commit / dirty flag.
- `package.json` `version`, `productName`, `appId`, `build.files`,
  `build.mac.notarize` flag, hardenedRuntime flag, entitlements path,
  icon paths.
- `dist/mac/SourceDeck.app/Contents/Resources/app.asar` presence +
  required-files listing (via `node_modules/.bin/asar list`).
- `services/release/macos-signing-readiness.js` evidence (dev mode
  always; strict mode optional and explicitly blocking).
- `scripts/release-check.js` final exit + WARN list.
- The most-recent `reports/troubleshooting/latest-troubleshooting-report.{md,json}`
  paths + summary counts.
- Pass/fail status for `npm test`, `govcon:smoke`, `govcon:outreach-os:audit`,
  `phase13:rc-check`, `i18n:audit`, `troubleshooting:email-dry-run`.

## What requires future Apple credentials (NOT this phase)

- `codesign --verify --deep --strict` PASS.
- `spctl --assess --type execute` PASS.
- `xcrun stapler validate` PASS.
- `package.json build.mac.notarize: true`.
- Apple developer cert/team identifiers in evidence (presence flag
  only; values redacted).

## Evidence bundle structure (target)

```
{
  generatedAt: ISO8601,
  module: 'release-evidence',
  rootDir: <abs>,
  git: { branch, commit, dirty },
  package: { name, version, productName, appId, mac: {
              notarize, hardenedRuntime, entitlements, icon, targets } },
  asar: { present, path, requiredFiles: { ok, missing[] } },
  signing: <readiness report from services/release/macos-signing-readiness.js>,
  troubleshooting: { latestMarkdown, latestJson, summary?: <counts> },
  gates: { test: {ran, ok}, govcon:smoke: {...}, ... },
  releaseCheck: { ok, warnings[] },
  state: <one of the 7 stable evidence states>,
  warnings: [],
  blockers: [],
  note: 'Presence-only; no secrets included.'
}
```

### Seven stable evidence states

- `local_unsigned_dev` — dev artifact present unsigned; signing not
  configured; gates pass.
- `signing_ready` — strict signing readiness `ready_to_sign`; artifact
  not yet built.
- `signing_blocked_missing_credentials` — strict requested and
  blocked_missing_signing.
- `no_packaged_artifact` — no `dist/mac/SourceDeck.app` present.
- `packaged_unsigned` — artifact present but unsigned.
- `packaged_signed_unverified` — artifact present, codesign verify
  could not run or did not pass yet.
- `packaged_signed_verified` — artifact present + codesign verify PASS.

## Manual warnings carried forward

- WX-005 / OPEN-002 partial fix (IBM-side action still required).
- REL-020 macOS signing manual outside a signing environment.
- macOS unsigned dev artifact WARN (clarified in Phase 17A).

## Non-goals (Phase 17B)

- No live signing/notarization run.
- No Apple credentials added.
- No `package.json build.mac.notarize` flip.
- No publishing.
- No external upload (GitHub Actions artifact upload is allowed; nothing
  else).
- No new dependency.
- No claim that the app is signed/notarized.

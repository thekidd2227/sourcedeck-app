# SourceDeck — Desktop Release Output

This folder is the local landing zone for built artifacts before they are published to GitHub Releases.

## Layout

```
release/
├── mac/       → .dmg + .zip + .blockmap + latest-mac.yml (electron-builder output)
├── win/       → .exe (NSIS installer) + .blockmap + latest.yml (built on Windows / CI)
└── notes/     → per-version release notes (vX.Y.Z.md)
```

## Local build

```bash
cd "~/Desktop/ARCG/ARCG Systems/Projects/sourcedeck-app"
npm run build:mac     # produces mac artifacts in dist/ → move to release/mac/
npm run build:win     # requires Windows (or Wine+Mono) — prefer CI
```

After a local build, artifacts live in `dist/` until published or moved. `.gitignore` keeps `dist/` out of git.

## Published releases

Releases are hosted at:

https://github.com/thekidd2227/sourcedeck-releases/releases

Tagged `vMAJOR.MINOR.PATCH` (SemVer). Pushing a tag `v*` to `thekidd2227/sourcedeck-app` triggers `.github/workflows/build-release.yml` which builds macOS + Windows on runners, publishes to the `sourcedeck-releases` repo via `electron-builder --publish always`, and attaches installers to the matching GitHub Release.

## Release flow (repeatable)

```bash
# 1. bump version in package.json
npm version patch   # or minor / major

# 2. commit the bump (npm version already commits)
git push origin main

# 3. push the tag — triggers CI
git push origin --tags

# 4. CI builds mac + win on GitHub Actions and publishes to sourcedeck-releases
```

## Manual fallback (no CI)

If CI is unavailable, run `npm run build:mac` locally, run `npm run build:win` on a Windows machine, then manually upload the artifacts from `release/mac/` and `release/win/` to a new GitHub Release in `thekidd2227/sourcedeck-releases`.

## Secrets required for CI

| Secret | Purpose |
|---|---|
| `GH_TOKEN` | GitHub PAT with `repo` scope. Used by `electron-builder` to publish releases and by the workflow to attach assets. Store in repo Settings → Secrets → Actions. |

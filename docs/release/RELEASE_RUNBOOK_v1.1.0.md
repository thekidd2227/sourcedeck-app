# v1.1.0 — Release runbook (5 minutes, from your Mac)

All code changes, gate, tests, CI workflow, release notes, and version
bump are already on disk and staged in git. The final push + revocation
steps must run from your machine because the sandbox has no push creds
and no `gh` CLI.

## 0. Prerequisites on your Mac

```bash
cd ~/sourcedeck-app
# Ensure gh is installed + authenticated to thekidd2227:
which gh || brew install gh
gh auth status   # if not authed: gh auth login
```

## 1. Clear the stale lockfile (sandbox left one behind)

```bash
rm -f ~/sourcedeck-app/.git/index.lock
```

## 2. Confirm the staged set matches what I prepared

```bash
cd ~/sourcedeck-app
git status --short
git diff --cached --name-only
```

Expect exactly these 13 files staged (nothing else):

```
.github/workflows/build-release.yml
.gitignore
demo/fixtures.json
docs/release/privacy-first-run-verification.md
main.js
package.json
release/README.md
release/notes/v1.0.0.md
release/notes/v1.1.0.md
scripts/release-check.js
sourcedeck.html
test/clinical-capability.test.js
test/first-run-safety.test.js
```

Explicitly **not** staged (verified during prep):

- `marketing-capture/**` (gitignored)
- `dist/**` (gitignored)
- `release/mac/SourceDeck.app/**` (gitignored)
- `sourcedeck-site-zone.txt` (gitignored)

## 3. Run the gate one more time on your machine

```bash
npm install           # only if node_modules is stale
npm run release:check # must print: privacy gate: ✓ no owner strings ...
npm test              # must print: 18 / 33 / 7 passed, 0 failed
```

If either fails, STOP. Do not push. Re-open
`docs/release/privacy-first-run-verification.md` and fix before tagging.

## 4. Commit

```bash
git config user.name  "$(git config --global user.name)"   # inherit identity
git config user.email "$(git config --global user.email)"

git commit -m "privacy: scrub owner data from shipped app; add release-blocking gate; v1.1.0

Release-blocking defect fix. v1.0.0 shipped with developer-authored
content (real leads, real emails, real phones, owner branding). v1.1.0
ships a blank/neutral first-run, adds a release-blocking privacy gate
to CI, and moves demo data to an opt-in fixture outside the package.

See docs/release/privacy-first-run-verification.md for full detail.
Supersedes v1.0.0. Upgrade immediately."
```

## 5. Push the commit

```bash
git push origin main
```

## 6. Tag v1.1.0 — triggers the CI build + publish

```bash
git tag -a v1.1.0 -m "SourceDeck 1.1.0 — privacy repair (supersedes v1.0.0)"
git push origin v1.1.0
```

Watch CI:

```bash
gh run watch --repo thekidd2227/sourcedeck-app
```

The workflow now runs a **gate job** (privacy gate + all tests on
Ubuntu) before any platform builds. If the gate fails, no artifact is
produced and nothing is published. On success, macOS and Windows builds
run in parallel and publish via `electron-builder --publish always` to
`thekidd2227/sourcedeck-releases`.

## 7. Revoke / supersede v1.0.0 in sourcedeck-releases

Pick one of the two options below. Option A is stronger.

### Option A — delete the v1.0.0 release and tag

```bash
# Check what's currently published
gh release view v1.0.0 --repo thekidd2227/sourcedeck-releases

# Remove all assets + the release entry
gh release delete v1.0.0 --repo thekidd2227/sourcedeck-releases --yes

# Delete the tag so nothing can re-reference the bad commit
gh api -X DELETE repos/thekidd2227/sourcedeck-releases/git/refs/tags/v1.0.0
```

Downstream effect: anyone hitting the v1.0.0 download URL gets a 404.
The auto-updater on existing v1.0.0 installs will see v1.1.0 in
`latest-mac.yml` / `latest.yml` and prompt to upgrade.

### Option B — keep v1.0.0 entry but mark it as withdrawn

```bash
gh release edit v1.0.0 --repo thekidd2227/sourcedeck-releases \
  --prerelease \
  --notes-file release/notes/v1.0.0.md   # contains the WITHDRAWN banner
```

This preserves the release page for historical reference but flags it as
pre-release (so the auto-updater ignores it) and shows the withdrawn
banner at the top of the notes.

**Also delete the binary assets so no one can re-download them:**

```bash
gh release view v1.0.0 --repo thekidd2227/sourcedeck-releases --json assets --jq '.assets[].name' | \
  while read asset; do
    gh release delete-asset v1.0.0 "$asset" --repo thekidd2227/sourcedeck-releases --yes
  done
```

I recommend **Option A** unless you have a specific need to keep the
release page as evidence of the incident. Option A is cleaner for users.

## 8. Verify

```bash
# The new release exists and points to the repaired build
gh release view v1.1.0 --repo thekidd2227/sourcedeck-releases

# The old one is gone (Option A) or has no assets (Option B)
gh release view v1.0.0 --repo thekidd2227/sourcedeck-releases || echo "v1.0.0 removed"

# Pull the new DMG and string-scan for owner data
curl -sL "$(gh release view v1.1.0 --repo thekidd2227/sourcedeck-releases --json assets --jq '.assets[] | select(.name | endswith("arm64.dmg")) | .url')" -o /tmp/sd-v1.1.0.dmg
hdiutil attach /tmp/sd-v1.1.0.dmg -mountpoint /tmp/sd-mount -nobrowse
ASAR="/tmp/sd-mount/SourceDeck.app/Contents/Resources/app.asar"
for s in "ARCG Systems" "arcgsystems.com" "arivergroup" "Jean-Max" "Maxwell-Kates" "Riverbay" "charlie@digi"; do
  c=$(grep -ac "$s" "$ASAR")
  printf "  %-22s %s\n" "$s" "$c"
done
hdiutil detach /tmp/sd-mount
```

Expect every count to be `0`.

## 9. Announce (optional)

If v1.0.0 was circulated beyond internal testing, send a short upgrade
notice. Template:

> SourceDeck v1.0.0 has been withdrawn due to a packaging defect that
> embedded developer-authored sample data. v1.1.0 ships a clean,
> privacy-safe first-run experience and is available now at
> https://github.com/thekidd2227/sourcedeck-releases/releases/tag/v1.1.0
> Upgrade from within the app (auto-updater) or re-download the
> installer. Details: [link to docs/release/privacy-first-run-verification.md]

## Rollback

If v1.1.0 has a functional regression (unrelated to privacy), the
release-blocking gate still lets you ship a v1.1.1 patch — it only
blocks privacy regressions, not functional changes. To revert to a
functional v1.0.x artifact is NOT an option: v1.0.0 is withdrawn for
privacy reasons and must not be redistributed.

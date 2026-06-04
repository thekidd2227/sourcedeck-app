# Phase 23E — Signed Demo Build Readiness

**Release date:** 2026-06-04
**Branch:** `ci/phase-23e-signed-demo-build-readiness`

## What's new

Phase 23E adds a controlled GitHub Actions workflow for producing a
**signed-demo candidate** macOS build for internal review. The
workflow is manual-only (`workflow_dispatch`), uses GitHub repository
secrets, never auto-publishes, and clearly labels its output so the
artifact cannot be mistaken for a public release.

### `.github/workflows/signed-demo-build.yml`

- Trigger: `workflow_dispatch` only. No `push`, no `pull_request`,
  no `schedule`, no `release`.
- Requires an explicit operator confirmation input:
  `confirm_internal_review_only: "internal-review"`.
- Token: `permissions: contents: read` — workflow lacks the
  `contents: write` permission required by the GitHub Releases API,
  so even if some future step tried to publish a Release, it would
  be rejected.
- Pre-build gate (Linux runner):
  1. `npm ci`
  2. `npm test`
  3. `node scripts/release-check.js`
  4. `npm run release:mac-signing-readiness:strict`
  5. Boolean-only secret-presence check via
     `${{ secrets.X != '' }}`. No value is ever echoed.
- Build (macOS runner, only when every required secret is present):
  1. `npm ci`
  2. `node scripts/release-check.js` (defense-in-depth privacy gate)
  3. `npx electron-builder --mac` — **no `--publish`.**
  4. `node scripts/release-check.js` (post-build codesign verify)
  5. `npm run release:evidence:strict`
- Artifact: `actions/upload-artifact@v4` named
  `signed-demo-candidate-mac-<run_id>` plus a separate
  `signed-demo-candidate-evidence-<run_id>` for the report. 7-day
  retention. **No public release is published.**

### Required GitHub repository secrets

| Secret | Used by |
| --- | --- |
| `CSC_LINK` | electron-builder code-signing |
| `CSC_KEY_PASSWORD` | electron-builder code-signing |
| `APPLE_ID` | electron-builder notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | electron-builder notarization |
| `APPLE_TEAM_ID` | electron-builder notarization |

These are the same names already consumed by the privacy /
release-check gate and the signing-readiness CLI.

If any of the five is missing, the workflow short-circuits at the
gate job and the build job is skipped — no unsigned artifact is
produced and no signed-demo candidate is mislabeled.

## Verification chain (required before any "signed" claim)

A successful run produces a candidate, not a verdict. **All of the
following gates must pass** before that artifact may be described as
"signed and notarized":

1. `npm run release:mac-signing-readiness:strict` exits 0.
2. `npx electron-builder --mac` completes with all five secrets
   populated.
3. `node scripts/release-check.js` passes (no privacy-gate failure;
   no "code object is not signed at all" warning).
4. `codesign --verify --deep --strict --verbose=2` reports valid +
   satisfies its Designated Requirement.
5. `spctl --assess --type execute --verbose=4` accepts.
6. `stapler validate` reports validated.
7. `npm run release:evidence:strict` writes a report that includes
   signed-verified status.

Until **every** gate passes for a specific artifact, the only
permitted language is "signed-demo candidate".

## What did not change

- `sourcedeck.html` — not modified.
- `services/release/macos-signing-readiness.js` — not modified.
- `scripts/release-check.js` — not modified.
- `scripts/release-evidence.js` — not modified.
- `.github/workflows/build-release.yml` (the publish-on-tag path) —
  not modified. Phase 23E is a separate, manual path.
- Every Phase 22B-22F GovCon workflow surface — intact.
- Phase 23A Demo Mode, 23B GovCon Mode indicator, 23C primary nav +
  Show All Tools toggle, 23D Markdown export + Last Updated chips —
  all intact.
- Phase 21F removed System Readiness / System Flow tab — remains
  removed.
- Response Desk draft-only posture, SAM Sprint Free=1 NAICS — both
  preserved.

## Safety boundaries (unchanged)

- **Internal review only. No public release.** The workflow is
  strictly `workflow_dispatch`, uploads to a workflow-scoped
  artifact, and never calls `--publish`.
- **No secrets committed.** Every secret is referenced via
  `${{ secrets.* }}` only. No certificates, keychains, `.env*`,
  `.p12`, `.pem`, `.cer`, or `.mobileprovision` files were added.
- **No false signing/notarization claim.** Phase 23E does not add
  any of: "SourceDeck is signed and notarized", "Apple notarized",
  "Production signed", "Notarized release", "Publicly signed",
  "SourceDeck is signed", "SourceDeck is notarized". These remain
  forbidden until the §verification-chain has been completed for a
  specific artifact.
- **No GovCon runtime behavior changed.** The workflow is purely a
  build-pipeline addition.

## Migration notes

- No data migrations, no schema changes, no new IPC channels.
- Repo collaborators with macOS signing assets must add the five
  required secrets in *Settings → Secrets and variables → Actions*
  before the first manual run.
- The workflow is invoked via the GitHub UI: *Actions → Signed
  Demo Build Readiness → Run workflow* with
  `confirm_internal_review_only = "internal-review"`.

## Verification

- `node test/signed-demo-build-readiness.test.js` — PASS
- `node test/govcon-demo-delivery-polish.test.js` — 26/26 PASS
- `npm test` — all test files PASS
- `npm run release:evidence` — PASS
- `npm run troubleshooting:scan` — PASS
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — PASS
- `node scripts/release-check.js` — PASS *(local-dev signing warn
  only, expected and honest)*

See `docs/audits/phase-23e-signed-demo-build-readiness-audit.md`
for the full audit including the §8 verification-chain detail.

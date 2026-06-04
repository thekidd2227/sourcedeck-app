# Phase 23E — Signed Demo Build Readiness (Audit)

**Date:** 2026-06-04
**Branch:** `ci/phase-23e-signed-demo-build-readiness`
**Workflow:** `.github/workflows/signed-demo-build.yml`

## 1. Why this phase exists

Phase 23D polished the GovCon buyer-demo delivery layer. The next gap
is the *macOS demo build* itself: prior phases left
`scripts/release-check.js` warning **"code object is not signed at
all"** for local-dev artifacts, and the only existing release CI
(`build-release.yml`) is wired to publish public Releases on tag
push. There has been no controlled path for producing a *signed-demo
candidate* for internal review.

Phase 23E adds that path — a strictly-manual GitHub Actions workflow
that uses GitHub secrets only, never auto-publishes, and clearly
labels its output as a "signed-demo candidate" rather than asserting
SourceDeck is signed or notarized.

## 2. Local builds remain unsigned (by design)

The `dist/mac/SourceDeck.app` artifact produced by `npm run pack:mac`
or `npm run build:mac` on a developer workstation continues to be
**unsigned**. `release-check.js` reports that honestly:

```
[release-check] WARN: codesign verify failed (artifact is unsigned or
improperly signed)
[release-check] WARN: /…/dist/mac/SourceDeck.app: code object is not
signed at all
[release-check] macOS signing/notarization not configured in this
environment. Local dev warning only; public release requires
`npm run release:mac-signing-readiness:strict`.
```

Phase 23E does not silence those warnings, does not flip a flag that
makes them go away, and does not modify `scripts/release-check.js` or
`services/release/macos-signing-readiness.js`.

## 3. Signed-demo-build workflow — what it does

`.github/workflows/signed-demo-build.yml`:

| Property | Value |
| --- | --- |
| Trigger | `workflow_dispatch` only — **no** `push`, `pull_request`, `schedule`, or `release` triggers |
| Operator confirmation | `confirm_internal_review_only: "internal-review"` literal input required |
| Token | `permissions: contents: read` (no write to Releases) |
| Concurrency | `phase-23e-signed-demo-build` group, `cancel-in-progress: false` |
| Pre-build gates | `npm ci` → `npm test` → `node scripts/release-check.js` → `npm run release:mac-signing-readiness:strict` |
| Secret presence check | Boolean-only via `${{ secrets.X != '' }}`; no values printed |
| Build | `npx electron-builder --mac` (**NO** `--publish`) |
| Post-build gates | `node scripts/release-check.js` → `npm run release:evidence:strict` |
| Artifact | `actions/upload-artifact@v4` — name `signed-demo-candidate-mac-<run_id>`, retention 7 days |
| Evidence | `actions/upload-artifact@v4` — name `signed-demo-candidate-evidence-<run_id>`, retention 7 days |
| Publish | **None.** Workflow does not call `--publish`, `softprops/action-gh-release`, `actions/create-release`, or `ncipollo/release-action`. |

## 4. No secrets committed

Phase 23E adds no certificates, no keychains, no `.env*` files, no
`.p12`/`.pem`/`.cer`/`.mobileprovision`, no API keys. Every secret is
referenced exclusively through the `${{ secrets.* }}` GitHub Actions
context and passed to `electron-builder` through the process
environment.

**Required GitHub repository secrets** (configure in *Settings →
Secrets and variables → Actions*):

- `CSC_LINK`                      *(signing certificate; base64 .p12 URL or path)*
- `CSC_KEY_PASSWORD`              *(certificate password)*
- `APPLE_ID`                      *(notarization Apple ID)*
- `APPLE_APP_SPECIFIC_PASSWORD`   *(notarization app-specific password)*
- `APPLE_TEAM_ID`                 *(Apple developer team ID)*

These are the same names already consumed by
`scripts/release-check.js` (lines 167-180) and
`services/release/macos-signing-readiness.js` (constants
`SIGNING_ENV` and `NOTARIZE_ENV`).

## 5. How missing secrets fail safely

1. The gate job's **secret-presence step** evaluates
   `secrets.X != ''` for each of the five names. The boolean is
   written to `$GITHUB_OUTPUT` (never a value).
2. If any of the five evaluates to `false`, the step emits a
   `::warning::` and sets `have_signing_secrets=false`.
3. The build job declares `if: needs.gate.outputs.have_signing_secrets == 'true'`.
   With any secret missing, the build job is **skipped entirely** —
   no macOS runner is provisioned, no signed-demo candidate is
   produced.
4. As a defense-in-depth check, the build job's **first step** also
   re-evaluates the booleans and `exit 1`s if any secret vanished
   between jobs.

No fallback to an unsigned build. No partial signing. No "best
effort." Either every secret is present and the workflow produces a
signed-demo candidate, or it fails safely without one.

## 6. Artifact is internal-review-only

- The artifact is uploaded via `actions/upload-artifact@v4` — a
  **workflow-scoped** artifact, visible only to authorized repo
  collaborators on the workflow-run page.
- The artifact name embeds `signed-demo-candidate-mac-<run_id>` so
  it cannot be mistaken for a tagged release asset.
- Retention is 7 days; the artifact is not pushed to GitHub Releases,
  not published to S3, not pushed to any auto-update channel, and
  not exposed via `latest-mac.yml` redirects.
- The workflow's `$GITHUB_STEP_SUMMARY` repeats the
  internal-review-only language and reminds the operator that the
  artifact is **not** a public release.

## 7. No public release is published

- The workflow does not push tags.
- The workflow does not call `electron-builder --publish` in any
  invocation.
- The workflow does not use `softprops/action-gh-release`,
  `actions/create-release`, or `ncipollo/release-action`.
- The workflow's `permissions:` block is `contents: read` — even if
  some future step tried to publish a Release, it would lack the
  `contents: write` permission required by the GitHub Releases API.
- The existing `build-release.yml` remains the only path that
  publishes a public Release, and it is unchanged.

## 8. Required verification chain (before claiming signed/notarized)

A successful run of the Phase 23E workflow produces a candidate, not
a verdict. **The following gates must ALL pass before the artifact may
be described as "signed and notarized":**

1. **signing readiness strict passes** —
   `npm run release:mac-signing-readiness:strict` exits 0 with every
   required signing + notarization env present.
2. **signed mac build runs with secrets** —
   `npx electron-builder --mac` completes with `CSC_LINK`,
   `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and
   `APPLE_TEAM_ID` all populated.
3. **release-check passes** —
   `node scripts/release-check.js` reports no privacy-gate failure
   and the post-build codesign check does **not** raise its
   "code object is not signed at all" warning.
4. **codesign verifies** —
   `codesign --verify --deep --strict --verbose=2` reports
   `valid on disk` and `satisfies its Designated Requirement`.
5. **spctl accepts** —
   `spctl --assess --type execute --verbose=4` reports
   `source=Notarized Developer ID` or equivalent.
6. **stapler validates** —
   `stapler validate` on the DMG and the `.app` reports
   `The validate action worked!`.
7. **release evidence reports signed verified** —
   `npm run release:evidence:strict` writes a Markdown + JSON report
   under `reports/release-evidence/` that includes a
   `signed: verified` (or equivalent) field.

Until **every** gate passes for a specific artifact, the only
permitted language for that artifact is "signed-demo candidate".

## 9. Forbidden language until verified

The renderer, the docs, and the PR / release-notes copy MUST NOT
include any of the following phrases as positive completion claims
about a build that has not passed the §8 verification chain:

- *SourceDeck is signed and notarized*
- *Apple notarized*
- *Production signed*
- *Notarized release*
- *Publicly signed*
- *SourceDeck is signed*
- *SourceDeck is notarized*

Test #16 of `test/signed-demo-build-readiness.test.js` enumerates
these phrases as part of the audit-doc check; Phase 23E intentionally
*lists* them here so the test can verify they are tracked. Test #17
asserts the renderer carries no positive form.

## 10. Safe language Phase 23E does use

- *Local test builds may show unsigned-artifact warnings.*
- *Do not present signing / notarization as complete until
  `release-check` verifies it.*
- *This workflow creates a signed-demo candidate only when required
  secrets and verification gates pass.*
- *Internal review only. No public release.*

## 11. Preserved (verified)

- Phase 22B-22F GovCon workflow surfaces — unchanged.
- Phase 23A Demo Mode, Phase 23B GovCon Mode indicator, Phase 23C
  primary nav + Show All Tools toggle, Phase 23D Markdown export +
  Last Updated chips — all unchanged.
- Phase 21F System Readiness / System Flow tab removal — preserved.
- Phase 20G `.btn-gold` guard — preserved.
- Response Desk draft-only posture, SAM Sprint Free=1 NAICS, Human
  approval required — all preserved.
- Renderer boot — `sourcedeck.html` was not modified in this phase.

## 12. Files touched

- `.github/workflows/signed-demo-build.yml` — NEW (workflow_dispatch
  only; uses existing scripts; no `--publish`; uploads workflow
  artifact only).
- `test/signed-demo-build-readiness.test.js` — NEW (21 assertions).
- `package.json` — append new test file to the test chain.
- `docs/audits/phase-23e-signed-demo-build-readiness-audit.md` — NEW
  (this file).
- `docs/release-notes/phase-23e-signed-demo-build-readiness.md` — NEW.

`sourcedeck.html` was **not** modified.

## 13. Test + gate status

| Gate | Result |
| --- | --- |
| `node test/signed-demo-build-readiness.test.js` | PASS (target) |
| `node test/govcon-demo-delivery-polish.test.js` | PASS (26/26) — re-run inline by the new test |
| `npm test` (all 52 test files) | PASS (target) |
| `npm run release:evidence` | PASS |
| `npm run troubleshooting:scan` | PASS |
| `npm run govcon:smoke` | PASS |
| `npm run phase13:rc-check` | PASS |
| `npm run i18n:audit` | PASS |
| `node scripts/release-check.js` | PASS *(local-dev signing warn only, expected and honest)* |

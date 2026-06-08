# Phase 24N-PREP — Release Artifact Handling Policy

**Date:** 2026-06-08
**Posture:** Docs / spec / audit only. **No artifacts built, signed, or published.** Governs how release artifacts and evidence are handled.
**Companions:** `docs/audits/phase-24n-signed-build-readiness-audit.md`, `docs/product/phase-24n-installer-evidence-gate-contract.md`, `docs/product/phase-24n-macos-signing-notarization-checklist.md`.

---

## 1. What MAY be committed

- Docs (audits, contracts, checklists).
- Release notes.
- Evidence **summaries without secrets** (status, counts, presence-only flags).
- Checksums (`shasum -a 256` digests) **if safe** — a digest is not a secret, but only commit it deliberately alongside its release note.

## 2. What MUST NOT be committed

- `.env` / any environment file.
- API keys (SAM.gov, OpenAI, Claude, Apollo, Airtable, IBM, etc.).
- Certificates (`.p12`, `.cer`, `CSC_LINK` contents).
- Provisioning profiles.
- Private keys.
- Notarization credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_API_KEY*`).
- `.qa/` output — unless explicitly approved.
- Screenshots / videos / media — unless explicitly approved.
- DMG / ZIP / installers — unless explicitly approved.
- Build output directories (`dist/`, `build/` output, `out/`, `release/`).
- `reports/` evidence output — keep gitignored unless a redacted summary is deliberately promoted into `docs/`.

> Repo state today: `dist/`, `.qa/`, `reports/` are gitignored. A pre-existing **unsigned** local `dist/mac/SourceDeck.app` exists and must **not** be committed or presented as signed.

## 3. Artifact storage policy

- **Local artifacts remain local** unless explicitly approved for distribution.
- **Public download requires separate website / release approval** (the `sourcedeck-site` repo + a human authorization step).
- **GitHub release attachment requires explicit authorization** (the `publish` target points at `thekidd2227/sourcedeck-releases`; `npm run release` uses `--publish always` and must **not** be run without authorization).
- **Never upload to the website automatically.**

## 4. Naming policy

Artifact / evidence names should include:
- App name (`SourceDeck`).
- Version.
- Build date.
- RC number.
- Signed / unsigned marker (e.g. `-unsigned` until signing evidence exists).
- Checksum (recorded alongside, e.g. in the release note).

Example (illustrative): `SourceDeck-1.0.0-rc1-unsigned-20260608-macOS-arm64.zip` + its SHA-256 in the release note. (electron-builder's configured `dmg.artifactName` is `SourceDeck-macOS-${arch}.${ext}`; add version/RC/signed markers in the release note and the promoted artifact name.)

## 5. Rollback policy

- **Keep prior release notes** (never delete history).
- **Document a bad artifact hash** (record the SHA-256 of any pulled artifact).
- **Remove a public link only with approval** (and record why).
- **Do not silently replace release artifacts** — a replacement gets a new version/RC marker and a new checksum; never overwrite a published artifact in place.

---

## Summary

The default is **local-only, nothing published, nothing claimed signed**. Promotion to a committed checksum, a GitHub release, or a website download each requires its own explicit human authorization, and none may carry a "signed/notarized/public" claim until the Phase 24N signing checklist evidence exists.

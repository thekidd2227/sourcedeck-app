# Release Artifact Evidence — Operator Reference

The release-evidence system captures a deterministic, secrets-free
snapshot of everything an operator needs to decide whether SourceDeck
is ready to publish on macOS. It does **not** sign, notarize, build,
publish, or upload anything externally.

## Where evidence is written

Generated reports live under `reports/release-evidence/`:

- `reports/release-evidence/latest-release-evidence.md`
- `reports/release-evidence/latest-release-evidence.json`
- `reports/release-evidence/<YYYY-MM-DD>-release-evidence.md`
- `reports/release-evidence/<YYYY-MM-DD>-release-evidence.json`

The directory is git-tracked via a `.gitkeep`; **the dated reports are
gitignored** so generated output never gets committed.

## Commands

| Command | Purpose |
|---|---|
| `npm run release:evidence` | Write markdown + JSON; print markdown; exit 0 in local dev. |
| `npm run release:evidence:json` | Same, but print JSON to stdout. |
| `npm run release:evidence:strict` | Exit **1** if the working tree is dirty, the asar is missing required files, signing readiness is not `ready_to_sign`, or a secret-shaped/positive-signed-claim string slips into the generated text. |

## Seven stable evidence states

The bundle picks one of these:

- `local_unsigned_dev` — local dev, signing not configured, gates pass.
- `signing_ready` — strict signing readiness `ready_to_sign`; artifact
  not yet built.
- `signing_blocked_missing_credentials` — strict requested and
  `blocked_missing_signing`.
- `no_packaged_artifact` — `dist/mac/SourceDeck.app` not present.
- `packaged_unsigned` — artifact present but unsigned.
- `packaged_signed_unverified` — artifact present; codesign verify
  could not run or did not pass.
- `packaged_signed_verified` — artifact present + codesign verify PASS.

## Local unsigned dev evidence policy

Default mode (`npm run release:evidence`) writes a bundle that
classifies the local state, captures the unsigned-artifact warning,
and exits **0**. This is non-blocking; the daily troubleshooting agent
surfaces a `PASS` finding (`REL-030`) when evidence has been captured.

## Strict release evidence policy

`npm run release:evidence:strict` is the **public-release** gate. It
exits 1 unless every release blocker is clear:

- Working tree is clean.
- `dist/mac/SourceDeck.app/Contents/Resources/app.asar` exists and
  contains all required files.
- `npm run release:mac-signing-readiness:strict` would return
  `ready_to_sign` (i.e., signing env + notarization env + `notarize:
  true` in `package.json` + entitlements file + icon).
- The generated text contains no positive "signed/notarized" claim
  and no secret-shaped fragments.

## No signing / notarization in this phase

This system **does not**:

- Run `codesign --sign`, `codesign --verify` (the existing
  `release-check.js` may run `codesign --verify` on a pre-built
  artifact, separately), or `xcrun notarytool submit`.
- Read, write, or print any Apple credentials.
- Upload anywhere except as a **GitHub Actions artifact** in the
  `workflow_dispatch`-only workflow at
  `.github/workflows/release-evidence.yml`.

## Future signed-release evidence checklist

When the operator is ready to ship a signed/notarized macOS release:

1. Provide `CSC_LINK` + `CSC_KEY_PASSWORD` (signing) and either the 3
   `APPLE_*` env vars or the 3 `APPLE_API_*` env vars (notarization).
2. Flip `package.json` `build.mac.notarize` to `true`.
3. Run `npm run release:mac-signing-readiness:strict` → expect
   `ready_to_sign`.
4. `npm run build:mac`
5. `node scripts/release-check.js` — should pass with `codesign verify:
   PASS`.
6. `codesign --verify --deep --strict --verbose=2 dist/mac/SourceDeck.app`
7. `spctl --assess --type execute --verbose dist/mac/SourceDeck.app`
8. `xcrun stapler validate dist/mac/SourceDeck.app`
9. `npm run release:evidence:strict` — expect exit 0 and state
   `packaged_signed_verified` (after capturing the codesign verified
   flag from step 5/6).
10. `node scripts/release-check.js --publish` then `npm run release`.
11. Mark `REL-020` and `REL-030` as resolved in the KB; archive the
    captured evidence bundle.

## Public-release rule

**Do not ship a public macOS release unless `npm run
release:evidence:strict` exits 0 AND `npm run
release:mac-signing-readiness:strict` reports `ready_to_sign` AND
`codesign --verify` passes on the built artifact.** This rule is
enforced by the strict CLI exit codes and surfaced via the KB E-009 /
E-010 rules and the diagnostic playbook.

## Safety summary

- Presence-only for credential-shaped fields; never raw values.
- Free-text payloads pass through a redactor that strips Bearer / sk-
  / sk-ant- / IBM keys / SMTP passwords / Apple env assignments / PEM
  certs/keys / "Developer ID Application:" / long base64 + long hex
  blobs.
- Git commit is recorded as the conventional 7-char short SHA so the
  redactor does not falsely strip it.
- No new dependency added; pure Node.

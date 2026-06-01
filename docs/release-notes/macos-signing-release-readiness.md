# macOS Signing & Release Packaging Readiness (Phase 17A)

## What changed

This phase adds a **deterministic, secrets-free** readiness diagnostic
for macOS signing and notarization. It does NOT add any Apple
credentials, does NOT attempt to sign or notarize, and does NOT claim
the app is signed.

- `services/release/macos-signing-readiness.js` — pure module exporting
  `getMacSigningEnvStatus`, `validateMacSigningConfig`,
  `classifyMacSigningReadiness`, `redactSigningReadinessReport`,
  `getMacSigningRemediationSteps`, `buildMacSigningReadinessReport`,
  `formatMacSigningReadinessReport`.
- `scripts/macos-signing-readiness.js` — CLI with `--json` and `--strict`.
- npm scripts: `release:mac-signing-readiness`,
  `release:mac-signing-readiness:json`,
  `release:mac-signing-readiness:strict`.
- `scripts/release-check.js` — codesign-warn branch now points at the
  readiness script and is explicit that local dev is non-blocking.
- `services/troubleshooting/troubleshooting-agent.js` — REL-020
  remediation now references both readiness commands.
- `test/macos-signing-readiness.test.js` — 19 assertions wired into
  `npm test`.

## Signing readiness states

| Code | Meaning |
|---|---|
| `ready_to_sign` | Signing env + notarization env (3 APPLE_* or 3 APPLE_API_*) present **and** `package.json build.mac.notarize` is `true` |
| `partial_signing` | Signing env present but no notarization env |
| `blocked_notarize_off` | Env complete but `notarize: false` in `package.json` |
| `blocked_missing_signing` | Strict / public release: any required env missing |
| `blocked_missing_entitlements` | `build/entitlements.mac.plist` or app icon missing |
| `unsigned_dev_ok` | Local dev without Apple credentials — **non-blocking** |
| `unknown` | Validation could not classify |

## Strict mode

Strict mode (`--strict` / `npm run release:mac-signing-readiness:strict`)
**blocks** missing production signing config: it exits `1` when the
status is `blocked_missing_signing`, `blocked_notarize_off`,
`partial_signing`, or `blocked_missing_entitlements`. Default mode
exits `0` for `unsigned_dev_ok` so local dev and the daily
troubleshooting agent are not broken by missing Apple env.

## Safety

- **No Apple credentials added.** Nothing in this phase reads or writes
  `.env.local`, signing identities, p12 contents, or Apple passwords.
- **No secret values returned.** Env status is presence-only. Missing
  env are reported as **names**, never as values.
- **Redactor sweep.** Every free-text payload that leaves the module
  passes through `redactSigningReadinessReport`, which strips
  `CSC_KEY_PASSWORD=…` / `APPLE_APP_SPECIFIC_PASSWORD=…` / PEM
  certificates and private keys / "Developer ID Application: …" /
  long base64 / long hex blobs.
- **No live signing.** The CLI does not invoke `codesign` or
  `xcrun notarytool`; existing `release-check.js` retains the optional
  `codesign verify` call.
- **No public claims of signed/notarized.** Tests assert the audit
  doc never positively claims the app is signed/notarized; only
  negated/conditional language is acceptable.
- **Daily troubleshooting agent unchanged in posture.** REL-020 remains
  `MANUAL` in environments without Apple env; daily CI does not fail
  because Apple env is absent.

## Carried-forward invariants

- No auto-repair, no auto-commit, no auto-push (NAR-001..NAR-010,
  E-007, E-008).
- Renderer/preload credential boundary untouched.
- RED_RESTRICTED, irreversible KILL, no-auto-send for outreach, and
  no-auto-post for content unchanged.

## Tests run / results

- `npm test` — green, includes new **macos-signing-readiness 19/19**,
  plus existing troubleshooting-email-alerts 18/18,
  troubleshooting-agent 95/95, watsonx-runtime-context 18/18,
  ibm-readiness 38/38, credential-boundary 14/14.
- `npm run release:mac-signing-readiness` — `unsigned_dev_ok`, exit 0.
- `npm run release:mac-signing-readiness:strict` — `blocked_missing_signing`,
  exit 1 (as expected in a non-signing env).
- `npm run release:mac-signing-readiness:json` — JSON document, no
  secrets, parseable.
- Existing gates (`govcon:smoke`, `govcon:outreach-os:audit`,
  `phase13:rc-check`, `i18n:audit`, `release-check`) — unchanged.

## Rollback guidance

Additive. To roll back, revert the phase commit/PR. The signing
behavior of `electron-builder`, the `release-check.js` core, and the
troubleshooting agent's other invariants are unaffected; only the new
module/script/test/docs are removed.

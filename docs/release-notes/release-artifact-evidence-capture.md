# Release Artifact Evidence Capture (Phase 17B)

## What changed

Adds a deterministic, **secrets-free** release-evidence capture system
that complements the Phase 17A signing-readiness diagnostic. No live
signing, no notarization, no publishing, no external upload.

- `services/release/release-evidence.js` — pure module exposing
  `collectReleaseEvidence`, `collectPackageMetadata`,
  `collectAsarMetadata`, `collectSigningReadinessEvidence`,
  `collectTroubleshootingEvidence`, `collectGateEvidence`,
  `redactReleaseEvidence`, `formatReleaseEvidenceMarkdown`,
  `formatReleaseEvidenceJson`.
- `scripts/release-evidence.js` — CLI with `--json`, `--markdown`,
  `--out`, `--strict`. Writes `latest-release-evidence.{md,json}` and a
  dated copy to `reports/release-evidence/`.
- npm scripts: `release:evidence`, `release:evidence:json`,
  `release:evidence:strict`.
- `.github/workflows/release-evidence.yml` — `workflow_dispatch`-only
  workflow that runs `npm test`, signing-readiness, troubleshooting
  scan, and release-evidence, then uploads both report directories as
  GitHub Actions artifacts. **No secrets, no publish, no commit/push.**
- Troubleshooting agent finding `REL-030` — *Release Evidence Capture
  present and reachable*. PASS when module + CLI exist and a report has
  been written; WARN when wired but no report yet; never FAIL.
- `test/release-evidence.test.js` — 20 assertions wired into `npm test`.
- `.gitignore` — gitignores generated dated evidence reports while
  keeping the directory alive via `.gitkeep`.

## Evidence states implemented (seven stable codes)

`local_unsigned_dev` · `signing_ready` ·
`signing_blocked_missing_credentials` · `no_packaged_artifact` ·
`packaged_unsigned` · `packaged_signed_unverified` ·
`packaged_signed_verified`.

## Strict mode blocks

`npm run release:evidence:strict` exits **1** when any of:

- working tree is dirty,
- the packaged asar is missing any of the required files
  (`/main.js`, `/preload.js`, `/sourcedeck.html`, `/chartnav-integration.js`),
- signing readiness is not `ready_to_sign`,
- a positive "SourceDeck is signed/notarized" claim is detected in the
  generated text (the audit doc uses only negated language),
- any secret-shaped fragment leaks past the redactor (`sk-`/`sk-ant-`/
  PEM key/cert/AWS access key/un-redacted `CSC_KEY_PASSWORD=…`/
  `APPLE_APP_SPECIFIC_PASSWORD=…`).

## Safety

- **No Apple credentials added.**
- **No live signing / notarization** attempted.
- **No publishing**; the workflow uploads only as a GHA artifact.
- **No signed/notarized claims** in any new doc or generated output.
- Generated evidence is **redacted** and reports only presence/status.
- Credential boundary / watsonx-readiness / troubleshooting-agent
  invariants / no-auto-send / no-auto-post / RED_RESTRICTED / KILL /
  human-review unchanged.

## Tests run / results — all green

- `npm test` — incl. **release-evidence 20/20**, macos-signing-readiness
  19/19, troubleshooting-email-alerts 18/18, **troubleshooting-agent
  95/95** (now includes REL-030), watsonx-runtime-context 18/18,
  ibm-readiness 38/38, credential-boundary 14/14.
- `npm run release:evidence` — writes `latest-*` + dated bundle; state
  reflects local environment; exit 0.
- `npm run release:evidence:json` — parseable JSON; no secrets.
- `npm run release:evidence:strict` — exits **1** in non-release env
  (dirty tree + blocked signing readiness).
- Phase 16A/16B/17A gates and `release-check` unchanged behavior.

## Rollback guidance

Additive. To roll back, revert the phase commit/PR. Phase 17A signing
readiness, Phase 16A/16B troubleshooting + email-alert dry-run, and
every prior invariant remain unaffected.

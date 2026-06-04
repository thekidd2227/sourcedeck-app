# Release Notes — SAM Opportunity Sprint (core)

## Summary

Adds the SAM Opportunity Sprint service and CLI to SourceDeck's GovCon stack. Personalizes SAM.gov opportunity scoring through a new GovCon Pursuit Profile so rankings reflect the operator's goal, capacity, geography, certifications, and risk filters.

This UI/docs follow-up clarifies plan-limit copy in the manual-only GovCon workspace card and docs. It does not add live SAM execution, payment processing, pricing changes, or email sending.

## What's new

- `services/govcon/govcon-pursuit-profile.js` — schema, defaults, normalization, secret stripping for the new Pursuit Profile.
- `services/govcon/sam-opportunity-sprint.js` — sprint runner that reuses `sam-search.js`, dedupes, scores opportunities against the profile, and produces top-10 draft emails (draft-only).
- `scripts/sam-opportunity-sprint.js` — CLI that loads the profile, reads `SAM_GOV_API_KEY` from the environment, exits safely with `not_configured` when the key is missing, and writes four reports to `./reports/` otherwise.
- `test/sam-opportunity-sprint.test.js` — 28 tests covering profile normalization, dedupe, label thresholds, profile-driven scoring, geo / capacity / certification effects, hard-stop risk flags, missing-contact handling, top-10 draft cap, draft safety, and no-secret-leakage.
- Docs: `docs/features/sam-opportunity-sprint.md`, `docs/audits/sam-opportunity-sprint-implementation-audit.md`, this release note.

## Plan access

- SAM Opportunity Sprint is available to all users.
- Free users can search 1 NAICS code per sprint.
- Paid users can search all configured / available NAICS codes.
- The plan limit applies to active query execution, not saved GovCon Pursuit Profile preferences.
- Reports identify which configured NAICS were searched and which were withheld by plan limit.

## Why the Pursuit Profile is required

Without a populated profile the sprint runs in **preliminary mode**: every report carries a clear notice that rankings are not yet personalized. Operators are expected to fill in business identity, contract goal, service lanes, geography, certifications, capacity, risk filters, and past performance before relying on rankings.

The same SAM.gov opportunity scores differently for different operators — that's the point. Generic NAICS-only scoring is explicitly insufficient for sprint use.

## Safety

- `SAM_GOV_API_KEY` is loaded from `process.env` only. Never stored in the profile. Never echoed to logs. Never serialized into report payloads. A guard test asserts this.
- Outreach is **draft-only**. Every draft carries `draft_only: true`, `auto_send: false`, `manual_approval_required: true`. There is no transport binding.
- Human approval remains required before outreach. The sprint does not auto-send emails, submit quotes, or contact agencies.
- Blocked phrases (`guaranteed award`, `guaranteed savings`, `we guarantee`, `award-winning`, `preferred vendor of`, etc.) are scrubbed from generated subjects and bodies.
- No claims of guaranteed award, guaranteed revenue, or guaranteed response are made by this feature.
- No changes to watsonx runtime probe logic.
- No changes to macOS signing / notarization logic.
- No changes to release evidence generation.
- `sourcedeck.html` changes are static copy only. No live run button, `fetch` handler, payment link, or email transport is added.
- No `.env` files were touched. No secrets were committed.

## Compatibility

- Pure CommonJS, matches the existing `services/govcon/*` convention.
- No new dependencies. No `npm install` run. `package-lock.json` unchanged.
- Reads `globalThis.fetch` (Node ≥ 18) when the CLI runs, matching the rest of the GovCon services.

## Validation

- `node test/sam-opportunity-sprint.test.js` → 28 passed, 0 failed.
- `npm test` results captured in PR description.
- `npm run release:evidence`, `npm run troubleshooting:scan`, `npm run govcon:smoke`, `npm run phase13:rc-check`, `npm run i18n:audit`, `node scripts/release-check.js` results captured in PR description.

## Operator usage

```bash
# One-time: export the SAM.gov key in your shell (never paste into chat)
export SAM_GOV_API_KEY=...

# Run a sprint
node scripts/sam-opportunity-sprint.js

# Or via npm
npm run sam:sprint

# Run with a custom profile
node scripts/sam-opportunity-sprint.js --profile=./my-pursuit-profile.json
```

If the key is not configured the script exits 0 with a `not_configured` message and instructions — no network call is made.

## Follow-ups

1. Optional `electron-store` persistence for the Pursuit Profile so Settings can edit it (intentionally not in this PR to avoid touching `main.js` / `services/config.js`).
2. Optional unification of the sprint draft writer with `services/govcon/email-compliance.js` once that module accepts Pursuit Profile fields.

## Known limitations

- Reports are written to `./reports/` and are intentionally not committed. The operator decides whether to keep them.
- This release is decision support, not a guaranteed award predictor.
- The sprint scorer is a fast first-pass keyed off the Pursuit Profile. The deeper `services/govcon/middleman-fit.js` analyzer remains the canonical bid-fit deep dive.

---

## Update — SAM Sprint Entitlements (Free vs Paid NAICS access)

SAM Opportunity Sprint is accessible to all users. A per-plan limit now applies to the number of NAICS codes searched per sprint:

- **Free plan: 1 NAICS code per sprint.**
- **Paid plans (paid, pro, team, enterprise): all configured/available NAICS codes.**

Rules:
- The limit affects **query execution**, not saved profile preferences. Your `target_naics` list is preserved exactly as you saved it.
- Generated reports include an explicit `entitlement` block showing which NAICS were searched and which were withheld by the free-plan limit.
- CLI prints the entitlement summary on every run (including the safe `not_configured` exit) and never prints secrets.
- For local testing without changing your profile, export `SAM_SPRINT_PLAN=paid` or `SAM_SPRINT_PLAN=free` in your shell.
- SourceDeck does not process payments and does not promise contract awards, revenue, or bid success.
- Outreach remains **manual-only**. No emails are sent automatically. Human approval remains required.

### Changed files

- `services/govcon/sam-sprint-entitlements.js` (new)
- `services/govcon/govcon-pursuit-profile.js` (adds `subscription` block + normalization)
- `services/govcon/sam-opportunity-sprint.js` (caps active NAICS query set, surfaces entitlement metadata)
- `scripts/sam-opportunity-sprint.js` (accepts `SAM_SPRINT_PLAN` env override, prints entitlement summary, adds plan section to markdown report)
- `test/sam-opportunity-sprint.test.js` (+18 tests)
- `docs/features/sam-opportunity-sprint.md`, `docs/audits/sam-opportunity-sprint-implementation-audit.md`, this release note.

### Not changed

- `sourcedeck.html` (Agent 1 branch — no UI changes in this PR)
- `package.json` (no new scripts, no new dependencies)
- Pricing page, payment processing, watsonx, signing, release-evidence, Vercel logic

---

## Update — Profile Setup + Plan-Aware UX

Adds the user-facing profile setup experience and plan-aware visibility for SAM Opportunity Sprint.

### What's new

- **Profile completeness scoring.** `services/govcon/govcon-pursuit-profile.js` adds `calculateProfileCompleteness`, `getRequiredProfileFields`, `getProfileSetupWarnings`, `summarizeProfileForUi`. Twelve weighted fields. Readiness labels: `incomplete` / `usable` / `strong` / `ready`. Default profile is always `incomplete`.
- **Safe local profile persistence.** `services/govcon/govcon-pursuit-profile-store.js` (new) provides JSON-only persistence under a platform-appropriate user-app-data directory. Missing file → defaults. Corrupt file → defaults + warning, never throws. `SAM_GOV_API_KEY` is never stored. Secret-shaped fields are stripped before write; the writer refuses any payload that still looks like a credential. No database dependency.
- **Sprint result metadata.** `runSprint` now exposes `profile_completeness`, `scoring_confidence` (`preliminary` | `profile_driven`), `active_naics_codes`, and `withheld_naics_codes` on both the `ran` and `not_configured` branches.
- **CLI profile path.** `scripts/sam-opportunity-sprint.js` accepts `SAM_SPRINT_PROFILE_PATH=/path/to/profile.json` env var in addition to `--profile=`. The CLI prints readiness label, percent, missing-field count, scoring confidence, plan, active NAICS count, and withheld NAICS count on every run (including the safe `not_configured` exit).
- **GovCon workspace UI.** `sourcedeck.html` gains a manual-only **GovCon Pursuit Profile** card above the existing SAM Opportunity Sprint card. The card surfaces profile readiness fields, plan-aware NAICS access (1/free vs all/paid), the setup path (links to the pre-existing GovCon Setup Wizard), and the human-approval reminder. **No new live execution is wired** — the card reuses the already-shipped `openGovconSetupWizard()` handler and adds no `fetch`/email/payment transport.

### How operators set up

1. Open the GovCon workspace.
2. Click the **⚙ Open GovCon Setup** button in the new Pursuit Profile card (or the existing **⚙ Setup** button in the GovCon header).
3. Populate identity / certifications / NAICS / lanes / geography / capacity / risk filters / past performance.
4. (Optional, for CLI-only operators) Save the profile JSON to the path returned by `getDefaultProfilePath()`, or point the CLI at a custom path via `SAM_SPRINT_PROFILE_PATH`.
5. Export `SAM_GOV_API_KEY` in the shell that will run the sprint (never paste into chat or commit).
6. Run `npm run sam:sprint` or `node scripts/sam-opportunity-sprint.js`. Review the reports under `./reports/`.

### Safety

- `SAM_GOV_API_KEY` is never stored in the profile; the store actively refuses to write any payload containing one.
- No `.env` files were modified.
- No emails sent. Drafts remain `draft_only / auto_send:false / manual_approval_required:true` under every plan and every readiness level.
- Human approval remains required for any outreach.
- No payment processing, no billing IDs, no pricing changes.
- No guaranteed-award / guaranteed-revenue / guaranteed-response / guaranteed-ROI / guaranteed-savings claims.
- No watsonx / signing / release-evidence / Vercel logic changes.
- Reports are not auto-committed.

### Tests

- **62 sprint-specific tests** (up from 46), all green.
- New coverage: 8 completeness tests, 5 profile-store tests, 3 sprint-result metadata tests.

### Known limitations

- The UI card is informational only — it does not run the sprint from the browser-style chrome. Operators trigger sprints from the CLI.
- The `openGovconSetupWizard()` modal is the existing setup surface for identity / certifications / capability data; this PR does not refactor or extend that wizard.

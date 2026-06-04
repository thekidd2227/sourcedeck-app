# Release Notes — SAM Opportunity Sprint

Consolidated release notes for SAM Opportunity Sprint as it exists on `main` after the core sprint, entitlement enforcement, manual-only UI, Free-plan 1-NAICS cap, GovCon Pursuit Profile setup UX, and profile persistence work have landed.

## Summary

SAM Opportunity Sprint is a profile-driven SAM.gov opportunity pulse for SourceDeck GovCon operators. It runs a focused 7-day or 30-day sweep, scores opportunities against the operator's GovCon Pursuit Profile, enforces plan-aware NAICS access, and produces local report artifacts for operator review.

Generated artifacts:

- `reports/sam-opportunity-sprint.json` — full structured result
- `reports/sam-opportunity-sprint.md` — readable executive report
- `reports/sam-outreach-targets.csv` — spreadsheet contact list
- `reports/sam-email-drafts.md` — top-10 draft emails, review-only

The GovCon workspace includes manual-only SAM Sprint/Profile UI. It explains plan access, profile setup, profile completeness, report disclosure, and human approval requirements. It does **not** execute live SAM searches.

## Plan Access

- SAM Opportunity Sprint is available to all users.
- Free users can search **1 NAICS code per sprint**.
- Paid, pro, team, and enterprise users can search **all configured / available NAICS codes**.
- The plan limit applies to active query execution only. Saved GovCon Pursuit Profile NAICS preferences are preserved.
- Reports identify which configured NAICS were searched and which were withheld by the free-plan limit.
- CLI output includes plan and entitlement summaries, including the safe `not_configured` exit.
- `SAM_SPRINT_PLAN=free|paid|pro|team|enterprise` can be used for local testing without changing the saved profile.
- SourceDeck does not process payments in this feature and does not promise contract awards, revenue, ROI, or bid success.

## GovCon Pursuit Profile

The GovCon Pursuit Profile controls scoring accuracy. Operators should complete:

- business identity
- contract goal
- NAICS
- service lanes
- geography
- certifications
- capacity
- risk filters
- past performance

Every sprint result can surface:

- `profile_completeness`
- `scoring_confidence`
- missing required fields
- active NAICS codes
- withheld NAICS codes

Incomplete profiles produce preliminary scoring confidence. Complete profiles produce profile-driven scoring.

## Profile Persistence

Profile persistence exists through the safe JSON profile store.

- Explicit profiles can be loaded with `--profile=/path/to/profile.json`.
- `SAM_SPRINT_PROFILE_PATH=/path/to/profile.json` is supported.
- The default profile path is the platform-appropriate SourceDeck user-app-data location.
- Missing profile files load defaults.
- Corrupt JSON loads defaults plus warnings and does not crash the sprint.
- Saves are normalized and scrubbed of secret-shaped fields.
- `manual_review_required` is forced to `true`.
- `SAM_GOV_API_KEY` is never stored in the profile.

## Safety

- `SAM_GOV_API_KEY` is loaded from `process.env` only.
- The CLI exits safely with `not_configured` when the key is missing and makes no network call.
- Outreach is draft-only. Every draft carries `draft_only: true`, `auto_send: false`, and `manual_approval_required: true`.
- Human approval remains required before any outreach, quote submission, or agency contact.
- The GovCon workspace UI does not run live SAM searches.
- The feature does not auto-send emails.
- Blocked phrases such as guaranteed-award or guaranteed-response claims are scrubbed from generated drafts.
- No pricing, payment processing, watsonx, signing/notarization, release-evidence, provider, Vercel, or email behavior changes are part of this cleanup.
- No `.env` files are required or modified.

## What Shipped

- `services/govcon/govcon-pursuit-profile.js` — profile schema, defaults, normalization, completeness helpers, UI summary helpers, secret stripping.
- `services/govcon/govcon-pursuit-profile-store.js` — safe JSON profile persistence.
- `services/govcon/sam-opportunity-sprint.js` — sprint runner, dedupe, profile-driven scoring, entitlement-aware query plan, draft builder, result metadata.
- `services/govcon/sam-sprint-entitlements.js` — plan normalization and active NAICS cap enforcement.
- `scripts/sam-opportunity-sprint.js` — CLI runner, profile path support, plan override support, safe no-key exit, report writing.
- `test/sam-opportunity-sprint.test.js` — sprint, entitlement, profile completeness, persistence, and safety coverage.
- `sourcedeck.html` — manual-only SAM Sprint/Profile UI in the GovCon workspace.
- `docs/features/sam-opportunity-sprint.md`
- `docs/audits/sam-opportunity-sprint-implementation-audit.md`
- `docs/release-notes/sam-opportunity-sprint.md`

## Operator Usage

```bash
# One-time: export the SAM.gov key in your shell. Never paste it into chat.
export SAM_GOV_API_KEY=...

# Optional: choose plan for this run without changing the saved profile.
export SAM_SPRINT_PLAN=paid

# Optional: point the sprint at a specific profile.
export SAM_SPRINT_PROFILE_PATH=./my-pursuit-profile.json

# Run a sprint.
npm run sam:sprint
```

If the key is not configured, the script exits 0 with a `not_configured` message. It still prints profile readiness and entitlement context so the operator can verify setup before running a live sprint.

## Known Limitations

- Reports are written under `./reports/` and are intentionally not committed.
- This release is decision support, not a guaranteed award predictor.
- The UI is informational/manual-only. Operators run the sprint through the CLI/service path.
- The sprint scorer is a fast first pass keyed off the GovCon Pursuit Profile. The deeper `services/govcon/middleman-fit.js` analyzer remains the canonical bid-fit deep dive.

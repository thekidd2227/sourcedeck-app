# SAM Opportunity Sprint — Implementation Audit

This audit describes the merged SAM Opportunity Sprint feature as it exists on `main` after the core sprint, entitlement enforcement, manual-only GovCon workspace UI, Free-plan 1-NAICS cap, GovCon Pursuit Profile setup UX, and safe profile persistence work have landed.

## Current Product State

- SAM Opportunity Sprint is available to all users.
- Free users can search **1 NAICS code per sprint**.
- Paid, pro, team, and enterprise users can search **all configured / available NAICS codes**.
- The plan limit applies to active query execution only. It does not remove, overwrite, or limit saved GovCon Pursuit Profile NAICS preferences.
- Sprint results and Markdown reports disclose searched NAICS and NAICS withheld by the free-plan limit.
- Scoring remains driven by the GovCon Pursuit Profile.
- Profile setup/completeness is surfaced to operators through readiness labels, percent complete, missing required fields, and scoring confidence.
- Profile persistence exists through the safe JSON profile store. Missing profile files load defaults; corrupt JSON returns defaults plus warnings; saved profiles are normalized and scrubbed of secret-shaped fields.
- The GovCon workspace includes manual-only SAM Sprint/Profile UI. The UI explains plan limits, profile setup, report disclosure, and human approval requirements.
- The UI does **not** run live SAM searches.
- Outreach remains draft-only. No emails are auto-sent. Human approval remains required before outreach, quote submission, or agency contact.

## Inspection

| Question | Finding |
|---|---|
| Does SourceDeck reuse an existing SAM.gov API client? | Yes. The sprint reuses `services/govcon/sam-search.js` (`createSamSearchService`, `normalizeSamRecord`, `dedupe`, `applyTargeting`, `buildSamHumanUrl`). |
| Does the sprint replace the deeper bid-fit analyzer? | No. `services/govcon/middleman-fit.js` remains the canonical deep bid-fit scorer. The sprint is a fast 7/30-day profile-aware pulse. |
| Does the sprint require a profile? | It can run with defaults, but incomplete profiles produce preliminary scoring confidence and missing-field warnings. Operators should complete the GovCon Pursuit Profile before relying on rankings. |
| Does profile setup exist? | Yes. The GovCon workspace surfaces profile readiness and routes operators to setup. The sprint also returns `profile_completeness` and `scoring_confidence`. |
| Does profile persistence exist? | Yes. `services/govcon/govcon-pursuit-profile-store.js` provides safe JSON loading, saving, and snapshot export. |
| Does entitlement enforcement exist? | Yes. `services/govcon/sam-sprint-entitlements.js` normalizes plan names and applies the active NAICS cap. |
| Does Free get 1 NAICS? | Yes. Free is capped to 1 active NAICS per sprint. |
| Do paid tiers get all configured NAICS? | Yes. `paid`, `pro`, `team`, and `enterprise` are unrestricted. |
| Does the UI run live SAM searches? | No. The GovCon workspace card is informational/manual-only. |
| Does the feature send emails? | No. Drafts carry `draft_only: true`, `auto_send: false`, and `manual_approval_required: true`. |

## Plan Access and NAICS Limit

| Plan | Active NAICS per sprint |
|---|---|
| `free` | 1 |
| `paid` | all configured / available |
| `pro` | all configured / available |
| `team` | all configured / available |
| `enterprise` | all configured / available |

Rules:

- Unknown or missing plans default to `free`.
- The active query set is capped after configured and lane-derived NAICS are resolved.
- The saved `profile.target_naics` list is never mutated by the cap.
- Blocked free-plan NAICS are not queried.
- Reports and CLI output disclose which NAICS were searched and which were withheld.
- Entitlement metadata is included in the top-level sprint result and `query_metadata.entitlement`.

## Profile Setup, Completeness, and Persistence

The GovCon Pursuit Profile controls scoring accuracy. Operators should complete goal, NAICS, service lanes, geography, certifications, capacity, risk filters, and past performance before relying on rankings.

The sprint exposes:

- `profile_completeness`
- `scoring_confidence`
- `active_naics_codes`
- `withheld_naics_codes`

The profile store:

- Loads from an explicit `--profile` path, `SAM_SPRINT_PROFILE_PATH`, or the default user-app-data path.
- Treats missing files as defaults.
- Treats corrupt JSON as defaults plus warnings.
- Normalizes profile shape before save.
- Forces `manual_review_required: true`.
- Strips or rejects secret-shaped fields before persistence.
- Never stores `SAM_GOV_API_KEY`.

## Safety Posture

- `SAM_GOV_API_KEY` is read from `process.env` only.
- `.env*` files are not required and were not modified.
- The CLI exits safely with `not_configured` when the key is absent and makes no network call.
- Email drafts are review-only; no transport binding exists.
- Human approval remains required before outreach.
- The feature makes no guaranteed award, guaranteed revenue, guaranteed ROI, or guaranteed response claim.
- No payment processing, billing ID, pricing-page, watsonx, signing/notarization, release-evidence, provider, Vercel, or email behavior changes are part of this docs cleanup.

## Files in the Merged Feature

- `services/govcon/govcon-pursuit-profile.js`
- `services/govcon/govcon-pursuit-profile-store.js`
- `services/govcon/sam-opportunity-sprint.js`
- `services/govcon/sam-sprint-entitlements.js`
- `scripts/sam-opportunity-sprint.js`
- `test/sam-opportunity-sprint.test.js`
- `sourcedeck.html` manual-only GovCon workspace UI
- `docs/features/sam-opportunity-sprint.md`
- `docs/audits/sam-opportunity-sprint-implementation-audit.md`
- `docs/release-notes/sam-opportunity-sprint.md`

## Validation

Sprint-specific tests currently cover core scoring, draft safety, entitlement enforcement, Free-plan 1-NAICS behavior, paid-tier unrestricted behavior, profile completeness, profile persistence, not-configured exits, and manual-review preservation.

This cleanup is docs-only. It removes stale PR-era wording and aligns the docs with the current merged behavior.

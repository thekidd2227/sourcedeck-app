# SAM Opportunity Sprint — Implementation Audit

## Inspection

| Question | Finding |
|---|---|
| Does SourceDeck already have a SAM.gov API client? | **Yes** — `services/govcon/sam-search.js` (`createSamSearchService`, `normalizeSamRecord`, `dedupe`, `applyTargeting`, `buildSamHumanUrl`). Reused unchanged. |
| Does SourceDeck already have GovCon opportunity search orchestration? | **Yes**, partially — `services/govcon/opportunity-outreach.js` composes sam-search + middleman-fit + outreach-window + email-compliance for the existing capture pipeline. The sprint is a **separate, narrower** feature: a 7/30-day pulse driven by a Pursuit Profile, not the full capture lifecycle. |
| Does SourceDeck already have user profile / operating profile / setup wizard fields? | **Yes** — `services/govcon/targeting-profile.js` (NAICS / set-aside / agency targeting) and `test/govcon-operating-profile-wizard.test.js`. The Pursuit Profile is **goal/capacity-centric** (urgency, revenue target, response time, risk filters, past performance, sprint window), which targeting-profile does not cover. Both profiles can coexist. |
| Does SourceDeck already store user capabilities, NAICS, certifications, geography, revenue goals? | NAICS and set-asides yes (targeting profile). Revenue goals, urgency, capacity, risk filters: **no** — added here as the Pursuit Profile schema. |
| Does SourceDeck already have opportunity scoring? | **Yes** — `services/govcon/middleman-fit.js` is the canonical deep 0-100 bid-fit scorer. The sprint scorer is a **fast first-pass** keyed off the Pursuit Profile; it does not replace middleman-fit. Both produce 0-100 scores but for different decision stages (sprint = pulse, middleman = deep). |
| Does SourceDeck already generate outreach drafts? | **Yes** — `services/govcon/email-compliance.js` (draft-only, hard guards). The sprint produces its own profile-aware draft for the top-10 list; it does not call email-compliance directly because the sprint draft uses Pursuit Profile fields (company name, certs, response posture) that email-compliance does not currently take as inputs. Long-term, the two could be unified; not in scope for this PR. |
| Does SourceDeck already export CSV reports? | Existing CSV/export infrastructure: `services/govcon/export.js`. The sprint writes a small focused CSV (`sam-outreach-targets.csv`) directly from the CLI to avoid coupling — kept narrow. |
| What existing files were reused? | `services/govcon/sam-search.js` (client + normalization), `services/govcon/govcon-pursuit-profile.js` (new schema), the existing test conventions (pure `assert` style). |
| What new files were required? | `services/govcon/govcon-pursuit-profile.js`, `services/govcon/sam-opportunity-sprint.js`, `scripts/sam-opportunity-sprint.js`, `test/sam-opportunity-sprint.test.js`, three doc files. |
| What must NOT be duplicated? | The SAM.gov API client (use `createSamSearchService`); the deep middleman-fit analyzer (sprint does not replace it); the email-compliance hard guards (sprint mirrors the safety posture but does not bypass it). |

## UI/docs-only follow-up

This follow-up updates the existing manual-only SAM Opportunity Sprint card in `sourcedeck.html` plus docs copy. It does not change service logic, CLI behavior, tests, package metadata, live execution, pricing, payment processing, or email transport.

## Plan access and NAICS limit

The sprint is accessible to all users.

- Free users can search 1 NAICS code per sprint.
- Paid users can search all configured / available NAICS codes.
- The limit applies to active query execution, not saved GovCon Pursuit Profile preferences.
- Reports must disclose which configured NAICS were searched and which were withheld by plan limit.
- Paid plan copy may describe broader NAICS coverage, but must not change pricing numbers or introduce payment processing in this UI/docs pass.

## Stash discipline

Two stashes were left untouched per operator instruction:

- `stash@{0}` — *"WIP on feat/govcon-setup-wizard: 037a459 feat(ui): SoHo x DC Power redesign"*
- `stash@{1}` — *"WIP: GovCon Capture OS + credential boundary"* — touches `services/govcon/sam-search.js` and `sourcedeck.html` among other files.

This PR avoids `sam-search.js` mutations and edits `sourcedeck.html` only for static SAM Sprint UI copy. Stash@{1}'s in-flight edits must still be reviewed separately if applied later.

A local safety pointer was created: `backup/stale-design-token-2ceb175`. It was **not pushed**.

## Scoring model — design notes

- **Profile-first**: the scorer takes `profile` and `opp`; it does not have a "no-profile" default mode that produces high scores. With a default-but-empty profile, geography and lane checks contribute zero or even negative score, naturally pushing rankings down toward Archive / Review until the operator configures.
- **Plan-aware query scope**: plan limits determine how many configured NAICS are actively searched during a sprint. They do not change the saved Pursuit Profile and do not make scoring generic; scoring remains profile-driven.
- **Hard stops via risk flags**: clearance language and excluded geography raise `risk_flags` with `severity: 'hard_stop'` or `penalty`. A single `hard_stop` flag forces the bid/no-bid recommendation to NO-BID regardless of headline score.
- **Capacity dimension**: the sprint enforces the operator's `max_response_time_hours` against the opportunity's deadline. A 24-hour-deadline RFQ does not score Pursue for an operator who can't quote inside 24 hours, even if every other dimension matches.
- **Past performance**: separate dimension so an operator who declares "no relevant past performance in this lane" still sees the opp ranked, but without the +4/+3 boost.
- **Pathway fit**: micro-purchase / SAT / RFQ keywords add a small boost so fast-quote pathways surface even when the deeper category boosts are moderate.

## Safety posture

- `SAM_GOV_API_KEY` is read from `process.env` only. The Pursuit Profile actively strips any field matching `/api[-_]?key|token|secret|password|bearer|authorization/i` via `stripSecrets()`.
- The CLI defensively refuses to write any JSON report containing a literal `SAM_GOV_API_KEY` substring.
- A test (`runSprint never embeds the api key in the result`) asserts that a known secret value cannot leak into the returned object.
- All generated email drafts carry `draft_only: true`, `auto_send: false`, `manual_approval_required: true`. The CLI never sends and there is no transport binding.
- `safe()` filter scrubs blocked phrases (`guaranteed award`, `we guarantee`, `award-winning`, `preferred vendor of`, etc.) from subject and body.
- Human approval remains required before outreach. No auto-send email path is introduced.
- The feature makes no guaranteed award or revenue claim.
- No changes to watsonx runtime probe, signing/notarization, or release evidence logic.

## Files changed

- `sourcedeck.html` — static SAM Sprint plan-limit / profile / manual-approval / report disclosure copy.
- `docs/features/sam-opportunity-sprint.md` — plan access, NAICS limit, report disclosure, safety copy.
- `docs/audits/sam-opportunity-sprint-implementation-audit.md` — this UI/docs-only scope note.
- `docs/release-notes/sam-opportunity-sprint.md` — plan access and safety note.

Forbidden files were **not** touched: `services/**`, `scripts/**`, `test/**`, `package.json`, `package-lock.json`, `.env*`, `main.js`, `preload.js`, `api/index.js`, `services/config.js`. No `npm install` was run.

## Validation

`node test/sam-opportunity-sprint.test.js` — 28 passed, 0 failed.

`npm test` was attempted against the full suite (existing + new). Results recorded in the release notes.

## Follow-up

1. UI surface on GovCon workspace (after PR #43 merges).
2. Optional unification of sprint draft path with `services/govcon/email-compliance.js` once the Pursuit Profile is plumbed into email-compliance.
3. Optional persistence layer for the Pursuit Profile (`electron-store` integration); kept out of this PR to avoid touching `main.js` / `services/config.js`.

---

## Phase — SAM Sprint Entitlements

Added Free vs Paid NAICS access enforcement to SAM Opportunity Sprint. **Entitlement enforcement only — no payment processing, no billing IDs, no pricing-page changes.**

### Files

- `services/govcon/sam-sprint-entitlements.js` (new) — `PLAN_LIMITS`, `KNOWN_PLANS`, `normalizePlan`, `getSamSprintEntitlement`, `applyNaicsLimit`, `describeNaicsLimit`.
- `services/govcon/govcon-pursuit-profile.js` — added `subscription: { plan, is_paid, source }` block to the default profile and normalization via the entitlements module's `normalizePlan`. Falls back to `free` on any error rather than crashing the profile load.
- `services/govcon/sam-opportunity-sprint.js` — `buildQueryPlan` now applies the NAICS cap via `applyNaicsLimit` and freezes an `entitlement` block on the plan; `runSprint` computes the entitlement preview once and surfaces it on `query_metadata.entitlement` and the top-level `entitlement` field, on BOTH the `ran` and `not_configured` branches.
- `scripts/sam-opportunity-sprint.js` — accepts optional `SAM_SPRINT_PLAN=free|paid|pro|team|enterprise` env override (never a credential), prints the plan + entitlement summary even on `not_configured` exit, and adds a "Profile Assumptions — Plan Entitlement" section to the markdown report.
- `test/sam-opportunity-sprint.test.js` — 18 new tests covering normalization, plan limits, NAICS cap behavior, saved-profile preservation, blocked-NAICS query-suppression (the sprint does NOT call SAM for blocked codes), entitlement metadata on results, not-configured passthrough, and manual_review_required preservation across all plans.

### Design discipline

- **The saved `profile.target_naics` is never mutated.** The cap is computed in `buildQueryPlan` and only the active query set is shortened. Re-running with a paid plan immediately exposes all codes.
- **The cap also covers lane-derived NAICS additions.** If a free user has 2 saved NAICS and enables 4 lanes, the union is still capped at 3.
- **Honest messaging.** `describeNaicsLimit` always says "searching 1 of N — (N-1) withheld by free-plan limit" rather than silently dropping codes.
- **Blocked codes do not trigger SAM queries.** Confirmed by the test `runSprint does NOT call SAM for blocked free-plan NAICS`.
- **No payment plumbing.** No Stripe, no billing IDs, no pricing page updates. The plan name comes from `profile.subscription.plan` (or the `SAM_SPRINT_PLAN` env override) — it does not represent verified payment status.

### Out of scope (intentional)

- No changes to `sourcedeck.html` (Agent 1 branch).
- No changes to `main.js`, `preload.js`, `api/index.js`, `services/config.js`, `scripts/release-check.js`.
- No `package.json` script changes, no new dependencies.
- No payment processing, no billing flows, no pricing page changes.
- No watsonx / signing / release-evidence / Vercel logic changes.

---

## Phase — Profile Setup + Plan-Aware UX

Adds GovCon Pursuit Profile completeness/readiness scoring, safe local profile persistence, CLI profile-path support, sprint-result completeness/confidence metadata, and a manual-only **GovCon Pursuit Profile** card in the GovCon workspace.

### What's new

- `services/govcon/govcon-pursuit-profile.js` — exports `calculateProfileCompleteness`, `getRequiredProfileFields`, `getProfileSetupWarnings`, `summarizeProfileForUi`. Twelve weighted fields; readiness labels: `incomplete` / `usable` / `strong` / `ready`. Default profile is **always** `incomplete`.
- `services/govcon/govcon-pursuit-profile-store.js` (new) — `getDefaultProfilePath` (platform-aware: macOS `~/Library/Application Support/SourceDeck/`, Windows `%APPDATA%\SourceDeck\`, Linux `$XDG_DATA_HOME/sourcedeck/`); `loadGovconPursuitProfile` (missing file → defaults; corrupt JSON → defaults + warning, never throws); `saveGovconPursuitProfile` (runs through `stripSecrets` + `normalizePursuitProfile`, refuses to write any payload containing a `SAM_GOV_API_KEY`-shaped value or any other credential-shaped field, writes with `mode: 0o600`); `exportProfileSnapshot` (plain-object snapshot for embedding in reports; forces `manual_review_required: true`).
- `services/govcon/sam-opportunity-sprint.js` — `runSprint` now returns `profile_completeness`, `scoring_confidence` (`preliminary` | `profile_driven`), `active_naics_codes`, `withheld_naics_codes` on both the `ran` and `not_configured` branches.
- `scripts/sam-opportunity-sprint.js` — accepts `SAM_SPRINT_PROFILE_PATH` env var (in addition to the existing `--profile=` flag); loads through the new store loader for explicit paths and the canonical user-app-data path otherwise; prints readiness label + percent + missing-field count + scoring confidence on every run; explicit "no reports written when key is missing" notice on the `not_configured` exit.
- `sourcedeck.html` — adds a new **GovCon Pursuit Profile** card above the existing SAM Opportunity Sprint card inside `#tab-govcon`. Manual-only / informational: the card has no `fetch`, no email transport, no payment link, no quote/bid submission. The only `onclick` reuses the **already-existing** `openGovconSetupWizard()` handler (no new behavior). The card surfaces: readiness notice, the eight profile field categories the sprint scorer reads, plan-aware NAICS access (1/free vs all/paid), the setup path, and the human-approval reminder.

### Design discipline

- Default profile must score below `ready` — the `incomplete` label is the operator-facing signal to set up the profile before trusting rankings.
- The five "hard" fields (company name, target NAICS, service lanes, geography, contract goal) drive the readiness label. The other seven fields (certifications, capacity, sub capacity, risk filters, past performance, sprint window, manual review) contribute to the percent but are not required for "usable".
- The profile store refuses to write any secret-shaped field — both the credential-pattern regex from `stripSecrets()` and a final `SAM_GOV_API_KEY` literal guard.
- `summarizeProfileForUi` never returns secret-shaped fields; test asserts this.
- Manual review is force-set to `true` everywhere (`normalizePursuitProfile`, `exportProfileSnapshot`, all sprint result branches).

### Tests added

- 8 profile-completeness tests (default incomplete, configured strong/ready, NAICS-removed lowers readiness, `national_allowed` substitutes for geography, manual-review lock is unbypassable, required-fields shape, UI summary has no secrets, incomplete-profile warning text).
- 5 profile-store tests (missing file → defaults, corrupt JSON safe handling, save normalizes + strips secrets, snapshot is plain + forced manual-review, default-path shape).
- 3 sprint-result tests (`profile_completeness` + `scoring_confidence` on incomplete profile, `profile_driven` for complete profile, completeness surfaces on `not_configured` exit).
- Total: **62 sprint tests** (up from 46), full suite green.

### Out of scope (intentional)

- No changes to `main.js`, `preload.js`, `api/index.js`, `services/config.js`, `scripts/release-check.js`.
- No `package.json` script changes, no new dependencies, no `package-lock.json` churn.
- No payment processing, no billing flows, no pricing-page changes.
- No watsonx / signing / release-evidence / Vercel logic changes.
- No live execution from the UI card; the existing GovCon Setup Wizard handler is the only handler reused.

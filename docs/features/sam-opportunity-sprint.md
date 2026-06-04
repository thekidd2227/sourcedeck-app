# SAM Opportunity Sprint

> SourceDeck GovCon capture feature. Personalized SAM.gov opportunity
> ranking driven by the operator's GovCon Pursuit Profile. Manual-only
> outreach. No auto-send.

## What it does

Runs a focused 7-day or 30-day sweep of SAM.gov active solicitations, scopes them to the operator's NAICS / lanes / geography / certifications, dedupes, and scores each opportunity against the operator's actual goal and capacity profile. Produces four artifacts:

- `reports/sam-opportunity-sprint.json` — full structured result
- `reports/sam-opportunity-sprint.md` — readable executive report
- `reports/sam-outreach-targets.csv` — spreadsheet contact list
- `reports/sam-email-drafts.md` — top-10 draft emails (review-only)

Outreach is **draft-only**. The tool never sends an email and never schedules one.

## Plan access and NAICS coverage

SAM Opportunity Sprint is available to all users.

- Free users can search 1 NAICS code per sprint.
- Paid users can search all configured / available NAICS codes for broader sprint searches.
- The plan limit applies to active query execution only. It does not remove, overwrite, or limit saved GovCon Pursuit Profile NAICS preferences.
- Reports must disclose which configured NAICS were searched and which were withheld by plan limit.

## Why the GovCon Pursuit Profile is required

Generic NAICS-based scoring tells you which opportunities *exist* — not which ones *you* should pursue. SAM Opportunity Sprint refuses to rank without a profile, because the same RFQ scores very differently for:

- An SDVOSB in Virginia with a janitorial subcontractor bench and same-day quote capacity, vs.
- A new MBE in Texas with no field crew and a 7-day response window.

The Pursuit Profile encodes goal, capacity, geography, certifications, risk tolerance, and past performance so scoring materially personalizes per operator.

If the profile is incomplete, the tool runs anyway but flags every report with: *"Scoring is preliminary until business identity, goal, service lanes, geography, and certifications are populated."*

## How scoring uses the profile

| Profile field | How it influences scoring |
|---|---|
| `target_naics` + `service_lanes` | Direct NAICS-match boost (+20); lane-derived NAICS and lane keywords give an additional service-lane match boost up to +15. |
| `geography.primary_states` / `national_allowed` / `excluded_states` | PoP in primary states (+12); PoP on excluded list (-25 and risk flag); PoP outside primary states with national_allowed false (-15 and risk flag). |
| `business_identity.certifications` + `setaside_preferences` | Set-aside match (+15); set-aside mismatch with unrestricted_allowed false (-10 and risk flag). |
| `capacity.max_response_time_hours` + `can_quote_same_day` | Tight deadline + slow response capacity (-8 and risk flag); fast capacity with deadline ≤7d (+5). |
| `capacity.requires_partner_for_field_work` + `capacity.subcontractor_network_available` | Field-work language without a sub bench (-6 and risk flag). |
| `risk_filters.avoid_clearance_required` | Clearance language detected → hard_stop (-25, NO-BID). |
| `risk_filters.avoid_large_construction` / `avoid_supply_only` / `avoid_daily_onsite_if_outside_region` / `avoid_long_technical_proposals` | Each one penalizes the matching language pattern when the operator has it enabled. |
| `past_performance.has_relevant_past_performance` + `past_performance_lanes` | +4 baseline plus +3 when the lane matches. |
| `contract_goal.urgency_level` | `immediate_revenue` adds +3 to the urgency component on still-open opportunities. |
| `setaside_preferences.subcontracting_allowed` | Teaming / prime / subcontract language gets +3 when subcontracting is allowed. |

A hard-stop risk flag forces the bid/no-bid recommendation to `NO-BID` regardless of the headline score.

## Labels

- 90-100 → **Pursue Immediately**
- 75-89  → **Strong Outreach Target**
- 60-74  → **Review / Possible Quote**
- below 60 → **Archive**

## Plan entitlement (Free vs Paid)

SAM Opportunity Sprint is accessible to all users. The sprint applies a per-plan limit on the number of NAICS codes that can be queried in a single run:

| Plan | Max NAICS per sprint |
|---|---|
| free | **1** |
| paid · pro · team · enterprise | unrestricted |

Rules:
- **Free plan caps the active query set to the first entry of the operator's configured `target_naics`.** The operator's saved profile is never mutated; the cap applies only to the sprint that is about to run.
- **Paid plans (paid, pro, team, enterprise) run all configured NAICS.**
- Unknown or missing plan defaults to **free** and a warning is surfaced in `profile_issues`.
- Every sprint result includes an `entitlement` block on the top-level result and inside `query_metadata.entitlement`, with: `plan`, `is_paid`, `max_naics_codes`, `naics_limit_applied`, `requested_naics_count`, `allowed_naics_count`, `blocked_naics_codes`, and a human-readable `message`.
- Markdown reports show a **Profile Assumptions — Plan Entitlement** section listing which NAICS were searched and which were withheld by the free-plan limit.
- CLI summary prints, for free over-limit profiles: `Free plan: searching 1 of N configured NAICS codes. (N-1) withheld by free-plan limit.`
- For testing without changing your profile, set `SAM_SPRINT_PLAN=paid` (or `free`) in the environment.

**This is entitlement enforcement only — not payment processing.** SourceDeck does not charge, collect billing information, or promise contract awards or revenue.

## Configuration

`SAM_GOV_API_KEY` is read **only from the process environment**. It is never stored in the Pursuit Profile, never logged, never embedded in any report payload. To configure:

```bash
export SAM_GOV_API_KEY=...      # value supplied by the operator; never paste into chat
node scripts/sam-opportunity-sprint.js
```

If the key is missing, the script exits 0 with status `not_configured` and prints configuration instructions — no network call is made.

The Pursuit Profile can be supplied via:

1. `--profile=/path/to/profile.json` flag, or
2. `reports/govcon-pursuit-profile.json`, or
3. `govcon-pursuit-profile.json` in the repo root, or
4. defaults from `services/govcon/govcon-pursuit-profile.js` (preliminary mode).

## Running

```bash
# Default — 30-day window, defaults profile
node scripts/sam-opportunity-sprint.js

# Custom profile
node scripts/sam-opportunity-sprint.js --profile=./my-profile.json

# npm script (if added)
npm run sam:sprint
```

## Output discipline

- **Top-10 draft cap**: the operator's `output_preference.top_draft_count` is clamped to [1, 10]. Drafts beyond rank 10 are not produced.
- **Manual approval required**: every draft carries `draft_only: true`, `auto_send: false`, `manual_approval_required: true`.
- **Plan-limit disclosure**: free plan reports identify searched NAICS and configured NAICS withheld by plan limit.
- **Blocked phrases**: `"guaranteed award"`, `"guaranteed savings"`, `"guaranteed ROI"`, `"guaranteed response"`, `"we guarantee"`, `"award-winning"`, `"preferred vendor of"` are filtered from every generated subject and body.
- **No compliance overclaim**: drafts use only the certifications named in the operator's profile; nothing is inferred or borrowed from the opportunity record.

## Limitations

- The SourceDeck GovCon workspace includes a manual-only SAM Opportunity Sprint card with plan-limit, profile-completeness, report-disclosure, and human-approval copy. It does not run the sprint from the UI.
- Reports are written to `./reports/` and are intentionally not committed; the operator decides whether to share or archive them.
- The score is decision support, not a guaranteed award predictor. Operators must apply judgement before any outreach.
- Scoring remains profile-driven. Incomplete profile data lowers ranking confidence even when NAICS coverage is available.

## What this is not

- Not an auto-bidder.
- Not an auto-sender.
- Not an email sending system; human approval remains required before any outreach.
- Not a Buffer/social-posting workflow.
- Not a guarantee of award, revenue, or response.
- Not a replacement for the deeper bid-fit analysis in `services/govcon/middleman-fit.js` (the sprint scorer is the fast, lane-aware first pass; middleman-fit is the deep dive after a target is selected).

## Safe rerun

Every run is idempotent: it overwrites the four report files under `./reports/`. Stop and rerun freely. No state is mutated outside `./reports/`.

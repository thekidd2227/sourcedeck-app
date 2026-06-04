# Runbook — SAM Sprint Profile Setup

Operator-facing guide for setting up the GovCon Pursuit Profile that drives SAM Opportunity Sprint scoring. **Read before relying on sprint rankings.**

## Why this matters

The sprint scorer takes two inputs: live SAM.gov opportunities, and your **GovCon Pursuit Profile**. The profile encodes who you are (company, certifications), what you're going after (goal, target NAICS, service lanes), where (geography), how fast (capacity), what you avoid (risk filters), and what you've done before (past performance).

Without a populated profile, the sprint runs but every report is marked `scoring_confidence: preliminary`. That signal exists because un-personalized rankings are decision support, not a recommendation to act.

## What is NOT in the profile

- ❌ `SAM_GOV_API_KEY` — the SAM.gov API key is read from `process.env` only and is never stored in the profile, never logged, never embedded in reports.
- ❌ Payment / billing identifiers — SourceDeck does not process payments and the profile carries no billing data.
- ❌ Any field matching `/api[-_]?key|token|secret|password|bearer|authorization/i` — the store strips these before write and refuses any payload that still contains a credential-shaped value.

## The eight scoring inputs the operator must configure

| # | Field group | Why it matters |
|---|---|---|
| 1 | Contract goal | 30/90-day revenue target + urgency level shape the urgency weighting in scoring. |
| 2 | Target NAICS | Direct +20 boost for exact-NAICS matches; the free-plan cap applies to this list. |
| 3 | Active service lanes | Lane-derived NAICS hints + keyword boosts (up to +15). |
| 4 | Geography | Primary states +12; outside-region with `national_allowed:false` penalizes -15 and raises a risk flag. |
| 5 | Certifications | Set-aside match +15 when the opportunity's set-aside matches a held certification (SDVOSB, MBE, HUBZone, etc.). |
| 6 | Capacity | `max_response_time_hours`, `can_quote_same_day`, `subcontractor_network_available` — capacity vs. opportunity deadline can add +5 or subtract -8 with a risk flag. |
| 7 | Risk filters | Clearance language → hard-stop NO-BID. Other filters (`avoid_large_construction`, `avoid_supply_only`, etc.) each subtract when their language pattern is present. |
| 8 | Past performance | `has_relevant_past_performance:true` adds +4; if the lane also matches, +3 more. |

## Setting up via the UI

1. Open SourceDeck → **GovCon** tab.
2. The **GovCon Pursuit Profile** card sits above the **SAM Opportunity Sprint** card. Click **⚙ Open GovCon Setup**.
3. Step through the wizard. Each field maps to one of the scoring inputs above.
4. Save. The wizard persists profile state through the existing SourceDeck settings layer.

The card displays plan-aware NAICS access: free users search 1 NAICS code per sprint; paid users search all configured NAICS. The cap applies to active query execution only — your saved `target_naics` list is never trimmed.

## Setting up via the CLI (operators running headless)

The CLI loads the profile in this priority order:

1. `--profile=/path/to/profile.json` flag
2. `SAM_SPRINT_PROFILE_PATH=/path/to/profile.json` env var
3. `reports/govcon-pursuit-profile.json` (legacy in-repo)
4. `./govcon-pursuit-profile.json` (legacy in-repo)
5. Canonical user-app-data path from `getDefaultProfilePath()`:
   - macOS: `~/Library/Application Support/SourceDeck/govcon-pursuit-profile.json`
   - Windows: `%APPDATA%\SourceDeck\govcon-pursuit-profile.json`
   - Linux: `$XDG_DATA_HOME/sourcedeck/govcon-pursuit-profile.json` (default `~/.local/share/sourcedeck/...`)
6. Built-in defaults (always scores `incomplete`)

Hand-edit a profile JSON:

```jsonc
{
  "business_identity": {
    "company_name": "ARCG Systems",
    "certifications": ["SDVOSB", "Small Business"]
  },
  "contract_goal": {
    "goal_name": "30-day capture",
    "target_revenue_30_days": 50000,
    "urgency_level": "immediate_revenue"
  },
  "service_lanes": {
    "janitorial_custodial": true,
    "painting_refresh": true
  },
  "target_naics": ["561720", "561210", "238320"],
  "geography": {
    "primary_states": ["VA", "MD", "DC"],
    "national_allowed": false
  },
  "capacity": {
    "can_perform_directly": true,
    "max_response_time_hours": 72,
    "can_quote_same_day": true,
    "subcontractor_network_available": true
  },
  "subscription": { "plan": "paid" }
}
```

Then point the CLI at it:

```bash
SAM_SPRINT_PROFILE_PATH=./my-profile.json node scripts/sam-opportunity-sprint.js
```

## Verifying readiness without an API call

Run the CLI with `SAM_GOV_API_KEY` unset:

```bash
unset SAM_GOV_API_KEY
node scripts/sam-opportunity-sprint.js
```

You will see:

```
[sam-sprint] status: not_configured
[sam-sprint] profile source: <path>
[sam-sprint] profile readiness: <incomplete|usable|strong|ready> (NN%, X/12 fields)
[sam-sprint] missing profile fields: N
[sam-sprint] scoring confidence: <preliminary|profile_driven>
[sam-sprint] plan: <free|paid|pro|team|enterprise> (paid=<bool>)
[sam-sprint] Free plan: searching K of N configured NAICS codes. (N-K) withheld by free-plan limit.
```

The script exits 0 with no network call. No reports are written until `SAM_GOV_API_KEY` is configured.

## Plan-aware NAICS access

| Plan | Max NAICS per sprint |
|---|---|
| `free` | 1 |
| `paid` · `pro` · `team` · `enterprise` | unrestricted |

- The cap applies to **active query execution only**. Your saved `target_naics` is preserved exactly.
- Lane-derived NAICS expansions are also subject to the cap on free.
- For local testing without changing your saved profile, override the plan via env: `SAM_SPRINT_PLAN=paid node scripts/sam-opportunity-sprint.js`. This accepts only a plan name — never a credential.

## What you will never see this tool do

- Send an email.
- Submit a bid or a quote.
- Contact an agency or a contracting officer.
- Process a payment or charge a card.
- Promise an award, revenue, response time, ROI, or savings.
- Make HIPAA / SOC 2 / FedRAMP / CMMC / FDA compliance claims.

Outreach drafts are generated for **review only** with `manual_approval_required: true`. The CLI surfaces the manual-review reminder on every run. Email transport is not bound anywhere in the sprint pipeline.

## Troubleshooting

| Symptom | What to check |
|---|---|
| CLI says `not_configured` even though I exported the key | Confirm the key was exported in the **same shell** that runs the script. `export SAM_GOV_API_KEY=...` does not persist across shells. |
| Profile source is `(defaults)` even though I saved one | Confirm the saved file exists at the path your environment expects — print `getDefaultProfilePath()` from a quick `node -e` or pass `SAM_SPRINT_PROFILE_PATH` explicitly. |
| Profile readiness stays `incomplete` after filling fields | Re-run the CLI and read the `missing profile fields` line. The five hard fields are: company name, target NAICS, service lanes, geography, contract goal. All five must be present to leave `incomplete`. |
| Sprint says `scoring_confidence: preliminary` but my profile looks fine | The label is downgraded when the profile is incomplete. Check the `Profile Completeness` section in the generated Markdown report — it lists every missing field by key and label. |
| Saved profile contains a stale API key from an older version | The store strips it on the next save. To force a clean rewrite: load → re-save without editing. The writer refuses any payload still containing a credential-shaped field. |
| Free plan is searching more NAICS than expected | The cap applies only to the **active** NAICS query set, but lane-derived NAICS additions are also capped. If you see more than 1 NAICS being queried on free, verify `SAM_SPRINT_PLAN` is not set to something else and that the profile's `subscription.plan` is `free` (or absent).  |

## Safe rerun

Every run is idempotent. Stop and rerun freely. The four report files under `./reports/` are overwritten in place; no other state is mutated.

## Where to find related docs

- Feature spec: `docs/features/sam-opportunity-sprint.md`
- Implementation audit: `docs/audits/sam-opportunity-sprint-implementation-audit.md`
- Release notes: `docs/release-notes/sam-opportunity-sprint.md`

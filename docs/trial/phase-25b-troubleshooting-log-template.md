# Phase 25B — Troubleshooting Log Template

**Date:** 2026-06-08
**Companion plan:** `docs/trial/phase-25b-7-day-internal-trial-plan.md`.
**Companion checklist:** `docs/trial/phase-25b-daily-test-checklist.md`.

This template structures the operator's local issue log during the 7-day trial. **Do not commit completed logs, screenshots, videos, console captures, or `.qa/` artifacts.** Keep them local. Carry only the summary into the go/no-go scorecard.

---

## Issue record schema

Use this exact shape for every issue encountered.

```
ISSUE_ID:               25B-<day>-<sequence>  (e.g., 25B-3-02)
DATE:                   YYYY-MM-DD
DAY_NUMBER:             0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
SCENARIO:               <which operator scenario from phase-25b-operator-scenarios.md>
FEATURE_AREA:           Setup Wizard | Settings/API Keys | SAM Sprint | Capture Command Center |
                        Operating Rhythm | Solicitation Workspace | Compliance Matrix |
                        Vendor Quote Room | Pricing Worksheet | Past Performance Library |
                        Capability Statement Studio | Prime Partner Finder | Stakeholder Graph |
                        Submission Readiness Gate | Internal Review Export | Audit Log |
                        Renderer Boot | Credential Boundary | Other
SEVERITY:               critical | high | medium | low
USER_VISIBLE_SYMPTOM:   <plain-English description of what the user sees>
REPRODUCTION_STEPS:
  1. <exact step>
  2. <exact step>
  3. <exact step>
EXPECTED_BEHAVIOR:      <what should happen>
ACTUAL_BEHAVIOR:        <what does happen>
SCREENSHOT_OR_VIDEO:    not committed; local only if needed
CONSOLE_OR_LOG_CLUE:    <copy/paste relevant console/log line — redact any secret values>
SUSPECTED_CAUSE:        <one-sentence hypothesis>
FIX_OWNER:              <operator name | engineering | docs>
STATUS:                 open | investigating | fixed | retest needed | accepted limitation
RETEST_RESULT:          n/a | pass | fail | partial
LAUNCH_IMPACT:          blocks Day 7 go-decision | needs fix before buyer outreach |
                        cosmetic / docs only | accepted limitation
```

---

## Severity definitions

| Severity | Definition |
|---|---|
| **critical** | Blocks the trial. **OR** risks unsafe send / submit / upload behavior. **OR** exposes secrets. **OR** crashes core workflow. **OR** allows a Phase 25A bounding-condition violation. |
| **high** | Blocks a core GovCon workflow (setup, SAM search, solicitation analysis, compliance review, vendor/pricing, past performance, capability statement, prime/stakeholder, submission readiness, internal review export). User cannot complete the workflow without an unsupported workaround. |
| **medium** | Confusing UX or non-blocking error. Workflow completes but with friction or an unclear state. Documentation gap that the operator must paper over verbally. |
| **low** | Cosmetic or documentation issue. Does not block the workflow or confuse the user materially. |

## Severity → decision rule

- **Any open critical** → Day 7 decision is forced to **BLOCKED — DO NOT SHOW BUYERS**.
- **Any open high** → Day 7 decision is **NEEDS FIXES BEFORE BUYER OUTREACH** at best; cannot select READY without resolving.
- **Open medium** → may still select READY if total medium count ≤ 5 and none of them is a credential-boundary or no-send/no-submit concern.
- **Low** → does not block any decision.

---

## Example completed record (synthetic)

```
ISSUE_ID:               25B-2-01
DATE:                   2026-06-10
DAY_NUMBER:             2
SCENARIO:               Facility services opportunity qualification
FEATURE_AREA:           SAM Sprint
SEVERITY:               medium
USER_VISIBLE_SYMPTOM:   SAM Sprint result list shows duplicate entries when NAICS filter and PSC filter are both active.
REPRODUCTION_STEPS:
  1. Setup Wizard complete; SAM key configured.
  2. Open SAM Sprint.
  3. Filter by NAICS 561210.
  4. Add filter by PSC S203.
  5. Click Search.
EXPECTED_BEHAVIOR:      Result list is deduplicated.
ACTUAL_BEHAVIOR:        Result list shows each opportunity twice when both filters are active.
SCREENSHOT_OR_VIDEO:    not committed; local only.
CONSOLE_OR_LOG_CLUE:    n/a
SUSPECTED_CAUSE:        Filter join logic likely produces a cartesian product instead of an intersection.
FIX_OWNER:              engineering
STATUS:                 open
RETEST_RESULT:          n/a
LAUNCH_IMPACT:          needs fix before buyer outreach
```

---

## Local log file (operator's convention)

The operator maintains a single local log file per day, e.g., `~/.sourcedeck-trial/day-2.log`. Each issue record is appended in the schema above. The file is **never** committed.

If the operator needs to share a log entry with engineering for Tier 2 escalation, the entry is shared via the secure escalation channel (NOT a public GitHub issue, NOT a public Slack), with all secret values redacted.

---

## Summary handoff to scorecard

At Day 7, the operator summarizes the log as:

- Total issues by severity: critical / high / medium / low.
- Specific feature areas with the most issues.
- Whether any credential-boundary or no-send/no-submit concern was raised.
- Whether any `Send Email` / `Submit Bid` / `Submit Quote` / `Export-and-submit` / portal-upload control was observed.
- Whether any "signed and notarized" / "Apple notarized" / "production signed" claim was observed.
- Whether any sample data exposed a real CO / COR / KO name.

That summary lands in the go/no-go scorecard. The raw log stays local.

---

## Signature

This template is the operator's structured issue log for the 7-day burn-in. Completed logs are not committed. Only the summary lands in the go/no-go scorecard.

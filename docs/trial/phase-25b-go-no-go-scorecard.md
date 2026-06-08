# Phase 25B — Go / No-Go Scorecard

**Date:** 2026-06-08
**Companion plan:** `docs/trial/phase-25b-7-day-internal-trial-plan.md`.
**Companion log template:** `docs/trial/phase-25b-troubleshooting-log-template.md`.

The operator fills this scorecard on Day 7 of the trial. Every row is scored **PASS** or **FAIL**. The decision rules in §3 determine the final outcome.

---

## 1. Scorecard rows

| # | Area | Evidence | PASS / FAIL |
|---|---|---|---|
| 1 | Setup Wizard | Auto-opens on clean state; all 11 steps complete; `setupComplete` persists; Settings "Run Setup Wizard" fallback works. | |
| 2 | Settings / API Keys | SAM.gov / AI / Creative / Social rows present; keys persist; no plain-text key value displayed back. | |
| 3 | SAM key boundary | SAM key requested **only** in Setup Wizard Step 5 and Settings → API Keys; never on SAM search / workflow / export / demo / log surfaces. | |
| 4 | Capture workflow | Capture Command Center + Operating Rhythm + bid/no-bid persist; new pursuit creates a card; deadlines surface. | |
| 5 | Solicitation / compliance | Solicitation Workspace clause + FAR/DFARS + requirements extraction usable; Compliance Matrix renders Section L / M. | |
| 6 | Vendor / pricing | Vendor Quote Room logs quotes (no auto-send); Pricing Worksheet builds cost stack. | |
| 7 | Past performance / capability | PP Library accepts a tagged record; Capability Statement Studio builds + locally exports a draft. | |
| 8 | Prime / stakeholder | Prime Partner Finder searches without sending outreach; Stakeholder Graph logs synthetic stakeholders; sample data has no real CO/COR/KO. | |
| 9 | Submission readiness | Submission Readiness Gate runs checklist; no submit-on-behalf control. | |
| 10 | Internal review export | Markdown export saves locally only; disclaimers present; no "submitted/sent/uploaded" claim. | |
| 11 | Audit log | Credential / save / export events log correctly; no secret value printed. | |
| 12 | `npm run troubleshooting:scan` | Exits clean; no fail / warn. | |
| 13 | `npm test` | Full chain exit 0. | |
| 14 | `npm run release:evidence` | `state: local_unsigned_dev`; `warnings: []`; `blockers: []`. | |
| 15 | Safety scan | No positive Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload claim; no signed-notarized / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim; no deprecated $79 / $349 / $999 pricing in active UI. | |

## 2. Issue summary (from troubleshooting log)

- Critical issues open: ___
- High issues open: ___
- Medium issues open: ___
- Low issues open: ___
- Any credential-boundary concern raised: yes / no
- Any no-send/no-submit/no-upload concern raised: yes / no
- Any signed-release / certification claim observed: yes / no
- Any real CO/COR/KO name observed in sample data: yes / no

## 3. Decision rules

### READY TO SEEK FIRST PILOT BUYER

Select this **only if** ALL of the following hold:

- ✅ Rows 1, 3, 9, 10, 13, 14, 15 are PASS.
- ✅ All 15 rows are PASS, with at most one row marked PASS-with-note (and that note is medium/low severity).
- ✅ Zero critical issues open.
- ✅ Zero high issues open.
- ✅ No credential-boundary concern raised.
- ✅ No no-send/no-submit/no-upload concern raised.
- ✅ No signed-release / certification claim observed.
- ✅ No real CO/COR/KO name observed in sample data.
- ✅ The operator was able to complete one full internal-review package end-to-end (Scenario 8 + Scenario 9).

### NEEDS FIXES BEFORE BUYER OUTREACH

Select this when:

- Medium issues remain but core workflow mostly works.
- Onboarding has friction that the operator had to paper over verbally.
- A manual workaround is required to complete one of Rows 4–11.
- Up to 1 high issue is open AND the operator has a documented fix plan AND the high issue does not violate the credential or no-send/no-submit boundary.

When this decision is selected, the operator opens narrowly-scoped fix PRs against the issues. The 7-day trial reruns once the fixes land.

### BLOCKED — DO NOT SHOW BUYERS

Force-select this when **any** of the following holds:

- ❌ Any open critical issue.
- ❌ Any open high issue that violates the credential boundary, no-send/no-submit boundary, or sample-data sanitization invariant.
- ❌ Any send / submit / upload unsafe behavior observed.
- ❌ Any secret appeared in any visible surface, console output, or log file.
- ❌ App crashed in a core workflow (Setup, SAM Sprint, Solicitation Workspace, Internal Review Export).
- ❌ `npm test`, `npm run release:evidence`, `npm run troubleshooting:scan`, or `node scripts/release-check.js` failed at Day 7.
- ❌ Any signed-release / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim was observed in active runtime.
- ❌ A real CO / COR / KO name appeared in sample / demo data.

When this decision is selected, Tier 2 escalation is required. The product is **not** shown to buyers until the blocker is resolved.

## 4. Decision (operator selects exactly one)

- [ ] READY TO SEEK FIRST PILOT BUYER
- [ ] NEEDS FIXES BEFORE BUYER OUTREACH
- [ ] BLOCKED — DO NOT SHOW BUYERS

## 5. Buyer-readiness recommendation (5–10 sentences)

> [Operator writes 5–10 sentences anchored to the rows above and the troubleshooting log summary. State which areas were strongest, which had friction, what the recommended next phase is, and any required engineering follow-up. Do not editorialize about future-state features that don't exist.]

## 6. Signatures

Operator: ____________________ Date: __________

Tier 2 reviewer (if BLOCKED or NEEDS FIXES): ____________________ Date: __________

---

## Signature

This scorecard is the canonical Day 7 decision artifact for the Phase 25B 7-day internal trial. The decision drives the next phase: buyer-package work (only if READY) or fix PRs (NEEDS FIXES) or Tier 2 escalation (BLOCKED).

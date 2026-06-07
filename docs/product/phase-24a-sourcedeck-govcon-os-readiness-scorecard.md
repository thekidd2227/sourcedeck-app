# Phase 24A — SourceDeck GovCon OS Readiness Scorecard

**Date:** 2026-06-07
**Companion:** `docs/audits/phase-24a-final-product-release-readiness-gate.md` (this PR)
**Foundation:** `docs/product/phase-24a-sourcedeck-final-readiness-scorecard.md` (PR #81)

## Executive call

**READY FOR PAID PILOT** — guided design-partner pilots only. Not yet ready
for unattended public sale.

## Scorecard — 20 areas (per task spec)

| # | Area | Status | Evidence (test + service refs) | Buyer impact | Risk | Required next action |
|---|---|---|---|---|---|---|
| 1 | GovCon default / cold-open | **READY** | Phase 23C 23/23 (govcon-primary-navigation); first frame `tab-govcon`; brand sub-label "GovCon Capture OS" | First impression frames buyer's pitch | Low | None |
| 2 | Capture Command Center | **READY** | Phase 22B 15/15 (govcon-capture-command-center); `#gc-capture-cc`; 8 stat cards | Day-1 buyer landing surface | Low | None |
| 3 | Opportunity qualification | **READY** | Bid/no-bid card in `#gc-capture-cc`; `services/govcon/opportunity-records.js`; `targeting-profile.js` | Buyer's daily triage | Low | None |
| 4 | Solicitation workspace | **READY** | Phase 22C 19/19 (govcon-solicitation-workspace); `#gc-sol-workspace`; `solicitation-analysis.js`, `deadline-extraction.js` | Highest-value surface in demo | Low | None |
| 5 | Compliance matrix | **READY** | 10-column matrix inside `#gc-sol-workspace`; `services/govcon/compliance-matrix.js`; manual "Mark Reviewed" only (no auto-mark) | Demonstrates rigor to contracting team | Low | None |
| 6 | Vendor / subcontractor quote room | **READY** | Phase 22D 25/25 (govcon-vendor-pricing); `#gc-vqr`; status "Requested manually"; `services/govcon/subcontractor-sourcing.js` | Subcontractor management | Low | None |
| 7 | Pricing worksheet | **READY** | `#gc-pricing`; advisory price/margin from labor/materials/vendor/overhead/profit/contingency; <5% / >35% warnings; `services/govcon/pricing-intelligence.js` | Pricing math, advisory only | Low | None |
| 8 | Past performance library | **READY** | Phase 22E 24/24 (govcon-past-performance-prime); `#gc-pp`; operator-typed records | Proposal foundation | Low | None |
| 9 | Capability statement studio | **READY** | `#gc-cs`; draft-only with "SourceDeck does not send capability statements or outreach" footer; `services/govcon/capability-statement-extractor.js` | Marketing artifact for proposal | Low | None |
| 10 | Prime partner finder | **READY** | `#gc-ppf`; manual status chips; `services/govcon/prime-partner-finder.js` | Teaming pipeline | Low | None |
| 11 | Submission readiness gate | **READY** | Phase 22F 30/30 (govcon-submission-readiness); `#gc-sub-gate`; advisory score; "Human Review Required" notice; `services/govcon/submission-readiness.js` | Final pre-submit checklist | Low | None |
| 12 | Internal-review Markdown export | **READY** | Phase 23H 32/32 (govcon-demo-recording-blockers); INTERNAL REVIEW DRAFT — NOT SUBMITTED header + footer; SAMPLE DEMO DATA banner; local Blob download only | Take-home buyer artifact | Low | None |
| 13 | Response Desk | **READY** | 24/24 (response-desk) + 20/20 (response-desk-email-import); Import Email button; draft-only; `human_approval_required:true`; **no Send Email button anywhere in the renderer** (asserted by 7/7 renderer-boot test #7) | Reply triage | Low | None |
| 14 | SAM Sprint | **READY** | 62/62 (sam-opportunity-sprint); Free=1 NAICS; `manual_review_required:true`; `auto_send:false`; `services/govcon/sam-opportunity-sprint.js`, `scripts/sam-opportunity-sprint.js` | Discovery channel | Low | None |
| 15 | No-send / no-submit / no-upload boundaries | **READY** | 711 negative-grep hits (all forbidden-term-ABSENT assertions or do-not-say lists); zero positive unsafe claims in `sourcedeck.html`; opportunity-outreach `sendingEnabled: false`, `requiresApproval: true` (28/28 PASS after this PR's stale-fixture fix) | Trust / legal foundation | Low | None |
| 16 | Navigation & default state | **READY** | Phase 23C 23/23; default-state-policy 22/22; renderer init defaults to `tab-govcon`; `localStorage` fallback also resolves to `govcon` | First impression | Low | None |
| 17 | Show All Tools toggle | **READY** | Phase 23C `gcToggleAllTools()`; collapses `nav-section[data-other-business-tools]` via `display:none`; no DOM removal; reversible | Reduces buyer distraction | Low | Phase 24D will collapse legacy tools by default for new profiles (currently default = Shown) |
| 18 | Buyer demo docs | **DOCS-ONLY READY** | Phase 22G + 23F master script (30s/60s/5min/15min openers + objection handling + do-not-say list); Phase 23F shot list (18 shots); Phase 23F recording checklist; Phase 23G/23I clean review; Phase 23J website integration plan; Phase 23K blockers doc | Operator demo guidance | Low | None for pilot; operator video clips deferred (Phase 24B) |
| 19 | Website readiness (excluding clips) | **FUTURE PHASE** | Phase 23J website demo clip integration plan merged; Phase 23K integration blockers documented; separate website repo | Public marketing surface | Medium | Out of scope for pilot; revisit after 24B + 24C |
| 20 | Commercial launch readiness | **NEEDS POLISH** | Unsigned/unnotarized desktop build (Phase 23E `signed-demo-build.yml` workflow exists but not yet executed end-to-end for a specific artifact; `release-check` honestly warns); no self-serve onboarding/payment flow; integrations require manual configuration | Gates *public sale*, not a *paid pilot* | Medium | Phase 24C (signed build + pilot runbook) + Phase 24D (GovCon-first onboarding) |

## Status legend

- **READY** — ship-quality on `main`; backed by passing tests and asserted safety boundaries.
- **NEEDS POLISH** — works correctly but go-to-market friction remains (not a correctness gap).
- **RELEASE BLOCKER** — would block paid-pilot ship. **NONE on current `main`** after this PR's stale-fixture fix.
- **HIDE FROM BUYER** — surface that is reachable but should not be the focus of the first-frame buyer view. *Currently the legacy "Other business tools" group qualifies as soft-hide; Phase 24D tightens this.*
- **DOCS-ONLY** — area is delivered via documentation, not runtime UI (e.g., master script).
- **FUTURE PHASE** — out of scope for current paid pilot; tracked for a future phase.

## What no longer needs scoring

These areas are **permanently retired** on current `main` and confirmed
by guard tests:

- **System Readiness / System Flow tab** — REMOVED by Phase 21F (PR #58, merge `b93e06e`); guarded by `test/remove-system-readiness-tab.test.js` (9/9 PASS). Do not restore.
- **PROD-02 / PROD-03 / PROD-04 / PROD-05 / 4595758** — internal Phase 21E contamination markers; none appear in the active renderer. Stale Phase 21E PR #80 was closed without merging; branch preserved per hard rule.
- **Demo video `.mp4` clips** — deferred per the prior session decision (raw-quality recording at 3.3 GB per clip is not the right shape). Phase 24B re-enters this work with an encoding standard first.

## Blockers separated

- **Code blockers:** NONE.
- **UX blockers:** NONE blocking pilot. Polish item (legacy tools dilute GovCon story) → Phase 24D.
- **Media blockers:** demo video clips do not exist → Phase 24B.
- **Website blockers:** out of scope (separate repo / Phase 23J/K tracked).
- **Commercial blockers:** unsigned/unnotarized build + no self-serve onboarding → Phase 24C.
- **Compliance / claims blockers:** NONE.

## Decision

**READY FOR PAID PILOT.** Same call as PR #81. The stale-fixture
release blocker found during this gate run has been fixed (1-line edit
to `test/govcon-opportunity-outreach.test.js`; no production code
touched). All 54 test files green; all 6 release gates green; all
safety boundaries intact.

Next 3 phases: **24B Buyer-Demo Asset Capture** → **24C Pilot
Packaging & Signed-Build Readiness** → **24D GovCon-First Buyer
Surface Tightening**. Detail in the audit doc §8.

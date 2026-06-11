# Phase 25N · GovCon Overview Cleanup Audit

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Buyer-reported pain (screenshots)

The pre-25N GovCon pane rendered as a single long scroll with 10+ blocks visible on cold open:

1. Phase 25F sticky "Jump to" pill bar
2. GovCon Mode — Capture OS workflow banner (Phase 23B)
3. GovCon Mode · Demo Controls block (Phase 23A)
4. GovCon Capture Command Center cards (Phase 22B): Active Pursuits · Deadlines this week · Q&A · Bid/No-Bid Review · Solicitation Readiness · Vendor Needs (capture board) · Proposal Package Status · Human Approval Required
5. Operating Rhythm panels (audit log nested inside)
6. Solicitation Workspace
7. Vendor Quote Room + Pricing Worksheet
8. Past Performance + Capability + Prime Partner
9. Stakeholder Graph
10. Submission Readiness Gate + Package Export
11. GovCon Pursuit Profile copy block
12. SAM Opportunity Sprint card
13. Legacy KPI strip + opportunity table

Buyer feedback: *"GovCon and Dashboard still look too crowded and overwhelming."*

## 2. Phase 25N intervention matrix

| Pre-25N surface                          | Phase 25N routing                                                                | Status              |
|------------------------------------------|----------------------------------------------------------------------------------|---------------------|
| `<nav id="gc-section-nav">` (Phase 25F)  | Replaced by `<nav id="gc-tab-nav" role="tablist">` with real tab buttons          | Retired             |
| `#gc-mode-indicator`                     | `data-gc-tab-page="hidden-internal"` + inline `display:none`                     | DOM preserved · hidden |
| `#gc-demo-mode`                          | `data-gc-tab-page="hidden-internal"` + inline `display:none`                     | DOM preserved · hidden |
| `#gc-capture-cc`                         | `data-gc-tab-page="hidden-internal"` + inline `display:none`                     | DOM preserved · hidden |
| `#gc-operating-rhythm` (contains `#gc-audit-log`) | `data-gc-tab-page="hidden-internal"` + inline `display:none`           | DOM preserved · hidden |
| `#gc-sol-workspace`                      | `data-gc-tab-page="solicitation"` + inline `display:none`                        | Surfaced on Solicitation tab |
| `#gc-vqr-pricing`                        | `data-gc-tab-page="vendors-pricing"` + inline `display:none`                     | Surfaced on Vendors + Pricing tab |
| `#gc-pp-cs-pp` + `#gc-stakeholder-graph` | `data-gc-tab-page="past-performance"` + inline `display:none`                    | Surfaced on Past Performance tab |
| `#gc-sub-gate` (contains `#gc-pkg-export`) | `data-gc-tab-page="submission-readiness"` + inline `display:none`               | Surfaced on Submission Readiness tab |
| `govcon-pursuit-profile-card`            | `data-gc-tab-page="hidden-internal"` + inline `display:none`                     | DOM preserved · hidden |
| `sam-sprint-card`                        | `data-gc-tab-page="hidden-internal"` + inline `display:none`                     | DOM preserved · hidden |
| Legacy `#gc-kpis` + `#gc-tbody` strip    | Wrapped in `<div data-gc-tab-page="hidden-internal" style="display:none">`        | DOM preserved · hidden |

## 3. New tabs (each with focused content)

- **Find Opportunities** (default) — key status pill, Search SAM.gov, Upload Solicitation, Paste Solicitation Text, saved-pursuits preview, empty state.
- **Saved Pursuits** — saved/pursuing opportunities table.
- **Solicitation** — surfaces `#gc-sol-workspace`.
- **Scope** — stub steering to Proposal Workspace → Solicitation intake.
- **Vendors + Pricing** — surfaces `#gc-vqr-pricing`.
- **Past Performance** — surfaces `#gc-pp-cs-pp` + `#gc-stakeholder-graph`.
- **FAR Reference** — advisory reference list; full reference lands with Phase 25I-recovery.
- **Submission Readiness** — surfaces `#gc-sub-gate`.
- **Audit Log** — stub describing local-only audit trail.

## 4. Safety scan

| Query                                   | Active-runtime hits | Status |
|-----------------------------------------|--------------------:|--------|
| `data-gc-tab="overview"`                 |                   0 | ✅     |
| Tab nav button labeled "Overview"        |                   0 | ✅     |
| Default `gcTabSwitch` invocation pointing to anything other than `find-opportunities` | 0 | ✅ |
| Visible Phase labels on Find Opportunities tab |             0 | ✅     |
| `type="password"` input on Find Opportunities |              0 | ✅     |
| `id="s-samkey"` on Find Opportunities    |                   0 | ✅     |
| `>Submit Bid<` / `>Submit Quote<` / `>Send Email<` |         0 | ✅     |
| `upload to SAM` / `upload to PIEE` / `upload to eBuy` (affirmative) | 0 | ✅ |
| `auto-contact vendors/agencies` (affirmative) |              0 | ✅     |
| `certified compliant` / `legally sufficient` / `provides legal advice` | 0 | ✅ |
| `2026-06-04` stale timestamp on Find Opportunities tab |     0 | ✅     |

## 5. Carried-forward invariants

- Phase 25L-1: sidebar surfaces 8 items; GovCon sidebar label preserved.
- Phase 25L-2: Calendar event Edit/Delete + ICS help + Settings Calendar Import preserved.
- Phase 23C: every commercial nav button + pane remains reachable.
- Phase 25A: no-send / no-submit / no-upload boundary.
- Approved SourceDeck logo unchanged.

## 6. Tests

- `test/phase-25n-govcon-tab-pages.test.js` — tab structure, default tab, switch-and-hide behavior (vm sandbox).
- `test/phase-25n-govcon-overview-removed.test.js` — `data-gc-tab="overview"` absent, hidden-internal routing on retired sections, legacy KPI/table wrapped.
- `test/phase-25n-govcon-copy-cleanup.test.js` — no stale demo/internal copy on Find Opportunities, no raw key input, no affirmative submit/upload/legal-advice claims globally.
- `test/phase-25f-govcon-sections.test.js` updated for Phase 25N supersession.

`npm test` → 62 PASS, 0 FAIL.
`npm run govcon:smoke` → 47 PASS, 0 FAIL.
`npm run troubleshooting:scan` → no fail/warn findings.
`node scripts/release-check.js` → privacy gate passes.

## 7. Paid-pilot readiness gate impact

Phase 25N does not flip any of the Phase 25K readiness boxes. Operator regenerates Day 0 trial package after merge to take the cleanup live.

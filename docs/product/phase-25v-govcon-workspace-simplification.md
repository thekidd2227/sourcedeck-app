# Phase 25V — GovCon Workspace Simplification

Product cleanup of the GovCon workspace and Proposal Workspace based on user
review screenshots. This phase removes clutter and repairs broken flows; it is
not a redesign and adds no unrelated features.

## What changed

### Removed clutter
- **GovCon Outreach OS card** — the `div.gc-os-helper` "GovCon Outreach OS"
  journey card rendered with no `data-gc-tab-page` tag, so it appeared at the
  bottom of every GovCon tab. Removed. Its no-send / draft-only posture is
  preserved by concise per-tab footers and inline microcopy.
- **Heavy "Human Review Required" bottom panels** — the large burgundy
  warning blocks at the bottom of the Solicitation, Vendors, Pricing, Past
  Performance, and Submission Readiness tabs are replaced with a small
  concise footer:
  > Draft-only workspace. SourceDeck does not submit, upload, or send external
  > messages.
- **Scope tab** — removed. Scope of Work extraction lives in Proposal
  Workspace → Solicitation Intake → Extract Key Details. The redundant GovCon
  "Scope" tab that only linked to Proposal Workspace was removed entirely.
- **Stakeholder Graph** — removed from the runtime (section, sample rows, tour
  entry, and JS handlers). See
  [phase-25v-govcon-clutter-removal-audit](../audits/phase-25v-govcon-clutter-removal-audit.md).

### Restructured tabs
GovCon tab order is now:

1. Find Opportunities
2. Saved Pursuits
3. Solicitation
4. **Vendors** (split from "Vendors + Pricing")
5. **Pricing** (split from "Vendors + Pricing")
6. Past Performance
7. **Prime Partners** (promoted from inside Past Performance)
8. FAR Reference
9. Submission Readiness
10. Audit Log

### Sidebar order
Proposal Workspace moved directly under GovCon:

1. Dashboard
2. GovCon
3. **Proposal Workspace**
4. Leads
5. Calendar
6. Response Desk
7. Settings
8. Help / FAQ

Prime Partners stays as a focused GovCon tab (the cleanest option — no
duplicate sidebar link).

### Proposal Workspace
- **Capability Statement Studio** moved out of GovCon → Past Performance into
  the Proposal Workspace pane as a focused card (`#pw-capability-studio`).
- See
  [phase-25v-capability-statement-studio-contract](phase-25v-capability-statement-studio-contract.md).

## Preserved invariants
- Canonical Find Opportunities SAM.gov search section.
- NAICS Finder + Saved NAICS Profiles.
- Result-count selector 25 / 50 / 75 / 100.
- Blank-canvas default state (no sample preload for a real user).
- Approved SourceDeck logo.
- No-send / no-submit / no-upload boundaries (warnings made concise).

## Tests / gates
New: `phase-25v-govcon-clutter-removal`, `phase-25v-saved-pursuits-solicitation-linkage`,
`phase-25v-vendors-pricing-persistence`, `phase-25v-capability-studio-workflow`,
`phase-25v-prime-partner-page`, `phase-25v-stakeholder-graph-removal`,
`phase-25v-blank-demo-data` (all wired into `npm test`).

Updated: `phase-25n-govcon-tab-pages`, `phase-25f-govcon-sections`,
`phase-25l1-navigation-cleanup`, `govcon-past-performance-prime`,
`govcon-prompt-naics-parameterization`, `govcon-final-runtime-polish`,
`setup-wizard-first-run`. Retired: `govcon-stakeholder-graph-ui`.

All required gates pass: `npm test`, `govcon:smoke`, `troubleshooting:scan`,
`release-check.js`.

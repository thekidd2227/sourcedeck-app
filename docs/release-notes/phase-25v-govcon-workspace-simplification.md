# Release Notes — Phase 25V: GovCon Workspace Simplification

## Summary
Product cleanup of the GovCon workspace and Proposal Workspace, plus repair of
the saved-solicitation workflow.

## Highlights
- Removed the **GovCon Outreach OS** clutter card from every GovCon tab.
- Replaced the heavy **"Human Review Required"** bottom panels with a small
  concise safety footer.
- Removed the redundant **Scope** tab (extraction lives in Proposal Workspace
  → Solicitation Intake).
- Removed the **Stakeholder Graph** from the runtime.
- Split **Vendors + Pricing** into two focused tabs: **Vendors** and
  **Pricing**, with per-solicitation persistence (data no longer vanishes when
  switching tabs).
- Connected **Saved Pursuits** to the Solicitation / Vendors / Pricing / Prime
  Partners selectors; selecting a saved pursuit loads its metadata.
- Moved **Capability Statement Studio** under Proposal Workspace; the
  "Tailored Capability Statement Outline" became a functional **Capability
  Statement Preview** (with a synthesized closing/fit statement and a local
  draft export).
- Promoted **Prime Partners** to its own GovCon tab with add / edit / delete
  rows persisted per solicitation.
- Moved **Proposal Workspace** directly under GovCon in the sidebar.
- Confirmed **blank-canvas** default — no sample/demo data preloads for a real
  user; demo data loads only via an explicit operator action.

## Safety
- No `.env` changes. No secrets printed. No raw SAM key display.
- No auto SAM search on load.
- No email sending. No vendor / agency auto-contact.
- No bid / quote / proposal submission. No portal upload.
- No pricing source-of-truth change. No checkout / payment change.
- Draft-only boundaries preserved with concise copy.

## Tests / gates
Added 7 Phase 25V tests; updated 7 existing tests; retired the
stakeholder-graph UI test. All required gates pass: `npm test`,
`govcon:smoke`, `troubleshooting:scan`, `release-check.js`.

## Next
Merge when green, rebuild the app package, refresh the Day 0 package, then
manually verify Saved Pursuits, Solicitation Workspace, Vendors, Pricing, and
Capability Statement Studio.

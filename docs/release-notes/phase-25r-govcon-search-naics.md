# Phase 25R — GovCon Search Merge + NAICS · Release Note

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## What ships

1. **One canonical SAM.gov search section.** The duplicate Phase 25M `#gc-sam-pipeline` section is routed to hidden-internal. The canonical `#gc-tab-find-opportunities` section now carries the merged filter row: Keyword · NAICS · Set-aside · Place of Performance · Closing within (days) · Status/type — plus a Saved NAICS profile selector and a Find NAICS button.
2. **Refresh + Clear filters** controls join Search SAM.gov + the 25/50/75/100 result-count selector in the canonical action row.
3. **Status line carries "visible" count**: *"Showing up to N results · returned X · visible Y · last run …"*.
4. **NAICS Finder modal.** Browse the 20 canonical NAICS 2022 sections, filter by code or description, multi-select codes, apply or save as a named profile.
5. **Saved NAICS profiles** persist via electron-store (`govcon.naicsProfiles`) with localStorage fallback (`sd.govcon.naicsProfiles.v1`). One-default-at-a-time invariant. Profiles populate the Find Opportunities selector and apply codes to the NAICS field on selection.

## What does NOT change

- All Phase 25Q / 25Q-2 SAM search rendering behavior is preserved.
- Save to SourceDeck / Mark Pursue / Archive / Open SAM.gov Source remain on each result row.
- Saved Pursuits tab still surfaces saved/pursuing opportunities only.
- Proposal Workspace solicitation selector still reads `sd.govcon.opportunities.list()`.

## Safety

- No `.env` touched · No secrets printed · No stashes touched
- No deploy · No public release · No GitHub release
- No auto-search on load · raw SAM key never in DOM/logs/docs/exports
- No portal upload · no email send · no auto-contact
- NAICS is search/filter support — not legal classification advice or official NAICS classification

## Tests + gates

- `npm test` → 78 PASS suites, 0 FAIL
- `npm run govcon:smoke` → 47 PASS, 0 FAIL
- `npm run troubleshooting:scan` → no fail/warn findings
- `node scripts/release-check.js` → privacy gate passes

## Operator next step

Merge when green, rebuild app package, refresh Day 0 package, then manually verify one SAM search section and saved NAICS profiles.

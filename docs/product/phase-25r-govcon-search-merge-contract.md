# Phase 25R — GovCon SAM Search Merge Contract

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Defect

Two overlapping SAM.gov search surfaces lived on GovCon → Find Opportunities:

1. The canonical Phase 25N `#gc-tab-find-opportunities` section with the Phase 25Q result-count selector + Save/Pursue actions.
2. The Phase 25M `#gc-sam-pipeline` ("GovCon Pipeline — Search SAM.gov · Save · Pursue") with its own keyword/NAICS/set-aside/place/closing filter row, its own Search button, and its own results table.

Phase 25P had routed the Phase 25M section to `find-opportunities` so it had a home, but that meant the buyer saw two SAM search forms — one above, one below.

## 2. Fix

- The Phase 25M `#gc-sam-pipeline` section is routed to `data-gc-tab-page="hidden-internal"`. Its DOM stays reachable for any programmatic caller (Phase 23C reachability invariant) but it never appears on cold open.
- The canonical `#gc-tab-find-opportunities` section gains the merged filter row: Keyword · NAICS · Set-aside · Place of Performance · Closing within (days) · Status/type.
- Plus a Saved NAICS profile selector and a Find NAICS button next to the NAICS input.
- Plus a Refresh and Clear filters button alongside the existing Search SAM.gov + result-count selector.
- `gcTabSearchSam()` now reads the merged filter row via `_samFilters()`, sets `filters.limit = _samLimit()`, and passes the full object to `sd.govcon.samSearch(filters)`.
- Status line now announces *"Showing up to N results · returned X · visible Y · last run …"*.

## 3. Tests

- `test/phase-25r-govcon-search-merge.test.js` — single search form; merged filter row; Find NAICS wired; Refresh + Clear filters; result-count selector preserved; canonical results container; status line carries "visible".
- Updated `test/phase-25p-govcon-section-routing.test.js` to allow `data-gc-tab-page="hidden-internal"` on `#gc-sam-pipeline` (Phase 25R supersession).
- Updated `test/phase-25q-sam-result-count-selector.test.js` to accept `filters.limit = limit` as the new "limit is passed into the IPC" pattern.

`npm test` → 78 PASS suites, 0 FAIL.

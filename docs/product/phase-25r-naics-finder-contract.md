# Phase 25R — NAICS Finder Contract

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Give buyers a way to discover NAICS codes from within SourceDeck instead of jumping to acquisition.gov / census.gov. The Finder shows the canonical NAICS 2022 section menu (20 sectors), lets the user filter by code or description, multi-select codes, and either apply the selection to the GovCon NAICS field or save the selection as a named profile.

## 2. NAICS section menu

Seeded from the local NAICS reference. Twenty sectors:

| Code   | Section                                                                                |
|--------|----------------------------------------------------------------------------------------|
| 11     | Agriculture, Forestry, Fishing and Hunting                                              |
| 21     | Mining, Quarrying, and Oil and Gas Extraction                                           |
| 22     | Utilities                                                                               |
| 23     | Construction                                                                            |
| 31-33  | Manufacturing                                                                           |
| 42     | Wholesale Trade                                                                         |
| 44-45  | Retail Trade                                                                            |
| 48-49  | Transportation and Warehousing                                                          |
| 51     | Information                                                                             |
| 52     | Finance and Insurance                                                                   |
| 53     | Real Estate and Rental and Leasing                                                      |
| 54     | Professional, Scientific, and Technical Services                                        |
| 55     | Management of Companies and Enterprises                                                 |
| 56     | Administrative and Support and Waste Management and Remediation Services                |
| 61     | Educational Services                                                                    |
| 62     | Health Care and Social Assistance                                                       |
| 71     | Arts, Entertainment, and Recreation                                                     |
| 72     | Accommodation and Food Services                                                         |
| 81     | Other Services (except Public Administration)                                           |
| 92     | Public Administration                                                                   |

## 3. Six-digit codes seeded (no invented codes)

Phase 25R ships the following SourceDeck-relevant six-digit codes from the local reference. Codes whose description we could not verify are intentionally omitted; the finder's empty-search state directs the user to add unlisted codes manually in the NAICS field on the search form.

| Code   | Description                                                                  | Sector |
|--------|------------------------------------------------------------------------------|--------|
| 236220 | Commercial and Institutional Building Construction                            | 23     |
| 238210 | Electrical Contractors and Other Wiring Installation Contractors              | 23     |
| 238220 | Plumbing, Heating, and Air-Conditioning Contractors                           | 23     |
| 238320 | Painting and Wall Covering Contractors                                        | 23     |
| 531311 | Residential Property Managers                                                 | 53     |
| 531312 | Nonresidential Property Managers                                              | 53     |
| 541330 | Engineering Services                                                          | 54     |
| 541611 | Administrative Management and General Management Consulting Services          | 54     |
| 541618 | Other Management Consulting Services                                          | 54     |
| 541990 | All Other Professional, Scientific, and Technical Services                    | 54     |
| 561210 | Facilities Support Services                                                   | 56     |
| 561710 | Exterminating and Pest Control Services                                       | 56     |
| 561720 | Janitorial Services                                                           | 56     |
| 561730 | Landscaping Services                                                          | 56     |
| 561790 | Other Services to Buildings and Dwellings                                     | 56     |
| 624230 | Emergency and Other Relief Services                                           | 62     |

## 4. Behavior

- **Open**: `naicsFinderOpen()` flips the modal's display to `flex`. Pre-populates the multi-select with whatever is already in the NAICS field.
- **Filter**: search box accepts code prefix or description substring (case-insensitive). The All-sections dropdown can scope the list.
- **Multi-select**: each row has a checkbox; toggling tracks the running selection.
- **Apply**: `naicsFinderApplySelection()` writes the selected codes (comma-separated) into the GovCon NAICS field and closes the modal.
- **Save as profile**: `naicsFinderSaveProfile()` requires a non-empty name and at least one selected code. See `phase-25r-saved-naics-profiles.md`.

## 5. Boundaries

- SourceDeck uses NAICS for search/filter support only — **not legal classification advice** and **not official NAICS classification**. The same copy ships at the bottom of the Finder modal.
- No external upload, no API key required, no government portal call.

## 6. Tests

- `test/phase-25r-naics-finder.test.js` — modal scaffolding, handlers, section table, code table, sandbox simulation that opens the finder, filters by "561", multi-selects two codes, applies, and asserts the NAICS field is populated.

`npm test` → 78 PASS suites, 0 FAIL.

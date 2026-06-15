# Phase 25S — SAM.gov Filter Enforcement + Solicitation Source Repair (Contract)

Status: implemented · branch `fix/phase-25s-sam-filter-open-source`
Owner: GovCon Capture surface (Find Opportunities tab)

## Problem statement

A buyer entered NAICS 541611 into the Find Opportunities filter, ran a
SAM.gov search, and the result table showed opportunities carrying NAICS
334519, 333415, and 333611. The set-aside filter was similarly ignored
on a subset of results. Two compounding defects:

1. **The SAM.gov public opportunities API does not consistently honor
   every filter we forward.** Some endpoints accept `naics` as a query
   parameter, some return broader matches when a code is supplied, some
   ignore the field when it cannot be matched against an internal
   taxonomy.
2. **The renderer did not re-filter the returned rows.** Whatever SAM.gov
   sent back was rendered as-is, so the buyer saw a result list that
   appeared to contradict their own filters.

Secondary defects that surfaced during the same pass:

- **`[object Object]` in the "Place of Performance" column.** SAM.gov
  returns nested `{ city, state, zip, country }` objects; the previous
  row template stringified the raw value.
- **"Open SAM.gov Source" was unreliable.** When `uiLink` was missing
  it fell back to `r.url`, which on some endpoints is the raw
  `api.sam.gov` URL — including the operator's `api_key=…` query
  parameter — and on others is empty.
- **"View Details" surfaced a toast only.** Nothing for the buyer to
  read on screen.

## Contract

### 1. Local filter backstop

`gcTabSearchSam()` now passes the filters to `sd.govcon.samSearch` AND
applies `_samApplyLocalFilters(raw, filters)` to the returned rows
before render. The status line and toast both surface two counts:

- **returned** — how many rows SAM.gov sent back (pre-filter).
- **visible** — how many rows survived the local backstop.

If the post-filter count is zero but the pre-filter count is non-zero,
the status line names the filter(s) that were enforced locally:

> SAM.gov returned 25 rows but none matched NAICS 541611 + set-aside sdvosbc. Clear those filters or pick different values.

### 2. NAICS matching

`_samRowNaics(r)` reads `naicsCode`, `naics`, or `naicsCodes[0]` (string
or `{ code, value }` object). `_samMatchesNaics(r, naicsField)` accepts
the comma/space/semicolon-separated input from the search form and
returns `true` only when the row's normalized NAICS appears in the
requested set. Empty filter → pass everything (no filter applied).

### 3. Set-aside matching

`_samRowSetAside(r)` reads `typeOfSetAsideDescription`,
`typeOfSetAside`, or `setAside` (string or `{ description, name, code }`).
`_samMatchesSetAside(r, setAsideField)` applies a small alias table to
bridge the dropdown codes to SAM.gov's varied descriptions:

| Dropdown code | SAM.gov substrings (case-insensitive) |
| ------------- | -------------------------------------- |
| `sba`         | `small business`, `sba`                |
| `sdvosbc`     | `sdvosb`, `service-disabled veteran`   |
| `wosb`        | `wosb`, `edwosb`, `women-owned`        |
| `hzc`         | `hubzone`, `hub zone`                  |
| `8a`          | `8(a)`, `8a`                           |
| `vsa`         | `vosb`, `veteran-owned`                |

Empty / "Any" → pass everything.

### 4. Active filter chips

`_samRenderFilterChips(filters)` writes a single-line summary into
`#gc-tab-sam-active-filters`:

> **Active filters:** Keyword: janitorial · NAICS: 541611 · Set-aside: sdvosbc · Place: TX · Closing within: 30 days

The chip line renders immediately when the buyer clicks **Search**, so
they see the constraints before any results return. When all filters
are empty the chip container hides.

### 5. SAM.gov source URL (`_samSafeUrl(r)`)

Preference order:

1. `r.uiLink` (the sam.gov front-end URL — never carries `api_key`).
2. `r.url` if not on the `api.sam.gov` host.
3. `r.resourceLinks[0]` if not on the `api.sam.gov` host.
4. Built from `noticeId`: `https://sam.gov/opp/{noticeId}/view`.
5. Last-resort: `r.url` with `api_key=…` stripped, **only if** no
   `api_key` residue remains after stripping.

`_samStripApiKey(url)` removes any `api_key=…` segment via the regex
`/[?&]api_key=[^&#]*&?/gi` and trims a dangling `?` or `&`.

`gcTabSamOpenSource(id)`:

- Computes the safe URL via `_samSafeUrl(r)`.
- Refuses to open URLs that still contain `api_key` after stripping
  (defense-in-depth — toast: "Refused to open source URL — API key
  would leak.").
- Opens the URL with `window.open(url, '_blank', 'noopener,noreferrer')`.
  No `shell.openExternal` bridge exists in `preload.js`; this is the
  documented in-app path.

### 6. View Details modal

`#gc-tab-sam-details-modal` is a fixed-position overlay rendered into
the canonical Find Opportunities section. `_samRenderViewDetails(r)`
populates `#gc-tab-sam-details-body` with:

- Title
- Agency (via `_samAgencyString`)
- Solicitation # / Notice ID
- NAICS (via `_samRowNaics`)
- Set-aside (via `_samRowSetAside`)
- Posted / Due dates
- Place of Performance (via `_samPopString`)
- Description (first 600 chars)
- Source URL (only when `_samSafeUrl(r)` is non-empty)
- Action buttons: **+ Save to SourceDeck**, **★ Mark Pursue**,
  **↗ Open SAM.gov Source** (when safe URL present), **✕ Close**.

`window.gcTabSamCloseDetails()` flips `display:none`.

### 7. Defensive string normalization

`_samPopString(pop)` handles `string`, `Array<…>`, and
`{ streetAddress, streetAddress2, city, state, zip, country }` objects
(each child may itself be `{ name, code }`). It assembles a
human-readable string like:

> `123 Main St · Austin, Texas, 78701`

`_samAgencyString(r)` reads `agency`, `fullParentPathName`,
`organizationName`, or `department` (string or `{ name, code }`).

Both feed `_samUpsert` so saved opportunities also store readable
strings in `sd.govcon.opportunities`.

## Boundaries preserved

- No auto-search on page load.
- No portal upload, email send, vendor outreach, or government
  submission.
- No raw SAM.gov key in DOM, logs, or upsert payloads.
- No changes to pricing source-of-truth, Stripe/checkout, the approved
  SourceDeck logo, the GovCon tab-page architecture, the blank-canvas
  default state, or the request-access delivery model.
- Phase 23C reachability invariant honored — no DOM sections removed.

# Phase 25T — NAICS Validation + Exact/Fallback SAM.gov Search UX (Contract)

Status: implemented · branch `fix/phase-25t-naics-validation-fallback`
Owner: GovCon Capture surface (Find Opportunities tab)

## Problem statement

After Phase 25S the SAM.gov search correctly refuses to show unrelated
NAICS rows as if they matched. But the buyer is then dead-ended: they
see "SAM.gov returned 25 rows but none matched NAICS 541618. Clear
those filters or pick different values." That is safer than showing
wrong results, but the user has no path forward without manually
clearing the field, retyping, or re-opening the NAICS Finder.

Phase 25T adds three forward paths and one validation pass:

1. **NAICS validation** before the search runs.
2. **Search mode** control: Exact NAICS / Broader-related NAICS /
   Keyword-only.
3. **Actionable zero-match panel** with related codes pulled from the
   local NAICS library.
4. **Saved profiles** distinguish verified codes from manual codes.

## Contract

### 1. NAICS validation (`gcTabNaicsValidate`)

`_samValidateNaicsInput(raw)` reads each comma/space/semicolon-
separated code, calls `window.naicsLookupCode(code)` (exposed by the
Phase 25R NAICS Finder IIFE), and returns
`[{ code, verified, label }]`.

`window.gcTabNaicsValidate` writes the per-code status into
`#gc-tab-f-naics-validation`:

- **Verified** — `✓ 541611 — Administrative Management and General
  Management Consulting Services`
- **Unverified** — `⚠ 541618 — not found in local NAICS library;
  verify before relying on it.`

Validation never blocks search. If any code is unverified, a footnote
appears:

> You can still search exact, choose a related code, or search by
> keyword. SourceDeck does not legally classify NAICS — only filters
> your search.

Validation runs on `input` and `blur` events on the NAICS field and
again at the start of every `gcTabSearchSam` call.

### 2. NAICS mode (`#gc-tab-f-naics-mode`)

Three values:

| Value | Behavior |
| ----- | -------- |
| `exact` (default) | Pass NAICS to the IPC + apply strict local backstop. Only rows whose normalized NAICS equals one of the requested codes are visible. |
| `broader` | Pass NAICS to the IPC + apply prefix-family backstop (4-digit prefix match, e.g. `541618` matches `5416…`). Status line surfaces "broader NAICS …". |
| `keyword-only` | Strip NAICS from the IPC payload + skip the NAICS backstop for this search only. The saved NAICS field value is preserved. Status line surfaces "keyword-only search". |

Mode is read by `_samFilters()` and recorded on `filters.naicsMode`.
The chip line surfaces it ("exact NAICS: 541618", "broader NAICS:
541618", "NAICS: not applied (keyword-only)").

### 3. Zero-match panel (`#gc-tab-sam-zero-match`)

`_samRenderZeroMatch(filters, returned)` shows whenever
`returned > 0 && filters.naics && filters.naicsMode !== 'keyword-only'`
and post-filter is zero. Contents:

- Headline: **"No exact NAICS matches found"**
- Body: `"SAM.gov returned N rows, but none matched NAICS {code}
  after exact filtering."`
- Action row:
  - **↔ Search broader related NAICS** → `gcTabSamBroaderSearch()`
  - **⌕ Clear NAICS and search keyword only** → `gcTabSamKeywordOnly()`
  - **🔎 Open Find NAICS** → `naicsFinderOpen()`
  - **💾 Save this NAICS anyway** → `gcTabSamSaveNaicsAnyway()`
  - **🔢 Change result count** → `gcTabSamChangeResultCount()`
- Related codes: up to 4 from `window.naicsRelatedCodes(firstCode, 4)`
  with a per-code **Use this** button (`gcTabSamApplyRelated`).
- Disclaimer: **"SourceDeck does not show unrelated NAICS results as
  matches."**

### 4. Related-code suggestions (`window.naicsRelatedCodes`)

Exposed by the NAICS Finder IIFE. Returns up to `limit` codes from
the local `CODES` table, ordered by:

1. Codes sharing the same **4-digit prefix** (e.g. `5416…` for
   `541618`).
2. If fewer than 2 hits, fall back to **3-digit prefix** (e.g. `541…`).
3. If still fewer than 2 hits, fall back to **same section** (e.g. all
   section 54 codes).

The input code is never included in the suggestions. The function
never invents descriptions — only entries from the local seeded
library are returned.

### 5. Saved profiles with verification status

`naicsFinderSaveProfile()` now records an `entries[]` array on each
saved profile:

```json
{
  "id": "naics-…",
  "name": "Facilities",
  "codes": ["561720", "541618"],
  "descriptions": ["Janitorial Services", ""],
  "entries": [
    { "code": "561720", "description": "Janitorial Services", "verified": true,  "source": "local-library" },
    { "code": "541618", "description": "Other Management Consulting Services", "verified": true, "source": "local-library" }
  ]
}
```

When a code is not in the local library, the entry records
`verified: false, source: 'manual'`. The profile selector surfaces
this status without inventing a description.

### 6. Status line (`_samStatus`)

After every search the status line includes a mode descriptor:

- `Showing up to 25 results · returned 25 · visible 0 · exact NAICS 541618`
- `Showing up to 25 results · returned 25 · visible 12 · broader NAICS 541618`
- `Showing up to 25 results · returned 25 · visible 25 · keyword-only search`

Zero-match also surfaces the same shape, so the buyer always sees
counts and mode in one line.

## Boundaries preserved

- No legal NAICS classification claim. Disclaimers say "search/filter
  support only — not legal classification advice or official NAICS
  classification."
- No auto-search on page load.
- No portal upload, email send, vendor outreach, or government
  submission.
- No raw SAM.gov key in DOM, logs, or upsert payloads.
- No changes to pricing, Stripe, the approved SourceDeck logo, the
  GovCon tab-page architecture, the blank-canvas default state, or
  the request-access delivery model.
- Phase 23C reachability invariant honored — no DOM sections removed.

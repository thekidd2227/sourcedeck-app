# Phase 25X — SAM.gov Keyword Search Repair Audit

## Reported failure (P0)

- User searches keyword: `janitorial`.
- NAICS field holds broad saved codes (e.g. `561720, 238`); NAICS Mode is
  **Keyword only**.
- SourceDeck status line: *"Showing up to 25 results · returned 25 · visible 0
  · keyword: janitorial · keyword-only search"* and *"No keyword matches after
  relevance filtering."*
- SAM.gov demonstrably returned 25 rows, yet 0 were visible.

## Root cause (verified)

The keyword **was** being sent to SAM.gov correctly: the renderer copies
`keyword` into the IPC payload, and `services/govcon/sam-search.js` maps it to
the SAM.gov `q` full-text parameter (`params.set('q', filters.keyword)`).
SAM.gov returned 25 genuinely keyword-relevant notices.

The rows were then discarded **locally** by the Phase 25Y keyword relevance
backstop:

```js
// before (sourcedeck.html, _samApplyLocalFilters)
return rows.filter(function(r){
  if (!_samMatchesNaics(r, naicsForFilter, mode)) return false;
  if (!_samMatchesSetAside(r, filters.setAside)) return false;
  if (!_samMatchesKeyword(r, filters.keyword)) return false;   // ← drops everything
  return true;
});
```

`_samMatchesKeyword` tests the keyword against a haystack built by
`_samRowHaystack`, which **deliberately excludes the description when it is a
URL**:

```js
var desc = (typeof r.description === 'string' && !/^https?:\/\//i.test(r.description)) ? r.description : '';
```

SAM.gov's v2 **list** endpoint returns `description` as a **link** to the
description endpoint, not inline text (confirmed by `_samDescriptionLink` and
the Phase 25W description-fetch flow). SAM.gov's `q` parameter, however,
performs full-text matching that **includes the description body**. So for the
"janitorial" search:

- SAM.gov matched 25 notices whose description contains "janitorial."
- Those notices' titles read "Base Operations Support," "Facility
  Maintenance," etc. — no literal "janitorial."
- The local haystack had no description text to inspect.
- `_samMatchesKeyword` therefore returned `false` for all 25 → **visible 0**.

This is a systems defect: the local backstop re-applied a keyword filter that
SAM.gov had already applied server-side, but against an **impoverished
haystack** that structurally cannot contain the matched text. It guaranteed a
false zero for any keyword whose hits live in the description body.

## Fix

Keyword relevance is now a **ranking signal, never a drop filter**
(`_samApplyLocalFilters`, two-stage):

1. **Structural stage** — NAICS (unless keyword-only) and set-aside are applied
   as hard filters, because each row carries those fields directly and they are
   reliable.
2. **Keyword stage** — `_samMatchesKeyword` partitions the structurally-filtered
   rows into locally-verifiable hits and the rest. Locally-verified rows are
   **promoted to the top**; all other SAM.gov rows are **kept**, trusting
   SAM.gov's authoritative server-side `q` relevance. The visible set never
   collapses to zero on account of the keyword alone.

A `_samLastFilterDiag` object now records `returned`, `structural`,
`keywordStrong`, and `keywordFallback`. The renderer uses it to:

- append `keyword matched locally` or `keyword matched by SAM.gov full-text`
  to the status line, and
- attribute any genuine zero result to its real cause (SAM.gov returned 0, or a
  NAICS / set-aside structural filter removed every row) rather than blaming the
  keyword.

## Why earlier cycles missed it

Phase 25Y's unit tests exercised `_samMatchesKeyword` against rows with
**inline** description text (`description: 'Contractor shall provide janitorial
labor'`), where the matcher behaves correctly. They never reproduced the
real-world shape where `description` is a URL, so the false-zero never surfaced
in the suite. Phase 25X adds a runtime test that drives the full
`gcTabSearchSam` path with description-as-link rows — the exact production
shape.

## Safety review

- `q`-mapping unchanged; no new network behavior; no auto-search on load.
- Raw API key never displayed, logged, or stored; source URLs api_key-stripped;
  credential URLs refused at the `open-external` IPC boundary.
- No `.env`, pricing, payment, website, or build artifacts touched.

## Verification

`npm test` (full gate) plus the four new Phase 25X tests and the 25Y / 25T /
25S / 25Q regressions.

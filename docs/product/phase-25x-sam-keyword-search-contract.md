# Phase 25X — SAM.gov Keyword Search Contract

## Purpose

Define the guaranteed behavior of keyword search on the GovCon **Find
Opportunities** tab so the failure mode "SAM.gov returned N rows · visible 0"
can never recur silently.

## The contract

1. **Keyword is shaped into the SAM.gov request, server-side, before any
   local filtering runs.** When the user enters a keyword, the renderer passes
   it through the IPC payload and `services/govcon/sam-search.js` maps it to
   the SAM.gov Opportunities API `q` full-text parameter. Keyword search never
   depends only on local post-filtering.

2. **SAM.gov's `q` match is authoritative.** SAM.gov's full-text search covers
   the opportunity **description body**. The v2 list payload delivers that
   description only as a **link** (`description` is a URL, fetched later through
   the credential boundary), never as inline text. Therefore the renderer's
   local haystack (title, agency, NAICS, solicitation number, set-aside,
   classification code) cannot see keywords that live in the description.

3. **Local keyword matching ranks; it never drops server-relevant rows.** The
   local matcher (`_samMatchesKeyword`) is used only to **promote** rows whose
   keyword hit is locally verifiable to the top of the list. Every other row
   SAM.gov returned for the keyword is kept below them. A local "miss" is not
   treated as proof of irrelevance.

4. **Keyword-only NAICS mode.** When NAICS mode is `keyword-only`, NAICS is
   stripped from both the SAM.gov request (`ncode` omitted) and the local
   structural filter. The saved NAICS field value is preserved so the user does
   not have to retype it. The keyword is always retained in the payload.

5. **Structural filters (NAICS, set-aside) may still legitimately empty the
   set.** These are evaluated from fields the row actually carries, so they are
   reliable. When they remove every row, the UI attributes the empty result to
   the responsible filter — not to the keyword.

6. **Honest, attributed diagnostics.** The status line always reports
   `returned N · visible M`, the active keyword, and how the visible set was
   produced:
   - `keyword matched locally` — at least one row was locally verifiable.
   - `keyword matched by SAM.gov full-text` — rows rest on SAM.gov's
     server-side relevance (keyword lives in the description body).
   A `_samLastFilterDiag` object records `returned`, `structural`,
   `keywordStrong`, and `keywordFallback` for this purpose.

7. **Result-count selector.** The 25 / 50 / 75 / 100 selector bounds the
   SAM.gov fetch (`limit`) and the rendered row count.

8. **Source links.** Every result row exposes "Open SAM.gov Source," routed
   through the credential boundary (`open-external` IPC). No `api_key`-bearing
   URL is ever opened; a public `sam.gov/opp/{noticeId}/view` URL is built when
   no clean source link is present.

## Non-goals / safety

- No live SAM.gov search on page load.
- The raw SAM.gov API key is never displayed, logged, or written into any
  stored URL or record.
- No emails, vendor/agency contact, bid submission, or portal upload.

## Tests

- `test/phase-25x-sam-keyword-query-builder.test.js`
- `test/phase-25x-sam-keyword-visible-results.test.js`
- `test/phase-25x-sam-filter-diagnostics.test.js`
- `test/phase-25x-open-sam-source-links.test.js`
- Regression: `test/phase-25y-sam-keyword-enforcement.test.js`,
  `test/phase-25t-naics-fallback-search.test.js`,
  `test/phase-25s-sam-filter-enforcement.test.js`,
  `test/phase-25q2-sam-visible-results-runtime.test.js`.

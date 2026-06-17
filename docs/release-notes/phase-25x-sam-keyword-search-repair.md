# Phase 25X — SAM.gov Keyword Search Repair

## What changed

Keyword search on **GovCon → Find Opportunities** now reliably shows the
opportunities SAM.gov returns for your keyword.

### Fixed

- **Keyword searches no longer return "visible 0" when SAM.gov found matches.**
  Previously, a keyword like *janitorial* could report *"returned 25 · visible
  0 · No keyword matches after relevance filtering"* even though SAM.gov had
  matched 25 relevant notices. The local relevance filter was rejecting rows
  whose keyword appeared in the opportunity description — text SAM.gov searches
  server-side but that the results list delivers only as a link. The local
  filter now **ranks** results instead of hiding them, and trusts SAM.gov's
  server-side match.

### Improved

- **Clearer status line.** Shows `returned N · visible M`, the active keyword,
  and whether results matched *locally* or *by SAM.gov full-text*.
- **Honest empty states.** When no rows are visible, the app now says why —
  SAM.gov returned nothing, or a NAICS / set-aside filter removed the rows —
  instead of implying the keyword failed.
- **Keyword-only mode** keeps your saved NAICS codes in the field while
  searching by keyword alone.

### Unchanged / preserved

- Result-count selector (25 / 50 / 75 / 100).
- "Open SAM.gov Source" links and their credential-safe handling.

## Safety

- No auto-search on launch.
- The SAM.gov API key is never shown, logged, or stored in any link or record.
- No emails, vendor/agency contact, bid submission, or portal uploads.
- No pricing, payment, website, or build changes.

## Tests added

- `phase-25x-sam-keyword-query-builder`
- `phase-25x-sam-keyword-visible-results`
- `phase-25x-sam-filter-diagnostics`
- `phase-25x-open-sam-source-links`

# Phase 25Y — Critical SAM.gov Source + Extraction Contract

Repairs the highest-priority GovCon failures: keyword relevance, Open SAM.gov
Notice, source-URL rendering, saved-pursuit source materials, and real
solicitation extraction.

## Keyword relevance enforcement
- The SAM.gov service already sets `q=keyword` server-side. Phase 25Y adds a
  renderer **relevance backstop** (`_samMatchesKeyword`) applied in
  `_samApplyLocalFilters`: a row is kept only if the keyword (exact phrase, or
  all significant terms ≥3 chars) appears across title / solicitation # /
  notice ID / agency / NAICS / set-aside / classification / description.
- Generic-only terms ("support", "services", "repair") do not overmatch.
- Status line: `Showing up to N · returned X · visible Y · keyword: <kw> · <mode>`.
- When SAM returns rows but none match the keyword, SourceDeck is explicit:
  "SAM.gov returned N records, but none matched keyword '<kw>' after relevance
  filtering. Clear the keyword or broaden the search." — it never renders the
  unrelated rows as matches.

## Source URL normalization
- `_samUrlString(v)` coerces strings / arrays / objects ({href|url|link|uri})
  into a real URL — eliminating `[object Object]`.
- `_samStripApiKey` strips `api_key`/`apikey` and discards any `[object …]`
  artifact. `_samSafeUrl` only returns `http(s)` URLs that are key-free and not
  `[object …]`, preferring uiLink → url → links.self → resourceLinks[0] →
  constructed `sam.gov/opp/{noticeId}/view`. Returns '' when nothing safe.

## Open SAM.gov Notice / View Source
- `gcOpenExternal(url, label)` — robust opener: `sd.openExternal` IPC bridge →
  `window.open` → Copy Link fallback. Shows "Opening …" status; refuses any
  `api_key`-bearing URL; never fails silently.
- New `open-external` IPC (main: `shell.openExternal`, http(s) only, refuses
  credential URLs) + `preload` bridge. The old out-of-scope `onclick` bug on
  the saved-pursuit "View Source" is replaced by id-keyed handlers.

## Saved pursuit source materials
- `_samUpsert` persists: id, noticeId, solicitationNumber, title, agency,
  NAICS, set-aside, responseDeadline, placeOfPerformance, pointOfContact,
  uiLink, sourceUrl, descriptionLink, resourceLinks, apiSelfLink,
  originalSAMRecordSafe, savedAt, lastRefreshedAt (all key-stripped).
- Saved Pursuits rows: View Details, Open SAM.gov Notice, Source Materials,
  Refresh Source Details, Send to Solicitation Workspace, plus Fetch
  Description / resource Open / Import (Phase 25W) and Award / Incumbent Clues.

## Real solicitation extraction
- `gcSolExtract` extracts from pasted text + fetched description + imported
  resource text (`gcW25CollectSourceText`); with no source text it asks for
  source material and generates nothing.
- Extraction is stamped with the active `solId` and `real:true`.
  `gcSolResetForSelection(id)` clears any demo/foreign extraction when a pursuit
  is selected, so a real pursuit never shows sample/demo sections.
- Output: Solicitation Summary, Section L, Section M, PWS/SOW, Required Forms,
  Deadlines, Risks, Compliance Matrix Starter; metadata adds Place of
  Performance + Point of Contact. No legal certification. No submission.

## Safety
No raw key in DOM/logs/URLs. No auto-search on load. No send/submit/upload.

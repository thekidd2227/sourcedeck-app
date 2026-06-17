# Phase 25AA — GovCon Local Index Contract

## Executive Conclusion
SourceDeck has a **local JSON-backed GovCon metadata cache** for fast, trustworthy search over cached SAM.gov opportunity metadata. The cache is stored under the local app user data directory at `app.getPath('userData')/govcon-cache.json`. SQLite/FTS5 is a **future scaling phase**, not the current implementation — Phase 25AA-TIGHTEN-2 corrects an earlier naming error that labeled the JSON cache as `.sqlite`.

## Why It Matters
One live SAM.gov response is not a dependable source of truth for user searches. SourceDeck must use SAM.gov's supported filters for live requests, then search a local daily index for repeatable, fast filtering across saved NAICS profiles.

## Architecture
- **Current implementation:** local JSON-backed GovCon metadata cache.
- **Storage path:** `app.getPath('userData')/govcon-cache.json`.
- **Backend marker:** the cache root JSON carries `schemaVersion`, `backend: "json"`, `storageEngine: "json"`, `createdAt`, `updatedAt`, and a `sqliteContract` field that documents the table names a future SQLite migration must satisfy.
- **Future implementation:** SQLite/FTS5 is planned for a scaling phase. It is not implemented today — `better-sqlite3` is not in `package.json` and no `.sqlite` files are written. Phase 25AA-TIGHTEN-2 explicitly stops claiming SQLite/FTS is implemented.
- **Why JSON is acceptable short-term:** targeted saved-NAICS-profile indexing, capped record counts, metadata-first storage, no mass attachment downloads.
- **Limits of JSON cache:** JSON search is not true FTS5; full source-text search requires fetched descriptions and imported source materials.
- **Search fields (keyword):** title, solicitationNumber, noticeId, descriptionText (when fetched). Agency, NAICS-as-text, and classificationCode are **deliberately EXCLUDED** from the keyword haystack — they were the root cause of unrelated rows (e.g. "boiler testing" with NAICS 561720) appearing as keyword matches for "janitorial".
- **Safe URLs:** stored source URLs are stripped of `api_key`/`apikey`.

## Daily Index
- Default run time: 8:00 AM local.
- Runs only in the local desktop app.
- Uses saved NAICS profiles by default.
- Does not index the entire federal universe by default.
- If no saved NAICS profile exists, the UI shows: "No NAICS profile saved. Add NAICS profiles to enable daily GovCon index."
- Max records per run defaults to 10,000.
- Max records per SAM.gov request defaults to 1,000.
- Requests are sequential.

## Source-Material Boundary
Metadata is indexed by default. Descriptions are optional. Attachments and resource links are not mass-downloaded; source materials are fetched only when the user saves/pursues an opportunity or explicitly clicks.

## Storage Estimate
Metadata-only cache is expected to stay small for saved NAICS profiles. Description indexing increases size because description text is stored alongside the metadata. Downloaded source materials remain separate.

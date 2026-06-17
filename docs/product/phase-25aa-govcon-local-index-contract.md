# Phase 25AA — GovCon Local Index Contract

## Executive Conclusion
SourceDeck now has a local GovCon opportunity index contract for fast, trustworthy search over cached SAM.gov opportunity metadata. The index is stored under the local app user data directory at `app.getPath('userData')/govcon-cache.sqlite`.

## Why It Matters
One live SAM.gov response is not a dependable source of truth for user searches. SourceDeck must use SAM.gov's supported filters for live requests, then search a local daily index for repeatable, fast filtering across saved NAICS profiles.

## Architecture
- Storage path: `app.getPath('userData')/govcon-cache.sqlite`.
- Preferred schema: SQLite/FTS5 with `govcon_opportunities`, `govcon_opportunities_fts`, `govcon_index_batches`, and `govcon_saved_pursuits`.
- Current implementation: file-backed JSON fallback with the same table contract because the repo does not currently carry a native SQLite dependency. This avoids adding `better-sqlite3` without package-policy confirmation.
- Search fields: title, agency, solicitation number, NAICS, set-aside, place of performance, and description text when fetched.
- Safe URLs: stored source URLs are stripped of `api_key`/`apikey`.

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

# Phase 25AA — GovCon Index Architecture Audit

## Executive Conclusion
The implemented index is local-only, userData-scoped, and safe for desktop use. It avoids secrets in storage and avoids broad federal-universe crawling by default.

## Current State
- Live search handler: `govcon:sam-search` in `main.js`, routed through `api/index.js`.
- Query builder: `services/govcon/sam-search.js`.
- NAICS mode logic: renderer select `Apply NAICS / Broaden NAICS family / Ignore NAICS`.
- Set-aside mapping: `normalizeSamSetAsideCode` and `normalizeSetAsideCode`.
- Persistence: existing saved pursuits remain in electron-store; index cache is file-backed at userData.
- Source materials: saved as key-stripped links and fetched on demand.

## SQLite Decision
`better-sqlite3` is not currently in `package.json`. Phase 25AA therefore implements a JSON-backed cache file named `govcon-cache.sqlite` with the SQLite/FTS table contract documented in code. Moving to FTS5 later can preserve the IPC and table shape.

## Risk Controls
- No raw SAM.gov API key stored.
- No `api_key` visible in opened URLs.
- No app-launch live SAM.gov search.
- No external cron.
- No email, auto-contact, portal upload, bid, quote, or proposal submission.
- No mass attachment downloads.

## Gates
Primary gates are the Phase 25AA tests plus Phase 25Z/25W/25R/25Q regressions and core runtime tests.

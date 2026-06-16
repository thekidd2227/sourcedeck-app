# Release Notes — Phase 25Y: Critical SAM Source + Awards

## Summary
Fixes the highest-priority GovCon failures and adds Contract Awards research.

## Highlights
- **Keyword search accuracy** — results are now relevance-filtered; a search for
  "janitorial" no longer returns unrelated DoD part records. Status line shows
  returned vs. visible counts and the active keyword; zero keyword matches are
  stated explicitly instead of showing unrelated rows.
- **Open SAM.gov Notice / View Source works** — robust opener (default-browser
  IPC bridge → window.open → Copy Link), never silent, never opens a key URL.
- **No more `[object Object]`** — source URLs are normalized from strings,
  arrays, or objects; api_key is always stripped; unsafe URLs show "—".
- **Saved pursuit source materials** — full safe metadata preserved; Source
  Materials panel exposes notice link, description fetch, resourceLinks /
  attachments (Open / Import), point of contact, and Refresh Source Details.
- **Real solicitation extraction** — Extract Requirements uses fetched/imported
  source text; selecting a real pursuit clears demo/foreign sections, so
  sample/demo extraction never appears for a real pursuit.
- **Contract Awards** — new GovCon tab + Dashboard shortcut to research existing
  contracts/awards. Provider-aware and honest: no fabricated awards; Open
  SAM.gov Contracting + Paste/Structure/Save award data; Award/Incumbent Clues
  link to a pursuit.
- GovCon Outreach OS stays removed; no heavy Human Review panels.

## Safety
- No `.env` changes. No secrets/keys in DOM/logs/URLs.
- No auto SAM search on load. No auto awards search on load.
- No email send. No vendor/agency/COR auto-contact.
- No bid/quote/proposal submission. No portal upload.
- No pricing source change. No checkout/payment change.

## Tests / gates
10 new Phase 25Y tests wired into `npm test`; Phase 25W/25U/25R/25Q regressions
and core runtime gates pass; `govcon:smoke`, `troubleshooting:scan`,
`release-check.js` pass.

## Next
Merge when green, rebuild app package, refresh Day 0 package, then manually
verify keyword search, View Source, Source Materials, Extract Requirements, and
Contract Awards.

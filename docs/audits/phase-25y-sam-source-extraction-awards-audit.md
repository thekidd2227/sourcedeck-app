# Phase 25Y — SAM Source / Extraction / Awards Audit

## Confirmed defects → fixes

| # | Defect | Fix |
|---|--------|-----|
| 1 | Keyword "janitorial" returned unrelated DoD part records | `_samMatchesKeyword` relevance backstop in `_samApplyLocalFilters`; explicit "none matched keyword" message; keyword in status line. SAM `q=keyword` was already set server-side. |
| 2 | Open SAM.gov Notice / View Source did not open | `gcOpenExternal` (IPC bridge → window.open → Copy Link) + new `open-external` IPC (main+preload); refuses key URLs; never silent. |
| 3 | Saved pursuit loaded but Solicitation Workspace showed sample/demo sections | `gcSolResetForSelection` clears demo/foreign extraction on select; `gcSolExtract` stamps `solId`+`real`; real sections only after Extract on real source. |
| 4 | `[object Object]` / unsafe API URLs in UI | `_samUrlString` object coercer; `_samStripApiKey`/`_samSafeUrl` discard `[object …]` + `api_key`; return '' when nothing safe. |
| 5 | Saved pursuits didn't expose source materials | `_samUpsert` persists full safe metadata; Source Materials panel: notice link, description fetch, resourceLinks/attachments (Open/Import), POC, metadata; Refresh Source Details for older pursuits. |
| 6 | No Contract Awards research | Contract Awards GovCon tab + Dashboard shortcut; provider-aware (no fabrication); Open SAM.gov Contracting; paste/structure/save; Award/Incumbent Clues on pursuits. |

## Critical-rule gate (all pass)
- Keyword search returns relevant results (backstop + tests).
- Source notice opens (robust opener + IPC).
- Saved pursuit can be explored (Source Materials panel).
- Real solicitation material feeds Extract Requirements.
- No sample/demo sections appear as real extraction output.

## Security
- Raw SAM/AI keys never reach the renderer, DOM, logs, errors, or URLs. The
  `open-external` and source-fetch paths refuse / strip credential params.
- Safety scan: `[object Object]` only in explanatory comments; no
  `api_key=<value>` literals; no send/submit/upload controls; GovCon Outreach
  OS stays removed; no heavy Human Review panels.

## Gates
10 new Phase 25Y tests + Phase 25W/25U/25R/25Q regressions + core runtime gates
+ `npm test`, `govcon:smoke`, `troubleshooting:scan`, `release-check.js` — all pass.

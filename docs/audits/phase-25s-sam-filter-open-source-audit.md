# Phase 25S — SAM Filter Enforcement + Source Repair (Audit)

Branch: `fix/phase-25s-sam-filter-open-source`
Audit date: 2026-06-15

## Scope

Verify the Phase 25S contract was met:

1. NAICS + set-aside filters are enforced locally in addition to being
   passed to the SAM.gov IPC.
2. Active filter chips render before results and reflect every filter
   the buyer has set.
3. "Open SAM.gov Source" never opens a URL containing `api_key`.
4. "View Details" opens an in-app modal (not a toast).
5. Place of Performance never renders as `[object Object]`.

## Evidence

### Tests (all green)

```
node test/phase-25s-sam-filter-enforcement.test.js   → OK (28 assertions)
node test/phase-25s-sam-open-source.test.js          → OK (15 assertions)
node test/phase-25s-sam-result-normalization.test.js → OK (29 assertions)
npm test                                              → all 100+ phase tests OK
npm run govcon:smoke                                 → 47 passes, 0 failures
npm run troubleshooting:scan                         → no fail/warn findings
```

### Code surface

| Concern | Helper | Location |
| ------- | ------ | -------- |
| NAICS filter backstop | `_samMatchesNaics` + `_samApplyLocalFilters` | sourcedeck.html (Phase 25N IIFE) |
| Set-aside filter backstop | `_samMatchesSetAside` + alias table | same |
| Place of Performance normalization | `_samPopString` (string · array · nested object) | same |
| Agency normalization | `_samAgencyString` | same |
| NAICS / set-aside normalization | `_samRowNaics`, `_samRowSetAside` | same |
| Safe URL builder | `_samSafeUrl` + `_samStripApiKey` | same |
| Active filter chips | `_samActiveFilterSummary` + `_samRenderFilterChips` → `#gc-tab-sam-active-filters` | same |
| View Details modal | `_samRenderViewDetails` + `gcTabSamCloseDetails` → `#gc-tab-sam-details-modal` | same |

### Sandbox-verified behaviours

- `_samApplyLocalFilters` on a 4-row synthetic set with NAICS 541611
  filter drops the 334519 row (3/4 survive).
- With NAICS 541611 + SDVOSB filter, only the one matching row
  survives.
- Set-aside alias for `wosb` matches `typeOfSetAside="WOSB"` via
  alias bag.
- `_samStripApiKey('https://api.sam.gov/...?api_key=ABC123&noticeId=xyz')`
  → `https://api.sam.gov/...?noticeId=xyz` (no `api_key`).
- `_samSafeUrl({ url: 'https://api.sam.gov/...?api_key=SECRET&id=42', noticeId: 'NID-42' })`
  → `https://sam.gov/opp/NID-42/view` (replaces the api host
  entirely).
- `_samPopString({ city:{name:'San Antonio'}, state:{code:'TX',name:'Texas'}, zip:'78201', country:{code:'USA'} })`
  → `San Antonio, Texas, 78201`.

### Boundaries verified

- `grep -c 'shell\.openExternal' preload.js` → 0 (still no bridge —
  `window.open` is the documented in-app path).
- `npm run govcon:smoke` confirms the credential-boundary copy ("No raw
  SAM.gov key literal in renderer") and the safety / human-review copy
  ("does not", "human review", "RED_RESTRICTED").
- `Phase 25Q · SAM results rendering` test was updated to allow the
  legitimate `api_key=` references inside `_samStripApiKey` (the
  defensive regex literal and the comment placeholder ellipsis); any
  occurrence resembling a real key value is still flagged.

### Static residue scan

- No raw `api_key=<alphanum>` literals.
- No raw SAM.gov key constants (`sam-gov-key: x…`).
- No new auto-search on load.
- No portal upload, email send, vendor outreach, or government
  submission.

## Sign-off

Audit conclusion: Phase 25S contract met. NAICS / set-aside filters
are enforced both in transit and on render; the "Open SAM.gov Source"
button can no longer leak the operator's `api_key`; "View Details"
renders an in-app modal; and the `[object Object]` artifact is
eliminated through a single set of defensive normalizers.

# Phase 25U — SAM.gov NAICS Query Repair (Contract)

Status: implemented · branch `fix/phase-25u-sam-naics-query-repair`
Owner: GovCon Capture surface (Find Opportunities tab) + main-process
SAM service.

## Root cause

The Phase 25S local backstop correctly refused to show unrelated NAICS
rows. Phase 25T gave the buyer fallback paths when SAM.gov misbehaved.
But the underlying defect — **why** SAM.gov was returning unrelated
rows — was never fixed.

The IPC sanitizer in `main.js`:

```js
naics: Array.isArray(f.naics) ? f.naics.filter(s => /^\d{2,6}$/.test(String(s))).slice(0, 40) : [],
```

The renderer's `_samFilters()` builds NAICS as a **string**:

```js
var naics = v('gc-tab-f-naics'); if (naics) filters.naics = naics;
```

`Array.isArray('541611')` is `false`, so the sanitizer dropped the
NAICS filter on every search. SAM.gov got a generic top-of-feed query
(active solicitations, posted within 90 days, no NAICS / set-aside /
state constraint) and returned 25 broad rows. The renderer then ran
its local backstop and filtered all 25 to zero — producing the
"SAM.gov returned 25 rows but none matched NAICS 541611 after exact
filtering." dead end.

The same defect affected:

| Renderer sent | Sanitizer expected | Status pre-25U |
| ------------- | ------------------ | -------------- |
| `naics: "541611, 561720"` (string) | `naics: ['541611', '561720']` (array) | dropped |
| `setAside: "SDVOSBC"` (string) | `setAsides: ['sdvosb', ...]` (array) | dropped |
| `dueWithinDays: 30` | `responseFrom` / `responseTo` ISO dates | dropped |
| `placeOfPerformance: "TX, Austin"` | `state` (2-letter) | dropped |
| `status: "active"` | `noticeTypes: { active_solicitation, ... }` | dropped |

## Contract

### 1. Sanitizer accepts the renderer's natural shape

`sanitizeSamFilters(f)` now coerces all five fields:

```js
function coerceCodes(raw){
  if (Array.isArray(raw)) return raw.map(s => String(s)).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
  if (typeof raw === 'string') return raw.split(/[,\s;]+/).map(s => s.trim()).filter(s => /^\d{2,6}$/.test(s)).slice(0, 40);
  return [];
}
```

Set-aside coercion applies an alias table (renderer dropdown code →
SAM.gov substrings used by `applyTargeting`):

| Dropdown | Substrings |
| -------- | ---------- |
| `SBA`     | `small business`, `sba` |
| `SDVOSBC` | `sdvosb`, `service-disabled veteran` |
| `WOSB`    | `wosb`, `edwosb`, `women-owned` |
| `HZC`     | `hubzone`, `hub zone` |
| `8A`      | `8(a)`, `8a` |
| `VSA`     | `vosb`, `veteran-owned` |

`dueWithinDays` → `responseFrom = today (ISO)`,
`responseTo = today + N (ISO)`. The SAM service converts to
`MM/dd/yyyy` for `rdlfrom`/`rdlto`.

`placeOfPerformance` → `state` when a leading 2-letter code matches;
otherwise the field is forwarded as-is for the renderer's local
backstop to filter on.

`status` → `noticeTypes.awards = true` for `status === 'awarded'`;
`active` and unset stay on the default active-solicitation + pre-RFP
intel bucket.

### 2. Controlled pagination when NAICS is set

When NAICS is provided, `sanitizeSamFilters` defaults `maxPages` to
`5` (was `1`). The SAM service stops paging early as soon as a page
returns fewer than `limit` rows OR the accumulated count meets the
SAM-reported total. Hard cap = 5 pages × user's `limit`. The selected
result count remains the **visible** cap on the page list, not a
broad fetch quota.

### 3. Server-side NAICS filtering (the canonical SAM contract)

`services/govcon/sam-search.js` (unchanged in 25U) uses:

```js
if (filters.naics && filters.naics.length) {
  params.set('ncode', filters.naics.join(','));
}
```

`ncode` is the SAM.gov Opportunities v2 query param for NAICS code(s)
in a comma-separated list. With the sanitizer fix, this param now
actually fires.

### 4. Renderer broader-mode prefix expansion

When the buyer chose broader mode the renderer was passing only the
exact code to the IPC, so the server still filtered to exact rows
and broader mode was effectively exact. Phase 25U adds:

```js
if (filters.naicsMode === 'broader' && filters.naics && typeof window.naicsRelatedCodes === 'function'){
  var rootCodes = _samNaicsList(filters.naics);
  var expanded = rootCodes.slice();
  rootCodes.forEach(code => {
    (window.naicsRelatedCodes(code, 12) || []).forEach(r => {
      if (r && r.code && expanded.indexOf(r.code) < 0) expanded.push(r.code);
    });
  });
  ipcFilters.naics = expanded.join(',');
}
```

Broader mode now sends the 4-digit prefix family from the local NAICS
library to SAM.gov directly (`ncode=541330,541611,541618,541990`).

### 5. Honest zero-match copy

`_samRenderZeroMatch(filters, returned)` distinguishes the two real
shapes:

- `returned === 0` →
  > "SourceDeck searched SAM.gov using NAICS 541611 and SAM.gov
  > returned 0 matching records."
- `returned > 0` (filter backstop dropped them — usually broader mode
  prefix mismatch or set-aside) →
  > "SourceDeck reviewed N SAM.gov records for NAICS 541611 and
  > found 0 that passed the active filters."

Neither message ever implies that the N rows were broad unrelated
results.

### 6. Local backstop stays as defense in depth

`_samMatchesNaics` / `_samMatchesSetAside` continue to re-filter the
response. If SAM.gov ever misbehaves and the server returns an
off-NAICS row, the backstop drops it. The status line and zero-match
panel surface the discrepancy honestly via the `returned > 0` branch.

### 7. Source-link contract unchanged

`_samSafeUrl` / `_samStripApiKey` / View Details modal /
`gcTabSamOpenSource` regressed-and-pinned by
`phase-25u-sam-source-open-regression.test.js`. No `api_key` ever
reaches an opened URL. Missing fields render as `—`, never as
`[object Object]` / `null` / `undefined`.

## Boundaries preserved

- `.env` not touched.
- Stashes untouched.
- No raw SAM.gov key in DOM, logs, upsert payloads, exports.
- No auto-search on page load.
- No portal upload, email send, vendor outreach, government submission.
- No changes to pricing, Stripe/checkout, the approved SourceDeck
  logo, the GovCon tab-page architecture, the blank-canvas default
  state, or the request-access delivery model.
- NAICS remains search/filter support — SourceDeck does not provide
  legal or official NAICS classification.
- Phase 23C reachability invariant honored — no DOM sections removed.

## Verification

```bash
npm test                                                # all phase tests OK (33 phase suites)
npm run govcon:smoke                                    # 47 passes, 0 failures
npm run troubleshooting:scan                            # no fail/warn findings
node scripts/release-check.js                           # privacy gate ✓
node test/phase-25u-sam-naics-query-builder.test.js     # OK (34 assertions)
node test/phase-25u-sam-naics-result-collection.test.js # OK (12 assertions)
node test/phase-25u-sam-naics-no-match-truth.test.js    # OK (13 assertions)
node test/phase-25u-sam-source-open-regression.test.js  # OK (20 assertions)
```

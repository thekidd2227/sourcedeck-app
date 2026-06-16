# Phase 25U — SAM.gov NAICS Root-Cause Audit

Branch: `fix/phase-25u-sam-naics-query-repair`
Audit date: 2026-06-16

## Root cause (one-line)

`sanitizeSamFilters` ran `Array.isArray(f.naics)` against the
renderer's string-shaped NAICS field and silently dropped the filter.
SAM.gov then returned 25 broad rows; the renderer's local backstop
filtered all 25 to zero; the buyer saw "SAM.gov returned 25 rows but
none matched NAICS 541611 after exact filtering."

## Where the bug lived

- **File:** `main.js`
- **Function:** `sanitizeSamFilters(f)` (the IPC boundary handler for `govcon:sam-search`)
- **Symptom-side effect:** the SAM service in `services/govcon/sam-search.js` never received `filters.naics`, so the `ncode` query param never fired.

The renderer's `_samFilters()`:

```js
var naics = v('gc-tab-f-naics'); if (naics) filters.naics = naics;       // string
var setAside = v('gc-tab-f-setaside'); if (setAside) filters.setAside = setAside;  // string
```

The pre-25U sanitizer:

```js
naics: Array.isArray(f.naics) ? f.naics.filter(...).slice(0, 40) : [],   // ← always [] for strings
setAsides: Array.isArray(f.setAsides) ? f.setAsides.map(...).slice(0, 10) : []  // ← never reads f.setAside
```

## What Phase 25S/T were treating

| Phase | What it did | Why it didn't fix the root cause |
| ----- | ----------- | --------------------------------- |
| 25S   | Added a local NAICS backstop in the renderer + cleaned up "[object Object]". | Operated on whatever SAM.gov returned. Did not change what we asked SAM.gov for. |
| 25T   | Added validation chip, broader/keyword modes, zero-match panel. | Built fallback UX on top of a sanitizer that was still eating the NAICS at the IPC boundary. |

## What Phase 25U fixed

- `coerceCodes(raw)` accepts string OR array.
- `coerceSetAsides(f)` accepts `setAside` (string) OR `setAsides` (array).
- `dueWithinDays` → `responseFrom`/`responseTo` window.
- `placeOfPerformance` → `state` (2-letter) when parseable.
- `status` → `noticeTypes.{active_solicitation, pre_rfp_intel, awards}`.
- `maxPages` defaults to 5 when NAICS is set so the server can return up to `5 × limit` raw matches before paging stops.
- Renderer broader mode now expands the user's code into the 4-digit prefix family via `naicsRelatedCodes` and sends the family list as the `ncode` param.
- Zero-match panel copy now distinguishes "SAM.gov returned 0 matching records" from "SourceDeck reviewed N SAM.gov records and found 0 that passed the active filters."

## Evidence

### Sanitizer behaviour (sandbox)

| Input | `out.naics` | `out.setAsides` | `out.responseFrom` | `out.state` | `out.maxPages` |
| ----- | ----------- | ---------------- | ------------------ | ----------- | -------------- |
| `{ naics: '541611, 561720' }` | `['541611', '561720']` | `[]` | `''` | `''` | `5` |
| `{ naics: ['541611'] }` | `['541611']` | `[]` | `''` | `''` | `5` |
| `{ setAside: 'SDVOSBC' }` | `[]` | `['sdvosb', 'service-disabled veteran']` | `''` | `''` | `1` |
| `{ dueWithinDays: 30 }` | `[]` | `[]` | today ISO | `''` | `1` |
| `{ placeOfPerformance: 'TX, Austin' }` | `[]` | `[]` | `''` | `'TX'` | `1` |
| `{ status: 'awarded' }` | `[]` (noticeTypes.awards = true) | `[]` | `''` | `''` | `1` |

### SAM service behaviour (sandbox, injected fetch)

- `?ncode=541611` fires when NAICS is provided.
- `?ncode=541611,561720,541618` (URL-encoded) fires for multi-NAICS.
- Pagination fires up to `maxPages=5` only when every page returns a full `limit`-sized batch; stops early on a short page.
- `applyTargeting` continues to drop NAICS-mismatched rows even if SAM.gov misbehaves (defense in depth).
- `api_key` appears exactly once in the URL and is never logged.

### Renderer behaviour (sandbox)

- Broader mode IPC payload is the expanded prefix family (e.g. for 541618 → `541618,541330,541611,541990` from the seeded library).
- Zero-match panel copy:
  - `returned=0` → "SourceDeck searched SAM.gov using NAICS 541611 and SAM.gov returned 0 matching records."
  - `returned=12` → "SourceDeck reviewed 12 SAM.gov records for NAICS 541611 and found 0 that passed the active filters."
- Both copies retain the "SourceDeck does not show unrelated NAICS results as matches" disclaimer.

### Safety scan

- No raw `api_key=<value>` literal.
- No new `Submit Bid` / `Submit Quote` / `Send Email` / portal-upload surface.
- No `$79` / `$349` / `$999` pricing literals.
- All "legal advice" / "certified compliant" / "legally sufficient" hits are negative disclaimers.

### Tests + gates (all green)

```
node test/phase-25u-sam-naics-query-builder.test.js     → OK
node test/phase-25u-sam-naics-result-collection.test.js → OK
node test/phase-25u-sam-naics-no-match-truth.test.js    → OK
node test/phase-25u-sam-source-open-regression.test.js  → OK
node test/govcon-core.test.js                           → PASS 27/27
npm test                                                → all 33 phase suites OK
npm run govcon:smoke                                    → 47 passes / 0 failures
npm run troubleshooting:scan                            → no fail/warn findings
node scripts/release-check.js                           → privacy gate ✓
```

## Sign-off

Audit conclusion: Phase 25U met. The NAICS sanitizer no longer eats
the user's filter. SAM.gov searches now query by NAICS server-side
via `?ncode=`; the local backstop stays as defense in depth; the
no-match panel honestly describes what was searched.

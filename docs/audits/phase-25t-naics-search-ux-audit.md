# Phase 25T — NAICS Validation + Fallback Search UX (Audit)

Branch: `fix/phase-25t-naics-validation-fallback`
Audit date: 2026-06-15

## Scope

Verify the Phase 25T contract:

1. NAICS validation surfaces verified vs unverified codes without
   blocking search.
2. NAICS mode selector offers Exact / Broader / Keyword-only.
3. Zero-match panel replaces the dead-end empty state with actionable
   choices + related-code suggestions.
4. Saved NAICS profiles round-trip verified/source flags.
5. Status line announces returned, visible, NAICS mode, and code.
6. No invented NAICS descriptions; no legal NAICS classification
   claim; no portal/email/upload regressions.

## Evidence

### Tests (all green)

```
node test/phase-25t-naics-validation.test.js     → OK  (21 assertions)
node test/phase-25t-naics-fallback-search.test.js → OK (18 assertions)
node test/phase-25t-naics-zero-match-ux.test.js  → OK  (24 assertions)
npm test                                          → all 100+ phase tests OK
npm run govcon:smoke                              → 47 passes, 0 failures
npm run troubleshooting:scan                      → no fail/warn findings
```

### Code surface

| Concern | Helper / element |
| ------- | ---------------- |
| NAICS lookup against local library | `window.naicsLookupCode(code)` (NAICS Finder IIFE) |
| Related-code suggestions | `window.naicsRelatedCodes(code, limit)` (NAICS Finder IIFE) |
| Per-code validation chip | `gcTabNaicsValidate()` → `#gc-tab-f-naics-validation` |
| NAICS mode selector | `#gc-tab-f-naics-mode` (exact/broader/keyword-only) |
| Mode-aware filter backstop | `_samMatchesNaics(r, naicsField, mode)` + `_samApplyLocalFilters` |
| IPC keyword-only payload | `gcTabSearchSam` strips `naics` when `naicsMode==='keyword-only'` |
| Zero-match panel | `_samRenderZeroMatch(filters, returned)` → `#gc-tab-sam-zero-match` |
| Broader handler | `gcTabSamBroaderSearch` |
| Keyword-only handler | `gcTabSamKeywordOnly` |
| Related-code apply | `gcTabSamApplyRelated(code)` |
| Save-anyway handler | `gcTabSamSaveNaicsAnyway` |
| Change-result-count handler | `gcTabSamChangeResultCount` |
| Saved profile verified flag | `naicsFinderSaveProfile` writes `entries[].verified`, `entries[].source` |

### Sandbox-verified behaviours

- `naicsLookupCode('541611')` → `{ verified:true, label:'Administrative
  Management and General Management Consulting Services', section:'54' }`.
- `naicsLookupCode('541618')` → `{ verified:true, label:'Other
  Management Consulting Services', section:'54' }` (the screenshot
  defect code is actually present in the local library; the defect
  was on the SAM.gov side returning unrelated rows).
- `naicsLookupCode('334519')` → `{ verified:false, code:'334519' }`
  with no invented description.
- `naicsRelatedCodes('541618', 4)` → siblings from the 5416/541
  prefix family.
- Exact mode keeps only exact-NAICS rows.
- Broader mode keeps 4-digit prefix family, drops unrelated.
- Keyword-only mode passes every row through (NAICS backstop skipped).
- Zero-match panel renders with the "No exact NAICS matches found"
  headline, all 5 action buttons, and the "SourceDeck does not show
  unrelated NAICS results as matches" disclaimer.
- Status line: `Showing up to 25 results · returned 3 · visible 0 ·
  exact NAICS 541618`.
- Broader handler flips the mode selector; keyword-only handler flips
  the selector and preserves the NAICS field; ApplyRelated populates
  the NAICS field and resets mode to exact.

### Safety scan residue

- No `guaranteed NAICS`, `officially classify`, `provide official
  NAICS classification`.
- No new `Submit Bid` / `Submit Quote` / `Send Email` / portal upload
  surface.
- No new `$79` / `$349` / `$999` pricing literals.
- No raw SAM.gov key in DOM or upsert payloads.
- All `legal classification` references are in DISCLAIMERS
  ("SourceDeck does NOT provide…") or negative-test fixtures.

### Boundaries preserved

- `.env`: not touched.
- Stashes: untouched (`git stash list` empty throughout).
- No deploy / publish / release tag.
- No live SAM.gov call on page load.
- No outbound email, vendor contact, agency contact, portal upload.
- Phase 23C reachability invariant honored — no DOM sections deleted.

## Sign-off

Audit conclusion: Phase 25T contract met. NAICS validation, mode
selection, broader/keyword-only fallback paths, and the actionable
zero-match panel give the buyer a forward path without compromising
the "no unrelated NAICS results" guarantee that Phase 25S established.

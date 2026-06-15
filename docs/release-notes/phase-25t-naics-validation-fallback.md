# Phase 25T — NAICS Validation + Fallback Search UX (Release Notes)

**Date:** 2026-06-15
**Branch:** `fix/phase-25t-naics-validation-fallback`
**Surface:** GovCon → Find Opportunities (in-app SAM.gov search)

## What's fixed

### 1. NAICS codes are validated against the local NAICS library

When you type a NAICS code into the Find Opportunities filter, the
field now reads each code (comma- or space-separated) against the
local NAICS library and shows the result inline:

- **Verified** — `✓ 541611 — Administrative Management and General
  Management Consulting Services`
- **Unverified** — `⚠ 541618 — not found in local NAICS library;
  verify before relying on it.`

Validation never blocks the search. SourceDeck never invents a
description for a code it cannot verify.

### 2. Three search modes for NAICS

A new **NAICS mode** dropdown appears next to the NAICS input:

- **Exact NAICS** (default) — only rows whose NAICS matches one of
  your codes are shown. SAM.gov returns are re-filtered locally so
  unrelated results never appear.
- **Broader / related NAICS** — matches rows by the 4-digit prefix
  family. Entering `541618` in broader mode matches any `5416…` code.
  Clearly labeled so you know it isn't an exact match.
- **Keyword only** — skips the NAICS filter for one search. The
  NAICS field value is preserved so you don't have to retype it.

### 3. Actionable zero-match panel

When SAM.gov returns rows but none survive the exact-NAICS filter,
the old "Adjust filters or pick different values" status is replaced
with a panel:

> **No exact NAICS matches found**
> SAM.gov returned 25 rows, but none matched NAICS 541618 after
> exact filtering.
>
> [↔ Search broader related NAICS] [⌕ Clear NAICS and search
> keyword only] [🔎 Open Find NAICS] [💾 Save this NAICS anyway]
> [🔢 Change result count]
>
> Related codes in the local library:
>   541611 — Administrative Management... [Use this]
>   541330 — Engineering Services        [Use this]
>   ...
>
> _SourceDeck does not show unrelated NAICS results as matches._

Every button is a one-click forward path. **Use this** populates the
NAICS field with the related code and re-runs the search in exact
mode.

### 4. Saved NAICS profiles carry verification status

When you save a NAICS profile, each entry now records:

- `code`
- `description` (only when the code is in the local library)
- `verified` (true/false)
- `source` (`local-library` or `manual`)

Manually-entered codes that aren't in the local library save with
`verified:false`, `source:'manual'` — you can still use them, but
the profile honestly tells you they aren't verified.

### 5. Status line shows mode + counts

After every search the status line now reads:

- `Showing up to 25 results · returned 25 · visible 0 · exact NAICS 541618`
- `Showing up to 25 results · returned 25 · visible 12 · broader NAICS 541618`
- `Showing up to 25 results · returned 25 · visible 25 · keyword-only search`

You can always tell what's currently constraining your results.

## What did NOT change

- No auto-search on page load. Search remains user-triggered.
- No portal upload, email send, vendor outreach, or government
  submission.
- No raw SAM.gov key in DOM, logs, upsert payloads, or exports.
- No changes to pricing, Stripe/checkout, the approved SourceDeck
  logo, the GovCon tab-page architecture, the blank-canvas default
  state, or the request-access delivery model.
- SourceDeck still does not provide legal or official NAICS
  classification — NAICS validation is search/filter support only.
- Phase 23C reachability invariant honored — no DOM sections deleted.

## Verification

```bash
npm test                                              # all phase tests OK
npm run govcon:smoke                                  # 47 passes, 0 failures
npm run troubleshooting:scan                          # no fail/warn findings
node test/phase-25t-naics-validation.test.js          # OK
node test/phase-25t-naics-fallback-search.test.js     # OK
node test/phase-25t-naics-zero-match-ux.test.js       # OK
```

## Buyer-visible UX summary

| Before | After |
| ------ | ----- |
| Enter NAICS 541618 → "SAM.gov returned 25 rows but none matched NAICS 541618. Clear those filters or pick different values." (dead end) | Same exact filter, but now: validation chip confirms 541618 is in the library, zero-match panel offers broader / keyword-only / Find NAICS / save-anyway / change count, and a list of related codes you can click. |
| No way to tell whether a typed code is real or a typo. | Verified ✓ or Unverified ⚠ chip under the NAICS input. |
| Saved profiles stored a description even for unverified codes. | Saved entries carry `verified` + `source` flags so unverified codes are honestly labeled. |
| No way to do a one-shot keyword search without losing the NAICS code. | Keyword-only mode preserves the NAICS field. |

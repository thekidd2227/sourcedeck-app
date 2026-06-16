# Phase 25U — SAM.gov NAICS Query Repair (Release Notes)

**Date:** 2026-06-16
**Branch:** `fix/phase-25u-sam-naics-query-repair`
**Surface:** GovCon → Find Opportunities (in-app SAM.gov search) +
main-process SAM service.

## What's fixed (the headline)

When you searched for NAICS 541611 (or any code), SourceDeck was
running a **broad** SAM.gov search and then filtering out everything
that wasn't 541611 — usually filtering all 25 returned rows to zero.
That's why you kept seeing:

> SAM.gov returned 25 rows, but none matched NAICS 541611 after exact
> filtering.

**Root cause:** the IPC sanitizer that runs between the renderer and
the SAM service expected NAICS as an array but got a string, so it
silently dropped the NAICS filter. SAM.gov never even knew you'd
specified a NAICS code.

Phase 25U:

- Fixes the sanitizer to accept the renderer's actual payload shape
  (string NAICS, string set-aside, `dueWithinDays`, free-text
  `placeOfPerformance`, `status`).
- Passes the NAICS code(s) to SAM.gov via the canonical `ncode` query
  param.
- When NAICS is set, allows controlled pagination up to **5 pages**
  (capped) so the visible result-count target reflects matching
  opportunities, not broad-fetch rows.
- Sends the **broader-mode** prefix family to SAM.gov directly (e.g.
  searching `541618` in broader mode now sends `541330,541611,541618,
  541990` — the 5416-prefix family from the local NAICS library).
- Rewrites the zero-match copy so it honestly says what was searched,
  never implying that broad fallback rows were "exact NAICS results."

## What you'll see now

| Search | Before | After |
| ------ | ------ | ----- |
| NAICS 541611 (exact) | "SAM.gov returned 25 rows but none matched NAICS 541611" + dead end | Actual 541611 opportunities (when SAM.gov has any) OR "SourceDeck searched SAM.gov using NAICS 541611 and SAM.gov returned 0 matching records." with the fallback panel. |
| NAICS 541618 (broader) | Same dead end | Opportunities across the 5416 prefix family (541330, 541611, 541618, 541990) — every visible row labelled with its actual NAICS. |
| NAICS 541618 (keyword only) | NAICS filter still locally dropped non-matches | NAICS filter skipped on the server too; all returned rows visible. |
| Blank NAICS | Worked already | Still works — broad search returns up to your selected count. |
| Place of Performance `TX` | Filter ignored | SAM.gov receives `state=TX` filter; rows constrained server-side. |
| Closing within 30 days | Filter ignored | SAM.gov receives `rdlfrom`/`rdlto` window. |
| Status: Awarded | Filter ignored | SAM.gov returns award-bucket notices. |

## What did NOT change

- No auto-search on page load.
- No portal upload, email send, vendor outreach, or government
  submission.
- No raw SAM.gov key in DOM, logs, upsert payloads, or exports.
- No changes to pricing, Stripe/checkout, the approved SourceDeck
  logo, the GovCon tab-page architecture, the blank-canvas default
  state, or the request-access delivery model.
- NAICS remains search/filter support — SourceDeck does not provide
  legal or official NAICS classification.
- Phase 23C reachability invariant honored — no DOM sections removed.

## Verification

```bash
npm test                                                # 33 phase suites OK
npm run govcon:smoke                                    # 47 passes, 0 failures
npm run troubleshooting:scan                            # no fail/warn findings
node scripts/release-check.js                           # privacy gate ✓
node test/phase-25u-sam-naics-query-builder.test.js     # OK
node test/phase-25u-sam-naics-result-collection.test.js # OK
node test/phase-25u-sam-naics-no-match-truth.test.js    # OK
node test/phase-25u-sam-source-open-regression.test.js  # OK
```

## Manual test plan (after rebuild + Day 0 refresh)

Run each of these in the running app and verify the result:

1. NAICS **541330** (exact) → should return Engineering Services opportunities or honest "0 matching records."
2. NAICS **541611** (exact) → should return Administrative Management opportunities or honest "0 matching records."
3. NAICS **541618** (exact, then broader) → exact: 541618 rows only. Broader: rows across 541330/541611/541618/541990.
4. Blank NAICS → broad search returns up to your selected count.
5. NAICS + set-aside SDVOSB → server gets `typeOfSetAside` filter; visible rows are SDVOSB-labelled.
6. NAICS + place of performance `TX` → server gets `state=TX`; visible rows are TX.

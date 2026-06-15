# Phase 25S — SAM Filter Enforcement + Source Repair (Release Notes)

**Date:** 2026-06-15
**Branch:** `fix/phase-25s-sam-filter-open-source`
**Surface:** GovCon → Find Opportunities (in-app SAM.gov search)

## What's fixed

### 1. Search results now respect the NAICS and set-aside filters

The SAM.gov public API does not always honor every filter we send. When a
buyer entered NAICS 541611 and ran a search, the result list could
contain NAICS 334519, 333415, or 333611 rows. The renderer now applies
its own filter pass to the returned rows so the visible table is always
consistent with what the buyer asked for.

- The status line now reports **returned** (what SAM.gov sent) and
  **visible** (what survived the local filter) counts.
- When the post-filter list is empty but SAM.gov did return rows, the
  status line names the filter(s) that caused the drop:

  > SAM.gov returned 25 rows but none matched NAICS 541611 + set-aside
  > sdvosbc. Clear those filters or pick different values.

### 2. Active filter chips

A new line of text appears above the result table the moment the buyer
clicks **Search**:

> **Active filters:** Keyword: janitorial · NAICS: 541611 · Set-aside:
> sdvosbc · Place: TX · Closing within: 30 days

This way the buyer never has to guess why a search returned zero
opportunities — they see the constraints in plain language.

### 3. "Open SAM.gov Source" no longer risks leaking the API key

Previously this button fell through to `r.uiLink || r.url`. On endpoints
where SAM.gov returned the raw `api.sam.gov` URL (which can include
`api_key=…`), opening that link would leak the operator's credential
into the system browser history.

The new resolution path:

1. `uiLink` (sam.gov front-end — never carries `api_key`).
2. A non-`api.sam.gov` URL in `r.url` or `r.resourceLinks[0]`.
3. Built from `noticeId`: `https://sam.gov/opp/{noticeId}/view`.
4. Fall-through: `r.url` with `api_key=…` stripped, **only if** no
   `api_key` residue remains.

The button refuses to open any URL that still contains `api_key` after
stripping — defense in depth.

### 4. "View Details" opens an in-app modal

The button now renders a modal showing title, agency, solicitation
number, notice ID, NAICS, set-aside, posted/due dates, place of
performance, description, and a sanitized source URL — with quick
**Save / Mark Pursue / Open SAM.gov Source / Close** actions. No
separate window, no toast-only behavior.

### 5. Place of Performance no longer shows `[object Object]`

SAM.gov returns nested `{ city, state, zip, country }` objects (each
child may itself be `{ name, code }`). A single helper now flattens
those into a readable string like:

> `123 Main St · Austin, Texas, 78701`

The same normalizer is applied to the row template, the View Details
modal, and the upsert payload so saved opportunities also store
human-readable strings.

## What did NOT change

- No auto-search on page load. Search remains user-triggered.
- No portal upload, email send, vendor outreach, or government
  submission anywhere in this flow.
- No raw SAM.gov key appears in the DOM, in logs, in upsert payloads,
  or in any exported artifact.
- Pricing source-of-truth, Stripe/checkout, the approved SourceDeck
  logo, the GovCon tab-page architecture, the blank-canvas default
  state, and the request-access delivery model are all untouched.

## Verification

```bash
npm test                                              # all phase tests OK
npm run govcon:smoke                                  # 47 passes, 0 failures
npm run troubleshooting:scan                          # no fail/warn findings
node test/phase-25s-sam-filter-enforcement.test.js    # OK
node test/phase-25s-sam-open-source.test.js           # OK
node test/phase-25s-sam-result-normalization.test.js  # OK
```

## Buyer-visible UX summary

| Before | After |
| ------ | ----- |
| Search for NAICS 541611, see rows with NAICS 334519. | Search for NAICS 541611, see only 541611 rows; status line explains if any were dropped. |
| Buyer cannot tell which filters constrained the search. | Active filter chips render above the table. |
| "Open SAM.gov Source" sometimes does nothing, sometimes opens an `api.sam.gov` URL with the operator's key. | Always opens `sam.gov/opp/{noticeId}/view` (or refuses the URL outright). |
| "View Details" shows a toast. | "View Details" opens a full in-app modal with Save / Mark Pursue / Open Source / Close. |
| Place of Performance column shows `[object Object]`. | Column shows `City, State, Zip` (or street + city block for richer rows). |

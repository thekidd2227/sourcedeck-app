# Phase 25AA — SAM Filter Correctness

## Executive Conclusion
Live SAM.gov search now applies supported API filters instead of relying on local ad-hoc filtering.

## Supported Parameters
SourceDeck uses SAM.gov Opportunities parameters including `ncode`, `typeOfSetAside`, `state`, `zip`, `title`, `solnum`, `noticeid`, `organizationName`, `ptype`, `rdlfrom`, `rdlto`, `postedFrom`, `postedTo`, `limit`, and `offset`.

## NAICS Behavior
- If NAICS is entered, SourceDeck defaults to `Apply NAICS`.
- `Apply NAICS` sends `ncode`.
- `Broaden NAICS family` expands related/prefix codes before search.
- `Ignore NAICS` is explicit and shows "NAICS ignored by user."

## Set-Aside Mapping
- SDVOSB set-aside: `SDVOSBC`
- SDVOSB sole source: `SDVOSBS`
- HUBZone set-aside: `HZC`
- HUBZone sole source: `HZS`
- 8(a): `8A`
- WOSB: `WOSB`
- EDWOSB: `EDWOSB`
- VOSB: `VSA` where VA-specific

## Keyword Boundary
SAM.gov title metadata search is not reliable full attachment search. SourceDeck passes keyword to `title` for live SAM.gov search and locally filters the fields it actually has, including title and description snippets when available.

## Result Trust Labels
Results show source labels such as `Live SAM.gov`, `Local GovCon Index`, `Web Intel — verify on source`, and `Saved Pursuit`. Cached local results older than the freshness window are shown as stale.

# Phase 25Y — Contract Awards Intelligence

## Placement
- GovCon tab **Contract Awards** (`data-gc-tab="contract-awards"` →
  `#gc-tab-contract-awards`).
- Dashboard shortcut card (`data-dash-card="contract-awards"`) → opens GovCon
  and switches to the Contract Awards tab.

## Purpose
Research existing contracts / previous awards by keyword, NAICS, agency,
contractor/awardee, solicitation/contract number, place, or date range.

## Capability investigation
The repo has **no official contract-award API** wired in. Rather than fabricate
awards, Phase 25Y ships a provider-aware UI:
- `awardProviderConfigured()` checks for a future `sd.govcon.awardsSearch`
  bridge. None exists today → SourceDeck shows: "No contract-award data
  provider configured. Open SAM.gov Contracting or paste award data to
  structure." It never invents awards.
- **Open SAM.gov Contracting** → https://sam.gov/contracting (via the robust
  opener).
- **Paste Award Data → Structure Award Data → Save Award Intelligence**:
  pasted JSON/list is parsed (`parseAwards`), requiring an awardee or a
  contract/solicitation number — records without identity are dropped, and
  `api_key`-bearing source links are stripped.
- If a real awards provider is connected later, `gcCaRunSearch` routes through
  it and renders the same table.

## Output columns
Awardee, Amount, Date, Agency, Contract #, NAICS/PSC, Period of Performance,
Source link.

## Caveat
"Award data depends on available public sources. Verify before relying on it."
SourceDeck does not claim a complete incumbent search.

## Link to opportunity (Step 17)
Saved award intelligence records a `linkedPursuitId` (the active solicitation).
Saved pursuit Source Materials show **Award / Incumbent Clues** — matched by
linked id, NAICS, agency, or solicitation number — each flagged "verify on
source". With none: "No award/incumbent data linked yet. Search Contract
Awards."

## Safety
No auto-search on load. No fabricated awards. No raw key. No send/submit/upload.

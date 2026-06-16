# Phase 25V — GovCon Clutter Removal Audit

Audit of clutter removed from the active GovCon runtime and the safety posture
preserved.

## Removed from runtime

| Item | Before | After |
|------|--------|-------|
| GovCon Outreach OS card | `div.gc-os-helper` shown at the bottom of every GovCon tab (no `data-gc-tab-page`) | Removed; posture preserved in concise footers |
| Heavy "Human Review Required" panels | Large burgundy blocks (`rgba(110,31,44,0.45)`) at the bottom of Solicitation / Vendors / Pricing / Past Performance / Submission Readiness | Replaced with small `gc-safety-footer` lines |
| Scope tab | `data-gc-tab="scope"` button + `#gc-tab-scope` page | Removed (extraction lives in Proposal Workspace intake) |
| Stakeholder Graph | `#gc-stakeholder-graph` section + sample rows + `gcLoadStakeholderGraph`/`gcRenderStakeholderGraph`/`gcSyntheticInternalOwner` + tour entry + Capture Command Center caller | Removed entirely |
| Combined Vendors + Pricing tab | `data-gc-tab="vendors-pricing"` | Split into `vendors` + `pricing` |

## Concise safety footer (replacement copy)
> Draft-only workspace. SourceDeck does not submit, upload, or send external
> messages.

(Per-tab variants append the relevant boundary, e.g. "Vendor outreach requires
human approval; SourceDeck does not submit bids or quotes.")

## Safety posture preserved
- "SourceDeck does not submit bids" / "…bids or quotes" / "…bids, quotes, or
  government responses" copy retained across surfaces.
- "Human Review Required" literal retained (Submission Readiness footer).
- No `>Submit Bid<`, `>Submit Quote<`, or `>Send Email<` controls anywhere.
- No auto-contact / auto-send / portal upload.
- Raw SAM.gov key never exposed (unchanged).

## Safety scan result
`grep` for removed clutter and sample defaults in `sourcedeck.html` returns
only Phase 25V documentation comments describing the removals — no active
runtime clutter or default sample data. The capability internal-review
disclaimer (small) and the demo loader (explicit, gated behind
`isDemoActive()`) are intentional and acceptable.

## Demo / blank canvas
Fresh state is blank. Demo/sample data loads only via the explicit
`gcDemoLoadSample()` operator action (default state: "Demo data not loaded.
Working with operator-entered data only."). No auto-preload on boot.

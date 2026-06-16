# Phase 25V — Vendors / Pricing Separation + Persistence

## Separation
The congested combined "Vendors + Pricing" tab is split into two focused
GovCon tabs:

- **Vendors** (`data-gc-tab="vendors"`, section `#gc-vqr-pricing`) — Vendor
  Quote Room: vendor/subcontractor needs, vendor list, contact log, quote
  request status, response notes, credentials, risk notes, and add / edit /
  delete vendor rows.
- **Pricing** (`data-gc-tab="pricing"`, section `#gc-pricing-page`) — Pricing
  Worksheet: line items / cost categories, vendor quotes pulled from the
  Vendors tab (Quote Comparison), markup, overhead, profit, contingency, total
  bid estimate, and assumptions notes.

The combined `vendors-pricing` tab and page are removed.

## Per-solicitation persistence
Each feature persists locally, scoped to the selected solicitation.

- Active solicitation id: `sd.govcon.activeSolicitation.v1`.
- Working set (read by the existing renderers):
  - `sd.govcon.vendorQuotes.v1`
  - `sd.govcon.pricingWorksheet.v1`
  - `sd.govcon.primePartners.v1`
- Per-solicitation archive (map keyed by solicitation id):
  - `sd.govcon.vendorQuotes.bySol.v1`
  - `sd.govcon.pricingWorksheet.bySol.v1`
  - `sd.govcon.primePartners.bySol.v1`

### Behavior
- **Switching tabs never erases state** — renderers read from localStorage on
  every render, and the per-tab hook re-renders the active solicitation's
  working set.
- **Switching solicitations** archives the current working sets under the
  previous id and loads the selected id's sets (`gcV25SelectSolicitation`).
- **Add / edit / delete** persists the working set under the active
  solicitation (`gcV25PersistWorking`, wired into `gcVqrAddQuote`,
  `gcVqrDelete`, `gcVqrEdit`, `gcPpfAddPartner`, `gcPpfDelete`, `gcPpfEdit`,
  `gcPricingRecalc`, `gcPricingSaveAssumptions`).

### Pricing references vendor data
The Pricing tab's Quote Comparison table (`#gc-pr-quote-compare-table`) reads
received vendor quotes and the worksheet has a Subcontractor / vendor cost
field (`#gc-pr-f-vendor`).

## Boundaries
No external send. No vendor auto-contact. Manual entry only. No bid / quote
submission.

# Phase 25V — Saved Solicitation Workflow

Repairs the broken link between Saved Pursuits and the workspaces that act on a
solicitation.

## Before
Saved/pursuing opportunities appeared on the Saved Pursuits tab but did not
feed the Solicitation Workspace selector (`#gc-sol-opp-select`), which only
listed manual Capture Board entries and had no change handler. Vendors,
Pricing, and Prime Partners had no solicitation context at all.

## After
- A saved opportunity (Save / Mark Pursue from Find Opportunities, stored via
  `sd.govcon.opportunities.upsert` with `userStatus` of `saved` / `pursuing`)
  becomes a usable solicitation candidate.
- The **Saved Pursuits** tab lists all saved/pursuing opportunities.
- The **Solicitation**, **Vendors**, **Pricing**, and **Prime Partners** tabs
  each carry a "Selected solicitation" selector fed from
  `window.sd.govcon.opportunities.list()` (filtered to saved/pursuing).
- Selecting a pursuit on the Solicitation tab loads its metadata into the
  Solicitation Summary panel: title, agency, solicitation / notice number,
  NAICS, due date, place of performance, source URL, and notes / extraction
  state.

### Empty state
When there are no saved pursuits, each selector shows:
> No saved solicitations yet. Save or mark pursue from Find Opportunities,
> upload a solicitation, or paste solicitation text.

### No SAMPLE default
No `SAMPLE — Demo Only Opportunity` is preloaded as a default selection. The
selectors default to a neutral "not linked" / "no solicitation selected"
option. SAMPLE data exists only inside the explicit demo loader.

## Implementation
- `gcV25SolHook(tabId)` (invoked by `gcTabSwitch`) populates the relevant
  selector from saved pursuits, toggles the empty hint, and re-renders the
  tab's persisted working set.
- `gcV25SelectSolicitation(id)` sets the active solicitation
  (`sd.govcon.activeSolicitation.v1`) and swaps each feature's working set.
- `gcV25RenderSolMeta(opp)` renders solicitation metadata into
  `#gc-sol-summary`.

See [phase-25v-vendors-pricing-persistence](phase-25v-vendors-pricing-persistence.md)
for the per-solicitation persistence model.

## Boundaries
No auto-search on load. No send / submit / upload. Manual entry only.

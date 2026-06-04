# Phase 23C — GovCon Primary Navigation Reorder + Show All Tools Toggle

**Release date:** 2026-06-04
**Branch:** `feat/phase-23c-govcon-primary-navigation`

## What's new

SourceDeck now opens directly into **GovCon Capture OS** for the
buyer-demo experience. The GovCon navigation group is the first
section of the sidebar, the GovCon pane is the cold-open active tab,
and the rest of the commercial product (Operations, Alerts, Workflow,
Tools, Client, Intelligence, Healthcare) is grouped under an
**"Other business tools — Shown / Hidden"** toggle so a buyer can
focus on the GovCon experience without losing access to anything.

### Sidebar reorder

1. **GovCon Capture OS** (NEW primary group at top)
   - GovCon
   - Outreach
   - Prime Partners
2. **Other business tools — Shown / Hidden** (NEW toggle)
3. Other business tools · Operations
4. Other business tools · Alerts
5. Other business tools · Workflow
6. Other business tools · Tools
7. Other business tools · Client
8. Other business tools · Intelligence
9. Other business tools · Healthcare *(only visible when capability flag set, Phase 11 behaviour preserved)*

### Default-active tab

Cold open now lands on **GovCon Capture OS**, not Dashboard. Returning
users who previously chose another tab still land on that tab — the
`lcc_active_tab` localStorage key still takes priority. Only first-time
boots and the buyer demo environment get the new GovCon-first cold
open.

### Show All Tools toggle

A single sidebar control flips every "Other business tools · X"
section between `display:''` and `display:'none'`. Visibility-only —
no tab is removed from the DOM, no nav button is detached, and the
toggle never affects the GovCon primary group. Default state is
**Shown** on every cold open.

## What did not change (preserved)

- All 21 commercial nav buttons + 21 commercial tab-panes remain in
  the DOM. Lead Generator, Email Tracker, Ad Engine/Content, Daily
  Ops, Socials, Create Lead, AI Generate, Delivery, Clinical/EHR
  — all reachable.
- Phase 22B Capture Command Center, Phase 22C Solicitation Workspace
  + Compliance Matrix, Phase 22D Vendor Quote Room + Pricing
  Worksheet, Phase 22E Past Performance + Capability Statement +
  Prime Partner Finder, Phase 22F Submission Readiness Gate +
  Package Export — all intact.
- Phase 23A Demo Mode (Load Sample / Clear Sample) — intact and
  visible inside the now-default GovCon pane.
- Phase 23B GovCon Mode indicator + brand sub-label "GovCon
  Capture OS" — intact.
- Phase 21F removed System Readiness / System Flow tab — remains
  removed.
- Phase 20G `.btn-gold` guard — preserved.
- 899px responsive sidebar collapse — untouched (display/none toggle
  composes cleanly with the existing media query).

## Safety boundaries (unchanged)

- SourceDeck still **does not submit bids, quotes, or government
  responses**. There is no Send Email, Submit Bid, or Submit Quote
  button anywhere in the renderer.
- Response Desk remains **draft-only**: "never auto-sends, never
  auto-submits, and never dispatches email. All outbound responses
  require explicit human approval."
- SAM Sprint Free=1 NAICS copy — preserved.
- No signed / notarized completion claim.
- No FedRAMP / StateRAMP / HIPAA certification claim.
- Phase 23A signed-demo-build audit language — preserved.

## Migration notes

- Returning users keep their last-selected tab via `lcc_active_tab`
  localStorage. To force the new GovCon cold open for an existing
  user, clear that key.
- No data migrations. No schema changes. No new IPC channels.

## What's deferred to Phase 23D

- **23D-A** Signed-build CI workflow for macOS notarization
- **23D-B** Local-only Markdown export of the buyer-demo session
- **23D-C** "Last updated" timestamps inside Phase 22B Capture
  Command Center cards
- **23D-D** Validate responsive sidebar collapse at 899px under the
  new GovCon-primary layout on iPad and small laptop viewports
- **23D-E** Persist Show-All-Tools collapsed state in localStorage
- **23D-F** Keyboard shortcut to focus GovCon nav from anywhere

## Verification

- `npm test` — all 50 test files PASS
- `node test/govcon-primary-navigation.test.js` — 23/23 PASS
- `npm run release:evidence` — PASS
- `npm run troubleshooting:scan` — PASS
- `npm run govcon:smoke` — PASS (failures: 0)
- `npm run phase13:rc-check` — PASS (failures: 0)
- `npm run i18n:audit` — PASS (31/31)
- `npm run release:check` — PASS *(local-dev signing warn only)*
- Headless chromium runtime DOM sanity — 36/36 PASS

See `docs/audits/phase-23c-govcon-primary-navigation-audit.md` for
the full audit including the runtime harness results.

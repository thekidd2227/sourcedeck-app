# Release Note — Phase 24E Stakeholder Graph UI

**Branch:** `feat/phase-24e-stakeholder-graph-ui`
**Type:** UI assembly — implements the Phase 24E-PREP contract for the buyer-visible Stakeholder Graph surface.
**Base:** `main @ aa18e4d` (post-PR #87 — Phase 24E-PREP; post-PR #86 — Phase 24D runtime; post-PR #85 — Phase 24C).

## Summary

Adds a buyer-visible **Stakeholder Graph** section inside `#tab-govcon`, placed between the Phase 22E Prime Partner Finder (`#gc-ppf`) and the Phase 22F Submission Readiness Gate (`#gc-sub-gate`). The section reads the existing `window.sd.govcon.stakeholders({ opp, extras })` IPC bridge and renders a FAR-aware reference-intelligence surface. **No backend rewrite. No send / submit / upload behavior. No improper CO/COR outreach copy. No pricing change.**

## What changed

### Runtime (`sourcedeck.html`)

- One new `<section id="gc-stakeholder-graph">` with four child views (`#gc-stakeholder-by-opportunity`, `#gc-stakeholder-by-agency`, `#gc-stakeholder-teaming`, `#gc-stakeholder-internal-owner`) and one risk/ethics warning rail (`#gc-sg-risk-rail`).
- Six SAMPLE rows in the default state (1 contracting officer, 1 program office, 1 Small Business Specialist, 1 likely incumbent, 1 prime teaming partner, 1 vendor / subcontractor) plus 1 synthetic internal-capture-owner row with `data-synthetic="true"` marker.
- One agency-rollup sample row demonstrating the renderer-side aggregation pattern.
- Four new top-level renderer functions: `gcLoadStakeholderGraph()`, `gcRenderStakeholderGraph(graph)`, `gcSyntheticInternalOwner(profile)`, `gcRenderStakeholderEmptyState()`.

### Tests

- New `test/govcon-stakeholder-graph-ui.test.js` — 25-check regression suite (21 mandatory acceptance criteria from the Phase 24E-PREP test contract + 4 architecture guards for synthetic marker, IPC consumer, preload bridge).

### `package.json`

- Appends `&& node test/govcon-stakeholder-graph-ui.test.js` to the `npm test` chain.

### Docs

- `docs/product/phase-24e-stakeholder-graph-ui.md` — product narrative.
- `docs/release-notes/phase-24e-stakeholder-graph-ui.md` — this file.

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js`, `chartnav-integration.js` change.
- **No website-repo edit.** No payment / Stripe / checkout / pricing change.
- **No `docs/product/pricing-source-of-truth.md` edit.** No deprecated $79 / $349 / $999 reintroduced.
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- **No improper CO/COR outreach.** Backend already filters cold-outreach phrasing server-side; new UI copy regression-guarded by 12-phrase forbidden-list test.
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No live Gmail / live-inbox claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F removal preserved).
- **No PO-language reintroduced.**
- **No videos / screenshots / `.qa/` output committed. No `.env`, secrets, or stashes touched.**

## Implements

- `docs/product/phase-24e-stakeholder-graph-implementation-contract.md` — UI fields, 6 categories (5 backend + 1 synthetic), 5 views, placement between `#gc-ppf` and `#gc-sub-gate`, verbatim disclaimer and empty state, 12 forbidden phrases.
- `docs/product/phase-24e-stakeholder-graph-sample-data-contract.md` — 6 safe sample stakeholder records (one per category), mandatory SAMPLE chip, role-only labels, no real persons / emails / phones.
- `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md` — 21 numbered acceptance criteria + minimum required assertions.
- `docs/audits/phase-24e-stakeholder-graph-backend-ipc-readiness-audit.md` — verdict was **READY FOR UI IMPLEMENTATION**; no backend extension required.

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-stakeholder-graph-ui.test.js` (new) | ✅ **PASS 25/25** |
| `node test/govcon-core.test.js` | ✅ PASS 27/27 (stakeholder-graph backend assertions still pass) |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/govcon-operating-rhythm.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 |
| **`npm test` (full chain — 56 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Known issues

None. No pre-existing failures carried forward.

## Safety scan

All hits in the new section and test file appear in:
- Negative-assertion safety microcopy ("does not contact", "No portal upload").
- Forbidden-pattern lists in the test (the 12-phrase regression guard).
- Verbatim FAR safety note in the muted footer.

No active runtime behavior introduces a Send / Submit / Upload positive claim. No compliance-certification claim. No guaranteed-outcome claim. No deprecated pricing reintroduced. No System Readiness / `sysflow` restored.

## Migration

- **No data migration required.**
- **Electron startup unchanged.** Renderer boots; every inline `<script>` parses; `window.sd` bridge unchanged.
- **Existing users:** the new Stakeholder Graph section appears between Prime Partner Finder and Submission Readiness Gate on the GovCon tab. Default state shows six labeled SAMPLE rows. The live IPC path is wired and is invoked when an operator-selected opportunity becomes available via the Capture Command Center linkage.

## Stashes

Untouched.

## Next phase

**Phase 24C-2** — the deferred AI prompt-builder NAICS parameterization (`sourcedeck.html:4624-4642` and `:6853-6871`) is the last remaining one-operator business-model embedding in the renderer. Recommended scope: a small focused PR with async profile load + de-duplication of the two duplicate prompt blocks + synthetic-fixture comparison to avoid AI output regression.

Beyond Phase 24C-2, the Phase 24 series GovCon capture surface is complete end-to-end: Capture Command Center → Operating Rhythm → Solicitation Workspace → Vendor Quote Room → Past Performance / Capability Studio → Prime Partner Finder → Stakeholder Graph → Submission Readiness Gate, with the Audit Log panel and profile-driven SAM NAICS targeting throughout.

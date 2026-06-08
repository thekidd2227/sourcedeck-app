# Phase 24E — Stakeholder Graph UI

**Date:** 2026-06-08
**Branch:** `feat/phase-24e-stakeholder-graph-ui`
**Base:** `main @ aa18e4d` (post-PR #87 — Phase 24E-PREP contract docs; post-PR #86 — Phase 24D runtime; post-PR #85 — Phase 24C; post-PR #84 — Phase 24B; post-PR #83 — Phase 22B).
**Implements:** the Phase 24E-PREP implementation contract at `docs/product/phase-24e-stakeholder-graph-implementation-contract.md` and the 21-criterion test contract at `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md`.

## What was added

A single new `<section id="gc-stakeholder-graph">` placed inside `#tab-govcon` between Phase 22E's `#gc-ppf` (Prime Partner Finder) and Phase 22F's `#gc-sub-gate` (Submission Readiness Gate). The section contains four sibling views and one risk/ethics warning rail.

| Anchor | View | Backend source |
|---|---|---|
| `#gc-stakeholder-by-opportunity` | Per-opportunity stakeholder map (4 sample rows: CO + program office + SBS + likely incumbent) | `window.sd.govcon.stakeholders({ opp })` IPC; 5 backend categories |
| `#gc-stakeholder-by-agency` | Account / agency multi-opportunity rollup | Renderer-side aggregation across `window.sd.govcon.opportunities.list()` calls — composition pattern documented in Phase 24E-PREP audit §6.1 |
| `#gc-stakeholder-teaming` | Teaming / prime relationship map (2 sample rows: prime + vendor) | Filtered subset of opportunity graph where `category === 'partner_prime_or_sub'` |
| `#gc-stakeholder-internal-owner` | Internal owner map (1 sample row, synthetic) | Synthesized from pursuit profile; carries `data-synthetic="true"` marker so it can never be sent back through a backend-expecting code path |
| `#gc-sg-risk-rail` | Restricted communication window indicator | Driven by `graph.inRestrictedWindow` |

**6 sample rows** total in the default state, each with:
- `data-or-source="sample"` attribute and visible `SAMPLE` chip.
- `data-stakeholder-category` and `data-posture` attributes from the canonical backend taxonomy.
- Verbatim posture label (read from `graph.postureLabels[node.posture]` in the live path).
- Per-row "prohibited action" / engagement guidance.
- Role-only labels (no real person names, no real emails / phones).

**Renderer architecture (4 new top-level functions):**
- `async gcLoadStakeholderGraph(input)` — reads `window.sd.govcon.stakeholders` IPC and calls `gcRenderStakeholderGraph(graph)`.
- `gcRenderStakeholderGraph(graph)` — re-paints the opportunity + teaming views from a live `graph` payload; toggles the restricted-window rail.
- `gcSyntheticInternalOwner(profile)` — returns a frozen synthetic node with `synthetic: true` (verified by test).
- `gcRenderStakeholderEmptyState()` — reveals the verbatim empty-state copy.

**Verbatim copy shipped (regression-guarded):**
- Disclaimer: *"Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."*
- Empty state: *"Map agency, prime, vendor, and internal stakeholders to plan compliant capture actions. SourceDeck does not contact or submit to stakeholders."*
- FAR 3.104 safety note (verbatim from backend `SAFETY_NOTE`) in the muted footer.

## Why this improves the GovCon buyer story

Before this PR, the GovCon tab carried the full capture journey — Capture Command Center → Operating Rhythm → Solicitation Workspace → Vendor Quote Room → Past Performance / Capability Studio → Prime Partner Finder → Submission Readiness — but no surface that answered *"who are the stakeholders and what posture toward each role is appropriate?"* That gap is filled here.

The five views answer the five different stakeholder questions a capture manager asks:
- **Opportunity stakeholder map** — *for this RFP, who are the roles?*
- **Account / agency map** — *across all my pursuits at this agency, who do I know?*
- **Teaming / prime map** — *who am I teaming with on this one?*
- **Internal owner map** — *who on my side owns this pursuit?*
- **Risk / ethics warning rail** — *is this in a restricted communication window?*

Every view inherits the backend's FAR-aware posture model (`restricted`, `reference_only`, `research_target`, `outreach_candidate`, `engagement_candidate`). The UI never invents postures or rewrites posture wording.

## Backend services / capabilities surfaced

This is a **UI assembly** PR. No backend service edited.

- `services/govcon/stakeholder-graph.js` — `buildStakeholderGraph(opp, extras)`, `isInRestrictedWindow(opp)`, `POSTURE_LABELS`, `POSTURE_BY_CATEGORY`, `SAFETY_NOTE`.
- `services/stakeholders/index.js` — re-export wrapper.
- `api/index.js:264-267` — `appApi.govcon.stakeholders.forOpp({ opp, extras })`.
- `main.js:320-321` — `ipcMain.handle('govcon:stakeholders-for-opp', …)`.
- `preload.js:55` — `window.sd.govcon.stakeholders(payload)`.

Server-side banned-phrase filter (`/\bcold\s+(?:email|call|outreach)|cold[-]?dm|dm\s+the\s+(?:co|cor|contracting)\b/i`) is enforced by `buildStakeholderGraph` itself and continues to drop any node whose label/instructions contain those phrases.

## No-send / no-submit / no-upload boundaries

The Stakeholder Graph surface adds **zero** outbound action. Explicitly:

- ❌ **No Send Email button.** Same posture as Response Desk and Submission Readiness.
- ❌ **No Submit Bid / Submit Quote button.**
- ❌ **No "Export and submit" wording.**
- ❌ **No portal upload positive claim.** Allowed only in negative-assertion copy ("No portal upload").
- ❌ **No `auto_send: true` / `auto_submit: true` introduced.**
- ❌ **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- ❌ **No improper CO/COR outreach copy.** All 12 forbidden phrases from the implementation contract §D regression-guarded by the test.
- ❌ **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- ❌ **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- ❌ **No live Gmail / live-inbox claim.**

## Pricing source-of-truth citation

This PR introduces **no buyer-facing pricing copy** in the new section. The Stakeholder Graph is a reference-intelligence panel; pricing is not referenced. If any future iteration adds tier-gated rows (e.g., "Multi-client switching available in Operator Plus"), that copy MUST cite and follow `docs/product/pricing-source-of-truth.md`:

- Solo Capture — $149/mo
- GovCon Operator — $499/mo or $4,990/yr
- Operator Plus — $997/mo or $9,970/yr
- Enterprise — custom
- Implementation services — Self-Install $1,497 / Guided $3,497 / DFY $5,997

The deprecated V2 amounts ($79 / $349 / $999) are not used anywhere in the new section. The test regression-guards their absence.

## Surfaces preserved (verified by sentinel sweep)

- ✅ Phase 22B Operating Rhythm parent (`#gc-operating-rhythm`) + 5 panels.
- ✅ Phase 22B Capture Command Center (`#gc-capture-cc`).
- ✅ Phase 22C Solicitation Workspace (`#gc-sol-workspace`).
- ✅ Phase 22D Vendor Quote Room + Pricing Worksheet (`#gc-vqr`, `#gc-pricing`).
- ✅ Phase 22E Past Performance / Capability / Prime Partner (`#gc-pp`, `#gc-cs`, `#gc-ppf`).
- ✅ Phase 22F Submission Readiness Gate (`#gc-sub-gate`).
- ✅ Phase 24B Audit Log panel (`#gc-audit-log`) + `gcAuditRefresh()`.
- ✅ Phase 24B profile-driven SAM NAICS loader (`gcLoadTargetingNaics()`).
- ✅ Phase 24C profile-driven NAICS filter dropdown (`gcRenderNaicsFilter()`).
- ✅ Phase 24D Past Performance + Capability Statement UI surfaces.
- ✅ Response Desk import-first surface + `auto_send: false` posture.
- ✅ SAM Sprint Free=1 NAICS / paid=many entitlement.
- ✅ System Readiness / `sysflow` removal (Phase 21F).
- ✅ Phase 20G `.btn-gold` cool-gold guard + 900/899 px responsive breakpoint.
- ✅ Phase 23C GovCon-first default-active tab (`tab-govcon`).
- ✅ Phase 23D "Last Updated" 5-chip count (one per workflow section) — Stakeholder Graph intentionally does NOT add a 6th chip; the section is reference-intelligence and its data freshness is read from `graph.inRestrictedWindow` and the backend's per-render timestamp, not from a static chip.

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-stakeholder-graph-ui.test.js` (new) | ✅ **PASS 25/25** (21 acceptance criteria + 4 architecture guards) |
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
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 (Phase 24C fix preserved) |
| **`npm test` (full chain, 56 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | +new `<section id="gc-stakeholder-graph">` with 4 views, 6 SAMPLE rows, FAR safety note; +4 new renderer functions (`gcLoadStakeholderGraph`, `gcRenderStakeholderGraph`, `gcSyntheticInternalOwner`, `gcRenderStakeholderEmptyState`) |
| `test/govcon-stakeholder-graph-ui.test.js` | new, 25 checks |
| `package.json` | +1 line, wires new test into `npm test` chain |
| `docs/product/phase-24e-stakeholder-graph-ui.md` | this file |
| `docs/release-notes/phase-24e-stakeholder-graph-ui.md` | release note |

## Manual QA steps

1. Cold-launch the desktop app. Open the **GovCon** tab.
2. Scroll past the Prime Partner Finder section (`#gc-ppf`) — the new **Stakeholder Graph** section should appear immediately after.
3. Confirm the verbatim disclaimer in the section header: *"Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."*
4. Confirm the red **RESTRICTED WINDOW** rail is visible at the top of the section (sample state).
5. Confirm the **Opportunity stakeholder map** view shows 4 sample rows: Contracting officer (CO) with a red "Restricted communication window" warning, Program / mission office, Small Business Specialist (SBS), Likely incumbent.
6. Confirm the **Account / agency stakeholder map** view shows the 3-opportunity rollup sample row.
7. Confirm the **Teaming / prime relationship map** view shows 2 sample rows: Potential teaming partner (prime), Potential subcontractor / vendor.
8. Confirm the **Internal owner map** view shows the synthetic row labeled "Internal capture owner".
9. Confirm every sample row carries a visible `SAMPLE` chip and an explicit posture label.
10. Confirm the FAR 3.104 safety note appears in the muted footer at the bottom of the section.
11. Confirm no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control appears anywhere in the new section.
12. Confirm the existing Phase 22B Operating Rhythm panels, Phase 24B Audit Log panel, Phase 24C NAICS filter dropdown, and Phase 24D Past Performance / Capability Statement surfaces are all intact.

## Known issues

None. The pre-existing `opportunity-outreach.test.js` 27/28 failure that carried across PRs #82 → #84 was fixed in PR #85 (Phase 24C); confirmed still 28/28 here.

## Confirmations

- ✅ `.env` not touched. No API key printed. No secret exposed.
- ✅ Stashes untouched.
- ✅ No website-repo edit.
- ✅ No payment / Stripe / checkout / pricing change.
- ✅ No live SAM run. No outreach drafted, sent, or queued.
- ✅ No bid / quote / proposal submission. No portal upload.
- ✅ No deploy. No videos / screenshots / `.qa/` committed.
- ✅ Electron startup unchanged. Renderer boots; every inline `<script>` parses.
- ✅ FAR-aware stakeholder language preserved.
- ✅ No improper CO/COR outreach.

## Next phase

The buyer-facing GovCon capture journey now ships end-to-end: Capture Command Center → Operating Rhythm → Solicitation Workspace → Vendor Quote Room → Past Performance / Capability Studio → Prime Partner Finder → **Stakeholder Graph** → Submission Readiness Gate, with Audit Log panel and profile-driven SAM NAICS targeting.

The remaining Phase 24-series follow-up is **Phase 24C-2** — the deferred AI prompt-builder NAICS parameterization (`sourcedeck.html:4624-4642` and `:6853-6871`). It is the last remaining one-operator business-model embedding in the renderer. Recommended scope: a small focused PR with async profile load + de-duplication + synthetic-fixture comparison.

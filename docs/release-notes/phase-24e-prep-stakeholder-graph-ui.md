# Release Note — Phase 24E-PREP Stakeholder Graph UI Contract

**Branch:** `docs/phase-24e-stakeholder-graph-contract`
**Type:** Docs-only preparation — implementation contract, backend/IPC readiness audit, sample-data contract, acceptance criteria for a later runtime PR.
**Base:** `main @ 7fc16dc` (post-PR #85 — Phase 24C; post-PR #84 — Phase 24B; post-PR #83 — Phase 22B; post-PR #82 — Phase 22A-P pricing source-of-truth).

## Summary

Phase 24E-PREP is the parallel-safe preparation work for the Stakeholder Graph UI. It produces the implementation contract, backend/IPC inventory, sample-data contract, buyer-workflow copy, QA checklist, and acceptance criteria so a later runtime agent can implement the UI with **zero ambiguity** after Phase 24D-PREP (Past Performance Library + Capability Statement Studio) merges.

**This PR adds five docs. No runtime change. No service change. No test change. No `sourcedeck.html` edit. No `package.json` edit. No website-repo edit.**

## What changed

### Docs added (5)

| File | Purpose |
|---|---|
| `docs/audits/phase-24e-stakeholder-graph-backend-ipc-readiness-audit.md` | Read-only inventory. Decision: **READY FOR UI IMPLEMENTATION** — backend complete, IPC wired, FAR-aware safety constants exposed, service-level tests assert core invariants. UI is the only missing piece. |
| `docs/product/phase-24e-stakeholder-graph-implementation-contract.md` | Implementation contract: required UI fields, 6 stakeholder categories (5 backend + 1 synthetic), 5 required views, required empty state, FAR-aware compliance language, 12 forbidden phrases, placement inside `#tab-govcon`, recommended renderer architecture. |
| `docs/product/phase-24e-stakeholder-graph-sample-data-contract.md` | Six safe sample stakeholder records (one per category the contract calls for) with the verbatim banner copy, audit-log emission expectations, and forbidden-phrase guard list. |
| `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md` | 21 numbered acceptance criteria + minimum required assertions for the future `test/govcon-stakeholder-graph-ui.test.js`, sentinel-test sweep, manual-QA checklist, reviewer checklist. |
| `docs/release-notes/phase-24e-prep-stakeholder-graph-ui.md` | This file. |

### Runtime

**None.** Specifically:

- No edits to `sourcedeck.html`. (Confirmed by `git diff --name-only`.)
- No edits to `services/**`, `api/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `package.json`, `package-lock.json`, `scripts/**`, `test/**`.
- No edits to `.env`. No secret printed.
- No edits to `docs/product/pricing-source-of-truth.md` (Phase 22A-P canonical pricing preserved).
- No edits to Phase 24D-PREP doc paths (the parallel agent's files; explicitly excluded by the mission's forbidden-file list).
- No edits to the website repo (`sourcedeck-site`).

## What did NOT change

- **No payment / Stripe / checkout / pricing change.**
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- **No improper outreach to government officials** — the contract explicitly forbids 12 phrases including "Contact CO", "Email COR", "Influence buyer", "Submit to agency", "Send to contracting officer", "Backchannel", "Lobby this office", "Circumvent competition", "Portal upload" (as positive claim), "Agency submission complete", "Guaranteed award", "Preferred relationship".
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F removal preserved in contract §E.1).
- **No deprecated $79 / $349 / $999 pricing reintroduced** anywhere.
- **No videos / screenshots / `.qa/` output committed.**
- **No stash touched.**
- **No Phase 24D-PREP file touched.**

## Backend/IPC readiness decision (companion audit)

**READY FOR UI IMPLEMENTATION.** Verified by inspection of:

- `services/govcon/stakeholder-graph.js` (179 lines) — `buildStakeholderGraph(opp, extras)`, `isInRestrictedWindow(opp)`, `POSTURE_LABELS`, `POSTURE_BY_CATEGORY`, `SAFETY_NOTE`.
- `services/stakeholders/index.js` (27 lines) — re-export surface.
- `api/index.js:264-267` — `api.govcon.stakeholders.forOpp({ opp, extras })`.
- `main.js:320-321` — `ipcMain.handle('govcon:stakeholders-for-opp', …)`.
- `preload.js:55` — `window.sd.govcon.stakeholders(payload)`.
- `test/govcon-core.test.js` — 3 stakeholder-graph assertions on `main`.
- `test/architecture-boundary.test.js` — 2 stakeholder-graph assertions on `main`.

Two optional UI-side composition gaps are documented (multi-opportunity rollup, internal-owner role) — both are pure renderer aggregation patterns and **do not require backend changes**.

## Stakeholder Graph UI contract summary

The contract specifies:

- **5 backend categories** (`contracting_office`, `program_office`, `incumbent`, `partner_prime_or_sub`, `industry_day`) + **1 synthetic renderer-only category** (`internal_owner` with `synthetic: true` marker so it can never be sent back through a backend-expecting code path).
- **5 postures** with verbatim labels from `POSTURE_LABELS` (`restricted`, `reference_only`, `research_target`, `outreach_candidate`, `engagement_candidate`) + **1 synthetic UI posture** (`internal` for the internal-owner category).
- **5 views**: account/agency map, opportunity map, teaming/prime map, internal-owner map, risk/ethics warning rail.
- **Placement** between Prime Partner Finder (`#gc-ppf`) and Submission Readiness (`#gc-sub-gate`) inside `#tab-govcon`. **Must not** be buried under "Show All Tools" toggle.
- **Verbatim empty state**: *"Map agency, prime, vendor, and internal stakeholders to plan compliant capture actions. SourceDeck does not contact or submit to stakeholders."*
- **Verbatim disclaimer**: *"Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."*
- **Verbatim FAR safety note** from backend `SAFETY_NOTE` (FAR 3.104 + Section L communication windows).

## Sample-data contract summary

Six safe sample stakeholder records (1 per category) with:

- Role-only display names (no real persons).
- Generic / FOIA-safe organization names.
- Verbatim posture labels from `POSTURE_LABELS`.
- Prohibited-action warnings per category.
- Mandatory `SAMPLE` chip + `data-or-source="sample"` attribute on every row.
- Mandatory banner above sample rows: *"SAMPLE DEMO DATA — Replace before proposal use."*

Forbidden in any sample row: real person names, real emails / phones, "Contact CO" / "Email COR" / "Send to contracting officer" / "Backchannel" / "Lobby this office" / "Circumvent competition" / "Influence buyer" / "Preferred relationship" / portal-upload positive claims / agency-submission-complete positive claims / compliance-certification positive claims / guaranteed-outcome positive claims / deprecated $79 / $349 / $999 pricing.

## Compliance posture summary

The Stakeholder Graph surface is **reference intelligence only**. The contract:

- Forbids any "outreach permission" framing in copy.
- Forbids displaying real CO/COR/end-user names by default.
- Requires `restricted` posture styling that visually distinguishes from other postures.
- Requires displaying `graph.inRestrictedWindow === true` as a prominent banner when the opportunity is in an active solicitation window.
- Requires the backend's verbatim FAR 3.104 safety note in the panel's muted footer.
- Forbids the 12 forbidden phrases enumerated in implementation contract §D and in this release note above.
- Prohibits private/personally sensitive stakeholder data unless user-provided AND local-only (no server-side persistence; no remote sync; no upload).

## Safety scan

Forbidden-claim grep across the five new docs:

- `Free demo` / `Download now` / `Try now` / `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` / `package submitted` / `bid submitted` / `quote submitted` / `upload to SAM` / `upload to PIEE` / `upload to eBuy` / `upload to GSA` / `SourceDeck submits` / `files into SAM.gov` — present **only** in forbidden-pattern lists (the contract enumerates the prohibited phrases the future UI must avoid) and negative-assertion guard copy.
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — present **only** in forbidden-pattern lists and negative-assertion guard copy.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — present **only** in regression-guard language ("System Readiness / System Flow remains absent" / "Phase 21F removal preserved").
- `$79` / `$349` / `$999` — present **only** in deprecated-pricing references (the contract regression-guards against reintroducing them as active buyer-facing pricing).
- 12 stakeholder-specific forbidden phrases (`Contact CO`, `Email COR`, `Influence buyer`, `Backchannel`, `Circumvent competition`, `Lobby this office`, `Submit to agency`, `Send to contracting officer`, `Agency submission complete`, `Preferred relationship`, `Portal upload`, `Guaranteed award`) — present **only** in forbidden-pattern lists.

**No active runtime behavior, no active buyer-facing unsafe claim, no positive Send/Submit/Upload claim, no compliance-certification claim, no guaranteed-outcome claim** is introduced by any of the five new docs.

## Tests / gates run

This PR is docs-only. Sentinel gates are run for hygiene to prove no incidental regression:

| Gate | Expectation |
|---|---|
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 (Phase 24C fix preserved) |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Stashes

Untouched.

## Next action

After **Phase 24D-PREP** (Past Performance Library + Capability Statement Studio implementation contract) and the **Phase 24D runtime UI PR** both merge, a runtime agent can implement Phase 24E by following:

1. `docs/audits/phase-24e-stakeholder-graph-backend-ipc-readiness-audit.md` (backend/IPC readiness — verified READY).
2. `docs/product/phase-24e-stakeholder-graph-implementation-contract.md` (UI fields, views, placement, copy rules).
3. `docs/product/phase-24e-stakeholder-graph-sample-data-contract.md` (six sample stakeholder records, banner copy, audit-log emission).
4. `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md` (21 numbered criteria + future `test/govcon-stakeholder-graph-ui.test.js` minimum assertions + sentinel sweep + manual QA + reviewer checklist).

The Phase 24E runtime PR will be a small surgical patch: one new `<section id="gc-stakeholder-graph">` inside `#tab-govcon` between `#gc-ppf` and `#gc-sub-gate`; one renderer function reading the existing `window.sd.govcon.stakeholders` IPC; six sample rows; one new test file wired into `npm test`. **No backend rewrite required.**

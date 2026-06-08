# Release Note — Phase 24B GovCon Core Hardening

**Branch:** `feat/phase-24b-govcon-core-hardening`
**Type:** Product hardening — removes one-operator business-model hardcoding from the renderer; surfaces the existing audit log as a buyer-visible trust feature.
**Base:** `main` (post-PR #83 — operating rhythm UI; post-PR #82 — pricing source-of-truth).

## Summary

Audits and hardens the SourceDeck GovCon product core so the desktop app backs up the GovCon-first website positioning. Most of the GovCon backend already exists (30+ services under `services/govcon/**`) — this phase focuses on the two highest-ROI gaps the audit surfaced:

1. **The renderer hardcoded `APPROVED_NAICS` to one operator's specific business** (real estate / facility maintenance / staffing NAICS). Every SAM.gov search the renderer built used those codes — even on a fresh install with no targeting profile configured. Fixed.
2. **The audit log service existed and was wired through IPC, but had no buyer-visible UI surface.** Fixed.

## What changed

### Runtime (`sourcedeck.html`)

- Removed three hardcoded `APPROVED_NAICS = ['531311','531312','561210','561720','238220','238210','561320','561311','541611','541614']` literals (one in the SAM URL builder, one in the Apollo NAICS-match filter, one as a `runGovconSyncSingle` fallback).
- Added `gcLoadTargetingNaics()` async loader that reads the user-editable targeting profile via the existing `window.sd.govcon.getTargeting()` IPC (backend: `services/govcon/targeting-profile.js`).
- Loader runs on `DOMContentLoaded`; `window.APPROVED_NAICS` is now populated from the targeting profile, not from a baked-in list.
- `runGovconSync()` browser fallback, `runGovconSyncWide()`, and `runGovconSyncSingle()` all guard against an empty profile with a "Configure your NAICS in Settings → GovCon Targeting" toast. `runGovconSyncSingle` also validates 4–6 digit format and no longer falls back to a hardcoded `541611`.
- `isApprovedNaicsMatch()` (Apollo enrichment filter) reads from `window.APPROVED_NAICS` (now profile-driven).
- New `#gc-audit-log` panel added as the 5th child of the existing Phase 22B `#gc-operating-rhythm` grid. "↻ Refresh" button invokes `gcAuditRefresh()` which calls `window.sd.auditList({ limit: 25 })` (existing IPC) and renders each event as a card with timestamp, event type, status pill, and the already-redacted metadata blob. Empty / error / "bridge unavailable" states all handled.

### Tests

- New `test/govcon-core-hardening.test.js` — 12-check regression suite:
  - Renderer no longer hardcodes the legacy NAICS literal.
  - `gcLoadTargetingNaics()` reads via `window.sd.govcon.getTargeting`.
  - `runGovconSync` / `runGovconSyncWide` refresh + guard empty profile.
  - `runGovconSyncSingle` no longer falls back to literal `541611`.
  - `#gc-audit-log` panel exists inside `#gc-operating-rhythm`.
  - `gcAuditRefresh()` calls the audit IPC bridge, not localStorage / fetch.
  - Audit Log panel never claims auto-export / auto-upload / auto-transmit.
  - Renderer never constructs `Authorization: Bearer …` headers (credential-boundary regression guard).
  - Preload still pure IPC bridge.
  - Phase 22B Operating Rhythm parent + four prior panels remain intact.
  - Renderer-boot guard: every inline `<script>` still parses.

### `package.json`

- Appends `&& node test/govcon-core-hardening.test.js` to the end of the existing `npm test` chain.

### Docs

- `docs/product/phase-24b-govcon-core-hardening.md` — full audit narrative + 10-priority audit findings + what's implemented vs scaffolded + remaining gaps + migration notes + manual QA steps.
- `docs/release-notes/phase-24b-govcon-core-hardening.md` — this file.

## What did NOT change

- **No backend service edited.** No `services/**`, `main.js`, or `preload.js` change. The renderer reads through the existing IPC bridge that was already wired in PRs prior to this one.
- **No payment / Stripe / checkout / pricing change.** No website-repo edit.
- **No Send Email / Submit Bid / Submit Quote / "Export and submit" / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal.
- **No live integration invented.** SAM search continues to require an explicit operator-configured API key; without it the renderer opens the SAM.gov human search URL.
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed). No "guaranteed award" / "guaranteed revenue" / "unlimited AI" claim.
- **No live Gmail / live-inbox claim.** Response Desk import remains local/manual.
- **No improper outreach to contracting officers / CORs.** Stakeholder graph posture labels preserved; pre-RFP module's "never draft outreach to a CO/COR" guard preserved; FAR-aware stakeholder language unchanged.
- **No System Readiness / System Flow / `sysflow` resurrection** (Phase 21F removal preserved).
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` output touched.**

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-core-hardening.test.js` (new) | ✅ PASS 12/12 |
| `node test/govcon-core.test.js` | ✅ PASS 27/27 |
| `node test/govcon-operating-rhythm.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/credential-boundary.test.js` | ✅ PASS 14/14 |
| `node test/credential-boundary-openai-claude.test.js` | ✅ PASS |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `node test/renderer-airtable-migration.test.js` | ✅ PASS 12/12 |
| `node test/renderer-apollo-migration.test.js` | ✅ PASS 14/14 |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Known pre-existing issue (not caused by this PR)

`test/govcon-opportunity-outreach.test.js` continues to report `27/28 passed, 1 failed` — the same "active-solicitation needs review" assertion mismatch documented in PRs #82 and #83. Reproduces on clean `main` with this branch stashed. Out of scope for this hardening PR; flagged as a Phase 24C follow-up.

## Migration notes

- **No data migration required.** The existing electron-store `govcon.targeting` key is unchanged.
- **Existing users with a configured profile:** `gcLoadTargetingNaics()` reads the profile on app load — their existing setup continues to work.
- **Existing users without a configured profile:** clicking "Search SAM.gov" now surfaces a clear toast telling them to configure NAICS in Settings → GovCon Targeting. This is the correct product behavior; the previous build silently ran the search using one specific operator's NAICS list.
- **Electron app startup unchanged.** Renderer boots; every inline `<script>` parses; `window.sd` bridge unchanged.

## Stashes

Untouched.

## Next phase

**Phase 24C** — small focused follow-up PRs for the deferred items: fix the pre-existing `opportunity-outreach.test.js` 27/28; convert the GovCon NAICS filter dropdown (`sourcedeck.html:2035-2038`) to a profile-driven render; parameterize AI prompt-builder NAICS lists (lines 4624-4642 and 6853-6871) from the targeting profile.

**Phase 24D** — Past Performance Library + Capability Statement Studio buyer-visible UI surfaces (backend already exists in `services/govcon/past-performance.js` + `services/govcon/capability-statement-extractor.js`).

**Phase 24E** — Stakeholder Graph UI surface (backend already exists in `services/govcon/stakeholder-graph.js`).

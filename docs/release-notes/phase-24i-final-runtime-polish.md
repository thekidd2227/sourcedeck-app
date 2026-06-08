# Release Note — Phase 24I Final Runtime UX Polish

**Branch:** `fix/phase-24i-final-runtime-polish`
**Type:** Bug fix + UX polish — last runtime cleanup before final RC hardening.
**Base:** `main @ 253b2a7` (post-PR #91 — Phase 24C-2; post-PR #90 — Phase 24H buyer demo refresh; post-PR #89 — Phase 24E runtime).

## Summary

Three small surgical fixes:

1. **SAM.gov API key request moved out of the SAM Outreach screen.** Setup is now Settings-only. The Outreach screen shows presence-only status + a navigation button to Settings.
2. **Stakeholder Graph live-refreshes from Capture Command Center opportunity selection.** Phase 24E's `gcLoadStakeholderGraph()` is now invoked from `renderBidNoBidOut()` whenever the operator picks an opportunity. Sample fallback remains for the default state.
3. **Prime Partner Finder NAICS fallback fixed.** The lingering operator-specific `['541512','541611','541330','561210']` fallback is replaced with the Phase 24C `"Configure NAICS in Settings → GovCon Targeting"` prompt pattern.

**No backend rewrite. No new IPC. No live integration touched. No payment / pricing / website change. No send / submit / upload behavior.**

## What changed

### `sourcedeck.html`

- **SAM Outreach screen** (`#tab-outreach`): removed `<input id="out-samkey">`, removed `Save Key` button, removed `window.saveSamKey`. Replaced with `#out-samkey-pointer` container showing presence-only status + a "⚙ Configure SAM.gov API key in Settings" button (`openTab('settings')`).
- **Settings tab** (`#tab-settings`): added `<input id="s-samkey" type="password">` after Airtable PAT, with help text *"Used by the SAM.gov Opportunity Outreach scan and SAM Sprint. Phase 24I: setup is consolidated here."*
- **`saveSettings()`**: new SAM-gov block; reads `s-samkey` and persists via `window.sd.credentials.set('sam-gov', …)` (same secure-storage pattern as Airtable / Apollo / OpenAI / Claude). Raw value cleared from DOM after save.
- **Capture Command Center** `renderBidNoBidOut()`: ~12-line block maps the Capture-CC opportunity shape to the backend stakeholder-graph shape and calls `window.gcLoadStakeholderGraph({ opp })`. Wrapped in try/catch so existing sample fallback remains when the bridge is unavailable.
- **Prime Partner Finder** `loadUserNaics()`: legacy fallback `['541512','541611','541330','561210']` removed; empty profile now surfaces a disabled `<option>` showing "Configure NAICS in Settings → GovCon Targeting".

### Tests

- New `test/govcon-final-runtime-polish.test.js` — **23 checks** covering all three fixes plus regression guards for Phase 24B / 24C / 24C-2 / 24D / 24E surfaces, no-send / no-submit / no-upload boundaries, and renderer-boot.

### `package.json`

- Appends `&& node test/govcon-final-runtime-polish.test.js` to the `npm test` chain.

### Docs

- `docs/product/phase-24i-final-runtime-polish.md` — product narrative + migration notes.
- `docs/release-notes/phase-24i-final-runtime-polish.md` — this file.

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No new IPC handler.** SAM credential save uses the existing `sd.credentials.set` bridge.
- **No website-repo edit. No payment / Stripe / checkout / pricing change. No `docs/product/pricing-source-of-truth.md` edit.**
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send` / `auto_submit`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA.
- **No live SAM Sprint run, no outreach drafted/sent/queued, no bid/quote/proposal submission.**
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F preserved).
- **No deprecated $79 / $349 / $999 reintroduced as active app UI.**
- **GovCon Setup Wizard step 4 SAM key preserved** — the wizard is a one-time onboarding alternative to Settings; its existing `sd.credentials.set('sam-gov', …)` test continues to pass.
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-final-runtime-polish.test.js` (new) | ✅ **PASS 23/23** |
| `node test/govcon-prompt-naics-parameterization.test.js` | ✅ PASS 16/16 |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 |
| `node test/govcon-setup-wizard.test.js` | ✅ PASS 12/12 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-demo-polish.test.js` | ✅ PASS 27/27 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/govcon-past-performance-prime.test.js` | ✅ PASS |
| `node test/govcon-vendor-pricing.test.js` | ✅ PASS |
| `node test/govcon-solicitation-workspace.test.js` | ✅ PASS |
| `node test/govcon-capture-command-center.test.js` | ✅ PASS |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| **`npm test` (full chain — 58 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Migration

- **No data migration required.**
- **Existing users with a configured SAM key:** credential remains valid; the Outreach screen now shows `SAM.gov key: configured ✓` and a "Configure in Settings" button (for updating, not setting up from scratch).
- **Existing users without a SAM key:** Outreach screen shows `SAM.gov key: not set — scans run in demo mode` + the Settings-nav button.
- **Electron startup unchanged.**

## Stashes

Untouched.

## Next phase

**Final RC hardening** using the Phase 24F-PREP release-candidate readiness docs (PR #88).

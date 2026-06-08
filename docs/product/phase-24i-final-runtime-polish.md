# Phase 24I — Final Runtime UX Polish

**Date:** 2026-06-08
**Branch:** `fix/phase-24i-final-runtime-polish`
**Base:** `main @ 253b2a7` (post-PR #91 — Phase 24C-2; post-PR #90 — Phase 24H buyer demo refresh; post-PR #89 — Phase 24E runtime).

## Purpose

Three small surgical runtime UX fixes before final RC hardening:

1. **SAM API key setup → Settings only.** The SAM.gov Opportunity Outreach screen no longer prompts the operator to paste an API key. The Settings tab gets the only key-input form. The Outreach screen now displays presence-only status + a navigation button to Settings.
2. **Stakeholder Graph live wire-up.** Capture Command Center bid/no-bid opportunity selection now refreshes the Phase 24E Stakeholder Graph with the selected opportunity's context.
3. **Prime Partner Finder NAICS fallback.** The lingering operator-specific `['541512','541611','541330','561210']` hardcoded fallback at line 12207 is replaced with the same "Configure NAICS in Settings → GovCon Targeting" prompt pattern Phase 24C established for the GovCon NAICS filter dropdown.

## What changed

### 1. SAM API key setup → Settings only

**Before:** the SAM.gov Opportunity Outreach screen (`#tab-outreach`) had a password input, a "Save Key" button, and a status chip — the Settings tab did NOT have a SAM key input. This split the credential setup across two surfaces.

**After:**
- The Outreach screen replaces the input + button with a presence-only status chip (`#out-samkey-status`) + a "⚙ Configure SAM.gov API key in Settings" button that opens the Settings tab via `openTab('settings')`.
- The Settings tab (`#tab-settings`) gains a new `<input id="s-samkey" type="password">` field after Airtable PAT, with the help text *"Used by the SAM.gov Opportunity Outreach scan and SAM Sprint."*
- `saveSettings()` saves the SAM key via `window.sd.credentials.set('sam-gov', SAM_API_KEY)` — same secure-storage pattern as Airtable PAT, Apollo, OpenAI, Claude. The raw value is cleared from the DOM after save.
- The old renderer function `window.saveSamKey` is removed (no callers remain).
- `updateKeyStatus()` retained — it now drives the presence-only status chip on the Outreach screen.
- The GovCon Setup Wizard step 4 SAM key field is **preserved** (it's a one-time onboarding flow, complementary to Settings).

### 2. Stakeholder Graph live wire-up

The Phase 24E Stakeholder Graph already shipped with a `gcLoadStakeholderGraph({ opp, extras })` async helper, but no UI trigger invoked it. The Capture Command Center bid/no-bid dropdown is the natural opp-selection surface.

Inside `renderBidNoBidOut()` (the Capture Command Center handler that runs when the operator picks an opportunity from `#gc-cc-bidnobid-select`), a ~12-line block now maps the Capture-CC opportunity shape to the backend stakeholder-graph shape (`noticeId`, `solicitationNumber`, `noticeType`, `responseDeadline`, `agency`, `subAgency`, `contractingOffice`) and calls `window.gcLoadStakeholderGraph({ opp })`. The call is wrapped in `try`/`catch` so the existing sample fallback remains when the bridge is unavailable.

### 3. Prime Partner Finder NAICS fallback

`loadUserNaics()` (line 12207) previously fell back to `['541512', '541611', '541330', '561210']` — one operator's specific NAICS — when the targeting profile was empty. Replaced with the Phase 24C pattern: a disabled `<option>` showing *"Configure NAICS in Settings → GovCon Targeting"* and an empty selector body. No silent default to one operator's list.

## Test added

`test/govcon-final-runtime-polish.test.js` — **23 checks**:

| # | Check |
|---|---|
| 1 | SAM Outreach screen no longer has an `input[id="out-samkey"]`. |
| 2 | SAM Outreach screen no longer renders a "Save Key" button or `saveSamKey()` export. |
| 3 | SAM Outreach screen displays the Settings-pointer button (`Configure SAM.gov API key in Settings` + `openTab('settings')`). |
| 4 | Settings tab has the new `<input id="s-samkey" type="password">` + label. |
| 5 | `saveSettings()` reads `s-samkey` and saves via `sd.credentials.set('sam-gov', ...)`. |
| 6 | No raw API key value is hardcoded or constructed inline (`Bearer ` template literals / concat / `Authorization: "Bearer …"`). |
| 7 | `#gc-stakeholder-graph` and `#gc-stakeholder-by-opportunity` remain present. |
| 8 | `renderBidNoBidOut()` calls `window.gcLoadStakeholderGraph` with the opp-mapped payload. |
| 9 | Stakeholder Graph SAMPLE fallback rows (≥6 `data-or-source="sample"`) remain. |
| 10 | Prime Partner Finder no longer uses the `['541512','541611','541330','561210']` hardcoded fallback. |
| 11 | `loadUserNaics()` surfaces "Configure NAICS in Settings" when profile is empty. |
| 12 | Phase 24C-2 `gcPromptNaicsContext()` helper present + both `${gcPromptNaicsContext()}` substitutions intact. |
| 13 | Phase 24D `#gc-pp`, `#gc-cs`, `#gc-ppf` surfaces preserved. |
| 14 | Phase 24B `#gc-audit-log` + `#gc-audit-list` preserved. |
| 15-18 | No Send Email / Submit Bid / Submit Quote / "Export and submit" button anywhere. |
| 19 | No portal-upload / agency-submission-complete positive claim (negative-assertion checks). |
| 20 | System Readiness / `sysflow` remains removed. |
| 21 | Deprecated $79 / $349 / $999 not in active app UI. |
| 22 | Renderer-boot guard: every inline `<script>` still parses. |
| 23 | Test wired into `npm test` chain. |

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-final-runtime-polish.test.js` (new) | ✅ **PASS 23/23** |
| `node test/govcon-prompt-naics-parameterization.test.js` | ✅ PASS 16/16 |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 |
| `node test/govcon-setup-wizard.test.js` | ✅ PASS 12/12 (SAM-via-`sd.credentials.set('sam-gov', …)` assertion preserved) |
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

## Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | SAM key UI moved Outreach → Settings; `saveSettings()` SAM-gov save block; `saveSamKey()` removed; Capture-CC `renderBidNoBidOut()` hooks `gcLoadStakeholderGraph()`; Prime Partner Finder `loadUserNaics()` fallback fixed |
| `test/govcon-final-runtime-polish.test.js` | **new** — 23 checks |
| `package.json` | +1 line — wires new test into `npm test` |
| `docs/product/phase-24i-final-runtime-polish.md` | this file |
| `docs/release-notes/phase-24i-final-runtime-polish.md` | release note |

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No new IPC handler.** SAM credential storage uses the existing `window.sd.credentials.set('sam-gov', …)` bridge.
- **No website-repo edit. No payment / Stripe / checkout / pricing change.** `docs/product/pricing-source-of-truth.md` untouched.
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA.
- **No live integration invoked from this PR.** No live SAM Sprint run. No outreach drafted / sent / queued.
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection.**
- **No deprecated $79 / $349 / $999 reintroduced as active app UI.**
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**
- **Phase 24B / 24C / 24C-2 / 24D / 24E / 24F / 24H surfaces preserved.**
- **GovCon Setup Wizard step 4 SAM key preserved** (one-time onboarding flow, complementary to Settings; the wizard test continues to pass).

## SAM API key UX result

- ✅ **SAM Outreach screen no longer asks for an API key.** Input + Save button removed; replaced with presence-only status + Settings-nav button.
- ✅ **Settings is the only place** where the operator enters or updates the SAM.gov API key (the GovCon Setup Wizard step 4 remains as the one-time onboarding alternative; it persists via the same `sd.credentials.set('sam-gov', …)` adapter).
- ✅ **No raw API key value in renderer.** All storage goes through main-process `safeStorage` via the existing `sd.credentials.set` IPC; renderer holds only presence flags.

## Stakeholder Graph live wire-up result

- ✅ `renderBidNoBidOut()` in Capture Command Center now calls `window.gcLoadStakeholderGraph({ opp: {…mapped opp…} })` whenever the operator selects an opportunity from `#gc-cc-bidnobid-select`.
- ✅ Sample fallback rows remain in the Stakeholder Graph default state (≥6 SAMPLE rows preserved).
- ✅ No backend rewrite; no new IPC; no network call.

## Prime Partner Finder NAICS fallback result

- ✅ Legacy `['541512','541611','541330','561210']` fallback removed.
- ✅ Empty profile now surfaces the Phase 24C-compatible prompt `Configure NAICS in Settings → GovCon Targeting` as a disabled `<option>` in the selector.
- ✅ No silent one-operator defaults anywhere in the renderer.

## Safety scan

All forbidden-claim grep hits in changed surfaces appear in negative-assertion / regression-guard contexts. No active runtime behavior, no positive Send / Submit / Upload claim, no compliance certification, no guaranteed-outcome, no deprecated pricing, no `sysflow` restoration.

## Migration notes

- **No data migration required.** Existing credential stores untouched.
- **Existing users who already configured a SAM API key:** their credential remains valid (same `sam-gov` keystore slot); the Outreach screen now shows `SAM.gov key: configured ✓` instead of the old paste-field.
- **Existing users without a SAM API key:** the Outreach screen shows `SAM.gov key: not set — scans run in demo mode` + the "Configure SAM.gov API key in Settings" button.
- **Electron app startup unchanged.** Renderer boots; every inline `<script>` still parses; `window.sd` bridge unchanged.

## Confirmations

- ✅ `.env` not touched. No API key printed. No secret exposed.
- ✅ Stashes untouched.
- ✅ No website-repo edit. No payment / Stripe / checkout / pricing change. No deploy.
- ✅ No live SAM run. No outreach drafted, sent, or queued. No bid / quote / proposal submission.
- ✅ No videos / screenshots / `.qa/` committed.

## Next phase recommendation

**Final RC hardening** using the Phase 24F-PREP release-candidate readiness docs (PR #88). The GovCon capture surface and supporting credential UX are now end-to-end coherent:

> SAM.gov key entered in Settings (or Setup Wizard) → Capture Command Center selects an opportunity → Stakeholder Graph live-refreshes with FAR-aware posture model → Operating Rhythm → Solicitation Workspace → Vendor Quote Room → Past Performance / Capability Studio → Prime Partner Finder (profile-driven NAICS) → Submission Readiness Gate → Audit Log panel logs every action.

The remaining work is the Phase 24F RC checklist execution (release evidence capture, signed-build readiness, demo recording confirmation).

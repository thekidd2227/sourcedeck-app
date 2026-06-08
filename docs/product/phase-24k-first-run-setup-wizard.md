# Phase 24K — First-Run Setup Wizard + New Profile Onboarding Gate

**Date:** 2026-06-08
**Branch:** `feat/phase-24k-first-run-setup-wizard`
**Base:** `main @ 7861152` (post-PR #92 — Phase 24J-PREP).
**Companion audit:** `docs/audits/phase-24k-existing-setup-wizard-inventory.md` (pre-change baseline).

## Purpose

Make the existing GovCon Setup Wizard production-grade for first-time users and new profiles. The wizard now opens automatically on cold launch when setup is incomplete, persists an explicit setup-complete flag, surfaces a clear Welcome step, walks the operator through a Quick Setup Tour of all 15 GovCon Capture OS surfaces, and ends with a Final Confirmation checklist that anchors the no-send / no-submit boundary.

## Final credential UX rule (confirmed in this phase)

| Surface | SAM.gov API key request? |
|---|---|
| **Setup Wizard Step 5** | ✅ Allowed |
| **Settings → API Keys → SAM.gov API Key** | ✅ Allowed |
| **GovCon SAM search / SAM Sprint screen** | ❌ Forbidden (presence-only status + Settings-nav button) |
| Capture Command Center, Solicitation Workspace, Submission Readiness Gate, Internal Review Export, Response Desk, Demo screens, Audit Log | ❌ Forbidden |

This rule supersedes any earlier interpretation. The SAM key may be configured during onboarding (Setup Wizard) or managed later (Settings). It is never paste-prompted on a workflow screen.

## What changed (sourcedeck.html)

### Wizard step count: 9 → 11

New step roster (renumbered):

| Step | Title | New? | Notes |
|---|---|---|---|
| 1 | **Welcome to SourceDeck** | NEW | Verbatim "SourceDeck helps you organize GovCon pursuits from opportunity discovery to internal-review package. You stay in control of every send, upload, submission, and decision." |
| 2 | Business profile | preserved | (was Step 1) |
| 3 | Capability statement | preserved | (was Step 2) |
| 4 | GovCon targeting | preserved | (was Step 3) |
| 5 | SAM.gov API key | preserved + new copy | Adds verbatim "Add your SAM.gov API key here during setup, or manage it later in Settings. SourceDeck uses this key only for authorized SAM.gov opportunity lookup. The SAM search screen does not ask you to paste credentials." |
| 6 | AI agent API key | preserved + new copy | Adds verbatim "Only add keys for services you plan to use. You can skip keys now and add them later in Settings." |
| 7 | Creative / imaging API key | preserved | (was Step 6) |
| 8 | Social handles & platforms | preserved | (was Step 7) |
| 9 | Safety & approval rules | preserved | (was Step 8) |
| 10 | **Quick Setup Tour** | NEW | 15 features + video placeholder |
| 11 | **Finish + Final Confirmation checklist** | preserved + new checklist | 5 verbatim checkboxes |

`_GC_WIZ_MAX` updated to 11. Progress label updated to "Step 1 of 11".

### Persistent setup-complete state

- New localStorage key `sd.govcon.setupComplete` set to `'1'` by `gcWizFinish()`.
- New `gcIsSetupComplete()` helper reads it; returns `false` if missing or unreadable (fail-open).
- Auto-open gate consults `gcIsSetupComplete()` BEFORE the session flag — so users who completed setup once never see the wizard auto-reopen on subsequent launches.

### Cold-launch first-run trigger

- New `async function gcMaybeAutoOpenWizard()` registered on `DOMContentLoaded` with a 600 ms defer.
- Conditions to auto-open (all must hold):
  1. `gcIsSetupComplete()` is false.
  2. `sessionStorage.lcc_govcon_wizard_seen` is not `'1'` (per-session guard).
  3. `govconSetupComplete()` (profile-derived) is false after `refreshGovconSetupState()` runs.
- Corrupt or missing state **fails open** — the wizard shows so the operator can configure.
- Existing `openTab('govcon')` auto-open path is preserved; the new DOMContentLoaded path catches the cold-launch case where the GovCon tab is already the Phase 23C default-active tab.

### Settings reopen affordance

- New "⚙ Run Setup Wizard" button (`#s-run-setup-wizard`) added inside the Settings → API Keys card. Calls `openGovconSetupWizard()`. Does not erase saved credentials.

### Quick Setup Tour (Step 10)

Covers all 15 required features with one-row descriptions:

1. **Capture Command Center** — central pursuit board (advisory only)
2. **Operating Rhythm** — Daily Rhythm + Deadline & Q&A Calendar + Pre-RFP Intelligence + Agency Targeting Insights panels
3. **Solicitation Workspace** — Section L/M/B/C/H/K shred + starter compliance matrix
4. **Compliance Matrix** — per-requirement matrix bound to solicitation
5. **Vendor Quote Room** — vendor candidates + manual quote-status tracking (no auto-email)
6. **Pricing Worksheet** — advisory price/margin (operator sets bid price)
7. **Past Performance Library** — reusable PP citations (local storage)
8. **Capability Statement Studio** — per-opportunity tailoring (internal-review draft)
9. **Prime Partner Finder** — profile-NAICS-driven prime/sub team-up candidates
10. **Stakeholder Graph** — FAR-aware posture labels (reference intelligence)
11. **Submission Readiness Gate** — red/yellow/green advisory (never auto-submits)
12. **Internal Review Markdown Export** — local Markdown (operator delivers via own channel)
13. **Audit Log** — local-only evidence trail (no API keys / prompts / document contents)
14. **Response Desk** — import-first reply analysis (no Send Email)
15. **SAM Sprint** — plan-tier opportunity sprint (Free=1 NAICS, paid=multi; manual review required)

Each row carries a `data-tour-feature="<slug>"` attribute so the test contract can regression-guard coverage.

### Video placeholder

- Container `#gcwiz-tour-video` carries the verbatim placeholder text: `"Video walkthrough pending. Use the quick text tour below."`
- **No video asset is created or committed by this phase.** Per the mission's `Do not record videos` / `Do not commit videos/screenshots` rules.
- When a safe local video asset exists in a later phase, the placeholder is the obvious swap-in point.

### Final Confirmation checklist (Step 11)

Five verbatim checkbox items added to `#gcwiz-final-confirm`:

1. `gcwiz-confirm-internal-review` — "I understand SourceDeck prepares internal review materials."
2. `gcwiz-confirm-approve-externally` — "I understand I approve and send/upload/submit externally."
3. `gcwiz-confirm-sam-key-locations` — "I understand SAM.gov API key setup is available in Setup Wizard and Settings."
4. `gcwiz-confirm-sam-search-no-paste` — "I understand the SAM search screen does not ask me to paste credentials."
5. `gcwiz-confirm-replace-sample` — "I understand demo/sample data must be replaced before real use."

These checkboxes are advisory acknowledgments. They do not gate the Finish action programmatically (the existing UX pattern allows the operator to complete setup at their own pace).

## First-run trigger: behavior matrix

| Scenario | Auto-open? |
|---|---|
| Brand-new install, no profile data, no credentials | ✅ Yes (cold launch, ~600 ms after DOMContentLoaded) |
| Profile data exists but SAM key missing | ✅ Yes (govconSetupComplete() returns false) |
| Profile + SAM key both configured, but localStorage flag never set (e.g., user completed setup pre-Phase-24K and never re-finished) | ✅ Yes on first cold launch after upgrade (fail-open); after the user clicks Finish once, the localStorage flag persists and future launches skip auto-open |
| User clicked Finish previously (localStorage flag = `'1'`) | ❌ No |
| User dismissed wizard mid-session (sessionStorage flag = `'1'`) | ❌ No until next app launch |
| Corrupt or unreadable state | ✅ Yes (fail-open — operator can close) |

## New-profile / profile-aware behavior

SourceDeck is currently a **single-profile workspace**. The setup-complete state is therefore workspace-scoped (`localStorage.sd.govcon.setupComplete`). If a future phase introduces multi-profile switching, the helper `gcIsSetupComplete()` is the single chokepoint to extend — store per-profile keys like `sd.govcon.setupComplete.<profileId>` and pass the profileId at call sites. The current single-profile model is documented and tested.

If the operator clears their profile via Settings → reset (a flow that wipes the `sd.govcon.captureBoard.v1` / `govcon.pursuitProfile` keys), the next auto-open trigger will re-fire because `govconSetupComplete()` will derive `profileComplete=false`. The user can also call `localStorage.removeItem('sd.govcon.setupComplete')` from devtools to force a fresh first-run gate — this is documented for QA.

## Completion behavior

- On Finish click → `gcWizFinish()` runs:
  1. `gcWizSaveProfile()` persists the profile via the existing IPC bridge.
  2. **`localStorage.setItem('sd.govcon.setupComplete', '1')`** (new).
  3. `closeGovconSetupWizard()` dismisses the modal.
  4. `refreshGovconSetup()` re-derives setup state for the banner.
  5. `refreshWorkspaceCredentialStatus()` / `renderWorkspaceReadinessBanner()` update the readiness banner.
  6. Toast: `"GovCon operating profile saved"`.
- The user lands on the GovCon Capture OS default view (Phase 23C default-active `#tab-govcon`).

## Tests / gates

| Gate | Result |
|---|---|
| `node test/setup-wizard-first-run.test.js` (new) | ✅ **PASS 35/35** |
| `node test/govcon-setup-wizard.test.js` | ✅ PASS 12/12 (existing wizard test preserved) |
| `node test/govcon-operating-profile-wizard.test.js` | ✅ PASS 18/18 |
| `node test/govcon-operating-profile-completeness.test.js` | ✅ PASS 21/21 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 (Phase 24I credential UX preserved) |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-prompt-naics-parameterization.test.js` | ✅ PASS 16/16 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| **`npm test` (full chain — 59 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | New Welcome step (1) + Quick Setup Tour step (10) + Final Confirmation checklist (11); renumber existing steps; `_GC_WIZ_MAX` 9→11; progress label `Step 1 of 11`; persistent setup-complete flag in `gcWizFinish()`; new `gcIsSetupComplete()` + `gcMaybeAutoOpenWizard()` + DOMContentLoaded trigger; Settings "⚙ Run Setup Wizard" button; verbatim Phase 24K copy on SAM and AI key steps |
| `test/setup-wizard-first-run.test.js` | **new** — 35 checks |
| `package.json` | +1 line — wires new test into `npm test` |
| `docs/product/phase-24k-first-run-setup-wizard.md` | this file |
| `docs/audits/phase-24k-existing-setup-wizard-inventory.md` | pre-change baseline audit |
| `docs/release-notes/phase-24k-first-run-setup-wizard.md` | release note |

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No new IPC handler.** Wizard SAM key save continues to use the existing `sd.credentials.set('sam-gov', …)` bridge that Phase 24I + the existing wizard already use.
- **No new dependency added.**
- **No website-repo edit. No payment / Stripe / checkout / pricing change.** `docs/product/pricing-source-of-truth.md` untouched.
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send` / `auto_submit`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA.
- **No live SAM Sprint run. No outreach drafted, sent, or queued. No bid / quote / proposal submission.**
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F preserved).
- **No deprecated $79 / $349 / $999 reintroduced** as active app UI.
- **No video or screenshot committed.** Placeholder text only.
- **No `.env`, secrets, stashes, or `.qa/` touched.**
- **Phase 24B / 24C / 24C-2 / 24D / 24E / 24F / 24H / 24I / 24J surfaces all preserved.**

## Safety scan

Forbidden-claim grep on changed surfaces:

- `Free demo` / `Download now` / `Try now` / `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` — only in forbidden-pattern lists, negative-assertion guards, and historical/deprecated audit docs.
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — only in negative-assertion contexts.
- `Contact CO` / `Email COR` / `Influence buyer` / `Backchannel` / `Circumvent competition` / `Lobby this office` / `Submit to agency` / `Send to contracting officer` / `Agency submission complete` / `Preferred relationship` — only in Phase 24E forbidden-pattern regression-guard lists.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — only in regression-guard language.
- `$79` / `$349` / `$999` — only in deprecated-pricing historical docs.

The existing test `test/govcon-setup-wizard.test.js#wizard/banner copy does NOT claim compliant/certified/safe-to-send/fully-operational` still passes — verified that none of those forbidden terms appears in the new Welcome / Quick Tour / Final Confirmation copy.

## Migration notes

- **No data migration required.**
- **Existing users with a configured profile + SAM key (pre-24K):** on first cold launch after upgrade, the wizard will auto-open ONCE because the new `sd.govcon.setupComplete` flag was never set. The user clicks Finish (or closes the modal) and the flag persists for future launches. This is a one-time prompt.
- **Brand-new users:** the wizard auto-opens on cold launch and walks them through 11 steps.
- **Electron app startup unchanged.** Renderer boots; every inline `<script>` still parses; `window.sd` bridge unchanged.

## Next phase recommendation

**Final RC hardening** using the Phase 24F-PREP release-candidate packaging contract (PR #88) and the Phase 24J-PREP final RC evidence binder (PR #92). The setup wizard is now production-grade; the remaining work is RC-checklist execution (release evidence capture, signed-build readiness, demo recording confirmation).

The Phase 24L-PREP docs (currently being authored in parallel by Agent 2) will provide the final RC acceptance checklist that consumes this Phase 24K shape.

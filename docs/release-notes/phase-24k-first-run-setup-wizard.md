# Release Note — Phase 24K First-Run Setup Wizard + New Profile Onboarding Gate

**Branch:** `feat/phase-24k-first-run-setup-wizard`
**Type:** Onboarding UX — production-grade wizard with first-run auto-open + persistent setup-complete state + full feature walkthrough + Final Confirmation checklist.
**Base:** `main @ 7861152` (post-PR #92 — Phase 24J-PREP).

## Summary

The existing 9-step GovCon Setup Wizard is upgraded to a production-grade 11-step onboarding flow:

1. **Welcome / What SourceDeck does** (new) — verbatim mission copy explaining SourceDeck prepares internal review materials and the operator stays in control.
2. (existing) Business profile.
3. (existing) Capability statement.
4. (existing) GovCon targeting.
5. (existing, copy enriched) SAM.gov API key — verbatim "Add your SAM.gov API key here during setup, or manage it later in Settings. SourceDeck uses this key only for authorized SAM.gov opportunity lookup. The SAM search screen does not ask you to paste credentials."
6. (existing, copy enriched) AI agent API key — verbatim "Only add keys for services you plan to use. You can skip keys now and add them later in Settings."
7. (existing) Creative / imaging API key.
8. (existing) Social handles & platforms.
9. (existing) Safety & approval rules.
10. **Quick Setup Tour** (new) — 15 GovCon Capture OS features, each with a one-line description + a "Video walkthrough pending" placeholder.
11. (existing) Finish — now includes a **Final Confirmation checklist** (5 explicit understanding items).

**Persistent setup-complete state** (new): localStorage `sd.govcon.setupComplete = '1'` is set by `gcWizFinish()`. The auto-open gate consults this BEFORE the per-session flag, so users who completed setup once never see the wizard auto-reopen.

**Cold-launch first-run trigger** (new): `gcMaybeAutoOpenWizard()` runs ~600 ms after `DOMContentLoaded`. It catches the cold-launch case where `#tab-govcon` is already the Phase 23C default-active tab. Corrupt or unreadable state fails open (the wizard shows so the operator can configure).

**Settings reopen affordance** (new): "⚙ Run Setup Wizard" button in Settings → API Keys card.

**SAM.gov key final UX (confirmed)**: requested in Setup Wizard (Step 5) AND in Settings → API Keys. Never requested on the GovCon SAM search / SAM Sprint screen (Phase 24I preserved).

## What changed

### Runtime (`sourcedeck.html`)

- New Step 1 (Welcome) + Step 10 (Quick Setup Tour) + Final Confirmation checklist added to Step 11. Existing 9 steps preserved with renumbered `data-step` attributes.
- `_GC_WIZ_MAX` updated from 9 to 11. Progress label updated to "Step 1 of 11".
- New `gcIsSetupComplete()` helper (localStorage `sd.govcon.setupComplete`).
- `gcWizFinish()` persists `sd.govcon.setupComplete = '1'`.
- New `gcMaybeAutoOpenWizard()` + `DOMContentLoaded` registration.
- New Settings "⚙ Run Setup Wizard" button (`#s-run-setup-wizard`) wired to `openGovconSetupWizard()`.
- Wizard Step 5 (SAM key) and Step 6 (AI key) copy enriched with verbatim Phase 24K guidance.

### Test added

- `test/setup-wizard-first-run.test.js` — **35 checks** covering: wizard existence, first-run auto-open via DOMContentLoaded, persistent setup-complete, new-profile fall-open, all 11 step anchors, Welcome verbatim copy, Business + Targeting + SAM/AI/Creative API-key step preservation, SAM key in wizard AND in Settings AND NOT on search screen, Quick Setup Tour with all 15 features (data-tour-feature markers), video placeholder, Final Confirmation checklist (5 verbatim items), no Send Email / Submit Bid / Submit Quote / Export-and-submit, no portal-upload positive claim, System Readiness/`sysflow` remains removed, no deprecated $79/$349/$999, renderer-boot guard, npm-test chain wiring.

### `package.json`

- Appends `&& node test/setup-wizard-first-run.test.js` to the existing `npm test` chain.

### Docs

- `docs/product/phase-24k-first-run-setup-wizard.md` — product narrative + behavior matrix + migration notes.
- `docs/audits/phase-24k-existing-setup-wizard-inventory.md` — pre-change baseline audit (what the wizard looked like immediately before Phase 24K).
- `docs/release-notes/phase-24k-first-run-setup-wizard.md` — this file.

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No new IPC handler.** Wizard SAM key save continues to use the existing `sd.credentials.set('sam-gov', …)` bridge.
- **No new dependency.**
- **No website-repo edit. No payment / Stripe / checkout / pricing change.** `docs/product/pricing-source-of-truth.md` untouched.
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send` / `auto_submit`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA.
- **No live SAM Sprint run. No outreach drafted, sent, or queued. No bid / quote / proposal submission.**
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection.**
- **No deprecated $79 / $349 / $999 reintroduced as active app UI.**
- **No video, screenshot, or `.qa/` output committed.** Placeholder text only.
- **No `.env`, secrets, or stashes touched.**
- **Phase 24B / 24C / 24C-2 / 24D / 24E / 24F / 24H / 24I / 24J surfaces all preserved.**
- **Phase 24I Settings SAM-key flow preserved verbatim** — `#tab-settings` → `#s-samkey` → `saveSettings()` → `sd.credentials.set('sam-gov', …)`.

## Tests / gates

| Gate | Result |
|---|---|
| `node test/setup-wizard-first-run.test.js` (new) | ✅ **PASS 35/35** |
| `node test/govcon-setup-wizard.test.js` | ✅ PASS 12/12 |
| `node test/govcon-operating-profile-wizard.test.js` | ✅ PASS 18/18 |
| `node test/govcon-operating-profile-completeness.test.js` | ✅ PASS 21/21 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-prompt-naics-parameterization.test.js` | ✅ PASS 16/16 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| **`npm test` (full chain — 59 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Migration

- **No data migration required.**
- **Existing users with configured profile + SAM key:** the wizard auto-opens once on first cold launch after upgrade (because the new `sd.govcon.setupComplete` flag was not previously set). One click Finish → flag persists → future launches skip auto-open.
- **Brand-new users:** the wizard auto-opens on cold launch and walks them through 11 steps.
- **Electron startup unchanged.** Renderer boots; every inline `<script>` still parses; `window.sd` bridge unchanged.

## Stashes

Untouched.

## Next phase

**Final RC hardening** using the Phase 24F-PREP release-candidate packaging contract (PR #88) and the Phase 24J-PREP final RC evidence binder (PR #92). The Phase 24L-PREP docs (Agent 2, in parallel) will provide the setup-wizard RC acceptance checklist that consumes this Phase 24K shape.

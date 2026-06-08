# Phase 24M — Final RC Hardening Audit

**Date:** 2026-06-08
**Branch:** `docs/phase-24m-final-rc-hardening`
**Base:** `main @ 5637bc3` (post-PR #95 — Phase 24K first-run setup wizard).
**Posture:** Read-only audit + gate execution + decision. **No runtime change.** No backend rewrite. No website-repo edit. No new feature work.

## 1. Current main reconciliation

| Item | Value |
|---|---|
| HEAD | `5637bc3` `feat(onboarding): add first-run setup wizard (#95)` |
| Branch | `main` |
| Working tree | clean (no untracked files outside docs/.codex/.tmp/.qa/ which are gitignored) |
| Stashes | none |
| Open PRs | none expected at audit start |

Merged-PR lineage (most recent first, with the Phase 24-series contribution):

| PR | Commit | Phase | Contribution |
|---|---|---|---|
| #95 | `5637bc3` | 24K | First-run setup wizard + new-profile onboarding gate (11 steps, Quick Setup Tour, Final Confirmation, persistent setup-complete, cold-launch auto-open, Settings reopen button) |
| #94 | `fa07b4b` | 24L-PREP | Setup-wizard RC acceptance checklist + pilot onboarding QA contract + API-key boundary contract + final RC readiness doc |
| #93 | `bfb2bc4` | 24I | SAM key runtime polish (Settings-only), Stakeholder Graph live wire-up (Capture-CC opp-selection hook), Prime Partner Finder NAICS fallback cleanup |
| #92 | `7861152` | 24J-PREP | Final RC evidence binder, limited paid pilot handoff, operator demo runbook, public release NO-GO boundaries |
| #91 | `253b2a7` | 24C-2 | AI prompt-builder NAICS parameterization (`gcPromptNaicsContext()`) |
| #90 | `0e6a05d` | 24H-PREP | Buyer demo storyboard + walkthrough script + demo QA checklist |
| #89 | `a4fc8b6` | 24E | Stakeholder Graph UI (4 views + risk-rail + FAR-aware posture) |
| #88 | `229c6b6` | 24F-PREP | RC packaging contract + no-send/no-submit compliance checklist + buyer pilot readiness checklist + support onboarding contract |
| #87 | `aa18e4d` | 24E-PREP | Stakeholder Graph implementation contract + backend/IPC readiness audit + sample-data contract + UI acceptance criteria |
| #86 | `c69ddac` | 24D | Past Performance Library + Capability Statement Studio + Prime Partner Finder UI |
| #85 | `7fc16dc` | 24C | Outreach status fix (`activeSolicitation(opp, nowMs)` injectable clock) + profile-driven NAICS filter dropdown |
| #84 | `e098d6a` | 24B | GovCon core hardening (Audit Log UI, profile-driven SAM NAICS loader, no-op operator-NAICS in `isApprovedNaicsMatch`) |

No missing merge. No blocking open PR.

## 2. Test / gate results

### Individual sentinel tests (26 named tests, all PASS)

| Test | Result |
|---|---|
| `setup-wizard-first-run` | ✅ PASS 35/35 |
| `govcon-setup-wizard` | ✅ PASS 12/12 |
| `govcon-operating-profile-wizard` | ✅ PASS 18/18 |
| `govcon-operating-profile-completeness` | ✅ PASS 21/21 |
| `govcon-final-runtime-polish` | ✅ PASS 23/23 |
| `govcon-prompt-naics-parameterization` | ✅ PASS 16/16 |
| `govcon-stakeholder-graph-ui` | ✅ PASS 25/25 |
| `govcon-past-performance-capability-ui` | ✅ PASS 15/15 |
| `govcon-core-hardening` | ✅ PASS 15/15 |
| `govcon-opportunity-outreach` | ✅ PASS 28/28 |
| `remove-system-readiness-tab` | ✅ PASS 9/9 |
| `renderer-boot` | ✅ PASS 7/7 |
| `govcon-demo-recording-blockers` | ✅ PASS 32/32 |
| `govcon-demo-delivery-polish` | ✅ PASS 26/26 |
| `govcon-primary-navigation` | ✅ PASS 23/23 |
| `govcon-mode-navigation` | ✅ PASS 17/17 |
| `govcon-demo-polish` | ✅ PASS 27/27 |
| `govcon-submission-readiness` | ✅ PASS 30/30 |
| `govcon-past-performance-prime` | ✅ PASS 24/24 |
| `govcon-vendor-pricing` | ✅ PASS 25/25 |
| `govcon-solicitation-workspace` | ✅ PASS 19/19 |
| `govcon-capture-command-center` | ✅ PASS 15/15 |
| `response-desk` | ✅ PASS 24/24 |
| `response-desk-email-import` | ✅ PASS 20/20 |
| `default-state-policy` | ✅ PASS 22/22 |
| `sam-opportunity-sprint` | ✅ PASS 62/0 |

### Full chain

| Command | Result |
|---|---|
| **`npm test`** (full 59-test chain) | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS — `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean; signing env MISSING (expected local-dev posture; documented as NO-GO for public signed release in §6) |

No RC blocker from any gate. All known pre-existing issues (e.g., the historical `opportunity-outreach` 27/28 from PRs #82-#84) were fully resolved in earlier phases and remain 28/28.

## 3. Credential boundary result

| Surface | SAM.gov API key request? | Verified in HTML |
|---|---|---|
| Setup Wizard Step 5 | ✅ Allowed | `<input ... id="gcwiz-sam" ...>` + `gcWizSaveSam()` → `sd.credentials.set('sam-gov', …)` |
| Settings → API Keys → SAM.gov API Key | ✅ Allowed | `<input ... id="s-samkey" ...>` + `saveSettings()` SAM branch → `sd.credentials.set('sam-gov', …)` |
| GovCon SAM search / SAM Sprint screen | ❌ Forbidden | `id="out-samkey"` — **0 hits in `sourcedeck.html`**; only test/doc files reference it as a regression guard |
| Any other workflow / demo / export / log surface | ❌ Forbidden | None present |

Verified:
- No raw API key value is hardcoded, printed, exposed, logged, or constructed inline (no `Authorization: 'Bearer ' + key`; no template literal `Bearer ${key}`; no concat).
- `.env` is not referenced as a user-facing instruction.
- Credential prompts are grouped in Setup Wizard / Settings only — no scattered prompts on workflow screens.
- All credential saves use the existing `window.sd.credentials.set('sam-gov', …)` main-process IPC bridge.

## 4. No-send / no-submit / no-upload result

Runtime grep of `sourcedeck.html` for safety-forbidden patterns yielded 3 hits, all in negative-assertion contexts:

| Line | Context | Disposition |
|---|---|---|
| 4228 | Quick Setup Tour copy: *"No Send Email surface; draft-only with human approval required."* | Negative assertion — safe |
| 8146 | Comment: `// - auto_send is always false` | Comment — safe |
| 8147 | Comment: `// - no Send Email surface` | Comment — safe |

No positive `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` / `portal upload` / `Agency submission complete` claim is active in the buyer-facing runtime. No improper CO/COR outreach copy (`Contact CO` / `Email COR` / `Influence buyer` / `Backchannel` / `Lobby this office` / `Circumvent competition` / `Submit to agency` / `Send to contracting officer` / `Preferred relationship`) anywhere in the runtime — Phase 24E forbidden-pattern list intact.

## 5. Setup wizard result

| Criterion | Status | Evidence |
|---|---|---|
| First-run trigger | ✅ | `gcMaybeAutoOpenWizard()` runs ~600 ms after `DOMContentLoaded`; gates on `gcIsSetupComplete()` + sessionStorage flag + profile-derived `govconSetupComplete()`; corrupt state fails open |
| New-profile trigger | ✅ | Profile reset → `govconSetupComplete()` returns false → next cold launch re-fires the gate (single-profile workspace; documented in Phase 24K narrative) |
| Persistent setup-complete | ✅ | `localStorage.sd.govcon.setupComplete = '1'` set by `gcWizFinish()`; read by `gcIsSetupComplete()` |
| Settings reopen | ✅ | `#s-run-setup-wizard` button in Settings → API Keys calls `openGovconSetupWizard()` |
| Welcome step | ✅ | Step 1 — verbatim "SourceDeck helps you organize GovCon pursuits from opportunity discovery to internal-review package. You stay in control of every send, upload, submission, and decision." |
| Quick Setup Tour | ✅ | Step 10 — 15 features with `data-tour-feature="<slug>"` markers (capture-command-center, operating-rhythm, solicitation-workspace, compliance-matrix, vendor-quote-room, pricing-worksheet, past-performance-library, capability-statement-studio, prime-partner-finder, stakeholder-graph, submission-readiness-gate, internal-review-markdown-export, audit-log, response-desk, sam-sprint) |
| Video placeholder | ✅ | `#gcwiz-tour-video` displays verbatim "Video walkthrough pending. Use the quick text tour below." No video asset committed |
| Final Confirmation checklist | ✅ | Step 11 — 5 verbatim checkboxes covering internal-review materials, external approval, SAM key locations, SAM search no-paste, and replace-sample-data |

## 6. Pricing source-of-truth result

| Tier | Canonical | Active UI Visible? |
|---|---|---|
| Solo Capture — $149/mo | docs/product/pricing-source-of-truth.md | (no active pricing in app UI) |
| GovCon Operator — $499/mo or $4,990/yr | docs/product/pricing-source-of-truth.md | (no active pricing in app UI) |
| Operator Plus — $997/mo or $9,970/yr | docs/product/pricing-source-of-truth.md | (no active pricing in app UI) |
| Enterprise — custom | docs/product/pricing-source-of-truth.md | (no active pricing in app UI) |
| Implementation: Self-Install $1,497 / Guided $3,497 / DFY $5,997 | docs/product/pricing-source-of-truth.md | (no active pricing in app UI) |
| **Deprecated** $79 / $349 / $999 | n/a | **0 hits in `sourcedeck.html`** (active runtime) |

`docs/product/pricing-source-of-truth.md` not modified. Deprecated pricing appears only in historical audit / release-note files as documented context.

## 7. Public-release NO-GO boundaries verified

Per `docs/product/phase-24j-public-release-no-go-boundaries.md`:

| Stage | Phase 24M Verification |
|---|---|
| Controlled buyer demo | ✅ **GO (conditional)** — all gates pass, sample/demo data labeled, no live SAM call, operator demo runbook ready |
| Limited paid pilot | ✅ **GO (conditional)** — see §9 decision below |
| Public signed macOS release | ❌ **NO-GO** — `release-check.js` reports macOS signing/notarize env MISSING; no signed/notarize evidence. The unsigned dev build posture is correct for a pilot but **must not** be claimed as "signed and notarized" / "Apple notarized" / "production signed" |
| Present-tense watsonx live claim | ❌ **NO-GO** — release-evidence reports `verified_ready: no` for watsonx runtime |
| Website / public marketing | ⏸️ **SEPARATE** — handled in `sourcedeck-site` repo, out of this RC's scope; documented for Phase 24O follow-up |

## 8. Files inspected (read-only)

- `docs/product/phase-24f-release-candidate-packaging-contract.md`
- `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`
- `docs/audits/phase-24j-final-rc-evidence-binder.md`
- `docs/product/phase-24j-limited-paid-pilot-handoff.md`
- `docs/product/phase-24j-operator-demo-runbook.md`
- `docs/product/phase-24j-public-release-no-go-boundaries.md`
- `docs/audits/phase-24l-setup-wizard-rc-acceptance-checklist.md`
- `docs/product/phase-24l-pilot-onboarding-qa-contract.md`
- `docs/product/phase-24l-api-key-onboarding-boundary-contract.md`
- `docs/product/phase-24l-final-rc-readiness-after-setup-wizard.md`
- `docs/product/phase-24k-first-run-setup-wizard.md`
- `docs/audits/phase-24k-existing-setup-wizard-inventory.md`
- `docs/product/phase-24i-final-runtime-polish.md`
- `docs/product/pricing-source-of-truth.md`
- `sourcedeck.html` (read-only)
- `package.json` (read-only)
- `reports/release-evidence/2026-06-08-release-evidence.json` (read-only)

No file in the forbidden list was opened for editing.

## 9. Release decision

See `docs/product/phase-24m-limited-paid-pilot-decision.md`.

## 10. Confirmations

- ✅ `.env` not touched. No API key printed. No secret exposed.
- ✅ Stashes untouched.
- ✅ No website-repo edit. No payment / Stripe / checkout / pricing change. No deploy.
- ✅ No live SAM Sprint run. No outreach drafted, sent, or queued. No bid/quote/proposal submission. No portal upload.
- ✅ No videos / screenshots / `.qa/` committed.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No signed/notarized / Apple-notarized / production-signed claim made.
- ✅ No present-tense watsonx live claim made.

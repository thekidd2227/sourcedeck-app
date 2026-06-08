# Phase 24K — Existing Setup Wizard Inventory (pre-change baseline)

**Date:** 2026-06-08
**Posture:** Read-only inventory of the wizard state immediately before Phase 24K edits.
**Base:** `main @ 7861152` (post-PR #92 — Phase 24J-PREP).

This audit documents what the GovCon Setup Wizard looked like before Phase 24K so the next maintainer can see precisely what shifted.

## 1. Wizard surface

| Anchor | Location | State pre-24K |
|---|---|---|
| `#govcon-wizard` modal | `sourcedeck.html` (lines ~4043–4211) | 9-step wizard, modal-backdrop overlay |
| `openGovconSetupWizard()` / `closeGovconSetupWizard()` | `sourcedeck.html` (lines ~10333 / ~10393) | Reads existing profile, pre-fills fields, opens modal at Step 1 |
| `_GC_WIZ_MAX = 9` | `sourcedeck.html` (~10326) | Step navigation upper bound |
| `gcwiz-progress` label | `Step 1 of 9` | Updated by `_gcWizShow()` |
| Reopen entry points | `#tab-govcon` "⚙ Setup" button (~2059); GovCon command nav (~3349); workspace-readiness banner (~10315) | Three explicit user-initiated reopen paths existed |

## 2. Step list pre-24K (9 steps)

| # | Title | Inputs (ID prefix `gcwiz-`) |
|---|---|---|
| 1 | Business profile | `company`, `dba`, `website`, `bizemail`, `bizphone`, `hqstate`, `servicearea`, `contactname`, `bizdesc`, `coreservices`, `differentiators` |
| 2 | Capability statement | `capstmt` textarea + `Extract candidate fields` button (local extraction) |
| 3 | GovCon targeting | `certs` (checkboxes), `uei`, `cage`, `naics`, `psc`, `agencies`, `exclagencies`, `excluded`, `targetstates`, `contractsize`, `minmargin`, `subpref`, `remotepref` |
| 4 | SAM.gov API key | `sam` input + `gcWizSaveSam()` / `gcWizRemoveSam()` |
| 5 | AI agent API key | `ai-provider` select (OpenAI/Anthropic/watsonx), `ai-key` input |
| 6 | Creative / imaging API key | `creative-provider`, `creative-key` |
| 7 | Social handles & platforms | `soc-linkedin`, `soc-facebook`, `soc-instagram`, `soc-tiktok`, `soc-youtube`, `soc-xtwitter`, `platforms` checkboxes |
| 8 | Safety & approval rules | `saf-outreach`, `saf-posting`, `saf-certs`, `saf-confidential`, `tone`, `blockedtopics`, `approvedclaims` |
| 9 | Finish | Summary text + "Go to GovCon / Outreach / Prime Partners" buttons |

## 3. Auto-open behavior pre-24K

- Trigger: inside `openTab(t)` for `t === 'govcon'`, after `refreshGovconSetup()` resolves:
  - If `!govconSetupComplete()` AND `sessionStorage.lcc_govcon_wizard_seen !== '1'`, set the session flag and call `openGovconSetupWizard()`.
- `govconSetupComplete()` returns true when `_govconSetupState.samPresent && _govconSetupState.profileComplete` — i.e., it's a **derived** flag, not an explicit user-completion record.
- No `localStorage`-backed persistent setup-complete flag existed.
- No `DOMContentLoaded` trigger existed — auto-open only fired on explicit GovCon-tab nav. On cold launch, since `#tab-govcon` is the Phase 23C default-active tab, the trigger might or might not fire depending on whether the renderer's tab-init path invoked `openTab('govcon')`.
- Once a session set `lcc_govcon_wizard_seen=1`, the wizard would not auto-reopen until the next launch.

## 4. Credential save adapter pre-24K

- SAM key: `gcWizSaveSam()` → `_gcWizSaveKey('sam-gov', 'gcwiz-sam', _gcWizUpdateSamStatus)` → `window.sd.credentials.set('sam-gov', value)` → clears `input.value` after save.
- Same pattern for AI key (`ai`) and Creative key (`canva` / `image-provider`).
- Presence-only status displayed via `_gcWizUpdateSamStatus()` / equivalents using `window.sd.credentials.status()`.
- **Phase 24I parallel:** Settings tab gained an `s-samkey` input + `saveSettings()` SAM-gov branch using the same `sd.credentials.set('sam-gov', …)` adapter. The Settings flow and the wizard flow both write to the same credential slot.

## 5. Tests pre-24K (credential and wizard assertions)

| Test | Asserts |
|---|---|
| `test/govcon-setup-wizard.test.js` | 9 `data-step="N"` entries exist; SAM credential goes through `credentials.set('sam-gov', …)`; renderer never calls `credentials.get()`; no `Authorization` / `x-api-key` header built; "Business profile" + "SAM.gov" copy present; safety + procurement-integrity copy; no "compliant" / "certified" / "fully operational" / "safe to send" in wizard region |
| `test/govcon-operating-profile-wizard.test.js` | 18 checks; wizard pre-fill behavior + content saving |
| `test/govcon-operating-profile-completeness.test.js` | 21 checks; completeness derivation |
| `test/govcon-final-runtime-polish.test.js` | Asserts SAM Outreach screen has NO `out-samkey` input (Phase 24I) |
| `test/setup-wizard-first-run.test.js` (NEW in Phase 24K) | First-run trigger, Welcome step, Quick Setup Tour, Final Confirmation checklist (35 checks) |

## 6. Profile-aware / new-profile handling pre-24K

- App is **single-profile** at the renderer level. Profile state lives in `services/govcon/govcon-pursuit-profile-store.js` (one active profile per workspace).
- "New profile" semantics: when the operator clears profile data via Settings → reset, `_govconSetupState.profileComplete` becomes false → next GovCon-tab visit would re-trigger the auto-open (per the session-flag gate).
- No multi-profile switching exists in the renderer. Phase 24K documents this and uses a single-profile setup-complete flag (`sd.govcon.setupComplete`).

## 7. What Phase 24K changes

| Item | Before | After |
|---|---|---|
| Step count | 9 | 11 (added Welcome at Step 1, Quick Setup Tour at Step 10) |
| `_GC_WIZ_MAX` | 9 | 11 |
| Progress label | "Step 1 of 9" | "Step 1 of 11" |
| Step 1 | Business profile | **Welcome** (new). Business profile shifts to Step 2 |
| Quick Setup Tour | none | **Step 10** (new) — 15-feature tour with video placeholder |
| Final Confirmation checklist | none | **Step 11 additions** — 5 explicit understanding checkboxes |
| Persistent setup-complete | session-only (`lcc_govcon_wizard_seen`) | localStorage `sd.govcon.setupComplete` (set in `gcWizFinish()`); session flag preserved as secondary gate |
| Cold-launch auto-open | derived from `openTab('govcon')` path only | new `gcMaybeAutoOpenWizard()` runs on `DOMContentLoaded` (deferred 600ms); short-circuits if `gcIsSetupComplete()` is true |
| Settings reopen affordance | not present | new "⚙ Run Setup Wizard" button (`#s-run-setup-wizard`) added to Settings → API Keys card |
| SAM key step copy | "Saved through the secure main-process credential boundary…" | adds verbatim "Add your SAM.gov API key here during setup, or manage it later in Settings. SourceDeck uses this key only for authorized SAM.gov opportunity lookup. The SAM search screen does not ask you to paste credentials." |
| AI key step copy | "Powers AI drafting and reasoning. Saved presence-only…" | adds verbatim "Only add keys for services you plan to use. You can skip keys now and add them later in Settings." |
| Section L/M / Safety / Profile / Capability / Targeting steps | unchanged content | renumbered only (data-step="N" → "N+1") |

## 8. Why these specific changes

- **Phase 24K mission requirements:** wizard must auto-open for first-time users + new profiles, explain what to input AND why, group API keys (including SAM), include a Quick Setup Tour, include a video placeholder, include a Final Confirmation checklist.
- The existing 9-step wizard was substantively complete on API-key handling; **what was missing was the framing (Welcome), the feature-orientation (Quick Tour), and the trust-confirmation (Final Confirmation)**. Phase 24K adds exactly those, and adds the persistence + cold-launch trigger that make the wizard production-grade.

## 9. Single-source-of-truth for SAM.gov key (Phase 24K reconciliation)

| Surface | Allowed? | Implementation |
|---|---|---|
| Setup Wizard Step 5 | ✅ Yes (Phase 24K-confirmed) | `gcWizSaveSam()` → `sd.credentials.set('sam-gov', value)` |
| Settings → API Keys → SAM.gov API Key | ✅ Yes (Phase 24I) | `saveSettings()` SAM-gov branch → same adapter |
| GovCon SAM search / SAM Sprint screen | ❌ No | Phase 24I removed `out-samkey` input; the screen now shows presence-only status + "Configure SAM.gov API key in Settings" button (`openTab('settings')`) |
| GovCon Setup Wizard Step 5 + Settings → API Keys: also cross-link | ✅ Phase 24K confirms both | wizard copy verbatim references Settings; Settings copy verbatim references the wizard |

No other surface (Capture Command Center, Solicitation Workspace, Submission Readiness Gate, Internal Review Export, Response Desk, Demo screens, Audit Log, etc.) requests or displays the SAM key.

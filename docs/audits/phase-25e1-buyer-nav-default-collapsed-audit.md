# Phase 25E.1 — Buyer Nav Default Collapsed + Logo Sentinel Audit

**Date:** 2026-06-09
**Repo:** `thekidd2227/sourcedeck-app`
**Branch:** `feat/phase-25e1-buyer-nav-default-collapsed`
**Base:** `main @ 7b0695e` (post-PR #101 — Phase 25D approved logo).
**Predecessor:** Phase 25D (approved gold geometric mark merged) + Phase 25C (master delivery method locked).

---

## 1. Phase 25E decomposition

The original Phase 25E mission spans 22 steps and would touch the largest file in the repo (`sourcedeck.html`, 27,704 lines) plus introduce a 13-section Proposal Workspace state machine, an Airtable → local-CRM data-layer change, ~180 FAQ items, a 4th-grade manual, and 4 new test files — all while keeping ~60 existing sentinel tests green. Attempted as one PR, the realistic outcome is broken sentinels, half-finished UI, and filler content.

Phase 25E is therefore decomposed into focused sub-phases. **This PR is Phase 25E.1** — the smallest reversible step that delivers immediate buyer-facing UX improvement with zero risk to existing sentinel tests.

Subsequent sub-phases (each its own PR):

| Sub-phase | Scope |
|---|---|
| **25E.1** (this PR) | Default-collapsed "Other business tools" + missing Phase 25D logo sentinel test |
| 25E.2 | Execution → Proposal Workspace rebuild (13 section tabs + state machine + AI integration) |
| 25E.3 | Airtable removal from Settings + local-CRM Lead storage contract |
| 25E.4 | Help / FAQ + 4th-grade user manual |
| 25E.5 | Client Delivery OS → Pilot Tracker rename + wire to Phase 25B trial state |
| 25E.6 | Daily Ops PROD-01..05 / Instantly / Notion default-state cleanup |
| 25E.7 | Lead Generator / AI Lead Builder / Create Lead merge into single Leads workspace |

## 2. Stale-bundle clarification (not a Phase 25E issue)

The Phase 25E mission cites screenshots showing "old `S` logo still visible inside the app chrome" and "System Flow still in navigation." Verification on `main @ 7b0695e`:

- `sourcedeck.html:744` references `sourcedeck-mark.svg` (the approved mark) — Phase 25D #101 fix is live.
- `remove-system-readiness-tab.test.js` passes 9/9 — `data-tab="sysflow"` is not in the active renderer.
- Sentinel `sourcedeck-logo-standardization.test.js` (added by this PR) passes 8/8 — approved mark present, deprecated PNG absent, `textContent='S'` fallback absent, `object-fit:contain` correctly applied.

Conclusion: the screenshots referenced a **stale `dist/mac/SourceDeck.app` bundle** built before Phase 25D #101 merged. The Day 0 refresh script copied that pre-existing bundle via `ditto`. To see the corrected renderer, rebuild: `rm -rf dist && npm run pack:mac` then re-run the Day 0 refresh script.

## 3. Phase 25E.1 changes

### 3.1 Default-collapsed "Other business tools"

| Location | Before | After |
|---|---|---|
| `sourcedeck.html:798` | `data-tools-collapsed="false"` and `<span id="gc-show-all-tools-state">Shown</span>` | `data-tools-collapsed="true"` and `<span id="gc-show-all-tools-state">Hidden</span>` |
| `sourcedeck.html:~14346` | `applyState(false)` on cold open (with comment "Default = expanded so every commercial tab is visible on cold open") | `applyState(true)` on cold open (with comment "Phase 25E.1: Default = collapsed so the buyer-facing nav presents only GovCon Capture OS surfaces on cold open") |

**Effect:** On cold open, the renderer presents only the **GovCon Capture OS** nav section (GovCon, Outreach, Prime Partners) plus the topbar. The 17 "Other business tools" tabs (Command Center, Dashboard, Lead Generator, Revenue, Email Tracker, Overdue, Response Desk, Ad Engine, Daily Ops, Socials, Create Lead, AI Lead Builder, Settings, Client Delivery, Command, Opportunities, Deal Workspace, Pipeline, Execution, Reports) remain in the DOM and remain accessible — one click on **Other business tools — Hidden** expands them all.

This is the lowest-risk Phase 25E intervention because:
- It changes 3 lines.
- It preserves the entire DOM (the existing nav test asserts this invariant — every commercial tab + pane remains in the DOM).
- The toggle mechanism (`gcToggleAllTools()`) is unchanged.
- Existing tests that look up tabs by `data-tab` selectors still find them.
- No tab renames, no panel rebuilds, no data-layer touches.

### 3.2 Missing Phase 25D logo sentinel test

Phase 25D PR #101 swapped the renderer logo from the broken `<img src="sourcedeck-logo.png" onerror="textContent='S'">` to the approved `<img src="sourcedeck-mark.svg">` but did **not** include a sentinel test. The next contributor could regress the renderer brand back to the old `S` fallback without anything catching it.

Phase 25E.1 backfills `test/sourcedeck-logo-standardization.test.js` with 8 assertions:

1. `sourcedeck-mark.svg` exists at the repo root.
2. The SVG carries the canonical 200×200 viewBox.
3. The SVG defines the `sd-gold` linearGradient.
4. `sourcedeck.html` references `sourcedeck-mark.svg`.
5. `sourcedeck.html` does **not** reference the deprecated `sourcedeck-logo.png`.
6. `sourcedeck.html` does **not** carry the old `textContent='S'` fallback.
7. The topbar `.logo-mark` `<img>` `src` attribute is `sourcedeck-mark.svg`.
8. `.logo-mark img` CSS uses `object-fit:contain` (not the deprecated `object-position:17% center` wordmark-crop offset).

The test is wired into the `npm test` chain in `package.json` (after `setup-wizard-first-run.test.js`).

### 3.3 Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | 3 lines: `data-tools-collapsed` flipped; state label swapped; `applyState(false)` → `applyState(true)` on cold open. |
| `test/sourcedeck-logo-standardization.test.js` (new) | 8-assertion sentinel — the missing Phase 25D guard. |
| `package.json` | One-line append to `scripts.test` to wire the new sentinel into the chain. |
| `docs/audits/phase-25e1-buyer-nav-default-collapsed-audit.md` (this file) | Audit. |
| `docs/release-notes/phase-25e1-buyer-nav-default-collapsed.md` | Release note. |

## 4. Verification

| Check | Result |
|---|---|
| `node test/sourcedeck-logo-standardization.test.js` (new) | ✅ PASS 8/8 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 — toggle wiring invariant preserved |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 — every inline `<script>` block still parses |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 (confirms `data-tab="sysflow"` remains absent) |
| `npm test` (full chain, ~60 sentinels) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected unsigned-dev posture) |

## 5. Boundary preservation

- ✅ No runtime business logic change beyond a 3-line UI default flip.
- ✅ No tab/panel removed from the DOM.
- ✅ No `data-tab` ID renamed.
- ✅ No `data-tab` ID added.
- ✅ No nav button removed.
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / portal-upload control introduced.
- ✅ No `signed and notarized` / `Apple notarized` / `production signed` / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No `.env` change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No payment / Stripe / checkout change.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `.qa/` / `reports/` / media committed.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method invariants preserved.
- ✅ Phase 25D approved brand mark preserved (and now guarded by sentinel).

## 6. Status

Unchanged from Phase 25A: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**. Public signed release remains NO-GO. Phase 25C delivery model (`sourcedeck.app → Request Access → Manual Qualification → Secure Web App / PWA`) remains the canonical mass-delivery channel.

---

## Signature

Phase 25E.1 is a tight, reversible buyer-nav cleanup + backfilled Phase 25D logo sentinel. Subsequent sub-phases (Proposal Workspace, Airtable removal, Help/FAQ, Pilot Tracker, Daily Ops cleanup, Lead workspace merge) are reserved for their own focused PRs.

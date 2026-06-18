# Phase 25AL — Block the App-Shell Dump Render Sink + `cleanDisplayText` Scope Fix

**Branch:** `fix/phase-25al-render-sink-and-clean-display-scope`
**Commit message:** `fix(govcon): block app-shell dump render sink`
**Status:** Draft PR — do not merge until approved.

## What was wrong

The Solicitation Center could render **SourceDeck's own app-shell / UI / CSS text** as if it
were solicitation content (`.cmd-flow`, `.cmd-pill`, `.cc-lcc-grid`, nav labels). Prior
phases (25AH/25AJ/25AK) guarded the **input** side of the pipeline; the dump came from the
**render sink**, which was never guarded:

- `renderPanels()` painted persisted `state.summary` / `state.sections` / `state.matrix`
  through `safeText()`. `safeText()` only strips angle brackets, so CSS-rule text and nav
  labels passed straight through as visible text.
- It rendered from **persisted state on every load**, so it survived "Clear source cache".

A second, related defect was found on the same render path: `cleanDisplayText` was defined
privately in the Phase 22B IIFE but referenced from the Phase 22C Solicitation Center IIFE,
throwing `ReferenceError: cleanDisplayText is not defined` and silently breaking **Extract
Requirements** and **Plain-English explanation**.

## What changed

- **Render-time app-shell guard.** `renderPanels` and `renderMatrix` now screen
  `state.summary`, every `state.sections[*]`, and matrix requirement text with the shared
  app-shell detector (`window._w25LooksLikeBadSource`, with a local strong-marker fallback).
  On detection the panel shows a safe message instead of the raw text:
  *"SourceDeck blocked app UI text from being rendered as solicitation content. Clear source
  cache and re-download the package."* A lightweight diagnostic (context, markers, length
  only — never the raw payload) is recorded on `window.sdSolRenderBlockDiagnostics`. Never
  throws, never freezes.
- **Scope fix.** Phase 22B exposes `window.sdCleanDisplayText`; the Phase 22C block binds a
  local `cleanDisplayText` to it (with an identity fallback). Same behavior, no more
  ReferenceError.

## User impact

- The app-shell/UI/CSS dump can no longer be painted into Solicitation Center panels.
- **Extract Requirements** and **Plain-English explanation** work again (no silent failure).
- Valid solicitation text renders exactly as before — the guard only triggers on app-shell
  content (verified: no false positives on real extraction payloads).

## Tests & gates

- New `test/phase-25al-render-sink-and-clean-display-scope.test.js` — PASS.
- Phase 25AK permanent guard, Phase 25AF parser suite, renderer-boot, govcon-core-hardening,
  Phase 25AJ — PASS.
- `npm run govcon:smoke` (47/0), `npm run troubleshooting:scan` (44/0/0),
  `node scripts/release-check.js` (exit 0) — PASS.
- Full `npm test` sweep: 196/202. The 6 remaining failures are **pre-existing Phase 26C
  collateral** (deleted `tab-cmd/revenue/socials/command` panes with stale assertions),
  verified identical on clean `main`, and unrelated to Phase 25AL.

## Known pre-existing issue (separate from this change)

PR #147 (Phase 26C) deleted four tab-panes but left their nav buttons dangling. This causes
the 6 pre-existing test failures and should be fixed separately. Phase 25AL does not touch it.

## Safety

No `.env` files, secrets, SAM.gov `api_key`, pricing, Stripe/checkout, website, email-send,
bid/quote/proposal submission, or portal-upload code touched. No saved pursuits or
credentials deleted. Git stashes untouched. No deploy / publish / GitHub release.

## Manual retest

1. Clear source cache → reload.
2. Select a pursuit → download package → Send to Solicitation Center → Extract Requirements
   → Plain-English explanation.
3. Confirm panels show real content and never an app-shell/CSS dump; any contaminated input
   now shows the safe block message.

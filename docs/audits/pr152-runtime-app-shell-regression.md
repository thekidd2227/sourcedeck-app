# Audit — PR #152 runtime app-shell regression (Vendor Quote Room render sinks)

**Branch:** `fix/pr152-runtime-app-shell-regression`
**Starting main SHA:** `e11fa8743c00a81c90d99296d25902b2f6c4479c` (PR #152 merge)
**Date:** 2026-06-20

## Summary

The installed Buyer Trial application rendered SourceDeck's own application
shell (navigation labels, help/disclaimer copy, and raw CSS rules) as
solicitation/vendor *content*. The dump was reproduced live, via CDP, in the
exact installed bundle and traced to the **Vendor Quote Room renderers added by
PR #151**, which painted persisted state into `innerHTML` through the weak
`safeText()` helper and bypassed the Phase 25AL app-shell guard.

## First bad commit

`8ddf838` — *"fix(govcon): extract five solicitation documents and automate
vendor quote outreach"* (the squashed change merged as **PR #151**, merge
`4d4b49f`). `git blame` attributes `renderCoverage()` / `renderCandidates()`
(the proven sinks) entirely to `8ddf838`.

## Did PR #151 cause the runtime regression?

**Yes.** PR #151 introduced `renderCoverage()` and `renderCandidates()` (Phase
22D block) that render `sd.govcon.vendorQuoteWorkflow.v1` and
`sd.govcon.solWorkspace.v1`-derived state into `body.innerHTML` using only the
block-local `safeText()`:

```js
function safeText(s){ return String(s == null ? '' : s).replace(/[<>]/g, ''); }
```

`safeText()` strips only angle brackets. App-shell text — `SourceDeck GovCon
Pipeline`, `Operating Hub Dashboard`, `.cmd-flow`, `.cmd-pill`, `.cc-lcc-grid`,
nav labels, CSS-rule fragments — contains no `<` or `>`, so it passed straight
into the DOM.

## Did PR #152 change runtime code?

**No.** `git diff 4d4b49f..e11fa87 -- sourcedeck.html main.js preload.js api
services` is empty. PR #152 changed only `package.json` and test files
(`govcon-demo-delivery-polish`, `govcon-primary-navigation`,
`phase-25l1-navigation-cleanup`, and the new
`solicitation-extraction-end-to-end-mapping` test). It did **not** touch any
render sink. PR #152 is not the cause; its own report noted installed-app Mac
runtime proof was incomplete — which is exactly why the PR #151 runtime sink
slipped through.

## Why Phase 25AL did not cover the new sink

Phase 25AL added the strong detector `_w25LooksLikeBadSource()` and the
render-time guard `_sal25SafeText` / `sdSolRenderGuard`, and wired it into the
**Solicitation Center** renderers (`renderPanels`, `renderMatrix`) and the
boot sanitizer. It guarded the Solicitation Center sink class. The PR #151
**Vendor Quote Room** renderers are a *new, separate* IIFE (Phase 22D) with
their own local `safeText()` and never called the shared guard. The guard
existed on `window` but the new sinks bypassed it.

## Why PR #152 tests missed it

PR #152's tests assert static markup and gold-fixture extraction mapping. None
of them instantiate the Vendor Quote Room renderers with contaminated persisted
state, and none drive the installed app at runtime. The regression is only
observable when `renderCoverage`/`renderCandidates` paint contaminated
`vendorQuoteWorkflow.v1` state — a path no test exercised.

## Refresh-script finding (`~/sd-day0-refresh.sh`)

The Day-0 refresh script is unsafe to use for this repair (the stale-build
trap):

- It locates the app via `find "$REPO" -maxdepth 5 -name SourceDeck.app | head -1`
  and **only rebuilds (`npm run pack:mac`) when no `.app` exists at all.** A
  stale `dist/mac/SourceDeck.app` short-circuits the rebuild.
- It then `ditto`s that (possibly stale) bundle into the Buyer Trial package
  **with no ASAR hash verification** against a fresh build.
- It builds from `main` (`git checkout main; git pull`), never a fix branch.
- `find … | head -1` ordering is non-deterministic (could pick `dist/mac` or
  `dist/mac-arm64`).
- It does not pkill a running SourceDeck before swapping the bundle.

This repair therefore bypassed the script: an explicit
`npx electron-builder --mac --dir --x64` build was `ditto`d into the trial app
and the destination ASAR hash was verified equal to the fresh build.

## Installed ASAR vs fresh ASAR

| Marker | Installed (pre-fix, e11fa87) | Fresh (fix) |
|---|---|---|
| `_w25LooksLikeBadSource` | 20 | 20 |
| `sdSolRenderGuard` | 1 | 1 |
| `renderCoverage` | 6 | 7 |
| `renderCandidates` | 2 | 2 |
| `sdRenderShield` | **0** | 8 |
| `function cell(` | **0** | 1 |
| `rowBad` | **0** | 5 |
| `gcVqrQuarantineState` | **0** | 2 |
| `Clear contaminated workspace data` | **0** | 2 |

The pre-fix installed bundle contained the Phase 25AL Solicitation Center guard
**and** the unguarded PR #151 VQR sinks — confirming it was an honest
`e11fa87` build, not a stale artifact, but one that predates this fix. After
install the trial ASAR equals the fresh build:
`1e38ef734d64fa0e2a30623444ec15d93f53a143b685093ddd8ec553879aac19`.

## Runtime DOM evidence (CDP, exact installed bundle)

Probe: inject contaminated `sd.govcon.vendorQuoteWorkflow.v1`, then call
`gcVqrMapVendors()` / `gcVqrReviewCandidates()`.

| | Broken (e11fa87) | Fixed |
|---|---|---|
| Target | `app.asar/sourcedeck.html` (single page) | same |
| `tbody#gc-vqr-scope-coverage` innerText | `SourceDeck GovCon Pipeline Operating Hub Dashboard …` | `… Provide HVAC maintenance per PWS 3.4 …` |
| coverage app-shell markers | all 10 leaked | **0** |
| candidate app-shell markers | all 10 leaked | **0** |
| block message shown | no | yes (candidates row) |
| boot quarantine | absent | scrubbed `task, notes, legalBusinessName, website, capabilities` |
| valid content preserved | — | yes (HVAC requirement, Acme vendor) |

- **Exact target:** the main BrowserWindow page
  `file://…/app.asar/sourcedeck.html` (no child/preview/export window held the
  dump — one page target only).
- **Exact DOM nodes:** `<tbody id="gc-vqr-scope-coverage">` and
  `<tbody id="gc-vqr-vendor-candidates">`.
- **Exact renderers:** `renderCoverage()` (line ~15498) and
  `renderCandidates()` (line ~15503) in the Phase 22D block.
- **Exact storage key:** `sd.govcon.vendorQuoteWorkflow.v1`.
- **Exact contaminated field paths:** `actionPlan.requirements[].task`,
  `actionPlan.requirements[].notes`, `vendors[].legalBusinessName`,
  `vendors[].website`, `vendors[].capabilities`, `vendors[].contactName`,
  `vendors[].serviceLocation`.

Screenshots: `assets/pr152-runtime/broken-vqr-installed-e11fa87.png`,
`assets/pr152-runtime/fixed-vqr-installed.png`. Raw probe output:
`assets/pr152-runtime/runtime-evidence.json`. (Screenshots capture the full app
window; the contaminated dump lives in the hidden Vendor Quote Room tab `tbody`,
so the authoritative before/after evidence is the captured CDP `innerText` /
marker scan above.)

## Root cause

PR #151's Vendor Quote Room renderers wrote persisted, untrusted
solicitation/vendor state into `innerHTML` through a `safeText()` that strips
only `<>` and never applied the Phase 25AL strong app-shell detector — so
SourceDeck app-shell/UI/CSS text painted as solicitation/vendor content.

## Fix

1. **Shared render-time boundary** — `window.sdRenderShield` /
   `sdRenderShieldList` (Phase 22C block) reusing the strong
   `_w25LooksLikeBadSource` detector + Phase 25AL diagnostics, returning the
   canonical block message. Available to every renderer.
2. **VQR sinks hardened** — `renderCoverage` / `renderCandidates` (and the
   Quote Tracker / Vendor Comparison rows) now route every dynamic field through
   `cell()` (shield → escape) and apply a **row-level** `rowBad()` guard so a
   dump distributed across a row's fields (where one field alone holds only a
   single weak nav label) is reconstructed and blocked as one safe message.
3. **Load-time quarantine** — `gcVqrQuarantineState()` runs before the first
   render, scrubbing app-shell text from `vendorQuoteWorkflow.v1`
   (`actionPlan.requirements`, `vendors`, `drafts`) and the manual quote rows,
   sets a structured `quarantine` flag, and never retains the raw payload.
   `gcVqrAnalyzeNeeds` also scrubs the action plan before persisting, so a
   contaminated matrix cannot generate or persist VQR action-plan tasks.
   Preserves credentials, saved pursuits, vendor records, pricing, company
   profile, past performance, and valid metadata.

## Files changed

- `sourcedeck.html` — shared boundary, VQR sink hardening, quarantine, analyze gate.
- `package.json` — wire the new regression test into `npm test`.
- `test/pr152-runtime-app-shell-regression.test.js` — new regression test.

## Test results

- New regression test: **7/7 checks pass**.
- Full individual sweep on branch: **175 pass / 1 fail**; the single failure
  (`phase-24d-buyer-surface-tightening` — Inter Tight font / CSS token
  assertions, unrelated to this change) reproduces identically on the untouched
  parent `e11fa87` (proven pre-existing).
- `govcon:smoke` 47/0; `troubleshooting:scan` clean; `release-check` pass
  (local unsigned-build warnings only).

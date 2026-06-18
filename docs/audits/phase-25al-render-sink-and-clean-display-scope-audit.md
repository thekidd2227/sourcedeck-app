# Phase 25AL — App-Shell Dump Render-Sink Audit + `cleanDisplayText` Scope Fix

**Date:** 2026-06-18
**Branch:** `fix/phase-25al-render-sink-and-clean-display-scope`
**Status:** Fix implemented, gates green, draft PR (do not merge until approved)

---

## 1. Symptom

After re-testing the same solicitation/package (even after **Settings → Source Cache →
Clear contaminated source cache** and a reload), the Solicitation Center rendered a
**SourceDeck app-shell / UI / CSS dump** — visible tokens included:

```
SourceDeck GovCon Pipeline · Operating Hub Dashboard · GovCon Find Opportunities ·
Saved Pursuits · Solicitation Center · Response Desk · Revenue Path · Generated Leads ·
.cmd-flow · .cmd-pill · .cc-lcc-grid
```

The presence of CSS **selectors with leading dots** (`.cmd-flow`, `.cc-lcc-grid`) — which
only appear inside `<style>` blocks / class definitions, never in solicitation text — was
the tell that the rendered content was **SourceDeck's own shell text**, not solicitation
material.

## 2. Why every prior guard missed it

Phases 25AH / 25AJ / 25AK hardened the **input** side of the pipeline:

- `_w25LooksLikeBadSource` on fetched description text and imported resources.
- `validatePackageFiles` (IPC) rejecting on-disk app-shell files before extraction.
- A post-extraction guard `_w25LooksLikeBadSource(ex.fullText)` in `gcABExtractPackageToCenter`.
- A boot sanitizer that scrubs `solWorkspace.v1` when its serialized form looks like app-shell.

None of these guard the **render sink**. The dump came from the output side:

- `renderPanels()` paints persisted `state.summary` / `state.sections` / `state.matrix`
  through `safeText()`, which **only strips `<` and `>`**. CSS rule bodies
  (`.cmd-flow{display:flex}`) and nav labels contain no angle brackets, so they render as
  **visible text**.
- The only content guard in the extraction path runs on `ex.fullText` and is **gated on
  `ex.fullText` being truthy** — the actually-rendered fields (`mapped.summary`,
  `mapped.sectionL/M/...`, `metadata.title`) are never screened.

## 3. Exact sink (proven)

**`renderPanels()` → `setHTML('gc-sol-summary', '…' + safeText(state.summary) + …)`**
(`sourcedeck.html`, Phase 22C Solicitation Center renderer IIFE).

Proven live via Chrome DevTools Protocol against the running packaged app: injecting
app-shell text into `state.summary` and calling the app's own public `gcSolRender()`
dumped it verbatim into `#gc-sol-summary`:

```
markersDumpedInSummary: ["SourceDeck GovCon Pipeline","Operating Hub Dashboard",
                         ".cmd-flow",".cc-lcc-grid","Revenue Path","Generated Leads"]
```

The summary renders **before** the section list, so the dump appears even when the rest of
the extraction render errors out (see §4).

**Sink class:** the Solicitation Center renderer trusts persisted extraction state at render
time. The same gap applies to the section panels (`#gc-sol-section-l/m`, `#gc-sol-pws`,
`#gc-sol-forms`, `#gc-sol-deadlines`, `#gc-sol-risks` via `listDiv`), the compliance matrix
(`#gc-sol-matrix-body` via `renderMatrix`), and the Plain-English explanation render.

**Why it survives "Clear source cache":** `renderPanels` runs from **persisted state on
every load / tab-switch** — no extraction required. Any app-shell text that reaches
`state.summary` paints immediately.

## 4. Second defect found (same render path): `cleanDisplayText` IIFE scope bug

`cleanDisplayText` is defined **privately inside the Phase 22B IIFE** but referenced at
**9 sites inside the Phase 22C Solicitation Center IIFE** (`mapPackageExtraction`,
`renderMatrix`, `listDiv`, `gcSolExtract`, `gcSolExplainPlainEnglish`). At runtime this
throws `ReferenceError: cleanDisplayText is not defined` — confirmed live via CDP. Net
effect: **"Extract Requirements" and "Plain-English explanation" fail silently** (panels
stay empty). Introduced in PR #140. Because the throw happens before render, it partly
masked reproduction of the dump on the *fresh-extraction* path while leaving the
*persisted-state* render path (the real sink) wide open.

## 5. Fix

1. **Render-time app-shell guard** (defense-in-depth at the proven sink). New helpers in the
   Phase 22C block: `_sal25SafeText` / `_sal25SafeList`, backed by `_sal25IsAppShell`
   (delegates to `window._w25LooksLikeBadSource`, with a local strong-marker fallback).
   `renderPanels` and `renderMatrix` screen `state.summary`, every `state.sections[*]`, and
   matrix requirement text. On detection they:
   - do **not** render the raw content;
   - substitute the safe message
     *"SourceDeck blocked app UI text from being rendered as solicitation content. Clear
     source cache and re-download the package."*;
   - record a **lightweight diagnostic** (context, markers, length only — never the raw
     payload) on `window.sdSolRenderBlockDiagnostics`;
   - never throw, never freeze the UI.

2. **Scope fix.** Phase 22B exposes `window.sdCleanDisplayText = cleanDisplayText`. The
   Phase 22C block binds a local `cleanDisplayText` that resolves the shared helper at call
   time (with a conservative identity fallback). Same function, behavior unchanged.

## 6. Files changed

- `sourcedeck.html` — Phase 22B `window.sdCleanDisplayText` export; Phase 22C local
  `cleanDisplayText` binding + render-time guard helpers; guarded `renderPanels`,
  `renderMatrix`, and the Plain-English explanation render.
- `test/phase-25al-render-sink-and-clean-display-scope.test.js` — new regression test.
- `test/phase-25af-renderer-binding-extraction-payload.test.js` — provides the new guard
  helpers to its isolated-extraction sandbox (renderPanels/renderMatrix gained dependencies).
- `package.json` — adds the Phase 25AL test to the `npm test` chain.

## 7. Tests & gates

- **New Phase 25AL test:** PASS — proves the contaminated `state.summary` no longer dumps
  into `#gc-sol-summary`; `.cmd-flow/.cmd-pill/.cc-lcc-grid/SourceDeck GovCon Pipeline`
  blocked from summary, sections, and matrix; valid solicitation text still renders;
  fallback markers block when the shared detector is absent; diagnostic stores no raw
  payload; `gcSolExplainPlainEnglish` and `gcABExtractPackageToCenter` run without
  `ReferenceError: cleanDisplayText is not defined`; source-cache-clear wiring intact.
- **Phase 25AK permanent guard:** PASS (all 7 checks).
- **Phase 25AF parser suite:** PASS (coverage, mixed-package, fallback classifier,
  compliance-matrix, renderer-binding payload, no-metadata-only).
- **renderer-boot / govcon-core-hardening / 25AJ:** PASS ("every inline `<script>` block
  still parses").
- **`npm run govcon:smoke`:** PASS (47/0).
- **`npm run troubleshooting:scan`:** PASS (44 pass / 0 fail / 0 warn).
- **`node scripts/release-check.js`:** PASS (exit 0; privacy gate clean; signing warnings
  are local-dev-only).
- **Full `npm test` sweep (continue-on-failure):** 196/202 pass. The **6 remaining failures
  are pre-existing Phase 26C collateral** (verified identical on clean `main`): they expect
  `tab-cmd` / `tab-revenue` / `tab-socials` / `tab-command` panes that PR #147 deleted. They
  are unrelated to Phase 25AL and out of its scope — see §8.

## 8. Out-of-scope issue flagged (Phase 26C / PR #147)

PR #147 deleted the panes `tab-cmd`, `tab-revenue`, `tab-socials`, `tab-command` but left
their nav buttons (`data-tab="cmd|revenue|socials|command"`) in place — dangling nav
controls that now point to non-existent panes. This is the source of the 6 pre-existing
test failures and should be addressed separately (either remove the dangling buttons or
restore/redirect the panes). Phase 25AL does not touch it.

## 9. Safety scan

- No `.env*` files touched.
- No secrets / SAM.gov `api_key` printed or added.
- Git stashes untouched (3, unchanged).
- No deploy / publish / GitHub release.
- No pricing / Stripe / checkout / website / email-send / bid-submission / portal-upload
  changes.
- No saved pursuits or credentials deleted.

## 10. Manual retest steps

1. Launch SourceDeck from the trial bundle.
2. Settings → Source Cache → **Clear contaminated source cache**, then reload.
3. Select a saved pursuit, download its package, **Send Package to Solicitation Center**,
   **Extract Requirements**, **Plain-English explanation**.
4. Confirm the Solicitation Center panels show real solicitation content and **never** show
   `.cmd-flow` / nav-label text. If any contaminated source ever reaches a panel, it now
   shows the safe block message instead of a dump.
5. (Optional) In DevTools, `window.sdSolRenderBlockDiagnostics` lists any blocked renders
   with context/markers/length only.

# SourceDeck Solicitation Center Incident — Root-Cause Notes Before Code Changes

## Confirmed evidence

The focused saved-pursuit regression was strengthened and run before any production-code edit. It reproduced a deterministic failure: `Solicitation Center hook must populate #gc-sol-opp-select`. The live markup contains `id="gc-sol-opp-select"` and calls `onchange="gcSolSelect(this.value)"`, but the active saved-pursuit hook config sets the Solicitation tab selector to `sel: null`, so the shared saved-pursuit loader never fills that dropdown. The same script also asserted that `window.gcSolSelect = function(id)` must exist; the renderer only defines `gcV25SelectSolicitation`, `gcVendorsSolSelect`, `gcPricingSolSelect`, and `gcPpfSolSelect`, leaving the Solicitation Center-specific onchange target undefined.

The linked-source extraction path is also disabled in source. `gcSolExtract()` attempts to collect linked saved-pursuit source text through `gcW25CollectSourceText()`, but the active implementation immediately returns an empty string under a retired-source-materials comment. Therefore, after a saved pursuit is selected, Extract Requirements cannot receive saved-pursuit description, summary, notes, or source material text unless a separate file upload already populated extraction state.

The upload extraction path maps package extractor output in `mapPackageExtraction()`. That mapper only renders formal UCF sections `L`, `M`, and `C/F` into the panels. When the extractor cannot identify formal section headers but does identify fallback requirement buckets, the service can still produce fallback sections. However, the renderer's `arr(letter)` helper ignores section confidence/found-state nuance and can pass missing-placeholder text forward. This makes the UI look empty or misleading for many non-UCF solicitation formats.

## Hypotheses considered

| Hypothesis | Status | Evidence |
|---|---:|---|
| Main-process IPC is not wired to the importer. | Eliminated | `main.js` has the local import handler and previous upload handoff tests exercise the desktop import bridge. The observed dropdown failure occurs before IPC is involved. |
| Opportunities are not saved at all. | Eliminated | Existing tests and source show saved/pursuing opportunities are written through `window.sd.govcon.opportunities.upsert()` and read through `window.sd.govcon.opportunities.list()`. The defect is the Solicitation Center hook not targeting its own select element. |
| The saved-pursuit dropdown is missing from markup. | Eliminated | `#gc-sol-opp-select` exists in the Solicitation Center markup. The problem is population and handler wiring. |
| Extract Requirements is completely broken for uploaded files. | Partially eliminated | Existing upload/import regression tests pass for supported readable fixtures. The production failure is broader: uploaded extraction does not populate useful panels for weak/non-UCF content, and linked saved-pursuit extraction is effectively unreachable. |
| Required Forms garbage is the only defect. | Eliminated | The current report includes no useful sections and a dead linked-pursuit selector. Prior garbage filtering reduced one symptom but did not restore the saved-pursuit source path or robust fallback section display. |

## Confirmed root causes

1. **Saved-pursuit dropdown root cause:** the Solicitation Center hook configuration uses `sel: null` for the `solicitation` tab, so saved pursuits are never loaded into `#gc-sol-opp-select`. The markup then calls `gcSolSelect(this.value)`, but no `gcSolSelect` function is defined, so even manually populated options would not reliably select and load the pursuit.

2. **Linked saved-pursuit extraction root cause:** `gcW25CollectSourceText()` is hard-retired and returns `''` before reading any active saved-pursuit data. `gcSolExtract()` depends on that collector when no uploaded extraction state is present, so Extract Requirements has no source text to classify from saved pursuits.

3. **Uploaded extraction display root cause:** the renderer only promotes formal section mapping into the main panels and does not robustly transform fallback buckets/metadata into user-visible Section L, Section M, PWS/SOW, deadlines, risks, and form content for non-standard solicitation packages. This creates an empty-panel experience even when the service extracted relevant lines.

## Smallest safe fix plan

The fix should stay in the defective path. It should wire the Solicitation Center selector into the existing saved-pursuit hook, define the missing `gcSolSelect()` wrapper, restore a safe saved-pursuit source collector that only uses already-saved local opportunity fields and sanitized source-material text, and improve renderer mapping so fallback buckets are visible when formal section headers are absent. It should not re-enable the retired downloaded-package file path or weaken app-shell/source sanitation.

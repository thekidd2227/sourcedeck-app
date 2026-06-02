# Release Note — Design Tokens + UI Foundation (Phase 20B)

**Branch:** `feat/design-tokens-ui-foundation`
**Type:** Design-token foundation only (pixel-safe).

## Summary

Phase 20B establishes the **SourceDeck Civic Atelier design-token
foundation** inside `sourcedeck.html` — the canonical, additive `--sd-*`
token layer (color, surface, text, typography, spacing/radius, elevation,
motion) that later phases consume. **This phase is intentionally pixel-safe
/ near-pixel-equivalent: the current dark UI is preserved.**

## What changed

- Added the full additive `--sd-*` Civic Atelier token layer to `:root`.
- Kept existing variables working through **backwards-compatible aliases**
  where values are identical (`--r` → `--sd-radius-md` = 12px, `--r2` →
  `--sd-radius-sm` = 8px).
- Preserved every existing semantic variable at its original value (cool
  gold, violet, motion timing all unchanged).

## Pixel-safe — visible redesign deferred

- **No** dark → ivory flip. **No** repointing of global body, shell, nav,
  panel, card, button, or table styling. **No** unused `.sd-*` utility
  classes.
- Visible redesign is deferred:
  - **Phase 20C — Navigation + App Shell Redesign** (first visible work).
  - **Phase 20D+ — visible screen-by-screen redesign.**

## No screenshots

No screenshots were captured because **no visible redesign was applied**
in this phase. Before/after screenshots belong to Phase 20C.

## What did NOT change

- No runtime, package, script, service, test, workflow, watsonx, signing,
  publishing, pricing, claims, or feature changes occurred.
- No claims changes: SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim (FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO), guaranteed-outcome or unlimited-AI language, or auto-send/auto-submit copy.
- Stashes were untouched and the old SoHo/DC stash was not applied.

## Next phase

**Phase 20C — Navigation + App Shell Redesign** (consumes this token
layer; introduces the first visible Civic Atelier surfaces with
operator-captured before/after screenshots).

# Audit — Design Tokens + UI Foundation (Phase 20B)

**Date:** 2026-06-02
**Branch:** `feat/design-tokens-ui-foundation`
**Base:** `main` (Phase 20A merged; PR #37 `6e746ca`)
**Direction:** SoHo editorial restraint × Washington DC civic authority
(SourceDeck Civic Atelier).

## Revised scope (authoritative)

- **Phase 20B = design-token foundation ONLY.** Intentionally **pixel-safe
  / near-pixel-equivalent**. The current dark UI is preserved.
- **Phase 20C = visible navigation + app shell redesign.**
- **Phase 20D+ = visible screen-by-screen redesign.**

## Files changed

- `sourcedeck.html` — added the additive `--sd-*` Civic Atelier
  design-token layer in `:root`; existing semantic variables preserved at
  their original values; `--r`/`--r2` wired as backwards-compatible
  aliases onto the identical-value radius tokens.
- `docs/audits/design-tokens-ui-foundation-audit.md` (this file)
- `docs/release-notes/design-tokens-ui-foundation.md`

No other files were touched. No `package.json`, scripts, services, tests,
workflows, `preload.js`, `main.js`, or any `.env` file was modified.

## Token groups added (canonical foundation, additive)

All in `:root` of `sourcedeck.html`:

- **Color (11 + brass-light):** `--sd-obsidian`, `--sd-ink-navy`,
  `--sd-federal-navy`, `--sd-warm-ivory`, `--sd-parchment`,
  `--sd-brass-gold`, `--sd-deep-oxblood`, `--sd-bureau-gray`,
  `--sd-stone-border`, `--sd-alert-red`, `--sd-success-green`.
- **Surface (7):** `--sd-surface-page`, `--sd-surface-shell`,
  `--sd-surface-panel`, `--sd-surface-panel-dark`, `--sd-surface-raised`,
  `--sd-border-muted`, `--sd-border-strong`.
- **Text (5):** `--sd-text-primary`, `--sd-text-secondary`,
  `--sd-text-muted`, `--sd-text-inverse`, `--sd-text-accent`.
- **Typography (5):** `--sd-font-display`, `--sd-font-body`,
  `--sd-font-mono`, `--sd-letter-tight`, `--sd-letter-wide`.
- **Spacing + radius (12):** `--sd-space-1`…`--sd-space-8`,
  `--sd-radius-sm/md/lg/xl`.
- **Elevation (3):** `--sd-shadow-soft`, `--sd-shadow-panel`,
  `--sd-shadow-command`.
- **Motion (2):** `--sd-transition-fast`, `--sd-transition-medium`.

These tokens are **defined for future phases**; they are not yet bound to
global body, shell, nav, panel, card, button, or table styling.

## Backwards-compatible aliases

- `--r` → `var(--sd-radius-md)` (12px == 12px) — pixel-equivalent.
- `--r2` → `var(--sd-radius-sm)` (8px == 8px) — pixel-equivalent.

These bridge the existing radius variables onto the new token layer
without changing any rendered value. All color/motion variables keep their
original values verbatim.

## Before / after visual intent

- **Intentionally pixel-safe / near-pixel-equivalent.** The existing dark
  UI is preserved exactly. No accent was repointed (cool gold stays
  `#C9941A`, violet stays `#A78BFA`), no motion timing changed, no ground
  was flipped to ivory. The only difference from the prior tree is the
  presence of the additive `--sd-*` tokens plus two exact-value radius
  aliases.

## What was intentionally NOT changed (and why)

- **No dark → ivory flip.** The renderer carries ~344 inline hardcoded
  color styles plus three `<style>` blocks assuming a dark ground. The
  ground inversion is deferred to Phase 20C, where surfaces are restyled
  in tandem and screenshot-verified.
- **No repointing** of global body, shell, nav, panel, card, button, or
  table styling to the new palette.
- **No unused `.sd-*` utility classes** were created.
- No layout, structure, section, copy, claims, pricing, or behavior
  changed.

## Screenshots

**None were captured because no visible redesign was applied** in this
phase. Phase 20B is a pixel-safe token foundation. Operator-captured
before/after screenshots belong to Phase 20C, when the first visible
redesign (navigation + app shell) lands.

## Accessibility notes

Pixel-safe by construction: no background, text, accent, or motion value
changed, so every existing contrast ratio is preserved exactly.

## No-go items avoided

- No claims added: SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim (FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO), guaranteed-outcome or unlimited-AI language, or auto-send/auto-submit copy.
- No runtime, package, script, service, test, workflow, watsonx, signing,
  publishing, pricing, claims, or feature changes occurred.

## Confirmations

- Stashes untouched (`stash@{0}` SoHo×DC WIP, `stash@{1}` GovCon Capture
  OS WIP); the old SoHo/DC stash was **not** applied, popped, or dropped.
- The current dark UI was preserved. Civic Atelier tokens were added for
  future phases. No runtime changes.

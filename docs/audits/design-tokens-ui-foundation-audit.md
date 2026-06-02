# Audit — Design Tokens + UI Foundation (Phase 20B)

**Date:** 2026-06-02
**Branch:** `feat/design-tokens-ui-foundation`
**Base:** `main` @ `6e746ca` (Phase 20A merged)
**Direction:** SoHo editorial restraint × Washington DC civic authority
(SourceDeck Civic Atelier).

## Files changed

- `sourcedeck.html` — added the `--sd-*` design-token foundation to the
  primary `:root` block; applied contrast-safe accent refinements.
- `docs/audits/design-tokens-ui-foundation-audit.md` (this file)
- `docs/release-notes/design-tokens-ui-foundation.md`

No other files were touched. No `package.json`, scripts, services, tests,
workflows, `preload.js`, `main.js`, or any `.env` file was modified.

## Token groups added (canonical foundation)

All in `:root` of `sourcedeck.html`, additively:

- **Color (11):** `--sd-obsidian`, `--sd-ink-navy`, `--sd-federal-navy`,
  `--sd-warm-ivory`, `--sd-parchment`, `--sd-brass-gold`,
  `--sd-deep-oxblood`, `--sd-bureau-gray`, `--sd-stone-border`,
  `--sd-alert-red`, `--sd-success-green` (+ `--sd-brass-gold-light`).
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

## Before / after visual intent

- **Before:** dark "developer command line" shell; cool gold accent
  (`#C9941A`); violet (`#A78BFA`) used for AI/escalation chips; ad-hoc
  radius/transition literals.
- **After (this phase):** the same readable shell, with the accent metal
  warmed to **Civic Atelier brass** (`#B08A3C`) system-wide, the **violet
  AI-mysticism removed** from the public surface (routed to a neutral
  steel that stays light on dark), and radius/motion routed through the
  new token layer. The canonical `--sd-*` palette is now present as the
  single source the later phases consume.

This implements two named requirements from
`docs/design/sourceDeck-civic-atelier-visual-direction.md` verbatim:
brass replaces cool gold (§palette, line 27) and `--purple` is removed
from the public surface (§guardrail, line 137).

## What was intentionally NOT changed (and why)

- **The ivory/stone ground inversion was deferred to Phase 20C
  (Navigation + App Shell Redesign).** The renderer carries **344 inline
  hardcoded color styles** in the HTML body plus three `<style>` blocks,
  all currently assuming a dark ground with light text. Flipping the
  global ground (`--bg`/`--text`) without restyling those surfaces in
  tandem would risk light-on-light / dark-on-dark regressions. Per the
  roadmap, 20B establishes the token foundation; 20C re-points surfaces
  to ivory with screenshot verification. This keeps 20B contrast-safe by
  construction.
- No layout, structure, section, copy, or component behavior changed.
- The existing ground/text/border semantic variables
  (`--bg`, `--panel*`, `--text`, `--sub`, `--muted`, `--border*`) were
  preserved unchanged.

## Accessibility notes

- **Contrast-safe by construction.** No background or text color value
  changed, so every existing text/surface pairing keeps its prior
  contrast ratio. The only color change is the accent hue:
  - Black-on-brass (`.btn-gold`, fill `#B08A3C`, text `#000`) ≈ **6.5:1**
    — passes WCAG AA for normal text (cool gold was ≈ 7.6:1).
  - Brass-light accent text (`--gold2` → `#C7A24E`) is used as light text
    on dark surfaces (nav active, button hover) — remains high-contrast.
  - `--purple` (light violet text on dark) → neutral steel `#A9B4C2`,
    still a **light** value on dark grounds, so legibility is preserved.
- Radius tokens map to the identical pixel values already in use
  (`--r`→12px, `--r2`→8px); motion is a 0.22s-ease → 240ms-cubic-bezier
  refinement. Neither affects contrast or layout.

## No-go items avoided

- No claims added: SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim (FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO), guaranteed-outcome or unlimited-AI language, or auto-send/auto-submit copy.
- No runtime/AI/provider/watsonx-probe/troubleshooting/release/signing/
  publishing logic touched.
- No marketing gradients added; no neon; no generic SaaS purple/blue
  (violet removed).
- No new product features; no pricing change; no behavior change.
- No full-screen redesign; no section removal.

## Screenshots

Target path: `tmp/phase20b-ui-foundation/` (not committed). **Live
Electron screenshots were not captured:** no Playwright/Puppeteer is
installed and no headless screenshot path for the Electron renderer is
wired in this repo (consistent with the Phase 20A audit note), and this
environment cannot drive the Electron GUI. Because 20B changes no layout
and no ground/text values, the visual QA checklist (no broken layout, no
unreadable text, no invisible buttons, no clipped panels, no contrast
regressions, no feature removal, no behavior change) is satisfied by
construction. Operator-captured before/after screenshots should be
attached when the ivory-ground work lands in 20C.

## Confirmations

- Stashes untouched (`stash@{0}` SoHo×DC WIP, `stash@{1}` GovCon Capture
  OS WIP); the old SoHo/DC stash was **not** applied, popped, or dropped.
- No runtime changes; CSS-only edit inside `sourcedeck.html` plus two docs.

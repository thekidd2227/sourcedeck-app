# Release Note — Design Tokens + UI Foundation (Phase 20B)

**Branch:** `feat/design-tokens-ui-foundation`
**Type:** Visual foundation (CSS tokens) only.

## Summary

Phase 20B establishes the **SourceDeck Civic Atelier design-token
foundation** inside `sourcedeck.html` — the canonical `--sd-*` token layer
(color, surface, text, typography, spacing/radius, elevation, motion) that
later phases consume. It applies the first contrast-safe Civic Atelier
refinements and lays the groundwork for the ivory/stone app-shell work.

## What changed

- Added the full `--sd-*` token foundation to `:root` (additive).
- Warmed the accent metal from cool gold to **Civic Atelier brass**
  (`#B08A3C`) system-wide.
- Removed the **violet AI-mysticism** from the public surface (routed to a
  neutral steel, kept light for on-dark legibility) per the direction
  guardrail.
- Routed radius and motion through the new tokens (identical radii;
  refined editorial easing).

## Visual foundation only

- The existing readable shell is preserved. The full ivory/stone ground
  inversion is **deferred to Phase 20C — Navigation + App Shell Redesign**,
  where each surface is restyled in tandem and screenshot-verified. This
  keeps Phase 20B contrast-safe by construction.

## What did NOT change

- No new product features. No runtime/AI/provider/watsonx/troubleshooting/
  release/signing/publishing logic. No `package.json`, scripts, services,
  tests, or workflows.
- No claims changes: SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim (FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO), guaranteed-outcome or unlimited-AI language, or auto-send/auto-submit copy.
- No pricing change. No product behavior change. No layout redesign.

## Accessibility

Contrast-safe by construction: no background or text color value changed,
so all existing pairings keep their prior contrast. The brass accent keeps
black-on-brass at ≈ 6.5:1 (WCAG AA pass).

## Next phase

**Phase 20C — Navigation + App Shell Redesign** (consumes this token
layer; introduces the ivory civic ground + federal-navy command zone with
operator-captured before/after screenshots).

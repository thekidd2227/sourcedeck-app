# Release Note — Renderer Boot Syntax Fix

**Type:** Bug fix (BLOCKER)
**Branch:** `fix/renderer-boot-syntax-errors`
**Date:** 2026-06-04

## What was broken

The desktop renderer launched and showed its static layout, but the core
renderer JavaScript failed to parse, so it never executed. Tab navigation and
all dynamic UI (dashboard, leads, activity feed, etc.) were inert. This was
discovered during post-PR #52 macOS visual QA.

Two parse-time errors were responsible:

1. A malformed inline `toast()` call in `sourcedeck.html` produced
   `SyntaxError: missing ) after argument list`, which discarded the entire
   large inline `<script>` block.
2. `services/default-state-policy.js` and `services/response-desk.js` both
   declared a top-level `const _api`; loaded as classic scripts they collided
   with `SyntaxError: Identifier '_api' has already been declared`.

## What was fixed

- **`sourcedeck.html`** — corrected the `toast()` arguments
  (`toast(message, type)`); the message/type intent is preserved.
- **`services/default-state-policy.js`** — renamed the internal `_api` to the
  unique `_defaultStateApi`. Public exports are unchanged: `module.exports`
  (CommonJS/tests) and `window.SDDefaultState` (renderer namespace).
  `services/response-desk.js` was not modified.

## What was added

- **`test/renderer-boot.test.js`** — regression coverage that parses every
  inline script, loads the two classic service scripts together without
  collision, asserts both renderer namespaces attach, confirms the malformed
  `toast` syntax is gone, and confirms protected feature strings remain. Wired
  into `npm test`.

## Verification

- Static parse: all inline scripts parse; both services load with no collision.
- Live Electron (CDP): **0 boot exceptions**; `openTab`/`renderDashboard`/etc.
  defined; **all required tabs switch** (Dashboard, Lead Generator, Ad Engine,
  Daily Operating Rhythm, System Flow, Settings, Response Desk, GovCon/SAM
  Sprint).
- Gates: `npm test`, `release:evidence`, `troubleshooting:scan`, `govcon:smoke`,
  `phase13:rc-check`, `i18n:audit`, `release-check.js` all green.

## No behavior change beyond restoring boot

- Default-state cleanup preserved (no operator/demo contamination reintroduced).
- Response Desk preserved — no Send Email, human approval required,
  `auto_send: false`.
- SAM Sprint preserved — Free = 1 NAICS, no auto-send.
- Phase 20G `.btn-gold` and 900px/899px guards preserved.
- No `.env`, pricing/payment, watsonx, signing, release-evidence, provider, or
  Vercel changes.

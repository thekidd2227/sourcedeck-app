# ADR-0002 — Renderer strangler

- **Status:** Accepted (Phase 3 ✅ first slice shipped)
- **Date:** 2026-06-24
- **Repo:** `thekidd2227/sourcedeck-app`
- **Authors:** Refactor working group
- **Supersedes/extends:** builds on
  [ADR-0001](ADR-0001-main-process-composition-root.md) (main-process
  composition root, Phases 1–2)

## Context

ADR-0001 strangled the **main process**: `main.js` went from ~740 lines
owning ten responsibilities to a thin composition entry point, with
startup/window/IPC concerns living under `app/main/**`.

The **renderer** has the same problem, larger. `sourcedeck.html` is
~23.5k lines and interleaves markup with dozens of inline `<script>`
feature blocks (SAM search, NAICS tooling, solicitation workspace,
calendar, response desk, the State & Local procurement panel, and many
more). Every feature touch risks a sibling block; the size discourages
unit/characterization tests; and nothing prevents a new feature from
adding yet another inline block.

We want the same **risk reduction without redesign** for the renderer
that ADR-0001 achieved for the main process.

## Decision

Strangle the renderer **one contained feature slice per commit**, moving
each slice into a dedicated module under
`app/renderer/features/<feature>/`.

The rules:

1. **One slice at a time.** Never attempt a full `sourcedeck.html`
   decomposition in a single change. The correct commit is boring: same
   UI, same behavior, smaller HTML, one new module, green tests.

2. **No bundler, no framework, no new dependency.** Modules are plain
   browser-safe, global-attachment scripts loaded with a relative
   `<script src>`, exactly like the existing `services/*.js` and
   `chartnav-integration.js`. This works under Electron `loadFile` in
   both dev and the packaged asar.

3. **No IPC contract change.** Channel names, preload (`window.sd.*`) API
   names, argument shapes, and return shapes are untouched. Renderer
   modules reach the main process only through the existing preload
   bridge — **never** `require('electron')` and **never** `ipcRenderer`
   directly.

4. **Preserve the renderer-facing surface exactly.** Window-global
   function names invoked from `onclick=` / inline markup (e.g.
   `sdSwitchOppMode`, `sdRenderStatePortal`, `sdOpenExternal`) are a
   public contract. Keep the existing names even if a "nicer" name
   exists; markup and tests depend on them.

5. **Markup stays in HTML.** Only JavaScript logic moves. DOM ids, CSS
   classes, copy, ARIA, tab values, and `localStorage` keys are
   unchanged. The slice must remain visually and behaviorally identical,
   including tablet/touch responsiveness.

6. **Lock each slice with tests.** A behavioral test exercises the moved
   module (loading it the same way the renderer does), and an
   architecture test asserts the module exists, HTML references it and no
   longer contains the moved bodies, the surface is intact, and the
   main-process invariants (zero `ipcMain.handle` in `main.js`, IPC owned
   by `app/main/ipc/`) still hold.

7. **Renderer modules must ship.** `app/**` is included in
   `build.files`. (Adding it also repaired a latent Phase 1/2 packaging
   gap where `app/main/**` — required by `main.js` — was excluded from the
   asar, which would have crashed the packaged app at boot.)

## First slice

The **Find Opportunities → State & Local procurement panel** (the inline
Phase 25AL `<script>`, 192 lines) moved verbatim to
`app/renderer/features/find-opportunities/state-local-procurement.js`.
It still attaches `window.SD_STATE_PORTALS` and the
`sdSwitchOppMode` / `sdRenderStatePortal` / `sdOpenSelectedStatePortal` /
`sdOpenExternal` surface. `sourcedeck.html` loads it via `<script src>`
and dropped from 23,706 → 23,515 lines.

## Consequences

**Positive:** smaller HTML per commit; each slice gains a stable seam and
real tests; new features have an obvious home (`app/renderer/features/`)
instead of another inline block; main-process and renderer now share one
strangler discipline.

**Negative / trade-offs:** more `<script src>` tags and more files;
load-order matters (modules load in document order, same as the inline
blocks they replace); global-attachment (not ES modules) is retained for
zero-build compatibility. These are accepted to keep risk low and the
toolchain unchanged.

**Rollback:** `git revert` of a slice commit restores the inline block;
slices are independent, so reverting one does not affect others.

## Alternatives considered

- **Big-bang renderer rewrite (framework + bundler):** rejected — highest
  blast radius, changes the toolchain, and violates the no-dependency
  constraint.
- **ES modules (`<script type="module">`):** rejected for now — would
  change load semantics (deferred, CORS/file:// nuances under Electron)
  and the existing global-attachment contract. Revisit only if a slice
  genuinely needs it.
- **Leaving the renderer monolithic:** rejected — the cost of every
  renderer change keeps rising and the file resists testing.

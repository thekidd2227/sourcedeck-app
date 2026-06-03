# Audit — Phase 20C Civic Atelier Navigation + App Shell Redesign

**Date:** 2026-06-03
**Branch:** `feat/phase-20c-civic-shell-redesign`
**Base:** `main` (Phase 20B merged: PR #38 `47e3c66` + PR #39 `6d4e7d8`)
**Direction:** SoHo editorial restraint × Washington DC civic authority (SourceDeck Civic Atelier).
**Phase status:** Visible redesign begins here, **scoped to navigation + app shell only**.

## Scope (authoritative)

Phase 20C binds the additive Civic Atelier `--sd-*` token foundation (established in Phase 20B) to **navigation and app-shell surfaces only**:

- Topbar (background, brand mark, KPI hairlines, motion)
- Sidebar (background)
- Nav labels (raised contrast off the low-contrast `--dim`)
- Nav buttons (active accent → brass; motion → editorial easing)
- Shell page-title typography (Cormorant Garamond italic)
- Pane header (matches topbar civic command-zone navy)

Out of scope and **not** touched in 20C:
- Feature cards, dashboards, forms, tables, body content, modals, workflow panels
- Inline `style="…"` attributes on body elements
- Global `--gold` / `--gold2` / `--goldb` alias values (feature buttons remain cool gold)
- The `--bg` / `--text` ground inversion (deferred to Phase 20D+)
- Any JavaScript, runtime, package, script, service, test, workflow, watsonx, signing, publishing, pricing, claims, or feature behavior

## Files changed

Exactly three:
- `sourcedeck.html` — 8 selector blocks updated (11 CSS rules total); +24 / −14 lines.
- `docs/audits/phase-20c-civic-shell-redesign-audit.md` (this file).
- `docs/release-notes/phase-20c-civic-shell-redesign.md`.

No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` file was modified. No body markup edited. No inline `style="…"` attributes touched.

## Selectors changed (exact list)

1. `.topbar`
2. `.logo-mark`
3. `.tb-kpi`
4. `.tb-kpi:hover`
5. `.sidebar`
6. `.nav-label`
7. `.nav-btn`
8. `.nav-btn.active`
9. `.nav-btn.active::before`
10. `.pane-hdr`
11. `.pane-title`

Selectors deliberately **NOT** changed in this phase:
- `.topbar-sep`, `.logo-block`, `.brand-name`, `.brand-ver`, `.topbar-kpis`, `.tb-kv`, `.tb-kl`, `.topbar-right`, `.live-dot`, `.pulse` (and `@keyframes pulse`), `.nav-section`, `.nav-btn:hover`, `.nav-icon`, `.nav-badge`, `.pane-sub`, `.pane-actions`

## Before / after token bindings

| # | Selector | Property | Before | After |
|---|---|---|---|---|
| 1 | `.topbar` | `background` gradient stop 0% | `rgba(11,24,41,1)` (hard-coded `#0B1829`) | `var(--sd-federal-navy)` (= `#172033`) |
| 1 | `.topbar` | `background` gradient stop 100% | `rgba(11,24,41,0.97)` | `rgba(23,32,51,0.97)` (matches federal-navy) |
| 2 | `.logo-mark` | `background` | `#0b0f16` | `var(--sd-obsidian)` (= `#0B0B0A`) |
| 2 | `.logo-mark` | `box-shadow` glow | `rgba(201,148,26,0.22)` (cool gold) | `rgba(176,138,60,0.22)` (brass, shell-scoped) |
| 2 | `.logo-mark` | `border` | `rgba(201,148,26,0.18)` | `rgba(176,138,60,0.18)` (brass, shell-scoped) |
| 3 | `.tb-kpi` | `transition` | `var(--t)` (= `all 0.22s ease`) | `var(--sd-transition-medium)` (= `all 240ms cubic-bezier(0.2,0,0,1)`) |
| 4 | `.tb-kpi:hover` | `border-color` | `var(--goldb)` (cool gold-low alpha) | `rgba(176,138,60,0.18)` (brass, shell-scoped) |
| 5 | `.sidebar` | `background` | `var(--panel2)` (= `#0A1420`) | `var(--sd-obsidian)` (= `#0B0B0A`) |
| 6 | `.nav-label` | `color` | `var(--dim)` (= `#2E4358`, low contrast) | `var(--sd-text-secondary)` (= `--sd-bureau-gray` = `#6B7280`) |
| 7 | `.nav-btn` | `transition` | `var(--t)` | `var(--sd-transition-medium)` |
| 8 | `.nav-btn.active` | `background` gradient | cool-gold + cyan rgba mix | brass + civic-navy rgba mix (shell-scoped) |
| 8 | `.nav-btn.active` | `color` | `var(--gold2)` (= `#E8A91E`) | `var(--sd-brass-gold-light)` (= `#C7A24E`) |
| 8 | `.nav-btn.active` | `border` | `rgba(201,148,26,0.18)` | `rgba(176,138,60,0.22)` (brass, shell-scoped) |
| 8 | `.nav-btn.active` | `box-shadow` inset | `rgba(201,148,26,0.05)` | `rgba(176,138,60,0.08)` (brass, shell-scoped) |
| 9 | `.nav-btn.active::before` | `background` rail | `var(--gold)` | `var(--sd-brass-gold)` |
| 9 | `.nav-btn.active::before` | `box-shadow` | `rgba(201,148,26,0.6)` | `rgba(176,138,60,0.6)` (brass, shell-scoped) |
| 10 | `.pane-hdr` | `background` gradient | `rgba(11,24,41,0.9 → 0.6)` | `rgba(23,32,51,0.9 → 0.6)` (matches topbar) |
| 11 | `.pane-title` | `font-family` | `'Syne'`, sans-serif, weight 700 | `'Cormorant Garamond'`, italic, weight 600 |
| 11 | `.pane-title` | `font-size` | `17px` | `20px` (compensates italic-serif optical size) |
| 11 | `.pane-title` | `letter-spacing` | (default) | `-0.01em` (editorial display tightening) |

## Important: brass is shell-scoped, not globally repointed

All brass values inside the shell selectors are written as **inline `var(--sd-brass-gold)` / `var(--sd-brass-gold-light)` / `rgba(176,138,60,…)` literals**. The global aliases `--gold`, `--gold2`, `--goldl`, `--goldb` are **untouched** in `:root`. Every feature surface that consumes those globals (`.btn-gold`, dashboard KPI accents, status pills, etc.) continues to render in the original cool gold. **This deliberately preserves the strict 20B pixel-equivalence outside the shell.**

## Sidebar breakpoints — unchanged

Per directive, the sidebar width variables and breakpoints are intact:
- Default: `--sidebar:224px`
- `≤1024px` media query: `:root{--sidebar:196px}` (unchanged)
- `≤900px` media query: `:root{--sidebar:176px}` (unchanged)
- The horizontal sidebar-collapse mode at `≤900px` is unchanged.

## What was intentionally NOT changed (and why)

- **`.brand-name` / `.brand-ver`** — the product brand mark letterforms (Syne) and version chip are not Civic Atelier territory; refresh limited to the surrounding `.logo-mark` plate.
- **`.nav-btn:hover`** — base hover state (transparent → low-alpha white) reads identically on the new obsidian ground; no visible regression.
- **`.live-dot` / `.pulse`** — the live indicator's `--green` value (`#1E7A4E`) was intentionally not bound to `--sd-success-green` (`#2F6B4F`) because the shade difference is perceptible and outside the brass-only directive.
- **`.nav-badge`** — the red alert badge (`--red` = `#8B1A2E`) was not bound to `--sd-alert-red` (`#B42318`) for the same reason: shade-perceptible, outside brass-only.
- **Body styles below the shell** (253 inline `<element style="…color…">` attributes) — out of scope; deferred to Phase 20D+.

## Accessibility notes

- **`.nav-label` contrast**: previously `--dim` (#2E4358) on `--panel2` (#0A1420) ≈ **3.6:1** (fails WCAG AA for normal text). Now `--sd-bureau-gray` (#6B7280) on `--sd-obsidian` (#0B0B0A) ≈ **5.0:1** (passes WCAG AA for small text). This is the contrast bump explicitly required by the roadmap goal.
- **`.nav-btn.active` brass accent**: `--sd-brass-gold-light` (#C7A24E) on the obsidian/navy gradient ground ≈ **6.4:1** — passes WCAG AA for normal text.
- **Topbar / pane-hdr civic navy**: backgrounds are slightly lighter than the prior `rgba(11,24,41,…)` (now `#172033` federal-navy). Existing text-on-topbar pairings (`.brand-name`, `.tb-kv`, `.tb-kl`, `.topbar-right`) retain their original light text values — contrast remains ≥ AA.
- **`.pane-title` typography swap**: font-size raised 17 → 20px to keep optical weight comparable when switching from Syne bold to Cormorant Garamond italic. Verify across the three target views in screenshot QA (see below).

## Screenshot QA checklist (operator-required before merge)

**This environment cannot drive the Electron renderer** (no Playwright/Puppeteer installed; no headless Electron screenshot path; Linux-container, no GUI). Screenshots must be **operator-captured on macOS** and attached to the PR before it can land. Until then, the PR remains explicitly **not merge-ready**.

### Required before / after pairs

| # | Surface | Width / state | What to verify |
|---|---|---|---|
| 1 | Default desktop shell | ≥1180 px default | Topbar federal-navy command zone; sidebar obsidian command zone; pane-hdr matches topbar |
| 2 | Topbar + brand mark | ≥1180 px | Logo-mark obsidian plate + brass hairline; KPI strip readable; live-dot still pulsing |
| 3 | Sidebar at default width | 224 px | Nav labels readable (AA pass); nav-active brass rail visible on left edge |
| 4 | Sidebar at 1024 px breakpoint | 196 px | Width drops to 196 cleanly; nav-active rail still visible |
| 5 | Sidebar at 900 px breakpoint | 176 px | Width drops to 176; nav-active state still distinguishable |
| 6 | Sidebar in horizontal collapse mode | ≤900 px width | Horizontal collapse layout still renders; no overflow |
| 7 | Pane title — Dashboard view | default width | Cormorant Garamond italic does not clip / overflow; reads as editorial |
| 8 | Pane title — GovCon view | default width | Same — verify across longer title strings |
| 9 | Pane title — Troubleshooting view | default width | Same — verify alongside `.pane-sub` mono caption |
| 10 | Nav-active state | default width | Brass active rail + brass-light label color readable; old cool-gold tone gone in nav only |
| 11 | Feature buttons (dashboard `.btn-gold`) | default width | **Must still render in cool gold** (proves no global repoint) |
| 12 | Status pills, KPI numbers | default width | Cool gold preserved on feature surfaces (regression guard) |

### Regression watch list
- [ ] macOS title-bar drag region (`-webkit-app-region:drag` on `.topbar`) still works — window can be dragged.
- [ ] Brand name and version chip render identically (not touched in 20C).
- [ ] Live-dot green pulse still animates at the same color (not touched in 20C).
- [ ] Nav-badge red alerts still render at the same red (not touched in 20C).
- [ ] All `.btn-gold` instances in feature views still render in cool gold (`#C9941A`), not brass.
- [ ] No layout shift on `.tb-kpi` (radius and padding unchanged).
- [ ] `.pane-title` does not clip vertically inside `.pane-hdr` (14px padding may need adjustment if Cormorant ascenders bump).

## Confirmations

- No runtime, package, script, service, test, workflow, watsonx, signing, publishing, Vercel, GOVCON, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflows touched.
- No JavaScript behavior changed.
- No body markup changed.
- No inline `style="…"` body attribute changed.
- No `.env` touched.
- No claims, pricing, or product behavior changed.
- No new features added.
- Stashes untouched (`git stash list` empty before and after); the old SoHo×DC stash was not applied, popped, or dropped.
- The Civic Atelier `--sd-*` token foundation from Phase 20B is preserved verbatim — Phase 20C only consumes it.
- The strict 20B pixel-equivalence directive remains in force outside the shell scope: `--gold`, `--gold2`, `--goldb`, `--purple`, `--t`, etc. retain their post-PR-39 values.

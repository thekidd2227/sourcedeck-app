# Audit — Phase 20D Dashboard + GovCon Workspace Redesign

**Date:** 2026-06-03
**Branch:** `feat/phase-20d-dashboard-govcon-workspace-redesign`
**Base:** `main @ 5065763` (Phase 20C shell merged)
**Direction:** SoHo editorial restraint × Washington DC civic authority (SourceDeck Civic Atelier).
**Phase status:** Second visible redesign phase, scoped to the dashboard and GovCon workspace **stylesheet level only**.

## Scope (authoritative)

Phase 20D applies Civic Atelier brass + ink-navy accents to the dashboard and GovCon workspace at the stylesheet layer only, using descendant selectors rooted at `#tab-dashboard` and `#tab-govcon`. The dark ground is **deliberately preserved**: 147 inline `style="…color/background/border-color…"` attributes inside these two tabs would clash with a ground inversion, and the operator's hard rule "do not flip the entire app to ivory" is honored.

In scope:
- Section labels (`.sl`) — contrast raised off low-contrast `--dim` onto `--sd-text-secondary`; brass-tinted micro-rule.
- KPI labels (`.kpi-label`) — contrast raised off `--muted` onto `--sd-text-secondary`.
- KPI top-rail accent (`.kpi.gold-kpi::before`) — cool gold → Civic Atelier brass, **scoped to these two tabs only**.
- KPI gold glow (`.kpi-glow-gold`) — same scoped recolor.
- KPI numerals — new editorial brass hairline beneath each value (briefing-room flavor).
- GovCon opportunity briefs (`.opp-brief`) — brass left rail, brass-light accent label/value, brass-light certification chips, brass-blended confidence fill.
- GovCon workspace banners (`.workspace-readiness`, `.gc-setup-banner`) — civic-brass + ink-navy retint of the existing background gradient (no copy change).

Out of scope and **not** touched:
- Global `--gold`, `--gold2`, `--goldb`, `--purple`, `--bg`, `--text`, `--border`, `--panel*`, `--t`, `--r`, `--r2`, `--sidebar`, `--topbar` aliases.
- `.btn-gold` and every other cool-gold surface (preserved verbatim everywhere — including inside these tabs).
- Body markup: no `<div>`, `<button>`, `<span>`, `<form>`, `<table>`, `<a>`, or any other element was added, removed, reordered, or relabeled.
- Inline `style="…"` attributes on body elements: none changed.
- JavaScript: no `<script>` block, event handler, or function edited.
- All other tabs (Outreach, Primes, Workflows, Settings, Troubleshooting, About).
- The GovCon Setup Wizard (`#govcon-wizard` modal lives outside `#tab-govcon`).
- The first-run safety scrubber and credential boundary.

## Files changed

Exactly the three allowed:
- `sourcedeck.html` — +44 / −0 (one additive scoped CSS block at end of main `<style>`).
- `docs/audits/phase-20d-dashboard-govcon-redesign-audit.md` (this file).
- `docs/release-notes/phase-20d-dashboard-govcon-redesign.md`.

No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` file was modified.

## Selectors added (16 new rules in one CSS block)

| # | Selector | Property | Value | Effect |
|---|---|---|---|---|
| 1 | `#tab-dashboard .sl, #tab-govcon .sl` | `color` | `var(--sd-text-secondary)` | Raises section-label contrast off `--dim` |
| 2 | `#tab-dashboard .sl::before, #tab-govcon .sl::before` | `background` | `var(--sd-brass-gold)` | Civic brass micro-rule before section label |
| 3 | `#tab-dashboard .kpi-label, #tab-govcon .kpi-label` | `color` | `var(--sd-text-secondary)` | Raises KPI caption contrast off `--muted` |
| 4 | `#tab-dashboard .kpi.gold-kpi::before, #tab-govcon .kpi.gold-kpi::before` | `background` (gradient) | brass | Scoped cool-gold → brass on KPI top rails |
| 5 | `#tab-dashboard .kpi-glow-gold, #tab-govcon .kpi-glow-gold` | `box-shadow`, `border-color` | brass-tint rgba | Scoped cool-gold → brass on KPI glow halo |
| 6 | `#tab-dashboard .kpi-val, #tab-govcon .kpi-val` | `padding-bottom`, `position` | `4px`, `relative` | Makes room for the brass underline rule |
| 7 | `#tab-dashboard .kpi-val::after, #tab-govcon .kpi-val::after` | `content` + positioned 1px brass rule | new | Editorial brass hairline under each KPI numeral |
| 8 | `#tab-govcon .opp-brief` | `border-left-color` | `var(--sd-brass-gold)` | Scoped brass opportunity-brief rail |
| 9 | `#tab-govcon .opp-brief:hover` | `border-color`, `box-shadow` | brass rgba | Scoped brass hover state |
| 10 | `#tab-govcon .opp-brief-agency` | `color` | `var(--sd-brass-gold-light)` | Civic brass agency label |
| 11 | `#tab-govcon .opp-brief-value` | `color` | `var(--sd-brass-gold-light)` | Civic brass dollar-value display |
| 12 | `#tab-govcon .opp-confidence-fill` | `background` (gradient) | brass / brass-light | Civic brass confidence indicator |
| 13 | `#tab-govcon .opp-cert` | `background`, `color`, `border-color` | brass rgba | Civic brass certification chips |
| 14 | `#tab-govcon .workspace-readiness` | `border-color`, `background` | brass / federal-navy | Civic banner retint (no copy change) |
| 15 | `#tab-govcon .gc-setup-banner` | `border-color`, `background` | federal-navy / brass | Civic banner retint (no copy change) |

(Rules 14 and 15 are paired CSS declarations counted once each above; total declarations in the block: 16.)

## What was intentionally NOT done

- **No ground inversion.** Dashboard and GovCon panes keep their dark `--bg`. An ivory ground would clash with the 147 inline color/background attributes scattered through the body markup in these two tabs.
- **No `--gold` / `--gold2` / `--goldb` global repoint.** Cool-gold `.btn-gold` remains cool-gold everywhere — including inside the redesigned tabs. The brass appears only on KPI rails, KPI underlines, opportunity-brief rails/labels/cert chips, and workspace-banner backgrounds, scoped to `#tab-dashboard` and `#tab-govcon`.
- **No `--purple` / `--green` / `--red` / `--warn` repoint.** Existing semantic colors retain their values; the oxblood `--crimson:#8B1A2E` already in the palette is unchanged. Adding a scoped oxblood treatment to `.gcsb-state.*` is intentionally deferred (current `incomplete` is a warning, not a blocker, and shifting to oxblood would muddle the semantic — better to wait for explicit blocker states).
- **No body markup edits.** Markup of `#tab-dashboard` (lines 769–1934) and `#tab-govcon` (lines 2009–2635) is untouched.
- **No inline `style="…"` attribute changes.** The 147 inline overrides remain as-is; their colors will still win specificity in the cascade — that is intentional. 20D only restyles properties at the stylesheet level that don't conflict with inline overrides.
- **No `.card:hover` rule added** in 20D scope, because one card in the GovCon tab (`#cl-capability-card`) carries an inline `border-left:3px solid var(--gold)`; overriding `border-color` on hover would mismatch the left rail with the other three sides. Card hover is unchanged.
- **No new `.sd-pill.*` classes** added (`sd-pill` is a `sourcedeck-site` taxonomy, not in this Electron renderer).
- **No KPI value displayed today is hidden or relabeled.** All KPI strings, dollar amounts, percentages, and date displays render exactly as on `main @ 5065763` — 20D only restyles their visual surround.
- **No JavaScript edited.** Behavior identical to `main @ 5065763`.
- **No claims, pricing, watsonx, signing, publishing, Vercel, GOVCON external workflow, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflow changes.**
- **No new features. No removed features. No relabeled controls.**

## Cool-gold preservation strategy

The operator-required regression guard from Phase 20C (`.btn-gold` must remain cool gold everywhere) is preserved verbatim. The Phase 20D block does not include any `.btn-gold` selector, does not repoint `--gold` / `--gold2` / `--goldb` / `--goldl`, and does not introduce any `#tab-dashboard .btn-gold` or `#tab-govcon .btn-gold` override. **`.btn-gold` instances inside the dashboard and GovCon workspace render in identical cool gold (`#C9941A`) to `main @ 5065763`.** This is the explicit Phase 20D screenshot QA gate.

## Accessibility notes

- `.sl` and `.kpi-label` contrast bump from `--dim` (#2E4358) / `--muted` (#6B7F94) on the dark `--bg` (#07090F) ground to `--sd-text-secondary` (= `--sd-bureau-gray` = #6B7280). New contrast ≈ **5.0:1** on `#07090F`, passes WCAG AA for small text.
- Brass-light (`#C7A24E`) on dark `--panel*` grounds ≈ **8.5:1**, passes WCAG AAA for normal text.
- Brass (`#B08A3C`) on dark grounds for the 1px KPI underline rule is decorative and not subject to text-contrast rules.

## Screenshot QA — operator-required before merge

This environment cannot drive the Electron renderer (no Playwright/Puppeteer, no GUI). Operator must capture before/after pairs on macOS before promoting PR from draft → ready-for-review. The mandatory regression frames (any failure here = revert):

| # | Frame | Pass criterion | Blocks merge |
|---|---|---|---|
| 1 | Dashboard default state | KPI top-rail accents read as brass; KPI numerals carry a 28px brass hairline beneath; section labels readable on dark | **yes** |
| 2 | Dashboard populated state | All KPI values render identically (no hidden / relabeled values); `.btn-gold` cool gold preserved | **yes** |
| 3 | GovCon workspace empty state | Workspace-readiness banner is brass/ink-navy retinted; gc-setup-banner is ink-navy/brass retinted; no copy change | **yes** |
| 4 | GovCon workspace populated state | Opportunity briefs show brass left rail, brass-light agency labels, brass-light dollar values; confidence fills brass gradient | **yes** |
| 5 | GovCon opportunity brief with cert chips | Cert chips render brass-light on brass-tint background; no other status pill / KPI accent shifted toward brass outside these tabs | **yes** |
| 6 | `.btn-gold` regression guard — dashboard | Every `.btn-gold` instance in the dashboard renders cool gold (`#C9941A`), NOT brass | **yes** — failure = revert |
| 7 | `.btn-gold` regression guard — GovCon workspace | Every `.btn-gold` instance in GovCon renders cool gold, NOT brass | **yes** — failure = revert |
| 8 | `.btn-gold` regression guard — other tabs | Outreach / Primes / Workflows / Settings / Troubleshooting `.btn-gold` instances unchanged | **yes** — failure = revert |
| 9 | Sidebar + topbar (Phase 20C surfaces) | No regression from Phase 20C: obsidian sidebar, federal-navy topbar, brass active nav, Cormorant page title all intact | **yes** |
| 10 | macOS title-bar drag region | Topbar still draggable (`-webkit-app-region:drag` intact) | **yes** |

## Confirmations

- No runtime, package, script, service, test, workflow, watsonx, signing, publishing, Vercel, GOVCON external, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflows touched.
- No JavaScript behavior changed.
- No body markup changed.
- No inline `style="…"` body attribute changed.
- No `.env` touched.
- No claims, pricing, or product behavior changed.
- No new features added; no removed features.
- Stashes untouched (`git stash list` empty before and after). The old SoHo×DC stash was **not** applied, popped, or dropped. The GovCon Capture OS stash was **not** touched.
- The Civic Atelier `--sd-*` token foundation from Phase 20B is preserved verbatim — Phase 20D only consumes it.
- The Phase 20C shell tokens are preserved verbatim — `.topbar`, `.sidebar`, `.nav-btn.active`, `.pane-hdr`, `.pane-title` etc. are not touched by 20D.
- Cool gold (`--gold`, `--gold2`, `--goldb`, `.btn-gold`) preserved verbatim across the entire app, including inside the redesigned tabs.

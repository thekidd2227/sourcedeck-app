# Release Note — Phase 20C Civic Atelier Navigation + App Shell Redesign

**Branch:** `feat/phase-20c-civic-shell-redesign`
**Type:** Visible redesign — **scoped to navigation + app shell only**.
**Base:** `main @ 6d4e7d8` (Phase 20B token foundation merged via PR #38 + #39).

## Summary

Phase 20C is the first phase in which the Civic Atelier `--sd-*` token foundation established in Phase 20B is **bound to rendered surfaces**. The binding is deliberately limited to the navigation and app-shell perimeter — topbar, sidebar, nav labels, nav buttons, brand mark, and shell-level page titles — so the visible Civic Atelier direction lands on the parts of the UI that frame every screen without rewriting any feature content.

## What changed (visible)

- **Topbar** now renders as a Civic Atelier command-zone navy (`--sd-federal-navy`, `#172033`) — slightly lighter and warmer than the prior near-black gradient.
- **Sidebar** now renders as obsidian (`--sd-obsidian`, `#0B0B0A`) — a true editorial black command zone, distinct from the topbar.
- **Brand mark plate** (`.logo-mark`) inherits the obsidian ground with a brass-tinted hairline and glow (shell-scoped, no global gold repoint).
- **Nav labels** are bumped off the low-contrast `--dim` onto `--sd-text-secondary` — moves contrast from ~3.6:1 (WCAG fail) to ~5.0:1 (WCAG AA pass) on the obsidian ground.
- **Active nav button** now uses the Civic Atelier brass accent (`--sd-brass-gold` / `--sd-brass-gold-light`) for its left rail, label, border, and inset glow — strictly within the `.nav-btn.active` selector chain.
- **Page titles** (`.pane-title`) in the shell switch from Syne bold to Cormorant Garamond italic, sized up from 17px to 20px to keep optical weight comparable.
- **Pane header** background matches the new topbar civic navy.
- **Shell motion** (transitions on `.tb-kpi` and `.nav-btn`) routes through `--sd-transition-medium` (editorial easing). Motion outside the shell is unchanged.

## What did NOT change

- No global `--gold`, `--gold2`, `--goldb`, or `--purple` repoint. Feature buttons (`.btn-gold`), dashboard KPI accents, status pills, and every other cool-gold surface render exactly as they did on `main @ 6d4e7d8`. The brass accent lives **only inside the shell selectors** listed in the audit.
- No `--bg` / `--text` ground inversion. The body, feature views, modals, forms, dashboards, tables, workflow panels, and all feature surfaces are visually identical to `main @ 6d4e7d8`.
- No body markup edited. No inline `style="…color…"` attribute on any HTML element changed.
- No JavaScript behavior changed.
- No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` file touched.
- No claims, pricing, product behavior, watsonx, signing, publishing, Vercel, GOVCON, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflows changed.
- No new features. No removed features.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001), guaranteed-outcome or unlimited-AI language, or auto-send / auto-submit copy. None were added in 20C.

## Files changed

- `sourcedeck.html` — 8 selector blocks, +24 / −14 lines.
- `docs/audits/phase-20c-civic-shell-redesign-audit.md` (new).
- `docs/release-notes/phase-20c-civic-shell-redesign.md` (this file).

## Tests run

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Results recorded in the PR description.

## Screenshots

**Operator-required before merge.** This environment cannot drive the Electron renderer (no Playwright/Puppeteer; no headless Electron screenshot path; Linux-container with no GUI). The PR is explicitly **not merge-ready** until before/after screenshot pairs are captured on macOS and attached, per the 12-item checklist in `docs/audits/phase-20c-civic-shell-redesign-audit.md` (§ Screenshot QA checklist).

## Stashes

Stashes were not modified. The old SoHo×DC stash was not applied, popped, or dropped. The GovCon Capture OS stash was not touched.

## Next phase

**Phase 20D — Dashboard + GovCon Workspace Redesign** (consumes the same `--sd-*` token foundation; restyles dashboard KPI strip, parchment "today" column, GovCon ledger tables, and the card / panel surface system). 20D should land only after 20C screenshots are approved.

# Release Note — Phase 20D Dashboard + GovCon Workspace Redesign

**Branch:** `feat/phase-20d-dashboard-govcon-workspace-redesign`
**Type:** Visible redesign — **scoped to dashboard and GovCon workspace stylesheet rules only**.
**Base:** `main @ 5065763` (Phase 20C navigation shell merged).

## Summary

Phase 20D continues the SourceDeck Civic Atelier direction, applying brass and ink-navy editorial accents to the dashboard and GovCon workspace. All changes are at the stylesheet level, descendant-scoped under `#tab-dashboard` and `#tab-govcon`. The dark ground is deliberately preserved: the 147 inline `style="…color/background…"` attributes that exist inside these two tabs would clash with a full ivory ground inversion, so 20D applies Civic Atelier accents where they can land safely without fighting inline overrides. Cool-gold `.btn-gold` remains cool gold everywhere — the global `--gold` / `--gold2` / `--goldb` aliases are deliberately untouched.

## What changed (visible)

- **Section labels** (`.sl`) inside the dashboard and GovCon tabs — contrast raised off the near-invisible `--dim` color onto `--sd-text-secondary`; the leading micro-rule is now brass.
- **KPI labels** (`.kpi-label`) inside the dashboard and GovCon tabs — contrast raised off `--muted` onto `--sd-text-secondary`.
- **KPI top rails** (`.kpi.gold-kpi::before`) inside the dashboard and GovCon tabs — cool-gold gradient → Civic Atelier brass gradient (scoped only; no global repoint).
- **KPI numerals** (`.kpi-val`) inside the dashboard and GovCon tabs — each Syne numeral now sits above a 28px × 1px brass hairline (briefing-room flavor).
- **GovCon opportunity briefs** (`.opp-brief`) — left accent rail is brass; agency label and dollar value are brass-light; confidence-fill bar is a brass-to-brass-light gradient; certification chips are brass-tinted.
- **GovCon workspace banners** (`.workspace-readiness`, `.gc-setup-banner`) — backgrounds and borders retinted to civic-brass + federal-navy. No copy change.

## What did NOT change

- **No ground inversion.** Dashboard and GovCon panes remain on the dark `--bg`. The full ivory civic ground stays deferred (to whenever the operator wants to take on the 147-attribute inline-style migration alongside it).
- **No global `--gold` / `--gold2` / `--goldb` / `--purple` repoint.** Every `.btn-gold` instance — inside the redesigned tabs and on every other screen — renders identically to `main @ 5065763`.
- **No `--bg` / `--text` global recoloring.** Body, feature views, modals, forms, dashboards, tables, workflow panels visually unchanged in their structural surfaces.
- **No body markup edited.** No `<div>`, `<button>`, `<span>`, `<form>`, `<table>`, `<a>` was added, removed, reordered, or relabeled in either tab.
- **No inline `style="…"` attribute changed.** The 147 inline overrides remain intact.
- **No JavaScript edited.** Behavior identical to `main @ 5065763`.
- **No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` file touched.**
- **No claims, pricing, watsonx, signing, publishing, Vercel, GOVCON external workflow, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflow changes.**
- **No new features. No removed features. No relabeled controls.**
- **No KPI value displayed today is hidden or relabeled** — visual-only phase. All KPI strings, dollar amounts, percentages, and date displays render exactly as on `main @ 5065763`.
- **No new `.sd-pill.*` classes** added — that taxonomy lives in `sourcedeck-site`, not in this Electron renderer.

## Cool-gold preservation (operator-required regression guard)

The Phase 20C / 20D operator regression guard — `.btn-gold` must remain cool gold everywhere — is preserved verbatim. The Phase 20D block contains no `.btn-gold` selector and does not repoint `--gold`, `--gold2`, `--goldb`, or `--goldl`. Cool gold renders identically inside the dashboard, inside the GovCon workspace, and across all other tabs.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed / notarized claim, any compliance claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001), guaranteed-outcome or unlimited-AI language, or auto-send / auto-submit copy. None were added in 20D.

## Stashes

Stashes were not modified. The old SoHo×DC stash was not applied, popped, or dropped. The GovCon Capture OS stash was not touched.

## Files changed

- `sourcedeck.html` — +44 / −0 (a single additive scoped CSS block before `</style>`).
- `docs/audits/phase-20d-dashboard-govcon-redesign-audit.md` (new).
- `docs/release-notes/phase-20d-dashboard-govcon-redesign.md` (this file).

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

**Operator-required before merge.** This environment cannot drive the Electron renderer (no Playwright/Puppeteer, no headless Electron, no GUI). The PR is opened as a **draft** to enforce the screenshot gate. The 10-row required-frame checklist + cool-gold regression guards are in `docs/audits/phase-20d-dashboard-govcon-redesign-audit.md` § Screenshot QA.

## Next phase

**Phase 20E — Onboarding / Profile / AI Readiness Polish** (restyles the setup wizard, operating-profile view, AI provider readiness view, and `watsonx-readiness` status surfaces). 20E lands only after 20D screenshots are approved and any cool-gold regression on rows 6/7/8 is confirmed absent.

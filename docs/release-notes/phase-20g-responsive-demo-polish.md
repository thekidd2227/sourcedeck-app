# Release Note — Phase 20G Responsive QA + Demo Polish

## Summary

Phase 20G adds the final responsive QA and demo-readiness documentation for the SourceDeck Civic Atelier visual system.

This is a docs-only phase. The existing responsive CSS already covers the desktop, tablet, mobile, sidebar, dashboard, GovCon workspace, troubleshooting/release evidence, onboarding/settings, and `.btn-gold` regression surfaces, so no renderer changes were made.

## What's new

- Adds a Phase 20G audit documenting the responsive inspection and scope boundaries.
- Adds a screenshot QA checklist for desktop, tablet, mobile, sidebar states, dashboard, GovCon workspace, troubleshooting/release evidence, onboarding/settings, and `.btn-gold`.
- Adds this release note for demo-readiness tracking.

## What did not change

- No `sourcedeck.html` edits.
- No SAM Opportunity Sprint card or GovCon Pursuit Profile edits.
- No SAM entitlement logic, SAM Sprint CLI, SAM Sprint test, or SAM Sprint docs edits.
- No service, script, test, package, pricing, payment, email, provider, watsonx, signing, release evidence, Vercel, or product-logic changes.
- No claims added.
- No generated reports committed.
- No `.env` files touched.

## Demo readiness

The screenshot checklist should be completed before moving the PR out of draft. Required review areas:

- Desktop shell at wide viewport.
- Tablet layout at `1024px` and `900px`.
- Mobile layout at `768px`, `480px`, and narrow phone widths.
- Horizontal sidebar scroller and active nav state.
- Dashboard KPI/card/table composition.
- GovCon workspace, excluding SAM Sprint/Profile copy changes.
- Troubleshooting/release evidence readiness banner.
- Onboarding/settings readiness and setup surfaces.
- `.btn-gold` cool-gold regression check.

## Tests

Run before PR handoff:

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

## Screenshot QA blocker fix (2026-06-04)

The 14-frame screenshot QA initially failed on three frames:
`02-desktop-1440x900-dashboard.png` (cool-gold criterion), `07-tablet-900x768-sidebar-boundary.png` (boundary expected pre-collapse), and `14-btn-gold-regression.png` (`.btn-gold` rendered blue-toned with `--gold` resolving to `#1A6FA8`). A minimal scoped CSS patch in `sourcedeck.html` addresses both blockers:

- Defensive `.btn-gold` cool-gold lock — a scoped guard rule appended to the end of the first `<style>` block declares `.btn-gold`, `.btn-gold:hover`, and `.btn-gold:focus-visible` with hardcoded gradient values (`linear-gradient(135deg, #f3d684, #d4a843)`, hover `linear-gradient(135deg, #f5dc94, #dcb255)`, border `rgba(243, 214, 132, 0.52)`, text `#080b10`). The underlying `--gold` / `--gold2` / `--goldb` tokens and the `--blue` / `--signal*` palette are intentionally not repointed.
- 900 / 899 px sidebar boundary clarified — both sidebar-collapse media queries widened from `@media(max-width:900px)` to `@media(max-width:899px)` so that 900 px keeps the vertical desktop sidebar (boundary) and 899 px and below cleanly enter the horizontal-scroller bucket. The unrelated `.ppf-kpi-grid` 900 px column-count tweak is intentionally not modified.

Rerun harness: deterministic Playwright (chromium 1217) against a local static server serving `sourcedeck.html`, with per-frame computed-style assertions for `.btn-gold` `background-image` and `.sidebar` `flex-direction`. Result: **14 / 14 PASS**. Screenshots stored locally under `.qa/phase-20g-screenshots-rerun/` and are **not committed**. No secrets captured. SAM Sprint card and GovCon Pursuit Profile copy were not touched. No live SAM execution. No outreach. No generated reports committed.

## Merge note

This PR is now ready: 14-frame screenshot QA rerun is 14 / 14 PASS, all validation gates green, no SAM Sprint files changed, no generated reports or screenshots committed, no stashes touched.

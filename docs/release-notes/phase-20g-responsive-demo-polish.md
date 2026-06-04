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

## Merge note

Keep the PR draft until screenshot QA is captured and attached. Do not merge over active SAM Sprint/Profile UX work without confirming there is no `sourcedeck.html` collision.

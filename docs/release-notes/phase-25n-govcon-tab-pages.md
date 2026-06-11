# Phase 25N — GovCon Tab Pages · Release Note

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## What ships

1. **GovCon is no longer one long scroll.** A new `<nav id="gc-tab-nav" role="tablist">` hosts real tab buttons. Clicking a tab shows only that tab's panel; other panels stay hidden via `display:none`. Tab state is persisted to `localStorage` so a return visit restores the last open tab.
2. **Find Opportunities is the default landing.** No more cluttered Overview. The Find Opportunities tab carries:
   - SAM.gov key presence-only status pill (no raw key input)
   - Key-missing banner when no key is configured
   - 🔎 Search SAM.gov · 📎 Upload Solicitation · 📋 Paste Solicitation Text · ⚙ Open GovCon Setup actions
   - Empty-state copy: *"Search SAM.gov, upload a solicitation, or paste solicitation text to begin."*
   - Saved-pursuits preview rendered from `sd.govcon.opportunities.list()` when records exist
3. **Tabs map to focused panels.** Solicitation, Vendors + Pricing, Past Performance, Submission Readiness, and Audit Log surface the existing GovCon `<section>` blocks via `data-gc-tab-page` routing. Saved Pursuits, Scope, FAR Reference, and Audit Log get fresh shell content.
4. **Overview-style sections retired from active runtime.** GovCon Mode banner, Demo Controls, Capture Command Center, Operating Rhythm, Pursuit Profile copy, SAM Sprint card, and the legacy KPI strip + opportunity table are routed to `data-gc-tab-page="hidden-internal"` with inline `display:none`. Their original DOM ids are preserved so existing tests and any programmatic `getElementById` callers still resolve (Phase 23C reachability invariant).
5. **Internal demo/product-explanation copy is off the default screen.** "GovCon Mode — Capture OS workflow", "this demo focuses", "Other business tools remain available", "Sample demo data loaded", and the stale `2026-06-04` timestamps no longer appear when the user opens GovCon. The strings still exist in the hidden sections so prior test assertions on those IDs continue to pass.
6. **Tab navigation is professional.** Compact horizontal tab row with proper spacing, active-tab highlight (gold border + tinted background), aria-selected wiring, and uppercase mono labels for editorial polish.

## What does NOT ship in 25N

- Live SAM.gov search wiring inside the Find Opportunities tab (the button is wired to `sd.govcon.samSearch({})`; richer filter/result UI ships when Phase 25M lands).
- FAR Reference content beyond the advisory reference list (full content lands with the Phase 25I-recovery PR).
- Audit Log live entry rendering (stub describes the contract; richer rendering follows).
- Dashboard restructuring beyond what shipped in Phase 25L-1.

## Safety

- No `.env` touched · No secrets printed · No stashes touched
- No deploy · No public release · No GitHub release
- No live SAM auto-run · No email send · No vendor/agency auto-contact
- No bid/quote/proposal submission · No portal upload
- No Google/Microsoft/iCloud password or OAuth requirement
- No pricing source change · No checkout/payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send / no-submit / no-upload boundary preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25n-govcon-tab-pages.test.js`
- `test/phase-25n-govcon-overview-removed.test.js`
- `test/phase-25n-govcon-copy-cleanup.test.js`
- Updated `test/phase-25f-govcon-sections.test.js` (Phase 25N supersession).

**Full gate results:**

- `npm test` → 62 PASS suites, 0 FAIL.
- `npm run govcon:smoke` → 47 passes, 0 failures, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings.
- `node scripts/release-check.js` → privacy gate passes.

## Operator next step

**Merge when green, rebuild app package, refresh Day 0 package, then manually verify GovCon no longer renders as one long cluttered page.**

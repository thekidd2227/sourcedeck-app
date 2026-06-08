# Phase 24D — Past Performance Library + Capability Statement Studio UI

## Summary

Phase 24D brings the two buyer-visible GovCon workflow surfaces —
**Past Performance Library** and **Capability Statement Studio** — up to
product spec and wires the Capability Statement Studio to the existing
**offline, local** capability-statement extractor that already shipped in
the backend/IPC scaffolding (Phase 24B). This is a UI assembly + test
phase, not a backend rewrite. No pricing, outreach, SAM-live, or
submission/send boundaries were changed.

The surfaces themselves first shipped in Phase 22E. Phase 24D:

- Adds the GovCon workflow value framing to the Past Performance Library
  (organize relevant past performance and match it to a target
  opportunity to strengthen bid/no-bid decisions and proposal packages).
- Adds a **Relevance** column to the Past Performance Records table so the
  operator-supplied relevance tags are visible in the table, not just the
  intake form.
- Extends the empty state with the value framing copy:
  *"Add past performance records to strengthen bid/no-bid decisions and
  proposal packages."*
- Adds a **Company / contact summary** field to the Capability Statement
  Studio and relabels the core field to **Core competencies / capabilities**
  and the past-performance selector to **Past performance highlights**, so
  all spec fields are present and clearly named.
- Adds a precise internal-review disclaimer to the Capability Statement
  Studio: *"Internal review draft. SourceDeck does not send, submit,
  upload, or certify this content."*
- Adds a **local, offline capability import** affordance: the operator can
  paste existing capability-statement text and have it parsed **on-device**
  into candidate fields for review. This surfaces the existing extractor
  without any upload or network call.

## What was added

| Area | Change |
| --- | --- |
| Past Performance Library | Workflow value description; visible **Relevance** column; value-framing empty state |
| Capability Statement Studio | Spec description; **Company / contact summary** field; renamed core/PP-highlights labels; precise internal-review disclaimer |
| Capability Statement Studio | Local/offline **Import from pasted capability text** affordance wired to `extractCapabilityStatement` (candidate fields only, human review required) |
| Tests | `test/govcon-past-performance-capability-ui.test.js` (15 checks), wired into `npm test` |

## Existing services / IPC surfaced

The UI surfaces capabilities that already existed in the backend — no new
backend was written:

- `services/govcon/past-performance.js` — `createPastPerformanceService`
  (`list` / `save` / `remove` / `match`, plus `relevanceScore`).
  Exposed via `preload.js` as
  `window.sd.govcon.pastPerformance.{list,save,remove,match}` and
  `main.js` IPC handlers `govcon:past-performance-*`.
- `services/govcon/capability-statement-extractor.js` —
  `extractCapabilityStatement` (deterministic, offline, no network, no
  upload; returns **candidate** fields requiring human approval).
  Exposed via `preload.js` as
  `window.sd.govcon.operatingProfile.extractCapabilityStatement(input)`
  and `main.js` IPC handler `govcon:capability-statement-extract`.

The new on-device import affordance calls
`window.sd.govcon.operatingProfile.extractCapabilityStatement({ text })`,
maps the returned `candidates` into the Studio fields, and **gracefully
degrades** (manual entry unaffected) when the desktop IPC bridge is
unavailable (e.g. web build / test environment).

### Known scope note — match-to-opportunity

The live renderer surfaces store Past Performance records in browser
`localStorage` (`sd.govcon.pastPerformance.v1`) for an offline,
buyer-demo-safe experience, while the `pastPerformance.match` IPC operates
on the desktop electron-store (`govcon.pastPerformance`). These are
separate stores by design. To avoid coupling the offline renderer to a
half-wired cross-store match, the **match action was not force-wired** in
this phase; relevance is surfaced via the operator-supplied relevance tags
column and the relevance scorer remains available to the desktop backend.
This is documented rather than papered over.

## How this improves the buyer story

- The Past Performance Library now reads as a capture asset that strengthens
  bid/no-bid decisions and proposal packages, with relevance visible at a
  glance.
- The Capability Statement Studio lets an operator draft and review
  capability content **for internal use** and optionally bootstrap it by
  pasting existing text that is parsed **locally** — a real time-saver that
  never leaves the device.
- Every surface keeps an explicit human-in-the-loop, no-send posture.

## No-send / no-submit / no-upload boundary

- No Send Email, Submit Bid, Submit Quote, Export-and-submit, or
  portal-upload controls were added.
- The capability import is **local/offline only** — the handler contains no
  `fetch` / `XMLHttpRequest` / `.post()` / `.upload()` calls and makes no
  network request.
- All state is local (browser `localStorage`); nothing is sent, submitted,
  uploaded, or certified.
- No live SAM call, no outreach send, no bid/quote/proposal submission.

## Local-only / internal-review posture

- Capability Statement Studio output is explicitly an **internal review
  draft**; the exact disclaimer is rendered both in the section header and
  in the generated outline footer.
- Imported fields are **candidate fields only** and require human review and
  edit before use.

## Pricing source of truth unchanged

`docs/product/pricing-source-of-truth.md` remains the canonical pricing
source and was not modified. No deprecated active pricing
($79 / $349 / $999) appears in the active app UI.

## Tests / gates run

- `test/govcon-past-performance-capability-ui.test.js` — **15/15 PASS**
- `test/govcon-past-performance-prime.test.js` — 24/24 (unchanged surface invariants)
- `test/govcon-core-hardening.test.js`, `test/govcon-opportunity-outreach.test.js`,
  `test/remove-system-readiness-tab.test.js`, `test/renderer-boot.test.js`,
  and the full GovCon / Response Desk / SAM Sprint guard suite — PASS
- `npm test` — **green (exit 0)**
- `npm run release:evidence`, `npm run troubleshooting:scan` (no fail/warn),
  `npm run govcon:smoke` (PASS), `npm run phase13:rc-check` (PASS),
  `npm run i18n:audit` (31/31), `node scripts/release-check.js` (PASS;
  macOS signing-not-configured is a benign local-dev warning)

## Preserved invariants

- Phase 24B audit log panel (`#gc-audit-log`) preserved.
- Phase 24C profile-driven SAM NAICS loader (`#gc-naics-filter`) preserved.
- System Readiness / System Flow remains removed.
- Response Desk no-send boundary, Show All Tools toggle, local-only Markdown
  export, Phase 22B Operating Rhythm all preserved.

## Remaining next phase

- **Phase 24E — Stakeholder Graph UI Surface.**

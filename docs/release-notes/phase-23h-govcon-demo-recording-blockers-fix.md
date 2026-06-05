# Phase 23H — GovCon Demo Recording Blockers Fix

**Release date:** 2026-06-05
**Branch:** `fix/phase-23h-govcon-demo-recording-blockers`

## What's new

Phase 23H resolves the three blocking demo defects reported in
**Phase 23G** so the GovCon Capture OS demo can be re-recorded
cleanly. No new product features. No publish-path changes. No
media committed.

### Defect A — Phase 23D Last Updated watched wrong storage keys

Phase 23D's `SECTION_DEFS` watcher referred to short alias keys
(`sd.govcon.vqr.v1`, `sd.govcon.pricing.v1`, `sd.govcon.pp.v1`,
`sd.govcon.cs.v1`, `sd.govcon.ppf.v1`, `sd.govcon.subGate.v1`)
that never existed. The Phase 22D / 22E / 22F modules and the
Phase 23A demo loader all persist to the long-form names
(`sd.govcon.vendorQuotes.v1`, `sd.govcon.pricingWorksheet.v1`,
`sd.govcon.pastPerformance.v1`, `sd.govcon.capabilityStatement.v1`,
`sd.govcon.primePartners.v1`, `sd.govcon.submissionReadiness.v1`).
Three of the five Phase 23D chips therefore stayed at
"Last updated: Not yet" after Load Sample.

**Fixed by** swapping every alias for the actual long-form key in
both `SECTION_DEFS` and the six `readArr` / `readObj` calls inside
`gcExportInternalReviewMarkdown`.

### Defect B — Phase 23A sample loader did not seed every Phase 22 store

`gcDemoLoadSample` populated seven Phase 22 storage keys but
skipped the Pricing Worksheet store (`PR_KEY =
'sd.govcon.pricingWorksheet.v1'`). The Pricing Worksheet stayed
empty after Load Sample, which combined with Defect A meant the
`vendor-pricing` chip could never demonstrate the "stamps on edit"
behavior.

**Fixed by** adding `buildSamplePricingWorksheet()` whose
`assumptions` field visibly reads *"SAMPLE / Demo only — Replace
before proposal use. Numbers above are illustrative and do not
reflect any real bid, quote, or government response. SourceDeck
does not submit, upload, email, or transmit pricing."* The function
returns round, recognizable values (10k labor, 2.5k materials,
1.5k vendor, 500 travel, 500 equipment, 15% overhead, 10% profit,
5% contingency). `gcDemoLoadSample` now writes it; `gcDemoClearSample`
now purges it.

### Defect C — Markdown export SAMPLE DEMO DATA warning never fired

Phase 23D's `isDemoModeActive()` read the wrong `DEMO_MODE_KEY`
(`sd.govcon.demoMode.active.v1` instead of the real
`sd.govcon.demoMode.v1`), treated the value as a raw string
(`'true'`/`'1'`) instead of JSON-parsing it, probed a non-existent
DOM id (`gc-demo-mode-indicator`), and looked for row tags
(`row.demo`, `row.source`, `row.tag`) that the Phase 23A sample
rows do not carry. The SAMPLE DEMO DATA banner never fired even
with Demo Mode explicitly active.

**Fixed by** aligning `DEMO_MODE_KEY` to the real
`sd.govcon.demoMode.v1`, JSON-parsing the value and checking
`parsed.active === true`, dropping the dead DOM probe, and adding
content heuristics that match the actual Phase 23A sample markers
(`id: 'op_sample_demo_001'`, `title` containing `SAMPLE`,
`solicitationNumber` matching `SAMPLE-SOL-DEMO`, `notes` matching
`SAMPLE / DEMO ONLY`).

## Runtime dry-run result

Re-running the Phase 23G headless harness against the patched
renderer produced **17/17 shots OK, 0 shot defects, 0 boot errors**
(was 14/17 OK, 3 defects). The captured Markdown export payload
now contains every required safety line including the previously
missing **SAMPLE DEMO DATA — Replace before proposal use.** banner.
All five Phase 23D chips stamp after Load Sample. Harness output
stays inside `.qa/phase-23g-local-demo-recording/` and is NOT
committed.

## What did not change

- No new product features. Phase 23H scope is exactly Defects A + B + C.
- No `--publish`, no IPC channel, no `fetch`, no network call.
- Markdown export remains a local browser Blob download.
- Phase 22B-22F GovCon workflow surfaces — intact.
- Phase 23B GovCon Mode indicator, 23C primary nav + Show All Tools
  toggle, 23E signed-demo-build workflow, 23F demo script + shot
  list + recording checklist, 23G review doc — all intact.
- Phase 21F System Readiness / System Flow tab removal — preserved.
- Response Desk draft-only posture, SAM Sprint Free=1 NAICS — both
  preserved.

## Safety boundaries (unchanged)

- **No Send Email / Submit Bid / Submit Quote button** anywhere in
  the renderer or the Markdown payload.
- **No portal upload.** No SAM / PIEE / eBuy / GSA interaction.
- **No email transmission.**
- **No signed/notarized completion claim added** — the Phase 23E
  verification chain remains the only path to assert that wording.
- **No guaranteed awards / revenue claim.**
- **No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001
  certification claim.**
- **No videos or screenshots committed.** Local PNG dry-run
  evidence stays in `.qa/phase-23g-local-demo-recording/`.
- Sample submission state preserves
  `final_human_approval_recorded: 'Not started'` and does NOT set
  `status: 'Ready for Human Review'`.

## Migration notes

- No data migrations. No schema changes. No new IPC channels.
- Returning users with persisted localStorage state: chips will
  still read "Not yet" on the first boot after upgrade until a
  real edit fires the poll. This matches the original Phase 23D
  cold-open semantics.
- Operators who had clicked Load Sample before Phase 23H landed:
  click Clear Sample then Load Sample again to populate the
  Pricing Worksheet and refresh the chips.

## What's next — Phase 23I

- **23I-A** Operator-driven manual video capture using the Phase 23F
  recording checklist on a desktop with screen-recording capability.
- **23I-B** Optional committed Playwright recording harness (still
  blocked on the Playwright-as-release-dep question carried from
  Phase 23F-A).
- **23I-C** Branded closing-card SVG + caption track.

## Verification

- `node test/govcon-demo-recording-blockers.test.js` — **32/32 PASS**
- `node test/govcon-demo-delivery-polish.test.js` — 26/26 PASS
- `node test/govcon-primary-navigation.test.js` — 23/23 PASS
- `node test/govcon-mode-navigation.test.js` — 17/17 PASS
- `node test/govcon-demo-polish.test.js` — 27/27 PASS
- `node test/govcon-submission-readiness.test.js` — 30/30 PASS
- `node test/govcon-past-performance-prime.test.js` — 24/24 PASS
- `node test/govcon-vendor-pricing.test.js` — 25/25 PASS
- `node test/govcon-solicitation-workspace.test.js` — 19/19 PASS
- `node test/govcon-capture-command-center.test.js` — 15/15 PASS
- `node test/remove-system-readiness-tab.test.js` — 9/9 PASS
- `node test/renderer-boot.test.js` — 7/7 PASS
- `npm test` — all 53 test files PASS
- `npm run troubleshooting:scan` — PASS
- `npm run govcon:smoke` — PASS (failures: 0)
- `npm run phase13:rc-check` — PASS (failures: 0)
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — PASS *(local-dev signing warn only)*
- Phase 23G headless dry-run — **17/17 shots OK** (was 14/17)

See `docs/audits/phase-23h-govcon-demo-recording-blockers-fix-audit.md`
for the full audit, including the precise line numbers of every
edit and the test-assertion mapping per defect.

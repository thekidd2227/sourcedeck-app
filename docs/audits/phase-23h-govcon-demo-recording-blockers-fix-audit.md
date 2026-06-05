# Phase 23H — GovCon Demo Recording Blockers Fix (Audit)

**Date:** 2026-06-05
**Branch:** `fix/phase-23h-govcon-demo-recording-blockers`
**Renderer:** `sourcedeck.html`

## 1. Why this phase exists

Phase 23G's local demo-recording dry run found three blocking
demo-experience defects. Phase 23H fixes exactly those three so the
GovCon demo can be re-recorded cleanly. No new product features.
No publish path changes. No media committed.

## 2. The three Phase 23G defects, each with its root cause and fix

### Defect A — Phase 23D Last Updated watched wrong storage keys

**Root cause.** When Phase 23D shipped, the `SECTION_DEFS` watcher used
short alias keys (`sd.govcon.vqr.v1`, `sd.govcon.pricing.v1`,
`sd.govcon.pp.v1`, `sd.govcon.cs.v1`, `sd.govcon.ppf.v1`,
`sd.govcon.subGate.v1`, `sd.govcon.subGatePkg.v1`) that **never
existed** in the renderer. The actual Phase 22/23A storage keys are
the long-form names — `sd.govcon.vendorQuotes.v1`,
`sd.govcon.pricingWorksheet.v1`, `sd.govcon.pastPerformance.v1`,
`sd.govcon.capabilityStatement.v1`, `sd.govcon.primePartners.v1`,
`sd.govcon.submissionReadiness.v1`. The Phase 22F modules (`VQR_KEY`
at `sourcedeck.html:12359`, `PR_KEY` at `12360`, `PP_KEY` /
`CS_KEY` / `PPF_KEY` at `12615-12617`, `SUB_KEY` at `12865`) all
persist to the long-form keys, as does the Phase 23A demo loader at
`13231-13238`.

**Impact (Phase 23G observed):** 3 of 5 Phase 23D chips stayed at
"Last updated: Not yet" after Load Sample. Only `capture-cc` and
`sol-workspace` stamped because those two happened to share their
key name between Phase 23D and Phase 23A (`sd.govcon.captureBoard.v1`
and `sd.govcon.solWorkspace.v1`).

**Fix.** Replaced every aliased name with the actual Phase 22/23A
key, both in `SECTION_DEFS` and in every `readArr` / `readObj` call
inside `gcExportInternalReviewMarkdown`. Edits:

- `sourcedeck.html:13488-13496` — `SECTION_DEFS` updated.
  `vendor-pricing` now watches `vendorQuotes.v1` + `pricingWorksheet.v1`.
  `past-perf` now watches `pastPerformance.v1` +
  `capabilityStatement.v1` + `primePartners.v1`. `sub-gate` now
  watches `submissionReadiness.v1`.
- `sourcedeck.html:13694-13718` — six `readObj`/`readArr` calls in
  the Markdown export builder swapped to the actual keys (vendor,
  pricing, pp, cs, ppf, checklist).

### Defect B — Phase 23A sample loader did not seed every Phase 22 store

**Root cause.** `gcDemoLoadSample` wrote to seven storage keys
(CAPTURE / SOL / VQR / PP / PPF / CS / SUB) but did NOT write to
the Phase 22D Pricing Worksheet store (`PR_KEY =
'sd.govcon.pricingWorksheet.v1'`). The Pricing Worksheet therefore
stayed empty after Load Sample, which (combined with Defect A) meant
the `vendor-pricing` chip never stamped on a Pricing-Worksheet edit.

**Impact (Phase 23G observed):** Pricing Worksheet section reads as
empty during the demo; vendor-pricing Last Updated chip cannot
demonstrate "stamps on edit" behavior.

**Fix.** Added `buildSamplePricingWorksheet()` returning an
illustrative pricing payload whose `assumptions` field visibly reads
`SAMPLE / Demo only — Replace before proposal use. Numbers above
are illustrative and do not reflect any real bid, quote, or
government response. SourceDeck does not submit, upload, email, or
transmit pricing.` Wired it into `gcDemoLoadSample` (write path) and
`gcDemoClearSample` (purge path) so the Pricing Worksheet round-trips
cleanly with the rest of the demo data. Numbers are round and
recognizable (10k labor, 2.5k materials, 1.5k vendor, 500 travel,
500 equipment, 15% overhead, 10% profit, 5% contingency) — they
make no claim to be a real bid model. No margin or profit-rate
claim is asserted. Edits: `sourcedeck.html:13239-13245`
(`PR_KEY` declaration), `13395-13415`
(`buildSamplePricingWorksheet` + `gcDemoLoadSample` PR_KEY write),
`13422` (`gcDemoClearSample` purge list).

### Defect C — Markdown export SAMPLE DEMO DATA warning never fired

**Root cause.** Phase 23D's `isDemoModeActive()` at the time of
Phase 23G:

1. Read `DEMO_MODE_KEY = 'sd.govcon.demoMode.active.v1'`, which the
   Phase 23A loader never writes to (the actual flag key is
   `sd.govcon.demoMode.v1`).
2. Treated the raw string as `'true'` / `'1'`, but the Phase 23A
   loader stores a JSON object (`{active: true, loadedAt:
   'local-only'}`).
3. Probed for an element id `gc-demo-mode-indicator`, which does
   not exist in the renderer (the Phase 23B indicator id is
   `gc-mode-indicator`).
4. Fell back to a row-content heuristic checking `row.demo === true
   || row.source === 'phase-23a-demo' || /demo|sample/.test(row.tag)`,
   none of which the Phase 23A sample rows carry — the sample rows
   instead use a fixed `id: 'op_sample_demo_001'` and `title:
   'SAMPLE — Demo Only Opportunity...'` plus a
   `solicitationNumber: 'SAMPLE-SOL-DEMO-0001'`.

The combined effect: the SAMPLE DEMO DATA banner never fired in the
Markdown export, even when the operator had explicitly clicked Load
Sample.

**Impact (Phase 23G observed):** Markdown payload missing the
`SAMPLE DEMO DATA — Replace before proposal use.` block — fails the
Phase 23F shot-list proof requirement for Shot 15.

**Fix.** Phase 23D's `isDemoModeActive()` and `DEMO_MODE_KEY` now
align with the actual Phase 23A FLAG_KEY:

1. `DEMO_MODE_KEY = 'sd.govcon.demoMode.v1'` (the real Phase 23A
   key).
2. JSON-parse the value and check `parsed.active === true`. Keep
   back-compat with the literal `'true'`/`'1'` string form.
3. Augmented row-content heuristics to detect any of: legacy
   `row.demo === true` / `source === 'phase-23a-demo'` / `tag` with
   `demo|sample`, OR the Phase 23A markers
   `id === 'op_sample_demo_001'`, `title` containing `SAMPLE`,
   `solicitationNumber` matching `SAMPLE-SOL-DEMO`, or `notes`
   matching `SAMPLE / DEMO ONLY`.
4. Dropped the dead `gc-demo-mode-indicator` probe (the real
   Phase 23B indicator id is `gc-mode-indicator` and is unrelated
   to the SAMPLE DEMO DATA banner gate).

Edit: `sourcedeck.html:13600-13635`.

## 3. Tests added

`test/govcon-demo-recording-blockers.test.js` (NEW; 32 assertions,
all green). The test:

- Confirms the Phase 23G review doc still names Defects A / B / C.
- Asserts the Phase 23A loader sets the FLAG_KEY object correctly
  and writes every Phase 22 storage key (incl. the new `PR_KEY`).
- Asserts every sample payload carries SAMPLE / Demo only / Replace
  before proposal use language.
- Asserts no `submitted:true`, `awarded:true`, `completed:true`,
  `status: 'Ready for Human Review'`, or `readinessStatus: 'Ready
  for Human Review'` anywhere in the sample payloads.
- Asserts the sample submission checklist's
  `final_human_approval_recorded` remains `'Not started'`.
- Asserts there are exactly 5 Last Updated chips, all defaulting
  to `Last updated: Not yet`.
- Asserts the Phase 23D `SECTION_DEFS` uses the actual long-form
  Phase 22/23A keys and that every stale alias
  (`vqr`/`pricing`/`pp`/`cs`/`ppf`/`subGate` / `subGatePkg`) is gone.
- Asserts `DEMO_MODE_KEY` is the real Phase 23A FLAG_KEY and the
  stale `sd.govcon.demoMode.active.v1` alias is gone.
- Asserts `isDemoModeActive()` JSON-parses the FLAG_KEY value and
  falls back to the new content heuristics.
- Asserts the Markdown export still carries the `INTERNAL REVIEW
  DRAFT — NOT SUBMITTED` header + footer and the
  no-submit/no-upload/no-email/no-transmit clause.
- Asserts no Send Email / Submit Bid / Submit Quote button and no
  System Readiness / System Flow tab regression.
- Asserts no positive signed/notarized completion claim added.
- Re-runs the Phase 23D demo-delivery-polish test (26/26 PASS) and
  the Phase 23A demo-polish test (27/27 PASS) inline as
  regression guards.

`package.json` was updated to chain the new test into the
top-level `npm test` script.

## 4. Runtime dry-run result

Re-running the Phase 23G headless harness against the patched
renderer produced **17/17 shots OK, 0 shot defects, 0 boot errors**
(was 14/17 OK, 3 defects, 0 boot errors before Phase 23H). The
captured Markdown export payload (`.qa/phase-23g-local-demo-recording/clips/13-internal-review-markdown-export.payload.md`)
now contains:

- `# INTERNAL REVIEW DRAFT — NOT SUBMITTED` (line 1).
- The no-submit / no-upload / no-email / no-transmit blockquote.
- The `**SAMPLE DEMO DATA — Replace before proposal use.**`
  warning (was missing in Phase 23G).
- `No portal upload. No SAM / PIEE / eBuy / GSA interaction. No
  email transmission.` (twice — blockquote and safety footer).
- `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED` (final line).

All five Phase 23D Last Updated chips stamp after Load Sample
(was 2 of 5 before Phase 23H). The harness output and screenshots
remain inside `.qa/phase-23g-local-demo-recording/` and are NOT
committed.

## 5. What remains for Phase 23I

- **23I-A** Operator-driven manual video capture using the Phase 23F
  recording checklist on a desktop with screen-recording capability.
  All 17 shots now record cleanly. Clips land in
  `.qa/phase-23j-…/` or `/tmp/` only; never committed.
- **23I-B** Optional committed Playwright recording harness (still
  blocked on the Playwright-as-release-dep question carried from
  Phase 23F-A).
- **23I-C** Branded closing-card SVG + caption track (carried from
  Phase 23F-B / 23F-C).

Phase 23H does not address any of these — its scope was exactly
Defects A + B + C.

## 6. Files touched

- `sourcedeck.html` — Phase 23D `SECTION_DEFS` keys (Defect A),
  `DEMO_MODE_KEY` constant (Defect C), `isDemoModeActive`
  parsing + heuristics (Defect C), six Markdown export
  `readArr`/`readObj` calls (Defect A), Phase 23A `PR_KEY`
  declaration + `buildSamplePricingWorksheet` + load/clear wiring
  (Defect B). No other surface changed.
- `test/govcon-demo-recording-blockers.test.js` — NEW (32
  assertions).
- `package.json` — appended new test file to the test chain.
- `docs/audits/phase-23h-govcon-demo-recording-blockers-fix-audit.md`
  — NEW (this file).
- `docs/release-notes/phase-23h-govcon-demo-recording-blockers-fix.md`
  — NEW.

## 7. Confirmation: no media committed

- `.qa/phase-23g-local-demo-recording/` remains the only recording
  output directory; it is excluded via `.git/info/exclude` and
  contains the rerun PNG screenshots + Markdown payload — none of
  which appear in `git status`.
- `git status --porcelain | grep -E '\.(mov|mp4|m4v|webm|gif|png|jpg|jpeg)$'`
  returns empty.

## 8. Confirmation: no submit / send / upload behavior added

- No new `--publish`, no IPC channel, no `fetch`, no network call.
- Markdown export remains a local browser Blob download.
- No Send Email, Submit Bid, or Submit Quote button.
- The sample pricing-worksheet payload's `assumptions` field
  explicitly states *"SourceDeck does not submit, upload, email,
  or transmit pricing."*
- Sample submission state preserves
  `final_human_approval_recorded: 'Not started'` and does not set
  `status: 'Ready for Human Review'`.

## 9. Test + gate status

| Gate | Result |
| --- | --- |
| `node test/govcon-demo-recording-blockers.test.js` | **32/32 PASS** |
| `node test/govcon-demo-delivery-polish.test.js` | 26/26 PASS |
| `node test/govcon-primary-navigation.test.js` | 23/23 PASS |
| `node test/govcon-mode-navigation.test.js` | 17/17 PASS |
| `node test/govcon-demo-polish.test.js` | 27/27 PASS |
| `node test/govcon-submission-readiness.test.js` | 30/30 PASS |
| `node test/govcon-past-performance-prime.test.js` | 24/24 PASS |
| `node test/govcon-vendor-pricing.test.js` | 25/25 PASS |
| `node test/govcon-solicitation-workspace.test.js` | 19/19 PASS |
| `node test/govcon-capture-command-center.test.js` | 15/15 PASS |
| `node test/remove-system-readiness-tab.test.js` | 9/9 PASS |
| `node test/renderer-boot.test.js` | 7/7 PASS |
| `npm test` (all 53 test files) | PASS |
| `npm run troubleshooting:scan` | PASS |
| `npm run govcon:smoke` | PASS (failures: 0) |
| `npm run phase13:rc-check` | PASS (failures: 0) |
| `npm run i18n:audit` | 31/31 PASS |
| `node scripts/release-check.js` | PASS *(local-dev signing warn only, expected)* |
| Phase 23G headless dry-run harness | **17/17 shots OK** (was 14/17 in Phase 23G) |

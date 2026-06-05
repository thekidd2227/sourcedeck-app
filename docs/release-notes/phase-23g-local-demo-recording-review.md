# Phase 23G — Local GovCon Demo Recording Dry Run Review

**Release date:** 2026-06-04
**Branch:** `docs/phase-23g-local-demo-recording-review`

## What's new

Phase 23G is **docs-only.** A headless dry-run of the Phase 23F
shot list was executed against `main @ d7f0124` (Phase 23F merge)
using the existing chromium-via-Playwright pattern from the
Phase 23C/23D visual-sanity harnesses. Per-shot PNG screenshots
plus the captured Markdown export payload were saved into
`.qa/phase-23g-local-demo-recording/` (untracked). The full review
report — clip-by-clip safety table, defects found, classification
(APPROVED / NEEDS RE-RECORD / DO NOT USE), and next-phase
recommendations — landed at:

- `docs/demo/phase-23g-local-demo-recording-review.md`

## Recording method (and what was not done)

This run used a **headless dry-run**, not operator manual screen
recording. The harness is local-only (lives inside `.qa/`) and
produces PNG screenshots, not video clips. That is deliberate:

- The Phase 23F recording checklist §10 marks the optional
  Playwright/Electron dry-run as `/tmp`-scoped only and explicitly
  defers a committed recording harness to Phase 23F-A.
- This CI-style environment lacks a display server, so no
  `.mp4` / `.mov` / `.webm` video clip was produced.
- Operator-driven manual video capture remains the final step for
  producing buyer-facing video assets. The PNG screenshots captured
  here are evidence-grade dry-run artifacts — they prove each
  shot's visual state matches the Phase 23F shot list expectations
  before operator video capture.

## Dry-run result: 14 of 17 shots OK, 3 blocking demo defects

The headless harness reported `14/17 shots OK · 3 shot defects · 0
boot errors`. Renderer boot is clean. The 3 failures are real
demo-experience defects in the existing Phase 23A demo loader +
Phase 23D Last Updated module — they would block any operator
trying to record Shot 02 (Load Sample), Shot 12 (Last Updated
chips), or Shot 13 (Markdown export with SAMPLE DEMO DATA banner)
as buyer-facing material.

Per the Phase 23G mission's hard rule (*"Do not edit sourcedeck.html
unless a blocking demo defect is found; if found, stop and report"*),
this docs-only PR **reports the defects** and recommends Phase 23H
to fix them. **No edit to `sourcedeck.html` is made in this PR.**

### Defect summary

- **Defect A** — Phase 23D pricing storage-key mismatch. The
  `vendor-pricing` chip watches `sd.govcon.pricing.v1` but the
  Phase 22D Pricing Worksheet persists at
  `sd.govcon.pricingWorksheet.v1`. Chip never stamps on real
  Pricing-Worksheet edits.
- **Defect B** — Phase 23A sample-data scope. The demo loader
  writes only to capture-board + sol-workspace; three of the five
  Phase 23D chips therefore stay "Not yet" after Load Sample.
- **Defect C** — Demo Mode signal not activated. The Phase 23A
  loader does not set `sd.govcon.demoMode.active.v1 = 'true'` nor
  tag sample rows with `source: 'phase-23a-demo'`, so the
  Markdown export's SAMPLE DEMO DATA banner does not fire.

Full root-cause analysis and recommended Phase 23H fixes are in
the review doc §4.

## Local recording directory

`.qa/phase-23g-local-demo-recording/`

| Subpath | Purpose |
| --- | --- |
| `phase23g-dry-run.mjs` | Headless harness (NOT committed) |
| `clips/00-cold-open-govcon-default.png` … `clips/16-close-cta.png` | 17 per-shot PNG screenshots |
| `clips/13-internal-review-markdown-export.payload.md` | Captured Markdown export payload (1,936 bytes) |
| `notes/dry-run-report.json` | Structured pass/fail report |

`.qa/` is excluded via `.git/info/exclude`. None of the above
appears under `git status`.

## What did not change

- `sourcedeck.html` — **not modified.**
- `package.json` — not modified.
- `test/**` — not modified.
- `scripts/**` — not modified.
- `services/**` — not modified.
- `.github/workflows/**` — not modified.
- Phase 22B-22F GovCon workflow surfaces — intact.
- Phase 23A Demo Mode (with the three known defects documented),
  23B GovCon Mode indicator, 23C primary nav + Show All Tools
  toggle, 23D Markdown export + Last Updated chips (with the two
  known defects documented), 23E signed-demo-build workflow,
  23F demo script + shot list + recording checklist — all intact.
- Phase 21F System Readiness / System Flow tab removal — preserved.
- Response Desk draft-only posture, SAM Sprint Free=1 NAICS —
  both preserved.

## Safety boundaries (unchanged)

- **Docs only.** No runtime behavior change.
- **No videos committed.** No screenshots committed. The 17 PNG
  screenshots produced by the headless harness live in `.qa/` only
  and never appear under `git status`.
- **No unsafe claims.** All forbidden phrases remain enumerated as
  negative items in the Phase 23F do-not-say list / hard-stop
  conditions / objection-handling answers.
- **No signed/notarized claim added** — the review doc §1 uses the
  unsigned-build caveat verbatim and explicitly notes that the
  Phase 23E verification chain has not been executed for this
  artifact.
- **No GovCon runtime behavior changed.**

## Next recommended phase

**Phase 23H — Demo-Mode + Last Updated Storage-Key Fix.** Five-item
scope captured in the review doc §8:

1. Correct `SECTION_DEFS[2].keys` for `vendor-pricing` to
   `sd.govcon.pricingWorksheet.v1` (matching `PR_KEY`). Update the
   matching `readObj` call in the Markdown export builder.
2. Extend `gcDemoLoadSample()` to also write sample payloads to
   the seven Phase 22D/22E/22F storage keys so every Phase 23D
   chip stamps on Load Sample.
3. Have the Phase 23A loader set `sd.govcon.demoMode.active.v1 =
   'true'` on Load Sample and delete it on Clear Sample, so the
   SAMPLE DEMO DATA banner reliably fires in the Markdown export.
4. Extend `test/govcon-demo-delivery-polish.test.js` to assert
   chip-coverage + SAMPLE DEMO DATA banner.
5. Re-run the Phase 23G headless dry-run after the fix; verify
   17/17 OK before invoking operator manual video capture.

**Phase 23J (or later) — Operator manual video capture.** Run the
Phase 23F recording checklist on a desktop with screen-recording
capability. Save clips to `.qa/phase-23j-…/` or `/tmp/` only. Do
not commit clips.

## Verification

- `node test/govcon-demo-delivery-polish.test.js` — 26/26 PASS
- `node test/govcon-primary-navigation.test.js` — 23/23 PASS
- `node test/govcon-mode-navigation.test.js` — 17/17 PASS
- `node test/govcon-demo-polish.test.js` — 27/27 PASS
- `node test/remove-system-readiness-tab.test.js` — 9/9 PASS
- `node test/renderer-boot.test.js` — 7/7 PASS
- `npm test` — every test file PASS (incl. Phase 23E 25/25)
- `npm run troubleshooting:scan` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — PASS *(local-dev signing warn
  only, expected and honestly documented in the review doc §1)*

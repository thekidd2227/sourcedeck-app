# Phase 23G — Local GovCon Demo Recording Dry Run Review

**Recording date:** 2026-06-04
**Recorded from commit:** `d7f0124` (Phase 23F merge — `docs(demo): add GovCon demo script and video plan (#72)`)
**Branch:** `docs/phase-23g-local-demo-recording-review`
**Local recording directory:** `.qa/phase-23g-local-demo-recording/` *(untracked; not committed)*
**Pair docs:**
- `docs/demo/phase-23f-govcon-demo-master-script.md` (narration)
- `docs/demo/phase-23f-govcon-demo-shot-list.md` (storyboard)
- `docs/demo/phase-23f-govcon-demo-recording-checklist.md` (pre/during/post checks)

## 0. Recording method

This phase performed a **headless dry-run** of the Phase 23F shot list
inside the existing chromium-via-Playwright pattern that the Phase
23C/23D visual-sanity harnesses established. The harness is local
only:

- `.qa/phase-23g-local-demo-recording/phase23g-dry-run.mjs` —
  harness (NOT committed; lives only inside `.qa/`).
- `.qa/phase-23g-local-demo-recording/clips/` — 17 PNG screenshots
  (one per Phase 23F shot) + the captured Markdown export payload.
- `.qa/phase-23g-local-demo-recording/notes/dry-run-report.json` —
  structured pass/fail per shot.

**No video clip (.mp4/.mov/.webm) was produced** because this run
happened in a headless environment without a display server.
Operator-driven manual screen recording remains the final step for
producing buyer-facing video clips. The PNG screenshots captured
here are **evidence-grade dry-run artifacts** — they prove each
shot's visual state matches the Phase 23F shot list expectations
*before* operator video capture. Per the Phase 23F recording
checklist §9, every clip and screenshot file lives in `.qa/` only
and never appears under `git status`.

## 1. Signed-build verification status

- Phase 23E `signed-demo-build.yml` workflow **has not been
  executed for this artifact**. `release-check` continues to warn
  `code object is not signed at all` on the local dev build.
- ✅ Operator MUST use the unsigned-build caveat from
  §12 of the master script verbatim during the final manual
  video recording:
  > *"This is an unsigned development build for demo purposes."*
- ❌ The phrases "signed and notarized", "Apple notarized",
  "Production signed", "SourceDeck is signed", "SourceDeck is
  notarized" remain forbidden until Phase 23E verification chain
  completes end-to-end.

## 2. Clips captured (17/17)

| # | Slug | File |
| --- | --- | --- |
| 00 | cold-open-govcon-default | `.qa/phase-23g-local-demo-recording/clips/00-cold-open-govcon-default.png` |
| 01 | govcon-mode-indicator | `.qa/phase-23g-local-demo-recording/clips/01-govcon-mode-indicator.png` |
| 02 | load-sample-demo-data | `.qa/phase-23g-local-demo-recording/clips/02-load-sample-demo-data.png` |
| 03 | capture-command-center | `.qa/phase-23g-local-demo-recording/clips/03-capture-command-center.png` |
| 04 | solicitation-workspace | `.qa/phase-23g-local-demo-recording/clips/04-solicitation-workspace.png` |
| 05 | compliance-matrix | `.qa/phase-23g-local-demo-recording/clips/05-compliance-matrix.png` |
| 06 | vendor-quote-room | `.qa/phase-23g-local-demo-recording/clips/06-vendor-quote-room.png` |
| 07 | pricing-worksheet | `.qa/phase-23g-local-demo-recording/clips/07-pricing-worksheet.png` |
| 08 | past-performance-library | `.qa/phase-23g-local-demo-recording/clips/08-past-performance-library.png` |
| 09 | capability-statement-studio | `.qa/phase-23g-local-demo-recording/clips/09-capability-statement-studio.png` |
| 10 | prime-partner-finder | `.qa/phase-23g-local-demo-recording/clips/10-prime-partner-finder.png` |
| 11 | submission-readiness-gate | `.qa/phase-23g-local-demo-recording/clips/11-submission-readiness-gate.png` |
| 12 | last-updated-chips | `.qa/phase-23g-local-demo-recording/clips/12-last-updated-chips.png` |
| 13 | internal-review-markdown-export | `.qa/phase-23g-local-demo-recording/clips/13-internal-review-markdown-export.png` (+ `.payload.md`) |
| 14 | no-submit-safety-language | `.qa/phase-23g-local-demo-recording/clips/14-no-submit-safety-language.png` |
| 15 | show-all-tools-toggle | `.qa/phase-23g-local-demo-recording/clips/15-show-all-tools-toggle.png` |
| 16 | close-cta | `.qa/phase-23g-local-demo-recording/clips/16-close-cta.png` |

## 3. Clip safety review

| # | Clip | Buyer clarity | Text readability | Pacing | Crop | Unsafe claims | Fake real data | Send Email / Submit Bid / Submit Quote | System Readiness | Signed/notarized claim | Real agency/vendor | Portal/upload/email | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | cold-open-govcon-default | ✅ clear | ✅ legible at 1440×900 | n/a | ✅ full window | ✅ none | ✅ none on screen | ✅ none | ✅ none | ✅ none | ✅ none | ✅ none | **APPROVED FOR REVIEW** |
| 01 | govcon-mode-indicator | ✅ clear | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 02 | load-sample-demo-data | ⚠ partial | ✅ | needs ~3s polling pause | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **NEEDS RE-RECORD** *(see §4 Defect A + B)* |
| 03 | capture-command-center | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 04 | solicitation-workspace | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 05 | compliance-matrix | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 06 | vendor-quote-room | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 07 | pricing-worksheet | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 08 | past-performance-library | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 09 | capability-statement-studio | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 10 | prime-partner-finder | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 11 | submission-readiness-gate | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 12 | last-updated-chips | ⚠ partial | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **NEEDS RE-RECORD** *(see §4 Defect A + B)* |
| 13 | internal-review-markdown-export | ⚠ Demo banner missing | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **NEEDS RE-RECORD** *(see §4 Defect C)* |
| 14 | no-submit-safety-language | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 15 | show-all-tools-toggle | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |
| 16 | close-cta | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **APPROVED FOR REVIEW** |

## 4. Hard-stop issues found

### Defect A — Phase 23D pricing storage-key mismatch (blocking)

The Phase 23D Last Updated module watches
`sd.govcon.pricing.v1` for the `vendor-pricing` chip
(`sourcedeck.html:13491` — `SECTION_DEFS`). The Phase 22D Pricing
Worksheet module actually persists at
`sd.govcon.pricingWorksheet.v1` (`sourcedeck.html:12360` and
`12871`). As a result the `vendor-pricing` chip will never stamp
on a real Pricing-Worksheet edit, only on a Vendor Quote Room
edit. The Phase 23D Markdown export at `13670` also reads the
wrong key.

**Impact:** Shot 02 (Load Sample) and Shot 12 (Last Updated chips)
fail to show all-five-chips-stamped on the buyer demo.

### Defect B — Phase 23A sample-data scope (blocking)

The Phase 23A `gcDemoLoadSample()` (line 13389) writes sample data
to the capture-board and the solicitation workspace, but does NOT
write to the past performance / capability / prime partner /
submission gate storage keys. Three of the five Phase 23D Last
Updated chips therefore stay at "Not yet" after Load Sample is
clicked.

**Impact:** Shot 02 (Load Sample) and Shot 12 (Last Updated chips)
do not match the Phase 23F shot list expectation that "all five
Phase 23D Last Updated chips flip from 'Not yet' to a real
timestamp within ~2.5s".

### Defect C — Demo Mode signal not activated by Load Sample (blocking)

`isDemoModeActive()` (line 13602) checks
`sd.govcon.demoMode.active.v1 === 'true'` OR a heuristic on
capture-board rows with `source === 'phase-23a-demo'`. The Phase
23A loader neither sets the localStorage key nor tags its sample
rows with the matching `source` value, so `isDemoModeActive()`
returns false → the **SAMPLE DEMO DATA — Replace before proposal
use** banner does **not** appear in the Markdown export payload.

**Impact:** Shot 13 (Markdown export) fails the Phase 23F shot
list's explicit proof requirement: *"If the file does NOT contain
the SAMPLE DEMO DATA warning while Demo Mode is on, stop the
recording — Phase 23D regression."*

### Defects A / B / C — disposition

Per the Phase 23G mission's hard rule *"Do not edit sourcedeck.html
unless a blocking demo defect is found; if found, stop and report"*,
these three defects are **reported here and recommended for
Phase 23H to fix.** No edit to `sourcedeck.html` is made in this
docs-only PR. The 14 approved screenshots remain valid evidence
for the unaffected shots.

### Other safety checks

- ✅ No SyntaxError / ReferenceError / TypeError on boot.
- ✅ No `Send Email`, `Submit Bid`, or `Submit Quote` button on
  any captured frame.
- ✅ No System Readiness / System Flow tab anywhere.
- ✅ Captured Markdown payload (1,936 bytes) carries the
  `INTERNAL REVIEW DRAFT — NOT SUBMITTED` header, the
  `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED` footer, the
  "SourceDeck does not submit, upload, email, or transmit this
  package." clause, and zero Send Email / Submit Bid / Submit
  Quote / positive-submission language. Only the SAMPLE DEMO DATA
  banner is missing → Defect C.
- ✅ No real agency, vendor, solicitation, contract, NAICS, CAGE,
  UEI, or PII data captured in any clip.

## 5. Clips approved for later website use (14)

Shots 00, 01, 03, 04, 05, 06, 07, 08, 09, 10, 11, 14, 15, 16 are
approved as buyer-safe dry-run evidence (PNG screenshots only).
Operator may use them as reference frames for the final manual
video recording.

These approved screenshots remain in `.qa/` and are NOT committed.
Any website-bound use must be re-captured by the operator using
the manual recording flow defined in
`docs/demo/phase-23f-govcon-demo-recording-checklist.md` so the
final asset can be embedded with operator narration audio.

## 6. Clips that need re-recording (3)

Shots 02 (Load Sample), 12 (Last Updated chips), and 13 (Markdown
export) cannot be re-recorded usefully until Defects A / B / C are
fixed in `sourcedeck.html`. The dry-run produced the screenshots
for archival evidence of the current defect state; do not use them
for buyer-facing material.

## 7. Statement: videos / screenshots are local-only and not committed

- ✅ `git status --porcelain | grep -E '\.(mov|mp4|m4v|webm|gif|png|jpg|jpeg)$'` returns empty.
- ✅ `.qa/` is excluded via `.git/info/exclude`.
- ✅ No clip file, no payload file, and no dry-run report appears under any tracked path.
- ✅ The Phase 23G harness script (`phase23g-dry-run.mjs`) is itself only inside `.qa/` and is NOT committed.

## 8. Next recommended phase

**Phase 23H — Demo-Mode + Last Updated Storage-Key Fix.** Scope:

1. Correct `SECTION_DEFS[2].keys` for `vendor-pricing` in
   `sourcedeck.html` to use `sd.govcon.pricingWorksheet.v1`
   (matching `PR_KEY` at lines 12360 / 12871). Update the matching
   `readObj` call in the Markdown export builder.
2. Extend the Phase 23A `gcDemoLoadSample()` to also write sample
   payloads to `sd.govcon.vqr.v1`, `sd.govcon.pricingWorksheet.v1`,
   `sd.govcon.pp.v1`, `sd.govcon.cs.v1`, `sd.govcon.ppf.v1`,
   `sd.govcon.subGate.v1`, `sd.govcon.subGatePkg.v1` so every
   Phase 23D chip stamps when a buyer clicks Load Sample.
3. Have the Phase 23A loader set
   `sd.govcon.demoMode.active.v1 = 'true'` on Load Sample and
   delete it on Clear Sample, so the SAMPLE DEMO DATA banner
   reliably fires in the Markdown export while Demo Mode is on.
4. Extend `test/govcon-demo-delivery-polish.test.js` to assert
   that after `gcDemoLoadSample()`, all five Phase 23D chips
   advance from "Not yet" and the Markdown export contains the
   SAMPLE DEMO DATA banner.
5. Re-run the Phase 23G headless dry-run after the fix; verify
   17/17 OK before invoking operator manual video capture.

**Phase 23J (or later) — Operator manual video capture.** Run the
Phase 23F recording checklist on a desktop with screen-recording
capability (QuickTime, OBS, ScreenFlow). Save clips to
`.qa/phase-23j-…/` or `/tmp/` only. Do not commit clips.

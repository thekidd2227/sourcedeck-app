# Phase 23F — GovCon Buyer Demo Script + Video Capture Plan

**Release date:** 2026-06-04
**Branch:** `docs/phase-23f-govcon-demo-script-video-plan`

## What's new

Phase 23F is **docs-only**. It packages the GovCon Capture OS demo
delivery layer that shipped in Phase 23D, the controlled signing
path that shipped in Phase 23E, and the Phase 22G demo-script
foundation into a single buyer-ready demo package:

- **`docs/demo/phase-23f-govcon-demo-master-script.md`** — the
  narrator's script. Includes a 30-second cold elevator, a
  60-second sit-down opener, a 5-minute demo, a 15-minute deep-dive,
  objection handling, pricing positioning, an exact close / CTA,
  the sample-data explanation, the local Markdown export
  explanation, the Last Updated timestamp explanation, the
  unsigned-build caveat (used until Phase 23E verification chain
  proves signed/notarized status for a specific artifact), and a
  do-not-say list.
- **`docs/demo/phase-23f-govcon-demo-shot-list.md`** — the
  storyboard. 18 base shots (5-minute demo, ~4:56 total) plus 5
  deep-dive add-on shots for the 15-minute version. Each shot
  specifies screen area, narrator line, user action, expected
  visible result, safety note, and estimated seconds. Includes 10
  hard-stop conditions if a regression is visible on screen.
- **`docs/demo/phase-23f-govcon-demo-recording-checklist.md`** —
  pre / during / post checks for actually recording. Branch posture,
  signed-build posture, pre-launch test gates, screen-area sweep,
  cold-open verification, sample-data flow checks, language
  discipline, hard stop conditions, sample-data clear, and the
  storage-of-generated-media rule.

## Required positioning (verbatim)

> *"SourceDeck is a GovCon Capture OS that helps contractors move
> from opportunity discovery to submission-ready package preparation
> with human-approved workflows."*

## Required safety language (every demo, every length)

> *"SourceDeck prepares internal review materials. It does not
> submit, upload, email, or transmit bids, quotes, or government
> responses."*

## Sample-data explanation

Demo Mode loads sample data tagged with a demo source flag. The
Markdown export carries a `SAMPLE DEMO DATA — Replace before
proposal use.` warning while Demo Mode is active. Clear Sample
Data wipes the demo tag.

## Local Markdown export explanation

The Phase 23D **Export Internal Review Markdown** button triggers a
local browser Blob download. No IPC, no `fetch`, no network call.
The payload begins with `INTERNAL REVIEW DRAFT — NOT SUBMITTED`,
ends with `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`, and
includes the no-submit / no-upload / no-email / no-transmit
safety blockquote inline.

## Last Updated timestamp explanation

The Phase 23D chips capture a baseline signature on
`DOMContentLoaded` and never stamp from that baseline read. Cold
open with persisted data leaves every chip at "Last updated: Not
yet". Polling every 2.5 s + on `focus` / `visibilitychange`
detects real localStorage changes and stamps
`Last updated: YYYY-MM-DD HH:MM` (local).

## Unsigned-build caveat (until Phase 23E verifies)

> *"This is an unsigned development build for demo purposes."*

The Phase 23E `signed-demo-build.yml` workflow adds a manual path
to produce a signed-demo candidate, but until ALL seven gates of
the verification chain have passed for the specific artifact you
are recording from — signing-readiness strict, signed build,
release-check, codesign verify, spctl accept, stapler validate,
release-evidence signed-verified — the operator must use the
"unsigned development build for demo purposes" wording verbatim and
must NOT say "signed and notarized", "Apple notarized", "production
signed", "SourceDeck is signed", or "SourceDeck is notarized".

## Forbidden language

The master script's §13 do-not-say list enumerates the phrases that
must never appear in any demo, pricing deck, marketing copy, PR
description, or buyer email:

- "SourceDeck submits bids for you."
- "SourceDeck guarantees awards."
- "SourceDeck guarantees revenue."
- "SourceDeck is FedRAMP certified."
- "SourceDeck is SOC 2 certified."
- "SourceDeck is CMMC certified."
- "SourceDeck is HIPAA certified."
- "SourceDeck is HITRUST certified."
- "SourceDeck is ISO 27001 certified."
- "SourceDeck sends outreach automatically."
- "SourceDeck files into SAM automatically."
- "SourceDeck files into PIEE automatically."
- "SourceDeck files into eBuy automatically."
- "SourceDeck files into GSA automatically."
- "SourceDeck is signed and notarized." *(until Phase 23E verifies)*
- "Apple notarized." *(same condition)*
- "Production signed." *(same condition)*
- "SourceDeck is signed." *(same condition)*
- "SourceDeck is notarized." *(same condition)*
- "Publicly signed."
- "IBM watsonx is included." *(unless `verified_ready` evidence)*
- "Watsonx live." *(unless `verified_ready` evidence)*
- "Auto-send."
- "Auto-submit."
- "We email the SAM submission for you."
- "We upload to PIEE for you."

## What did not change

- `sourcedeck.html` — **not modified.**
- No services, scripts, tests, or workflows changed.
- Phase 22B-22F GovCon workflow surfaces — intact.
- Phase 23A Demo Mode, 23B GovCon Mode indicator, 23C primary nav +
  Show All Tools toggle, 23D Markdown export + Last Updated chips,
  23E signed-demo-build workflow — all intact.
- Phase 21F removed System Readiness / System Flow tab — remains
  removed.
- Response Desk draft-only posture, SAM Sprint Free=1 NAICS — both
  preserved.

## Safety boundaries (unchanged)

- Docs-only. No runtime behavior change.
- No videos committed.
- No screenshots committed.
- Generated media must land in `/tmp` or `.qa/` only.
- No unsafe claims. No false signed/notarized claim. No guaranteed
  awards / revenue claim. No compliance certifications claimed.

## Recording-time generated media policy

Phase 23F **does not** add a committed Playwright/Electron recording
harness — adding one would couple the repo to Playwright as a
release dependency. The existing visual-sanity harnesses
(`/tmp/phase23c-visual-sanity.mjs`,
`/tmp/phase23d-visual-sanity.mjs`) remain intentionally
`/tmp`-scoped.

The recording checklist's §9 enforces the rule: every recording or
screenshot file must live under `/tmp` or `.qa/` and never appear
under `git status`. A guard regex (`git status --porcelain | grep
-E '\.(mov|mp4|m4v|webm|gif|png|jpg|jpeg)$'`) is documented.

## Phase 23F-? recommendations

- **23F-A** Committed Playwright/Electron recording harness with a
  `.qa/recordings/` git-ignored output target. Defer until
  Playwright is acceptable as a release-time test dependency.
- **23F-B** Branded final-frame closing card (Cormorant Garamond
  title, IBM Plex Mono sub-copy) generated from a local SVG, not
  from network fonts.
- **23F-C** Captioning / subtitle generation for the narration,
  local-only transcription.
- **23F-D** Buyer-specific narration templates derived from the
  Phase 22G QA Q&A bank.

## Verification

- `node test/govcon-demo-delivery-polish.test.js` — PASS
- `node test/govcon-primary-navigation.test.js` — PASS
- `node test/govcon-mode-navigation.test.js` — PASS
- `node test/govcon-demo-polish.test.js` — PASS
- `node test/remove-system-readiness-tab.test.js` — PASS
- `node test/renderer-boot.test.js` — PASS
- `npm test` — all test files PASS
- `npm run troubleshooting:scan` — PASS
- `npm run i18n:audit` — PASS
- `node scripts/release-check.js` — PASS *(local-dev signing warn
  only, expected and honest)*

See the master script for narrator language, the shot list for the
storyboard, and the recording checklist for the operational
pre / during / post checks.

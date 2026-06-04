# Release Note — Phase 21B Controlled Demo Dry Run

**Branch:** `docs/phase-21b-demo-dry-run`
**Type:** Docs only. No runtime, package, script, service, test, or workflow change.
**Base:** `main @ f23bd07` (Phase 21A buyer demo acceptance gate merged).

## Summary

Phase 21B adds the operator-facing dry-run package that turns the Phase 21A buyer demo walkthrough into a recordable, reviewable rehearsal. The package consists of a 12-section rehearsal protocol, a 15-shot frame-by-frame capture list, a claim-safe narration drill, a buyer / reviewer Q&A drill, red-flag stop conditions, a post-demo follow-up email template, and a corrections-list format.

No product behavior changes. No new features. No claims added.

## What changed

- New `docs/demo/phase-21b-controlled-demo-dry-run.md` — 12-section dry-run protocol:
  1. Dry-run checklist before recording (machine setup, app walk-through verification, presenter prep, recording setup).
  2. Exact 5-minute rehearsal flow (timing + source quotes from Phase 21A § A).
  3. Exact 15-minute rehearsal flow (timing + source quotes from Phase 21A § B).
  4. Screen capture shot list (summary; full list in the separate shot-list doc).
  5. What not to show (10 stop-and-cut moments).
  6. Claim-safe narration (5 pivot moments with verbatim corrections).
  7. Buyer questions and approved answers (3 rehearsal-specific additions to the 21A § F table).
  8. Known limitations to disclose.
  9. Red flags that stop the demo (10 conditions, single hand-raise stop signal).
  10. Post-demo follow-up email template (with mandatory forbidden-claim re-read pass).
  11. Corrections list format.
  12. Final demo readiness recommendation.
- New `docs/demo/phase-21b-recording-shot-list.md` — 15-shot frame-by-frame capture list with pre-roll checklist, per-shot "Verify before capture" lines, post-roll checklist, `tmp/phase-21b-recordings/` file-handling rules, what-to-do-if-a-shot-fails procedure, and the two-approvable-takes approval criteria.
- New `docs/audits/phase-21b-demo-dry-run-audit.md` — implementation audit including the claims-audit result (0 positive unsupported claims added) and the demo surface coverage table.
- New `docs/release-notes/phase-21b-controlled-demo-dry-run.md` (this file).

## What did NOT change

- **`sourcedeck.html`** — not edited.
- **`services/**`, `scripts/**`, `test/**`** — not edited.
- **`main.js`, `preload.js`, `chartnav-integration.js`** — not edited.
- **`package.json`, `package-lock.json`** — not edited.
- **`.env*`** — not edited.
- **`reports/**`** — no generated reports committed.
- **`tmp/phase-21b-recordings/`** — no recordings or screenshots committed; the shot-list doc explicitly instructs the operator not to commit any video / image content from a recording session.
- **Vercel / signing / watsonx / provider config** — not edited.
- **Other repos** (`sourcedeck-site`, `sourcedeck`, ChartNav, ARCGSystems, Buffer / social workflows) — not touched.

## Dry-run readiness recommendation

**Docs side: READY.** The four new files give the operator everything needed to run the rehearsal and produce a clean recording: rehearsal protocol, shot list, audit, and release note.

**Recording side: operator-required.** The actual recording must happen on macOS with a screen recorder and the operator on camera. This PR cannot produce a recording from the CI/build environment.

Per the dry-run protocol § 12, the demo is **READY for the first buyer-facing meeting** only when:

1. A 5-minute approvable take is captured.
2. A 15-minute approvable take is captured.
3. Both takes pass the post-recording forbidden-claim grep / re-watch.
4. The Phase 21A Go / No-Go checklist (`docs/commercial-readiness/phase-21a-go-no-go-checklist.md`) is signed off.

Until all four conditions are met: **NOT READY** for a live buyer meeting, even though the docs are in place.

## Safety

- **No claims added.** Every claim mention in the new docs is in negative form (sanitizer / forbidden-claim column / pivot-correction / post-demo re-read list / red-flag stop condition).
- **No watsonx-live claim** — protocol preserves the safe wording ("watsonx readiness is presence/status/remediation only") and gates any elevated wording behind `verified_ready` evidence per Phase 21A § K.
- **No signed/notarized claim** — protocol preserves the safe wording ("unsigned development build for demo purposes") and gates any elevated wording behind the four-step notarization workflow per Phase 21A § L.
- **No guaranteed-outcome claim.**
- **No compliance-certification claim.**
- **No auto-send / auto-submit claim.**
- **No pricing change.** Pricing references remain in `docs/commercial-readiness/buyer-one-page-overview.md` and are sent as a separate follow-up after the demo.
- **No new product feature** described.
- **No live SAM Sprint** instructed during the dry run.
- **No outreach** instructed during the dry run.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed / notarized claim, any compliance claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001), guaranteed-outcome or unlimited-AI language, or auto-send / auto-submit copy. None were added in Phase 21B. The new docs explicitly enforce these as forbidden-claim items the presenter is drilled to avoid and the reviewer is drilled to flag.

## Files changed

- `docs/demo/phase-21b-controlled-demo-dry-run.md` (new)
- `docs/demo/phase-21b-recording-shot-list.md` (new)
- `docs/audits/phase-21b-demo-dry-run-audit.md` (new)
- `docs/release-notes/phase-21b-controlled-demo-dry-run.md` (this file)

## Tests run

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Results recorded in the PR description.

## Stashes

Stashes were not modified. No stash applied or dropped.

## Next phase

Phase 21C (operator-initiated): the first buyer-facing meeting using the recorded takes as the canonical demo, the Phase 21A Go / No-Go checklist as the pre-meeting gate, and the Phase 21B follow-up email template as the post-meeting recap. If the operator wants to elevate the signed/notarized status from default safe wording to verified, that is also tracked under Phase 21C as a separate optional workflow.

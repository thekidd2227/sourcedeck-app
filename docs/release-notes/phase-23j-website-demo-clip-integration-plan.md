# Release Note — Phase 23J: Website GovCon Demo Clip Integration Plan

**Type:** Docs / plan (no runtime change, no media, no website change)
**Date:** 2026-06-04
**Branch:** `docs/phase-23j-website-demo-clip-integration-plan`
**Builds on:** PR #76 — *clean GovCon demo recording review* (`fd8146a` on `main`).

> **Revision (2026-06-04):** added the canonical 8-clip website naming set
> (`sourcedeck-govcon-00-cold-open.mp4` … `-07-internal-review-export.mp4`) and
> the four verbatim required-copy lines that must appear near every clip ("Demo
> uses sample data."; "SourceDeck does not submit bids, quotes, emails, or
> portal uploads."; "All exports are for internal review unless separately
> submitted by the user."; "Local development builds may show unsigned-artifact
> warnings unless release evidence verifies signing/notarization."). Still
> docs-only; no media, no website/runtime change.

## What this phase adds

A **plan-only** document defining how the approved GovCon Capture OS demo clips
(from the Phase 23I review) would be integrated into the website. No media is
produced or committed, and no website or runtime files are touched.

The plan (`docs/demo/phase-23j-website-demo-clip-integration-plan.md`) defines:

- **Approved clip inventory** mapped from the Phase 23I 17-shot review — which
  shots are website candidates vs sales-walkthrough-only.
- **Clip naming convention**, **captions**, **accessibility text** (WebVTT
  captions, `aria-label`, transcripts, poster alt).
- A **no-submit / no-send disclaimer** required adjacent to every clip block.
- The **unsigned-build caveat** required until the Phase 23E signed-build chain
  verifies the exact recorded build.
- A **website placement plan** (hero, GovCon workflow, Submission Readiness,
  buyer-demo page/modal) — proposed, not implemented.
- A note that the **website is a separate repo** to be inspected before any
  implementation; nothing there is touched now.
- **Integration rules** (no autoplay-with-sound, no fake live data, no
  free/download/try CTA — CTA is request-access/contact → info@arivergroup.com,
  no submission/email/upload claims, no signed/notarized claim unless verified).
- A **QA checklist** and a **hard-stop list** to gate any future website PR.

## Status

- Website integration is now **planned but NOT implemented**.
- Implementation is a future, separate website-repo PR gated on the QA checklist
  and hard-stop list, and preceded by operator manual video capture.

## Safety / scope

- **Docs only** — no `sourcedeck.html`, `package.json`, `test/**`, `scripts/**`,
  `services/**`, `.github/**`, or website runtime files changed.
- **No videos / screenshots / media committed.**
- No "free demo / download / try now" CTA introduced; no Send Email / Submit Bid
  / Submit Quote; no submission/email/portal-upload claim; no signed/notarized
  claim.
- Preserves PR #58 System Readiness removal, Response Desk no-send, SAM Sprint
  Free=1 NAICS, and the GovCon Capture OS default/demo posture.
- No `.env` changes.

## Next phase

**Phase 23K — operator manual video capture** (clips local-only), then
**Phase 23J-impl — website demo clip implementation** in the separate website
repo. Optionally **Phase 23E signed-build verification** first.

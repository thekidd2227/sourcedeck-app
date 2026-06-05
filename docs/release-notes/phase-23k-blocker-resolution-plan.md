# Release Note — Phase 23K: Website Demo Clip Integration Blockers

**Type:** Docs / readiness gate (no runtime change, no media, no website change)
**Date:** 2026-06-04

## What this documents

Phase 23J (website demo clip integration **plan**) is merged. Phase 23K
(implementation) is **blocked, not failed**. This note records the two readiness
blockers and the exact steps to clear them, so the website implementation can
proceed cleanly later.

## Blockers

1. **Operator-recorded GovCon demo clips do not exist (ACTIVE).** No
   `.mp4`/`.webm`/`.mov`/`.m4v` exist anywhere under `/Users/jean-maxcharles`;
   only 44 headless QA screenshots (internal evidence, not buyer-facing clips).
   The 8 canonical clips (`sourcedeck-govcon-00-cold-open` …
   `-07-internal-review-export`) must be operator-recorded on a clean profile
   with the unsigned-build caveat narrated.
2. **Website repo identity (RESOLVED).** `/Users/jean-maxcharles/sourcedeck-site`
   `origin` correctly points to `github.com/thekidd2227/sourcedeck-site.git`
   (the live `sourcedeck.app` site). A stray secondary `chartnav` remote exists
   but is not the primary; `origin` is correct. The earlier "points to ChartNav"
   concern was a misread of the secondary remote.

## What's in the plan doc

`docs/demo/phase-23k-blocker-resolution-plan.md` includes the approved 8-clip
set + order, the recording checklist, the file naming convention, required
captions/transcripts, the verbatim sample-data / no-submit / no-send / no-upload
disclaimer, the allowed CTA posture (Request access / Contact us / Schedule a
walkthrough), and the forbidden-copy list (Free demo / Try now / Download now /
Launch app / Submit bid / Submit quote / Send email / SourceDeck submits
proposals / guaranteed award / guaranteed revenue / FedRAMP·SOC 2·CMMC certified
/ signed and notarized / Apple notarized).

## Safety / scope

- Docs only — no `sourcedeck.html`, `package.json`, `test/**`, `scripts/**`,
  `services/**`, or website files changed.
- No media / screenshots / videos committed.
- No website edits; the website repo was inspected read-only.
- No `.env`. No publish/deploy. No new unsafe claims.
- Preserves PR #58 System Readiness removal, Response Desk no-send, SAM Sprint
  Free=1 NAICS, GovCon Capture OS default/demo posture.

## Required next action

1. Record/export the 8 approved clips.
2. Confirm the website repo target (done — `sourcedeck-site`).
3. Only then create the Phase 23K implementation branch (feature branch + draft
   PR on `sourcedeck-site`; never push to `main`).

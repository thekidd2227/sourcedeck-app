# Release Note — Phase 23K: Operator Demo Clip Recording Package

**Type:** Docs / readiness package (no runtime change, no media, no website change)
**Date:** 2026-06-05
**Reviewed from:** `main` @ `609d4f2`

## What this adds

An actionable **operator recording package** that converts the Phase 23J/23K
blocker notes into a precise, per-clip recording checklist so the missing
GovCon demo clips can be produced correctly. Phase 23K website implementation
stays **blocked** until these clips exist.

`docs/demo/phase-23k-operator-demo-clip-recording-package.md` includes:

- **Purpose** — clips are sales/demo/onboarding assets only; not product
  features; no submit/send/upload behavior.
- **Verbatim disclaimer** — "Demo uses sample data. SourceDeck does not submit
  bids, quotes, emails, or portal uploads. Exports are for internal review
  unless separately submitted by the user."
- **8-clip checklist** (`sourcedeck-govcon-00-cold-open` …
  `-07-internal-review-export`) — each with target filename, screen/path,
  action sequence, must-show / must-not-show, duration, poster, caption, and
  website-safe vs sales-only classification.
- **Forbidden content** — Free demo / Try now / Download now / Launch app /
  Submit bid / Submit quote / Send email / SourceDeck submits proposals /
  files into SAM.gov / guaranteed award / guaranteed revenue / FedRAMP / SOC 2
  / CMMC / HIPAA / HITRUST / ISO 27001 certified / signed and notarized / Apple
  notarized.
- **Recording environment rules** — clean main, no `.env`/secrets, no live SAM,
  no real outreach/email/submission, sample data only, media to `.qa/` or
  `/tmp/` only.
- **Approval gate** — clips + captions + posters exist, unsafe-copy grep passes,
  website repo identity re-confirmed, no media committed, before any website PR.

## Status

- Operator-recorded clips: **still 0** (only 44 headless QA screenshots exist).
- Phase 23K implementation: **BLOCKED** until the 8 clips are recorded.

## Safety / scope

- Docs only — no `sourcedeck.html`, `package.json`, `test/**`, `scripts/**`,
  `services/**`, or website files changed.
- No media / screenshots / videos committed.
- No `.env`. No publish/deploy. No website PR opened.
- No free/download/try CTA; no submit/send/upload or compliance/signed claims.
- Preserves System Readiness removal, Response Desk no-send, SAM Sprint Free=1
  NAICS, GovCon Capture OS default/demo posture.

## Exact next real-world action

**Record/export the 8 approved GovCon demo clips** per the checklist (clean
profile, unsigned-build caveat narrated, sample data only), then run the
approval gate — only then create the Phase 23K website implementation branch on
`sourcedeck-site`.

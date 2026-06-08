# Phase 24H-PREP — Demo QA Checklist

**Date:** 2026-06-08
**Posture:** Docs / demo only. Run before any buyer demo of the GovCon Capture OS. **No runtime change. No video. No screenshots.**
**Companions:** `phase-24h-buyer-demo-storyboard.md`, `phase-24h-govcon-demo-walkthrough-script.md`, `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`.

---

## A. Pre-demo environment

- [ ] On `main`, current (`git pull`); demoing a known-good commit.
- [ ] `npm test` green (exit 0, zero ❌).
- [ ] Release gates green: `release:evidence` (fail=0, warn=0), `troubleshooting:scan` (no fail/warn), `govcon:smoke` (PASS), `phase13:rc-check` (PASS), `i18n:audit` (PASS), `release-check.js` (privacy gate PASS).
- [ ] No `.env` / API keys / secrets visible on screen or in any panel.
- [ ] Sample / demo data only (the `SAMPLE DEMO DATA` banner is visible).
- [ ] No real inbox connected; Response Desk not in frame as a send surface.
- [ ] No live SAM Sprint unless explicitly configured as dry-run / manual-review.
- [ ] No videos needed (recording is deferred; this is a live or screen-share walkthrough).
- [ ] "Show All Tools" collapsed at open (GovCon stays primary).

## B. Visual walkthrough (each surface renders)

- [ ] Capture Command Center (`#gc-capture-cc`) visible and populated.
- [ ] Operating Rhythm (`#gc-daily-rhythm`) visible.
- [ ] Deadline & Q&A Calendar (`#gc-deadline-calendar`) visible.
- [ ] Agency Targeting (`#gc-agency-targeting`) visible; profile-driven NAICS (`#gc-naics-filter`).
- [ ] Solicitation Workspace (`#gc-sol-workspace`) visible.
- [ ] Compliance Matrix (`#gc-sol-matrix-table`) visible; defaults to Draft.
- [ ] Vendor Quote Room (`#gc-vqr`) visible.
- [ ] Pricing Worksheet (`#gc-pricing`) visible.
- [ ] Past Performance Library (`#gc-pp`) visible.
- [ ] Capability Statement Studio (`#gc-cs`) visible; local import present.
- [ ] Prime Partner Finder (`#gc-ppf`) visible.
- [ ] Stakeholder Graph (`#gc-stakeholder-graph`) visible; FAR-aware posture labels + restricted-window warning.
- [ ] Submission Readiness Gate (`govcon-submission-readiness-gate`) visible.
- [ ] Audit Log (`#gc-audit-log`) visible.
- [ ] Internal Review Export (`#gc-pkg-export`) visible; produces local Markdown.

## C. Safety checks (none present in active UI)

- [ ] No **Send Email** control.
- [ ] No **Submit Bid** control.
- [ ] No **Submit Quote** control.
- [ ] No **Export and submit** control.
- [ ] No "portal upload completed" claim.
- [ ] No "package submitted" claim.
- [ ] No System Readiness / System Flow tab or pane.
- [ ] No stale pricing (`$79` / `$349` / `$999`) in active UI.
- [ ] No unsupported compliance / revenue / signing claims (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO / guaranteed award / signed-notarized / Apple-notarized).
- [ ] No real secrets anywhere on screen.

Required disclaimers visible on their surfaces:
- [ ] "Internal review draft. SourceDeck does not send, submit, upload, or certify this content." (Capability Statement Studio)
- [ ] "Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes." (Stakeholder Graph)
- [ ] "INTERNAL REVIEW DRAFT — NOT SUBMITTED" + "SourceDeck does not submit, upload, email, or transmit this package." (Internal Review Export)
- [ ] "never auto-sends, never auto-submits" (Response Desk, if shown)

## D. Buyer story checks (buyer understands)

- [ ] The product helps **organize, draft, and review** — not act.
- [ ] **Human approval** is required for every meaningful action.
- [ ] SourceDeck does **not** submit / send / upload — the user does that externally.
- [ ] The **pilot structure** (guided pilot with their own profile + NAICS).
- [ ] The **limitations** (no award guarantee; no compliance certification; unsigned dev build; live-SAM/portal integrations out of scope).

## E. Demo hold conditions (stop / reset if any occur)

- [ ] Any unsafe CTA appears (Send Email / Submit Bid / Submit Quote / Export-and-submit / portal upload).
- [ ] Any live private data appears (real agency record, real vendor/customer, PII, secrets).
- [ ] Any test fails / a gate is red.
- [ ] Any unsupported claim appears (certification / guaranteed award / signed-notarized without evidence).
- [ ] The operator cannot clearly explain the human-approval / no-send / no-submit boundary.

If any hold condition triggers, stop the demo, fix or reframe, and re-run §A before resuming.

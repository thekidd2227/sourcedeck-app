# Phase 24J-PREP — Operator Demo Runbook

**Date:** 2026-06-08
**Posture:** Docs only. Run by the operator before/while demoing the GovCon Capture OS. **No runtime change. No video. No screenshots.**
**Companions:** `docs/demo/phase-24h-buyer-demo-storyboard.md`, `docs/demo/phase-24h-govcon-demo-walkthrough-script.md`, `docs/demo/phase-24h-demo-qa-checklist.md`, `docs/product/phase-24j-limited-paid-pilot-handoff.md`.

---

## 1. Pre-demo setup

- [ ] `git checkout main && git pull` — demoing a known-good commit.
- [ ] **Confirm Phase 24I has merged** before any final RC demo (SAM key Settings-only; search screen no key request; Stakeholder Graph live refresh; Prime Partner Finder NAICS fallback profile-driven).
- [ ] `npm test` green (exit 0, zero ❌).
- [ ] Release gates green: `release:evidence` (fail=0, warn=0), `troubleshooting:scan` (no fail/warn), `govcon:smoke` (PASS), `phase13:rc-check` (PASS), `i18n:audit` (PASS), `release-check.js` (PASS).
- [ ] No `.env` / secrets visible on screen.
- [ ] No private files open; no email inbox open.
- [ ] No real customer data; **sample / demo data only** (`SAMPLE DEMO DATA` banner visible).
- [ ] SAM.gov API key configured **only in Settings** if a key is needed — never pasted on the search screen.
- [ ] No live SAM run unless explicitly **dry-run and authorized**.
- [ ] "Show All Tools" collapsed (GovCon stays primary).

---

## 2. Demo sequence

1. **Capture Command Center** (`#gc-capture-cc`) — every pursuit and its state.
2. **Operating Rhythm** (`#gc-daily-rhythm`) — the daily cadence.
3. **Solicitation Workspace** (`#gc-sol-workspace`) — L/M/B/C/H/K shred + Compliance Matrix (`#gc-sol-matrix-table`).
4. **Vendor Quote Room** (`#gc-vqr`) — candidates + manual quote status; plus Pricing Worksheet (`#gc-pricing`).
5. **Past Performance Library** (`#gc-pp`) — reusable, tailored citations.
6. **Capability Statement Studio** (`#gc-cs`) — draft + local/offline import.
7. **Prime Partner Finder** (`#gc-ppf`) — primes + manual teaming status.
8. **Stakeholder Graph** (`#gc-stakeholder-graph`) — FAR-aware posture labels + restricted-window warning; never acts.
9. **Submission Readiness Gate** (`govcon-submission-readiness-gate`) — advisory; never auto-submits.
10. **Internal Review Export** (`#gc-pkg-export`) — local Markdown; "INTERNAL REVIEW DRAFT — NOT SUBMITTED".
11. **Audit Log** (`#gc-audit-log`) — local evidence trail.

---

## 3. Required operator language

> **"SourceDeck prepares internal review materials. The user decides, approves, sends, uploads, and submits outside SourceDeck."**

> **"The SAM.gov API key is configured in Settings. The search screen does not ask you to paste credentials there."**

Reinforce the verbatim on-surface disclaimers as you reach each surface:
- Capability Statement Studio: *"Internal review draft. SourceDeck does not send, submit, upload, or certify this content."*
- Stakeholder Graph: *"Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."*
- Internal Review Export: *"INTERNAL REVIEW DRAFT — NOT SUBMITTED"* / *"SourceDeck does not submit, upload, email, or transmit this package."*

---

## 4. Do-not-say list

- SourceDeck submits bids / quotes / proposals.
- SourceDeck emails contracting officers / CORs / officials.
- SourceDeck uploads to SAM.gov / PIEE / eBuy / GSA / agency portals.
- Guaranteed awards.
- Guaranteed revenue.
- FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO certified.
- Apple notarized / production signed — unless an exact release-evidence artifact proves it (current builds are unsigned dev builds).

If a buyer pushes a forbidden expectation, do **not** nod — restate the boundary and continue.

---

## 5. Demo hold conditions (stop / reset)

- [ ] The SAM search screen asks for an API key (Phase 24I regression — stop).
- [ ] Any Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control appears.
- [ ] Any private / real data appears (agency record, vendor/customer, PII, secrets).
- [ ] Any test fails / a gate is red.
- [ ] Any unsupported claim appears (certification / guaranteed award / signed-notarized without evidence).
- [ ] System Readiness / System Flow appears.
- [ ] Stale pricing (`$79` / `$349` / `$999`) appears.

If any condition triggers, stop, fix or reframe, and re-run §1 before resuming.

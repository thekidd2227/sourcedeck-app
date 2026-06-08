# Phase 24F-PREP — Release Candidate Packaging Contract

**Date:** 2026-06-08
**Branch:** `docs/phase-24f-release-candidate-readiness-contract`
**Base:** `main @ aa18e4d` (post-PR #87 — Phase 24E stakeholder-graph prep/contract docs merged; Phase 24E **runtime** not yet landed).
**Posture:** Docs / spec / audit only. **No runtime change. No website change. No pricing change.** This contract is consumed by a later release-candidate hardening agent **after Phase 24E runtime merges**.
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md` (unchanged by this phase).

---

## 1. Executive goal

Prepare SourceDeck for a **limited paid pilot / buyer demo release** as a **GovCon Capture OS** — opportunity discovery through internal-review submission package, with human-approved outreach and **no autonomous submission**.

This is a **guided design-partner pilot** posture (carried from the Phase 24A readiness scorecard decision: *READY FOR PAID PILOT — not yet public sale*). It is **not** a public signed-macOS general-availability release.

---

## 2. Release candidate definition

A SourceDeck release candidate (RC) MUST include all of the following, each already shipped on `main` unless marked conditional:

| # | Surface | Anchor / evidence | Status |
|---|---|---|---|
| 1 | Stable renderer boot | `test/renderer-boot.test.js` (7/7) | shipped |
| 2 | GovCon default workflow (GovCon-primary nav) | `test/govcon-primary-navigation.test.js`, `test/govcon-mode-navigation.test.js` | shipped |
| 3 | SAM Sprint — dry-run / no-send posture | `#gc-naics-filter`; `test/sam-opportunity-sprint.test.js` | shipped |
| 4 | Response Desk — draft-only / no-send posture | "never auto-sends, never auto-submits"; `test/response-desk.test.js` (24/24) | shipped |
| 5 | Opportunity qualification (bid/no-bid, advisory) | Capture Command Center | shipped |
| 6 | Solicitation workspace (L/M/B/C/H/K shred) | `#gc-sol-workspace`; `test/govcon-solicitation-workspace.test.js` | shipped |
| 7 | Compliance matrix (per-requirement, human-approved) | `#gc-sol-matrix-table` | shipped |
| 8 | Vendor / pricing workspace | `#gc-vqr`, `#gc-pricing`; `test/govcon-vendor-pricing.test.js` | shipped |
| 9 | Past Performance Library | `#gc-pp`; `test/govcon-past-performance-capability-ui.test.js` | shipped (24D) |
| 10 | Capability Statement Studio | `#gc-cs`; local/offline extractor import | shipped (24D) |
| 11 | Stakeholder Graph | `#gc-stakeholder*` (per Phase 24E contract) | **conditional — only if Phase 24E runtime merged** |
| 12 | Submission Readiness gate (advisory, never auto-submits) | `#gc-submission`; `test/govcon-submission-readiness.test.js` (30/30) | shipped |
| 13 | Internal-review Markdown export (local Blob) | "INTERNAL REVIEW DRAFT — NOT SUBMITTED" | shipped |
| 14 | Audit log panel (Phase 24B) | `#gc-audit-log` | shipped |
| 15 | Pricing source-of-truth docs | `docs/product/pricing-source-of-truth.md` | shipped |
| 16 | No active stale pricing in app UI | no `$79` / `$349` / `$999` | verified |
| 17 | No unsupported certification / revenue / signing claims | claims grep clean | verified |

If item 11 (Stakeholder Graph runtime) has **not** merged at RC-cut time, the RC ships **without** it and the known-limitations list records *"Stakeholder Graph runtime deferred to a follow-on RC."* The RC is still valid; the Stakeholder Graph is an Operator Plus teaming surface, not a core-workflow blocker.

---

## 3. Release candidate exclusions

The RC MUST explicitly **exclude** (and must NOT contain runtime or copy implying) any of:

- Autonomous bid / quote / proposal submission.
- Email sending of any kind (no Send Email control; no SMTP path).
- Portal upload (no SAM.gov / PIEE / eBuy / GSA / agency-portal upload).
- Live SAM Sprint **unless explicitly configured AND dry-run** — never auto-send, never auto-submit.
- Website demo videos / screenshots committed to this repo.
- Guaranteed award / guaranteed revenue claims.
- FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certification claims.
- Signed / notarized / Apple-notarized / "production signed" claims — **unless an exact release-evidence artifact in that build proves it**. (Current local builds are unsigned dev builds; `scripts/release-check.js` reports macOS signing not configured. Do not claim signed/notarized for those.)
- Restored System Readiness / System Flow tab.

---

## 4. Required package artifacts

An RC package handoff MUST bundle:

1. **Release notes** — `docs/release-notes/phase-24f-prep-release-candidate-readiness.md` (this prep) + the final RC release note authored at hardening time.
2. **Pilot onboarding checklist** — `docs/product/phase-24f-buyer-pilot-readiness-checklist.md`.
3. **Support escalation checklist** — `docs/product/phase-24f-support-onboarding-contract.md` §4.
4. **Local-only export disclaimer** — verbatim "INTERNAL REVIEW DRAFT — NOT SUBMITTED" + "SourceDeck does not submit, upload, email, or transmit this package."
5. **No-send / no-submit compliance checklist** — `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`.
6. **Final test evidence summary** — `npm test` count + the seven release gates (see §5).
7. **Known limitations list** — see §6.
8. **Rollback instructions** — see §7.

---

## 5. Acceptance criteria

The RC is accepted only when ALL hold:

- All release gates pass: `release:evidence` (fail=0, warn=0), `troubleshooting:scan` (no fail/warn), `govcon:smoke` (PASS), `phase13:rc-check` (PASS), `i18n:audit` (PASS), `release-check.js` (privacy gate PASS).
- `npm test` passes (exit 0, zero ❌).
- Renderer boot passes (`renderer-boot` 7/7).
- No System Readiness / System Flow (`remove-system-readiness-tab` 9/9).
- No unsafe CTA (no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control).
- No stale pricing in active app UI (`$79` / `$349` / `$999` absent).
- No media committed (no `.mp4` / `.mov` / screenshots / `.qa` output).
- No `.env*` touched.
- Stashes untouched.

**Current evidence (this prep run, `main @ aa18e4d`):** `npm test` exit 0 (0 ❌; 1035 passing assertions observed); `release:evidence` pass=44 fail=0 warn=0 manual=3; `troubleshooting:scan` no fail/warn; `govcon:smoke` PASS; `phase13:rc-check` PASS; `i18n:audit` 31/31; `release-check.js` PASS (macOS signing-not-configured is a benign local-dev warning — see §3 on signing claims).

---

## 6. Known limitations (RC-cut baseline)

- **Stakeholder Graph runtime** deferred until Phase 24E runtime PR merges (only the 24E contract/acceptance/sample-data docs are on `main` as of this prep).
- **Buyer demo media** not recorded/committed in this repo (separate task; `docs/release-notes/phase-23*`).
- **Website integration** is a later phase in the `sourcedeck-site` repo; not part of this RC.
- **Live SAM-in-app execution** is dry-run/manual-review only; turnkey portal integrations are out of scope.
- **macOS signing / notarization** configured but not executed in dev builds — present as an *unsigned development build* unless a signed artifact with release evidence exists.
- **Legacy commercial lead/outreach tools** remain available under "Other business tools" (off the GovCon narrative); not a blocker.

---

## 7. Rollback instructions

- The RC is a tagged commit on `main`. To roll back, re-deploy/re-point to the previous known-good `main` commit (the prior RC tag or merge commit).
- No database migration and no destructive state change is introduced by the GovCon capture surfaces — all capture/workspace state is **local** (browser `localStorage`) per device, so a renderer rollback does not require a data migration.
- If a regression is found post-cut: revert the offending merge commit via `git revert <merge-sha> -m 1`, re-run the §5 gates, and re-cut. Do not hot-edit `sourcedeck.html` on a release tag.
- No Stripe/checkout/payment rollback is in scope (this phase and the RC do not touch payment).

---

## 8. Out of scope for this prep phase

This document is a **contract**, not an implementation. This phase edits **only** the five allowed Phase 24F docs. It does not touch `sourcedeck.html`, `package.json`, `package-lock.json`, `services/**`, `scripts/**`, `test/**`, `.env*`, website, payment, or deployment files, and does not touch any Phase 24E runtime file.

**Next action after Phase 24E merges:** a later agent runs the final release-candidate hardening phase using this contract + the three companion docs and the compliance checklist below.

# Phase 24J-PREP — Final RC Evidence Binder

**Date:** 2026-06-08
**Base:** `main @ 253b2a7` (post-PR #91 — Phase 24C-2 prompt NAICS parameterization).
**Posture:** Docs / spec / audit only. **No runtime change.** Consumed by the final RC hardening agent **after Phase 24I merges**.
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md` (unchanged).
**Companions:** `docs/product/phase-24f-release-candidate-packaging-contract.md`, `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`, `docs/product/phase-24j-limited-paid-pilot-handoff.md`, `docs/product/phase-24j-operator-demo-runbook.md`, `docs/product/phase-24j-public-release-no-go-boundaries.md`.

---

## 1. Executive status

**READY FOR FINAL RC HARDENING AFTER PHASE 24I.**

The full end-to-end GovCon capture workflow is shipped on `main` and green across the gate suite (see §3 evidence). The **only** known runtime dependency before final RC hardening is **Phase 24I — Final Runtime UX Polish** (SAM API key Settings-only; SAM search screen must not request the key; Stakeholder Graph live refresh on opportunity selection; Prime Partner Finder NAICS fallback profile-driven). No other runtime blocker is known.

---

## 2. Merged phase inventory

| Phase | PR | Merge commit | Outcome | Key evidence | Remaining dependency |
|---|---|---|---|---|---|
| **24B** — GovCon core hardening | #84 | `e098d6a` | Opportunity ingestion + capture workflow hardened; Audit Log panel (`#gc-audit-log`) | `govcon-core-hardening` 15/15 | none |
| **24C** — Core follow-ups (outreach/NAICS profile) | #85 | `7fc16dc` | Outreach status + profile-driven NAICS filter (`#gc-naics-filter`) | `govcon-opportunity-outreach`; NAICS profile loader | none |
| **24C-2** — Prompt-builder NAICS parameterization | #91 | `253b2a7` | Replaced hardcoded one-operator NAICS in AI prompt scaffolding with `gcPromptNaicsContext()` | `govcon-prompt-naics-parameterization` 16/16 | Phase 24C-3 follow-up: Prime Partner Finder dropdown NAICS fallback (`loadUserNaics()`) still operator-specific — out of RC scope, tracked |
| **24D** — Past Performance + Capability Studio | #86 | `c69ddac` | `#gc-pp`, `#gc-cs`; local/offline capability import; internal-review disclaimer | `govcon-past-performance-capability-ui` 15/15 | none |
| **24E** — Stakeholder Graph UI | #89 | `a4fc8b6` | `#gc-stakeholder-graph` (by-opportunity / by-agency / teaming / internal-owner); FAR-aware posture labels; restricted-window warning | `govcon-stakeholder-graph-ui` 25/25 | Phase 24I: wire live refresh to opportunity selection |
| **24F-PREP** — RC packaging contract | #88 | `229c6b6` | RC definition, exclusions, acceptance, rollback; buyer-pilot + support + no-send/no-submit compliance checklists | docs-only | none |
| **24H-PREP** — Buyer demo refresh | #90 | `0e6a05d` | End-to-end storyboard (18 scenes) + 12–15 min walkthrough script + demo QA checklist + positioning | docs-only | none |

(Also merged in this lineage: #87 Phase 24E-PREP contract docs, #83 Operating Rhythm, #82 pricing source of truth.)

---

## 3. Final RC gate list (commands for the hardening agent)

Run all on the **post-24I** `main`. The first is conditional on Phase 24I shipping its test.

```
node test/govcon-final-runtime-polish.test.js   # if present after Phase 24I
node test/govcon-prompt-naics-parameterization.test.js
node test/govcon-stakeholder-graph-ui.test.js
node test/govcon-past-performance-capability-ui.test.js
node test/govcon-core-hardening.test.js
node test/govcon-opportunity-outreach.test.js
node test/remove-system-readiness-tab.test.js
node test/renderer-boot.test.js
node test/response-desk.test.js
node test/response-desk-email-import.test.js
node test/default-state-policy.test.js
node test/sam-opportunity-sprint.test.js
npm test
npm run release:evidence
npm run troubleshooting:scan
npm run govcon:smoke
npm run phase13:rc-check
npm run i18n:audit
node scripts/release-check.js
```

**Baseline evidence captured this prep run (`main @ 253b2a7`, pre-24I):**
- `remove-system-readiness-tab` 9/9 · `renderer-boot` 7/7 · `govcon-core-hardening` 15/15 · `govcon-prompt-naics-parameterization` 16/16 · `govcon-stakeholder-graph-ui` 25/25 · `govcon-past-performance-capability-ui` 15/15 · `response-desk` 24/24 · `response-desk-email-import` 20/20 · `default-state-policy` 22/22 · `sam-opportunity-sprint` PASS.
- `npm test` exit 0 (0 ❌; 1076 passing assertions observed).
- `release:evidence` pass=44 fail=0 warn=0 manual=3 · `troubleshooting:scan` no fail/warn · `govcon:smoke` PASS · `phase13:rc-check` PASS · `i18n:audit` 31/31 · `release-check.js` PASS (macOS signing-not-configured is a benign local-dev warning — see §5 and the no-go boundaries doc).
- `test/govcon-final-runtime-polish.test.js` **not present** — Phase 24I not yet merged; that gate remains **pending**.

---

## 4. Hard RC acceptance criteria

All must hold on the post-24I `main`:

- [ ] **SAM API key setup appears only in Settings.**
- [ ] **GovCon SAM search screen does not request the API key.**
- [ ] SAM search screen **may direct the user to Settings** for key setup.
- [ ] No **Send Email** control.
- [ ] No **Submit Bid** control.
- [ ] No **Submit Quote** control.
- [ ] No **Export and submit** control.
- [ ] No **portal upload**.
- [ ] No "**package submitted**" claim.
- [ ] No **System Readiness / System Flow**.
- [ ] No **stale active pricing** (`$79` / `$349` / `$999`).
- [ ] No unsupported **compliance / revenue / signing** claims.
- [ ] **Renderer boot** passes.
- [ ] **`npm test`** passes (exit 0, zero ❌).
- [ ] **Release evidence** generated (`release:evidence` fail=0, warn=0).
- [ ] **Demo docs aligned** (Phase 24H storyboard/script/QA reflect post-24I behavior, esp. SAM key Settings-only).
- [ ] **Pricing source of truth unchanged.**
- [ ] **`.env` untouched.**
- [ ] **Stashes untouched.**

---

## 5. Remaining blockers before final RC

- **Phase 24I must merge** (SAM key Settings-only; search screen no key request; Stakeholder Graph live refresh; Prime Partner Finder NAICS fallback profile-driven).
- **Final RC hardening must re-run the full §3 gate suite on current `main`** after 24I lands — this prep's evidence is the pre-24I baseline, not the RC sign-off.
- **Public signed macOS release remains NO-GO** unless Apple signing/notarization readiness passes and release evidence references signed/notarized artifacts (current builds are unsigned dev builds; `release-check.js` reports signing not configured). See `phase-24j-public-release-no-go-boundaries.md`.
- **Present-tense watsonx live claim remains NO-GO** unless watsonx runtime evidence is `verified_ready` (redacted/presence-only) and claim copy is approved.
- **Website / public marketing alignment remains a separate phase** (in `sourcedeck-site`), not part of this RC.
- **Phase 24C-3 follow-up** (Prime Partner Finder dropdown NAICS fallback) is tracked and out of RC scope; not an RC blocker.

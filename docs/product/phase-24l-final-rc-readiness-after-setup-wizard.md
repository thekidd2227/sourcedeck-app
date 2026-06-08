# Phase 24L-PREP — Final RC Readiness After Setup Wizard

**Date:** 2026-06-08
**Posture:** Docs only. **No runtime / pricing / website change.** Consumed by the final RC hardening agent after Phase 24K merges.
**Companions:** `docs/audits/phase-24l-setup-wizard-rc-acceptance-checklist.md`, `docs/audits/phase-24j-final-rc-evidence-binder.md`, `docs/product/phase-24f-release-candidate-packaging-contract.md`, `docs/product/phase-24j-public-release-no-go-boundaries.md`.

---

## 1. What must be true after Phase 24K

- [ ] First-run **Setup Wizard implemented** (welcome → company basics → targeting → API keys → tour → confirmation).
- [ ] **First-run trigger passes** (no setup-complete state → wizard opens).
- [ ] **New-profile trigger passes** (creating a profile → wizard opens).
- [ ] **SAM.gov API key requested in the Setup Wizard and manageable in Settings.**
- [ ] **SAM search / Sprint / Outreach screen has no key input** (presence-only status + "Configure in Settings").
- [ ] **Quick Setup Tour exists.**
- [ ] **Video placeholder or existing safe local asset reference exists** (no new media committed; no external upload).
- [ ] **No-send / no-submit / no-upload boundaries pass** (per `phase-24f-no-send-no-submit-compliance-checklist.md`).
- [ ] **`npm test` green** (exit 0, zero ❌).
- [ ] **Release gates green** (`release:evidence` fail=0/warn=0, `troubleshooting:scan`, `govcon:smoke`, `phase13:rc-check`, `i18n:audit`, `release-check.js`).

## 2. Final RC sequence after Phase 24K

1. `git checkout main && git pull` — latest `main`.
2. **Confirm Phase 24K merged.**
3. Run the **setup-wizard first-run test** (`govcon-setup-wizard.test.js` + any new `…-first-run` test Phase 24K ships).
4. Run **`govcon-final-runtime-polish.test.js`** (SAM key Settings-only; stakeholder live wire-up; NAICS fallback).
5. Run **full `npm test`**.
6. Run **`npm run release:evidence`**.
7. Run **`npm run troubleshooting:scan`**.
8. Run **`npm run govcon:smoke`**.
9. Run **`npm run i18n:audit`**.
10. Run **`node scripts/release-check.js`**.
11. **Create the final RC scorecard** (gate evidence + acceptance checklist results).
12. **Cut an unsigned / dev RC** if signing evidence is absent.
13. **Do not claim a public signed release** unless evidence supports it.

## 3. Final release decision options

- **READY FOR LIMITED PAID PILOT**
- **READY FOR BUYER DEMO ONLY**
- **NOT READY**

## 4. Recommended decision rule

Mark **READY FOR LIMITED PAID PILOT** only if **all** of:
- Phase 24K passes (wizard + triggers).
- All tests pass (`npm test` exit 0).
- Setup wizard works (first-run + new-profile + reopen-from-Settings, fails open safely).
- Credential UX is correct (SAM key in Setup Wizard + Settings only; no key input on search screen; presence-only status; no exposed value; `.env` untouched).
- No unsafe CTAs (no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal upload).
- No unsupported claims (no FedRAMP/SOC2/CMMC/HIPAA/HITRUST/ISO/guaranteed-award/signed-notarized without evidence).
- Pilot docs accepted (`phase-24j-limited-paid-pilot-handoff.md`, `phase-24l-pilot-onboarding-qa-contract.md`).

Otherwise mark **READY FOR BUYER DEMO ONLY** (if the workflow is green but wizard/credential UX needs polish) or **NOT READY** (if any hard-stop in the acceptance checklist §6 fails).

## 5. Carried no-go boundaries

Unchanged from `phase-24j-public-release-no-go-boundaries.md`:
- **Public signed macOS release: NO-GO** unless Apple signing/notarization evidence proves readiness (current builds unsigned; `release-check.js` reports signing not configured).
- **Present-tense watsonx live claim: NO-GO** unless watsonx evidence is `verified_ready` (redacted/presence-only) and copy approved.
- **Website / public marketing: SEPARATE** (`sourcedeck-site`; request-access posture; no stale pricing; no unsupported claims).

## 6. Baseline evidence (this prep run, `main @ 7861152`, pre-24K)

`govcon-setup-wizard` 12/12, `govcon-final-runtime-polish` 23/23, `govcon-core-hardening` 15/15, `govcon-prompt-naics-parameterization` 16/16, `govcon-stakeholder-graph-ui` 25/25, `govcon-past-performance-capability-ui` 15/15, `response-desk` 24/24, `response-desk-email-import` 20/20, `default-state-policy` 22/22, `remove-system-readiness-tab` 9/9, `renderer-boot` 7/7, `sam-opportunity-sprint` PASS. `npm test` exit 0 (0 ❌; 1099 ✅). `release:evidence` 44/0/0, `troubleshooting:scan` no fail/warn, `govcon:smoke` PASS, `phase13:rc-check` PASS, `i18n:audit` 31/31, `release-check.js` PASS. First-run-wizard-trigger gate **pending** until Phase 24K merges.

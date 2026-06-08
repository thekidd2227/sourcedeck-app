# Phase 25A — Combined Launch Readiness Sprint

**Date:** 2026-06-08
**Phase:** 25A — Combined Launch Readiness Sprint (Build Evidence + Website Alignment + Limited Paid Pilot Launch).
**Branch:** `release/phase-25a-combined-launch-readiness`.
**Base:** `main @ 5314111` (post-PR #96 — Phase 24M final RC decision).

---

## Decision

# ✅ READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD

Public signed release remains **NO-GO** until Apple signing/notarization evidence is captured (see `docs/product/phase-25a-signed-build-evidence-result.md`).

---

## What this sprint delivered

This is a **docs-only sprint**. No app runtime code was changed. No installer was packaged. No public deploy occurred.

### App repo (`thekidd2227/sourcedeck-app`)

| Doc | Role |
|---|---|
| `docs/audits/phase-25a-combined-launch-readiness-audit.md` | Full sprint audit — gate results, credential boundary scan, no-send/no-submit safety scan, signing-evidence classification, website audit summary |
| `docs/product/phase-25a-limited-paid-pilot-launch-plan.md` | Pilot scope, offer language, onboarding sequence, support flow, escalation matrix, data/secrets rules, success metrics, bounding conditions, pilot end / re-decision date, upgrade/pricing posture |
| `docs/product/phase-25a-operator-launch-runbook.md` | Operator runbook — pre-call, install handoff, first-run setup, sample-data load, buyer walkthrough, Settings tab confirmation, hand-off, **do-not-say list**, hold conditions, post-call |
| `docs/product/phase-25a-website-alignment-audit.md` | Website audit — V2 pricing leakage findings, V1 leakage check, Stripe Price ID drift check, public-download-CTA check, signing-claim leakage check, PO-language regression check, `CLAUDE.md` rule-3 drift fix |
| `docs/product/phase-25a-signed-build-evidence-result.md` | Signing/notarization evidence classification — **UNSIGNED LIMITED PILOT READY**; signed-release NO-GO; claim rules; path to signed release |
| `docs/release-notes/phase-25a-combined-launch-readiness.md` | This release note |

### Site repo (`thekidd2227/sourcedeck-site`)

Companion PR: **#6 — `fix(pricing): align site to V3 source-of-truth (Phase 25A)`** (draft → ready, merged with the app PR).

| File | Change |
|---|---|
| `pricing/index.html` | Subscription tiers + implementation tiers + meta description updated from V2 to V3 |
| `invoice/index.html` | Pro card + Operator/Enterprise card updated from V2 to V3 |
| `assets/sd-i18n-dict.js` | English + Spanish pricing copy updated from V2 to V3 |
| `CLAUDE.md` rule 3 | Rewritten to V3 canonical with V2 deprecation note + explicit reference to `sourcedeck-app/docs/product/pricing-source-of-truth.md` |
| `sourcedeck-web.html` | Pre-existing privacy-gate violations (real-looking emails / phones / LinkedIn handles from commit `271071f`) replaced with allowlisted placeholders to unblock the Privacy + parity GitHub Actions check |

---

## Test / gate results (app repo)

| Command | Result |
|---|---|
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `npm run release:mac-signing-readiness` | ✅ scan complete; Apple credentials absent (correct local-dev posture) |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected) |

Sentinel tests all green: `setup-wizard-first-run` 35/35 · `govcon-final-runtime-polish` 23/23 · `govcon-setup-wizard` 12/12 · `govcon-operating-profile-wizard` 18/18 · `govcon-operating-profile-completeness` 21/21 · `govcon-prompt-naics-parameterization` 16/16 · `govcon-stakeholder-graph-ui` 25/25 · `govcon-past-performance-capability-ui` 15/15 · `govcon-core-hardening` 15/15 · `govcon-opportunity-outreach` 28/28 · `remove-system-readiness-tab` 9/9 · `renderer-boot` 7/7 · `response-desk` 24/24 · `response-desk-email-import` 20/20 · `default-state-policy` 22/22 · `sam-opportunity-sprint` 62/0 · `macos-signing-readiness` 19/19 · `signed-demo-build-readiness` 25/25 · `release-evidence` 20/20.

---

## Credential boundary

Per Phase 24L API-key onboarding boundary contract:

| Surface | SAM.gov API key request? |
|---|---|
| Setup Wizard Step 5 (Phase 24K) | ✅ Allowed |
| Settings → API Keys → SAM.gov API Key (Phase 24I) | ✅ Allowed |
| GovCon SAM search / SAM Sprint screen | ❌ Forbidden — confirmed removed |

No raw API key value hardcoded, printed, or constructed inline. All credential saves use `window.sd.credentials.set('<service>', …)`.

---

## No-send / no-submit / no-upload safety scan

**0 positive claims active in buyer-facing runtime.** No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload claim. No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed claim. No guaranteed-award / guaranteed-revenue / unlimited-AI claim. **0 deprecated $79 / $349 / $999 hits in `sourcedeck.html`.**

---

## Signed-build classification

**UNSIGNED LIMITED PILOT READY.** Apple Developer ID Application identity, `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`, and `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` are all absent — the correct local-dev posture; **never** to be added to this repo. Public signed release remains NO-GO until Phase 25F captures the notarization evidence binder.

---

## Bounding conditions

The limited paid pilot must pause and re-qualify if any of the following holds:

1. Public signed release claim appears anywhere.
2. SAM API key paste prompt appears on a workflow screen.
3. Any Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control is added.
4. Any FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed positive claim is added.
5. Public download CTA is added on the website.
6. Deprecated $79 / $349 / $999 pricing reappears in active UI.
7. Phase 24F no-send/no-submit compliance checklist fails on `main`.
8. `npm test` chain exits non-zero on `main`.
9. Buyer reports a credential leak.
10. Stakeholder Graph displays a real person's CO/COR/COR contact information.

---

## Boundary confirmations

- ✅ `.env` not touched (verified in both repos).
- ✅ Stashes untouched (both repos).
- ✅ No public deploy. No publish.
- ✅ No build / sign / notarization claim beyond evidence.
- ✅ No videos / screenshots / `.qa/` committed.
- ✅ `docs/product/pricing-source-of-truth.md` (app repo) not modified.
- ✅ No signed-notarized / Apple-notarized / production-signed claim made.
- ✅ No present-tense watsonx-live claim made.
- ✅ No public download CTA added.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.

---

## Signature

Phase 25A combined launch-readiness sprint is **complete**. Decision: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD.** Companion site PR (#6) merged with the V3 pricing alignment. Public signed release remains NO-GO until Phase 25F evidence is captured.

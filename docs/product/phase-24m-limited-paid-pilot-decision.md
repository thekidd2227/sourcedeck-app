# Phase 24M — Limited Paid Pilot Release Decision

**Date:** 2026-06-08
**Base:** `main @ 5637bc3`.
**Companion audit:** `docs/audits/phase-24m-final-rc-hardening-audit.md`.
**Companion scorecard:** `docs/product/phase-24m-final-rc-scorecard.md`.

---

## DECISION

# ✅ **READY FOR LIMITED PAID PILOT**

The Phase 24M final RC hardening pass — `main @ 5637bc3`, post-PR #95 — clears every criterion required by the Phase 24F packaging contract, the Phase 24J final RC evidence binder, and the Phase 24L RC acceptance checklist.

This decision is **strict**: all hard RC criteria are met, all gates pass, all credential / no-send / no-submit / no-upload boundaries are intact, and the known limitations are explicitly documented (signing/notarization, watsonx-live, website alignment) and excluded from the pilot scope.

---

## Why READY FOR LIMITED PAID PILOT (not just demo, not NOT READY)

### Criteria from Phase 24F + 24J + 24L

| Criterion | Required | Verified | Evidence |
|---|---|---|---|
| All tests pass | yes | ✅ | 26 individual tests + `npm test` exit 0 (59 tests total) |
| All release gates pass | yes | ✅ | `release:evidence` warnings=0 blockers=0; `troubleshooting:scan` no fail/warn; `govcon:smoke` 47/47; `phase13:rc-check` 16/16; `i18n:audit` 31/31; `release-check.js` privacy gate clean |
| Setup wizard passes | yes | ✅ | First-run auto-open + persistent setup-complete + new-profile fall-open + Welcome + Quick Setup Tour (15 features) + Final Confirmation checklist (5 items) + Settings reopen affordance |
| Credential boundary passes | yes | ✅ | SAM key in Setup Wizard ✅ + Settings ✅ + SAM search screen ❌; no raw key in renderer; no `.env` user-instruction; credentials grouped in 2 surfaces only |
| SAM key appears only in Setup Wizard + Settings | yes | ✅ | `out-samkey` = 0 hits in `sourcedeck.html`; `gcwiz-sam` + `s-samkey` present |
| SAM search screen has no key input | yes | ✅ | `#out-samkey-pointer` shows presence-only status + Settings-nav button only |
| No-send / no-submit / no-upload boundary passes | yes | ✅ | 3 hits in runtime, all in negative-assertion contexts; 0 positive claims |
| No unsupported claims | yes | ✅ | No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-notarized / Apple-notarized / production-signed; no guaranteed-award / guaranteed-revenue / unlimited-AI |
| Active pricing is clean | yes | ✅ | 0 hits of deprecated $79 / $349 / $999 in `sourcedeck.html` |
| Pilot onboarding docs are sufficient | yes | ✅ | Phase 24F buyer-pilot-readiness-checklist + support-onboarding-contract; Phase 24J pilot-handoff-package + operator-demo-runbook; Phase 24L pilot-onboarding-qa-contract + api-key-onboarding-boundary-contract + final-rc-readiness-after-setup-wizard |
| Public signed release limitations are clearly documented | yes | ✅ | Phase 24J `public-release-no-go-boundaries.md` documents signed-release NO-GO + watsonx-live NO-GO; this decision doc explicitly excludes both from the pilot scope |

All 11 criteria met. No "blocked by material install/support/signing/onboarding issue" — the unsigned dev-build posture is the intended state for a **limited paid pilot**, and it is documented as such.

---

## What the limited paid pilot includes

Per `docs/product/phase-24j-limited-paid-pilot-handoff.md` §3:

- GovCon Targeting / Pursuit Profile (Setup Wizard + Settings)
- SAM / SAM Sprint dry-run workflow (manual-review; never auto-send)
- Capture Command Center
- Daily Operating Rhythm
- Deadline & Q&A Calendar
- Solicitation Workspace (L/M/B/C/H/K shred)
- Compliance Matrix (per-requirement, human-marked)
- Vendor Quote Room (manual quote-request status)
- Pricing Worksheet (advisory price/margin)
- Past Performance Library
- Capability Statement Studio (local/offline import)
- Prime Partner Finder
- Stakeholder Graph (FAR-aware posture labels; restricted-window warnings)
- Submission Readiness Gate (advisory; never auto-submits)
- Internal Review Markdown Export (local; "INTERNAL REVIEW DRAFT — NOT SUBMITTED")
- Audit Log (local evidence trail)
- First-run / new-profile Setup Wizard with Quick Setup Tour
- Buyer demo walkthrough (`phase-24h-govcon-demo-walkthrough-script.md`)
- Operator demo runbook (`phase-24j-operator-demo-runbook.md`)
- Pilot onboarding QA contract (`phase-24l-pilot-onboarding-qa-contract.md`)

## What the limited paid pilot does NOT include

Per the same handoff doc §4 and per `phase-24j-public-release-no-go-boundaries.md`:

- ❌ Autonomous bid / quote / proposal submission.
- ❌ Email sending (no Send Email; no SMTP path).
- ❌ Portal upload (SAM.gov / PIEE / eBuy / GSA / agency portals).
- ❌ Award / revenue guarantee.
- ❌ Legal, contracting, compliance, or proposal advice.
- ❌ Certified compliance status (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- ❌ A public signed / notarized macOS release. **Current builds are unsigned dev builds. Do not claim "signed and notarized" / "Apple notarized" / "production signed".** This is explicitly excluded from the pilot scope.
- ❌ Present-tense "watsonx live" claim.
- ❌ Public website marketing alignment (handled separately in `sourcedeck-site` repo).

---

## Strict release-decision rule applied

> *"Be strict. Do not choose READY FOR LIMITED PAID PILOT if any hard RC blocker remains."*

A "hard RC blocker" would be one of:

1. Setup wizard runtime broken (auto-open or persistence fails).
2. SAM API key request still on a workflow screen.
3. A positive Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control or claim.
4. A positive FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-notarized / Apple-notarized / production-signed claim.
5. A positive guaranteed-award / guaranteed-revenue / unlimited-AI claim.
6. Deprecated $79 / $349 / $999 active in app UI.
7. System Readiness / `sysflow` tab restored.
8. Any test failing on `main`.
9. `npm test` non-zero exit.
10. `release:evidence` reporting a blocker (non-empty `blockers[]`).
11. `release-check.js` privacy gate dirty.

**Verification:** none of (1)–(11) hold. All hard RC blockers cleared. The pilot decision is therefore not just permissible — it is the correct decision under the strict rule.

---

## Confidence-bounding observations

The decision is "READY FOR LIMITED PAID PILOT" — not "READY FOR PUBLIC GENERAL AVAILABILITY". The **pilot scope is bounded** by:

- Unsigned dev-build distribution only (no public signed installer).
- Direct buyer relationships (operator-led onboarding using the Phase 24L pilot onboarding QA contract).
- Sample/demo data must be replaced before real proposal use (anchored in the Final Confirmation checklist item 5).
- The operator-led pilot kickoff includes the Phase 24K Quick Setup Tour walkthrough at install time.
- The pilot operator commits to NOT claiming any of the items in the §"What the limited paid pilot does NOT include" list above.

If those bounding conditions are violated — e.g., a public download CTA is exposed, or a buyer demo accidentally claims "signed and notarized" — the pilot must pause and re-qualify per Phase 24J §"Pilot hold conditions".

---

## Signature row

| Phase | Artifact | Verified |
|---|---|---|
| 24M | `docs/audits/phase-24m-final-rc-hardening-audit.md` | ✅ Audit complete; all gates green; all surfaces verified |
| 24M | `docs/product/phase-24m-final-rc-scorecard.md` | ✅ 20/20 surfaces ready; 0 blocked |
| 24M | `docs/product/phase-24m-limited-paid-pilot-decision.md` (this file) | ✅ **READY FOR LIMITED PAID PILOT** |

---

## Next phases (recommended in order)

1. **Phase 24N — Signed Build / Installer Evidence Gate.** Configure macOS signing + notarization; capture `release:mac-signing-readiness:strict` evidence; only then permit "signed and notarized" claims.
2. **Phase 24O — Website Alignment + Request Access CTA Audit.** In the `sourcedeck-site` repo, align `/pricing/` to V3 source-of-truth ($149 / $499 / $997 + Self-Install $1,497 / Guided $3,497 / DFY $5,997), confirm no "download now" / "free demo" / "try now" CTAs, surface request-access posture only.
3. **Phase 24P — Limited Paid Pilot Launch Checklist.** Wrap this decision into a concrete pilot kickoff runbook with buyer-facing CTAs, support handoff, the QA contract from Phase 24L, and a clear pilot-end re-decision date.

# Phase 25K — Website ↔ App Parity Audit

**Date:** 2026-06-10
**Audit trigger:** Manus second-pair-of-eyes audit flagged claim/evidence mismatches across the marketing site, the app, and the pricing config.
**Scope:** Read-only verification + targeted copy/config fixes. No new features. No deploy.

---

## 1. Headline finding

**Phase 25I (FAR Reference + FAR AI FAQ + Compliance Review Upload + Proposal Workspace Word/PDF export) is NOT on `main`.**

Root cause: PR #107 (Phase 25I) was opened with its base pointing at `feat/phase-25h-calendar-module` for stacked review. When PR #106 (Phase 25H) merged to `main`, PR #107's base did not auto-retarget. PR #107 then merged into the dead `feat/phase-25h-calendar-module` branch instead of `main`. The Phase 25I code lives on GitHub on a now-orphaned branch; **no Phase 25I commit is on `main`.**

Verification:

```
$ git log --oneline -5
20a1f16 feat(product): add local calendar module and GovCon task integration (Phase 25H) (#106)
d34b6e1 fix(product): clean outreach defaults and segment GovCon workspace (Phase 25F) (#105)
06d48f1 fix(packaging): include api/ and approved mark in bundle (Phase 25E.8 hotfix) (#104)
99d3b51 feat(product): clean buyer navigation and add proposal workspace (Phase 25E.2-7) (#103)
4572950 feat(product): default-collapse Other business tools + add Phase 25D logo sentinel (#102)

$ ls test/phase-25i*
ls: cannot access 'test/phase-25i*': No such file or directory
```

Required remediation (separate phase, not done in Phase 25K): re-open Phase 25I as a fresh PR targeting `main` and re-merge.

Until that recovery phase ships, **no buyer-facing material may claim FAR Reference, FAR AI FAQ, Compliance Review Upload, or Word/PDF proposal export as shipped.**

## 2. Parity matrix

| Website claim | App evidence on `main` | Runtime test on `main` | Status | Action |
|---|---|---|---|---|
| **GovCon Capture OS** | ✅ `sourcedeck.html` GovCon pane (Phase 22B–24) | ✅ `govcon-final-runtime-polish.test.js` 23/23 + 7 GovCon section sentinels | **Confirmed shipped** | Keep |
| **Request Access** | ✅ Phase 25C docs `phase-25c-master-delivery-method.md` | n/a (delivery posture) | **Confirmed** | Keep |
| **Secure web / PWA delivery** | ✅ Documented in `phase-25c-secure-web-pwa-delivery-contract.md` | n/a (future delivery contract) | **Pilot-scoped** | Keep — clearly documented as future delivery |
| **Calendar module (Phase 25H)** | ✅ `sourcedeck.html` Calendar pane | ✅ 4 sentinels / 38 assertions | **Confirmed shipped** | Keep |
| **FAR Reference (Phase 25I)** | ❌ **NOT on main** | ❌ `test/phase-25i-*` absent | **NOT shipped** | Remove from public copy / mark roadmap |
| **FAR AI FAQ (Phase 25I)** | ❌ NOT on main | ❌ absent | **NOT shipped** | Remove from public copy / mark roadmap |
| **Upload review (Phase 25I)** | ❌ NOT on main | ❌ absent | **NOT shipped** | Remove from public copy / mark roadmap |
| **Proposal Workspace (Phase 25E.2)** | ✅ `sourcedeck.html` Proposal Workspace pane | ✅ `phase-25e-proposal-workspace.test.js` 14/14 | **Confirmed shipped** | Keep |
| **Markdown export (Phase 25E.2)** | ✅ `pwExportInternalReview()` in renderer | ✅ assertion in Phase 25E.2 sentinel | **Confirmed shipped** | Keep |
| **Word export (Phase 25I)** | ❌ NOT on main | ❌ absent | **NOT shipped** | Remove from public copy / mark roadmap |
| **PDF export (Phase 25I)** | ❌ NOT on main | ❌ absent | **NOT shipped** | Remove from public copy / mark roadmap |
| **Vendor / Subcontractor Workspace (Phase 22D)** | ✅ Vendor Quote Room + Pricing Worksheet | ✅ `govcon-vendor-pricing.test.js` | **Confirmed shipped** | Keep |
| **Submission Readiness Gate (Phase 22F)** | ✅ Submission Readiness section | ✅ `govcon-submission-readiness.test.js` | **Confirmed shipped** | Keep |
| **Internal Review Export (Phase 23D)** | ✅ `gcExportInternalReviewMarkdown()` | ✅ Phase 25E.2 sentinel | **Confirmed shipped** | Keep |
| **Leads / Pipeline** | ✅ Leads pane + Pipeline pane | ✅ `phase-25e-leads-workspace.test.js` | **Confirmed shipped** | Keep |
| **AI provider / API-key posture (Phase 24L)** | ✅ Setup Wizard Step 6 + Settings | ✅ `credential-boundary-openai-claude.test.js` | **Confirmed shipped** | Keep |
| **No public download** | ✅ Phase 25C delivery method | ✅ `phase-25f-buyer-safe-navigation.test.js` 8/8 | **Confirmed** | Keep |
| **Pricing (V3: Solo $149 / Operator $499 / Plus $997)** | ✅ `pricing-source-of-truth.md` | ✅ `govcon-pricing-positioning.test.js` | **Confirmed** | Keep |
| **Compliance / security claims** | ⚠ Website `security/index.html` correct; `compliance/index.html` says SOC 2 "in progress" + HIPAA BAA + FedRAMP-ready | n/a | **Needs reconciliation** | Update `compliance/index.html` to match security page |

## 3. Statuses summary

| Status | Count | Detail |
|---|---|---|
| Confirmed shipped | 13 | Keep current website claims |
| NOT shipped (claim must be removed) | 6 | FAR Reference, FAR AI FAQ, Upload review, Word export, PDF export, FAR compliance review |
| Pilot-scoped (kept with future-tense language) | 1 | Secure web / PWA delivery |
| Needs reconciliation | 1 | `compliance/index.html` |

## 4. Website pricing-config audit

| Surface | Current state | Action |
|---|---|---|
| `pricing/index.html` | ✅ V3 correct (Solo Capture $149 / GovCon Operator $499 / Operator Plus $997) | No change |
| `invoice/index.html` | ✅ V3 (Phase 25A site PR #6 fixed) | No change |
| `assets/sd-i18n-dict.js` | ✅ V3 in Phase 25A | No change |
| `assets/sd-config.js` | ❌ Still has V2 Stripe Price IDs as `live` (line 31: `LIVE pricing (v2 — outcome-based $79 / $349 / $999)`) | **Reframe comment**: V2 IDs are server-side grandfathered only; not "LIVE pricing" |
| `assets/social/capture.html` line 68 | ❌ `Core $79 · Pro $349 · Operator $999` in active markup | **Update to V3** or **archive the file** |
| `assets/social/capture.html` lines 148–150 | ❌ Full V2 pricing cards in social capture template | **Update to V3** |
| `server/src/services/ai/mock.js` lines 61, 75 | ❌ V2 mock data | Out of scope for Phase 25K (not a buyer-facing surface; mock service) |

## 5. Website compliance / security copy audit

### `security/index.html` — ✅ Posture is correct

> SourceDeck is **not** SOC 2, HIPAA, FedRAMP, ISO 27001, CMMC, or HITRUST certified. We are happy to participate in customer security reviews and to track concrete commitments toward formal certification when a paying enterprise contract requires it.

This language is the model. The compliance page should align to it.

### `compliance/index.html` — ❌ Posture is overclaimed

The page carries three "in progress" claims that contradict the security page:

| Claim (line) | Issue |
|---|---|
| Line 116: `<div class="status progress">SOC 2 Type II · in progress</div>` | No formal audit has been opened. "In progress" implies active audit. |
| Line 137: `<div class="status progress">MedPilot vertical · in progress</div>` followed by HIPAA BAA detail | HIPAA BAA is described as "limited availability in Operator tier" — implies a BAA can be signed today. No BAA infrastructure is shipped. |
| Lines 145–147: "FedRAMP-ready posture" + "Targeting FedRAMP Moderate equivalency for GovCon workloads. Currently tracked against NIST 800-171 and CMMC Level 2 controls" | "FedRAMP-ready" is interpreted by procurement as "FedRAMP authorized soon." NIST 800-171 / CMMC L2 tracking is operator-internal posture, not a ship-ready claim. |

**Recommended replacement (matching security page voice):**

> Compliance certifications — not held
>
> SourceDeck is not SOC 2 Type II, HIPAA, FedRAMP, ISO 27001, CMMC, or HITRUST certified. Formal audit work begins only when a paying enterprise contract requires it. We are happy to participate in customer security reviews and to commit to specific remediation milestones under a signed MSA.
>
> What we publish today:
> - The security posture page above (single source of truth for shipped vs. partial vs. planned).
> - A DPA template available under a signed MSA.
> - Retention and deletion paths documented in the security posture page.
>
> What we do not publish today:
> - Active SOC 2 Type II report.
> - Signed HIPAA BAA.
> - FedRAMP authorization or ATO.
> - CMMC Level 2 certification.
>
> When a paying enterprise contract requires any of the above, we will commit to a specific remediation timeline and a specific evidence-delivery date under a signed MSA. Until then, we do not claim certifications we do not hold.

## 6. App-repo claim audit

| Doc | Issue |
|---|---|
| `docs/product/phase-25j-enterprise-pricing-recommendation.md` (just landed in PR #108) | Lists Phase 25I features (FAR Reference, FAR AI FAQ, Compliance Review, Word/PDF export) in the §10 feature-value matrix as if shipped |
| `docs/product/phase-25j-website-enterprise-pricing-alignment.md` | Recommended Team 5 card copy mentions "FAR Reference + AI FAQ + Compliance Review" as Team 5 inclusion |

Both of those docs claim Phase 25I as shipped. They need a soften pass. **Recommended Phase 25K fix:** add a clarification note to those docs (instead of removing/rewriting), pointing to this parity audit and stating the Phase 25I features are "pending recovery merge" rather than "shipped today."

## 7. Final assessment

| Concern | Status |
|---|---|
| Phase 25I claimed but not shipped on `main` | ❌ Real blocker. Recovery phase required. |
| Website public pricing matches commercial config | ⚠ Pricing page is V3; sd-config and social/capture still have V2. Fix in this phase. |
| Compliance copy reconciled with security copy | ❌ Real blocker. Fix in this phase. |
| No public checkout for Enterprise | ✅ Pricing page routes to `/quote/operator/` and `/quote/pro/`; no direct Stripe Checkout |
| No public download CTA | ✅ Verified absent |
| No free demo / try-now CTA | ✅ Verified absent |
| Phase 25C delivery method preserved | ✅ Request Access posture intact |
| Phase 25A no-send / no-submit / no-upload | ✅ Sentinel preserved |

## 8. Recommended actions

| Action | Repo | File | Phase |
|---|---|---|---|
| 1. Document Phase 25I gap in audit (this file) | sourcedeck-app | `docs/audits/phase-25k-website-app-parity-audit.md` | This phase |
| 2. Create paid-pilot readiness gate doc | sourcedeck-app | `docs/audits/phase-25k-paid-pilot-readiness-gate.md` | This phase |
| 3. Create paid-pilot delivery posture doc | sourcedeck-app | `docs/product/phase-25k-paid-pilot-delivery-posture.md` | This phase |
| 4. Reframe `sd-config.js` V2 Stripe ID comment | sourcedeck-site | `assets/sd-config.js` | This phase |
| 5. Update `assets/social/capture.html` V2 → V3 pricing | sourcedeck-site | `assets/social/capture.html` | This phase |
| 6. Rewrite `compliance/index.html` to match security page voice | sourcedeck-site | `compliance/index.html` | This phase |
| 7. Re-merge Phase 25I onto `main` | sourcedeck-app | New PR re-targeting `main` | **Separate recovery phase** |
| 8. Add Phase 25I-recovery PR to Phase 25J pricing recommendation as Item 9 of owner approval list | sourcedeck-app | `docs/product/phase-25j-enterprise-pricing-recommendation.md` § 18 | This phase or after recovery |

## 9. Status

Pending Phase 25K execution: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD** holds, but the FAR Reference / Word/PDF export claims must not be used in any buyer communication until Phase 25I recovery merges to `main`.

---

## Signature

Phase 25K parity audit confirms 13 shipped surfaces, identifies 6 unshipped surfaces incorrectly claimed (Phase 25I features), and flags `compliance/index.html` + `assets/sd-config.js` + `assets/social/capture.html` for targeted copy/config fixes. Phase 25I recovery is a separate phase.

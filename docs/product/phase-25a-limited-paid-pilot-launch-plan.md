# Phase 25A — Limited Paid Pilot Launch Plan

**Date:** 2026-06-08
**Companion audit:** `docs/audits/phase-25a-combined-launch-readiness-audit.md`.
**Companion runbook:** `docs/product/phase-25a-operator-launch-runbook.md`.

---

## FINAL STATUS

# ✅ READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD

The Phase 25A combined launch-readiness sprint clears every criterion required by the Phase 24F packaging contract, the Phase 24J RC evidence binder, the Phase 24L RC acceptance checklist, the Phase 24M final RC hardening pass, and the Phase 24N signed-build evidence gate.

The unsigned dev-build posture is the intended state for a limited paid pilot. **Public signed release remains NO-GO** until macOS signing/notarization evidence is captured.

---

## Pilot scope

### Pilot buyer type

- Small / mid GovCon SMB primes (sub-$10M revenue) running 1–5 active pursuits.
- Operators willing to receive an unsigned dev build via a direct buyer relationship (NOT public download).
- Buyers who explicitly accept the **no-send / no-submit / no-upload** posture: SourceDeck prepares internal-review materials; the operator approves and acts externally.

### Offer language (verbatim, operator-approved)

> SourceDeck helps you organize GovCon pursuits from opportunity discovery to internal-review package. You stay in control of every send, upload, submission, and decision. The current build is an **unsigned development RC** — it ships through a direct pilot relationship, not a public download. You receive the same product surfaces the buyer demo shows: Capture Command Center, Operating Rhythm, Solicitation Workspace, Vendor Quote Room, Past Performance Library, Capability Statement Studio, Prime Partner Finder, Stakeholder Graph, Submission Readiness Gate, Audit Log, and Response Desk. Internal-review markdown export is local-only. SourceDeck does not submit bids, send emails, or upload to portals on your behalf.

### Onboarding sequence (per Phase 24L pilot onboarding QA contract)

1. Operator-led install handoff (unsigned dev build; operator walks buyer through Gatekeeper "open anyway" if applicable).
2. Buyer launches app cold. **First-run setup wizard auto-opens** (Phase 24K).
3. Buyer enters company basics (Step 2), capability statement paste/skip (Step 3), GovCon targeting profile (Step 4).
4. Buyer enters SAM.gov API key in **Step 5** OR skips and the operator confirms they can add it later via **Settings → API Keys → SAM.gov API Key**.
5. Buyer skips optional AI / Creative / Social steps if not yet needed.
6. Buyer reviews Step 9 safety & approval rules.
7. Buyer reviews **Step 10 Quick Setup Tour** (15 features).
8. Buyer checks **all 5 Final Confirmation items** in Step 11.
9. App lands buyer on GovCon Capture OS default view.
10. Operator opens Settings tab and confirms API-key management area exists (`#tab-settings`).
11. Operator loads sample/demo data for the walkthrough (Phase 23A Demo Mode).
12. Operator walks buyer through Capture Command Center → Solicitation Workspace → Past Performance / Capability Studio → Submission Readiness Gate.
13. Operator demonstrates Internal Review Markdown Export.
14. Operator demonstrates Audit Log panel (Phase 24B).
15. Operator hands off the Phase 24L pilot QA contract + Phase 24J operator demo runbook to the buyer's GovCon lead.

### Support flow

- **Tier 1 (operator):** all pilot questions go to the assigned pilot operator first.
- **Tier 2 (engineering):** escalate via `info@arivergroup.com` for product defects, RC blockers, or credential-boundary questions.
- **No public support portal.** No buyer-facing GitHub issues. No buyer-facing Slack channel.
- **Response time target:** business-day for Tier 1; 48-hour for Tier 2.

### Issue escalation matrix

| Issue type | Tier 1 (operator) | Tier 2 (engineering) | Block-the-pilot? |
|---|---|---|---|
| Operator confused by a screen | ✅ | — | No |
| Setup wizard fails to auto-open | ⚠️ | ✅ | No (operator opens via Settings button) |
| SAM key not persisting | ⚠️ | ✅ | No (manual re-save) |
| Renderer fails to boot | — | ✅ | **YES — pause pilot** |
| Stakeholder Graph shows a real CO/COR name | — | ✅ | **YES — Phase 24E safety violation; pause pilot** |
| Any Send Email / Submit Bid / Submit Quote control appears | — | ✅ | **YES — RC blocker; pause pilot** |
| Any "signed and notarized" claim appears | — | ✅ | **YES — Phase 24N rule violation; pause pilot** |

### Data / secrets rules

- **No API key may be printed, emailed, screenshotted, or shared.** All credentials enter via Setup Wizard or Settings only.
- **No `.env` file shall be shared between operator and buyer.** Each buyer has their own keys.
- **No buyer credential is read or stored by the operator.** Operator may verbally confirm a key is set ("SAM.gov key: configured ✓") but never sees the value.
- **No buyer pursuit data is exfiltrated** by the operator. All buyer data stays in the buyer's local app instance.
- **Sample/demo data must be cleared** before any real proposal use (Phase 24K Final Confirmation item 5).

### SAM.gov API key setup posture

Per the Phase 24L API-key onboarding boundary contract:

- ✅ **Setup Wizard Step 5** — buyer enters their own SAM.gov key.
- ✅ **Settings → API Keys → SAM.gov API Key** — buyer updates it later if needed.
- ❌ **GovCon SAM search / SAM Sprint screen** — never requests, never displays.
- ❌ **No paste-here UX on any workflow / demo / export / log surface.**

### No-send / no-submit / no-upload warning (verbatim, operator must state)

> SourceDeck prepares internal review materials. The user decides, approves, sends, uploads, and submits outside SourceDeck.

> You can add the SAM.gov API key during setup or later in Settings. The SAM search screen does not ask you to paste credentials.

> The current build is an unsigned development RC. Do not claim "signed and notarized" / "Apple notarized" / "production signed" until signing/notarization evidence is captured.

### Pilot success metrics

| Metric | Target | Source |
|---|---|---|
| First-run setup wizard completion | ≥ 80% of pilot buyers complete Step 11 | localStorage `sd.govcon.setupComplete` flag persistence |
| SAM.gov key configured | ≥ 60% within 7 days | `window.sd.credentials.status()` → `present['sam-gov']` |
| At least one solicitation analyzed | ≥ 40% within 30 days | Audit Log event count for SOLICITATION_ANALYZED |
| At least one Submission Readiness Gate run | ≥ 30% within 30 days | Audit Log event count for SUBMISSION_READINESS_RUN |
| No pilot hold condition triggered | 100% | Operator escalation tracker |
| No safety-claim violation | 100% | Phase 24F no-send/no-submit checklist |

### Pilot end / re-decision date

- **Initial pilot window:** 30 days from buyer kickoff.
- **Re-decision checkpoint:** Day 21 — operator confirms with buyer that the no-send/no-submit posture is acceptable, that the unsigned-build limitation is understood, and that no pilot hold condition has been triggered.
- **Pilot extension:** allowed only after the re-decision checkpoint clears, in 30-day increments.
- **Pilot end → public release path:** requires Phase 24N signing/notarization evidence + Phase 24O website alignment merged + Phase 24P launch checklist run.

### Upgrade / pricing discussion posture

Per `docs/product/pricing-source-of-truth.md` (Phase 22A-P V3 canonical):

| Tier | Pricing | Pilot fit |
|---|---|---|
| Solo Capture | $149/mo | First-time pilot buyers |
| GovCon Operator | $499/mo or $4,990/yr | Most pilot buyers; recommended |
| Operator Plus | $997/mo or $9,970/yr | BD-as-a-service pilots; multi-client |
| Enterprise | custom | Out-of-scope for pilot |
| Self-Install Implementation | $1,497 one-time | Optional service |
| Guided Implementation | $3,497 one-time | Recommended for first pilot buyers |
| DFY Implementation | $5,997 one-time | Optional service |

**No discount language. No guaranteed-outcome language. No certified-compliance language.** Pilot pricing is the same as documented public pricing.

---

## Bounding conditions for the pilot

The pilot **must pause and re-qualify** if any of the following holds:

1. Public signed release claim appears anywhere (Phase 24N NO-GO).
2. SAM API key paste prompt appears on a workflow screen.
3. Any Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control is added.
4. Any FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed positive claim is added.
5. Public download CTA is added on the website (`Download now`, `Free demo`, `Try now`, `Get started free`).
6. Deprecated $79 / $349 / $999 pricing reappears in active UI.
7. Phase 24F no-send/no-submit compliance checklist fails on `main`.
8. `npm test` chain exits non-zero on `main`.
9. Buyer reports a credential leak (real key value in any surface, log, or export).
10. Stakeholder Graph displays a real person's CO/COR/COR contact information.

---

## Companion docs (this PR)

| Doc | Role |
|---|---|
| `docs/audits/phase-25a-combined-launch-readiness-audit.md` | Full sprint audit |
| `docs/product/phase-25a-limited-paid-pilot-launch-plan.md` (this file) | Pilot offer, scope, onboarding, support, escalation, success metrics, bounding conditions |
| `docs/product/phase-25a-operator-launch-runbook.md` | Pre-call / install / setup-wizard / workflow / export / support / do-not-say list / hold conditions |
| `docs/product/phase-25a-website-alignment-audit.md` | Website audit + V3 pricing alignment + companion site PR URL |
| `docs/product/phase-25a-signed-build-evidence-result.md` | Signing readiness classification + claim rules |
| `docs/release-notes/phase-25a-combined-launch-readiness.md` | Release note |

---

## Signature

Phase 25A combined launch-readiness sprint is complete. **Decision: READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD.**

Pilot scope is bounded. Public signed release remains NO-GO. Website alignment companion PR is open at `thekidd2227/sourcedeck-site#6`.

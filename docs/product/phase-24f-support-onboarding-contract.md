# Phase 24F-PREP — Support & Onboarding Contract

**Date:** 2026-06-08
**Posture:** Docs only. **No runtime / pricing / website change.** Consumed by pilot support staff and the release-candidate hardening agent.
**Companion:** `docs/product/phase-24f-release-candidate-packaging-contract.md`, `docs/product/phase-24f-buyer-pilot-readiness-checklist.md`, `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`.

---

## 1. Support posture

- Pilot support is **product / onboarding support**, not legal or proposal advice.
- **SourceDeck does not submit and does not certify.** It prepares internal-review material; the user submits externally.
- SourceDeck **does not replace** legal, contracting, compliance, or proposal professionals. Support staff must not present it as a substitute for any of those.
- Support staff must hold the line on the no-send / no-submit / no-upload boundary at all times (see the compliance checklist).

---

## 2. Onboarding roles

| Role | Responsibility in the pilot |
|---|---|
| **Buyer / admin** | Owns the account, install/access, and the targeting/Pursuit Profile. |
| **Capture owner** | Drives opportunity intake, qualification, and capture workflow. |
| **Proposal reviewer** | Reviews drafts, compliance matrix, and the internal-review export before any external use. |
| **Vendor coordinator** | Manages vendor / subcontractor candidates and manual quote-request status. |
| **Internal approver** | Records final human approval; confirms nothing is auto-sent/auto-submitted. |

A single owner-operator may hold several of these roles; the roles are responsibilities, not required seats.

---

## 3. Required onboarding flow

1. **Install / access** — provision the build (unsigned dev build for pilot) and confirm renderer boot.
2. **Targeting setup** — create the Pursuit Profile; configure NAICS per entitlement.
3. **Sample demo walkthrough** — run the labeled `SAMPLE` GovCon data end-to-end.
4. **First real opportunity intake** — add the buyer's first real opportunity.
5. **Qualification review** — bid/no-bid (advisory; operator decides).
6. **Compliance matrix review** — confirm requirements captured and human-marked.
7. **Package export review** — generate the internal-review Markdown; confirm the "INTERNAL REVIEW DRAFT — NOT SUBMITTED" header.
8. **Support check-in** — confirm the no-send/no-submit boundary is understood and there are no open hold conditions (buyer-pilot checklist §F).

---

## 4. Support escalation checklist

Escalate / triage the following classes of issue:

- **Renderer boot issue** — app fails to load / SyntaxError → verify with `node test/renderer-boot.test.js`; capture console; do not hot-edit a release tag.
- **Missing targeting profile** — empty NAICS / "Configure NAICS in Settings → GovCon Targeting" prompt → walk the buyer through targeting setup.
- **SAM dry-run failure** — Sprint errors or returns nothing → confirm dry-run/manual-review posture; verify with `node test/sam-opportunity-sprint.test.js`; never switch to live/auto-send to "fix" it.
- **Export payload issue** — Markdown export malformed / missing disclaimer → confirm "INTERNAL REVIEW DRAFT — NOT SUBMITTED" + "SourceDeck does not submit, upload, email, or transmit this package."
- **Audit log issue** — `#gc-audit-log` panel empty/incorrect → confirm the Phase 24B audit log panel is present.
- **Response Desk confusion** — user expects it to send → restate "never auto-sends, never auto-submits, and never dispatches email."
- **Stale pricing / website claim** — any `$79 / $349 / $999` or off-source-of-truth price surfaced → correct to `docs/product/pricing-source-of-truth.md`; file a docs fix.
- **Unsafe user expectation** — autonomous submission / agency emailing / certification / guaranteed award → reset to the buyer-pilot positioning and hold conditions.

---

## 5. What support must NOT do

- **Send emails** on the buyer's behalf.
- **Submit proposals / bids / quotes** to any agency or portal.
- **Upload to portals** (SAM.gov / PIEE / eBuy / GSA / agency portals).
- **Promise award outcomes** or revenue.
- **Certify compliance status** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO, or any other).
- **Modify `.env` without authorization.**
- **Expose secrets** (keys, tokens, credentials) in any channel.
- **Run a live SAM Sprint without explicit approval** — default is dry-run / manual-review.

Any request that would require one of the above is a **hard stop**: restate the no-send/no-submit boundary and escalate to product, not to a workaround.

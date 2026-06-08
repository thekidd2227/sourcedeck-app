# Phase 24F-PREP — Buyer Pilot Readiness Checklist

**Date:** 2026-06-08
**Posture:** Docs only. Consumed by the release-candidate hardening agent and by pilot onboarding. **No runtime / pricing / website change.**
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md`.
**Companion:** `docs/product/phase-24f-release-candidate-packaging-contract.md`, `docs/product/phase-24f-support-onboarding-contract.md`.

---

## A. Ideal pilot buyer

- Small GovCon contractor (SMB prime or emerging small business).
- Service contractor (IT, professional services, facilities, logistics, etc.).
- Capture manager **or** owner-led business running capture themselves.
- Needs: **SAM discovery, opportunity qualification (bid/no-bid), solicitation review, compliance matrix, vendor / subcontractor sourcing, and internal package creation** — and wants a human-in-the-loop workspace, not an autopilot.

Best-fit tier mapping (per `pricing-source-of-truth.md`): **Solo Capture ($149/mo)** for a single owner-operator first pursuits; **GovCon Operator ($499/mo)** for an active capture team running multiple pursuits. (Stakeholder Graph + Submission Package Export live in **Operator Plus ($997/mo)**.)

---

## B. Pilot offer (exact positioning)

> **"SourceDeck GovCon OS — opportunity discovery to internal-review submission package, with human-approved outreach and no autonomous submission."**

Use this positioning verbatim. Do not append guarantee, certification, or "auto-submit" language.

---

## C. Pilot boundaries

- SourceDeck **helps organize and draft**.
- The **user reviews** every output.
- The **user submits externally** (SAM.gov / PIEE / eBuy / GSA / agency portal) — SourceDeck does not.
- The **user sends emails externally** from their own mail client — SourceDeck does not send.
- The **user controls** SAM.gov / portals / agency communication.
- **No guarantee of award.** SourceDeck improves preparation discipline; it does not promise wins or revenue.

---

## D. Pilot onboarding checklist

Sequence for a new pilot buyer (each step is operator-driven; nothing auto-runs):

1. Install / build access (unsigned development build for pilot, per RC contract §3/§6).
2. Create a GovCon targeting / Pursuit Profile.
3. Configure NAICS (Solo/Free entitlement = 1 NAICS; paid entitlements = multi-NAICS).
4. Load the sample GovCon demo data (clearly labeled `SAMPLE`) for a guided walkthrough.
5. Add the first real opportunity.
6. Qualify the opportunity (bid/no-bid; advisory — operator decides).
7. Add vendor / subcontractor candidates (Vendor Quote Room; "requested manually").
8. Add past performance records (Past Performance Library).
9. Build a capability statement draft (Capability Statement Studio; internal-review draft).
10. Review the stakeholder map **if Phase 24E runtime is merged** (otherwise skip — deferred).
11. Run Submission Readiness (advisory red/yellow/green; never auto-submits).
12. Export the internal-review package (local Markdown; "INTERNAL REVIEW DRAFT — NOT SUBMITTED").
13. The user manually submits externally **if** they choose to — outside SourceDeck.

---

## E. Pilot success metrics

- **Time to qualify** an opportunity (intake → bid/no-bid decision).
- **Completeness of the compliance matrix** (requirements captured vs. solicitation).
- **Number of missing submission items identified** by the Submission Readiness gate.
- **Vendor quote readiness** (candidates + manual quote-request status tracked).
- **Past performance match clarity** (relevant citations surfaced and tailored).
- **Internal-review export usefulness** (does the package shorten internal review?).
- **No-send / no-submit boundary understood** by the user (no surprise that SourceDeck never submits/sends).

---

## F. Pilot hold conditions

Do **not** advance / sell the pilot — pause and re-qualify — if the buyer expects any of:

- Autonomous submission of bids/quotes/proposals.
- SourceDeck to email contracting officers / CORs / officials on their behalf.
- Certified compliance status (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- Guaranteed award / guaranteed revenue.
- Production portal-upload integration (SAM.gov / PIEE / eBuy / GSA write access).
- A substitute for legal / contracting / proposal review before using drafts externally.

If any hold condition is present, the support/onboarding contract (§5 "What support must not do") and the no-send/no-submit compliance checklist govern the conversation: reset expectations to the §B positioning before proceeding.

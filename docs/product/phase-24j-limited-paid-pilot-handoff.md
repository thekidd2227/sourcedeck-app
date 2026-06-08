# Phase 24J-PREP — Limited Paid Pilot Handoff Package

**Date:** 2026-06-08
**Posture:** Docs only. **No runtime / pricing / website change.** Consumed by pilot delivery + the final RC hardening agent.
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md`.
**Companions:** `docs/audits/phase-24j-final-rc-evidence-binder.md`, `docs/product/phase-24f-buyer-pilot-readiness-checklist.md`, `docs/product/phase-24f-support-onboarding-contract.md`, `docs/product/phase-24j-operator-demo-runbook.md`.

---

## 1. Pilot offer

> **"SourceDeck GovCon OS — opportunity discovery to internal-review submission package, with human-approved outreach and no autonomous submission."**

Use verbatim. Do not append guarantee, certification, or auto-submit language.

---

## 2. Buyer fit

- Small GovCon contractor (SMB prime / emerging small business).
- Service contractor (IT, professional services, facilities, logistics, etc.).
- Capture manager running multiple pursuits.
- Owner-led SDVOSB / HUBZone / 8(a)-style firm.
- Teams that need a **structured pursuit workflow before hiring full proposal staff**.

Tier mapping (per `pricing-source-of-truth.md`): Solo Capture ($149/mo) for a single owner-operator; GovCon Operator ($499/mo) for an active team; Operator Plus ($997/mo) adds Submission Package Export + the Teaming/Stakeholder Graph workspace.

---

## 3. What the buyer gets

- GovCon Targeting / Pursuit Profile.
- SAM / SAM Sprint **dry-run** workflow (manual-review; never auto-send).
- Capture Command Center.
- Daily Operating Rhythm.
- Deadline & Q&A Calendar.
- Solicitation Workspace (L/M/B/C/H/K shred).
- Compliance Matrix (per-requirement, human-marked).
- Vendor Quote Room (manual quote-request status).
- Pricing Worksheet (advisory price/margin).
- Past Performance Library.
- Capability Statement Studio (local/offline import).
- Prime Partner Finder.
- Stakeholder Graph (FAR-aware posture labels; restricted-window warnings).
- Submission Readiness Gate (advisory; never auto-submits).
- Internal Review Markdown Export (local; "INTERNAL REVIEW DRAFT — NOT SUBMITTED").
- Audit Log (local evidence trail).
- A buyer demo walkthrough (`phase-24h-govcon-demo-walkthrough-script.md`).
- An onboarding checklist (`phase-24f-buyer-pilot-readiness-checklist.md`).

---

## 4. What the buyer does NOT get

- Autonomous bid / quote / proposal submission.
- Email sending (no Send Email; no SMTP path).
- Portal upload (SAM.gov / PIEE / eBuy / GSA / agency portals).
- Award / revenue guarantee.
- Legal, contracting, compliance, or proposal advice.
- Certified compliance status (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- A public signed / notarized macOS release (current builds are unsigned dev builds) — unless separate signing/notarization evidence exists.

---

## 5. Pilot onboarding steps

1. Install / access (unsigned dev build for the pilot).
2. **Settings** setup (confirm renderer boot; review credential boundary).
3. **SAM.gov API key setup in Settings only** — the SAM search screen does not request the key; it directs to Settings. Key is saved presence-only through the secure main-process credential boundary; the raw key never returns to the page or logs.
4. GovCon Targeting setup (NAICS per entitlement: Solo/Free = 1 NAICS; paid = multi-NAICS).
5. Sample demo data walkthrough (labeled `SAMPLE DEMO DATA`).
6. First real opportunity intake.
7. Qualification (bid/no-bid; advisory — operator decides).
8. Compliance review (matrix per-requirement; defaults to Draft).
9. Vendor / pricing workflow (manual quote status; advisory pricing).
10. Past performance / capability workflow (library + studio; local import).
11. Stakeholder planning (graph; respect restricted-communication windows).
12. Submission readiness (advisory red/yellow/green).
13. Internal-review export (local Markdown).
14. Buyer submits externally **if** they choose — outside SourceDeck.

---

## 6. Pilot success metrics

- Time to qualify an opportunity (intake → bid/no-bid).
- Number of compliance gaps identified by the matrix + readiness gate.
- Quote / vendor readiness (candidates + manual quote status tracked).
- Past performance match clarity (relevant citations surfaced and tailored).
- Stakeholder planning clarity (roles + posture understood; restricted windows respected).
- Internal package completeness (export shortens internal review).
- Buyer understanding of the **no-send / no-submit** boundary (no surprise that SourceDeck never submits/sends/uploads).

---

## 7. Hold conditions (pause and re-qualify)

Carried from `phase-24f-buyer-pilot-readiness-checklist.md` §F: pause if the buyer expects autonomous submission, agency emailing, certified compliance, guaranteed award/revenue, production portal upload, or a substitute for legal/proposal review. Reset to the §1 positioning before proceeding.

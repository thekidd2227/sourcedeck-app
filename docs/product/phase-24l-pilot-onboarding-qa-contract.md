# Phase 24L-PREP — Pilot Onboarding QA Contract

**Date:** 2026-06-08
**Posture:** Docs only. **No runtime / pricing / website change.** Consumed by pilot delivery + the final RC hardening agent after Phase 24K merges.
**Companions:** `docs/audits/phase-24l-setup-wizard-rc-acceptance-checklist.md`, `docs/product/phase-24l-api-key-onboarding-boundary-contract.md`, `docs/product/phase-24j-limited-paid-pilot-handoff.md`, `docs/product/phase-24j-operator-demo-runbook.md`.

---

## 1. Pilot onboarding purpose

Prepare a first **paid pilot** user to configure SourceDeck without confusion — install, set up a profile, manage credentials in the right place, and reach the GovCon Capture OS — while keeping the no-send / no-submit boundary explicit throughout.

---

## 2. Required pilot onboarding sequence

1. Launch app.
2. First-run **Setup Wizard appears** automatically.
3. Enter **company basics**.
4. Enter **GovCon targeting profile** (NAICS, set-asides, capabilities).
5. Add **SAM.gov API key in the Setup Wizard** — or skip and add later in **Settings**.
6. Confirm the **SAM search / Sprint / Outreach screen does not request the API key** (it shows presence-only status + a "Configure in Settings" button).
7. Review the **Quick Setup Tour**.
8. Complete the **final confirmation checklist**.
9. Land on the **GovCon Capture OS**.
10. Open **Settings** and confirm the **API key management area exists** (SAM.gov + other providers).
11. Load **sample / demo data only** for the walkthrough (`SAMPLE DEMO DATA` banner).
12. Run through the **GovCon capture workflow** (Command Center → Operating Rhythm → Solicitation/Compliance → Vendor/Pricing → Past Performance/Capability → Prime/Stakeholder → Submission Readiness).
13. **Export the internal review package** (local Markdown; "INTERNAL REVIEW DRAFT — NOT SUBMITTED").
14. The user **submits externally only if desired** — outside SourceDeck.

---

## 3. What the operator must say

> **"SourceDeck prepares internal review materials. The user decides, approves, sends, uploads, and submits outside SourceDeck."**

> **"You can add the SAM.gov API key during setup or later in Settings. The SAM search screen does not ask you to paste credentials."**

Reinforce the verbatim on-surface disclaimers at each surface (Capability Statement Studio: "Internal review draft. SourceDeck does not send, submit, upload, or certify this content."; Stakeholder Graph: "Internal capture planning only…"; Export: "INTERNAL REVIEW DRAFT — NOT SUBMITTED").

---

## 4. What the operator must NOT say

- SourceDeck submits bids / quotes / proposals.
- SourceDeck sends emails to agencies / contracting officers / CORs.
- SourceDeck uploads to SAM.gov / PIEE / eBuy / GSA / agency portals.
- SourceDeck guarantees awards or revenue.
- SourceDeck is FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO certified.
- SourceDeck is signed / notarized / Apple-notarized — unless an exact release-evidence artifact proves it (current builds are unsigned dev builds).

If a buyer pushes a forbidden expectation, do **not** nod — restate the boundary and continue.

---

## 5. Pilot hold conditions (pause / fix before continuing)

- [ ] Setup Wizard does **not** appear for first-run / new profile.
- [ ] Setup Wizard lacks the API key area (incl. SAM.gov).
- [ ] SAM search / Sprint / Outreach screen asks for the API key.
- [ ] Settings lacks key management.
- [ ] Any test fails / a gate is red.
- [ ] An unsafe CTA appears (Send Email / Submit Bid / Submit Quote / Export-and-submit / portal upload).
- [ ] Any secret / key value is visible (UI, log, export, screen-share).
- [ ] System Readiness / System Flow appears.

If any condition triggers, stop, fix or reframe, and re-verify before resuming onboarding.

---

## 6. Pilot success signals

- User completes the wizard and reaches the Capture OS without help.
- User correctly states where keys live (Setup Wizard / Settings) and that the search screen never asks for them.
- User completes a full capture pass on sample data and produces a local internal-review export.
- User can restate the no-send / no-submit boundary back to the operator.

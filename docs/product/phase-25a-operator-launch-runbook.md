# Phase 25A — Operator Launch Runbook

**Date:** 2026-06-08
**Companion plan:** `docs/product/phase-25a-limited-paid-pilot-launch-plan.md`.
**Companion audit:** `docs/audits/phase-25a-combined-launch-readiness-audit.md`.

This runbook is for the assigned pilot operator. Follow each section in order. Do not improvise around the do-not-say list. Do not skip the hold-conditions check.

---

## 1. Pre-call checklist (operator, T-24h)

- [ ] Confirm buyer has executed the pilot letter and accepted the unsigned-dev-build posture.
- [ ] Confirm buyer has been told this is a **limited paid pilot — not a public release**.
- [ ] Confirm buyer has been told **SourceDeck does not send, submit, or upload on their behalf**.
- [ ] Confirm buyer has been told **the build is an unsigned RC** and the operator will walk them through Gatekeeper.
- [ ] Confirm buyer has been told they will need a **SAM.gov public-API key** before SAM-driven workflows are usable.
- [ ] Verify the latest unsigned dev build is available locally to the operator (no public download link is shared with the buyer).
- [ ] Verify operator has read the Phase 24J operator demo runbook and the Phase 24L pilot QA contract.
- [ ] Verify operator has the Phase 24F no-send/no-submit checklist printed or open in a second window.

## 2. Install handoff (operator, T-0)

- [ ] Operator joins call with buyer.
- [ ] Operator transfers the unsigned `.dmg` to the buyer via the buyer's secure transfer channel (NOT public download).
- [ ] Operator walks the buyer through:
  - Locate the `.dmg`
  - Drag SourceDeck.app to Applications
  - Right-click → **Open** → confirm "open anyway" (because the build is unsigned)
- [ ] Operator says verbatim: **"This is an unsigned development build. We will walk through setup together. Do not run it against real proposals until we have finished the walkthrough."**

## 3. First-run setup (operator + buyer)

- [ ] Buyer launches SourceDeck cold (no `localStorage` state).
- [ ] **Setup Wizard auto-opens** (Phase 24K). If it does not, operator opens it via Settings → "Run setup wizard" button — but this is a Tier-2 escalation.
- [ ] **Step 1 — Welcome.** Buyer reads and clicks Next.
- [ ] **Step 2 — Company basics.** Buyer enters legal name, DBA (if any), UEI, CAGE.
- [ ] **Step 3 — Capability statement.** Buyer pastes existing capability statement OR clicks Skip. Operator says: "You can paste this later from the Capability Statement Studio."
- [ ] **Step 4 — GovCon targeting profile.** Buyer enters NAICS, PSC, set-asides, target agencies.
- [ ] **Step 5 — SAM.gov API key.** Buyer enters their own SAM.gov public-API key OR clicks Skip. Operator says verbatim: **"You can add the SAM.gov key now or later in Settings → API Keys. The SAM search screen does not ask you to paste credentials."**
- [ ] **Step 6 — AI provider (optional).** Skip unless buyer is using their own OpenAI / Anthropic / IBM key. Operator does not paste a key on the buyer's behalf.
- [ ] **Step 7 — Creative provider (optional).** Skip unless buyer has Stability / Replicate credentials.
- [ ] **Step 8 — Social / outreach (optional).** Skip for a first pilot run.
- [ ] **Step 9 — Safety & approval rules.** Buyer reads. Operator says verbatim: **"SourceDeck prepares internal review materials. You decide, approve, send, upload, and submit outside SourceDeck."**
- [ ] **Step 10 — Quick Setup Tour.** Buyer reads the 15-feature tour.
- [ ] **Step 11 — Final Confirmation.** Buyer checks **all 5 items**. Operator says: "All five are required. Item 5 is 'I will clear demo / sample data before any real proposal use.'"
- [ ] App lands buyer on GovCon Capture OS default view.

## 4. Sample / demo data load (operator)

- [ ] Operator loads Phase 23A Demo Mode sample data.
- [ ] Operator confirms the buyer's name is **not** in the sample data (sample data is synthetic; if a real name appears, **pause pilot** and escalate as a Phase 24E safety violation).

## 5. Buyer walkthrough (operator drives)

- [ ] **Capture Command Center.** Operator demonstrates the captures dashboard, pipeline view, and Operating Rhythm digest.
- [ ] **Solicitation Workspace.** Operator demonstrates solicitation analysis (clauses, FAR/DFARS lookup, requirements extraction).
- [ ] **Past Performance Library.** Operator demonstrates adding a PP record, tagging by NAICS / customer / contract type.
- [ ] **Capability Statement Studio.** Operator demonstrates the export-to-PDF flow (local file save — no upload).
- [ ] **Prime Partner Finder.** Operator demonstrates the partner search and notes that **no outreach is sent from SourceDeck**.
- [ ] **Stakeholder Graph.** Operator confirms no real CO / COR / KO contact information appears in sample data.
- [ ] **Submission Readiness Gate.** Operator demonstrates the readiness checklist run.
- [ ] **Internal Review Markdown Export.** Operator demonstrates the local markdown export. Operator says verbatim: **"This is internal-review only. SourceDeck does not submit this to SAM, eBuy, or any portal."**
- [ ] **Audit Log.** Operator demonstrates the audit log panel (Phase 24B) showing the recent events.
- [ ] **Vendor Quote Room.** Operator demonstrates the quote intake surface and says: "No quote is sent from SourceDeck. You email vendors outside the app."
- [ ] **Response Desk.** Operator demonstrates the email-import surface and says: "Email is imported in read-only mode. SourceDeck does not send replies on your behalf."

## 6. Settings tab confirmation (operator)

- [ ] Operator opens Settings → API Keys.
- [ ] Operator confirms the SAM.gov API Key row appears.
- [ ] Operator confirms the AI provider / Creative / Social rows appear.
- [ ] Operator says: "This is where you update keys later. Setup Wizard Step 5 and this Settings row are the only two places SourceDeck asks for the SAM.gov key."

## 7. Hand-off (operator → buyer's GovCon lead)

- [ ] Operator hands the buyer the printed Phase 24L pilot QA contract.
- [ ] Operator hands the buyer the printed Phase 24J operator demo runbook.
- [ ] Operator hands the buyer the contact info for Tier 2 (`info@arivergroup.com`).
- [ ] Operator hands the buyer the printed bounding-conditions list (this doc, §10).
- [ ] Operator emails the buyer a written summary of what was demonstrated, what was skipped, and the no-send / no-submit posture.

## 8. Do-not-say list (operator must not say any of these)

These phrases trigger a Phase 25A bounding-condition violation. Operator must **never** say them on a pilot call:

- ❌ "SourceDeck is signed and notarized." (Phase 24N — UNSIGNED dev/RC build.)
- ❌ "SourceDeck is Apple notarized." (Phase 24N.)
- ❌ "SourceDeck is production signed." (Phase 24N.)
- ❌ "SourceDeck will submit your bid." (Phase 24F — no-submit posture.)
- ❌ "SourceDeck will send the email for you." (Phase 24F — no-send posture.)
- ❌ "SourceDeck uploads to SAM / eBuy / GovWin / a portal." (Phase 24F — no-upload posture.)
- ❌ "SourceDeck is FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certified." (Phase 24F — no positive certification claim.)
- ❌ "SourceDeck guarantees a contract / revenue / award." (Phase 24F — no guaranteed-outcome claim.)
- ❌ "Just paste your SAM key on this screen." (Outside of Setup Wizard Step 5 / Settings → API Keys.)
- ❌ "Here's a discount code for the pilot." (Phase 22A-P V3 — pilot pricing is identical to public pricing.)
- ❌ "Just give me your SAM key, I'll set it up for you." (Phase 24L API-key boundary — operator never reads/stores buyer credentials.)
- ❌ "We're $79 / $349 / $999." (V2 deprecated; never re-quoted.)

## 9. Hold conditions (operator must pause the pilot if any holds)

The operator **must pause the pilot and escalate to Tier 2** if any of the following happens during the call:

1. Renderer fails to boot (Phase 24A invariant violation).
2. Setup Wizard fails to auto-open AND the Settings fallback button is also missing (Phase 24K invariant violation).
3. Stakeholder Graph displays a real CO/COR/KO name or contact (Phase 24E safety violation).
4. Any Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control appears (Phase 24F violation).
5. Any "signed and notarized" / "Apple notarized" / "production signed" claim appears in any UI surface (Phase 24N violation).
6. Any FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certification claim appears (Phase 24F violation).
7. SAM.gov API key entry surface appears on a workflow / search / demo / export screen (Phase 24L violation).
8. Deprecated $79 / $349 / $999 pricing appears in any UI surface (Phase 22A-P V3 violation).
9. Public download CTA appears (Phase 25A bounding-condition violation).
10. Buyer reports a credential leak (real key value in any surface, log, or export).

## 10. Bounding conditions (full pilot — see plan doc for the canonical list)

The pilot is bounded by the conditions enumerated in `docs/product/phase-25a-limited-paid-pilot-launch-plan.md` §"Bounding conditions for the pilot". The operator must re-read those conditions on Day 7, Day 14, Day 21 (re-decision checkpoint), and Day 30 (pilot-end review).

## 11. Post-call (operator, T+24h)

- [ ] Operator logs the pilot kickoff in the internal pilot tracker.
- [ ] Operator confirms with the buyer that the no-send / no-submit posture is documented and acceptable.
- [ ] Operator confirms with the buyer the Day 21 re-decision call is scheduled.
- [ ] Operator sends the buyer the support escalation contact (`info@arivergroup.com`).
- [ ] Operator confirms `.env` was not shared, no key value was transmitted, and no buyer credential is held by the operator.

---

## Signature

This runbook is the operator's source of truth for Phase 25A limited paid pilot kickoff. Deviations from this runbook are a Phase 25A bounding-condition violation and must be escalated to Tier 2.

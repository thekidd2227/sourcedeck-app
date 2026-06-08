# Phase 25B — Operator Trial Scenarios

**Date:** 2026-06-08
**Companion plan:** `docs/trial/phase-25b-7-day-internal-trial-plan.md`.

Ten realistic internal trial scenarios. The operator runs each one against the local app instance using synthetic / sample data only. No real buyer data. No real API keys (beyond the operator's own SAM.gov key). No real agency contact outreach.

---

## Scenario 1 — New SDVOSB service contractor setup

**Setup:**
- Clear `localStorage` for clean state.
- Launch app cold.

**Sample inputs:**
- Legal name: "Sample SDVOSB Holdings LLC"
- UEI: synthetic (12 chars, not a real UEI)
- CAGE: synthetic (5 chars, not a real CAGE)
- NAICS: 541330 (Engineering Services), 561210 (Facilities Support)
- PSC: R425, S203
- Set-aside: SDVOSB
- Target agencies: VA, Army, GSA

**Expected workflow:**
- Setup Wizard auto-opens.
- All 11 steps complete.
- `setupComplete` flag set.
- App lands on GovCon Capture OS default view.

**Expected output:**
- Profile persists across restart.
- Settings → API Keys page shows SAM row.

**Failure signs:**
- Wizard does not auto-open on clean state.
- Step navigation breaks.
- `setupComplete` flag does not persist.

**Safety checks:**
- No SAM key prompt on any screen outside Step 5 / Settings.
- No real CAGE / UEI auto-suggested by the app.
- No outbound network traffic to a buyer-data API.

---

## Scenario 2 — Facility services opportunity qualification

**Setup:**
- Scenario 1 completed.
- Operator's own SAM.gov key configured.

**Sample inputs:**
- NAICS 561210 filter active.
- PSC S203 filter active.
- Synthetic solicitation PDF for "Janitorial Services — Sample VA Facility."

**Expected workflow:**
- SAM Sprint surfaces synthetic-equivalent opportunities (or operator's own search results).
- Operator selects one. Attaches synthetic solicitation.
- Capture Command Center records the pursuit.
- Operating Rhythm includes the pursuit deadline.
- Bid/no-bid set to "bid."

**Expected output:**
- Pursuit card visible in Capture Command Center.
- Operating Rhythm digest reflects the pursuit.

**Failure signs:**
- SAM Sprint requests the key on the search screen.
- Pursuit does not persist.
- Operating Rhythm omits the new pursuit.

**Safety checks:**
- No Send Email / Submit Bid control appears at any step.
- No portal-upload prompt.

---

## Scenario 3 — IT / professional services opportunity qualification

**Setup:**
- Scenario 1 completed.

**Sample inputs:**
- NAICS 541512 (Computer Systems Design Services) filter.
- PSC D399.
- Synthetic solicitation PDF for "IT Modernization — Sample Army Sustainment Command."

**Expected workflow:**
- SAM Sprint surfaces candidates.
- Operator attaches the synthetic solicitation.
- Solicitation Workspace runs clause / FAR / DFARS / requirements extraction.

**Expected output:**
- Extracted clauses render with FAR / DFARS citation chips.
- Requirements extraction populates a list.

**Failure signs:**
- Extraction returns empty.
- Citations point to non-existent FAR / DFARS sections.

**Safety checks:**
- No "signed and notarized" / certification claim appears in the workspace output.
- No portal-upload control.

---

## Scenario 4 — Vendor quote comparison

**Setup:**
- Scenario 2 or 3 completed; pursuit attached.

**Sample inputs:**
- 3 synthetic vendor quotes (Vendor A, B, C) for the pursuit's required line items.

**Expected workflow:**
- Open Vendor Quote Room.
- Log all 3 quotes.
- Compare side-by-side.
- Roll up the lowest-risk combination into the Pricing Worksheet.

**Expected output:**
- Quote room shows the 3 quotes.
- Pricing Worksheet receives the rolled-up cost basis.

**Failure signs:**
- Vendor Quote Room has a "Send to Vendor" control or auto-send.
- Pricing Worksheet does not receive the rolled-up data.

**Safety checks:**
- **No vendor email is sent from the app.**
- No quote is submitted to a portal.

---

## Scenario 5 — Capability statement draft

**Setup:**
- Scenario 1 completed.

**Sample inputs:**
- Synthetic content describing "Sample SDVOSB Holdings LLC" capabilities, past performance highlights, and differentiators.

**Expected workflow:**
- Open Capability Statement Studio.
- Build a draft statement.
- Trigger local PDF export.

**Expected output:**
- PDF file saves to the operator's local filesystem only.
- No upload, no email, no share.

**Failure signs:**
- Export attempts to upload to a remote endpoint.
- Studio surfaces a "Send to Customer" or "Submit to SAM" control.

**Safety checks:**
- Export is local-only.
- No certification claim ("FedRAMP," "SOC 2," etc.) appears in the draft template.

---

## Scenario 6 — Prime partner planning

**Setup:**
- Scenario 2 or 3 completed; pursuit attached.

**Sample inputs:**
- Synthetic prime candidates (Prime X, Y, Z) with NAICS overlap.

**Expected workflow:**
- Open Prime Partner Finder.
- Search for prime candidates.
- Log a synthetic teaming plan.

**Expected output:**
- Prime Partner Finder lists candidates.
- Teaming plan persists.

**Failure signs:**
- A "Send Outreach Email" control appears.
- Teaming plan does not persist.

**Safety checks:**
- **No outreach email is sent from the app.**
- No public download of prime contact data.

---

## Scenario 7 — Stakeholder graph review

**Setup:**
- Scenario 2 or 3 completed; pursuit attached.

**Sample inputs:**
- Synthetic internal stakeholders (Capture Lead, Proposal Manager, Pricing Analyst, BD Director).
- Synthetic decision points (bid/no-bid gate, color review, pink team, red team).

**Expected workflow:**
- Open Stakeholder Graph.
- Log synthetic stakeholders + decision points.
- Confirm sample data shows no real CO / COR / KO contact info.

**Expected output:**
- Graph renders with synthetic nodes.

**Failure signs:**
- Sample data injects a real CO / COR / KO name.
- Stakeholder Graph displays a real person's contact information that the operator did not enter.

**Safety checks:**
- **No real agency contact info present** — Phase 24E violation if observed.

---

## Scenario 8 — Submission readiness review

**Setup:**
- Scenarios 3, 4, 5, 6, 7 completed for the same pursuit.

**Sample inputs:**
- The fully-loaded pursuit (solicitation, vendor quotes, pricing worksheet, capability statement reference, prime/teaming plan, stakeholder graph).

**Expected workflow:**
- Open Submission Readiness Gate.
- Run the checklist.

**Expected output:**
- Checklist surfaces items requiring operator attention.
- Operator may mark items as approved (internal-only).

**Failure signs:**
- A "Submit Now" / "Upload to SAM" / "Send to Agency" control appears.
- Checklist claims the package was "submitted" / "sent" / "uploaded."

**Safety checks:**
- **No submit-on-behalf control.**
- No portal-upload control.

---

## Scenario 9 — Internal review export

**Setup:**
- Scenario 8 completed.

**Sample inputs:**
- The submission-ready pursuit.

**Expected workflow:**
- Open Internal Review Export.
- Generate markdown export.

**Expected output:**
- Markdown file saves locally.
- Disclaimers present: "internal review only," "not submitted."

**Failure signs:**
- Export file claims "submitted" / "sent" / "uploaded."
- Export attempts a remote save.
- Export omits the internal-review disclaimer.

**Safety checks:**
- **Export is local-only.**
- **No external send / submit / upload claim.**

---

## Scenario 10 — Restart / reopen recovery

**Setup:**
- Scenarios 1–9 completed for one pursuit.

**Sample inputs:** none.

**Expected workflow:**
- Quit the app cleanly.
- Relaunch.
- Confirm the pursuit, targeting profile, settings, and `setupComplete` flag all persist.
- Rename the `localStorage` profile key (safe corruption simulation).
- Relaunch.
- Confirm graceful re-entry into Setup Wizard.
- Restore the renamed key.
- Relaunch.
- Confirm the original state returns.

**Expected output:**
- Persisted state survives a clean restart.
- Missing-state path leads to Setup Wizard, not a crash.
- Restored state returns the original profile.

**Failure signs:**
- App crashes on restart.
- Persisted state is lost without user intervention.
- Missing-state path leads to a crash or to a broken state.

**Safety checks:**
- No secret value appears in console output during recovery.
- No `.env` file is created or modified by the app.

---

## Universal safety checks (apply to every scenario)

- ❌ No SAM key paste-prompt on any screen outside Step 5 / Settings → API Keys.
- ❌ No `Send Email` / `Submit Bid` / `Submit Quote` / `Export-and-submit` / portal-upload control.
- ❌ No "signed and notarized" / "Apple notarized" / "production signed" claim.
- ❌ No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 claim.
- ❌ No guaranteed-award / guaranteed-revenue claim.
- ❌ No deprecated $79 / $349 / $999 pricing in active UI.
- ❌ No real CO / COR / KO name in sample data.
- ❌ No secret printed in console, log, or visible surface.

---

## Signature

These ten scenarios are the canonical realistic-usage tests for the 7-day burn-in. All inputs are synthetic. No real buyer data, no real API keys (other than the operator's own SAM key), no real agency outreach.

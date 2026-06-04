# Phase 23F — GovCon Buyer Demo Master Script

**Date:** 2026-06-04
**Audience:** GovCon SMB / mid-market buyer (Capture Manager, Proposal Manager, BD lead at sub-$10M prime or mid-tier sub).
**Demoer:** Operator running SourceDeck v1 on macOS, GovCon tab active.
**Companion docs:**
- `docs/demo/phase-23f-govcon-demo-shot-list.md`
- `docs/demo/phase-23f-govcon-demo-recording-checklist.md`
- `docs/demo/phase-22g-govcon-buyer-demo-script.md` (preserved; Phase 23F supersedes the pacing but inherits the safety boundary verbatim)
- `docs/audits/phase-23d-govcon-demo-delivery-polish-audit.md`
- `docs/audits/phase-23e-signed-demo-build-readiness-audit.md`

> This script is **buyer-ready** because Phase 23D shipped the demo delivery layer (local Markdown export, Last Updated chips) and Phase 23E added a controlled signed-demo-build path *without* asserting SourceDeck is signed or notarized. Until a signed-demo candidate has passed the Phase 23E verification chain end-to-end, this script speaks honestly: the build is an unsigned development build for demo purposes.

---

## 0. The one-sentence positioning (always)

> *"SourceDeck is a GovCon Capture OS that helps contractors move from opportunity discovery to submission-ready package preparation with human-approved workflows."*

This is the only positioning the demoer says verbatim. It is the answer to "what is this?" and the answer to "what does this do?"

---

## 1. The required safety language (always — every demo, every length)

> *"SourceDeck prepares internal review materials. It does not submit, upload, email, or transmit bids, quotes, or government responses."*

Say this within the first 90 seconds of any demo regardless of length. Say it again when you click anything labelled "Export", "Build Package", or "Mark Requirement Reviewed". Say it one final time at the close.

---

## 2. The 30-second opener (cold elevator pitch)

> *"GovCon Capture OS. You find an opportunity, triage the solicitation, line up vendor pricing, prove past performance, build the team, and prepare a submission package — one workflow, human-approved at every step. SourceDeck prepares internal review materials. It does not submit, upload, email, or transmit anything to SAM, PIEE, eBuy, GSA, or an agency portal. Want to see it?"*

Pace: ~28 seconds. End on the close question.

---

## 3. The 60-second opener (sit-down opener)

> *"SourceDeck is a GovCon Capture OS. We turn the same six steps every contractor runs — find an opportunity, triage the solicitation, line up vendor pricing, prove past performance, build the team, and prepare a submission package — into one workflow that a human approves at every step. SourceDeck prepares internal review materials. It does not submit, upload, email, or transmit anything. It does not run a live SAM Sprint without you. It does not send capability statements. It does not file into PIEE, eBuy, or GSA. It makes the pieces a buyer can sell to a contracting officer easier to assemble, faster to review, and harder to leave incomplete."*

Pause. Click GovCon tab if you have not already. Let them look at the GovCon Mode indicator.

---

## 4. The 5-minute demo

### 4.1 Cold-open framing (~20s)

Cold open lands directly on the **GovCon Capture OS** tab — Phase 23C made GovCon the primary navigation. Point to the **brand sub-label "GovCon Capture OS"** in the top-left and the **GovCon Mode indicator** in the GovCon pane.

> *"You're looking at GovCon Mode. The other tools — Lead Generator, Email Tracker, Daily Ops, Delivery — are still in the sidebar under 'Other business tools' but the buyer experience opens on GovCon."*

### 4.2 Demo Mode sample data (~25s)

Click **Load Sample GovCon Demo Data** in the Phase 23A Demo Mode block at the top of the GovCon pane.

> *"That just populated every section with sample data tagged as a demo. Real fielded data would replace this. The export we'll see at the end will carry a 'SAMPLE DEMO DATA — Replace before proposal use' warning so nothing demo-loaded can be mistaken for a real proposal."*

### 4.3 Capture Command Center (~45s)

> *"Where a contractor's day starts. Eight panels: active pursuits, deadlines this week, Q&A and amendment watch, bid/no-bid review, solicitation readiness, vendor and subcontractor needs, proposal package status, pending human approvals. The 'Last Updated' chip in the header tracks when this section was last edited locally — it stays 'Not yet' on cold open and only stamps after a real change."*

Hover the **Last Updated** chip. Click **Add an opportunity manually (no live SAM call)** to show the form, then close.

### 4.4 Solicitation Workspace + Compliance Matrix (~90s) — the heaviest moment

> *"This is where the value lands. You paste solicitation text here — local deterministic extraction, no API key, no call out, no LLM dependency. Section L instructions, Section M evaluation criteria, PWS/SOW lines, required forms, deadlines, risks — all separated. Then you click Build Compliance Matrix and you get a 10-column matrix: requirement ID, source section, requirement text, mandatory/optional, proposal section, owner, evidence needed, status, risk flag, notes. Every row defaults to 'Draft — Not Reviewed'. SourceDeck does not mark anything Reviewed for you. Mandatory-vs-optional is verb-driven; proposal section is source-driven; owner / evidence / notes are operator-assigned."*

Click **Extract Requirements**, then **Build Compliance Matrix**, scroll the matrix. Glance at the section's **Last Updated** chip — note it just stamped a real timestamp.

### 4.5 Vendor Quote Room + Pricing Worksheet (~50s)

> *"You log vendor needs here. SourceDeck does not send the quote request — you do that, then you record what you sent, when, and what came back. Credentials, insurance, bonding, W-9, SAM.gov, CAGE/UEI, clearance — checkboxes. The Pricing Worksheet computes an advisory estimated price and margin from labor, materials, vendor cost, travel, equipment, overhead %, profit %, contingency %. If margin drops below 5% or above 35%, you get a warning. None of this is submitted anywhere."*

Show the empty intake form. Show the Pricing Worksheet defaults at $0.00 / —.

### 4.6 Past Performance + Capability Statement + Prime Partner (~45s)

> *"Past Performance Library is operator-typed — project, agency, NAICS, contract number, period of performance, value, role, scope, relevance tags, CPARS notes, evidence. The Capability Statement Studio combines your target agency, NAICS, certifications, core capabilities, differentiators, and selected past performance into a draft outline. Drafts only — SourceDeck does not send capability statements or outreach. The Prime Partner Finder is operator-entered. Partner outreach is not sent from SourceDeck."*

### 4.7 Submission Readiness Gate + Internal Review Markdown export (~75s) — the close

> *"This is the final control. A submission checklist — solicitation reviewed, deadlines reviewed, Q&A reviewed, compliance matrix reviewed, required forms identified, proposal sections mapped, pricing reviewed, vendor quotes reviewed, past performance selected, capability statement reviewed, teaming notes reviewed, risk notes reviewed, and final human approval. Each item: Not started, In progress, Reviewed, or Blocked. The readiness score is advisory; it only reads 'Ready for Human Review' when every required item is Reviewed AND the final approval is Reviewed."*

Click **Build Package Preview**. Scroll the preview.

> *"That's the local internal-review preview. And this — Export Internal Review Markdown — saves the same content as a local Markdown file. Browser Blob download. No IPC, no fetch, no network call. The header reads 'INTERNAL REVIEW DRAFT — NOT SUBMITTED' and the footer repeats it. The safety boundary is restated inline: SourceDeck does not submit, upload, email, or transmit this package; no portal upload; no SAM / PIEE / eBuy / GSA interaction; no email transmission. Because Demo Mode is active, the export also carries a 'SAMPLE DEMO DATA — Replace before proposal use' warning. The user completes official submission outside SourceDeck."*

Click **Export Internal Review Markdown**. Show the `.md` file landing in Downloads with a filename ending `-INTERNAL-REVIEW-DRAFT.md`.

Total: ~5:00.

---

## 5. The 15-minute detailed demo

Run the 5-minute walkthrough first, then expand:

### 5.1 (+1:30) Show All Tools toggle

> *"GovCon is primary, but every legacy commercial tool is one click away. This toggle hides the 'Other business tools' groups so a buyer demo stays focused; click again to bring them back. Nothing is removed from the DOM — the tabs are still keyboard-reachable."*

Click **Other business tools — Shown / Hidden**. Show the six commercial groups collapse. Click again. Show them re-expand.

### 5.2 (+2:00) Compliance matrix detail

Walk every column. Show that Owner / Evidence / Status / Notes are all operator-editable. Click **Mark Requirement Reviewed** to flip a row's status. Show that the Submission Readiness section-status rollup at the bottom of the tab reflects matrix progress in read-only mode. Glance at the Solicitation Workspace's **Last Updated** chip — note it stamps on every save.

### 5.3 (+2:00) Pricing Worksheet math

Type real numbers into Labor, Materials, Vendor, Overhead %, Profit %. Show the advisory Estimated Price and Estimated Margin updating. Trigger the `< 5%` warning. Trigger the `> 35%` warning. Show the missing-cost warning (set Labor to 0). Note: Vendor Quote Room + Pricing share a single **Last Updated** chip — both feed it.

### 5.4 (+2:00) Capability Statement Studio draft

Type a target agency, target NAICS, and 3 core capabilities. Click **Build Capability Statement Outline (draft)**. Show the inline outline with the "Draft — review before sending. SourceDeck does not send capability statements or outreach" footer. Click **Clear Outline**.

### 5.5 (+2:00) Vendor Quote Room intake

Open the intake form. Walk the 7 credential checkboxes. Add one row (operator's real, redactable vendor) with status **Requested manually**. Show the table populating. Reiterate: SourceDeck did not send the request.

### 5.6 (+2:00) Submission Readiness scoring

Set 3 checklist items to **Reviewed**, 2 to **In progress**, 1 to **Blocked**. Show the score change. Show the status stay at **Not Ready** because of the Blocked row. Clear the Blocked. Show the status flip to **Needs Review**. Mark every required item Reviewed AND mark the final-approval row Reviewed. Show **Ready for Human Review** appear.

### 5.7 (+2:30) Local Markdown export deep-dive

Re-export the Internal Review Markdown. Open the `.md` in a code editor on the side. Walk the buyer through the structure:

1. Header `INTERNAL REVIEW DRAFT — NOT SUBMITTED`
2. Safety blockquote (no-submit / no-upload / no-email / no-transmit)
3. **SAMPLE DEMO DATA — Replace before proposal use** (because Demo Mode is on)
4. Package metadata (operator-supplied name / solicitation / notes)
5. Included-section summaries (advisory counts only)
6. **Last Updated** local timestamps per section
7. Safety boundaries footer
8. Footer `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`

> *"That's what you take home from a working session. Markdown, local file, fully reviewable diff in your own repo or document management system. The buyer's contracting team sees exactly what SourceDeck did and exactly what SourceDeck did not do."*

### 5.8 (+1:00) Close

See §7 below.

---

## 6. Objection handling

| Question | Honest answer |
| --- | --- |
| *"Is this IBM watsonx live?"* | "Not in this build. The IBM watsonx integration is configurable; in this environment it is not configured. We do not claim watsonx is live unless `verified_ready` evidence exists." |
| *"Is the macOS build signed and notarized?"* | "**This build is an unsigned development build for demo purposes.** Phase 23E added a manual signed-demo-build workflow that uses GitHub secrets and a 7-step verification chain (signing-readiness strict → signed build → release-check → codesign verify → spctl accept → stapler validate → release-evidence signed-verified). Until that chain completes end-to-end for a specific artifact, we don't say 'signed and notarized'." |
| *"Is this FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certified?"* | "No. SourceDeck does not claim FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 certification. Compliance posture is the buyer's responsibility." |
| *"Will it submit my bid for me?"* | "No. There is no Send Email, Submit Bid, or Submit Quote button anywhere in the app. The Response Desk imports email content for triage — it never sends. Vendor quote requests are recorded as 'Requested manually' so your team knows you did the outreach outside the app. Submission happens outside SourceDeck." |
| *"Does it upload to SAM, PIEE, eBuy, or GSA?"* | "No. There is no portal upload, no SAM / PIEE / eBuy / GSA interaction from any surface in the app." |
| *"Does it send my capability statement?"* | "No. The Capability Statement Studio builds a draft outline only. Sending is the operator's action outside SourceDeck." |
| *"Are the timestamps real?"* | "Yes. The Last Updated chips capture a baseline on cold open and stamp `new Date().toISOString()` only when the underlying localStorage signature actually drifts. Cold open with persisted data still reads 'Not yet' until a real edit fires." |
| *"What does Demo Mode change?"* | "It loads sample data tagged with a demo source flag and shows the SAMPLE DEMO DATA — Replace before proposal use banner inside the Markdown export. Clear Sample Data wipes the demo tag and the chips re-stamp when you start editing real data." |
| *"Where does the Markdown go?"* | "Local file on your machine. Browser Blob download. No IPC, no `fetch`, no network call. The filename pattern is `YYYYMMDD-<slug>-INTERNAL-REVIEW-DRAFT.md`." |

---

## 7. Pricing positioning

> *"Pricing depends on team size, contract volume, and whether you want the operating-profile wizard pre-populated for you. We sell SourceDeck as the workflow that pays for itself the first time it catches a missed Section L requirement or a vendor quote that came in 20% over the lowest. Let's talk pricing after you've seen the package export and decided whether it fits your capture workflow."*

Do not quote a number from memory; reference `docs/pricing/` if a number is requested and pull the live figure.

---

## 8. Exact close + CTA

> *"That's the GovCon Capture OS. Six sections, one final gate, a local Markdown artifact you can take to your contracting team — and one safety boundary that doesn't move: SourceDeck does not submit, upload, email, or transmit. If that boundary works for how your team buys, the next step is a guided pilot with your actual NAICS, your actual past performance, and one live solicitation you're triaging this quarter. I can walk that pilot kickoff with you next week. Want to put it on the calendar?"*

End on the calendar question.

---

## 9. Sample-data explanation (always say this when Load Sample is clicked)

> *"That's sample GovCon demo data. Every row is tagged as a demo source. The Markdown export we'll generate at the end will carry a 'SAMPLE DEMO DATA — Replace before proposal use' banner so your contracting team can never accidentally treat it as a real proposal artifact. Clear Sample Data wipes the tag."*

---

## 10. Local Markdown export explanation (always say this when the Export button is clicked)

> *"Local Markdown. Browser Blob download. No IPC, no `fetch`, no network call. The header is 'INTERNAL REVIEW DRAFT — NOT SUBMITTED' and the footer repeats it. The safety boundary is restated inline. The filename ends `INTERNAL-REVIEW-DRAFT.md`. Your contracting team gets a take-home artifact they can diff in their own tools."*

---

## 11. Last Updated chip explanation (always say this when a chip is referenced)

> *"Cold open: 'Not yet'. Real change: stamped with a local ISO timestamp. Persisted-from-prior-session data does not fake a stamp. Polling every 2.5 seconds catches edits, demo-mode loads, and external storage changes."*

---

## 12. Unsigned-build caveat (until Phase 23E verification chain completes for this artifact)

> *"This is an unsigned development build for demo purposes. Phase 23E added a controlled manual workflow that, when invoked with the five required signing/notarization secrets, produces a signed-demo candidate. Until that candidate has passed codesign verify + spctl accept + stapler validate + release-evidence signed-verified, we don't say 'signed and notarized'. The Apple Gatekeeper warning you may see if you double-click the DMG is honest — the artifact is unsigned in this environment."*

Use this exact phrasing. Do not improve it. Do not say "almost signed", "will be signed in production", "trust me, it's safe" — say "unsigned development build for demo purposes" and move on.

---

## 13. Do-not-say list

Do not say any of the following during a demo, in pricing decks, in marketing copy, in PR descriptions, or in emails to buyers:

- "SourceDeck submits bids for you."
- "SourceDeck guarantees awards."
- "SourceDeck guarantees revenue."
- "SourceDeck is FedRAMP certified."
- "SourceDeck is SOC 2 certified."
- "SourceDeck is CMMC certified."
- "SourceDeck is HIPAA certified."
- "SourceDeck is HITRUST certified."
- "SourceDeck is ISO 27001 certified."
- "SourceDeck sends outreach automatically."
- "SourceDeck files into SAM automatically."
- "SourceDeck files into PIEE automatically."
- "SourceDeck files into eBuy automatically."
- "SourceDeck files into GSA automatically."
- "SourceDeck is signed and notarized." *(unless Phase 23E verification chain has completed for the specific artifact)*
- "Apple notarized." *(same condition)*
- "Production signed." *(same condition)*
- "SourceDeck is signed." *(same condition)*
- "SourceDeck is notarized." *(same condition)*
- "Publicly signed."
- "IBM watsonx is included." *(unless `verified_ready` evidence exists)*
- "Watsonx live." *(unless `verified_ready` evidence exists)*
- "Auto-send."
- "Auto-submit."
- "We email the SAM submission for you."
- "We upload to PIEE for you."

If a buyer pushes one of these phrases at you, do not nod. Repeat §1 (the safety language) and continue.

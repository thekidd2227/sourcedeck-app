# Phase 22G — GovCon Buyer Demo Script

**Date:** 2026-06-04
**Audience:** GovCon SMB / mid-market buyer (Capture Manager, Proposal Manager, BD lead at sub-$10M prime or mid-tier sub).
**Demoer:** Operator running SourceDeck v1 on macOS, GovCon tab active.
**Companion:** `docs/audits/phase-22g-govcon-buyer-demo-qa.md`.

---

## 0. Positioning (one sentence, always)

> SourceDeck is a GovCon capture operating system that helps contractors move from opportunity discovery to submission-ready package preparation with human-approved workflows.

This is the only positioning the demoer says verbatim. It is the answer to "what is this?" and the answer to "what does this do?"

---

## 1. Pre-demo setup

Before the buyer joins:

- Pull latest `main` and confirm `f543321` (Phase 22F) or newer is the head.
- Run baseline gates: `npm test`, `npm run release:evidence`, `npm run troubleshooting:scan`, `npm run govcon:smoke`, `npm run phase13:rc-check`, `npm run i18n:audit`, `node scripts/release-check.js`.
- Confirm `release:evidence` → `packaged_unsigned`; `troubleshooting:scan` → 0 critical/high.
- Launch SourceDeck. Click the **GovCon** tab in the sidebar before the buyer joins so the first frame the buyer sees is the GovCon Capture Command Center, not the commercial-CRM dashboard.
- Have a real (public-source, redactable) solicitation paste-buffer ready. Recommended: one Section L excerpt + one Section M excerpt + one short PWS excerpt + a "Q&A due:" line + a "Proposal due:" line.
- Have a redactable past-performance record ready in your head: project title, agency, NAICS, role, scope summary.
- Have one vendor name ready (operator's own previously-used sub).
- Close any browser tabs / windows that show real customer PII, real API keys, or real solicitation content from other engagements.

---

## 2. The 60-second opener

> *"SourceDeck is a GovCon capture operating system. We turn the same six steps every contractor runs — find an opportunity, triage the solicitation, line up vendor pricing, prove past performance, build the team, and prepare a submission package — into one workflow that a human approves at every step. We don't submit anything for you. We don't email anyone. We don't claim awards. We make the pieces a buyer can sell to a contracting officer easier to assemble, faster to review, and harder to leave incomplete."*

Pause. Click GovCon tab if not already there. Let them look.

---

## 3. The 5-minute walkthrough

### 3.1 The Capture Command Center (~45s)

> *"This is where a contractor's day starts. Eight panels: active pursuits, deadlines this week, Q&A and amendment watch, bid/no-bid review, solicitation readiness, vendor and subcontractor needs, proposal package status, and pending human approvals. Everything starts at zero — there's no fake data. You add an opportunity manually here, or via your SAM Sprint flow if you have it configured. Vendor outreach is never sent from SourceDeck; if you contact a vendor, you mark it 'Requested manually' so the team knows you did it outside the app."*

Click `Add an opportunity manually (no live SAM call)`, open the form, scroll, close it.

### 3.2 The Solicitation Workspace (~90s) — the heaviest moment

> *"This is where the value lands. You paste solicitation text here…"* — paste the prepared excerpt — *"…and the workspace runs a local deterministic extraction. No API key. No call out. No LLM dependency. You get Section L instructions, Section M evaluation criteria, PWS/SOW lines, required forms, deadlines, and risks — all separated. Then you click Build Compliance Matrix and you get a 10-column matrix: requirement ID, source section, requirement text, mandatory/optional, proposal section, owner, evidence needed, status, risk flag, notes. Every row defaults to 'Draft — Not Reviewed.' SourceDeck does not mark anything Reviewed for you."*

Click `Extract Requirements`. Click `Build Compliance Matrix`. Scroll the matrix.

> *"Mandatory-vs-optional is verb-driven — shall, must, is required. Proposal section is source-driven — Section L goes to Volume I Technical, Section M goes to Volume IV Evaluation Alignment. Owner, evidence, and notes default to 'TBD — operator assigns.' You drive every cell."*

### 3.3 The Vendor Quote Room + Pricing Worksheet (~60s)

> *"You log vendor and subcontractor needs here. SourceDeck does not send the quote request — you do that. You record what you sent, when, and what came back. Credentials, insurance, bonding, W-9, SAM.gov, CAGE/UEI, clearance — all checkboxes. The Pricing Worksheet computes an advisory estimated price and margin from labor, materials, vendor cost, travel, equipment, overhead %, profit %, contingency %. If your margin drops below 5% or above 35%, you get a warning. The Quote Comparison table groups received quotes by category and shows delta from the lowest. None of this is submitted anywhere."*

Show the empty intake form. Show the Pricing Worksheet defaults at `$0.00 / —`.

### 3.4 Past Performance + Capability Statement + Prime Partner (~45s)

> *"The Past Performance Library is operator-typed. You log a project — title, agency, NAICS, contract number, period of performance, value, role, scope, relevance tags, CPARS notes, evidence notes. The Capability Statement Studio combines your target agency, target NAICS, certifications, core capabilities, differentiators, and selected past performance into a draft outline. Drafts only. SourceDeck does not send capability statements or outreach. The Prime Partner Finder is operator-entered — research, shortlist, contacted manually, interested, not a fit, follow up later. Partner outreach is not sent from SourceDeck."*

### 3.5 Submission Readiness Gate (~30s) — the close

> *"This is the final control. A 13-item submission checklist — solicitation reviewed, deadlines reviewed, Q&A reviewed, compliance matrix reviewed, required forms identified, proposal sections mapped, pricing reviewed, vendor quotes reviewed, past performance selected, capability statement reviewed, teaming notes reviewed, risk notes reviewed, and *final human approval recorded*. Each item: Not started, In progress, Reviewed, or Blocked. The readiness score is advisory; it only reads 'Ready for Human Review' when every item is Reviewed AND the final approval row is Reviewed. The package export builds a local internal-review preview from your data. SourceDeck does not submit, upload, email, or transmit this package. You complete official submission outside SourceDeck."*

Total ~4:30. Adjust pacing to fit five minutes.

---

## 4. The 15-minute detailed demo

After the 5-minute walkthrough, if the buyer is engaged, expand:

### 4.1 (+2 min) — Compliance matrix detail

Walk every column. Show that Owner / Evidence / Status / Notes are all operator-editable. Click `Mark Requirement Reviewed` to flip a row's status. Show that the **Submission Readiness section-status rollup** at the bottom of the tab is reflecting matrix progress in read-only mode.

### 4.2 (+2 min) — Pricing Worksheet math

Type real numbers into Labor, Materials, Vendor, Overhead %, Profit %. Show the advisory `Estimated Price` and `Estimated Margin` updating. Trigger the `< 5%` warning. Trigger the `> 35%` warning. Show the missing-cost warning (set Labor to 0 and demo the flag).

### 4.3 (+2 min) — Capability Statement Studio draft

Type a target agency, target NAICS, and 3 core capabilities. Click `Build Capability Statement Outline (draft)`. Show the inline outline with the "Draft — review before sending. SourceDeck does not send capability statements or outreach" footer. Click `Clear Outline`.

### 4.4 (+2 min) — Vendor Quote Room + credential checklist

Open the intake form. Walk the 7 credential checkboxes. Add one row (operator's real, redactable vendor) with status `Requested manually`. Show the table populating. Reiterate: SourceDeck did not send the request.

### 4.5 (+2 min) — Submission Readiness scoring

Set 3 checklist items to `Reviewed`, 2 to `In progress`, 1 to `Blocked`. Show the score change. Show the status stay at `Not Ready` because of the Blocked row. Clear the Blocked. Show the status flip to `Needs Review`. Mark every required item Reviewed AND mark the final-approval row Reviewed. Show `Ready for Human Review` appear.

### 4.6 (+2 min) — Package export preview

Click into the Human-Approved Package Export form. Type a package name + solicitation number + notes. Verify 10 included-section checkboxes are present (Opportunity summary, Solicitation extraction, Compliance matrix, Pricing worksheet, Vendor quote table, Past performance, Capability statement outline, Prime partner notes, Risk log, Submission checklist). Click `Build Package Preview`. Show the preview render with the explicit "Internal review preview only — SourceDeck does not submit, upload, email, or transmit this package" footer. Click `Export Package Placeholder` — show the toast.

### 4.7 (+3 min) — Workflow story + close

Step back to the GovCon tab top. Scroll through the six surfaces in order at moderate pace. Restate the positioning. Pause for questions.

---

## 5. Anticipated buyer objection responses

### 5.1 "Does this submit my bid?"

> *"No. SourceDeck does not submit bids, quotes, or government responses. SourceDeck does not submit, upload, email, or transmit this package. Final submission happens outside SourceDeck — through SAM.gov, PIEE, eBuy, GSA, or whatever agency portal the solicitation requires. We give you a submission-ready package; you submit."*

### 5.2 "Is this IBM watsonx live?"

> *"watsonx readiness is presence and status only. The deterministic local extraction does not require watsonx. We do not claim watsonx is live as a present-tense product capability."* (Refer to `docs/release/release-evidence.md` if pushed.)

### 5.3 "Is the macOS build signed and notarized?"

> *"Not in this environment. The build you're seeing is an unsigned development build for demo purposes. We have a deterministic signing-readiness diagnostic that reports whether the signing config is in place. Public-release signing and notarization is a separate phase."*

### 5.4 "Is this FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certified?"

> *"No. SourceDeck does not hold any of those certifications. We do not claim compliance posture. Your compliance posture is your responsibility; SourceDeck helps you organize the evidence you'd reference in your own response to compliance requirements in the solicitation."*

### 5.5 "Can I email a quote from inside?"

> *"No. There is no `Send Email` button anywhere in the app. The Response Desk imports email content for triage — it never sends. Vendor quote requests are recorded as 'Requested manually' so your team knows you did the outreach outside the app."*

### 5.6 "Can it scrape SAM.gov?"

> *"Opportunity intake is supported. SAM Sprint runs an opportunity-scoring pass against a SAM.gov saved-search you've configured, with Free-plan accounts capped at 1 NAICS and paid plans uncapped. We don't run live SAM during a buyer demo unless you ask us to. Demo runs use sample paste-buffer data so nothing leaves the device."*

### 5.7 "What happens if my API key fails?"

> *"The Solicitation Workspace, Compliance Matrix, Pricing Worksheet, Past Performance Library, Capability Statement Studio, Prime Partner Finder, and Submission Readiness Gate all run on local deterministic logic. None of them require an AI provider. If you connect an AI provider for premium content generation, it's a separate surface and SourceDeck reports readiness status if the key is missing or unreachable — the rest of the GovCon workflow keeps working."*

### 5.8 "Can my team use this?"

> *"Today it's a desktop operator tool. Multi-user team mode is a future deployment phase. Enterprise deployments may include SourceDeck-managed AI provisioning, additional configuration, and tailored operator onboarding — details in the pricing materials."*

### 5.9 "How much?"

> *"Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply. I can walk you through pricing options after the demo."*

(Verbatim from the canonical safe AI-provisioning language in `docs/commercial-readiness/buyer-one-page-overview.md`. Do not improvise.)

### 5.10 "What does the build status mean?"

> *"`packaged_unsigned` means a local build artifact exists but is not signed. The release-evidence diagnostic captures eight evidence states; this one is the dev-build state. Public release requires `signing_ready` followed by `packaged_signed_verified`. That signing work is a separate phase."*

---

## 6. Do-not-say list (exact phrases — never)

The demoer must NOT say any of these, in any form, ever:

- "SourceDeck submits bids for you."
- "SourceDeck guarantees awards."
- "SourceDeck guarantees revenue."
- "SourceDeck guarantees ROI."
- "SourceDeck is FedRAMP authorized."
- "SourceDeck is SOC 2 certified."
- "SourceDeck is CMMC certified."
- "SourceDeck is HIPAA certified."
- "SourceDeck is HITRUST certified."
- "SourceDeck is ISO 27001 certified."
- "SourceDeck is government compliant."
- "SourceDeck replaces your contracting officer."
- "SourceDeck sends outreach automatically."
- "SourceDeck files into SAM automatically."
- "SourceDeck files into PIEE automatically."
- "SourceDeck files into eBuy automatically."
- "SourceDeck files into GSA automatically."
- "SourceDeck submits to agency portals."
- "SourceDeck emails the contracting officer."
- "watsonx is live in production."
- "The build is signed and notarized." (unless the build genuinely is)
- "Our AI guarantees..."
- "Unlimited AI."
- "We win contracts."

If the buyer puts a forbidden phrase in the demoer's mouth, the demoer politely corrects: "I want to be precise — SourceDeck does not [forbidden behavior]; what we do is [accurate behavior]."

---

## 7. Safety language (verbatim, use when asked)

- **Submission posture:** "SourceDeck does not submit bids, quotes, or government responses. SourceDeck does not submit, upload, email, or transmit this package. Final submission happens outside SourceDeck."
- **Outreach posture:** "SourceDeck does not send capability statements or outreach. SourceDeck does not send vendor outreach. Partner outreach is not sent from SourceDeck. The Response Desk never auto-sends and never auto-submits."
- **Human approval invariant:** "Outreach, proposals, pricing, compliance, bid/no-bid, teaming, publishing, and sending all require human approval. Nothing is sent automatically."
- **Compliance posture:** "SourceDeck does not claim FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 certification. Compliance posture is the buyer's responsibility."
- **AI posture (verbatim):** "Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply."

---

## 8. Pricing-positioning language

Never quote a number during the demo unless the buyer asks. When asked:

- Use the safe AI-provisioning verbatim from §5.9 above.
- Reference `docs/pricing/sourceDeck-pricing-packaging.md` and `docs/pricing/sourceDeck-pricing-revaluation-2026.md` for the internal packaging conversation.
- Do not state a single number on the call. Pricing is an explicit follow-up conversation.

If pushed to "give me a ballpark":

> *"Standard plans are typically priced in the low hundreds per month per operator. Premium and enterprise deployments — which can include SourceDeck-managed IBM watsonx configuration — scale with workflow risk, usage volume, and deployment requirements. I'd rather not throw out a number in a vacuum; let's schedule a 30-minute pricing conversation where I can map your team's specific use case to the right package."*

---

## 9. Close / call-to-action

> *"You've seen the six steps: capture, solicitation, vendor + pricing, proof, teaming, readiness. Nothing in the demo was submitted, sent, or emailed. SourceDeck holds the working state; the human holds the responsibility. If this lines up with how your capture team actually works, the next step is a 30-minute pricing-and-deployment conversation. We can pencil it for [day this week]."*

Pause. Listen. Don't fill silence.

---

## 10. Post-demo

- Send a one-page recap citing only what was demonstrated. No commitments outside the pricing/packaging doc.
- Attach `docs/commercial-readiness/buyer-one-page-overview.md` (sanitize for the buyer's name on the cover line).
- Do not send screenshots from the demo unless the buyer requests them; redact any operator-pasted real data before sending.
- Log the demo in the operator's CRM as a manual entry (SourceDeck does not log demo activity automatically and does not contact the buyer's organization).

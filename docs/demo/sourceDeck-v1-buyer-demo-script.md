# SourceDeck v1 — Buyer Demo Script

A 20–30 minute presenter script with verbatim opening lines, safe claim boundaries, and guardrails. Read presenter blocks as written. Stay inside the "safe claims" column. Do not extend into "forbidden claims" even if pushed.

**Standing rule for the entire demo:** Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

---

## 0:00–2:00 — Positioning

### Presenter says (verbatim)

"Thanks for the time. In the next twenty to thirty minutes I'm going to walk you through SourceDeck v1. SourceDeck is a desktop operating layer for government-contracting capture work. It is not a contract-award machine and it is not a magic AI bid writer. What it is, is a structured way to set up your GovCon operating profile, intake opportunities, prepare outreach, prepare proposal material, and keep a human in the loop at every step that touches a customer, a partner, or a contracting officer. I'll show you the surfaces, I'll be honest about what's verified versus pending, and at the end I'll tell you exactly what the next step looks like."

### Safe claims you may make

- SourceDeck is a desktop app for capture-side GovCon workflows.
- It organizes operating profile, opportunity intake, outreach drafts, and proposal-content drafts.
- Human approval is required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.
- Credentialed API calls live behind the app boundary (main process), not in the renderer.

### Forbidden claims

- Do not claim SourceDeck wins, guarantees, or accelerates contract awards.
- Do not claim "government compliant" or "government compliance."
- Do not claim FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001.
- Do not claim "guaranteed contract," "guaranteed award," or "guaranteed revenue."

---

## 2:00–5:00 — Problem SourceDeck solves

### Presenter says (verbatim)

"The pattern we see is this. A small or mid-size GovCon team has a capability statement in one document, NAICS codes in a spreadsheet, past performance in a folder, a SAM.gov tab open in a browser, an outreach template in a separate doc, and a proposal template in another folder. The capture lead is the integration layer, and the capture lead is the bottleneck. SourceDeck pulls those surfaces into one operator desktop with a consistent profile, opportunity intake, outreach drafting, and proposal-content drafting, and it keeps you, the human, as the approver for anything that leaves the building. Outreach is human-approval-gated. Proposal content is human-approval-gated. Pricing is human-approval-gated. Nothing is sent automatically."

### Safe claims you may make

- SourceDeck consolidates capture artifacts (profile, NAICS, past performance, opportunity intake, outreach, proposal content) into one desktop surface.
- The operator is the approver. Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending.
- The app reduces context-switching across tabs and folders.

### Forbidden claims

- Do not promise win-rate lift, revenue lift, or pipeline lift as a guarantee.
- Do not claim the app replaces a capture manager, proposal manager, or contracting officer.
- Do not claim auto-send, auto-submit, or that the app submits proposals automatically.

---

## 5:00–9:00 — First-time GovCon setup / operating profile

### Presenter says (verbatim)

"On first launch you land in the GovCon Operating Profile Wizard. This is where we capture company identity, primary NAICS, set-aside posture, key personnel, past performance summaries, and capability statement language. The wizard is structured so that what you enter once is reused everywhere — opportunity intake, outreach drafts, proposal-content drafts, prime/partner discussion. Two important boundaries here. First, credentialed API keys you provide for downstream services live in the main process, never in the renderer; they are not embedded in the UI layer. Second, anything the wizard helps you draft — capability language, past-performance write-ups, outreach copy — is a draft for you to review. Human approval is required before anything is used in outreach, in a proposal, or sent. Nothing is sent automatically."

### Safe claims you may make

- Profile data entered once is reused across intake, outreach, and proposal drafts.
- Credentialed API calls live behind the app boundary in the main process; the renderer does not hold credentials.
- All drafted content is a draft pending human approval. Human approval is required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

### Forbidden claims

- Do not claim the wizard "qualifies" the buyer for set-asides — eligibility is a buyer responsibility.
- Do not claim the profile is auto-validated against SAM.gov or any agency system live during the demo.
- Do not claim FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO 27001.

---

## 9:00–13:00 — Opportunity intake and review

### Presenter says (verbatim)

"Now I'll show opportunity intake. You give SourceDeck an opportunity — a notice, a sources-sought, an RFI, an RFP, a fixture for today's walkthrough — and it structures the record: title, agency, NAICS, set-aside, response date, key requirements, and a place for the operator's bid/no-bid note. The review surface lines up the opportunity against your operating profile so you can see fit at a glance. Two things to keep in mind during the demo. One, I am not promising live scraping of SAM.gov as a present-tense capability of the shipping product; opportunity intake is supported and we show it with a representative sample or fixture so the flow is honest. Two, bid/no-bid is a human decision. The app organizes the information; it does not decide for you. Human approval remains required for any downstream outreach or proposal action on this opportunity."

### Safe claims you may make

- Opportunity intake structures the notice into reviewable fields and lines it up against the operating profile.
- The bid/no-bid call is a human decision; the app organizes information, it does not decide.
- Intake demos use representative samples or fixtures during the live walkthrough.
- Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending.

### Forbidden claims

- Do not promise live SAM.gov scraping during the demo.
- Do not claim automatic bid/no-bid recommendation as authoritative.
- Do not claim auto-submission of any response.

---

## 13:00–16:00 — Outreach draft / premium content guardrails

### Presenter says (verbatim)

"Here is the Outreach OS surface with the Premium Content Agent assist. You select a target — a contracting officer point of contact, a prime, a teaming partner — and the agent prepares a draft message grounded in your operating profile and the opportunity context. Look at the bottom of the panel: every draft is staged for human approval. The email-alert path ships in dry-run mode by default, which means no message goes out without an explicit operator action. There is no auto-send. There is no silent send. Outreach is human-approval-gated. Pricing language, if it appears in a draft, is human-approval-gated. Nothing is sent automatically."

### Safe claims you may make

- Outreach drafts are grounded in the operating profile and opportunity context.
- The email-alert path ships dry-run by default; no message is sent without explicit operator action.
- Human approval is required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

### Forbidden claims

- Do not claim auto-send or auto-submit.
- Do not claim the agent personalizes at scale without operator review.
- Do not claim "unlimited AI."

---

## 16:00–19:00 — Prime partner / NAICS support

### Presenter says (verbatim)

"Prime and partner support uses the same operating profile and the same NAICS posture you set up earlier, so when you're working a teaming conversation the app is consistent with what you already told it. You'll see partner records, NAICS-aligned capability matches, and a draft outreach-to-prime path that runs through the same approval gate as everything else. Teaming decisions are human decisions. The app surfaces alignment, organizes the discussion artifact, and stages outreach for your review. Human approval is required before any partner-facing or prime-facing message is sent."

### Safe claims you may make

- Prime/partner views reuse the operating profile and NAICS posture.
- Teaming decisions are human decisions; the app surfaces alignment and organizes the artifact.
- Outreach to primes and partners runs through the same human-approval gate. Nothing is sent automatically.

### Forbidden claims

- Do not claim automatic teaming matchmaking as a guarantee of fit.
- Do not claim auto-send to primes or partners.
- Do not claim "guaranteed" partnership outcomes.

---

## 19:00–22:00 — AI provider readiness / watsonx conditional language

### Presenter says (verbatim)

"On AI provisioning, here is the language I want you to hear verbatim, because it is also how it appears in our packaging. Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply. To be straight with you: IBM watsonx is not claimed as a present-tense live capability of the shipping product today. Our watsonx runtime is pending verification, and until that verification is complete we describe it as a may-include for premium and enterprise, not as a shipped feature. If you ask for it in a deployment, that is a conversation we have during scoping. And as everywhere else in the app, AI-assisted outreach and proposal drafts are staged for human approval — nothing is sent automatically."

### Safe claims you may make

- Standard plans use customer-provided AI keys.
- Premium and enterprise *may* include SourceDeck-managed IBM watsonx configuration, scoped to workflow risk, usage volume, and deployment requirements.
- Watsonx is referenced only conditionally and is pending verification; not claimed as a present-tense capability of the shipping product.
- AI-assisted drafts are human-approval-gated. Nothing is sent automatically.

### Forbidden claims

- Do not say "IBM watsonx included," "IBM watsonx live," or "watsonx live" as a present-tense capability of the shipping product.
- Do not claim "unlimited AI."
- Do not imply standard plans include managed AI credentials.

---

## 22:00–25:00 — Troubleshooting + release evidence

### Presenter says (verbatim)

"Two operator-facing surfaces I want to show before we close. First, the daily troubleshooting agent. It runs as a structured diagnostic with redaction on sensitive fields, so when something is misconfigured — an AI key missing, a connector not responding, a readiness probe failing — you get presence-only reporting and remediation guidance from a knowledge base, not a dump of secrets. Second, the release-evidence diagnostic, including the strict mode. Strict mode is designed to block release until signing-readiness is satisfied. That is by design. On the macOS side, our local artifact today is an unsigned development build; real Apple signing and notarization are pending real credentials, and we are deliberately not claiming the product is signed or notarized until that is verified end-to-end. The strict gate is what keeps us honest about that."

### Safe claims you may make

- The troubleshooting agent runs with redaction and presence-only reporting on sensitive fields.
- The release-evidence diagnostic includes a strict mode that intentionally blocks release until signing-readiness is satisfied.
- macOS signing and notarization are pending real credentials; the local artifact today is an unsigned development build.

### Forbidden claims

- Do not say "SourceDeck is signed" or "SourceDeck is notarized" or "signed and notarized."
- Do not claim the strict gate has been bypassed for production.
- Do not claim FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO 27001.

---

## 25:00–30:00 — Close / pricing / next step

### Presenter says (verbatim)

"To wrap. SourceDeck v1 organizes the capture workflow on the desktop: operating profile, opportunity intake, outreach drafting, proposal-content drafting, prime and partner support, with a human-approval gate at every send, submit, publish, or commit point. Nothing is sent automatically. On packaging: standard plans use customer-provided AI keys; premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements, and usage limits, overages, or enterprise deployment terms may apply. Pricing itself is a human-approval conversation — I am not going to quote a number on this call as an automated commitment. The next step I'd propose is a scoping session where we line up your operating profile, the opportunity types you care about, and the AI provisioning path that fits your risk and volume."

### Safe claims you may make

- SourceDeck v1 organizes capture workflow surfaces on the desktop.
- Human approval is required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.
- Pricing is a scoping conversation, not an in-call automated commitment.
- The proposed next step is a scoping session.

### Forbidden claims

- Do not quote pricing as a binding commitment in the demo.
- Do not claim "guaranteed contract," "guaranteed award," or "guaranteed revenue."
- Do not claim "unlimited AI" or "IBM watsonx included" as a present-tense capability.

---

## Fallback language

### If AI provider is not configured

"AI provisioning is not configured on this environment right now, so I'm going to walk the surface without invoking a live model and that's by design. The app surfaces readiness status rather than failing the whole experience, so the rest of the capture workflow — profile, intake, outreach staging, proposal drafting surfaces — remains usable. Remediation steps are documented in the troubleshooting agent's knowledge base, and the configuration boundary keeps any credentialed call behind the app boundary in the main process. Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply."

### If watsonx is not verified_ready

"On the watsonx readiness probe specifically, the runtime is pending verification and is not reporting verified_ready in this environment. That is exactly why we describe watsonx as a may-include for premium and enterprise rather than as a shipped live capability — we will not claim watsonx live until verification is complete end-to-end. The rest of the app does not block on this; readiness status is surfaced, and the operator can continue with customer-provided AI keys per the standard configuration path. Human approval remains required for any outreach, proposal, or pricing action regardless of which AI path is configured. Nothing is sent automatically."

### If macOS signing is not complete

"The macOS artifact in front of you is an unsigned development build because real Apple signing and notarization credentials have not been completed yet. We are deliberately not claiming the product is signed or notarized — the strict release-evidence gate is designed to block release until signing-readiness is satisfied, and that gate is doing its job. For the purpose of the demo we are walking the surfaces from the dev build, and for a production-grade deployment the signing path is part of the scoping conversation. The credential boundary, human-approval gates, and troubleshooting diagnostics are unaffected by the signing state."

---

## Q&A — anticipated buyer questions

### Does this win contracts?

No software guarantees contract awards, and SourceDeck does not make that promise. What it does is organize the capture workflow — operating profile, opportunity intake, outreach drafting, proposal-content drafting, prime and partner support, troubleshooting, and release evidence — into one desktop surface with consistent reuse of your profile data. The capture decisions remain yours. Human approval is required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending, and nothing is sent automatically. The right way to think about it is workflow leverage for your capture team, not a guarantee of awards.

### Is AI included?

Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply.

### Is IBM watsonx included?

Premium and enterprise *may* include SourceDeck-managed IBM watsonx configuration, and the inclusion depends on workflow risk, usage volume, and deployment requirements. Standard plans use customer-provided AI keys. We are not claiming watsonx as a present-tense live capability of the shipping product today — the runtime is pending verification, and we will not market it live until that verification is complete end-to-end. If watsonx is the path you need, it is a scoping conversation, not a default checkbox.

### Is this government compliant?

I am not going to claim FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 on this call, because compliance posture is a buyer responsibility and certifications require their own evidence trail. What I can describe is how the app is built. Credentialed API calls live behind the app boundary in the main process, not in the renderer. Human-approval gates govern outreach, proposal, pricing, and sending. A daily troubleshooting agent surfaces readiness with redaction. A release-evidence diagnostic, with a strict mode that intentionally blocks release until signing-readiness is satisfied, provides an honest audit trail of build state. Compliance certification is something we scope with you against your environment and requirements.

### Can it send emails automatically?

No. Outreach is human-approval-gated, the email-alert path ships in dry-run mode by default, and no message goes out without an explicit operator action. There is no auto-send and there is no silent send. The point of the staged-draft flow is that you, the operator, are the last step before anything leaves the building. Nothing is sent automatically.

### Can it submit proposals automatically?

No. Proposal content is drafted and staged for review; submission requires a human action. Pricing language inside a draft is also human-approval-gated. The app does not auto-submit, does not auto-send, and does not commit on your behalf. Bid/no-bid is a human decision, and submission is a human action.

### Can it scrape SAM.gov?

Opportunity intake is supported, and during a live demo we walk the flow with a representative sample or fixture so the demo is honest about what is happening in the room. I am not going to promise live SAM.gov scraping in the demo environment as a present-tense capability of the shipping product. For a production deployment the data-source path is part of the scoping conversation and reflects your environment, throttling considerations, and credentialing.

### What happens if the AI key fails?

The app degrades gracefully rather than blocking the whole experience. Readiness status is surfaced to the operator, the rest of the capture workflow surfaces remain usable, and remediation guidance is documented in the troubleshooting agent's knowledge base. Sensitive fields are reported presence-only with redaction, so a failed-key scenario does not leak a credential into a log. The operator decides how to remediate; the app does not silently retry against an unknown endpoint.

### Is my data safe?

The credential boundary is the answer I want you to hold onto. Credentialed API calls live in the main process behind the app boundary, and the renderer does not hold credentials. The troubleshooting agent and release-evidence diagnostic redact sensitive fields and report presence-only. I am not claiming FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 — compliance posture is a buyer responsibility and we will scope it with you against your environment. The architectural posture is designed so that secrets do not appear in UI-layer surfaces or operator-facing diagnostics.

### Can my team use this?

Yes, at the desktop layer the operator-and-team usage model is what SourceDeck v1 supports today, with the operating profile, opportunity intake, outreach drafting, proposal content, prime and partner support, and troubleshooting all on the desktop surface. Enterprise deployments may include additional configuration per the pricing and packaging conversation, including AI provisioning options per our standard language: standard plans use customer-provided AI keys, premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements, and usage limits, overages, or enterprise deployment terms may apply. Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

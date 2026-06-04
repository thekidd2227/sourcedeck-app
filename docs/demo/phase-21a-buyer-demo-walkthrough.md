# Phase 21A — Buyer Demo Walkthrough

**Phase status:** Demo acceptance gate. Docs-only deliverable.
**Repo state at lock:** `main @ 9dc9350` (PR #52 default-state data hygiene merged).
**Preceding scripts:** the longer 20–30 minute walkthrough lives in `docs/demo/sourceDeck-v1-buyer-demo-script.md`. This document adds a **5-minute version** for top-of-funnel calls and a **15-minute version** for second meetings.

**Standing rule across both scripts:** Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically. Read presenter blocks as written. Stay inside the "safe claims" column. Do not extend into the "forbidden claims" column even if a buyer pushes.

---

## A. 5-minute walkthrough — first-meeting introduction

Use for: an introductory call, a brief screen-share, or a quick "what is this" answer.

### 0:00 — 0:30 — One-sentence positioning

> "SourceDeck is a desktop operating layer for small and mid-size GovCon teams that organizes capture artifacts — operating profile, opportunity intake, outreach drafts, proposal content — into one workspace and keeps a human in the loop for every outbound action."

### 0:30 — 1:30 — Default-state hygiene (proof of credibility)

Open the app on a fresh install (or use the demo machine that has never been logged in). Walk through these three screens **in order** and verbalize what is not there:

- **Dashboard** — Automation Status card reads *"No automations active. Connect tools in Settings to populate this panel."* No pre-loaded webhook IDs. No fake "ACTIVE" production rows.
- **Activity Feed** — empty: *"No activity yet."*
- **Sysflow → Active Webhooks / Infrastructure / HTTP Standards** — all empty until tools are connected.

Say:

> "A new user does not see anyone else's pipeline. There is no fake activity, no pre-loaded webhooks, no operator templates. You configure tools or you see empty states."

### 1:30 — 3:00 — Response Desk (operational reply triage)

Open the **Response Desk** tab. Paste a sample reply (any text), click **Analyze reply**, and walk the 8 output sections:

1. Reply Summary
2. Intent + Urgency
3. Recommended Next Action
4. Pipeline Recommendation
5. Task Recommendation
6. Response Options (Direct Close / Consultative / Short Executive)
7. Safety Flags
8. **Human Approval Required** — read this section aloud.

Point out:
- No **Send Email** button anywhere on the pane.
- The audit-friendly status text: *"Draft only — not sent."*
- The save-to-CRM button is disabled until both an Airtable record ID and the operator's Airtable PAT are present.

Say:

> "Response Desk turns an inbound reply into a pipeline decision — what happened, what to do next, three review-only draft options, and an explicit safety surface. It never sends email."

### 3:00 — 4:00 — SAM Opportunity Sprint (GovCon-side)

Open the **GovCon** tab. Point at the on-screen plan note: *"Free users: 1 NAICS per sprint. Paid users: all configured NAICS codes."* If the operator has connected a SAM.gov key in their own env, mention that the sprint **lives in a separate CLI workflow** (`npm run sam:sprint`) and produces a manual report — it does not auto-send.

Say:

> "The SAM Opportunity Sprint is a manual-only report-viewer with strict plan limits. Free is one NAICS per sprint, paid is all configured. No auto-send. No proposal submission."

### 4:00 — 5:00 — Honest close

Say:

> "What I just showed you is a desktop workspace that organizes capture work and keeps a human approver in the loop. It does not guarantee contract awards or revenue. It does not auto-send outreach or auto-submit proposals. It is not FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 certified. If those line up with how you want to run capture, let's book a fifteen-minute session next week and walk through the rest."

---

## B. 15-minute walkthrough — second meeting

Use for: a follow-up that goes deeper into Response Desk, SAM Sprint, GovCon Operating Profile, and the demo-data and credential boundary stories.

### 0:00 — 1:00 — Recap + ground rules

> "Today I'm going to spend fifteen minutes on four things. One, the operating profile setup. Two, Response Desk in real depth. Three, the SAM Opportunity Sprint and how plan limits work. Four, what's verified versus pending. Standing ground rule: SourceDeck does not auto-send anything, does not auto-submit proposals, and is not a compliance certification. Human approval is required for every outbound action."

### 1:00 — 4:30 — Operating profile setup (GovCon)

Open **GovCon → first-time setup wizard** (or the operating-profile pane if the wizard has been dismissed). Walk through the 9 steps at a fast pace, narrating what is captured and what is not:

- Steps 1–3: business profile, capability statement, identifiers.
- Step 4: targeting (NAICS, PSC, agencies, set-asides, regions).
- Step 5: AI provider key (saved through `sd.credentials.set`, never returned to renderer).
- Step 6: creative provider key (same boundary).
- Step 7: social handles (stored as profile context only, never as credentials).
- Step 8: safety rules (require-approval-before-outreach, require-approval-before-content-posting, block-unsupported-certification-claims, block-confidential-content — all default true).
- Step 9: finish summary.

Say:

> "This is operator profile data, not seed data. SourceDeck does not ship anyone else's profile pre-loaded. AI provider and creative keys go through a credential boundary — they are never exposed back to the rendered UI. Safety rules default to approval-required and unsupported-claim blocking."

### 4:30 — 8:00 — Response Desk in depth

Open **Response Desk** and run through three different reply texts to show how the classifier behaves across intents:

| Sample reply | What to point at |
|---|---|
| *"We're ready to move forward — what's the next step? Send the contract."* | `hot_buying_signal` intent; urgency 95; three drafts produced. |
| *"Please unsubscribe me and do not contact again."* | `unsubscribe_or_do_not_contact` intent; **drafts suppressed** with explanatory notice; `do_not_contact` safety flag. |
| *"All vendor communications must go through procurement; unsolicited proposals are not allowed."* | `procurement_restricted` intent; drafts suppressed; `procurement_restricted` safety flag. |

Then point at the **Response Options** sub-tabs (Direct Close / Consultative / Short Executive). Click **Copy selected draft** to show the clipboard flow. Mention that the draft ends with the audit-friendly line *"Sent for your review; not auto-sent."*

Say:

> "Response Desk is deterministic and offline by default — the classifier and the three drafts come from a pure Node module, not a hosted AI service. Even if the user pastes a guaranteed-outcome phrase into the offer field, the sanitizer scrubs it before it lands in a draft. There is no Send button anywhere on this pane."

### 8:00 — 11:00 — SAM Opportunity Sprint

Switch to the **GovCon** tab. Show the Free vs Paid plan limit copy on the SAM Sprint panel. Then open a terminal and run:

```bash
SOURCEDECK_PLAN=free SAM_GOV_API_KEY=… npm run sam:sprint
```

(If you don't want to spend real SAM.gov quota, use `SOURCEDECK_PLAN=free` with a deliberately blocked NAICS so no live call goes out. The deterministic offline test `test/sam-opportunity-sprint.test.js` proves the behavior without a key.)

Point at:
- Free plan limit enforcement (the report shows *"searched 1 of N — plan limit"*).
- Manual-review-required flag on every result row.
- Sprint report is a markdown file under `reports/` — not auto-sent, not auto-submitted.

Say:

> "SAM Opportunity Sprint is a manual report viewer. Free is one NAICS per sprint, paid is all configured. The sprint never auto-sends outreach and never submits a proposal. The SAM API key is environment-only — there is no renderer surface for it."

### 11:00 — 13:00 — Honest "what's verified vs pending"

Pull up `docs/release-candidate/known-limitations.md` or `docs/troubleshooting-knowledge-base/open-issues.md`. Be specific:

- **Verified:** Default-state hygiene (no operator/demo seeds in new-user views) — PR #52 merged with 22-test regression suite. Credential boundary (no AI provider key in renderer / localStorage). Response Desk human-approval invariants. SAM Sprint Free=1/paid=many entitlement. `.btn-gold` cool gold + 900px / 899px responsive boundary (Phase 20G).
- **Pending:** Operator macOS visual screenshot QA for PR #52 (the cleanup is verified static-source; pixel-level operator pass is recommended). watsonx readiness is presence/status/remediation-only — **not** a "watsonx live" claim. macOS signing / notarization not yet executed in this environment.

Say:

> "I want to be explicit about what's verified versus pending so you don't hear a sales pitch and find a gap later. Default-state hygiene is verified. Credential boundary is verified. Response Desk safety invariants are test-asserted. SAM Sprint plan limits are test-asserted. What is pending is pixel-level operator screenshot QA, the watsonx readiness probe in your environment, and macOS signing — none of those are claimed as done."

### 13:00 — 14:30 — Buyer Q&A — objections + approved responses

See § "Buyer objections and approved responses" below. Stay inside the safe-claim column.

### 14:30 — 15:00 — Honest close + next step

> "If this fits the way you want to run capture, the next step is a working session with your operating profile and a real NAICS list — either two paid-plan NAICS codes or your full list depending on plan. I'll send a one-page recap email with the safe-claim language only. Nothing in that recap will say 'SOC 2 certified,' 'FedRAMP authorized,' 'watsonx live,' 'signed and notarized,' or 'guaranteed.' If a sentence isn't true, it doesn't go in the recap."

---

## C. Screen-by-screen walkthrough

| # | Screen | What to show | What to say | What not to say |
|---|---|---|---|---|
| 1 | Dashboard | Automation Status empty state | "No fake automations seeded for a new install." | "All your automations are running." |
| 2 | Activity Feed | "No activity yet." | "Activity is user-driven; it populates as you act." | "Today's activity feed." |
| 3 | Leads | Region select (4 neutral options) | "User-defined market or nationwide." | "We focus on NYC / Manhattan / specific regions." |
| 4 | Ad Engine | 11 generic topic categories, 49 industries, 27 platforms | "Topics are generated from your profile inputs." | "Topics come from our diagnostic library." |
| 5 | Daily Operating Rhythm | Empty checklist; user-driven via `window.userDailyOps[day]` | "Operating rhythm is user-driven or AI-generated from your goals." | "Here's your daily operational sequence." |
| 6 | Sysflow → Webhooks / Infrastructure | Empty cards | "No webhooks active until you configure tools." | "Production webhooks PROD-01 through PROD-05 are active." |
| 7 | Settings | IBM / watsonx readiness panel with `Click 'Run readiness check' to validate configuration.` | "watsonx readiness is presence/status/remediation only." | "watsonx is live." |
| 8 | Response Desk | 8 output sections; 3 sub-tab drafts; **no Send Email button** | "Draft only — not sent. Human approval required." | "Send the reply." |
| 9 | GovCon → SAM Sprint | Plan limit copy (Free=1 / paid=many) | "Manual-only report viewer." | "Auto-submits opportunities." |
| 10 | GovCon → Wizard step 8 (safety) | Approval-before-outreach + approval-before-content-posting + block-unsupported-claims + block-confidential-content default-true | "Approval gates default on; the user can review them." | "We auto-approve safe content." |

---

## D. What to say / what not to say

### Safe claims (you may make these)

- SourceDeck is a desktop workspace for small/mid GovCon capture.
- It organizes operating profile, opportunity intake, outreach drafts, and proposal-content drafts.
- Human approval is required for every outbound action.
- Credentials live behind the IPC boundary (main process), not in the renderer.
- Default state is empty / generic for new users; demo data requires `SOURCEDECK_DEMO_MODE=true`.
- SAM Opportunity Sprint is a manual report viewer; Free=1 NAICS, paid=many.
- Response Desk classifies inbound replies, suggests next actions and three review-only drafts, and never sends email.
- watsonx readiness is a presence/status/remediation surface (not a live-state claim).

### Forbidden claims (do not say these, even if pushed)

- "SourceDeck wins contracts." / "SourceDeck guarantees awards / revenue / pipeline."
- "Auto-send" / "Auto-submit" / "Send outreach automatically" / "Submit proposals automatically."
- "Unlimited AI."
- "watsonx live" / "IBM watsonx is live in production."
- "Signed and notarized" (unless the build has actually been signed and notarized — currently not).
- "FedRAMP authorized" / "SOC 2 certified" / "CMMC certified" / "HIPAA certified" / "HITRUST certified" / "ISO 27001 certified" / "Government compliant."
- "AI proposal writer" / "AI bid writer."

---

## E. Known limitations (be explicit if asked)

- **Screenshot QA** for PR #52 default-state cleanup was performed static-source; pixel-level operator visual pass on macOS is recommended before a high-stakes demo.
- **watsonx**: presence/status/remediation only. No live-state claim.
- **macOS signing / notarization**: not yet executed in the CI environment. Do not claim signed/notarized.
- **Demo mode** (`SOURCEDECK_DEMO_MODE=true`) is intentionally off by default. Default-state is empty; no operator pipeline is preloaded.
- **Inbox import** for Response Desk is not wired in this phase (paste mode only). Future iterations may add Gmail / Outlook OAuth.

---

## F. Buyer objections and approved responses

| Objection | Approved response |
|---|---|
| *"Can SourceDeck auto-send outreach?"* | "No. Every outbound action requires human approval. There is no Send Email button on Response Desk. The SAM Sprint produces a manual report and does not send anything." |
| *"Is watsonx live in your product?"* | "watsonx readiness is presence/status/remediation only. SourceDeck does not claim watsonx live as a shipping capability. Premium and enterprise deployments may configure watsonx separately." |
| *"Are you FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certified?"* | "No. SourceDeck is not a compliance certification and does not claim to be. It does not substitute for legal, contracting, or security review on your end." |
| *"Will SourceDeck win me contracts?"* | "SourceDeck organizes capture work and keeps a human in the loop. It does not guarantee contract awards or revenue. The decision support is decision support — operators apply judgement before any outreach." |
| *"Is the build signed and notarized?"* | "Not in this environment. macOS signing and notarization are configured but not executed for the build you're seeing. Do not present this as signed/notarized." |
| *"Can I get unlimited AI usage?"* | "No. Standard plans use customer-provided AI keys with the customer's own quotas. Premium / enterprise deployments may include SourceDeck-managed AI, with usage limits, overages, or enterprise terms in the pricing materials." |
| *"What happens to a reply that says 'unsubscribe'?"* | "Response Desk classifies it as `unsubscribe_or_do_not_contact`, suppresses all sales drafts, surfaces a `do_not_contact` safety flag, and recommends marking the contact do-not-contact in the CRM. No draft is generated for those replies." |
| *"What about procurement-restricted replies?"* | "Same suppression pattern. Response Desk surfaces a `procurement_restricted` flag and recommends routing through official channels rather than direct outreach." |

---

## G. Manual approval boundaries

- **Outreach** — every outbound message is a draft. The operator copies, edits, and sends from the operator's own email client or CRM.
- **Proposal content** — every draft is human-review territory before any submission.
- **Pricing** — pricing references in any draft must be reviewed by the operator before they leave the desk.
- **Compliance** — SourceDeck does not generate compliance certifications and does not auto-approve any compliance claim.
- **Bid / no-bid** — decision support only. The decision sits with the operator.
- **Teaming** — partner research is research. Teaming decisions are operator decisions.
- **Publishing / posting** — Premium Content Agent generates drafts only. Posting requires explicit human approval, and the agent never auto-publishes.
- **Sending** — there is no send transport in the renderer. Email leaves via the operator's own client.

---

## H. No-auto-send statement

SourceDeck does not auto-send email. There is no Send Email button on Response Desk. The SAM Opportunity Sprint does not auto-send and does not auto-submit. The Premium Content Agent does not auto-publish or auto-post. The GovCon Setup Wizard does not auto-submit a profile. Every outbound action is a human-triggered action on the operator's own email client, CRM, or social-publishing tool — outside SourceDeck.

## I. No guaranteed award / revenue statement

SourceDeck does not guarantee contract awards. It does not guarantee revenue. It does not guarantee response rates, savings, or pipeline outcomes. Scoring and recommendations are decision support — the operator applies judgement.

## J. No unsupported compliance statement

SourceDeck is not FedRAMP authorized. It is not SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 certified. It does not substitute for legal, contracting, or security review. Do not state otherwise during a demo or in any follow-up recap.

## K. watsonx live status rule

watsonx readiness surfaces are presence / status / remediation only. There is no "watsonx live" claim anywhere in the shipping product. The presenter must not extend that into a live claim. A "watsonx live" claim is allowed only if `verified_ready` evidence exists for the buyer's environment — and only with the language exactly as documented in `docs/release-candidate/go-no-go-checklist.md`.

## L. Signed / notarized status rule

The macOS build in this environment is **not** signed or notarized. The presenter must not claim signed/notarized. A signed/notarized claim is allowed only after the operator runs `npm run build:mac` with full Apple Developer credentials in a configured signing environment, and after the build is verified through Apple's notarization service. Until then, present it as "unsigned development build for demo purposes."

---

## M. Final Go / No-Go for a demo

Use this short list as the pre-meeting check. If any item is "no," reschedule the demo or scope it down.

- [ ] App opens to clean default state (no operator/demo seeds, no PROD-XX, no NYC dropdown defaults, no fake Airtable / Gmail IDs). Verified by PR #52 static-source pass.
- [ ] Response Desk pane has no Send Email button (asserted by `test/response-desk.test.js` #23 and `test/default-state-policy.test.js` #17).
- [ ] GovCon SAM Sprint shows the Free = 1 NAICS / Paid = many copy.
- [ ] No "watsonx live" / "signed and notarized" / compliance-certified language anywhere in the build the presenter will show.
- [ ] Presenter has reviewed the safe-claim and forbidden-claim columns above.
- [ ] Presenter has the buyer objections / approved responses table loaded and ready.
- [ ] If a demo machine is used, it is the **default-state install** — not the operator's working machine with active pipeline data.

If every line is checked: **GO**.
If any line is unchecked: **NO-GO** until the gap is closed.

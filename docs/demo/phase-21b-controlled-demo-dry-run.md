# Phase 21B — Controlled Buyer Demo Dry Run

**Repo state at lock:** `main @ f23bd07` (Phase 21A buyer demo acceptance gate merged).
**Use with:** `docs/demo/phase-21a-buyer-demo-walkthrough.md` (5-min and 15-min scripts), `docs/commercial-readiness/phase-21a-go-no-go-checklist.md` (formal gate), `docs/demo/phase-21b-recording-shot-list.md` (frame-by-frame capture).
**Audience:** the demo operator + one internal reviewer. Run this dry run **before** the first buyer-facing meeting.

This is a rehearsal protocol, not a sales script. The 21A walkthrough already contains the verbatim presenter language. This doc walks the operator through the rehearsal itself: what to set up, what to capture, what to listen for, and what to fix before going live with a real buyer.

---

## 1. Dry-run checklist (before any recording)

Run this list end-to-end. Every line must be **GO** before recording starts.

### A. Machine setup

- [ ] Demo machine is a **default-state install** (a clean install or a wiped Settings state). Not the operator's working machine with active pipeline data.
- [ ] `git pull origin main` ran successfully; HEAD is `f23bd07` or newer.
- [ ] `npm test` returns green (full suite incl. `test/default-state-policy.test.js`, `test/response-desk.test.js`, `test/sam-opportunity-sprint.test.js`).
- [ ] `SOURCEDECK_DEMO_MODE` is unset (or anything other than `true`).
- [ ] `SAM_GOV_API_KEY` is unset for the dry run (we will not run a live SAM Sprint).
- [ ] No other application is open in front of the operator's screen capture region.
- [ ] System notifications, calendar pop-ups, Slack badges, email-app badges, and any sensitive desktop wallpaper are silenced or hidden.
- [ ] Browser tabs unrelated to the demo are closed.

### B. App walk-through (verify visually before pressing Record)

- [ ] **Dashboard** Automation Status card reads "No automations active. Connect tools in Settings to populate this panel."
- [ ] **Activity Feed** reads "No activity yet."
- [ ] **Leads** region select shows the 4 neutral options (`Select market…` / `United States (Nationwide)` / `Canada` / `United Kingdom` / `User-defined`).
- [ ] **Ad Engine** title reads "Ad Engine" (not "Faceless Ad Engine"); 11 generic topic categories visible; 49 industries dropdown; 27 platforms dropdown; campaign placeholder reads "e.g. Q2 product launch".
- [ ] **Daily Operating Rhythm** shows the empty-state copy "No operating rhythm yet…"
- [ ] **Sysflow** Active Webhooks / Infrastructure / HTTP Standards all show empty states.
- [ ] **AI Generate** target-profile placeholder is the generic copy ("Describe your ideal customer, location, offer, company size, pain point, and urgency…"); Geography select shows 5 neutral options; Industry Focus shows the broad list.
- [ ] **Settings → IBM mode / watsonx readiness** panel reads "Click 'Run readiness check' to validate configuration." (No "watsonx live" wording anywhere.)
- [ ] **Response Desk** pane renders; "Human approval required" section visible; "Draft only — not sent" audit-friendly line visible; **no Send Email / Auto-Send / Submit Quote button anywhere**.
- [ ] **GovCon → SAM Opportunity Sprint** panel shows "Free users: 1 NAICS per sprint. Paid users: all configured NAICS codes."
- [ ] `.btn-gold` buttons render **cool gold** (`#C9941A`), not brass.
- [ ] Window resize from default to ≤899 px collapses the sidebar to horizontal without layout regression.

### C. Presenter prep

- [ ] Presenter has read `docs/demo/phase-21a-buyer-demo-walkthrough.md` § D (safe-claim / forbidden-claim columns) within the last 24 hours.
- [ ] Presenter has read § F (buyer objections + approved responses).
- [ ] Presenter has chosen the script length (5-min or 15-min) in advance.
- [ ] Presenter has rehearsed the opening line verbatim.
- [ ] Presenter has the buyer-name and meeting-context placeholders pre-filled in the follow-up email template (Section 10 below).
- [ ] Presenter has agreed on the **stop-and-flag** signal with the internal reviewer (see Section 9 — Red flags).

### D. Recording setup

- [ ] Screen recorder captures **only the SourceDeck window** (not the full desktop).
- [ ] Audio input level is tested (presenter clearly audible, no peaking).
- [ ] Recording resolution is at least 1280 × 800 (so the buyer can read the UI).
- [ ] Recording target directory is `tmp/phase-21b-recordings/` (gitignored; see Section 11).
- [ ] Output file naming convention is set: `21b-{date}-{script-length}-{take-number}.mp4`.

If every line in A–D is GO → proceed to rehearsal. If any line is NO-GO → fix the gap before recording. Document the gap in the corrections list (Section 11).

---

## 2. Exact 5-minute rehearsal flow

Use this exact timing and screen-sequence. The verbatim narration lives in `docs/demo/phase-21a-buyer-demo-walkthrough.md` § A — read those quote blocks **as written**.

| Time | Screen | Action | Source quote |
|---|---|---|---|
| 0:00 – 0:30 | (any screen; can be the SourceDeck title bar) | One-sentence positioning | 21A § A "0:00 – 0:30 — One-sentence positioning" |
| 0:30 – 1:30 | Dashboard → Activity Feed → Sysflow | Show three empty-state screens in order; verbalize what is **not** there | 21A § A "0:30 – 1:30 — Default-state hygiene" |
| 1:30 – 3:00 | Response Desk | Paste sample reply; click **Analyze reply**; walk the 8 output sections; point at no-Send-Email + Draft-only line | 21A § A "1:30 – 3:00 — Response Desk" |
| 3:00 – 4:00 | GovCon → SAM Sprint | Point at plan-limit copy; mention CLI-only sprint | 21A § A "3:00 – 4:00 — SAM Opportunity Sprint" |
| 4:00 – 5:00 | (any neutral SourceDeck pane) | Honest close + next-step ask | 21A § A "4:00 – 5:00 — Honest close" |

**Timing discipline:** if any section runs >15 seconds long, stop on the next clean cut and re-do that take. Do not "save it in the edit." A buyer-facing recording is one clean take or it's a re-do.

---

## 3. Exact 15-minute rehearsal flow

The same discipline — verbatim narration lives in 21A § B.

| Time | Screen | Action | Source quote |
|---|---|---|---|
| 0:00 – 1:00 | Title / Dashboard | Recap + ground rules | 21A § B "0:00 – 1:00 — Recap + ground rules" |
| 1:00 – 4:30 | GovCon Setup Wizard or Operating Profile | Walk steps 1–9 at fast pace; narrate what is captured and what is not | 21A § B "1:00 – 4:30 — Operating profile setup" |
| 4:30 – 8:00 | Response Desk | Run 3 different reply texts (hot buying / unsubscribe / procurement-restricted); show drafts + suppression + safety flags; click Copy selected draft | 21A § B "4:30 – 8:00 — Response Desk in depth" |
| 8:00 – 11:00 | GovCon → SAM Sprint | Show plan-limit copy; mention deterministic offline test; **do not run live `npm run sam:sprint`** during the dry run | 21A § B "8:00 – 11:00 — SAM Opportunity Sprint" |
| 11:00 – 13:00 | (release docs in terminal / preview) | Walk verified-vs-pending lines from `docs/release-candidate/known-limitations.md` or `docs/troubleshooting-knowledge-base/open-issues.md` | 21A § B "11:00 – 13:00 — Verified vs pending" |
| 13:00 – 14:30 | (any neutral SourceDeck pane) | Buyer Q&A — use approved responses from 21A § F | 21A § B "13:00 – 14:30 — Buyer Q&A" |
| 14:30 – 15:00 | (closing screen) | Honest close + next-step ask | 21A § B "14:30 – 15:00 — Honest close + next step" |

**Live SAM Sprint reminder:** the dry run does **not** call SAM.gov. The deterministic offline test (`test/sam-opportunity-sprint.test.js`) proves the entitlement behavior without a key. Do not set `SAM_GOV_API_KEY` for the dry run.

---

## 4. Screen capture shot list

The detailed shot list lives in `docs/demo/phase-21b-recording-shot-list.md`. The summary:

- **Shots 1–4**: empty-state screens (Dashboard, Activity Feed, Leads region select, Sysflow infrastructure).
- **Shots 5–7**: Ad Engine (title, topic dropdown, industry dropdown).
- **Shots 8–10**: Response Desk (input panel, 8 output sections, no-Send-Email zoom).
- **Shots 11–13**: GovCon SAM Sprint plan-limit copy + Setup Wizard steps 5–8.
- **Shot 14**: watsonx readiness panel ("presence/status/remediation only" copy).
- **Shot 15**: Phase 20G visual guard frame (a `.btn-gold` button rendered cool gold at default desktop width).

---

## 5. What not to show

These are **stop-and-cut** moments. If any of the following enters the frame, the take is dead — stop, cut, fix, re-record:

- Real Airtable / Apollo / OpenAI / Anthropic / Notion / Gmail / Instantly **credential values** in any input field, even partially.
- The operator's **own working machine** state (any actual lead, deal, opportunity, or pipeline row).
- The operator's **personal Notion**, **personal Gmail**, **personal Airtable base**, or any other live account that is not the test/demo account.
- The `.env` file contents in any terminal pane.
- Any browser tab with the operator's personal email open.
- Any system notification with a real buyer / partner / prospect name in it.
- A **rebrand-in-progress** screen (e.g., a "Faceless Ad Engine" cached title). Verify the build is the merged `main @ f23bd07` or newer.
- A **macOS finder window** showing a private folder structure.
- Any **demo-data fixture** (the `SOURCEDECK_DEMO_MODE=true` path is for a different recording — not this one).
- A **terminal window with secrets in scrollback**.

If the recording captures any of these, the operator must **delete the file** (do not commit), make a note in Section 11 corrections, and re-record from the affected segment.

---

## 6. Claim-safe narration (rehearsal practice)

The narration is verbatim from 21A § A and § B. The dry run's purpose is to make sure the presenter can deliver it under camera pressure without drifting into the forbidden-claim column.

Practice the following five "pivot moments" before recording. These are where presenters most often slip into a forbidden claim:

| Pivot | Drift risk | Correction |
|---|---|---|
| Buyer says *"So this thing wins contracts?"* | Drift to "yes, it wins" | "It organizes capture work and keeps a human approver in the loop. It does not guarantee contract awards." |
| Buyer says *"Is the AI unlimited?"* | Drift to "yes, no caps" | "No. Standard plans use your AI keys with your quotas. Enterprise deployments may include SourceDeck-managed AI with usage terms." |
| Buyer says *"Is watsonx live?"* | Drift to "yes, it's running" | "watsonx readiness is presence/status/remediation only. We don't claim it as a live shipping capability." |
| Buyer says *"You FedRAMP / SOC 2 / CMMC?"* | Drift to "we're working on it" | "We are not certified. SourceDeck is not a compliance certification and does not substitute for legal, contracting, or security review." |
| Buyer says *"Is this build signed and notarized?"* | Drift to "yes, fully signed" | "Not in this environment. The build you're seeing is an unsigned development build for demo purposes." (Unless the four-step notarization workflow in 21A § L has been completed for the actual build the buyer is seeing.) |

Each pivot must be answered **as written**, not paraphrased. The presenter rehearses each one out loud at least twice before recording.

---

## 7. Buyer questions and approved answers

The canonical Q&A table lives in `docs/demo/phase-21a-buyer-demo-walkthrough.md` § F. This dry-run doc adds three rehearsal-specific Q&A items the presenter is likely to hear from the internal reviewer (which simulate buyer push-back):

| Reviewer question (simulating buyer) | Approved answer |
|---|---|
| *"What happens if I demo this on Wi-Fi that drops mid-call?"* | "Response Desk and the default Ad Engine generation run deterministically offline. SAM Sprint is a CLI workflow that uses the operator's own SAM key; the in-app pane is a viewer. None of the demo paths require continuous internet." |
| *"What if the buyer asks for a copy of the build right now?"* | "We don't distribute the build off the demo machine. Premium and enterprise deployments may include a signed build via the deployment workflow — that's a separate scoped engagement, not a download." |
| *"What if the buyer wants to see the watsonx integration in action?"* | "We show the readiness panel. We do not run a live watsonx call during the demo. If the buyer's environment is in scope for watsonx, we schedule a separate working session with `npm run watsonx:runtime-probe` against their config." |

---

## 8. Known limitations to disclose

The presenter must disclose these limitations if asked. Do not bury them.

- **macOS signing / notarization**: not executed in the CI environment. The build shown in the dry run is an unsigned development build. (Status rule: 21A § L.)
- **watsonx**: presence / status / remediation only. No live-state claim. (Status rule: 21A § K.)
- **Inbox import** for Response Desk: not wired in Phase 21A/21B. Paste mode only.
- **Demo data**: off by default (`SOURCEDECK_DEMO_MODE=true` required). The dry run does not enable it.
- **Pixel-level screenshot QA on macOS** for PR #52 default-state cleanup: not yet captured. Static-source verification is in place; the operator may complete the pixel pass as a follow-up.
- **Live SAM Sprint**: not run during the dry run. The deterministic offline test proves the entitlement behavior without a key.
- **Pricing**: do not state pricing during the demo. Pricing references live in `docs/commercial-readiness/buyer-one-page-overview.md` and are sent as a follow-up.

---

## 9. Red flags that stop the demo

The internal reviewer watches for these conditions during the rehearsal. If any of them triggers, **stop, cut, and re-record** from the affected segment.

| Red flag | Action |
|---|---|
| Presenter says any phrase from 21A § D forbidden-claim column | Stop. Re-deliver the segment verbatim from the safe-claim column. |
| Presenter says "watsonx live" without `verified_ready` evidence | Stop. Replace with "watsonx readiness is presence/status/remediation only." |
| Presenter says "signed and notarized" without the notarization artifact | Stop. Replace with "unsigned development build for demo purposes." |
| Presenter says "auto-send" or "auto-submit" outside of a negative assertion | Stop. Replace with "every outbound action requires human approval." |
| A real credential value (sk-, sk-ant-, AKIA, Bearer, x-api-key, etc.) appears on screen | Stop. Cut. Re-record from the affected segment. Delete the take. |
| A real buyer / partner / prospect name appears on screen | Stop. Cut. Re-record from the affected segment. Delete the take. |
| App state shows operator's working machine (active leads, pipeline rows) | Stop. Re-set the machine to default state. Restart the rehearsal. |
| `.btn-gold` renders brass instead of cool gold | Stop. Investigate `--gold` regression before proceeding. |
| Sidebar layout regresses at the 900 / 899 px boundary | Stop. Investigate Phase 20G regression before proceeding. |
| The Send Email / Auto-Send button appears anywhere on Response Desk | Stop. Investigate Phase 51 (Response Desk) regression before proceeding. |

The reviewer's stop-and-flag signal is a single hand-raise (agreed before the recording starts). The presenter cuts immediately on the signal. No "let me finish this thought."

---

## 10. Post-demo follow-up email template

The presenter sends the recap email **after re-reading it for forbidden claims**. The template is intentionally minimal.

```
Subject: SourceDeck recap — next step

Hi {buyer-name},

Thanks for the time today. A short recap of what I showed:

- SourceDeck is a desktop workspace that organizes capture artifacts
  (operating profile, opportunity intake, outreach drafts, proposal
  content) and keeps a human approver in the loop for every outbound
  action.
- Response Desk classifies inbound replies, scores urgency / revenue /
  risk, and produces three review-only draft options. No email is sent
  automatically.
- SAM Opportunity Sprint is a manual report-viewer with strict plan
  limits — Free is one NAICS per sprint, paid is all configured NAICS.
  It does not auto-send or auto-submit.
- watsonx readiness is presence/status/remediation only. We did not
  claim it as a live shipping capability.
- The build you saw is an unsigned development build for demo
  purposes. SourceDeck is not FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or
  ISO 27001 certified, and does not guarantee contract awards or
  revenue.

Next step on my side: {one specific next-step from the meeting}.
Next step on your side: {one specific next-step from the meeting}.

Happy to set a {15-minute / 30-minute} working session for {date
window}.

{Presenter name}
```

**Mandatory re-read pass before send.** Look for: `guaranteed`, `auto-send`, `auto-submit`, `SOC 2`, `FedRAMP`, `CMMC`, `HIPAA`, `HITRUST`, `ISO 27001`, `watsonx live`, `signed and notarized`, `unlimited AI`, `government compliant`. If any of those appear outside of a negative assertion, rewrite the sentence.

---

## 11. Corrections list format

After every rehearsal take, the presenter and the internal reviewer fill in a corrections row before the next take. The format:

| # | Timecode | What went wrong | Fix | Re-record needed |
|---|---|---|---|---|
| 1 | 0:42 | Presenter said "auto-send" outside of negation | Re-deliver "every outbound action requires human approval" verbatim | Yes — from 0:30 |

A blank corrections list at the end of a take = the take is approvable. A non-blank list = re-record the affected segments.

Save the corrections list in `tmp/phase-21b-recordings/corrections-{date}-{take-number}.md` (gitignored). **Do not commit corrections lists**, recordings, or screenshots to the repo unless the operator has explicitly authorized it.

---

## 12. Final demo readiness recommendation

After at least one **approvable take** of each script length (5-min and 15-min), and after the corrections list for each approvable take is blank, the demo is ready.

- **5-min approvable take obtained?** ☐
- **15-min approvable take obtained?** ☐
- **Both takes pass the post-recording forbidden-claim grep** (search the transcript or rewatch the recording with the 21A § D forbidden list)? ☐
- **Phase 21A Go / No-Go checklist (`docs/commercial-readiness/phase-21a-go-no-go-checklist.md`)** signed off? ☐

If all four are ☐ → **READY**. The operator may schedule the first buyer-facing meeting.
If any is ☐ → **NOT READY**. Close the gap, re-record, re-review, sign off, then schedule.

**Recommendation at PR open:** the dry-run package is in place; the rehearsal itself is an operator-driven step that must happen on macOS with a screen recorder. The static-source side (this PR) is **GO**. The recording side is **operator-required**.

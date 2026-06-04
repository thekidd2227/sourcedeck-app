# Phase 21B — Recording Shot List

**Repo state at lock:** `main @ f23bd07`.
**Use with:** `docs/demo/phase-21b-controlled-demo-dry-run.md` (the rehearsal protocol), `docs/demo/phase-21a-buyer-demo-walkthrough.md` (verbatim narration).

Frame-by-frame shot list for the controlled buyer-demo recording. Every shot is captured **once, cleanly**. If a shot has a forbidden-claim slip, a credential leak, or a Phase-20G/21A regression, delete the take and re-record from that shot.

Shots 1–15 cover the 5-min and 15-min flows. Shots marked **5-min** are required for the short recording; shots marked **15-min** are required for the long recording; shots marked **both** appear in both.

---

## Pre-roll checklist

Before the first shot:

- [ ] Default-state install verified (per `docs/demo/phase-21b-controlled-demo-dry-run.md` § 1.A and § 1.B).
- [ ] Window size set to **1440 × 900** (default desktop framing).
- [ ] Mouse cursor speed normalized so on-screen pointer movement is readable.
- [ ] System chrome (menu bar clock, app dock badges) is silenced or hidden.
- [ ] Recording target directory `tmp/phase-21b-recordings/` exists (gitignored — do not commit).
- [ ] Audio test recording verified.

---

## Shot 1 — Default desktop shell (5-min and 15-min)

**Use:** title card / first frame.
**View:** SourceDeck open at Dashboard tab; full window in frame; window size 1440 × 900.
**Hold time:** 2–3 seconds.
**Narration:** None — this is a settle frame before the opening line.
**Verify before capture:**
- Topbar is Civic Atelier federal-navy command zone.
- Sidebar is obsidian command zone.
- `.btn-gold` button (any visible) is cool gold `#C9941A`, not brass.
- No notifications, badges, or operator data visible.

## Shot 2 — Dashboard Automation Status empty state (5-min and 15-min)

**Use:** proof-of-clean default state.
**View:** zoom on the Automation Status card on Dashboard.
**Hold time:** 4 seconds.
**Verify before capture:**
- Card reads exactly **"No automations active. Connect tools in Settings to populate this panel."**
- No `PROD-XX` rows visible. No "ACTIVE" badges. No `Warmup Score 100/100`.

## Shot 3 — Activity Feed empty state (5-min and 15-min)

**Use:** proof-of-clean default state.
**View:** zoom on the Activity Feed region.
**Hold time:** 3 seconds.
**Verify before capture:**
- Feed reads **"No activity yet."**
- No `🚀 PROD-03 processed 3 leads → Contacted` style fallback rows.

## Shot 4 — Leads region select (5-min and 15-min)

**Use:** proof-of-clean default state.
**View:** open the region select dropdown on the Leads pane.
**Hold time:** 3 seconds (with the dropdown open).
**Verify before capture:**
- Options shown: `Select market…`, `United States (Nationwide)`, `Canada`, `United Kingdom`, `User-defined (specify in target profile)`.
- No `NYC Metro`, `Manhattan`, `Brooklyn`, `Bronx`, `Queens`, `Staten Island`, `Westchester`, `Spanish Caribbean`, `Mexico`, `Colombia`, `South Africa` entries.

## Shot 5 — Ad Engine pane title (5-min and 15-min)

**Use:** proof of rename.
**View:** Ad Engine pane header.
**Hold time:** 2 seconds.
**Verify before capture:**
- Pane title reads exactly **"Ad Engine"**.
- Does **not** read "Faceless Ad Engine".

## Shot 6 — Ad Engine topic dropdown (15-min only)

**Use:** proof of generic categories.
**View:** topic dropdown opened.
**Hold time:** 4 seconds.
**Verify before capture:**
- Options visible: `Select topic or generate from profile…`, `Awareness`, `Lead generation`, `Educational`, `Offer`, `Retargeting`, `Testimonial`, `Seasonal`, `Recruiting`, `Brand authority`, `Product/service explainer`, `Other`.
- Helper copy below dropdown reads **"Topics are generated from your industry, platform, offer, audience, goal, and notes."**
- No `Diagnosis-First Families`, `MedPilot`, `Operator POV`, `Revenue Leakage Math`, `Government Contractor Diagnostic`, `Caribbean & LatAm Operator Diagnostic`, `Bad-Fit Opportunity Chase` entries.

## Shot 7 — Ad Engine industry / platform dropdowns (15-min only)

**Use:** proof of broad coverage.
**View:** quick scroll through the industry dropdown (49 entries), then the platform dropdown (27 entries).
**Hold time:** 5 seconds total (split across both dropdowns).
**Verify before capture:**
- Industry list begins with `All / Mixed`, then 49 industries (Property Management → … → Other).
- Platform list shows Instagram, Facebook, LinkedIn, TikTok, YouTube, YouTube Shorts, X / Twitter, Threads, Pinterest, Snapchat, Reddit, Quora, Google Business Profile, Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads, YouTube Ads, Email, SMS, Blog / SEO, Landing Page, Podcast, Webinar, Marketplace, Multi-Platform, Other.

## Shot 8 — Response Desk input panel (5-min and 15-min)

**Use:** show 8 input fields and the safety helper copy.
**View:** Response Desk pane after a sample reply is pasted (e.g., *"We're ready to move forward — what's the next step?"*). Do not paste any real reply.
**Hold time:** 4 seconds.
**Verify before capture:**
- Inputs visible: Company / Contact, Their reply, Original outreach / campaign context, Offer discussed, Current pipeline stage, Estimated deal value, User goal, Optional CRM / Airtable record ID.
- Helper copy below pane title reads **"Response Desk turns replies into pipeline actions."**
- Safety-helper line at the bottom of the input card reads **"Draft only — not sent. Response Desk never auto-sends…"**

## Shot 9 — Response Desk 8 output sections (5-min and 15-min)

**Use:** show the 8 output sections after clicking **Analyze reply**.
**View:** Response Desk pane after analysis. The 8 numbered sections must all be visible in a single scroll.
**Hold time:** 6 seconds.
**Verify before capture:**
- Sections 1 Reply Summary, 2 Intent + Urgency, 3 Recommended Next Action, 4 Pipeline Recommendation, 5 Task Recommendation, 6 Response Options (3 sub-tabs), 7 Safety Flags, 8 Human Approval Required.
- Section 8 text reads "Human approval required: yes · auto-send: no · Draft only — not sent. All outbound responses require explicit human approval."

## Shot 10 — Response Desk no-Send-Email zoom (5-min and 15-min) — **CRITICAL**

**Use:** zoom-in on the action button row to prove no Send Email button exists.
**View:** the action buttons row at the bottom of the Response Desk pane.
**Hold time:** 5 seconds. Cursor hovers each button briefly to show its label.
**Verify before capture:**
- Buttons shown: `Copy selected draft`, `Create follow-up task`, `Save analysis to CRM/Airtable` (disabled by default), `Mark do-not-contact`, `Move to nurture`, `Open lead record`.
- **No** Send Email / Auto-Send / Submit Quote button anywhere in frame.

This shot is the highest-stakes proof in the recording. If a Send Email button is visible, **stop immediately**, investigate the Phase 51 (Response Desk) regression, and do not continue the recording until it's fixed.

## Shot 11 — Daily Operating Rhythm empty state (15-min only)

**Use:** proof-of-clean default state.
**View:** Daily Operating Rhythm tab.
**Hold time:** 3 seconds.
**Verify before capture:**
- Checklist column reads **"No operating rhythm yet. Add tasks, connect workflows, or ask AI to generate a daily rhythm from your goals."**
- Weekly Rhythm card reads **"No weekly rhythm yet. Generate from your goals or add your own."**
- Escalation Rules card reads **"No escalation rules configured. Define your own follow-up triggers and time windows."**

## Shot 12 — Sysflow Active Webhooks / Infrastructure / HTTP Standards (15-min only)

**Use:** proof-of-clean default state.
**View:** Sysflow tab with the three sysflow cards in frame side-by-side.
**Hold time:** 4 seconds.
**Verify before capture:**
- All three cards show their respective empty-state messages.
- No `PROD-01 Assessment`, `PROD-05 Booking`, `LCC Booking` rows.
- No `appXXXXXXXXXXXXXXX`, `8125092`, `4595758`, `ti5tlit9...`, `jpu2xj...` IDs.

## Shot 13 — GovCon SAM Sprint plan limit copy (5-min and 15-min)

**Use:** prove the Free=1 / paid=many entitlement.
**View:** zoom on the SAM Sprint panel where the plan-limit copy lives.
**Hold time:** 4 seconds.
**Verify before capture:**
- Panel copy reads **"Free users: 1 NAICS per sprint. Paid users: all configured NAICS codes."**
- No live SAM.gov call initiated during the recording.

## Shot 14 — watsonx readiness panel (15-min only)

**Use:** prove the presence/status/remediation-only wording.
**View:** Settings → IBM mode → watsonx readiness sub-panel.
**Hold time:** 3 seconds.
**Verify before capture:**
- Default state reads **"Click 'Run readiness check' to validate configuration."**
- Helper copy reads **"watsonx credentials are stored securely and are not exposed back to the interface."**
- **No** "watsonx live" wording anywhere in frame.

## Shot 15 — `.btn-gold` regression guard frame (5-min and 15-min)

**Use:** prove Phase 20G visual guard.
**View:** any view that contains a `.btn-gold` button rendered at default desktop width (e.g., the Generate Leads button on the AI Generate pane, or the "Analyze reply" button on Response Desk).
**Hold time:** 2 seconds. Optionally zoom for clarity.
**Verify before capture:**
- Button background is **cool gold `#C9941A`**, not brass `#B08A3C`.
- Text on button is dark (black-on-cool-gold).

---

## Post-roll checklist

After all required shots are captured:

- [ ] Forbidden-claim grep of the transcript / re-watch (see `docs/demo/phase-21b-controlled-demo-dry-run.md` § 6).
- [ ] Take saved to `tmp/phase-21b-recordings/21b-{date}-{script-length}-{take-number}.mp4` (gitignored).
- [ ] Corrections list saved alongside the take.
- [ ] No file under `tmp/phase-21b-recordings/` has been `git add`-ed.

---

## File-handling rules

- **Recordings live under `tmp/phase-21b-recordings/`.** This path is **not** in `.gitignore` by default — the operator must add `tmp/` (or `tmp/phase-21b-recordings/`) to `.gitignore` **before** dropping any video file there. Otherwise the next `git add .` could commit the recording.
- **Do not commit recordings.** Recordings are buyer-facing artifacts that may contain operator-specific framing; they belong on the operator's local machine or a controlled cloud drive, not in the public repo.
- **Do not commit corrections lists** unless the operator explicitly authorizes it.
- **Do not commit screenshots** from the recording session unless the operator explicitly authorizes it.

---

## What to do if a shot fails

If a shot fails any of the **Verify before capture** lines:

1. Stop the recording.
2. Record the failure in the corrections list (Section 11 of the dry-run doc).
3. If the failure is a default-state regression (PROD-XX row visible, NYC dropdown visible, fake IDs visible, etc.) → check that the demo machine is running `main @ f23bd07` or newer; re-pull and rebuild if needed.
4. If the failure is a Phase 20G regression (`.btn-gold` brass; sidebar layout at 900 / 899 px) → stop and investigate before any further demo work.
5. If the failure is a Phase 51 Response Desk regression (Send Email button visible) → stop and investigate before any further demo work.
6. If the failure is a forbidden-claim slip → re-deliver the segment verbatim from `docs/demo/phase-21a-buyer-demo-walkthrough.md` § D safe-claim column.
7. Re-record from the failed shot. Do not patch in post.

---

## Approval

A take is **approvable** when:

- Every required shot for the chosen script length is captured.
- Every shot's **Verify before capture** lines were green.
- The post-recording forbidden-claim grep / re-watch returns clean.
- The corrections list is blank.

Two approvable takes (one 5-min, one 15-min) → demo recording package is **complete**.

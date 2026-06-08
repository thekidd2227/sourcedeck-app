# Phase 25B — Daily Test Checklist

**Date:** 2026-06-08
**Companion plan:** `docs/trial/phase-25b-7-day-internal-trial-plan.md`.
**Companion log template:** `docs/trial/phase-25b-troubleshooting-log-template.md`.

For each day, the operator fills out the checklist locally. Do not commit completed checklists, screenshots, or videos. Record findings in the troubleshooting log structure.

---

## Hold conditions (apply to every day)

If **any** of the following occurs, **stop the day's run**, mark the trial paused, and escalate to Tier 2:

- ❌ Setup wizard does not open for a new user (clean `localStorage` state).
- ❌ SAM.gov key paste-prompt appears on the SAM search screen, an opportunity screen, a workflow screen, an export screen, or a demo screen.
- ❌ `Send Email` control appears in active renderer UI.
- ❌ `Submit Bid` control appears in active renderer UI.
- ❌ `Submit Quote` control appears in active renderer UI.
- ❌ `Export and submit` control or copy appears.
- ❌ Any portal-upload (SAM.gov / PIEE / eBuy / GSA / agency portal) control appears.
- ❌ Internal Review Export copy claims the package was "submitted" / "sent" / "uploaded."
- ❌ `npm test` or any sentinel test fails.
- ❌ Setup completion flag breaks (does not persist or persists incorrectly).
- ❌ App crashes during a core workflow.
- ❌ Any secret (API key, signing identity, Apple credential, Stripe key) appears in any visible surface, console output, log file, or committed artifact.
- ❌ Stale pricing ($79 / $349 / $999 subscription, $997 / $2,497 / $4,997 implementation) appears in active app UI.
- ❌ Any unsupported claim appears: signed and notarized / Apple notarized / production signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed award / guaranteed revenue.

---

## Day 0 — Baseline

**Objective:** confirm the build, gates, and credential boundaries are in their documented Phase 25A state.

**Steps:**
- [ ] `git checkout main && git pull origin main`
- [ ] `npm test` — pass.
- [ ] `npm run release:evidence` — `state: local_unsigned_dev`, `warnings: []`, `blockers: []`.
- [ ] `npm run govcon:smoke` — pass.
- [ ] `npm run troubleshooting:scan` — no fail / warn.
- [ ] `node scripts/release-check.js` — privacy gate clean, signing env MISSING (expected).
- [ ] Clear `localStorage` for a clean state.
- [ ] Launch app cold.
- [ ] Setup Wizard auto-opens.
- [ ] Open Settings → API Keys → confirm SAM.gov key row exists.
- [ ] Confirm `id="out-samkey"` is **absent** from the SAM search surface.
- [ ] Confirm renderer has no `Send Email`, `Submit Bid`, `Submit Quote`, `Export and submit`, or portal-upload control.

**Required evidence to record (manually, locally; not committed):**
- Gate command exit codes.
- Setup Wizard step count = 11 confirmation.
- Screenshot or text note: Settings tab SAM key row present (do not commit).
- Screenshot or text note: SAM search screen has no key request (do not commit).

**Issue notes:** record in `phase-25b-troubleshooting-log-template.md`.

---

## Day 1 — First-run onboarding

**Objective:** simulate a new user completing setup end-to-end.

**Steps:**
- [ ] Clear `localStorage`. Relaunch app.
- [ ] Setup Wizard auto-opens.
- [ ] Step 1 Welcome → Next.
- [ ] Step 2 Company basics → enter "Sample SDVOSB LLC" + synthetic UEI + synthetic CAGE.
- [ ] Step 3 Capability statement → paste synthetic statement OR Skip.
- [ ] Step 4 Targeting profile → NAICS 561210, PSC S203, SDVOSB, agencies VA + Army + GSA.
- [ ] Step 5 SAM.gov key → enter operator's own SAM key OR Skip; verify both paths reach Step 6.
- [ ] Step 6 AI provider → Skip.
- [ ] Step 7 Creative → Skip.
- [ ] Step 8 Social → Skip.
- [ ] Step 9 Safety & approval → read.
- [ ] Step 10 Quick Setup Tour → read.
- [ ] Step 11 Final Confirmation → check all 5 boxes → Finish.
- [ ] Verify `localStorage.sd.govcon.setupComplete === true`.
- [ ] Quit app. Relaunch. Confirm Setup Wizard does **not** auto-open.
- [ ] Open Settings → click "Run Setup Wizard" fallback button → confirm wizard opens.

**Required evidence to record:**
- Step-by-step pass/fail.
- `setupComplete` flag state after Step 11.
- Settings fallback button behavior.

---

## Day 2 — Opportunity discovery workflow

**Objective:** exercise SAM Sprint / search / Capture Command Center / Operating Rhythm without buyer credentials.

**Steps:**
- [ ] Use only sample/demo data or operator's own targeting profile.
- [ ] Open SAM Sprint / SAM search.
- [ ] **Verify: no SAM key paste-prompt on this screen.**
- [ ] Run a search against the operator's own key (configured in Settings).
- [ ] Add a sample pursuit in Capture Command Center.
- [ ] Attach the sample solicitation.
- [ ] Set bid/no-bid decision.
- [ ] Open Operating Rhythm digest → verify deadlines surface correctly.
- [ ] Verify no `Send Email` / `Submit Bid` / `Submit Quote` / `Upload to portal` control exists on any screen exercised today.

**Required evidence to record:**
- SAM search screen has no key prompt: confirmed / not confirmed.
- Operating Rhythm renders.
- Bid/no-bid persists.

---

## Day 3 — Solicitation / compliance workflow

**Objective:** exercise Solicitation Workspace + Compliance Matrix + Q&A.

**Steps:**
- [ ] Drop a synthetic solicitation into Solicitation Workspace.
- [ ] Run clause extraction. Confirm FAR / DFARS citations surface.
- [ ] Run requirements extraction.
- [ ] Open Compliance Matrix. Review Section L / M outline.
- [ ] Open Q&A / deadline workflow.
- [ ] Add internal notes.
- [ ] Verify **0 portal-upload** controls.
- [ ] Verify **0 send-on-behalf** controls.

**Required evidence to record:**
- Clause / FAR / DFARS extraction quality (subjective: usable / partial / not usable).
- Compliance matrix outline coverage.

---

## Day 4 — Vendor / pricing / past performance workflow

**Objective:** exercise Vendor Quote Room + Pricing Worksheet + Past Performance Library + Capability Statement Studio.

**Steps:**
- [ ] Open Vendor Quote Room. Log a synthetic vendor quote. Confirm no auto-send.
- [ ] Open Pricing Worksheet. Build a synthetic cost stack + margin review.
- [ ] Open Past Performance Library. Add a synthetic PP record. Tag by NAICS, customer, contract type.
- [ ] Open Capability Statement Studio. Build a synthetic capability statement.
- [ ] Test local PDF export. Confirm file saves locally only — no upload.
- [ ] Test capability import (paste-from-clipboard or file-open).

**Required evidence to record:**
- Vendor Quote Room has no auto-send: confirmed.
- PP record persists.
- PDF export is local-only: confirmed.

---

## Day 5 — Prime / stakeholder / submission-readiness workflow

**Objective:** exercise Prime Partner Finder + Stakeholder Graph + Submission Readiness Gate + Audit Log.

**Steps:**
- [ ] Open Prime Partner Finder. Search for synthetic primes.
- [ ] **Confirm no outreach is sent from the app.**
- [ ] Open Stakeholder Graph. Log synthetic internal stakeholders.
- [ ] **Confirm sample data shows no real CO / COR / KO names.**
- [ ] Open Submission Readiness Gate. Run pre-submission checklist.
- [ ] Open Audit Log. Confirm credential / save / export events log correctly.
- [ ] Verify **0 submit / send / upload** controls anywhere.

**Required evidence to record:**
- Prime Partner Finder has no outreach action: confirmed.
- Stakeholder Graph sample data is synthetic: confirmed.
- Submission Readiness checklist persists.
- Audit Log events render.

---

## Day 6 — Internal review export + recovery

**Objective:** exercise Internal Review Export + restart/reopen + recovery from missing state.

**Steps:**
- [ ] Create Internal Review Export from the synthetic pursuit.
- [ ] Confirm markdown file saves locally only.
- [ ] Read the export. **Verify disclaimers: "internal review only," "not submitted."**
- [ ] Verify export does **not** claim the package was "sent" / "submitted" / "uploaded."
- [ ] Quit app. Relaunch. Confirm pursuit + targeting + setup state persist.
- [ ] Rename the `localStorage` profile key (safe variant of corrupt state) → relaunch → confirm graceful re-entry to Setup Wizard.
- [ ] Restore the renamed key.
- [ ] Rerun `npm run troubleshooting:scan` — pass.

**Required evidence to record:**
- Internal review markdown export saves locally: confirmed.
- Disclaimers present: confirmed.
- Restart preserves state: confirmed.
- Graceful re-entry on missing state: confirmed.

---

## Day 7 — Final burn-in decision

**Objective:** rerun full gates + fill go/no-go scorecard + decide.

**Steps:**
- [ ] `npm test` — pass.
- [ ] `npm run release:evidence` — clean.
- [ ] `npm run govcon:smoke` — pass.
- [ ] `npm run troubleshooting:scan` — clean.
- [ ] `node scripts/release-check.js` — privacy gate clean.
- [ ] Open `phase-25b-troubleshooting-log-template.md`-derived local log.
- [ ] Count issues by severity.
- [ ] Open `phase-25b-go-no-go-scorecard.md`.
- [ ] Fill every scorecard row.
- [ ] Select **exactly one** decision.
- [ ] Write the buyer-readiness recommendation in 5–10 sentences.

**Required evidence to record:**
- Day 7 gate exit codes.
- Issue count by severity.
- Scorecard rows.
- Decision.
- Recommendation.

---

## Signature

This checklist is the operator's daily reference for the 7-day burn-in. The completed checklist stays local. The summary lands in the go/no-go scorecard.

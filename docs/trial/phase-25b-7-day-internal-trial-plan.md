# Phase 25B — 7-Day Internal Trial Plan + Troubleshooting Burn-In

**Date:** 2026-06-08
**Branch:** `docs/phase-25b-7-day-internal-trial`.
**Base:** `main @ 993d446` (post-PR #98 — Phase 25A combined launch-readiness sprint).
**Predecessor decision:** READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD (Phase 25A).

---

## 1. Purpose

SourceDeck is currently launch-ready for a limited paid pilot, but **there is no buyer selected yet**. Before any public launch, public promotion, or buyer onboarding, the operator runs a 7-day internal trial under realistic usage to test and troubleshoot the app.

This phase does **not** select a pilot buyer, does **not** initiate outreach, and does **not** mark the product as buyer-ready. It produces the trial plan, daily checklist, troubleshooting log template, operator scenarios, go/no-go scorecard, and runner command checklist. The trial itself is executed locally by the operator after the PR merges.

## 2. Posture (verbatim — operator must enforce)

- **Internal only.** The trial is run by ARCG operators on local instances. No external party participates.
- **No buyer outreach.** No prospect, lead, or buyer is contacted as part of this trial.
- **No public launch.** No public marketing, no public download CTA, no "Free demo" / "Try now" / "Download now."
- **No website deployment.** Neither `sourcedeck-site` nor any other website is deployed by this phase.
- **No live agency submission.** No bid, quote, or proposal is submitted to SAM.gov, PIEE, eBuy, GSA, or any agency portal.
- **No email sending.** No outbound email is sent by the app or by the operator as part of this trial.
- **No public download.** The unsigned dev build is not posted to a public artifact registry, public S3, public GitHub Release, or any public mirror.
- **No live SAM Sprint.** SAM Sprint is exercised against the operator's own SAM.gov key only — never against a buyer's key.
- **Unsigned dev/RC build only.** The trial does not produce a signed artifact and does not claim "signed and notarized" / "Apple notarized" / "production signed."
- **Phase 25A bounding conditions** apply throughout the trial.

## 3. Decision the trial drives toward

After 7 days, the operator selects **exactly one** of three outcomes on the go/no-go scorecard (`docs/trial/phase-25b-go-no-go-scorecard.md`):

1. **READY TO SEEK FIRST PILOT BUYER.** The operator may begin qualifying a first pilot buyer per a future buyer-package phase (not this phase).
2. **NEEDS FIXES BEFORE BUYER OUTREACH.** The operator opens narrowly-scoped fix PRs against the issues recorded in the troubleshooting log. The 7-day trial reruns once fixes land.
3. **BLOCKED — DO NOT SHOW BUYERS.** A critical or high issue (safety violation, gate failure, crash in core workflow) requires Tier-2 escalation. The product is not shown to buyers until resolved.

## 4. 7-day schedule

### Day 0 — Baseline

- Pull latest `main`.
- Run full gates: `npm test`, `npm run release:evidence`, `npm run govcon:smoke`, `npm run troubleshooting:scan`, `node scripts/release-check.js`.
- Confirm Setup Wizard auto-launches on a **clean state** (cleared `localStorage`, no `sd.govcon.setupComplete` flag).
- Confirm **Settings → API Keys → SAM.gov API Key** row exists.
- Confirm SAM.gov key is requested **only** in Setup Wizard Step 5 and Settings → API Keys.
- Confirm **0 send / submit / upload controls** are present in the renderer (Send Email, Submit Bid, Submit Quote, Export-and-submit, portal-upload).
- Record baseline status: gates pass/fail, signing posture, evidence binder state.

### Day 1 — First-run onboarding

- Simulate a new user (clear `localStorage`).
- Complete Setup Wizard end-to-end (all 11 steps).
- Enter company basics in Step 2 (synthetic data: legal name "Sample SDVOSB LLC", UEI synthetic, CAGE synthetic).
- Enter GovCon targeting profile in Step 4 (NAICS 561210, PSC S203, SDVOSB set-aside, target agencies VA + Army + GSA).
- Add the operator's own SAM.gov key in Step 5 OR skip and confirm the deferral path works.
- Verify `localStorage.sd.govcon.setupComplete === true` after Step 11.
- Verify the **Settings "Run Setup Wizard" fallback button** opens the wizard when invoked from a setup-complete state.
- Document friction points in the troubleshooting log.

### Day 2 — Opportunity discovery workflow

- Use sample/demo data or dry-run local data only. Do not run a live SAM Sprint against production data outside the operator's own targeting profile.
- Test SAM Sprint / SAM search screen. Confirm the screen does **not** request the SAM key.
- Test Capture Command Center: add a new pursuit, attach a sample solicitation, set bid/no-bid decision.
- Test Operating Rhythm: confirm digest renders, deadlines surface correctly.
- Test bid/no-bid workflow.
- Document issues.

### Day 3 — Solicitation / compliance workflow

- Test Solicitation Workspace: clause extraction, FAR / DFARS lookup, requirements extraction.
- Test Compliance Matrix: Section L / M outline review.
- Test Q&A / deadline workflow.
- Test internal notes.
- Verify **0 portal-upload / send-on-behalf** controls are present.
- Document issues.

### Day 4 — Vendor / pricing / past performance workflow

- Test Vendor Quote Room: log a synthetic vendor quote; confirm no auto-send.
- Test Pricing Worksheet: build a synthetic cost stack and margin review.
- Test Past Performance Library: add a synthetic PP record tagged by NAICS / customer / contract type.
- Test Capability Statement Studio: build a synthetic capability statement; confirm local-only PDF export.
- Test local capability import if available (paste-from-clipboard or file-open path).
- Document issues.

### Day 5 — Prime / stakeholder / submission-readiness workflow

- Test Prime Partner Finder: search for synthetic primes; confirm no outreach is sent from the app.
- Test Stakeholder Graph: log synthetic internal stakeholders; **confirm no real CO / COR / KO names appear in sample data**.
- Test Submission Readiness Gate: run the pre-submission checklist on a synthetic pursuit.
- Test Audit Log: confirm credential / save / export events log correctly.
- Verify **0 submit / send / upload** controls.
- Document issues.

### Day 6 — Internal review export + recovery

- Create an Internal Review Export from the synthetic pursuit; confirm markdown file saves locally.
- Verify export disclaimers ("internal review only," "not submitted").
- Test restart / reopen behavior: quit app, relaunch, confirm state persists.
- Test corrupted / missing setup state (safe variant: rename the `localStorage` profile key, relaunch, confirm graceful re-entry to wizard).
- Run `npm run troubleshooting:scan` again.
- Document issues.

### Day 7 — Final burn-in decision

- Rerun full gates (`npm test`, `npm run release:evidence`, `npm run govcon:smoke`, `npm run troubleshooting:scan`, `node scripts/release-check.js`).
- Review all issues in the troubleshooting log.
- Classify severity (critical / high / medium / low).
- Fill the go/no-go scorecard.
- Choose one decision: READY TO SEEK FIRST PILOT BUYER / NEEDS FIXES BEFORE BUYER OUTREACH / BLOCKED — DO NOT SHOW BUYERS.
- Write the buyer-readiness recommendation.

## 5. What this phase does NOT produce

- ❌ A buyer pilot offer.
- ❌ A buyer onboarding guide.
- ❌ A first-session script for a buyer.
- ❌ A pricing change.
- ❌ A website deploy.
- ❌ A public download link.
- ❌ A signed artifact.

Those artifacts are reserved for a later phase that begins **only if** Day 7 returns READY TO SEEK FIRST PILOT BUYER.

---

## Signature

This plan governs the 7-day internal trial. The operator runs it locally after the PR merges. The trial does not introduce public launch, buyer outreach, deployment, or any signed-release claim.

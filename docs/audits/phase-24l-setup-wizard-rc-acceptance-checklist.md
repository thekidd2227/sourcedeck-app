# Phase 24L-PREP — Setup Wizard RC Acceptance Checklist

**Date:** 2026-06-08
**Base:** `main @ 7861152` (post-PR #93 Phase 24I — SAM key → Settings-only; post-PR #92 Phase 24J-PREP).
**Posture:** Docs / spec / audit only. **No runtime change.** Run by the final RC hardening agent **after Phase 24K merges**.
**Canonical pricing source:** `docs/product/pricing-source-of-truth.md` (unchanged).
**Companions:** `docs/product/phase-24l-pilot-onboarding-qa-contract.md`, `docs/product/phase-24l-api-key-onboarding-boundary-contract.md`, `docs/product/phase-24l-final-rc-readiness-after-setup-wizard.md`, `docs/audits/phase-24j-final-rc-evidence-binder.md`.

---

## 1. Executive purpose

This checklist is run **after Phase 24K merges** to confirm the first-run Setup Wizard + new-profile onboarding gate is ready for the final RC. It assumes the post-24I credential boundary already in place: SAM key managed in **Settings** (`#s-samkey`) and the **GovCon Setup Wizard step 4** (`#gcwiz-sam`), with the SAM Opportunity Outreach / Sprint screen showing presence-only status (`#out-samkey-status`) + a "Configure SAM.gov API key in Settings" button — **no key input on the search screen**.

---

## 2. Setup wizard trigger acceptance

- [ ] First-time user (no setup-complete state) auto-opens the Setup Wizard.
- [ ] Creating a new profile auto-opens the Setup Wizard.
- [ ] Missing setup-complete state opens the wizard.
- [ ] Completed setup state does **not** repeatedly reopen the wizard.
- [ ] Corrupt / unparseable setup state **fails open safely** (does not crash boot; defaults to showing the wizard, not a broken screen).
- [ ] Setup can be reopened on demand from **Settings** or **Help / Setup**.
- [ ] The wizard does **not permanently block** the user (a skip / "do this later" path exists; the user can reach the GovCon Capture OS).

## 3. Setup wizard content acceptance

- [ ] Welcome / "What SourceDeck does".
- [ ] Company basics.
- [ ] GovCon targeting profile (NAICS, set-asides, capabilities).
- [ ] API keys and integrations (grouped).
- [ ] **SAM.gov API key included with the other API key requests.**
- [ ] Quick Setup Tour.
- [ ] Quick Setup Video placeholder **or** an existing safe local asset reference (no new media committed by this RC; no external upload).
- [ ] Final confirmation checklist.

## 4. API key acceptance

- [ ] Setup Wizard includes the SAM.gov API key request alongside the other API key requests.
- [ ] Settings includes SAM.gov API key management (`#s-samkey`).
- [ ] GovCon SAM search / SAM Sprint / Outreach screen does **NOT** include a SAM API key input.
- [ ] That screen does **NOT** ask the user to paste credentials.
- [ ] The screen **may** show configured / not-configured status (presence-only).
- [ ] The screen **may** point the user to the Setup Wizard or Settings.
- [ ] No key value is shown after save (raw value cleared from the DOM; secure-storage / credential-boundary save).
- [ ] No key value appears in logs, exports, demos, docs, screenshots, tests, or source constants.
- [ ] No `.env` file is touched.

## 5. Feature walkthrough acceptance (wizard tour covers)

- [ ] Capture Command Center
- [ ] Operating Rhythm
- [ ] Solicitation Workspace
- [ ] Compliance Matrix
- [ ] Vendor Quote Room
- [ ] Pricing Worksheet
- [ ] Past Performance Library
- [ ] Capability Statement Studio
- [ ] Prime Partner Finder
- [ ] Stakeholder Graph
- [ ] Submission Readiness Gate
- [ ] Internal Review Markdown Export
- [ ] Audit Log
- [ ] Response Desk (draft-only)
- [ ] SAM Sprint (dry-run / manual-review)

## 6. Hard-stop failures (any one blocks the RC)

- [ ] SAM key input appears on the SAM search / Sprint / Outreach screen.
- [ ] Setup Wizard lacks SAM key setup.
- [ ] Settings lacks SAM key setup.
- [ ] A saved key value is visible anywhere (UI, log, export, doc, test).
- [ ] `.env` touched.
- [ ] A live SAM run is triggered (must be dry-run / manual-review).
- [ ] Any Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control appears.
- [ ] System Readiness / System Flow restored.
- [ ] Stale pricing (`$79` / `$349` / `$999`) appears in active UI.
- [ ] Any unsupported certification / revenue / signing claim appears.

---

## 7. Verification commands (post-24K)

```
node test/govcon-setup-wizard.test.js
node test/govcon-setup-wizard-first-run.test.js     # if Phase 24K ships it
node test/govcon-operating-profile-wizard.test.js
node test/govcon-operating-profile-completeness.test.js
node test/govcon-final-runtime-polish.test.js
node test/renderer-boot.test.js
node test/remove-system-readiness-tab.test.js
npm test
npm run release:evidence
npm run govcon:smoke
node scripts/release-check.js
```

**Baseline (this prep run, `main @ 7861152`, pre-24K):** `govcon-setup-wizard` 12/12, `govcon-final-runtime-polish` 23/23, `renderer-boot` 7/7, `remove-system-readiness-tab` 9/9 — PASS. `npm test` exit 0 (0 ❌; 1099 passing assertions). `release:evidence` 44/0/0, `govcon:smoke` PASS, `release-check.js` PASS. The Phase 24K first-run wizard trigger test is **not present yet** — that gate remains **pending** until Phase 24K merges.

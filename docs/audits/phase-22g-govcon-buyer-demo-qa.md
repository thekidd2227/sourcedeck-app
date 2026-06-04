# Phase 22G — GovCon Buyer Demo QA + Sellability Audit

**Date:** 2026-06-04
**Branch:** `docs/phase-22g-govcon-buyer-demo-qa`
**Base:** `main @ f543321` (post-PR #65 — Phase 22F Submission Readiness Gate + Human-Approved Package Export merged; the canonical Phase 22A-1 25-feature roadmap is closed).
**Scope:** Verification-only audit. **Docs only.** No runtime files modified.
**Posture:** Honest, blunt buyer-readiness critique. The Phase 22 series is structurally complete; this audit answers whether it is *sellable*.

---

## 0. Core question

> Can a government contractor understand the value of SourceDeck in one demo?

**Short answer: yes — for the *sub-$10M GovCon capture team* who currently runs Sections L/M shred, vendor quotes, past-performance reuse, and submission tracking in spreadsheets.** The Phase 22 GovCon tab now tells a coherent six-step capture story end-to-end. It does **not** yet sell itself to a Proposal Manager at a mid-tier prime; the surfaces are honest about what they don't do, but the absence of populated examples means the demo has to be carried by operator-pasted real data, not by the UI itself.

---

## 1. QA results — gates + workflow

### 1.1 Test suites (all green)

- `npm test` — all suites PASS (~25 test files, 500+ assertions). Selected highlights:
  - `govcon-submission-readiness` **30/30** (Phase 22F)
  - `govcon-past-performance-prime` **24/24** (Phase 22E)
  - `govcon-vendor-pricing` **25/25** (Phase 22D)
  - `govcon-solicitation-workspace` **19/19** (Phase 22C)
  - `govcon-capture-command-center` **15/15** (Phase 22B)
  - `remove-system-readiness-tab` **9/9**, `renderer-boot` **7/7**, `response-desk` **24/24**, `response-desk-email-import` **20/20**, `default-state-policy` **22/22**, `sam-opportunity-sprint` **62/0**, `troubleshooting-agent` **95/95**, `troubleshooting-email-alerts` **18/18**, `macos-signing-readiness` **19/19**, `release-evidence` **20/20**, `watsonx-runtime-evidence` **17/17**, `watsonx-runtime-context` **18/18**, `i18n-audit` **31/31**.
- `npm run release:evidence` → state `packaged_unsigned`.
- `npm run troubleshooting:scan` → **critical/high failures: 0**.
- `npm run govcon:smoke` → **PASS**.
- `npm run phase13:rc-check` → **PASS**.
- `node scripts/release-check.js` → benign WARN on unsigned local `dist/mac/SourceDeck.app` (expected non-release env).

### 1.2 Full-workflow runtime QA (27/27 PASS)

Deterministic Playwright/chromium harness against `sourcedeck.html` with the preload bridge stubbed in-page. **No live network call, no Electron renderer mutation, no committed artifacts.** Captured runtime DOM measurements; full report saved locally at `/tmp/phase22g-workflow-qa-report.json` (not committed).

| # | Hard-rule check | Runtime result |
|---|---|---|
| 1 | GovCon tab opens | ✅ |
| 2 | Capture Command Center is first | ✅ |
| 3 | Solicitation Workspace follows | ✅ |
| 4 | Vendor Quote Room + Pricing Worksheet follows | ✅ |
| 5 | Past Performance + Capability + Prime Partner follows | ✅ |
| 6 | Submission Readiness Gate follows | ✅ |
| 7 | Pursuit Profile appears AFTER the new workflow | ✅ |
|   | Full section order `cc → sw → vqr → pp → subGate → pursuit` | ✅ |
| 8 | NO System Readiness / System Flow tab | ✅ |
| 9 | NO Send Email button | ✅ |
| 10 | NO Submit Bid button | ✅ |
| 11 | NO Submit Quote button | ✅ |
| 12 | NO fake active opportunities (captureBoard localStorage `null`, count `0`) | ✅ |
| 13 | NO fake solicitation data (solWorkspace localStorage `null`, Summary empty state) | ✅ |
| 14 | NO fake vendor/pricing rows (vendorQuotes localStorage `null`, tbody empty state) | ✅ |
| 15 | NO fake past performance / prime partner rows (localStorage `null`, tbody empty state) | ✅ |
| 16 | NO fake submitted/completed status (score `0%`, status `Not Ready`, package `No package prepared`) | ✅ |
| 17 | Response Desk Import Email remains | ✅ |
| 17b | Response Desk "never auto-sends, never auto-submits" copy remains | ✅ |
| 18 | SAM Sprint "Free users: 1 NAICS" copy remains | ✅ |
| 19 | NO boot-time `SyntaxError` / `ReferenceError` / `TypeError` | ✅ |

Body-level safety copy:

| Phrase | Required | Actual count |
|---|---|---|
| `SourceDeck does not submit bids, quotes, or government responses` | ≥2 | ≥2 ✅ |
| `SourceDeck does not submit, upload, email, or transmit this package` | ≥3 | ≥3 ✅ |
| `human (review\|approval) required` (case-insensitive) | ≥4 | ≥4 ✅ |
| `SourceDeck does not send vendor outreach` | ≥1 | ≥1 ✅ |
| `SourceDeck does not send capability statements or outreach` | ≥2 | ≥2 ✅ |
| `Partner outreach is not sent from SourceDeck` | ≥1 | ≥1 ✅ |

---

## 2. Demo usability critique — blunt answers

### 2.1 Does the GovCon tab now tell a coherent buyer story?

**Yes.** Six visual sections in the order a contractor actually works: **find → triage → cost → prove → close**. The buyer's eye scans Capture Command Center → Solicitation Workspace → Vendor Quote Room + Pricing Worksheet → Past Performance + Capability + Prime Partner → Submission Readiness Gate, which is the same shape as a real capture lifecycle. The Pursuit Profile sitting at the bottom (where the operator confirms identity-of-pursuit) reads as "complete this once" rather than "ignore this." Coherence is real.

### 2.2 Does the feature order make sense?

**Mostly.** The order is correct for the *capture flow*. The one mismatch: a contractor opening SourceDeck cold has nothing in the Capture Command Center yet, and the Solicitation Workspace below it is also empty, so the first 5 seconds is *all empty cards*. The story only emerges after the operator pastes one solicitation. **Recommendation for Phase 23+:** add a one-click "Try with a sample solicitation" affordance (clearly labeled "Demo sample — does not contact agency / does not send email") that paints the entire workflow at once. This is the single largest first-impression gap.

### 2.3 What feels sellable now?

Five things actually carry the demo:

1. **The Solicitation Workspace + Compliance Matrix.** Pasting an L/M/PWS chunk and watching it bucket into Section L, Section M, PWS/SOW, Required Forms, Deadlines, Risks — and then "Build Compliance Matrix" produces a Draft — Not Reviewed 10-column matrix — is the closest the product has to a "the demo just got real" moment. This is the killer feature from Phase 22A and it landed.
2. **The deterministic in-renderer extraction.** It's not LLM-dependent. No API key, no network, no provider readiness gate to demo. Contractors who have been burned by "AI that doesn't work without OpenAI credits" will notice.
3. **The Submission Readiness Score.** The Phase 22F gate honestly computes `0–100%` from operator-marked checklist completion AND forces `Not Ready` if anything is `Blocked` AND requires the explicit "Final human approval recorded" row to be `Reviewed` before `Ready for Human Review` shows. This is the right safety posture for a regulated buyer.
4. **The human-review notices are everywhere.** ≥4 occurrences of "human review/approval required" across the GovCon tab body. A buyer cannot accuse the product of pretending to submit anything.
5. **The Capability Statement Studio's draft outline.** Operator-driven, in-page only, with the "draft — review before sending" footer rendered at runtime. Calm. Not flashy. Honest.

### 2.4 What still feels fake, thin, or static?

Be honest:

1. **Every surface is empty on first open.** The buyer demo has to be carried by the demoer's prepared paste-buffer. A two-minute YouTube watcher would think the app does nothing.
2. **The Bid/No-Bid Engine (F03) is advisory-only.** The recommendation labels (Bid / Team / Sub / Watch / Kill) are deterministic from `deadline + NAICS + set-aside + vendor flag` — that's correct, but it doesn't yet show *why* (no narrative explanation, no link to the Pursuit Profile signals). A buyer will say "OK, but how do you decide?"
3. **The Vendor Quote Room is honest about not sending outreach,** but a Capture Manager will ask "OK, so what's the workflow when I do send a quote request? Where do I drop the reply?" — and the answer today is "outside SourceDeck." That's a real, visible gap.
4. **The Pricing Worksheet's missing-cost warning and margin warning fire at hard thresholds (`< 5%`, `> 35%`).** Those are defensible defaults but they feel mechanical. A buyer will want to set their own thresholds.
5. **The Capability Statement Studio composes a draft outline,** but it's literally a bullet rollup. A buyer comparing to a "real" capability-statement-generation tool will notice the absence of a docx/pdf export.
6. **The Submission Readiness section-status rollup grid** reads upstream localStorage in read-only mode. If nothing is populated, all 8 cards read `Not started`. A buyer will ask "what does this look like *populated*?" and the demo has no answer without manual entry.
7. **No screenshots, branding, or aspirational hero state.** The first thing the buyer sees is a sidebar of dark commercial-CRM tabs (Dashboard, Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR) BEFORE they see the GovCon tab. The Phase 22A audit said this explicitly; it remains true.
8. **The Past Performance Library has no CPARS rating field as a structured number** — only a notes field. A buyer comparing to GovCon competitors will want a 1–5 rating dropdown.
9. **The Prime Partner Finder is operator-typed, no suggestion path.** A buyer will ask "do you suggest partners based on NAICS?" and the honest answer is "not yet."

### 2.5 What needs real data next?

- **One sample solicitation paste-buffer.** Public agency, public RFP, public NAICS — fully attributable, fully redactable. Loaded behind a clearly-labeled "Try with a sample" button.
- **One sample past performance record set** (3 entries) with attribution.
- **One sample vendor quote row** with attribution.
- **One sample compliance matrix output** showing the 10 columns with `Draft — Not Reviewed` status across the board.

All sample data must be marked "Sample — operator must replace before proposal use" and live behind an explicit demo-mode toggle. **Do not** seed by default.

### 2.6 What should be hidden before a buyer demo?

- The commercial-CRM tabs ahead of GovCon (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR, Create Lead, Daily Ops, Delivery). The Phase 22A roadmap called for a "GovCon Mode" that demotes these behind a Show all toggle. **Until that ships, the demo operator should manually click GovCon first thing.**
- The `[release-check] WARN: code object is not signed at all` line in the troubleshooting tab. Buyers who see "not signed" will fixate on it. Address by demoing on a signed build OR scoping the troubleshooting tour around the release-evidence panel rather than the signing report.
- The unsigned-app macOS launch warning (`"app cannot be opened because Apple cannot check it for malicious software"`). Demo from a build that has been gatekeeper-clearfixed locally OR demo over screen-share of an already-launched build.
- The default toast for "Solicitation Workspace placeholder — Phase 22C ships the full surface" on the **Capture Command Center's** "Prepare Solicitation Workspace" button — Phase 22C *has* shipped. Either delete that toast OR rewrite to "Open Solicitation Workspace below." Minor but visible.

### 2.7 What would confuse a contractor?

- **Two separate but visually similar oxblood "Human Review Required" notices** (Phase 22C's solicitation workspace + Phase 22F's submission gate). They each justify their own scope but a buyer will read them as duplicate. Recommend: lighten Phase 22C's to a one-line copy and leave Phase 22F's as the heavyweight notice.
- **The Capture Command Center's "Vendor / Subcontractor Needs" stat card** vs. the Phase 22D Vendor Quote Room's "Vendor / Subcontractor Needs" stat card. Both read from the SAME data source (`sd.govcon.captureBoard.v1` for one, `sd.govcon.vendorQuotes.v1` for the other) but a buyer will assume they should match. Recommend: rename the Phase 22B CC card to "Vendor Needs (capture board)" or remove the duplicate in Phase 22B.
- **The Submission Readiness Score reads `0%` until the operator marks anything.** A buyer's first reaction will be "but I haven't touched anything — shouldn't it be N/A?" Recommend: display `— %` (em-dash) when no items have ever been touched, and `0%` only after the first interaction.

### 2.8 What would make a contractor ask, "How much?"

1. **Pasting a real solicitation and watching the Solicitation Workspace + Compliance Matrix populate in seconds.** This is the moment.
2. **Marking the matrix rows from `Draft — Not Reviewed` to `Reviewed` and watching the Submission Readiness score climb.** Tangible progress.
3. **Building the Internal Review Package Preview** with their solicitation number and notes in the form and seeing the preview render their own data with the "internal review only" footer. Honest closure.

### 2.9 What would make a contractor say, "This is still a mockup"?

1. **Opening the app cold with nothing populated.** Empty cards everywhere.
2. **Clicking "Search SAM.gov" in the GovCon pane** and not understanding whether that triggers a live call (it does call the SAM Sprint flow, which itself goes live if configured — but the demo operator needs to know which build state they're in).
3. **Seeing "Pricing Worksheet placeholder — Phase 22D ships the full surface"-style toasts that say "ships in Phase XX"** anywhere. The Phase 22 series is closed; those toasts should now say their feature exists.

### 2.10 What must be fixed before selling at $999/month?

In rough priority:

1. **Add a "Sample solicitation" / "Sample past performance" / "Sample vendor quote" loadable demo mode** (clearly labeled, fully redactable). The empty-everywhere first impression is the largest blocker.
2. **Fix the duplicate / confused Vendor Needs cards across Phase 22B and Phase 22D.** Either rename or remove one. Buyers will spot it.
3. **Implement the GovCon Mode primary-nav demotion** of Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Create Lead / Daily Ops / Delivery into a "Show all" toggle. The Phase 22A audit called for this; without it, the first 60 seconds is still a commercial-CRM lobby.
4. **Address the troubleshooting tab's `code object is not signed at all` line in the demo path.** Either sign the demo build OR scope the troubleshooting tour around the release-evidence panel.
5. **Ship a structured CPARS-rating field on Past Performance** (1–5 dropdown alongside the existing notes textarea). Two-minute change. Buyer perception jump.
6. **Add an in-tab "Demo mode" toggle** that loads / clears sample data and is visually distinct from real operator data ("Sample — operator must replace before proposal use" banner).
7. **Rewrite the Submission Readiness default score from `0%` to `— %` until the first interaction.** Two-line change. Removes the "I haven't touched anything but it's already failing me" reaction.
8. **Either delete or rewrite the Phase 22B Capture Command Center's "Solicitation Workspace placeholder" toast.** Phase 22C has shipped; the placeholder lies now.
9. **Add an "Export Package as Markdown" local-only download** to the Phase 22F Export Placeholder action. Still no submission, still no email, but the package is now portable for the operator's own use.
10. **Add a one-line "Last updated" timestamp** on each phase section so a buyer can tell at a glance whether they're looking at real data or stale state.

None of these require new runtime features beyond points (1), (5), (6), (9). The rest are copy / wording / layout tweaks. **The product is structurally ready; the demo experience is not.**

---

## 3. Out-of-scope / explicit non-goals for Phase 22G

- No new runtime features.
- No edits to `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `package.json`, `main.js`, `preload.js`, `chartnav-integration.js`.
- No `.env*` touched.
- No screenshots / videos committed.
- No pricing change.
- No compliance certification claim.
- No `watsonx-live` / `signed-and-notarized` / guaranteed-outcome claim.
- No live SAM call.

---

## 4. Recommended next phase

**Phase 23A — GovCon Demo Polish.** Implement items 1, 2, 5, 6, 8 from §2.10 above (sample data loader behind explicit Demo Mode, fix duplicate vendor card, CPARS structured field, demo-mode toggle with visual banner, fix stale placeholder toast). All items remain compatible with the Phase 22 safety posture: no auto-send, no auto-submit, no portal upload, no email transmission, no compliance certification claim.

Phase 23B and beyond — the GovCon Mode primary-nav demotion, signed-build demo path, in-tab Export-as-Markdown, "Last updated" timestamps. Each shippable in its own small PR.

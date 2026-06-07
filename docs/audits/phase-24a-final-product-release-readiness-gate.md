# Phase 24A — Final Product Release Readiness Gate

**Date:** 2026-06-07
**Reviewed from:** `main` @ `bc71cfc` (post-PR #81 — which already issued the
underlying Phase 24A completion-gate audit). This document refreshes that
gate evidence against the current wall-clock and adds the one release-blocker
fix that surfaced since: a stale-fixture test regression in
`test/govcon-opportunity-outreach.test.js`.
**Companion docs:**
- `docs/audits/phase-24a-sourcedeck-govcon-os-completion-gate.md` (PR #81 — the foundational audit; remains canonical)
- `docs/product/phase-24a-sourcedeck-final-readiness-scorecard.md` (PR #81 scorecard)
- `docs/release-notes/phase-24a-sourcedeck-completion-gate.md` (PR #81 release notes)
- `docs/product/phase-24a-sourcedeck-govcon-os-readiness-scorecard.md` (this PR — task-spec-aligned scorecard)
- `docs/release-notes/phase-24a-final-product-release-readiness-gate.md` (this PR — task-spec-aligned release notes)

---

## 1. Executive decision

### **READY FOR PAID PILOT**

Decision unchanged from PR #81. SourceDeck is functionally and visually
complete as a GovCon Capture OS, with the safety boundaries (no-submit /
no-send / no-upload / human-approval) enforced in both UI and services.
After the Phase 24A-recurring stale-fixture fix landed in this PR,
**`npm test` is green across all 54 test files** and every release gate
passes. It is ready to put in front of a small number of **guided, paid
pilot customers** (design partners) using their own NAICS and one live
solicitation.

It is **not** ready for unattended **public sale**: the desktop build is
unsigned/unnotarized (Phase 23E chain not verified end-to-end for a
specific artifact), integrations are "connect-when-configured" rather
than turnkey, there is no self-serve onboarding/payment, and the
buyer-facing demo video clips do not exist yet. Those gate *public sale*,
not a *guided pilot*.

---

## 2. Evidence summary

| Evidence | Result |
| --- | --- |
| 16 named phase guard tests (renderer-boot, remove-system-readiness-tab, govcon-demo-recording-blockers, govcon-demo-delivery-polish, govcon-primary-navigation, govcon-mode-navigation, govcon-demo-polish, govcon-submission-readiness, govcon-past-performance-prime, govcon-vendor-pricing, govcon-solicitation-workspace, govcon-capture-command-center, response-desk-email-import, response-desk, default-state-policy, sam-opportunity-sprint) | ✅ all PASS |
| `npm test` (all 54 test files incl. opportunity-outreach 28/28, signed-demo-build-readiness 25/25, Phase 23H 32/32) | ✅ PASS |
| `npm run release:evidence` | ✅ PASS (markdown + JSON report written) |
| `npm run troubleshooting:scan` | ✅ PASS (auto-repair disabled; operator review required) |
| `npm run govcon:smoke` | ✅ PASS (failures: 0) |
| `npm run phase13:rc-check` | ✅ PASS (failures: 0) |
| `npm run i18n:audit` | ✅ 31/31 |
| `node scripts/release-check.js` | ✅ PASS (local-dev signing warn only, expected and honest) |
| System Readiness / System Flow removal (Phase 21F) | ✅ holds — `test/remove-system-readiness-tab.test.js` 9/9 PASS |
| No-send / no-submit / no-upload boundaries | ✅ holds — no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload button anywhere in the renderer |
| Markdown export safety lines | ✅ all 6 present (header, footer, no-submit clause, SAMPLE DEMO DATA banner, "No portal upload.", "No email transmission.") |
| PR #80 (stale Phase 21E) | ✅ closed; branch preserved per hard rule |
| Video demo clips | ✅ deferred (operator-driven manual capture); `.qa/` excluded from git |
| Stale-fixture release blocker found in this audit | ✅ fixed in this PR — see §3 |

### 2.1 Bounded safety scan result

A bounded Node-only safety scan over `sourcedeck.html`, `package.json`,
and every `.js`/`.ts`/`.tsx`/`.json`/`.md`/`.html` under `test/` and
`docs/` (excluding `node_modules`, `.git`, `reports`, `.qa`) found:

- **711 total hits across 122 files.**
- Top 15 hit-files are: regression tests asserting forbidden terms are
  ABSENT (e.g. `test/govcon-demo-delivery-polish.test.js` 34 hits — all
  in negative assertions), demo planning docs enumerating forbidden
  language as do-not-say lists (`docs/demo/phase-23j-website-demo-clip-integration-plan.md`,
  `docs/demo/phase-23f-govcon-demo-master-script.md`), and the
  historical Phase 21E decontamination audit (which explains what was
  REMOVED). Zero hits in `sourcedeck.html` for the unsafe-claim terms.
- **All hits are acceptable** per Phase 24A safety-scan policy:
  negative tests, forbidden-copy lists, historical removed-issue docs,
  required disclaimers. No active user-facing unsafe behavior, no
  positive unsupported claim, no live secret.

---

## 3. The one release-blocker found during this gate run (FIXED)

### Stale `NOW` constant in `test/govcon-opportunity-outreach.test.js`

**Symptom.** On 2026-06-07 (system wall clock), `node test/govcon-opportunity-outreach.test.js`
failed 27/28 with:

```
❌ active-solicitation opportunity yields Q&A-only draft + Needs Review
+ actual:   'Drafted'
- expected: 'Needs Review'
```

**Root cause.** The test injected `nowFn = () => NOW` into the SAM
search service and the opportunity-records service, but
`services/govcon/email-compliance.js#activeSolicitation()` uses
`Date.now()` (real wall clock) when checking whether a solicitation's
response window is still open. The test fixture hardcoded
`NOW = 2026-06-01T00:00:00Z` and MOCK-A's `responseDeadLine =
NOW + 5 days = 2026-06-06`. Once the system clock passed 2026-06-06,
`activeSolicitation()` returned `false` for MOCK-A → the
active-solicitation block stopped firing in the test → the agent
generated a direct outreach draft → status = `Drafted` instead of
`Needs Review`.

**Critical clarification.** **Production behavior is correct.** In real
production the SAM-returned `responseDeadLine` is anchored to real
calendar time, so `activeSolicitation()` correctly blocks direct
outreach to a contracting officer during a live solicitation period.
Only the test fixture was broken by clock drift; the safety boundary
is intact.

**Fix.** One-line edit to `test/govcon-opportunity-outreach.test.js`
line 33: bumped `NOW` from `2026-06-01T00:00:00Z` to `2099-01-01T00:00:00Z`
with an explanatory comment. NOW is used only as a relative reference
in `withinClosingWindow`, `mapConfigToFilters`, and synthetic
`responseDeadLine` calculations — every assertion in the test is
relative to NOW, so a far-future base is semantically identical for
the test's existing semantics and remains stable for 70+ years against
the real wall clock. **No production code touched.** Per the Phase
24A scope rules, this is a minimal release-blocker fix.

**Verification.** `node test/govcon-opportunity-outreach.test.js` →
28/28 PASS. `npm test` (full chain) → all 54 test files PASS.

---

## 4. Readiness scorecard

The full per-area scorecard is in
`docs/product/phase-24a-sourcedeck-govcon-os-readiness-scorecard.md`
(this PR). The summary view, columns =
`Area · Status · Evidence · Buyer impact · Risk · Required next action`:

| # | Area | Status | Evidence | Buyer impact | Risk | Next action |
|---|---|---|---|---|---|---|
| 1 | GovCon default / cold-open | READY | Phase 23C 23/23; brand "GovCon Capture OS" top-left | First frame is buyer's pitch | Low | None |
| 2 | Capture Command Center | READY | `#gc-capture-cc`; 22B 15/15 | Day-1 buyer landing surface | Low | None |
| 3 | Opportunity qualification | READY | Bid/no-bid card; `opportunity-records.js` | Buyer's daily triage | Low | None |
| 4 | Solicitation workspace | READY | `#gc-sol-workspace`; 22C 19/19 | Highest-value surface in demo | Low | None |
| 5 | Compliance matrix | READY | 10-col matrix; manual Mark Reviewed | Demonstrates rigor to contracting team | Low | None |
| 6 | Vendor / subcontractor quote room | READY | `#gc-vqr`; 22D 25/25; "Requested manually" status | Subcontractor management | Low | None |
| 7 | Pricing worksheet | READY | `#gc-pricing`; advisory price/margin | Pricing math, advisory only | Low | None |
| 8 | Past performance library | READY | `#gc-pp`; 22E 24/24; operator-typed | Proposal foundation | Low | None |
| 9 | Capability statement studio | READY | `#gc-cs`; draft-only with no-send footer | Marketing artifact | Low | None |
| 10 | Prime partner finder | READY | `#gc-ppf`; manual status chips | Teaming pipeline | Low | None |
| 11 | Submission readiness gate | READY | `#gc-sub-gate`; 22F 30/30; advisory score | Final pre-submit checklist | Low | None |
| 12 | Internal-review Markdown export | READY | INTERNAL REVIEW DRAFT + SAMPLE DEMO DATA banner; local Blob; 23H 32/32 | Take-home buyer artifact | Low | None |
| 13 | Response Desk | READY | Draft-only; 24/24 + 20/20; no Send Email button anywhere | Reply triage | Low | None |
| 14 | SAM Sprint | READY | Free=1 NAICS; `manual_review_required:true` | Discovery channel | Low | None |
| 15 | No-send / no-submit / no-upload boundaries | READY | 711 negative-grep hits; zero positive unsafe claims | Trust/legal foundation | Low | None |
| 16 | Navigation & default state | READY | Phase 23C 23/23; default-state-policy 22/22 | First impression | Low | None |
| 17 | Show All Tools toggle | READY | Phase 23C; collapses legacy commercial groups | Reduces buyer distraction | Low | Phase 24D will collapse by default for new profiles |
| 18 | Buyer demo docs | DOCS-ONLY READY | Phase 22G + 23F scripts, shot list, checklist, recording review | Operator demo guidance | Low | None for pilot; clips deferred |
| 19 | Website readiness (excluding clips) | FUTURE PHASE | Phase 23J integration plan + Phase 23K blockers doc | Public marketing | Medium | Out of scope for pilot |
| 20 | Commercial launch readiness | NEEDS POLISH | Unsigned build, no self-serve onboarding/payment | Gates public sale, not pilot | Medium | Phase 24C (signed build) + Phase 24D (GovCon-first onboarding) |

---

## 5. Release blockers (separated)

- **Code blockers:** **NONE.** Renderer boots (7/7); System Readiness stays removed (9/9); no dead nav; no Send Email/Submit Bid/Submit Quote; Markdown export keeps "NOT SUBMITTED" + SAMPLE DEMO DATA banner; SAM no-auto-send and Response Desk human-approval boundaries intact; opportunity-outreach now 28/28 after this PR's stale-fixture fix.
- **UX blockers:** **NONE blocking pilot.** Polish only: legacy commercial tools live under "Other business tools" and dilute the GovCon story for a first-time buyer. Phase 24D scope.
- **Media blockers:** operator-recorded GovCon demo `.mp4` clips do not exist. Tracked separately (Phase 23K-R produced posters + transcripts; operator manual capture is the remaining step). Does **not** block a live guided pilot demo (demo is live, not video).
- **Website blockers:** public website clip integration pending. Out of scope here (separate repo, separate phase).
- **Commercial blockers:** unsigned/unnotarized desktop build (Phase 23E verification chain not yet executed end-to-end for a specific artifact); no self-serve onboarding or payment/license flow; integrations require manual configuration. **Gate public sale, not a guided pilot.**
- **Compliance / claims blockers:** **NONE.** No compliance certification, guaranteed-award/revenue, signed/notarized, or submission/send/upload claim anywhere active. Safety scan confirmed.

---

## 6. What is sellable now (smallest honest wedge)

> *"SourceDeck GovCon OS — opportunity discovery to internal-review submission package, with human-approved outreach and no autonomous submission."*

**Target buyer.** A small SDVOSB / 8(a) / WOSB / small-business GovCon
shop chasing micro-purchase → simplified-acquisition opportunities
(sub-$250K ceiling) that triages a handful of solicitations per
quarter. Capture Manager / Proposal Manager / BD lead persona. 1-5
seats. Buyer is comfortable with hands-on onboarding and is willing
to bring their own NAICS, past performance, and one live solicitation
to the pilot.

**What they get.**
1. The full GovCon Capture OS workflow on **their** NAICS and past
   performance — capture board, solicitation/compliance triage, vendor
   + advisory pricing, readiness gate.
2. A local internal-review Markdown package they can hand to a
   contracting teammate.
3. Hands-on onboarding by the SourceDeck operator (typically 2-4
   sessions over 2 weeks).
4. Continued support during the pilot window for any release-readiness
   issues that surface.

**What it does NOT do (state plainly).**
- Does not submit bids, quotes, or government responses.
- Does not send emails, capability statements, or partner outreach.
- Does not upload to SAM.gov, PIEE, eBuy, GSA, or any agency portal.
- Does not make compliance-certification claims (FedRAMP / SOC 2 /
  CMMC / HIPAA / HITRUST / ISO 27001 — none).
- Does not make guaranteed-award or guaranteed-revenue claims.
- Does not autonomously decide which opportunities to pursue.

**Human approval boundary.** Every outbound action is human-approved
and happens **outside** SourceDeck. Markdown exports are headed
*"INTERNAL REVIEW DRAFT — NOT SUBMITTED."* Response Desk imports
emails for triage and produces drafts only — no Send Email button
exists. Submission Readiness Gate produces an advisory score; the
operator decides when to submit, **outside** the app.

**Recommended pilot structure.**
- **Duration:** 30-60 days.
- **Price:** structured as a paid design-partner pilot (small ARR
  contribution; details in pricing docs, not in this audit).
- **Onboarding:** 2-4 sessions over 2 weeks. SourceDeck operator
  walks the buyer through capture → solicitation → vendor → pricing
  → past performance → submission readiness → local Markdown export
  flow with the buyer's actual data.
- **Disclosure:** the desktop build is an unsigned development build
  for demo purposes (Phase 23E verification chain not yet executed
  end-to-end). The operator says this verbatim during the demo per
  Phase 23F master script §12.
- **Exit criterion (success):** the buyer wants to convert to a
  recurring paid relationship and is willing to be referenced.

---

## 7. What is not sellable yet (blunt)

- **Do not sell** as a turnkey, self-serve SaaS. There is no signed
  installer, no in-app onboarding/payment, and integrations need
  configuration.
- **Do not sell** "autonomous submission / outreach / SAM filing /
  portal upload." It deliberately does none of those.
- **Do not sell** compliance certification, guaranteed awards, or
  guaranteed revenue. The product does not claim them and the
  operator must not.
- **Do not ship** the installer to arms-length buyers until Phase
  23E signing/notarization is verified end-to-end for the specific
  artifact being distributed.
- **Do not lead** a buyer demo with the legacy commercial tools
  (Lead Generator, Ad Engine, Daily Ops, etc.). They remain in the
  sidebar but should not be the first thing a GovCon buyer sees.
- **Do not record** demo `.mp4` clips at full raw quality (3.3 GB
  for a single shot, as the prior attempt produced). Defer video
  capture until after Phase 24B's recording standard is settled.

---

## 8. Final release path — next 3 phases

The next 3 phases stay consistent with the PR #81 audit's plan and
are renamed slightly to reflect what each must deliver to advance the
product from "ready for paid pilot" toward "ready for public sale."

### Phase 24B — Buyer-Demo Asset Capture & Sign-off

- **Purpose.** Produce operator-recorded GovCon demo clips so the
  demo can be shown async and embedded later. Settle the recording
  standard (codec, bitrate, target file size) before any 17-clip
  pass.
- **Deliverables.** Operator-recorded `.mp4` + `.webm` + poster +
  `.vtt` for the canonical GovCon demo shot list (Phase 23K-R
  17-clip list), saved to `.qa/` only; a sign-off doc in
  `docs/demo/`. Encoding standard documented (target ~50-200 MB per
  clip).
- **Files likely affected.** `docs/demo/**` only.
- **Tests required.** Re-run `renderer-boot`, `govcon-demo-recording-blockers`,
  and the Phase 23F recording checklist before each capture. No new
  tests required.
- **Acceptance.** 17 clips exist locally; each passes the recording
  checklist + bounded safety scan; sign-off recorded in
  `docs/demo/phase-24b-...md`. **No media committed.**
- **Do-not-touch.** `sourcedeck.html`, `services/**`, `package.json`,
  `test/**`, website repo, `.env`, stashes. Do not commit media or
  `.qa/` output.

### Phase 24C — Pilot Packaging & Signed-Build Readiness

- **Purpose.** Make a trustworthy installer + a hands-on pilot
  onboarding path — the gate to charging a real customer money.
- **Deliverables.** Execute the Phase 23E
  `signed-demo-build.yml` workflow end-to-end with all 5 required
  GitHub secrets configured; verify the resulting artifact via the
  7-step verification chain (`release:mac-signing-readiness:strict`
  → signed build → `release-check` → `codesign --verify` →
  `spctl --assess` → `stapler validate` →
  `release:evidence:strict` reports signed-verified). Write a
  `docs/product/` pilot-onboarding + first-customer runbook. Update
  `release:evidence` to reflect signing status honestly.
- **Files likely affected.** `docs/product/**`,
  `docs/release-notes/**`. Possibly `build/` / signing config **only
  if** the user explicitly lifts the current "do not touch signing"
  hard rule.
- **Tests required.** `macos-signing-readiness`, `release-evidence`,
  `release-check`.
- **Acceptance.** Signing/notarization either verified end-to-end
  for a specific artifact (caveat language lifted for that artifact)
  or clearly documented as still pending with the operator gating
  steps named. Pilot runbook complete.
- **Do-not-touch.** GovCon runtime behavior, Response Desk / SAM
  boundaries, pricing/payment files (until explicitly approved).

### Phase 24D — GovCon-First Buyer Surface Tightening

- **Purpose.** Make the first-run buyer experience read as a focused
  GovCon Capture OS (reduce legacy-tool distraction) without
  removing any commercial surface.
- **Deliverables.** Default "Other business tools" group collapsed
  for new profiles (persisted via the same `localStorage` mechanism
  Phase 23C deferred as 23E-A); a short in-app GovCon onboarding
  strip with the positioning line; surgical copy polish on capture
  and readiness panels.
- **Files likely affected.** `sourcedeck.html` (surgical,
  default-state only, no removal); a regression test in `test/`;
  `docs/release-notes/**`.
- **Tests required.** `govcon-primary-navigation`, `renderer-boot`,
  `default-state-policy`, and a new "GovCon-first default" test
  asserting collapsed-by-default behavior.
- **Acceptance.** New-profile cold open shows GovCon primary with
  legacy tools collapsed-by-default and still reachable via the
  toggle. All guards (Phase 20G `.btn-gold`, no-send/no-submit,
  System Readiness removal) still pass.
- **Do-not-touch.** Response Desk / SAM behavior, no new features,
  no compliance / guarantee / signed / certification claims, no
  System Readiness restoration. PR #80 stays closed; do not revisit
  Phase 21E.

---

## 9. Verdict

**The product is pilot-ready.** The remaining gaps are
**go-to-market** (signed build, in-app onboarding, recorded demo
clips), not **product correctness or safety**. Ship a guided paid
pilot now under the honest wedge in §6; complete the next 3 phases
(24B → 24C → 24D) before unattended public sale.

The PR #81 verdict held; this gate refreshes the evidence against
the current wall clock, captures the one release-blocker fix
(stale-fixture) needed to keep `npm test` green going forward, and
re-states the path forward.

# Phase 25E — Buyer Product Cleanup Audit

**Date:** 2026-06-09
**Repo:** `thekidd2227/sourcedeck-app`
**Branch:** `feat/phase-25e-buyer-product-cleanup`
**Base:** `main @ 4572950` (post-PR #102 — Phase 25E.1).
**Companion sub-phases:** 25E.2 (`611a4c1`), 25E.3 (`3654af4`), 25E.4 (`50a02d1`), 25E.5 (`129b72d`), 25E.6 (`194cbf9`), 25E.7 (`9ef2968`).

---

## 1. Phase 25E decomposition (recap)

The original Phase 25E mission spans 22 steps and would touch the largest file in the repo (`sourcedeck.html`, now ~28K lines) plus introduce a 13-section Proposal Workspace state machine, an Airtable → local-CRM data-layer change, ~180 FAQ items, a 4th-grade manual, a Pilot Tracker rebuild, default-state cleanup, and a Lead workspace merge — all while keeping ~60 existing sentinel tests green.

Attempted as one PR, that would produce broken sentinels, half-finished UI, and filler content. Phase 25E is therefore decomposed into 7 sub-phases. **25E.1 shipped as PR #102** (already merged). **25E.2–25E.7 ship together in this PR per operator instruction** ("go in order; merge when all are completed").

| Sub-phase | Status | Commit | Sentinel | Scope summary |
|---|---|---|---|---|
| 25E.1 | ✅ merged | PR #102 | `test/sourcedeck-logo-standardization.test.js` 8/8 | Default-collapse "Other business tools" + backfilled Phase 25D logo sentinel. |
| 25E.2 | ✅ in this PR | `611a4c1` | `test/phase-25e-proposal-workspace.test.js` 14/14 | Execution → Proposal Workspace rebuild. 13 section tabs + 5-state status machine + per-section notes + local Markdown export. |
| 25E.3 | ✅ in this PR | `3654af4` | `test/phase-25e3-airtable-user-facing-copy.test.js` 9/9 | Airtable user-facing copy → neutral CRM language; Settings Airtable PAT framed as optional legacy integration. |
| 25E.4 | ✅ in this PR | `50a02d1` | `test/phase-25e-help-faq-manual.test.js` 8/8 | In-app Help / FAQ tab (9 sections × 20 items = 180) + `docs/manuals/sourcedeck-user-manual-4th-grade.md`. |
| 25E.5 | ✅ in this PR | `129b72d` | `test/phase-25e-pilot-tracker.test.js` 13/13 | Client Delivery OS → Pilot Tracker rename + rebuild. Surfaces Phase 25B trial state. |
| 25E.6 | ✅ in this PR | `194cbf9` | `test/phase-25e-daily-ops-defaults.test.js` 6/6 | Daily Ops empty-state invariant + Settings Automation Config framed as optional legacy integrations. |
| 25E.7 | ✅ in this PR | `9ef2968` | `test/phase-25e-leads-workspace.test.js` 7/7 | Lead Generator / AI Lead Builder / Create Lead nav buttons consolidated into single Leads workspace. Underlying panes preserved. |

## 2. Stale-bundle clarifications (recap)

Several Phase 25E mission citations referred to screenshots showing UI states that don't match current `main`:

| Screenshot complaint | Verified state on `main @ 7b0695e` (before this PR) | Cause |
|---|---|---|
| "Old S logo still visible inside the app chrome" | Phase 25D #101 swapped `sourcedeck.html:744` to `sourcedeck-mark.svg`. | Stale `dist/mac/SourceDeck.app` bundle built pre-Phase-25D. |
| "System Flow still in navigation" | `remove-system-readiness-tab.test.js` 9/9 PASS; `data-tab="sysflow"` absent. | Stale bundle. |
| "Daily Operating Rhythm contains Jean-Max/internal PROD task data" | Daily Ops pane (lines 1402–1436) ships three neutral empty states ("No operating rhythm yet", "No weekly rhythm yet", "No escalation rules configured"). Zero PROD-01..05 / Jean-Max / Notion Sync / Reply Intel / Booking Brief / Gmail / Airtable writeback references. | Stale bundle. |

Operator remediation (same as Phase 25E.1):
```sh
cd ~/sourcedeck-app
git checkout main && git pull origin main
rm -rf dist
npm run pack:mac
bash ~/sd-day0-refresh.sh
```

## 3. What was REMOVED from buyer-visible markup

| Surface | Pre-Phase-25E | Post-Phase-25E |
|---|---|---|
| Execution nav button label | "Execution" | "Proposal Workspace" |
| Execution pane teaser | "🔒 Operator / Federal Tier — Unlock Execution Suite →" with subcontractor matching copy | Rebuilt as section-by-section Proposal Workspace |
| Create Lead pane subtitle | "Push directly to Airtable Leads table" | "Save a new lead to your CRM" |
| Create Lead primary CTA | "⬆ Push to Airtable" | "⬆ Save Lead" |
| AI Lead Builder pane subtitle | "AI-assisted prospect research → push to your CRM / Airtable" | "AI-assisted prospect research → save to your CRM" |
| Command Center cmd-inbox empty state | "Aggregated from Airtable Leads + Email Events. Severity-ranked." | "Aggregated from your leads pipeline and email events. Severity-ranked." |
| Command Center SOURCES footer line | "Airtable Leads · Email Events ledger · Instantly · Stripe webhook ledger · localStorage sd_events" | "Leads pipeline · Email Events ledger · Stripe webhook ledger · localStorage sd_events" |
| Response Desk CRM field label | "Optional CRM / Airtable record ID" | "Optional CRM record ID" |
| Response Desk save button | "Save analysis to CRM/Airtable" | "Save analysis to CRM" |
| Client Delivery OS nav button label | "Client Delivery" | "Pilot Tracker" |
| Client Delivery OS nav section label | "Other business tools · Client" | "Other business tools · Pilot" |
| Client Delivery OS pane content | Delivery Health Dashboard / Diagnostic Queue / Findings Board / Blueprint Pipeline / Implementation Board / Risk Radar / Expansion Readiness / Stage History tables | Rebuilt as Pilot Tracker (Trial Day + Setup state + Open Issues + Go/No-Go + Next Action) |
| Settings Airtable PAT label | "Airtable PAT" | "Airtable PAT (optional legacy CRM integration)" + helper copy "SourceDeck owns lead management locally. Airtable is supported as an optional legacy export integration only — not required for normal use." |
| Settings Automation Config card | "Automation Config" — no qualifier | "Automation Config (optional legacy integrations)" + helper copy "SourceDeck owns workflow automation locally. These third-party integrations are optional — leave blank to skip." |
| Make.com / Instantly / Assessment Webhook field labels | Plain labels | Each adds "(optional)" qualifier and "leave blank to skip" placeholder |
| Lead Generator nav button label | "Lead Generator" | "Leads" |
| Create Lead sidebar nav button | Visible | Hidden via inline `display:none` (button stays in DOM per Phase 23C invariant) |
| AI Lead Builder sidebar nav button | Visible | Hidden via inline `display:none` (button stays in DOM per Phase 23C invariant) |

## 4. What was ADDED (buyer-visible)

| Surface | Description |
|---|---|
| Proposal Workspace pane | 13 section tabs; per-section state machine (not-started / drafted / approved / needs-revision / finalized); per-section notes textarea; per-section "Internal review only" disclaimer; Export Internal Review (local Markdown blob). |
| Help / FAQ nav button (always-on) | New `<div class="nav-section" id="nav-section-help">` sits outside the Phase 25E.1 collapsible "Other business tools" container so the Help / FAQ button is reachable on cold open. |
| Help / FAQ pane | Search input + accordion of 9 sections × 20 FAQ items = 180 plain-English Q&A pairs at ~4th-grade reading level. Mirrors the `docs/manuals/sourcedeck-user-manual-4th-grade.md` content. |
| Pilot Tracker pane | KPIs (Current Trial Day, Setup Wizard state, Open Issues, Go/No-Go); Day 0–Day 7 selector + checklist note; severity-tiered issue counters; Go/No-Go decision selector; Next Action textarea. |
| Leads pane entry-point bar | In-pane "+ Create Lead" and "🪄 Generate Leads (AI)" buttons that route via `openTab()` to the underlying panes (which remain in DOM but are hidden from the sidebar). |

## 5. What was ADDED (docs)

| Doc | Role |
|---|---|
| `docs/manuals/sourcedeck-user-manual-4th-grade.md` | Plain-English user manual at ~4th-grade reading level. Mirrors the in-app FAQ content. |
| `docs/audits/phase-25e-buyer-product-cleanup-audit.md` (this file) | Full Phase 25E audit. |
| `docs/release-notes/phase-25e-buyer-product-cleanup.md` | Phase 25E release note. |

## 6. Why Airtable is no longer required

The Phase 25E.3 sub-phase reframes Airtable as an **optional legacy CRM integration** rather than a required dependency:
- Primary buyer CTAs (Create Lead, AI Lead Builder, Response Desk save) now use neutral CRM language.
- The Settings Airtable PAT field is explicitly qualified as "(optional legacy CRM integration)" with helper copy stating SourceDeck owns lead management locally.
- The underlying Airtable integration code, function names (`createLeadAirtable()`, `_pushOppToAirtable()`, `fetchGovconFromAirtable()`), and the credential-routing safe-storage layer (covered by `renderer-airtable-migration.test.js` 12/12) are preserved.

The mission's Step 8 goal "move to hidden/advanced/integrations only if absolutely necessary and mark as optional legacy export" is honored at the copy layer. A full data-layer replacement of Airtable with a local CRM is reserved for a future phase — that's a larger change requiring a new storage adapter, lead-export contract, and migration path. Phase 25E.3 is the safe, surgical copy-only step toward that future state.

## 7. How Pipeline updates (deferred)

The original mission Step 9 calls for merging Revenue into Pipeline with state machine updates ("Pipeline should update from: Leads that are qualified · GovCon opportunities marked as pursue · …"). Phase 25E.7's Lead workspace consolidation is the only nav-level overlap with that step that fit into this sprint's risk envelope. A full Pipeline rebuild that wires together Leads / GovCon / Proposal Workspace approval gates is reserved for a future phase (provisionally Phase 25F).

## 8. How Proposal Workspace works

See `docs/product/phase-25e-proposal-workspace-contract.md` for the full contract. Summary:

- 13 canonical sections (Table of Contents, Solicitation Summary, Compliance Matrix, Technical Approach, Management Approach, Staffing/Key Personnel, Past Performance, Quality Control, Risk Management, Transition/Mobilization, Cost/Price Volume, Attachments/Forms, Final Internal Review).
- Per-section 5-state status machine: `not-started → drafted → (approved | needs-revision) → approved → finalized`; `needs-revision → drafted` (retry).
- Per-section notes textarea (special instructions, used as AI draft context).
- Per-section draft textarea.
- Action buttons: Request AI Draft (this section), Mark as Drafted, Approve, Needs Revision, User Finalize, Reset Section.
- Pane-level "Internal review only" disclaimer reproduces the Phase 25A no-send/no-submit/no-upload posture verbatim.
- Persistence: `window.sd.storeGet/storeSet('proposalWorkspace')` via electron-store preload bridge; localStorage fallback at `sd.proposalWorkspace.v1`.
- Export Internal Review: produces a local Markdown blob (filename `YYYYMMDD-proposal-workspace-INTERNAL-REVIEW-DRAFT.md`) via `Blob` + `URL.createObjectURL`. **No `fetch()`. No `XMLHttpRequest`. No network call.**

## 9. Why full proposal generation is forbidden

The Phase 25E.2 Proposal Workspace explicitly rejects any "Generate Full Proposal" / "Generate Entire Proposal" / "One-Click Proposal" control. Rationale:

1. **Quality.** A proposal generated in one click is a proposal the buyer did not read. Unread proposals lose.
2. **Compliance posture.** Section L / M evaluation factors require human review per section. SourceDeck cannot certify compliance; only the buyer's own legal/contracts team can.
3. **Phase 25A boundary.** SourceDeck does not send, submit, or upload proposals to SAM.gov, PIEE, eBuy, GSA, or any agency portal. The single-section AI drafting + per-section human approval gate enforces the buyer-in-the-loop posture end-to-end.

The renderer-side sentinel `test/phase-25e-proposal-workspace.test.js` asserts the absence of full-proposal CTAs (`Generate Full Proposal`, `Generate Entire Proposal`, `One-Click Proposal`) and the presence of the single-section CTA (`Request AI Draft (this section)`).

## 10. Client Delivery OS decision and rationale

The mission Step 12 offered three options:

- **Option A** — Rename to "Implementation Tracker"
- **Option B** — Rename to "Pilot Tracker" *(marked Preferred by mission)*
- **Option C** — Remove from buyer-facing nav

Phase 25E.5 implements **Option B (Pilot Tracker)** per the mission's stated preference. Rationale captured in the mission itself ("For internal trial and pilot readiness, Option B is compelling: Rename Client Delivery OS → Pilot Tracker"). The Pilot Tracker pane surfaces the Phase 25B 7-day internal trial state, which is the primary use case during the current phase of the product lifecycle.

## 11. Help / FAQ + manual summary

- **In-app pane:** 9 sections × 20 FAQ items = 180 Q&A pairs at ~4th-grade reading level. Search input filters by question or answer substring. Per-section visible-count label updates as the user types.
- **Manual:** `docs/manuals/sourcedeck-user-manual-4th-grade.md` — 380+ lines of plain-English documentation mirroring the in-app FAQ, with additional context, reading-level note, and final-words section. Explicitly calls out the 4th-grade reading-level posture so a future regression cannot silently swap it for a higher-grade rewrite.
- **Escalation footer:** Tier 1 (operator, business-day) + Tier 2 (engineering via operator, 48-hour). Does NOT hardcode any operator-identifying email (preserves the `first-run-safety.test.js` white-label invariant).

## 12. Buyer-facing default state cleanup

| Surface | Default state |
|---|---|
| Cold-open nav | GovCon Capture OS section + Help section visible. "Other business tools" collapsed (Phase 25E.1). |
| Daily Ops pane | "No operating rhythm yet" / "No weekly rhythm yet" / "No escalation rules configured" — clean empty states only. |
| Socials pane | "No social channels configured" empty state (pre-existing). |
| Proposal Workspace pane | "Select a section to begin" empty state with disclaimer banner. |
| Help / FAQ pane | All 9 sections rendered with 20 items each, accordion-collapsed. |
| Pilot Tracker pane | Day 0 selected; setup state read from `sd.govcon.setupComplete`; 0 open issues across all severities; go/no-go "—" (not decided). |
| Settings Automation Config | All three legacy integration fields show "(optional)" + "leave blank to skip" placeholders. |

## 13. Test results

| Test | Result |
|---|---|
| `node test/sourcedeck-logo-standardization.test.js` | ✅ PASS 8/8 |
| `node test/phase-25e-proposal-workspace.test.js` | ✅ PASS 14/14 |
| `node test/phase-25e3-airtable-user-facing-copy.test.js` | ✅ PASS 9/9 |
| `node test/phase-25e-help-faq-manual.test.js` | ✅ PASS 8/8 |
| `node test/phase-25e-pilot-tracker.test.js` | ✅ PASS 13/13 |
| `node test/phase-25e-daily-ops-defaults.test.js` | ✅ PASS 6/6 |
| `node test/phase-25e-leads-workspace.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/first-run-safety.test.js` | ✅ PASS 7/7 |
| `node test/renderer-airtable-migration.test.js` | ✅ PASS 12/12 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/macos-signing-readiness.test.js` | ✅ PASS 19/19 |
| `node test/release-evidence.test.js` | ✅ PASS 20/20 |
| `npm test` (full chain, ~60 sentinels) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected unsigned-dev posture) |

## 14. Safety scan result

The mission's Step 17 forbidden-language scan returns zero positive active hits in buyer-visible markup for:

- `Push to Airtable`, `Airtable Leads table`, `Push directly to Airtable`, `Save analysis to CRM/Airtable` — retired in 25E.3.
- `Client Delivery OS` (label), "Diagnostic Queue", "Findings Board", "Blueprint Pipeline", "Implementation Board", "Risk Radar", "Expansion Readiness", "Stage History" — retired from the rebuilt Pilot Tracker pane in 25E.5.
- `PROD-01`..`PROD-05`, `Notion Sync`, `Reply Intel`, `Booking Brief`, `Gmail reply`, `Airtable writeback`, `Jean-Max`, `ARCG internal` — guarded absent from Daily Ops pane in 25E.6.
- `Unlock Execution Suite`, "Subcontractor matching, execution timelines, and readiness assessment" — retired in 25E.2.
- `Free demo`, `Download now`, `Try now`, `Start free`, `Get started free`, `Free download`, `Public download`, `Self-serve` — verified absent (Phase 25C invariant preserved).
- `Submit Bid`, `Submit Quote`, `Send Email`, `Export and submit`, `auto_send`, `auto_submit`, `upload to SAM`, `upload to PIEE`, `upload to eBuy`, `upload to GSA`, `SourceDeck submits` — verified absent (Phase 25A invariant preserved).
- `guaranteed award`, `guaranteed revenue`, `FedRAMP certified`, `SOC 2 certified`, `CMMC certified`, `HIPAA certified`, `HITRUST`, `ISO 27001 certified`, `signed and notarized`, `Apple notarized`, `production signed` — verified absent (Phase 25A invariant preserved).
- Deprecated V2 pricing `$79` / `$349` / `$999` — verified absent in active app UI (Phase 25A invariant preserved).

## 15. Boundary preservation

- ✅ No tabs/panes removed from the DOM (Phase 23C invariant).
- ✅ No `data-tab` IDs renamed (Phase 23C invariant). `data-tab="execution"` carries the Proposal Workspace; `data-tab="delivery"` carries the Pilot Tracker.
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / portal-upload control introduced.
- ✅ No `signed and notarized` / `Apple notarized` / `production signed` claim introduced.
- ✅ No `FedRAMP` / `SOC 2` / `CMMC` / `HIPAA` / `HITRUST` / `ISO 27001` / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` / `Start free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying email or string hardcoded in the renderer (white-label invariant preserved per `first-run-safety.test.js`).
- ✅ No `.env` change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No payment / Stripe / checkout change.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `.qa/` / `reports/` / media committed.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved (and now surfaced via Pilot Tracker).
- ✅ Phase 25C master delivery method invariants preserved.
- ✅ Phase 25D approved brand mark preserved (and guarded by sentinel since 25E.1).
- ✅ Phase 25E.1 buyer-nav default-collapsed preserved.

## 16. Status

Unchanged from Phase 25A: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

Public signed release remains NO-GO. Phase 25C delivery model (`sourcedeck.app → Request Access → Manual Qualification → Secure Web App / PWA`) remains the canonical mass-delivery channel.

---

## Signature

Phase 25E buyer product cleanup ships six focused sub-phases that collectively retire founder/internal artifacts from buyer-facing surfaces and add the Proposal Workspace + Help / FAQ + Pilot Tracker that the limited-pilot story requires.

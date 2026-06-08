# Phase 24M — Final RC Scorecard

**Date:** 2026-06-08
**Base:** `main @ 5637bc3`.
**Companion audit:** `docs/audits/phase-24m-final-rc-hardening-audit.md`.
**Companion decision:** `docs/product/phase-24m-limited-paid-pilot-decision.md`.

## Product surface scorecard

| Surface | Status | Evidence | Buyer value | Remaining risk | Next action |
|---|---|---|---|---|---|
| **Setup Wizard** | ✅ Ready | `#govcon-wizard` modal, 11 steps, Welcome + Quick Setup Tour + Final Confirmation; `gcMaybeAutoOpenWizard()` cold-launch trigger; `sd.govcon.setupComplete` persistent flag; Settings reopen button. Tests: `setup-wizard-first-run` 35/35, `govcon-setup-wizard` 12/12, `govcon-operating-profile-wizard` 18/18, `govcon-operating-profile-completeness` 21/21 | First-time and recurring buyers reach a configured GovCon Capture OS without ambiguity. Quick Setup Tour orients them to all 15 surfaces. Final Confirmation anchors the no-send/no-submit boundary in writing. | Video walkthrough remains placeholder until a safe local asset exists. | Phase 24P pilot kickoff — record/onboard with the existing Quick Tour text |
| **Settings API Keys** | ✅ Ready | Claude / OpenAI / Apollo / Airtable / **SAM.gov** inputs in Settings → API Keys (`#tab-settings`); `saveSettings()` persists via `sd.credentials.set('<service>', …)` (Phase 24I + 24K). Test: `govcon-final-runtime-polish` 23/23 | Operator can update any credential in one place. Phase 24I removed credential prompts from workflow screens. | None at the credential boundary. | Phase 24P pilot kickoff — onboard with the wizard then surface Settings for updates |
| **Capture Command Center** | ✅ Ready | `#gc-capture-cc` with 8 stat cards + bid/no-bid selector. Phase 24I wired the opp-selection hook to drive Stakeholder Graph live refresh. Test: `govcon-capture-command-center` 15/15 | Central pursuit board with deadline/Q&A/bid-no-bid/vendor/proposal/approval counts in one view. | Manual intake only (no live SAM ingestion gate). Documented as a feature, not a defect. | Phase 24P pilot kickoff |
| **Operating Rhythm** | ✅ Ready | Phase 22B Operating Rhythm parent + 5 panels (Daily Capture Rhythm, Deadline & Q&A Calendar, Pre-RFP Intelligence, Agency Targeting Insights, Audit Log). | Daily / weekly / pre-RFP / agency-strategic cadence in one surface. | None. | Phase 24P pilot kickoff |
| **SAM Sprint** | ✅ Ready | `services/govcon/sam-opportunity-sprint.js` (Free=1 NAICS, paid=many); `manual_review_required: true` everywhere; no auto-send. Test: `sam-opportunity-sprint` 62/0. Phase 24I removed credential UI from this screen. | Buyer can run a pursuit sprint within their entitlement tier with explicit manual-review posture. | No live SAM call exercised in CI (by design — synthetic fixtures). | Phase 24P pilot kickoff with an operator-supplied SAM key |
| **Response Desk** | ✅ Ready | Phase 21D import-first design preserved; no Send Email; `auto_send: false`; `draft only — not sent`; never-auto-sends language. Tests: `response-desk` 24/24, `response-desk-email-import` 20/20 | Buyer's inbound-reply triage gets a deterministic local classifier with explicit human approval. | None. | Phase 24P pilot kickoff |
| **Solicitation Workspace** | ✅ Ready | `#gc-sol-workspace` with Section L/M/B/C/H/K shred + starter compliance matrix. Test: `govcon-solicitation-workspace` 19/19 | Compliance discipline from intake to draft. | Extraction is heuristic; verify against source — clearly noted in copy. | Phase 24P pilot kickoff |
| **Compliance Matrix** | ✅ Ready | Per-requirement matrix bound to `#gc-sol-workspace`; risk flags (clearance/CMMC/CUI/Section 889/FAR 52.219-14/past performance). Same test as Solicitation Workspace. | Per-requirement traceability + risk tagging that SMB primes commonly miss. | None. | Phase 24P pilot kickoff |
| **Vendor Quote Room** | ✅ Ready | `#gc-vqr` with vendor-intake form + manual quote-status table. Test: `govcon-vendor-pricing` 25/25 | Vendor candidates and quote-status tracking without auto-email. | Manual quote status only (no automation). | Phase 24P pilot kickoff |
| **Pricing Worksheet** | ✅ Ready | `#gc-pricing` advisory price/margin worksheet; margin + missing-data warnings. Same test. | Operator sets bid price; advisory math only. | None. | Phase 24P pilot kickoff |
| **Past Performance Library** | ✅ Ready | `#gc-pp` past-performance library + match scorer + CPARS rating dropdown. Phase 24D. Test: `govcon-past-performance-prime` 24/24, `govcon-past-performance-capability-ui` 15/15 | Reusable PP citations that compound across pursuits. | None. | Phase 24P pilot kickoff |
| **Capability Statement Studio** | ✅ Ready | `#gc-cs` capability statement outline + local/offline import. Phase 24D. Same test. | Per-opportunity capability statement tailoring without external send. | None. | Phase 24P pilot kickoff |
| **Prime Partner Finder** | ✅ Ready | `#gc-ppf` prime partner candidates driven by profile NAICS. Phase 24I removed legacy operator-specific fallback. Same test. | Set-aside / NAICS-aligned prime matching for sub-to-prime ladder. | None. | Phase 24P pilot kickoff |
| **Stakeholder Graph** | ✅ Ready | `#gc-stakeholder-graph` with 4 views + risk rail + 6 SAMPLE rows. Phase 24E + 24I (live wire-up to Capture-CC). Test: `govcon-stakeholder-graph-ui` 25/25 | FAR-aware stakeholder posture in writing; never-autonomous-outreach boundary anchored. | None. | Phase 24P pilot kickoff |
| **Submission Readiness Gate** | ✅ Ready | `#gc-sub-gate` advisory red/yellow/green score; per-requirement checklist; package preview. Test: `govcon-submission-readiness` 30/30 | "Are we responsive yet?" advisory before the operator submits externally. | None. | Phase 24P pilot kickoff |
| **Internal Review Markdown Export** | ✅ Ready | `#gc-pkg-export` local Markdown export with "INTERNAL REVIEW DRAFT — NOT SUBMITTED" banner. Same test. | Portable internal-review artifact without portal upload. | None. | Phase 24P pilot kickoff |
| **Audit Log** | ✅ Ready | `#gc-audit-log` panel + `gcAuditRefresh()` consuming `window.sd.auditList()`. Phase 24B. Test: `govcon-core-hardening` 15/15 | Local evidence trail of AI / storage / context / sensitive-action events (never API keys, prompts, document content). | None. | Phase 24P pilot kickoff |
| **Buyer Demo Docs** | ✅ Ready | Phase 24H storyboard / walkthrough script / demo QA checklist + Phase 24J operator demo runbook. | Demo operator can run a buyer demo without reading the source code. | None. | Phase 24P pilot kickoff |
| **Pilot Handoff Docs** | ✅ Ready | Phase 24J pilot handoff package + Phase 24L pilot onboarding QA contract + Phase 24L final RC readiness doc. | Pilot operator can onboard a buyer through the no-send/no-submit boundary. | None. | Phase 24P pilot kickoff |
| **Public Release No-Go Matrix** | ✅ Ready | Phase 24J `docs/product/phase-24j-public-release-no-go-boundaries.md` (GO matrix for demo / pilot / signed release / watsonx claim / website). | Operator knows exactly what may and may not be claimed at each stage. | None. | Phase 24N — Signed Build / Installer Evidence Gate |

## Summary

| Category | Surfaces ready | Surfaces blocked |
|---|---|---|
| Runtime UX | 17 | 0 |
| Docs | 3 | 0 |
| **Total** | **20** | **0** |

No surface is blocked. No RC-blocking defect found.

## Forward gates required before public signed release

- **Signing / notarization evidence** — currently `release-check.js` reports `macOS signing env: MISSING` + `macOS notarize env: MISSING`. This is expected in the local-dev environment. A signed RC requires a separate signing pipeline phase (Phase 24N).
- **Present-tense watsonx-live evidence** — currently `release-evidence` reports `verified_ready: no`. Until this clears, no present-tense "watsonx is live" claim may be made.
- **Website alignment** — handled in `sourcedeck-site` repo (Phase 24O follow-up).

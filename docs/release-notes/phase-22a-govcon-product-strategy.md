# Release Note — Phase 22A GovCon Product Strategy (Consolidated)

**Branch:** `docs/phase-22a-1-govcon-strategy-consolidated`
**Type:** Docs only — research, audit, strategy, and merge synthesis. **No runtime files modified.**
**Base:** `main @ b93e06e` (post-PR #58 — System Readiness tab removed).
**Supersedes (for canonical use):** PR #59 — see "How PR #59 was preserved" below. PR #59 is **not** overwritten and remains open on its branch.

---

## Summary

Phase 22A is now a **consolidated, docs-only product-market-fit audit** of SourceDeck against GovCon SMB buyer reality, paired with a **25-feature opportunity map** (canonically named F01–F25), a **5-phase build roadmap (22B–22F)**, a **pricing critique** with an advisory resolution direction, and a **Reddit / forum research notes** doc with both the original blocked-source disclosure and supplementary corroboration.

This PR (Phase 22A-1) **consolidates PR #59 and the later-agent findings into a single canonical Phase 22A package** without overwriting PR #59. PR #59 remains open on its branch (`docs/phase-22a-govcon-product-strategy`) and was preserved verbatim in `.tmp/phase22a-pr59/` of this workspace for reference during the merge (not committed).

The core finding from PR #59 is preserved verbatim and is the spine of the consolidated package:

> **"SourceDeck does not have a capability problem. It has an assembly and proof problem."**

The audit shows 30+ GovCon service modules in `services/govcon/` with at least 8 high-value modules carrying no buyer-visible surface. The recommended 22B–22F path turns those existing service modules into buyer-visible workflow surfaces. **No runtime code, pricing, or compliance posture is changed in this PR.**

---

## What changed

Six docs are touched by this PR. All are additive. All are docs-only.

| File | Purpose | Approx. lines |
|---|---|---|
| `docs/product/phase-22a-govcon-product-market-fit-audit.md` | Canonical audit — buyer reality check, persona grades, 30+ module inventory, gap analysis, 5-phase roadmap | ~350 |
| `docs/product/phase-22a-govcon-feature-opportunity-map.md` | Canonical 25 named features (F01–F25), with phase targets, buyer value, and backend dependency callouts | ~320 |
| `docs/product/phase-22a-pricing-fit-critique.md` | Canonical pricing critique — disagreement table preserved verbatim from PR #59, plus a new §0.1 advisory resolution direction (no values changed) | ~210 |
| `docs/product/phase-22a-reddit-forum-research-notes.md` | Canonical research notes — original Reddit-blocked disclosure preserved as a record, plus a new §1b supplementary forum corroboration | ~220 |
| `docs/product/phase-22a-1-duplicate-merge-notes.md` | **New** — records what was preserved from PR #59, what was deduplicated, which conflicts were resolved, and the canonical 25-feature list and 22B–22F phasing | ~165 |
| `docs/release-notes/phase-22a-govcon-product-strategy.md` | This file | ~290 |

---

## What did NOT change

Explicit non-changes. Carried forward from PR #59 and re-asserted for this consolidation:

- **No runtime code touched.** No edits to `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `package.json`, or `package-lock.json`.
- **No pricing changed.** No edit to `docs/pricing/sourceDeck-pricing-packaging.md`. No `assets/sd-config.js` (site repo) touched. No Stripe Price ID mentioned, changed, or referenced.
- **No compliance certification claim added.** No FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 / "government-compliant" wording introduced.
- **No autonomous submission claim added.** No `human_approval_required: true` invariant removed. No `auto_send: false` invariant removed. No "auto-submit to SAM / PIEE / eBuy / GSA" path introduced.
- **No Gmail-live / live-inbox-connected claim added.** Response Desk import remains local/manual until inbox integration is connected.
- **No watsonx-live claim added. No signed-and-notarized claim added.**
- **No guaranteed-award / guaranteed-revenue / guaranteed-ROI / unlimited-AI claim added.**
- **No live SAM execution. No outreach drafted, sent, or queued.**
- **No PII / lead name / buyer name captured** from any reviewed forum, vendor, or third-party source.
- **No `/sales/` nav link added** (per the site repo's CLAUDE.md rule 6).
- **No stash touched. No `.env` touched. No API key printed.**
- **PR #59 not overwritten, force-pushed, closed, or modified.** Its branch (`docs/phase-22a-govcon-product-strategy`) remains intact on origin and locally.

---

## How PR #59 was preserved

PR #59's five docs were copied verbatim into `.tmp/phase22a-pr59/` of the working tree so they could be read side-by-side with the later-agent findings during this merge. That directory is **not committed** to the repository — it exists only as a reference for the consolidation pass.

PR #59's branch (`docs/phase-22a-govcon-product-strategy`) was **not** touched. No force-push, no close, no rebase, no edit. It remains open as a draft and can be referenced, compared against this PR, or closed without merge at the operator's discretion.

The canonical docs in this PR **quote and cite PR #59 directly** wherever the underlying analysis is unchanged — including the executive verdict, the 30+ module inventory, the persona grades, the pricing disagreement table, the Reddit-blocked source disclosure, the primary sources used, and the compliance / human-approval safety invariants. See `phase-22a-1-duplicate-merge-notes.md` §1 for the line-by-line preservation list.

This consolidation lives on a **separate branch** (`docs/phase-22a-1-govcon-strategy-consolidated`) and a **separate draft PR**. The two PRs can coexist; the operator decides which one merges.

---

## Duplicates collapsed

See `phase-22a-1-duplicate-merge-notes.md` §3 for the long-form record. Short summary:

- **GovCon-First Nav Mode + Daily Rhythm overlap.** Collapsed into **F01 GovCon Capture Command Center**, with GovCon-First Nav Mode now a sub-deliverable of F01 rather than a standalone feature.
- **Solicitation Workspace vs. Section L/M/C/PWS shred.** Kept as separate canonical features (F04 Solicitation Workspace + F05 Section L/M/C/PWS Extractor) so the workspace-container and section-extractor responsibilities are clean.
- **Past-performance reuse spread across multiple PR #59 entries.** Consolidated into F16 Past Performance Library and F17 Capability Statement Tailoring, no longer overlapping with the technical approach builder.
- **Submission Readiness Gate fused with the package export.** Split into F24 Submission Readiness Gate (the green/yellow/red score) and F25 Human-Approved Submission Package Export (the actual artifact).
- **22B backend dependencies (fed-agent, targeting-profile, naics-expansion, workflow-automation, capture-os).** Retained as backend dependencies for the 22B trio (F01 + F06 + F03) per the canonical phasing.
- **Bid/No-Bid Engine placement.** Promoted from an implied "Daily Rhythm" concern to an explicit F03 deliverable in 22B.
- **Reddit/forum status.** Original blocked-source disclosure kept as a record; supplementary forum corroboration added as §1b in the canonical research notes (not as a replacement).

---

## Roadmap proposed (22B–22F)

| Phase | Theme | Primary deliverables (canonical F-numbers) |
|---|---|---|
| **22B** | Capture spine | F01 GovCon Capture Command Center · F06 Deadline + Q&A Calendar · F03 Bid/No-Bid Engine |
| **22C** | Solicitation + Compliance | F04 Solicitation Workspace · F05 Section L/M/C/PWS Extractor · F07 Amendment Monitor · F08 Compliance Matrix Builder · F09 Evaluation Criteria Mapper · F10 Requirement Owner / Evidence Tracker |
| **22D** | Vendors + Pricing | F11 Vendor Quote Room · F12 Vendor Risk + Credential Checklist · F21 Pricing Worksheet / Margin Builder · F22 Subcontractor Quote Comparison |
| **22E** | Past Performance + Capability + Teaming | F16 Past Performance Library · F17 Capability Statement Tailoring · F13 Prime Partner Finder · F14 Incumbent / Recompete Intelligence · F15 Pre-RFP Capture Tracker |
| **22F** | Submission readiness | F23 FAR / Set-Aside Guardrails · F24 Submission Readiness Gate · F25 Human-Approved Submission Package Export · F18 Proposal Outline Builder · F19 Technical Approach Draft Builder · F20 Management / Staffing Plan Builder |

Every phase retains the existing safety invariants: renderer-boot test green (PR #55, 7/7), default-state policy green (PR #52, 22/22), Response Desk safety (PR #51 / #56, 24/24) — no Send Email button, `auto_send: false`, no live-Gmail claim — and the SAM Sprint entitlements (Free=1 NAICS / paid=many).

No phase adds a compliance certification claim, an autonomous-submission claim, a guaranteed-outcome claim, a live-Gmail claim, a watsonx-live claim, or a signed-and-notarized claim. Pricing experiments and compliance certification investigations are deferred to a separate phase and remain out of scope for 22B–22F.

---

## 25 feature opportunities (canonical, named)

The canonical 25 features, in canonical order, with the phase each is targeted to. Full per-feature buyer value, evidence basis, and backend dependency notes live in `phase-22a-govcon-feature-opportunity-map.md`.

| # | Feature | Phase target |
|---|---|---|
| F01 | GovCon Capture Command Center | 22B |
| F02 | SAM Opportunity Intelligence | 22B (intel feed into F01) |
| F03 | Bid/No-Bid Engine | 22B |
| F04 | Solicitation Workspace | 22C |
| F05 | Section L/M/C/PWS Extractor | 22C |
| F06 | Deadline + Q&A Calendar | 22B |
| F07 | Amendment Monitor | 22C |
| F08 | Compliance Matrix Builder | 22C |
| F09 | Evaluation Criteria Mapper | 22C |
| F10 | Requirement Owner / Evidence Tracker | 22C |
| F11 | Vendor Quote Room | 22D |
| F12 | Vendor Risk + Credential Checklist | 22D |
| F13 | Prime Partner Finder | 22E |
| F14 | Incumbent / Recompete Intelligence | 22E |
| F15 | Pre-RFP Capture Tracker | 22E |
| F16 | Past Performance Library | 22E |
| F17 | Capability Statement Tailoring | 22E |
| F18 | Proposal Outline Builder | 22F |
| F19 | Technical Approach Draft Builder | 22F |
| F20 | Management / Staffing Plan Builder | 22F |
| F21 | Pricing Worksheet / Margin Builder | 22D |
| F22 | Subcontractor Quote Comparison | 22D |
| F23 | FAR / Set-Aside Guardrails | 22F |
| F24 | Submission Readiness Gate | 22F |
| F25 | Human-Approved Submission Package Export | 22F |

Every recommended feature retains `human_approval_required: true` and `auto_send: false`. No feature description introduces a compliance certification claim, an autonomous-submission claim, a guaranteed-outcome claim, or a live-Gmail / live-watsonx claim.

---

## Tests run

This PR is docs-only and does not edit any runtime path. The standard gate suite is run for hygiene to prove no incidental regression. Each is expected to land green when the orchestrator runs them after the docs land:

- `npm test` — full chain, expected PASS (no runtime files changed).
- `npm run release:evidence` — expected PASS.
- `npm run troubleshooting:scan` — expected no fail / no warn.
- `npm run govcon:smoke` — expected PASS.
- `npm run phase13:rc-check` — expected PASS.
- `npm run i18n:audit` — expected PASS.
- `node scripts/release-check.js` — privacy gate expected clean; may show only the benign unsigned-local-artifact warning.

Gate results are recorded in the audit doc and re-verified at PR open.

---

## Rollback

Additive docs-only. To roll back this PR, revert its single commit on the `docs/phase-22a-1-govcon-strategy-consolidated` branch. PR #59 is not affected by this PR and is not affected by a rollback of this PR. No runtime, pricing, or compliance posture is touched, so there is nothing operational to unwind.

---

## Open questions for the operator

1. Confirm consolidation into this PR (Phase 22A-1) versus merging PR #59 first and consolidating afterward?
2. Confirm the 5-phase 22B–22F order and theme split (Capture spine → Solicitation+Compliance → Vendors+Pricing → Past Performance+Capability+Teaming → Submission readiness)?
3. Confirm the GovCon-Mode demotion of Lead Generator, Email Tracker, Ad Engine, Socials, and Clinical/EHR from the primary nav (behind a "Show all" toggle) — keeping them available but no longer co-equal with capture surfaces?
4. Confirm the pricing resolution direction (implementation + subscription model) as the advisory path — one-time SKUs reframed as implementation services, monthly Operator tiers as workflow subscriptions — with **no value change in this PR**?
5. Confirm F24 (Submission Readiness Gate, green/yellow/red score) and F25 (Human-Approved Submission Package Export, the actual artifact) are the right split for submission-readiness, rather than a single fused feature?
6. Should PR #59 be closed without merge once this consolidation PR lands, or kept open for reference?
7. Confirm the supplementary Reddit / forum corroboration in `phase-22a-reddit-forum-research-notes.md` §1b is in the right form — themes with provenance, cross-referenced against primary sources, no specific URLs or user names cited?
8. Confirm Phase 22B should not open until the pricing disagreement is resolved in the site repo, or is it acceptable to ship 22B in parallel with the pricing decision?

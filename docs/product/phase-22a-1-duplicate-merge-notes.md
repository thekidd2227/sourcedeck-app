# Phase 22A-1 — Duplicate Merge Notes

**Date:** 2026-06-04
**Branch:** `docs/phase-22a-1-govcon-strategy-consolidated`
**Base:** `main @ b93e06e` (post-PR #58 — System Readiness tab removed).
**Posture:** Docs-only consolidation. **No runtime files modified.**

This is an internal working document that records exactly what was preserved, what was deduplicated, and what was resolved across the two overlapping Phase 22A passes. The five canonical docs in this PR are:

- `docs/product/phase-22a-govcon-product-market-fit-audit.md`
- `docs/product/phase-22a-govcon-feature-opportunity-map.md`
- `docs/product/phase-22a-pricing-fit-critique.md`
- `docs/product/phase-22a-reddit-forum-research-notes.md`
- `docs/release-notes/phase-22a-govcon-product-strategy.md`

---

## 0. Inputs to this consolidation

| Source | Form | Where it lived | Status before merge |
|---|---|---|---|
| **Earlier-agent pass (PR #59)** | 5 markdown docs at the canonical paths above | `origin/docs/phase-22a-govcon-product-strategy` (PR #59, draft, open) | Preserved verbatim in `.tmp/phase22a-pr59/` of the workspace for this merge — **not** committed. PR #59 remains open and untouched on its branch. |
| **Later-agent findings** | 9 directive findings carried in the Phase 22A-1 task spec (see §1) | Task spec only — never landed as files on disk | Folded into the canonical docs. |
| **Canonical 25-feature list** | Named feature list in the Phase 22A-1 task spec | Task spec only | Replaces the PR #59 F01–F25 themed list 1-for-1 in the new feature-opportunity map. |
| **Canonical 22B–22F phasing** | Restructured 5-phase plan in the Phase 22A-1 task spec | Task spec only | Replaces the PR #59 22B–22F grouping. |

PR #59 has **not** been overwritten, force-pushed, closed, or modified. Its branch (`docs/phase-22a-govcon-product-strategy`) is intact on origin and locally. This consolidation is a **new branch and a new PR.**

---

## 1. Findings preserved from PR #59

The following PR #59 findings are kept verbatim or near-verbatim in the canonical docs:

1. **Executive verdict** — "SourceDeck does not have a capability problem. It has an assembly and proof problem." → kept verbatim in the canonical audit §0.
2. **30+ GovCon backend modules vs. ~4-surface buyer demo path.** → kept; same evidence and counts.
3. **Buyer reality check — 4 personas (Capture Manager / Subcontractor / Operator / Proposal Manager).** → kept verbatim in canonical audit §2; the persona grades (C, C+, B−, D) are kept.
4. **Pricing disagreement table (site $79/$349/$999 vs. internal $1,497/$3,497/$5,997 + $499/$997).** → kept verbatim in canonical pricing critique §1.
5. **One-time pricing vs. workflow product LTV analysis.** → kept verbatim in canonical pricing critique §2.
6. **Reddit-was-blocked source-access disclosure.** → kept verbatim in canonical research notes §0. The disclosure is preserved as a permanent record of the initial pass and is supplemented (not replaced) by §1b in the canonical research notes.
7. **Primary sources used (APMP, SBA, FedScoop, Federal News Network, Washington Technology, Capterra, G2, SoftwareAdvice, LinkedIn, GAO, SAM.gov status).** → kept verbatim in canonical research notes §0.
8. **Competitor SaaS pain analysis (GovWin IQ / GovTribe / Federal Compass / EZGovOpps / BidNet / Bloomberg Government).** → kept structurally.
9. **Documented absence of FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 certification claims.** → kept verbatim across all canonical docs.
10. **Human-approval invariant: `human_approval_required: true`, `auto_send: false`, no autonomous submission.** → kept verbatim across all canonical docs.

---

## 2. Later-agent findings folded in

The Phase 22A-1 task spec carried 9 findings the consolidation must preserve. Each is now reflected at least once in the canonical docs:

1. **"SourceDeck has more GovCon backend than UI."** → canonical audit §0 verdict + §3 feature inventory; canonical feature map opening table.
2. **"The PMF problem is assembly, proof, and workflow reachability."** → canonical audit §0 verdict (verbatim); canonical release note summary.
3. **"The demo currently sells safety/absence more than leverage."** → canonical audit §0 #5 (sharpened from PR #59's "the surfaces a buyer touches first are not unmistakably GovCon"); canonical release note §1.
4. **"Prime Partner Finder and other modules are valuable but not sufficiently buyer-facing."** → canonical audit §3 (highlights for `prime-partner-finder.js`, `subcontractor-sourcing.js`, `capability-statement-extractor.js`); canonical feature map F13 (Prime Partner Finder).
5. **"Compliance Matrix, Solicitation Workspace, Bid/No-Bid, Deadline Calendar, Vendor Quote Room, Pricing Worksheet, and Submission Readiness Gate are the revenue-justifying core."** → canonical audit §4 + canonical feature map (these are the H-tier features); canonical release note's 22B–22F phasing.
6. **"Generic AI dashboard/ad/lead features should be demoted unless tied to GovCon capture."** → canonical audit §3.3 (the previously commercial-CRM surfaces are explicitly demoted from the GovCon Mode primary nav); canonical feature map F01 GovCon-First Nav Mode (carried but re-numbered to F01 as before — see §3 below).
7. **"Reddit/forum research should be updated because later browsing found usable Reddit/forum evidence."** → canonical research notes §1b (NEW section — explicitly added: supplementary Reddit/forum corroboration through aggregated/cached sources; original Reddit-was-blocked disclosure is kept as a record, not replaced).
8. **"Pricing must reconcile the stale $79/$349/$999 language with the repo's high-ticket packaging notes."** → canonical pricing critique §1 (verbatim from PR #59) + a new §0.1 "Resolution direction" block calling out a single recommended resolution path. **No pricing values are changed** in any artifact in this PR.
9. **"No auto-submit, no auto-send, no guaranteed award/revenue claims."** → canonical audit closing safety block; canonical feature map "Safety posture" legend; canonical release note "What did NOT change"; canonical pricing critique §0.

---

## 3. Duplicates collapsed

- **PR #59 had F01 = "GovCon-First Nav Mode" with the Capture-Command-Center concept embedded in F19 / F20 area.** Canonical feature map promotes the **GovCon Capture Command Center** to **F01** (it is now the headline feature that the demo opens on); the **GovCon-First Nav Mode** becomes a sub-deliverable of F01 rather than a standalone item. This eliminates a duplicate (PR #59 had both a "GovCon Mode" feature and a "Daily Rhythm" surface that overlapped on the same screen real estate).
- **PR #59 F02 (Solicitation Workspace) + F03 (Compliance Matrix Generator)** are kept as separate canonical items (F04 Solicitation Workspace + F08 Compliance Matrix Builder); the canonical Section L/M/C/PWS Extractor (F05) replaces the previous F02 sub-shred so the responsibility split between "workspace container" and "section extractor" is clean.
- **PR #59 had multiple touchpoints for past-performance reuse spread across F14/F15.** Canonical feature map consolidates into F16 Past Performance Library and F17 Capability Statement Tailoring (no longer overlapping with the technical approach builder).
- **PR #59 had a single "Submission Readiness Gate" (PR #59 F22).** Canonical splits into F24 Submission Readiness Gate (the green/yellow/red score) and F25 Human-Approved Submission Package Export (the actual artifact). These were previously fused.
- **PR #59 mentioned `fed-agent.js`, `targeting-profile`, `naics-expansion`, `workflow-automation`, `capture-os` in the 22B bucket.** Canonical 22B keeps these as backend dependencies for **F01 (Capture Command Center) + F06 (Deadline + Q&A Calendar) + F03 (Bid/No-Bid Engine)** per the task spec.

---

## 4. Conflicting findings resolved

| Conflict | PR #59 stance | Later-agent / spec stance | Resolution in canonical docs |
|---|---|---|---|
| **22A phasing** — where does Past Performance / Capability Statement live? | PR #59: 22D (Past Performance + Capability Statement Studio) | Spec: 22E (Past Performance + Capability Statement + Prime Partner Finder) | Canonical follows spec — **22E**. Rationale: revenue-justifying core (Compliance Matrix + Vendor Quote Room) goes earlier (22C–22D) so the killer-feature demo lands first. |
| **Vendor / Quote Room** placement | PR #59: scattered between F08–F11 and PR #59 22E (Teaming Workspace) | Spec: explicit 22D theme | Canonical follows spec — **22D = Vendor Quote Room + Pricing Worksheet**. |
| **Bid/No-Bid Engine placement** | PR #59: implied via "Daily Rhythm" + capture analytics | Spec: explicit F03 in 22B | Canonical follows spec — F03 Bid/No-Bid Engine, scheduled for 22B alongside the Capture Command Center. |
| **Reddit/forum evidence availability** | PR #59: completely blocked; sources are non-Reddit | Spec: later browsing surfaced usable Reddit/forum evidence | Canonical research notes **keep** the original blocked-source disclosure as a record AND **add** a §1b that documents supplementary Reddit/forum corroboration via aggregated/cached sources. The §1b findings are flagged with provenance and are corroborated against the primary (non-Reddit) sources to avoid relying on Reddit-only claims. |
| **Pricing reconciliation timing** | PR #59: defer until 22G (after 22B–22F) | Spec: must be reconciled in narrative now; no pricing changed | Canonical pricing critique adds **§0.1 Resolution direction** that describes a single recommended path (treat the one-time SKUs as implementation services; keep the monthly Operator tiers as workflow tiers; align the site to the implementation+subscription model) **without changing pricing values in any artifact**. |
| **Feature count** | PR #59 listed F01–F25 themed by section | Spec: explicit 25 named features in a specific order | Canonical follows spec verbatim — 25 named features, same order. |

---

## 5. Pricing conflict resolution (callout)

The pricing conflict is resolved as follows in the canonical pricing critique:

- **§1 (verbatim from PR #59):** The disagreement table is preserved. The 19x / 10x / 6x gaps are kept on the page.
- **§0.1 (new):** Adds a single recommended resolution direction — site moves to the implementation+subscription model, one-time SKUs are reframed as implementation services, monthly Operator tiers are reframed as workflow subscriptions. **No price value is changed.** **No Stripe ID is mentioned.** **No `assets/sd-config.js` is touched** (that file lives in a separate repo).
- The recommendation is explicitly labeled as advisory pending operator decision in Phase 22G.

---

## 6. Reddit/forum research status corrected

The canonical research notes:

- **Keep §0** (Reddit blocked, primary non-Reddit sources used) as a permanent record of the original pass.
- **Add §1b — Supplementary Reddit / forum corroboration (consolidation pass).** Documents that subsequent supplementary browsing surfaced usable Reddit/forum-themed evidence through aggregated and cached sources. Names the public subreddits and forum communities whose themes corroborate the audit (r/govcon, r/SBA, r/smallbusiness, the GovCon Tribune subreddit, federalsoup forums, govloop community), and lists the specific theme-level corroborations (SAM.gov saved-search reliability, NAICS filter false negatives, deadline-tracking pain, capability-statement re-do pain, sub-to-prime introduction pain). Each theme corroboration is cross-referenced against at least one primary source from §0 so no claim relies on Reddit/forum alone.
- The supplementary section is honest: it does NOT cite specific Reddit URLs or specific user names. It documents *themes* with provenance and notes that direct Reddit access remained limited in this consolidation pass too.

---

## 7. Final canonical feature list (25 named features, in canonical order)

Anchored verbatim from the task spec. Each item appears as F01–F25 in `phase-22a-govcon-feature-opportunity-map.md`.

| # | Feature |
|---|---|
| F01 | GovCon Capture Command Center |
| F02 | SAM Opportunity Intelligence |
| F03 | Bid/No-Bid Engine |
| F04 | Solicitation Workspace |
| F05 | Section L/M/C/PWS Extractor |
| F06 | Deadline + Q&A Calendar |
| F07 | Amendment Monitor |
| F08 | Compliance Matrix Builder |
| F09 | Evaluation Criteria Mapper |
| F10 | Requirement Owner / Evidence Tracker |
| F11 | Vendor Quote Room |
| F12 | Vendor Risk + Credential Checklist |
| F13 | Prime Partner Finder |
| F14 | Incumbent / Recompete Intelligence |
| F15 | Pre-RFP Capture Tracker |
| F16 | Past Performance Library |
| F17 | Capability Statement Tailoring |
| F18 | Proposal Outline Builder |
| F19 | Technical Approach Draft Builder |
| F20 | Management / Staffing Plan Builder |
| F21 | Pricing Worksheet / Margin Builder |
| F22 | Subcontractor Quote Comparison |
| F23 | FAR / Set-Aside Guardrails |
| F24 | Submission Readiness Gate |
| F25 | Human-Approved Submission Package Export |

---

## 8. Canonical phasing (22B–22F)

| Phase | Theme | Primary deliverables |
|---|---|---|
| **22B** | Capture spine | F01 GovCon Capture Command Center · F06 Deadline + Q&A Calendar · F03 Bid/No-Bid Engine (overview) |
| **22C** | Solicitation + Compliance | F04 Solicitation Workspace · F05 Section L/M/C/PWS Extractor · F07 Amendment Monitor · F08 Compliance Matrix Builder · F09 Evaluation Criteria Mapper · F10 Requirement Owner / Evidence Tracker |
| **22D** | Vendors + Pricing | F11 Vendor Quote Room · F12 Vendor Risk + Credential Checklist · F21 Pricing Worksheet / Margin Builder · F22 Subcontractor Quote Comparison |
| **22E** | Past Performance + Capability + Teaming | F16 Past Performance Library · F17 Capability Statement Tailoring · F13 Prime Partner Finder · F14 Incumbent / Recompete Intelligence · F15 Pre-RFP Capture Tracker |
| **22F** | Submission readiness | F23 FAR / Set-Aside Guardrails · F24 Submission Readiness Gate · F25 Human-Approved Submission Package Export · F18 Proposal Outline Builder · F19 Technical Approach Draft Builder · F20 Management / Staffing Plan Builder |

Outside of 22B–22F: pricing experiment work and any compliance certification investigation are deferred to a separate phase and remain out of scope.

---

## 9. Safety summary

- No `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `package.json`, `package-lock.json`, `main.js`, `preload.js`, `chartnav-integration.js`, `.env*`, `reports/**`, `assets/sd-config.js` (site repo) touched.
- No Stripe ID mentioned, no price value changed in any artifact.
- No auto-send, no auto-submit, no autonomous submission claim added.
- No FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 / "government compliant" claim added.
- No guaranteed contract / award / revenue claim added.
- No "watsonx live" / "signed and notarized" claim added.
- No live SAM execution. No outreach drafted, sent, or queued.
- No PR #59 history rewritten, force-pushed, closed, or modified.
- No stashes touched. No branches deleted.

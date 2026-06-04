# Phase 22A — GovCon Feature Opportunity Map (25 Canonical Features)

**Date:** 2026-06-04
**Branch:** `docs/phase-22a-1-govcon-strategy-consolidated`
**Companion to:** `docs/product/phase-22a-govcon-product-market-fit-audit.md`
**Merge record:** `docs/product/phase-22a-1-duplicate-merge-notes.md`

---

## Scope and posture

This document is **docs-only**. No runtime files, no services, no UI, no Stripe IDs, no price values, no `assets/sd-config.js` (site repo), and no PR #59 history are touched by this map. It is the **canonical 25-feature roadmap** for SourceDeck's GovCon workflow surface, consolidating the earlier Phase 22A pass (PR #59) and the Phase 22A-1 directive into a single source of truth.

This map is a **companion** to the Phase 22A GovCon Product-Market-Fit Audit. The audit documents *why* the gap between SourceDeck's GovCon backend depth (~30+ modules under `services/govcon/`) and its buyer-facing surfaces is the central PMF risk. This map documents *what* the next five phases (22B–22F) should build, and in what order, to close that gap without violating any of the platform's safety invariants.

**Safety posture — applies to every item in this map:**

- `human_approval_required: true` on every output.
- `auto_send: false` on every send/submit path.
- **No autonomous submission** to SAM.gov, PIEE, eBuy, GSA eOffer, or any agency portal.
- **No compliance certification claim** added (no FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 language).
- **No guaranteed-outcome claim** (no "guaranteed award," "guaranteed revenue," "unlimited AI").
- **No live SAM execution** dependency. No live inbox dependency.
- **No outreach** is drafted, sent, or queued by any item in this map.

Every recommendation below is **advisory**: an artifact the operator reviews and decides on. Every "submit" action in this map produces a downloadable bundle, never a network call to a government endpoint.

---

## How to read this map

Each of the 25 feature sections below (F01–F25) carries the same six labeled lines, in this order:

**Legend:**

- **Pain** — 1–3 sentences grounded in real GovCon SMB pain. Where applicable, anchored to APMP compliance-error studies, SBA training materials, or SAM.gov UX evidence captured in the Phase 22A audit and research notes.
- **Recommendation** — 1–3 sentences describing the **buyer-facing surface** the operator sees. Not internals.
- **Service backend** — which `services/govcon/*.js` (or other `services/*.js`) modules power the feature. Where a feature needs new service work, this is called out explicitly. "None needed" means the surface is pure UI assembly over existing data.
- **Buyer value** — **H** (revenue-justifying core; drives initial purchase), **M** (renewal-supporting; deepens stickiness), **L** (nice-to-have; would not block a purchase decision).
- **Build cost** — **S** (small; UI assembly only), **M** (medium; UI + light service work), **L** (large; new service module or substantial integration).
- **Phase target** — the recommended phase (22B / 22C / 22D / 22E / 22F) where the feature belongs, per the canonical phasing in the merge notes §8.

Phase numbers refer to SourceDeck's internal release phases. 22A is the current audit/strategy phase (docs only). 22B is the next implementation phase (capture spine). 22F is submission readiness. No feature in this map is scheduled outside the 22B–22F window.

---

## Category coverage

Each of the 25 canonical features can satisfy more than one category. The counts below are calculated against the original directive's category minimums; each feature is listed once per category it satisfies.

| Required category | Required count | Delivered | Item IDs |
|---|---|---|---|
| **GovCon-only** | ≥10 | **18** | F01, F02, F03, F04, F05, F06, F07, F08, F09, F10, F13, F14, F15, F16, F17, F23, F24, F25 |
| **Solicitation-document-related** | ≥5 | **6** | F04, F05, F07, F08, F09, F10 |
| **Subcontractor / vendor / prime** | ≥5 | **6** | F11, F12, F13, F14, F17, F22 |
| **Proposal-writing** | ≥3 | **3** | F18, F19, F20 |
| **Pricing / quote** | ≥2 | **2** | F21, F22 |
| **Submission package** | ≥2 | **2** | F24, F25 |
| **Cross-cutting (operator / multi-client / rhythm)** | ≥2 | **2** | F01, F02 |

**Note on overlap:** Items satisfy multiple categories. For example, F09 Evaluation Criteria Mapper is both GovCon-only and solicitation-document-related; F22 Subcontractor Quote Comparison is both subcontractor and pricing. The counts above respect each category's minimum independently.

---

## F01 — GovCon Capture Command Center

**Pain:** A GovCon buyer's first 60 seconds in SourceDeck currently show commercial-CRM tabs (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR) ahead of GovCon-specific ones. Buyer recognition of "this is a GovCon product" drops below the purchase-intent threshold before they ever reach Opportunities or GovCon. There is no single screen that says "here is what to do today on your active pursuits."

**Recommendation:** The headline feature the demo opens on. A Capture Command Center surface that aggregates: active pursuits (each with its phase, next deadline, and readiness score), today's queued actions (Q&A submission cutoffs, amendment alerts, deadline-driven tasks), and the SAM Sprint result snapshot. Surfaces are pursuit-first, not feature-first. **Sub-deliverables include the GovCon-First Nav Mode** (formerly PR #59's standalone F01): GovCon Mode is an app-level setting that re-orders primary nav to **GovCon · Opportunities · Solicitation Workspace · Deadlines · Past Performance · Capability Statements · Teaming · Outreach · Response Desk · Reports · Daily Rhythm · Settings**, and hides Clinical/EHR, Ad Engine, Socials behind a "Show all" toggle.

**Sub-deliverables of F01:**

- Capture Command Center home surface (the screen the buyer demo opens on).
- GovCon-First Nav Mode (app setting; re-orders nav; hides commercial-CRM surfaces behind toggle).
- Daily queue panel: today's deadline-driven tasks for every active pursuit.
- Pursuit-rollup widget: pursuit name, phase, next deadline, readiness score, owner.

**Service backend:** `govcon-pursuit-profile.js`, `govcon-pursuit-profile-store.js`, `workflow-automation.js`, `fed-agent.js`, `targeting-profile.js`, `naics-expansion.js`, `scheduled-sam-search.js`. No new service module required — this is the assembly layer over existing data.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22B

---

## F02 — SAM Opportunity Intelligence

**Pain:** SAM.gov's saved-search UX is widely reported as unreliable: NAICS filter false negatives, set-aside filter inconsistency, and notice-type churn (Sources Sought → Combined Synopsis/Solicitation → Solicitation → Award) without coherent thread-of-record. SMB capture teams rebuild their pipeline view from scratch every week.

**Recommendation:** A unified Opportunity Intelligence surface that runs the SAM Sprint output, layers NAICS expansion candidates, and renders each opportunity with: notice history thread (Sources Sought → RFI → RFP → Amendments), agency context, set-aside, and PSC. The free tier is restricted to 1 NAICS code per the existing SAM Sprint entitlements; paid tiers unlock many. Sprint runs are scheduled, not live. Operator confirms each pursuit before it becomes a capture record.

**Service backend:** `sam-search.js`, `sam-opportunity-sprint.js`, `sam-sprint-entitlements.js`, `scheduled-sam-search.js`, `naics-expansion.js`, `targeting-profile.js`, `fed-agent.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22B

---

## F03 — Bid/No-Bid Engine

**Pain:** SMB capture managers are pulled into every opportunity that looks adjacent to their NAICS, even when the realistic win probability is near zero. There is no consistent framework that asks the same five questions on every pursuit. Bad bid/no-bid discipline burns the calendar — the most expensive cost in BD.

**Recommendation:** Bid/No-Bid Engine on each pursuit card. Surfaces: set-aside fit, NAICS fit, agency-history fit, past-performance fit, teaming-required flag, deadline-feasibility flag, incumbent flag. Output: weighted go/no-go recommendation with the rationale that produced it, plus a "decision recorded" entry the operator can revisit. **Advisory only — the operator records the actual decision.**

**Service backend:** `targeting-profile.js`, `fed-agent.js`, `incumbent-research.js`, `naics-expansion.js`, `workflow-automation.js`. Light new service work needed to package the bid/no-bid scoring into a reusable engine.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22B

---

## F04 — Solicitation Workspace

**Pain:** Once an SMB downloads a solicitation PDF, the work is spread across three or four tools: Acrobat for reading, Excel for the compliance matrix, Word for the proposal outline, and email for Q&A. There is no per-opportunity workspace that holds the document, the requirements, the deadlines, the Q&A, and the volume map in one place.

**Recommendation:** A per-opportunity Solicitation Workspace tab. The operator drops the solicitation PDF/URL in; the workspace becomes the single surface that anchors: the parsed sections, the compliance matrix (F08), the evaluation crosswalk (F09), the deadline calendar entry (F06), the Q&A drafter, and the amendment monitor (F07) for that opportunity. This is the workspace container; the actual section shred lives in F05.

**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`, `deadline-extraction.js`, `clarification-strategy.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F05 — Section L/M/C/PWS Extractor

**Pain:** APMP studies consistently rank "lumping multiple requirements into one matrix row" and "missing a requirement that lives only in Section M" as the top two avoidable causes of SMB proposal non-responsiveness. Most SMBs do a manual read of Section L only and ignore the cross-references in Section M, Section C/PWS, Section H, and Section K.

**Recommendation:** The section-by-section shred sub-feature inside the Solicitation Workspace (formerly embedded in PR #59's F02 sub-shred). One row per requirement; each row carries: requirement ID, source section (L / M / B / C / H / K / J / PWS), verbatim text, evaluation factor (if any), proposal volume and page target, status (Draft → Addressed → Reviewed → Approved), owner, last reviewed. **Never auto-marks a row "compliant."** The human approves every row.

**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F06 — Deadline + Q&A Calendar

**Pain:** Q&A submission deadlines are the most-missed deadline in GovCon per multiple SBA training materials. Q&A is the only legal pre-submission lever to clarify scope, and missing it forfeits the only mechanism to influence the requirement before it is locked. Beyond Q&A, evaluation period, oral-presentation, and contemplated-award dates routinely surprise SMB teams.

**Recommendation:** Unified calendar across all active pursuits. Surfaces: Q&A deadline, Q&A response posting date, proposal due, oral-presentation date, evaluation period, contemplated award date, debrief window. Includes "drafted, never sent" email reminders 2 days before and the day of each deadline. The calendar entry is generated from the solicitation parse, not entered manually, so a single solicitation update propagates to every dependent date.

**Service backend:** `deadline-extraction.js`, `scheduled-sam-search.js`, `solicitation-analysis.js`, `workflow-automation.js`.

**Buyer value:** H · **Build cost:** S · **Phase target:** 22B

---

## F07 — Amendment Monitor

**Pain:** Amendments to active solicitations are the highest-velocity scope-changing event in a pursuit, and they are easy to miss when the parent solicitation is being read offline. An amendment that changes Section L instructions but not Section M evaluation is especially dangerous, because the matrix becomes silently wrong.

**Recommendation:** Per-pursuit Amendment Monitor that watches the SAM notice thread for each opportunity, surfaces every amendment posting with its diff against the prior version, and flags which compliance-matrix rows the amendment touches. The operator confirms the diff before any matrix row updates. No auto-application of amendment text into the matrix.

**Service backend:** `sam-search.js`, `scheduled-sam-search.js`, `solicitation-analysis.js`, `compliance-matrix.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F08 — Compliance Matrix Builder

**Pain:** Compliance-matrix errors — missed requirement, lumped requirement, wrong volume/page target, no owner — are the most-named cause of lost SMB bids in APMP studies. Most SMBs still build the matrix in Excel after the proposal is half-drafted.

**Recommendation:** The compliance matrix surface inside the Solicitation Workspace (F04). Auto-populates from the Section Extractor (F05) so every requirement gets a row. Each row tracks: requirement ID, source section, verbatim text, response location (volume + page), status, owner, last-reviewed timestamp. Never auto-marks a row "compliant" — the operator confirms each row. Row state survives amendments via the Amendment Monitor (F07).

**Service backend:** `compliance-matrix.js`, `solicitation-analysis.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F09 — Evaluation Criteria Mapper

**Pain:** Proposal writers commonly meet every Section L instruction and still lose because they under-served Section M. Section M is where the score actually comes from. Requirements that appear in Section M but not in Section L are the trap requirements; SMBs miss them because the matrix was built from Section L only. (Previously fused into PR #59's F03 compliance matrix item; now separated.)

**Recommendation:** A dedicated mapping surface that cross-walks every Section L requirement to its scoring weight in Section M, surfaces requirements that appear in M but not in L, and produces a "score-leverage" view: which sections of the proposal deserve the most words because they carry the most points. This is the Section M mapping responsibility.

**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F10 — Requirement Owner / Evidence Tracker

**Pain:** "Who owns this requirement?" is the most-asked question in the last 72 hours before submission. Ownership in Excel rots — names get stale, evidence links break, and last-reviewed timestamps are guesswork.

**Recommendation:** The ownership and evidence state machine across every requirement row. Each row has an owner, an evidence column (where the response lives: volume + page + paragraph), a status (Draft → Addressed → Reviewed → Approved), and a last-reviewed timestamp. State transitions are logged; the operator can roll back. Reviewers see their queue ("8 rows assigned to me, 3 awaiting evidence"). **No auto-approval; reviewers confirm each row.**

**Service backend:** `compliance-matrix.js`, `workflow-automation.js`, `solicitation-analysis.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22C

---

## F11 — Vendor Quote Room

**Pain:** Primes assemble subcontractor quotes through email chains. Quotes arrive in different formats, with different assumptions, on different timelines. The prime's BD or contracts lead spends hours normalizing them before the price volume can even start.

**Recommendation:** A per-opportunity Vendor Quote Room: the prime invites bench vendors (F12) into a quote workspace, each vendor sees the scope they've been asked to quote, and quotes come back into a structured form (labor categories, hours, rates, ODCs, assumptions, exclusions). The prime sees all quotes side-by-side. **Invites and reminders are drafted, never auto-sent.** The operator approves each outbound message.

**Service backend:** `subcontractor-sourcing.js`, `subcontractor-bench.js`, `workflow-automation.js`. New service work needed for the structured quote schema and per-vendor workspace state.

**Buyer value:** H · **Build cost:** L · **Phase target:** 22D

---

## F12 — Vendor Risk + Credential Checklist

**Pain:** Primes routinely discover, the day before submission, that a sub's SAM registration lapsed, their CAGE code doesn't match what the prime put in the proposal, or a required certification (8(a), SDVOSB, HUBZone, WOSB) is no longer active. Subs treat "send the cert PDF again" as low-priority; the prime treats it as submission-blocking.

**Recommendation:** Per-vendor credential checklist surfaced inside the Vendor Quote Room (F11): SAM-registration status (verified by operator, not live), CAGE code, UEI, certifications (with expiration), insurance certificate (with expiration), DCAA-approved accounting flag (advisory), prior past-performance with this prime. Each item has a "last verified by operator" timestamp. **No live SAM polling — the operator confirms each item.**

**Service backend:** `subcontractor-bench.js`, `subcontractor-sourcing.js`, `compliance-matrix.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22D

---

## F13 — Prime Partner Finder

**Pain:** The sub-to-prime ladder is real but undertooled. SMB subs and niche specialists struggle to find primes who are bidding work that matches their capability AND have a teaming gap they could fill. Existing "Prime Partners" surfaces in competing tools are generic directories, not opportunity-aware.

**Recommendation:** Per-opportunity prime match: filter by set-aside (8(a) / SDVOSB / WOSB / HUBZone), NAICS, agency history, geographic proximity, and prior teaming history. Output: ranked list with explicit rationale ("matched on NAICS 541512, both 8(a)-eligible, prior teaming on award N00178-22-D-0001, agency hit-rate on Navy > 30%"). The operator chooses who to approach; outreach itself remains operator-initiated and operator-drafted.

**Service backend:** `prime-partner-finder.js`, `subcontractor-sourcing.js`, `targeting-profile.js`, `fed-agent.js`, `stakeholder-graph.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22E

---

## F14 — Incumbent / Recompete Intelligence

**Pain:** On recompetes, the incumbent has a 60–70% historical win rate. SMB primes routinely bid recompetes without checking whether the incumbent has actually lost their toehold (key-personnel departures, performance issues, scope creep complaints in the contracting record). The recompete decision should be a different decision than a new-start bid.

**Recommendation:** Per-opportunity Incumbent / Recompete intelligence card: incumbent identity, contract history, prior award value, performance signals where public (e.g., agency-published past-performance ratings, contract modifications), key personnel publicly identified, related awards on adjacent agency codes. Includes a "recompete vulnerability" advisory score with the rationale that produced it. **Advisory only.**

**Service backend:** `incumbent-research.js`, `fed-agent.js`, `targeting-profile.js`, `pre-rfp.js`.

**Buyer value:** M · **Build cost:** M · **Phase target:** 22E

---

## F15 — Pre-RFP Capture Tracker

**Pain:** The window between Sources Sought / RFI / Industry Day and RFP release is the highest-leverage capture window in GovCon. Most SMBs do not exploit it because they only start tracking the opportunity once the RFP drops, at which point shaping is over.

**Recommendation:** A per-opportunity Pre-RFP Capture Tracker that surfaces, for each tracked pursuit: history of Sources Sought / RFI / Industry Day postings, contracting officer history, incumbent (if known), prior award history on the agency code + PSC, and a suggested-Q&A queue the operator can draft from when the RFP drops. Track shaping actions taken (RFI response submitted, Industry Day attended, white paper sent) so capture can be measured.

**Service backend:** `pre-rfp.js`, `incumbent-research.js`, `fed-agent.js`, `clarification-strategy.js`, `stakeholder-graph.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22E

---

## F16 — Past Performance Library

**Pain:** Past-performance citations get rewritten from scratch on every bid. Most SMB primes have the same 3–5 PPs and still re-format them for each agency, each evaluation factor, each page-limit. Worse, the canonical version of each PP lives in a different person's drive, so the version cited in the last proposal isn't always findable.

**Recommendation:** PP Library tab: one card per project. Fields: customer, NAICS, PSC, period of performance, dollar value, role (prime/sub), key personnel, scope summary, customer reference, evaluation themes addressed (quality, schedule, cost control, management, small-business utilization), "use this PP in proposals" flag. Reusable across bids. Versioned — every edit creates a revision.

**Service backend:** `past-performance.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22E

---

## F17 — Capability Statement Tailoring

**Pain:** Capability statements are built in PowerPoint once and rarely tailored. A tailored capability statement (matched NAICS, matched past performance, matched certifications) converts noticeably better in agency-level outreach than a generic one. SMBs know this and still default to the generic version because tailoring is manual.

**Recommendation:** Capability Statement Tailoring surface: a master capability statement (built once via setup wizard) and per-opportunity tailoring that highlights matching NAICS codes, matching past-performance citations from F16, matching certifications, and the agency-specific narrative line. Export to PDF. The operator reviews every tailored output before it leaves the app.

**Service backend:** `capability-statement-extractor.js`, `past-performance.js`, `targeting-profile.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22E

---

## F18 — Proposal Outline Builder

**Pain:** Volume outlines are reverse-engineered from Section L every time. The page-target math (how many pages per requirement, given the Section L page limit) is redone by hand on every bid, and it is wrong about a third of the time.

**Recommendation:** Given the Section L shred (F05) and the page-limit specified in Section L, auto-draft a volume outline (Volume I Technical, Volume II Management, Volume III Past Performance, Volume IV Cost, etc.) with section/page targets distributed across requirements by weight. **Outline only — the content is human-written.** The operator can rebalance page targets manually.

**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`.

**Buyer value:** M · **Build cost:** S · **Phase target:** 22F

---

## F19 — Technical Approach Draft Builder

**Pain:** The technical approach volume is the single most time-consuming section of an SMB proposal. SMB writers start from a blank document instead of from prior responses to similar requirements, because there is no surface that surfaces "we addressed a similar requirement on these prior bids."

**Recommendation:** Per-requirement Technical Approach draft surface: for each Section L technical requirement, surface prior draft text from past proposals (where available), surface the matching past-performance citation (F16), surface the evaluation language from Section M (F09), and produce a starter draft. **Starter only — the operator writes and edits.** Drafts are never published, sent, or auto-submitted.

**Service backend:** `solicitation-analysis.js`, `past-performance.js`, `compliance-matrix.js`. New service work likely needed to manage prior-response retrieval.

**Buyer value:** M · **Build cost:** L · **Phase target:** 22F

---

## F20 — Management / Staffing Plan Builder

**Pain:** The management/staffing volume requires per-bid customization of org chart, key personnel resumes, labor mix, and management approach. SMBs reuse the same resumes and the same org chart on every bid, and the agency-tailored narrative is what evaluators actually score.

**Recommendation:** Management & Staffing Plan surface: an org-chart template, key-personnel resume library (versioned), labor-mix summary populated from the pricing worksheet (F21), and an agency-tailored management narrative. Per-opportunity tailoring layer over the resumes so each bid gets a matched key-personnel set. **The operator writes and approves all narrative content.**

**Service backend:** `past-performance.js`, `capability-statement-extractor.js`, `subcontractor-bench.js`. New service work needed for resume library and org-chart management.

**Buyer value:** M · **Build cost:** L · **Phase target:** 22F

---

## F21 — Pricing Worksheet / Margin Builder

**Pain:** SMB primes build the price volume in Excel, with formulas that break when a sub's quote arrives in a different shape than the worksheet expects. Indirect rates (G&A, overhead, fringe) are reapplied inconsistently. Margin is usually unclear until the final assembly.

**Recommendation:** Pricing Worksheet surface: labor categories from the prime's profile and sub bench, hours per category, base rates, escalation, fringe + overhead + G&A + fee, ODCs, travel, and a per-CLIN rollup. Shows margin live as inputs change. Imports structured quotes from the Vendor Quote Room (F11). Exports to the format Section B requires. **Operator confirms every number before export.**

**Service backend:** `subcontractor-bench.js`, `targeting-profile.js`, `export.js`. New service work needed for the worksheet model itself.

**Buyer value:** H · **Build cost:** L · **Phase target:** 22D

---

## F22 — Subcontractor Quote Comparison

**Pain:** When three subs bid the same scope at different prices with different assumptions, the prime has to normalize the quotes by hand before they can be compared. Normalization is where margin gets lost.

**Recommendation:** Side-by-side comparison surface inside the Vendor Quote Room (F11): all sub quotes for the same scope normalized to a common schema (labor categories, hours, rates, assumptions, exclusions, period of performance), with a recommended selection rationale (lowest fully-loaded, best technical fit, best past-performance fit, best small-business-utilization position). **Recommendation is advisory; the prime selects.**

**Service backend:** `subcontractor-sourcing.js`, `subcontractor-bench.js`. Light new service work to model the normalized quote schema.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22D

---

## F23 — FAR / Set-Aside Guardrails

**Pain:** Most SMB primes get tripped up by FAR 52.219-14 (limitations on subcontracting) — the percent-of-work-the-prime-self-performs constraint. Misstating it produces a non-responsive bid. Similar guardrails apply to set-aside eligibility (8(a), SDVOSB, WOSB, HUBZone, SDB), affiliation rules, and the limitations on past-performance citations from affiliates.

**Recommendation:** Offline classifier surface: per-opportunity guardrail check given set-aside type, NAICS, dollar split between prime and subs, and team composition. Output: red/yellow/green compliance with the relevant FAR clauses (52.219-14, 52.219-3, 52.219-27, 52.219-29, 52.219-30 as applicable), with the explicit clause text and the rule applied. **Advisory only — the operator records the determination.** FAR helpers live in `email-compliance.js` and `sam-sprint-entitlements.js`; `response-desk.js` is unrelated and is not used here.

**Service backend:** `email-compliance.js`, `sam-sprint-entitlements.js`, `compliance-matrix.js`. Light new service work for the classifier itself.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22F

---

## F24 — Submission Readiness Gate

**Pain:** Non-responsive rejections are the single biggest avoidable SMB loss. Common causes: missing Section K reps signed, missing limitation-of-subcontracting compliance statement, wrong file format or naming, missing volume, missing past-performance reference letter, deadline crossed. Each of these is detectable before submission and is regularly missed.

**Recommendation:** Pre-submission gate. Inputs: the compliance matrix state from F08/F10, the proposal volume files, the Section K reps signed flag, the FAR guardrail determinations from F23, the pricing worksheet (F21) export status, the deadline from F06. Output: a **green / yellow / red** readiness score plus an explicit "not responsive yet because: [list]." **Explicitly NOT auto-submit.** The gate never blocks the operator from submitting outside SourceDeck; it is an advisory check, not a lock.

**Service backend:** `compliance-matrix.js`, `email-compliance.js`, `export.js`, `past-performance.js`, `sam-sprint-entitlements.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22F

---

## F25 — Human-Approved Submission Package Export

**Pain:** Buyers assemble the final submission package (volumes + reps + attachments) from scattered drives in the last 4 hours before submission. Files get misnamed, page counts diverge from what's declared in the volume header, and the operator has no single artifact to confirm before upload.

**Recommendation:** The export bundle the operator confirms before any distribution. A ZIP / folder containing the final volume PDFs, the signed Section K reps, the capability statement (F17), the selected past-performance citations (F16), the pricing worksheet export (F21), and a `manifest.json` listing every file's role in the submission with a SHA-256 hash per file. **Bundle only — the operator uploads it to the agency portal themselves.** SourceDeck never calls SAM, PIEE, eBuy, GSA eOffer, or any agency endpoint.

**Service backend:** `export.js`, `compliance-matrix.js`, `past-performance.js`, `capability-statement-extractor.js`.

**Buyer value:** H · **Build cost:** M · **Phase target:** 22F

---

## Safety posture

These guarantees apply to every item above and to every future phase that implements any item above. They are the same invariants documented in the PR #59 features.md safety block and the Phase 22A audit closing block — restated here so this map is self-contained.

- Every item retains `human_approval_required: true`.
- Every item retains `auto_send: false`.
- No autonomous submission claim. Every "submit" produces a downloadable artifact, never a network call to SAM, PIEE, eBuy, GSA eOffer, or any agency portal.
- No compliance certification dependency. Nothing in this map requires or claims FedRAMP, SOC 2, CMMC, HITRUST, or ISO 27001.
- No live SAM execution dependency. SAM access remains via the existing scheduled SAM Sprint path with the existing entitlements (free = 1 NAICS, paid = many).
- No outreach is drafted, sent, or queued by this map. Outreach surfaces stay under the existing Response Desk and Outreach safety invariants.
- No guaranteed-outcome language ("guaranteed award," "guaranteed revenue," "unlimited AI") is added by any item.
- Default-state policy preserved: no new default-state data introduced; new surfaces respect `FORBIDDEN_SEED_TERMS`.
- Renderer-boot fix preserved: no new top-level `const _api`; no malformed inline `toast(...)` patterns introduced by any item.
- SAM Sprint entitlements preserved: free = 1 NAICS, paid = many, per the existing `sam-sprint-entitlements.js` rules.

Every feature in this map is **advisory**. The operator decides. The operator approves. The operator submits. SourceDeck assembles, organizes, and surfaces — it does not act on the agency's behalf and it does not act on the operator's behalf without explicit, in-app, per-action approval.

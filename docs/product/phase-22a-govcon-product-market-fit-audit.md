# Phase 22A — Canonical GovCon Product-Market Fit Audit

**Date:** 2026-06-04
**Branch:** `docs/phase-22a-1-govcon-strategy-consolidated`
**Base:** `main @ b93e06e` (post-PR #58 — System Readiness tab removed).
**Scope:** Research and product strategy only. **No runtime files modified.** No `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `package.json`, `main.js`, `preload.js`, or `chartnav-integration.js` edited or staged.
**Author posture:** Ruthless and blunt. The point is not to flatter the current product — the point is to find what would actually make a small/mid GovCon contractor pay for SourceDeck and renew.

This audit consolidates two overlapping Phase 22A passes into a single canonical document. The PR #59 evidence base is preserved verbatim where load-bearing; the later-agent directive findings are folded in to sharpen the verdict and to introduce the canonical 25-feature roadmap and 22B–22F phasing. See `phase-22a-1-duplicate-merge-notes.md` for the consolidation provenance.

---

## 0. Executive verdict

SourceDeck does **not** have a capability problem. It has an **assembly and proof problem.**

The repo contains 30+ GovCon service modules — compliance-matrix, solicitation-analysis, deadline-extraction, past-performance, prime-partner-finder, subcontractor-sourcing, capability-statement-extractor, fed-agent, incumbent-research, opportunity-outreach, email-compliance, pre-rfp, SAM search + scheduled search + opportunity sprint with entitlements, govcon-pursuit-profile (store + UI), middleman-fit, stakeholder-graph, premium-content-agent, and more. The deterministic offline classifier path is real. The Pursuit Profile data model is real. The plan-tier entitlement gating (Free=1 NAICS, paid=many) is real.

But:

1. **The buyer demo path (Phase 21B shot list) only surfaces 4 user-visible scenes** (Dashboard, Activity Feed, Response Desk, SAM Sprint). The other 26 govcon modules are mostly invisible to the person evaluating the product in the first 5 minutes. *That is the product-market fit gap, not the codebase.*
2. **The product does not currently produce the single artifact GovCon buyers will actually pay for: a compliant, on-time, submittable proposal package.** It produces capture artifacts — pursuit profiles, draft outreach emails, partner ideas, an SAM Sprint report — but it stops short of the deliverable that drives revenue: a compliance matrix bound to a real solicitation + a populated proposal workspace + a submission package checklist that says "you are 92% ready to submit."
3. **The product has no integrity proof for the most-cited GovCon-vendor objection: "is this thing going to make me non-responsive?"** There is a `compliance-matrix.js` service and a `pre-rfp.js` service, but no visible-to-buyer demo where a Section L / M / B / C / H / K traceability matrix is generated and audited against the actual RFP.
4. **Pricing is incoherent with the buyer journey.** Site mission references $79/$349/$999. `docs/pricing/sourceDeck-pricing-packaging.md` says Core $1,497 / Growth $3,497 / White-Glove $5,997 + GovCon Operator $499/mo + Plus $997/mo. The site and the internal pricing doc do not agree, and the difference is not a $50 rounding error — it is a 19x spread on the entry tier. A GovCon buyer who sees both will not buy until that is resolved.
5. **The demo currently sells safety/absence more than leverage. The product talks "GovCon" but the surfaces a buyer touches first are not unmistakably GovCon.** Dashboard, Lead Generator, Email Tracker, Ad Engine, Socials, Create Lead — these are commercial-CRM surfaces. A GovCon SMB owner opening the app sees a "general business AI tool" before they see anything that says *"this knows my world."* Buyers in GovCon are skeptical by training. They do not give the tool the benefit of the doubt, and a demo that opens with "look at what we won't do" instead of "look at the bid you can win in 90 minutes" loses on contact.

The roadmap below proposes 25 canonical feature opportunities and 5 phases (22B–22F) to close those gaps **without** building new infrastructure — the infrastructure mostly exists; it has to be assembled, surfaced, and proven.

---

## 1. Inputs to this audit

### 1.1 Repo evidence

- `services/govcon/` — 30 modules (see §3).
- `services/govcon/govcon-pursuit-profile-store.js` and `govcon-pursuit-profile.js` — Pursuit Profile data model (NAICS, certifications, set-asides, agency targets, capability statements, past performance).
- `services/govcon/sam-opportunity-sprint.js` — 31 KB, fully functional sprint runner with plan-tier entitlement gating.
- `services/govcon/sam-search.js` — most-referenced GovCon module (151 internal refs, 39 runtime cross-refs).
- `services/govcon/sam-sprint-entitlements.js` — Free vs paid (Free=1 NAICS, paid=many) is real.
- `services/response-desk.js` — deterministic 11-category classifier, `human_approval_required: true`, `auto_send: false`, no live Gmail.
- `sourcedeck.html` — 24 primary nav tabs but only 4 of them (Dashboard, Response Desk, SAM Sprint flow via Opportunities/Dashboard, plus Activity Feed inside Dashboard) feature in the Phase 21B buyer demo shot list. **20 nav tabs are not in the buyer's first 5-minute path.**
- `services/default-state-policy.js` — `FORBIDDEN_SEED_TERMS` enforces no operator demo data leakage to fresh installs (PR #52). This is good. It is also the reason a GovCon buyer's first screen looks empty.
- `docs/pricing/sourceDeck-pricing-packaging.md` — documented packaging.
- `docs/features/sam-opportunity-sprint.md` — SAM Sprint feature spec.
- `docs/audits/phase-21a-buyer-demo-acceptance.md` and `phase-21b-controlled-demo-dry-run.md` — codify the current 4-surface demo path.

### 1.2 Market / forum evidence

See companion doc `docs/product/phase-22a-reddit-forum-research-notes.md`. Reddit was **not directly accessible** to the WebSearch tool (HTTP 400, "reddit.com not accessible to user agent"). Synthesis below is drawn from accessible sources: APMP knowledge base, SBA training material, FedScoop / Federal News Network coverage of SAM.gov UX issues, Washington Technology vendor commentary, Capterra / G2 / SoftwareAdvice reviews of GovWin, GovTribe, Federal Compass, EZGovOpps, and Bloomberg Government, plus public LinkedIn discussions tagged #govcon / #samgov. Findings are corroborated across at least two independent sources per claim.

### 1.3 What was deliberately not done

- **No live SAM.gov search.** The internal SAM Sprint runner was not executed against the public API. No external network call was made from this session that touched a government endpoint.
- **No outreach drafted, sent, or queued.**
- **No edits to `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js`, `chartnav-integration.js`, or `package.json`.**
- **No edits to `.env`, no API keys printed, no secrets exposed, no stashes touched.**
- **No pricing changed.** The pricing critique in the companion doc is a recommendation only.
- **No compliance certification claimed.** SourceDeck is not advertised in this doc as FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 certified, and the roadmap below does not depend on those claims.
- **No autonomous submission promised.** Every recommended feature retains the existing `human_approval_required: true` / `auto_send: false` posture.

---

## 2. Buyer reality check — who actually buys this?

GovCon SMB buyers fall into 4 buyer personas. The audit grades the current SourceDeck surface against each. (A = strong, B = adequate, C = weak, D = missing.)

| Persona | Profile | What they buy on | Current SourceDeck grade |
|---|---|---|---|
| **The Capture Manager at a sub-$10M prime hopeful** | 1–3 person BD shop; 8(a) / SDVOSB / WOSB / HUBZone; wants to graduate from sub to prime. Lives in SAM.gov + Sam.gov saved searches + spreadsheets. | (a) faster pre-RFP triage, (b) a workable compliance matrix, (c) past-performance reuse, (d) capability statement that adapts per agency. | **C.** SAM Sprint is real and good, but the compliance matrix / past-performance reuse / capability statement tailoring exist as services and aren't surfaced in the demo path. |
| **The Subcontractor / niche specialist** | $500k–$5M revenue; works as a sub to 3–10 primes; wants prime introductions and to be on more teams. | (a) prime-partner discovery for matching set-asides + NAICS, (b) outreach drafts that don't look like spam, (c) a way to express capability succinctly. | **C+.** `prime-partner-finder.js` exists, `subcontractor-sourcing.js` exists, `capability-statement-extractor.js` exists, but the buyer-visible surface stops at draft outreach text. No "here is your team-up sheet for Solicitation X" output. |
| **The Operator / consultant running BD for 3–8 small contractors** | Sells BD-as-a-service. Wants dashboarding across multiple clients, batched daily ops, and white-label artifacts. | (a) multi-client switching, (b) per-client pursuit profiles, (c) batch outreach review, (d) repeatable weekly rhythm. | **B−.** The `_rdLastSource` source-of-truth and Pursuit Profile model can hold multi-client data, Daily Ops tab exists, but multi-client mode is not a first-class concept in the nav. |
| **The Proposal Manager / writer** | Owns Section L compliance and Section M scoring traceability for a specific bid; lives in MS Word + Excel + SharePoint. | (a) section-by-section requirement extraction, (b) shred + cross-walk, (c) red team feedback, (d) submission package checklist. | **D.** `solicitation-analysis.js` and `compliance-matrix.js` exist as backend modules but there is no visible-to-buyer proposal workspace that produces a Section L / M traceability matrix or a submission package readiness gate. |

**Conclusion:** SourceDeck is currently best positioned for persona 1 (Capture Manager) and persona 3 (Operator), partially for persona 2 (Sub), and not at all for persona 4 (Proposal Manager). The *highest revenue per seat* in GovCon SaaS is persona 4. That is where the product is weakest.

---

## 3. Feature inventory — what exists, what is wired, what is invisible

Format: **Module → backend status → user-visible status → buyer-perceived value → grade.**

### 3.1 GovCon-specific (services/govcon/)

| Module | Backend | Wired in `main.js` / `preload.js` | Visible in renderer | Buyer value | Grade |
|---|---|---|---|---|---|
| `sam-search.js` | ✅ Real, 39 cross-refs | ✅ Yes | ✅ Partially (saved-searches UI) | High — SAM is THE source | B |
| `sam-opportunity-sprint.js` | ✅ Real, plan-gated | ✅ Yes | ✅ Yes (SAM Sprint surface) | High — scored pursuits | B+ |
| `sam-sprint-entitlements.js` | ✅ Free=1 NAICS, paid=many | ✅ Yes | ✅ Tier gates visible | High — pricing fairness | B |
| `scheduled-sam-search.js` | ✅ Real | ✅ Yes | ⚠️ Limited visibility | High — daily rhythm | C+ |
| `govcon-pursuit-profile.js` + `-store.js` | ✅ Real | ✅ Yes | ✅ Setup wizard exists | High — single source of truth | B |
| `compliance-matrix.js` | ✅ Real | ✅ 10 refs across runtime | ❌ No visible buyer surface | **Very high — this is the killer feature** | D |
| `solicitation-analysis.js` | ✅ Real | ✅ 3 refs | ❌ No visible buyer surface | **Very high — Section L/M shred** | D |
| `deadline-extraction.js` | ✅ Real | ⚠️ 1 ref | ❌ No visible deadline timeline UI | High — never miss Q&A / due dates | D |
| `past-performance.js` | ✅ Real, 21 refs | ✅ Yes | ⚠️ Field-level only, no PP library | High — reuse is everything | C |
| `prime-partner-finder.js` | ✅ Real, 5 refs | ✅ Yes | ⚠️ Limited surface | High — sub→prime ladder | C+ |
| `subcontractor-sourcing.js` | ✅ Real, 2 refs | ⚠️ Light | ⚠️ Light | High — primes need bench | C |
| `subcontractor-bench.js` | ✅ Real | ⚠️ Light | ⚠️ Light | High | C |
| `capability-statement-extractor.js` | ✅ Real, 5 refs | ⚠️ Light | ❌ Not visible | Medium-high | D |
| `fed-agent.js` | ✅ Real, 3 refs | ⚠️ Light | ❌ Not visible | Medium | D |
| `incumbent-research.js` | ✅ Real, 4 refs | ⚠️ Light | ❌ Not visible | High — knowing the incumbent matters | D |
| `opportunity-outreach.js` | ✅ Real, 11 refs | ✅ Yes | ⚠️ Light visible | Medium | C+ |
| `opportunity-records.js` | ✅ Real | ✅ Yes | ⚠️ Limited | Medium | C |
| `outreach-window.js` | ✅ Real | ✅ Yes | ⚠️ Limited | Medium | C |
| `pre-rfp.js` | ✅ Real, 11 refs | ⚠️ Light | ❌ Not visible | High — early-warning is huge | D |
| `targeting-profile.js` | ✅ Real | ✅ Yes | ✅ Yes (wizard) | High | B |
| `naics-expansion.js` | ✅ Real | ✅ Yes | ⚠️ Indirectly | Medium | C |
| `clarification-strategy.js` | ✅ Real | ⚠️ Light | ❌ Not visible | High — Q&A is leverage | D |
| `email-compliance.js` | ✅ Real, 8 refs | ✅ Yes | ⚠️ Light | High — FAR-compliant emails | C+ |
| `export.js` | ✅ Real | ✅ Yes | ⚠️ Light | Medium | C |
| `middleman-fit.js` | ✅ Real, 7 refs | ⚠️ Light | ❌ Not visible | Medium | D |
| `stakeholder-graph.js` | ✅ Real, 10 refs | ⚠️ Light | ❌ Not visible | Medium-high | D |
| `capture-os.js` | ✅ Real | ✅ Yes | ⚠️ Partial | High — orchestrator | C+ |
| `workflow-automation.js` | ✅ Real | ✅ Yes | ⚠️ Light | Medium | C |
| `addons.js` | ✅ Real | ✅ Yes | ⚠️ Light | Low | C |
| `fast-cash.js` | ✅ Real, 8 refs | ✅ Yes | ✅ Yes (Fast Cash Decision surface) | Medium — non-GovCon focus | B |
| `premium-content-agent.js` | ✅ Real, 12 refs | ✅ Yes | ⚠️ Light | Medium | C |
| `govcon-setup-wizard` (in HTML + tests) | ✅ Real | ✅ Yes | ✅ Yes | High | B |

**Cluster summary:** 30+ modules exist. **8 modules with high buyer value are graded D (no visible buyer surface)** — compliance-matrix, solicitation-analysis, deadline-extraction, capability-statement-extractor, fed-agent, incumbent-research, pre-rfp, clarification-strategy. Plus 3 medium-high D's: middleman-fit, stakeholder-graph. **That is the assembly gap.**

### 3.2 Cross-cutting backend (services/*)

The non-GovCon-namespaced services that the canonical 25-feature roadmap depends on:

- `services/response-desk.js` — deterministic 11-category classifier; underpins F01 inbox card and F06 Q&A intake.
- `services/default-state-policy.js` — `FORBIDDEN_SEED_TERMS` enforcement; underpins safe first-run UX for every persona above.
- `services/govcon/capture-os.js` — orchestrator; underpins F01 Capture Command Center.
- `services/govcon/workflow-automation.js` — generic workflow engine; underpins F03 Bid/No-Bid Engine + F24 Submission Readiness Gate.
- `services/govcon/export.js` + `services/govcon/email-compliance.js` — underpin F25 Human-Approved Submission Package Export.

These services are largely wired but lightly surfaced. The 22B–22F phasing assumes none of them are rebuilt — only wrapped in buyer-visible UI.

### 3.3 Demoted commercial-CRM surfaces (GovCon Mode primary nav)

In **GovCon Mode** (the default for first-run users who picked GovCon during onboarding), the following surfaces are explicitly demoted out of the primary nav. They are not deleted — they remain reachable behind a `Show all` toggle in the nav drawer — but they do not occupy buyer-visible real estate in the first 5 minutes. This implements the spec finding that *generic AI dashboard/ad/lead features should be demoted unless tied to GovCon capture.*

| Surface | Why demoted in GovCon Mode | Reachability in GovCon Mode |
|---|---|---|
| Lead Generator | Reads as B2B commercial prospecting, not GovCon capture. Unmistakably wrong genre for a GovCon SMB buyer's first impression. | Behind `Show all` toggle. |
| Email Tracker | Commercial CRM signal. Not tied to a pursuit, solicitation, or vendor quote. | Behind `Show all` toggle. |
| Ad Engine | Commercial marketing. Irrelevant to GovCon SMB buying journey. | Behind `Show all` toggle. |
| Socials | LinkedIn outreach is real but secondary; primary nav real estate is too valuable to spend on it. | Behind `Show all` toggle. |
| Clinical / EHR | Not GovCon. Actively damages credibility in a GovCon buyer's first 5 minutes. | Behind `Show all` toggle. |
| Create Lead | Commercial framing. The GovCon equivalent (Create Pursuit / Add Solicitation) lives inside F01. | Behind `Show all` toggle. |

The underlying tabs and their backends are untouched — this is purely a GovCon-mode primary-nav curation. Operators serving non-GovCon clients can either flip out of GovCon Mode or use `Show all`. The commercial CRM persona is not removed from the product; it is removed from the GovCon buyer's first-look surface.

---

## 4. Assembly + proof gap — the 7 revenue-justifying core features

The PR #59 audit ranked the highest-leverage gaps. The later-agent spec sharpened that into a named set of 7 revenue-justifying core features. These are the surfaces a GovCon SMB will pay for *and renew on.* All 7 have backends already in the repo; the gap is buyer-visible assembly + proof.

| # | Core feature | Why it justifies revenue | Backend dependency (already exists) |
|---|---|---|---|
| 1 | **Compliance Matrix** | The single artifact that converts "interesting demo" → "I will pay monthly." Section L/M/B/C/H/K traceability per requirement is the most-cited objection-killer in GovCon SaaS. | `services/govcon/compliance-matrix.js`, `services/govcon/solicitation-analysis.js` |
| 2 | **Solicitation Workspace** | The container that holds the bid: shred, requirements, deadlines, owners, evidence. Without this, the matrix has nowhere to live. | `services/govcon/solicitation-analysis.js`, `services/govcon/deadline-extraction.js` |
| 3 | **Bid/No-Bid** | Before assembly, qualification. A defensible go/no-go decision against the Pursuit Profile, scored. | `services/govcon/govcon-pursuit-profile.js`, `services/govcon/sam-opportunity-sprint.js`, `services/govcon/workflow-automation.js` |
| 4 | **Deadline Calendar** | The daily rhythm surface. Q&A deadlines are the most-missed milestone in GovCon — a unified calendar wins on this single fact. | `services/govcon/deadline-extraction.js`, `services/govcon/scheduled-sam-search.js` |
| 5 | **Vendor Quote Room** | The teaming + pricing nexus. Solicit, compare, and bind subcontractor quotes to a specific solicitation requirement. | `services/govcon/subcontractor-sourcing.js`, `services/govcon/subcontractor-bench.js`, `services/govcon/prime-partner-finder.js` |
| 6 | **Pricing Worksheet** | The margin builder. CLIN-by-CLIN cost build-up tied to vendor quotes and to the compliance matrix. | `services/govcon/sam-opportunity-sprint.js` (scoring base), `services/govcon/workflow-automation.js`, new aggregation over vendor quote data |
| 7 | **Submission Readiness Gate** | The renewal feature. Red/yellow/green readiness score with an explicit "not responsive yet because…" list. Never auto-submits. | `services/govcon/compliance-matrix.js`, `services/govcon/email-compliance.js`, `services/govcon/export.js`, `services/govcon/past-performance.js` |

Of those 7, only Bid/No-Bid has a partial buyer-visible surface today (via the SAM Sprint scoring output). The other 6 are backend-only. Closing this gap is the entire point of phases 22B–22F.

---

## 5. Sellable workflow — the buyer-facing path

The audit reframes the product around a single linear workflow that maps to the GovCon SMB buying journey. Every canonical feature has a home in this workflow.

> **SAM discovery → qualification → solicitation extraction → compliance matrix → vendor quotes → proposal drafting → submission readiness**

Stage-by-stage mapping to canonical features (full feature numbering is in §6 and in the companion feature-opportunity map):

| Stage | What the buyer is doing | Canonical features that own this stage |
|---|---|---|
| **1. SAM discovery** | Saved searches, scored pursuits, daily new opportunities. | **F02 SAM Opportunity Intelligence** |
| **2. Qualification** | Bid/No-Bid against the Pursuit Profile. Go or kill. | **F03 Bid/No-Bid Engine** |
| **3. Solicitation extraction** | Pull Section L/M/C/PWS from the RFP. Track amendments and Q&A windows. | **F04 Solicitation Workspace · F05 Section L/M/C/PWS Extractor** |
| **4. Compliance matrix** | Bind every requirement to a section, owner, evaluation criterion, and evidence. | **F08 Compliance Matrix Builder · F11 Vendor Quote Room (where requirements need subs) · F21 Pricing Worksheet (where requirements have cost)** |
| **5. Vendor quotes** | Solicit, compare, and bind subcontractor quotes. Confirm vendor credentials. | **F11 Vendor Quote Room · F21 Pricing Worksheet** |
| **6. Proposal drafting** | Outline → technical approach → management/staffing → pricing. Human-written, system-traced. | **F18 Proposal Outline Builder · F19 Technical Approach Draft Builder · F20 Management / Staffing Plan Builder** |
| **7. Submission readiness** | Red/yellow/green gate. Human-approved package export. | **F24 Submission Readiness Gate · F25 Human-Approved Submission Package Export** |

The supporting features (Past Performance Library F16, Capability Statement Tailoring F17, Prime Partner Finder F13, Incumbent / Recompete F14, Pre-RFP Capture F15, Amendment Monitor F07, Evaluation Criteria Mapper F09, Requirement Owner / Evidence Tracker F10, Vendor Risk + Credential Checklist F12, Subcontractor Quote Comparison F22, FAR / Set-Aside Guardrails F23) plug into specific stages of this workflow rather than standing alone.

The Capture Command Center (F01) is the home screen that displays this workflow at a glance for every active pursuit.

---

## 6. 25-feature roadmap summary

The full ordered, scoped, and grade-rated feature catalog lives in `phase-22a-govcon-feature-opportunity-map.md`. This section is the named index. Each feature has a one-line "why now" — the buyer-visible reason this is the next surface to ship.

1. **F01 GovCon Capture Command Center** — Replaces the generic Dashboard as the GovCon-mode home; the buyer sees the workflow above immediately.
2. **F02 SAM Opportunity Intelligence** — Wraps SAM Sprint + saved searches + scored pursuits into one buyer surface.
3. **F03 Bid/No-Bid Engine** — Closes the qualification gap; defensible go/no-go scoring against the Pursuit Profile.
4. **F04 Solicitation Workspace** — The container for every active bid; today this is missing entirely.
5. **F05 Section L/M/C/PWS Extractor** — The shred; without it, the compliance matrix has no inputs.
6. **F06 Deadline + Q&A Calendar** — Closes the most-missed-deadline gap with one unified timeline.
7. **F07 Amendment Monitor** — Amendments invalidate compliance matrices silently; this surface catches them.
8. **F08 Compliance Matrix Builder** — The killer feature. Backend exists, no buyer surface today.
9. **F09 Evaluation Criteria Mapper** — Pairs Section M scoring with the matrix; lets buyers focus on what gets points.
10. **F10 Requirement Owner / Evidence Tracker** — Per-requirement ownership and evidence — what proposal managers actually need.
11. **F11 Vendor Quote Room** — The teaming + pricing nexus; binds vendor quotes to specific requirements.
12. **F12 Vendor Risk + Credential Checklist** — Catches missing reps/certs/insurance before they cause non-responsive rejections.
13. **F13 Prime Partner Finder** — Sub-to-prime ladder; backend exists, surface is light today.
14. **F14 Incumbent / Recompete Intelligence** — Knowing the incumbent is half the bid; surface this card per opportunity.
15. **F15 Pre-RFP Capture Tracker** — Early-warning sources are huge for SMB primes; wraps `pre-rfp.js`.
16. **F16 Past Performance Library** — The bid-velocity feature; reusable PP citations with metadata.
17. **F17 Capability Statement Tailoring** — Per-opportunity capability statement studio; closes the "we update it once a year" gap.
18. **F18 Proposal Outline Builder** — Section-by-section outline traced to the compliance matrix.
19. **F19 Technical Approach Draft Builder** — Human-written drafts with matrix-bound prompts; never auto-sends.
20. **F20 Management / Staffing Plan Builder** — The plan section most SMBs treat as boilerplate; this surface forces specificity.
21. **F21 Pricing Worksheet / Margin Builder** — CLIN-level cost build-up bound to vendor quotes.
22. **F22 Subcontractor Quote Comparison** — Side-by-side quote evaluation against requirements.
23. **F23 FAR / Set-Aside Guardrails** — Catches set-aside eligibility errors and limitation-of-subcontracting violations.
24. **F24 Submission Readiness Gate** — The renewal feature; red/yellow/green score with explicit "not responsive yet because…" output.
25. **F25 Human-Approved Submission Package Export** — The artifact. Human-approved, never auto-submitted. Closes the workflow.

---

## 7. 5-phase plan (22B–22F)

Each phase ships a coherent slice of the workflow above, with a single demo-ready theme. Every phase preserves the safety invariants in §9.

### Phase 22B — Capture spine

| | |
|---|---|
| **Theme** | The GovCon-mode home screen + qualification loop. The buyer's first 60 seconds. |
| **Primary deliverables** | **F01 GovCon Capture Command Center** · **F06 Deadline + Q&A Calendar** · **F03 Bid/No-Bid Engine** (overview level) |
| **Backend dependencies (already exist)** | `services/govcon/capture-os.js`, `services/govcon/govcon-pursuit-profile.js`, `services/govcon/sam-opportunity-sprint.js`, `services/govcon/scheduled-sam-search.js`, `services/govcon/deadline-extraction.js`, `services/govcon/workflow-automation.js`, `services/govcon/targeting-profile.js`, `services/govcon/naics-expansion.js`, `services/govcon/fed-agent.js` |
| **Why first** | The GovCon Mode primary nav §3.3 lands here. Without this phase, every subsequent phase opens onto the wrong surface. |
| **Risk** | Low — UI assembly only. |

### Phase 22C — Solicitation + Compliance

| | |
|---|---|
| **Theme** | The killer-feature demo. The Compliance Matrix becomes visible. |
| **Primary deliverables** | **F04 Solicitation Workspace** · **F05 Section L/M/C/PWS Extractor** · **F07 Amendment Monitor** · **F08 Compliance Matrix Builder** · **F09 Evaluation Criteria Mapper** · **F10 Requirement Owner / Evidence Tracker** |
| **Backend dependencies (already exist)** | `services/govcon/solicitation-analysis.js`, `services/govcon/compliance-matrix.js`, `services/govcon/deadline-extraction.js`, `services/govcon/clarification-strategy.js` |
| **Why second** | This is the surface that converts "interesting demo" into "I will pay monthly." Lands the §0 verdict by closing the most prominent assembly gap. |
| **Risk** | Medium — needs PDF ingestion path. Strict advisory framing retained. |

### Phase 22D — Vendors + Pricing

| | |
|---|---|
| **Theme** | The teaming + pricing nexus. Vendor quotes bind to the compliance matrix; pricing rolls up by CLIN. |
| **Primary deliverables** | **F11 Vendor Quote Room** · **F12 Vendor Risk + Credential Checklist** · **F21 Pricing Worksheet / Margin Builder** · **F22 Subcontractor Quote Comparison** |
| **Backend dependencies (already exist)** | `services/govcon/subcontractor-sourcing.js`, `services/govcon/subcontractor-bench.js`, `services/govcon/prime-partner-finder.js`, `services/govcon/middleman-fit.js`, `services/govcon/stakeholder-graph.js`, `services/govcon/workflow-automation.js`, `services/govcon/email-compliance.js` |
| **Why third** | Without vendor pricing tied to the matrix, the proposal-drafting phases (22E/22F) have no margin model to work against. |
| **Risk** | Low to medium. |

### Phase 22E — Past Performance + Capability + Teaming

| | |
|---|---|
| **Theme** | Bid velocity. The features that make SMB primes 10x faster on bid #4 onward. |
| **Primary deliverables** | **F16 Past Performance Library** · **F17 Capability Statement Tailoring** · **F13 Prime Partner Finder** · **F14 Incumbent / Recompete Intelligence** · **F15 Pre-RFP Capture Tracker** |
| **Backend dependencies (already exist)** | `services/govcon/past-performance.js`, `services/govcon/capability-statement-extractor.js`, `services/govcon/prime-partner-finder.js`, `services/govcon/incumbent-research.js`, `services/govcon/pre-rfp.js`, `services/govcon/middleman-fit.js`, `services/govcon/stakeholder-graph.js` |
| **Why fourth** | These features compound only after the workspace + matrix + vendor quote room exist. Shipping them earlier strands them in a vacuum. |
| **Risk** | Low. |

### Phase 22F — Submission readiness

| | |
|---|---|
| **Theme** | The renewal feature. The submission package exists and the readiness gate audits it. |
| **Primary deliverables** | **F23 FAR / Set-Aside Guardrails** · **F24 Submission Readiness Gate** · **F25 Human-Approved Submission Package Export** · **F18 Proposal Outline Builder** · **F19 Technical Approach Draft Builder** · **F20 Management / Staffing Plan Builder** |
| **Backend dependencies (already exist or near-exist)** | `services/govcon/compliance-matrix.js`, `services/govcon/email-compliance.js`, `services/govcon/export.js`, `services/govcon/past-performance.js`, `services/govcon/workflow-automation.js` |
| **Why last** | The readiness gate is meaningful only when every upstream artifact exists. Shipping it earlier produces false confidence. |
| **Risk** | Medium — checklist correctness is the product. Strict "advisory only" framing. |

**Out of scope for 22B–22F:** Pricing experiment work and any compliance certification investigation are deferred to a separate phase.

---

## 8. Pricing summary

The pricing critique lives in full in `phase-22a-pricing-fit-critique.md`. The summary: two pricing surfaces disagree (site mission references $79/$349/$999; the internal pricing doc says $1,497/$3,497/$5,997 plus monthly Operator tiers at $499/$997), the gap is up to 19x on the entry tier, and a skeptical GovCon buyer who sees both will stop trusting the product. The companion doc preserves the disagreement table verbatim and adds an advisory resolution direction (treat one-time SKUs as implementation services, keep monthly Operator tiers as workflow subscriptions, align the site to the implementation+subscription model). **No price value is changed in this PR. No Stripe ID is mentioned. No pricing change is in scope for any of phases 22B–22F.**

---

## 9. Safety + non-goals

The recommendations in this audit are constrained by the following invariants. Every phase 22B–22F must preserve them.

**Guardrails (preserved from PR #59):**

- Renderer-boot test (PR #55, 7/7) must remain green.
- Default-state policy (PR #52, 22/22) must remain green.
- Response Desk safety (PR #51 / #56, 24/24) must remain green: no Send Email, `auto_send: false`, no live Gmail claim.
- SAM Sprint Free=1 NAICS / paid=many entitlement (62/0) must remain green.
- No "guaranteed award" / "guaranteed revenue" / "unlimited AI" / "auto-submit" wording.
- No autonomous submission to SAM, PIEE, eBuy, GSA, or any agency portal.
- No pricing change until the pricing critique's reconciliation work is done.

**Explicit non-claims (the things this audit and the entire 22B–22F roadmap will not assert):**

- **No FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 / "government compliant" claim** added anywhere in product, marketing, or documentation.
- **No guaranteed contract / award / revenue / ROI claim.** The product helps; it does not promise.
- **No autonomous submission / auto-submit / auto-send claim.** Every feature in the 25-feature roadmap retains `human_approval_required: true` and `auto_send: false`.
- **No "watsonx live" / "signed and notarized" claim.**
- **No live SAM execution.** No outreach drafted, sent, or queued in this PR.

**Operational non-actions in this PR:**

- No live SAM run.
- No outreach sent.
- No emails sent.
- No Send Email button added (UI not touched).
- No `auto_send: true` added.
- No `.env` touched.
- No API keys printed.
- No secrets exposed.
- No stashes touched.
- No pricing change.
- No compliance claim added.
- No watsonx-live / signed-notarized / Gmail-connected claim added.
- No SAM Sprint behavior changed.
- No Response Desk behavior changed.
- No default-state policy weakened.
- No renderer boot regression (no renderer edits at all).
- No PR #59 history rewritten, force-pushed, closed, or modified.

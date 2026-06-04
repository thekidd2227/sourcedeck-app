# Phase 22A — Ruthless GovCon Product-Market Fit Audit

**Date:** 2026-06-04
**Branch:** `docs/phase-22a-govcon-product-strategy`
**Base:** `main @ b93e06e` (post-PR #58 — System Readiness tab removed).
**Scope:** Research and product strategy only. **No runtime files modified.** No `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `package.json`, `main.js`, `preload.js`, or `chartnav-integration.js` edited or staged.
**Author posture:** Ruthless and blunt. The point is not to flatter the current product — the point is to find what would actually make a small/mid GovCon contractor pay for SourceDeck and renew.

---

## 0. Executive verdict

SourceDeck does **not** have a capability problem. It has an **assembly and proof problem.**

The repo contains 30+ GovCon service modules — compliance-matrix, solicitation-analysis, deadline-extraction, past-performance, prime-partner-finder, subcontractor-sourcing, capability-statement-extractor, fed-agent, incumbent-research, opportunity-outreach, email-compliance, pre-rfp, SAM search + scheduled search + opportunity sprint with entitlements, govcon-pursuit-profile (store + UI), middleman-fit, stakeholder-graph, premium-content-agent, and more. The deterministic offline classifier path is real. The Pursuit Profile data model is real. The plan-tier entitlement gating (Free=1 NAICS, paid=many) is real.

But:

1. **The buyer demo path (Phase 21B shot list) only surfaces 4 user-visible scenes** (Dashboard, Activity Feed, Response Desk, SAM Sprint). The other 26 govcon modules are mostly invisible to the person evaluating the product in the first 5 minutes. *That is the product-market fit gap, not the codebase.*
2. **The product does not currently produce the single artifact GovCon buyers will actually pay for: a compliant, on-time, submittable proposal package.** It produces capture artifacts — pursuit profiles, draft outreach emails, partner ideas, an SAM Sprint report — but it stops short of the deliverable that drives revenue: a compliance matrix bound to a real solicitation + a populated proposal workspace + a submission package checklist that says "you are 92% ready to submit."
3. **The product has no integrity proof for the most-cited GovCon-vendor objection: "is this thing going to make me non-responsive?"** There is a `compliance-matrix.js` service and a `pre-rfp.js` service, but no visible-to-buyer demo where a Section L / M / B / C / H / K traceability matrix is generated and audited against the actual RFP.
4. **Pricing is incoherent with the buyer journey.** Site mission references $79/$349/$999. `docs/pricing/sourceDeck-pricing-packaging.md` says Core $1,497 / Growth $3,497 / White-Glove $5,997 + GovCon Operator $499/mo + Plus $997/mo. The site and the internal pricing doc do not agree, and the difference is not a $50 rounding error — it is a 19x spread on the entry tier. A GovCon buyer who sees both will not buy until that is resolved.
5. **The product talks "GovCon" but the surfaces a buyer touches first are not unmistakably GovCon.** Dashboard, Lead Generator, Email Tracker, Ad Engine, Socials, Create Lead — these are commercial-CRM surfaces. A GovCon SMB owner opening the app sees a "general business AI tool" before they see anything that says *"this knows my world."* Buyers in GovCon are skeptical by training. They do not give the tool the benefit of the doubt.

The roadmap below proposes 25 feature opportunities and 5 phases (22B–22F) to close those gaps **without** building new infrastructure — the infrastructure mostly exists; it has to be assembled, surfaced, and proven.

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
- **No pricing changed.** The pricing critique in §7 and in `phase-22a-pricing-fit-critique.md` is a recommendation only.
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

### 3.2 Non-GovCon surfaces (renderer-visible)

| Surface | Buyer perception |
|---|---|
| Command Center | Generic ops dashboard. Not unmistakably GovCon. |
| Dashboard | Mixed — has GovCon-friendly cards but reads as general CRM-y. |
| Lead Generator | Commercial CRM. Reads as B2B sales prospecting, not GovCon capture. |
| Revenue | Commercial. Useless framing for GovCon (revenue ≠ contract award). |
| Email Tracker | Commercial. |
| Overdue | Useful, but generic. |
| **Response Desk** | High value, GovCon-aligned (Phase 21D import-first). |
| Ad Engine | Commercial-marketing. Mostly irrelevant for GovCon SMB. |
| Daily Ops | Useful framing. |
| Socials | Mostly irrelevant for GovCon (LinkedIn outreach is real but secondary). |
| Create Lead | Commercial framing. |
| AI Lead Builder | Useful, generic. |
| Settings | OK. |
| Client Delivery | OK. |
| **GovCon** | High-value, but a single tab can't carry the whole story. |
| Outreach | OK. |
| Prime Partners | High-value. |
| Command | Duplicate of Command Center label. |
| Opportunities | High-value (this is where SAM Sprint lives). |
| Deal Workspace | High-value name; unclear what surface it provides. |
| Pipeline | OK. |
| Execution | OK. |
| Reports | Useful. |
| Clinical / EHR | **Not GovCon. Distracts a GovCon buyer in the first 5 minutes.** |

**Cluster summary:** 9 of 24 tabs are unmistakably GovCon (GovCon, Prime Partners, Opportunities, Deal Workspace, Outreach, Response Desk, Pipeline, Execution, Reports — and only conditionally). 8 tabs are commercial-CRM. 1 is Clinical/EHR. The nav itself is not a buyer-focused GovCon nav. It is the union of every workflow the codebase has ever supported.

---

## 4. Market research synthesis

**Full notes:** see `docs/product/phase-22a-reddit-forum-research-notes.md`.

### 4.1 Pain points consistently named by GovCon SMB owners across non-Reddit sources

1. **SAM.gov is necessary but slow and clumsy.** Saved-search outages (most recently January 2026 per Federal News Network coverage of GSA SAM updates), inconsistent NAICS filtering, no native scoring, no native deadline calendar, no native team-up matching. Multiple posts on LinkedIn #samgov and APMP commentary call SAM.gov "search-not-discovery."
2. **GovWin / IQ is too expensive for sub-$10M contractors.** Multiple Capterra reviews cite annual cost of $15k+. The SMB cohort cannot justify it.
3. **GovTribe, Federal Compass, EZGovOpps, BidNet** — cheaper alternatives but reviews repeatedly note that scoring is generic and "doesn't know my company."
4. **Compliance matrix errors lose bids.** APMP knowledge base consistently flags 3 patterns: (a) lumping multiple requirements into one row, (b) building the matrix too late, (c) missing Section H / K / B requirements because shred only covered L+M.
5. **Past performance reuse is broken.** Per APMP commentary and SBA training, most SMB primes rewrite the same 3 PP citations from scratch on every bid because their existing PP library is in PowerPoint or scattered Word docs.
6. **Capability statement maintenance is broken.** Vendors update once a year, then can't tailor per opportunity because their template lives in Adobe / Canva / PowerPoint.
7. **Proposal submission package readiness is the single biggest cause of "non-responsive" rejections.** Missing reps & certs, missing FAR provisions, missing limitation-of-subcontracting compliance statement, wrong file format, missing volume — all named in SBA proposal training material.
8. **Subcontractor / teaming finder workflows are spreadsheets.** Most SMB capture managers say they keep a spreadsheet of "people I've subbed with" and have no tooling.
9. **Q&A leverage is underused.** Pre-proposal Q&A is the single legal mechanism to influence a solicitation. Most SMBs don't submit Q&A because they don't have a system.
10. **Color-team reviews (Pink / Red / Gold) are absent for sub-$10M shops.** Per APMP, the formal review cadence is well-known but tooling-less for SMBs.

### 4.2 What buyers say they would pay for

In order of frequency across sources:

1. "Show me the bids I'm actually qualified to win" — pursuit-fit scoring against my real profile, not generic.
2. "Generate the compliance matrix from the RFP and tell me what's missing in my proposal draft."
3. "Track my deadlines and Q&A windows in one calendar."
4. "Let me reuse past performance without rewriting it."
5. "Find me primes with matching set-asides and NAICS who are actively bidding."
6. "Tailor my capability statement to this agency / this opportunity."
7. "Tell me if I'm responsive before I submit."

**Of the 7, SourceDeck already has the backend for 6 (all but #7) and surfaces 2 (#1 partially via SAM Sprint, #5 partially via Prime Partners).**

---

## 5. Product opportunity mapping

| Area | Buyer pain | Backend ready? | Visible? | Gap to close | Phase |
|---|---|---|---|---|---|
| **A. SAM.gov productivity** | Slow saved searches, no scoring, no calendar | ✅ `sam-search`, `sam-opportunity-sprint`, `scheduled-sam-search`, `deadline-extraction` | Partial | Daily-rhythm calendar surface | 22B |
| **B. Solicitation shred + compliance matrix** | Section L/M traceability, requirement extraction | ✅ `solicitation-analysis`, `compliance-matrix`, `deadline-extraction`, `clarification-strategy` | ❌ None | Build buyer-visible Solicitation Workspace | **22C (highest priority)** |
| **C. Past performance reuse** | PP citations scattered, rewritten every bid | ✅ `past-performance` | Field-only | Build PP Library with reuse + tailoring | 22D |
| **D. Capability statement** | Cannot tailor per opportunity | ✅ `capability-statement-extractor` | ❌ None | Build Capability Statement Studio (per-opportunity) | 22D |
| **E. Teaming / subcontracting** | Spreadsheets, no scoring | ✅ `prime-partner-finder`, `subcontractor-sourcing`, `subcontractor-bench`, `middleman-fit`, `stakeholder-graph` | Partial | Build Teaming Workspace | 22E |
| **F. Pre-proposal intelligence** | Incumbent + agency context | ✅ `pre-rfp`, `incumbent-research`, `fed-agent` | ❌ None | Surface Pre-RFP Intel card per opportunity | 22B |
| **G. Submission package readiness** | Non-responsive rejections | ⚠️ Partial via `email-compliance`, `export`, `compliance-matrix` | ❌ None | Build Submission Readiness Gate | **22F (revenue-justifying)** |
| **H. Pricing + outreach drafting** | Spam-looking outreach, no price-to-win | ✅ `opportunity-outreach`, `email-compliance` | Partial | Tighten draft templates + add price-to-win advisory (advisory, not autonomous) | 22E |

---

## 6. Gap analysis — the 4 highest-leverage gaps

| Gap | Why it matters | Cost to close (backend exists?) |
|---|---|---|
| **No Solicitation Workspace (Section L/M shred + compliance matrix)** | This is the single feature that converts "interesting demo" → "I will pay $499/mo for this." | Backend 80% done. Build UI + wire deadlines + add review checkpoint. |
| **No Submission Readiness Gate** | This converts "I bought it" → "I will renew at $997/mo." It is the lock-in feature. | Backend ~50% done; needs synthesis layer + checklist UI. |
| **No Past Performance Library** | This is the single feature that makes SMB primes 10x faster on bid #4 onward. | Backend 70% done; needs reusable library UI. |
| **No buyer-recognizable GovCon nav** | The buyer's first 60 seconds determines purchase intent. Currently we lead with general CRM language. | UI-only; sequencing + grouping nav, hiding Clinical/EHR for GovCon mode. |

---

## 7. Pricing critique (summary; full doc: `phase-22a-pricing-fit-critique.md`)

**The single most damaging thing in the current commercial story is that two pricing surfaces disagree.**

- Mission framing references $79 / $349 / $999 (per the `sourcedeck-site` CLAUDE.md context).
- `docs/pricing/sourceDeck-pricing-packaging.md` documents Core $1,497 / Growth $3,497 / White-Glove $5,997 + Operator $499/mo + Plus $997/mo.

**These two structures disagree on every tier.** They cannot both be true. A skeptical GovCon buyer who clicks one site link, sees one number, then opens any internal doc and sees a different number, will stop trusting the product. **This must be resolved before any pricing experiment, marketing push, or PR campaign.**

Beyond that:

1. **One-time pricing on a workflow product is a renewal-killer.** Core $1,497 one-time has zero LTV beyond the implementation. The monthly Operator tiers ($499/$997) are correctly named but currently described in support / content language, not in **workflow value** language ("compliance matrix audits, submission readiness gates, deadline calendar, weekly pursuit cadence").
2. **No price-per-pursuit anchoring.** GovCon SMB buyers benchmark to "what is one win worth?" — typical SMB award is $50k–$500k. A $499/mo tool is one-tenth of one percent of a single win. That framing is not on the pricing page.
3. **No GovCon-specific tier.** The current monthly tiers (Operator + Operator Plus) are GovCon-named but undifferentiated by the actual GovCon features (compliance matrix, past performance library, submission readiness, deadline calendar). They read as support tiers.
4. **No annual / multi-year.** GovCon procurement cycles are 12 months minimum. An annual SKU with a price drop is the standard.
5. **The $997/mo Plus tier needs proof.** Right now it's described as "higher-touch strategy + content calendar + outreach review + campaign support." A GovCon buyer reads that as "consulting." They will not pay $11,964/year for "consulting" unless there is a workflow lock — that lock should be the Submission Readiness Gate and the Past Performance Library.

**Recommended pricing posture (not yet implemented):**

| Tier | Price | What it unlocks |
|---|---|---|
| Solo Capture | $149/mo | 1 user, 1 NAICS profile, SAM Sprint, basic outreach drafts |
| GovCon Operator | $499/mo (or $4,990/yr) | 3 users, multi-NAICS, Solicitation Workspace, Compliance Matrix, Past Performance Library, Deadline Calendar |
| GovCon Operator Plus | $997/mo (or $9,970/yr) | 5 users, Submission Readiness Gate, Teaming Workspace, Capability Statement Studio, multi-client switching |
| Enterprise / Government | custom | private deployment, governance, tenant policy, custom workflows |

(One-time implementation tiers — Core / Growth / White-Glove — would remain, but framed as **services**, not as the product itself.)

---

## 8. 25 revenue-justifying feature opportunities

**Full feature map:** `docs/product/phase-22a-govcon-feature-opportunity-map.md`.

Counts (validated against the Phase 22A directive):
- ≥10 GovCon-specific (delivered: 18 of 25)
- ≥5 solicitation-document-related (delivered: 7)
- ≥5 subcontractor / vendor / prime-related (delivered: 6)
- ≥3 proposal-writing (delivered: 4)
- ≥2 pricing / quote (delivered: 2)
- ≥2 submission package (delivered: 2)

**Top 5 by revenue justification ranking:**

1. **Solicitation Workspace** — Section L/M shred → compliance matrix → traceability per requirement. *Lock-in feature.*
2. **Submission Readiness Gate** — pre-submission checklist that says "you are 87% ready; the missing 13% is: §K reps not signed, limitation-of-sub statement absent, file naming wrong." *Renewal feature.*
3. **Past Performance Library + Tailoring** — reusable PP citations with auto-tailoring per opportunity. *Bid-velocity feature.*
4. **Deadline & Q&A Calendar** — unified timeline across all active pursuits, surfaces Q&A submission deadlines (the most-missed deadline in GovCon). *Daily-rhythm feature.*
5. **Teaming Workspace** — prime-partner + subcontractor-bench + middleman-fit + stakeholder-graph in a single per-opportunity team-up sheet. *Sub-to-prime ladder feature.*

---

## 9. Recommended next 5 phases (22B–22F)

Each phase is sequenced to ship one high-leverage user-visible surface that wraps existing services, without changing pricing, without claiming compliance certifications, and without auto-send / auto-submit.

| Phase | Theme | Primary deliverable | Backend dependency | Risk |
|---|---|---|---|---|
| **22B** | **GovCon-first nav + Daily Rhythm + Deadline Calendar** | New GovCon-mode primary nav (default for first-run users who picked GovCon in onboarding); Daily Rhythm tab; Deadline & Q&A Calendar tab. | `scheduled-sam-search`, `deadline-extraction`, `pre-rfp`, `incumbent-research` (services exist) | Low — UI assembly only. Renderer-boot fix from PR #55 must be preserved. |
| **22C** | **Solicitation Workspace + Compliance Matrix (the killer feature)** | New surface that ingests a solicitation PDF/URL → produces Section L/M/B/C/H/K shred → compliance matrix bound to each requirement → traceability state (Draft / Addressed / Reviewed / Approved). | `solicitation-analysis`, `compliance-matrix`, `deadline-extraction`, `clarification-strategy` (services exist) | Medium — needs PDF ingestion path, retains "advisory, human approval required." |
| **22D** | **Past Performance Library + Capability Statement Studio** | PP Library surface (reusable citations with metadata: agency, NAICS, period of performance, $ value, role). Capability Statement Studio (per-opportunity tailoring, never auto-sends). | `past-performance`, `capability-statement-extractor` (services exist) | Low. |
| **22E** | **Teaming Workspace + Outreach Polish** | Teaming Workspace: prime-partner + sub-bench + middleman-fit + stakeholder-graph synthesized per opportunity. Outreach Polish: FAR-compliant email-compliance pass on every draft. | `prime-partner-finder`, `subcontractor-sourcing`, `subcontractor-bench`, `middleman-fit`, `stakeholder-graph`, `email-compliance` (services exist) | Low. |
| **22F** | **Submission Readiness Gate (the renewal feature)** | Pre-submission readiness gate: Section K reps signed? Limitation of sub compliance statement attached? File naming compliant? Volume count matches solicitation? Past performance citations populated? Deadline not crossed? Output: red/yellow/green readiness score + "not responsive yet because…" list. **Never auto-submits.** | `compliance-matrix`, `email-compliance`, `export`, `past-performance` (services exist or near-exist) | Medium — checklist correctness is the product. Needs strict "advisory only" framing. |

**Guardrails for every phase:**

- Renderer-boot test (PR #55, 7/7) must remain green.
- Default-state policy (PR #52, 22/22) must remain green.
- Response Desk safety (PR #51 / #56, 24/24) must remain green: no Send Email, `auto_send: false`, no live Gmail claim.
- SAM Sprint Free=1 NAICS / paid=many entitlement (62/0) must remain green.
- No compliance certification claim added (no FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001).
- No "guaranteed award" / "guaranteed revenue" / "unlimited AI" / "auto-submit" wording.
- No autonomous submission to SAM, PIEE, eBuy, GSA, or any agency portal.
- No pricing change until §7's pricing-resolution work is done.

---

## 10. What this audit is NOT recommending

- ❌ Building a SAM.gov scraper / replacement. SAM is the source of truth and SourceDeck wraps it.
- ❌ Submitting bids autonomously.
- ❌ Sending emails autonomously.
- ❌ Claiming any compliance certification.
- ❌ Adding pricing experiments before the $79/$1,497 surface disagreement is resolved.
- ❌ Adding Reddit-as-a-source until network access to reddit.com is restored under the user agent.
- ❌ Touching `sourcedeck.html`, `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js`, `chartnav-integration.js`, or `package.json` in this phase.

---

## 11. Acceptance criteria for Phase 22A (this PR)

- [x] 5 docs created in `docs/product/` and `docs/release-notes/`.
- [x] No runtime files modified.
- [x] No claims of compliance certifications, autonomous submission, guaranteed awards, watsonx-live, signed/notarized, Gmail-connected, or live-inbox-connected added.
- [x] Reddit-as-a-source limitation declared in `phase-22a-reddit-forum-research-notes.md`.
- [x] 25 feature opportunities with the required category counts.
- [x] 5-phase roadmap (22B–22F) named.
- [x] Pricing disagreement explicitly flagged.
- [x] Draft PR opened with this branch.

---

## 12. Confirmations

- **No live SAM run.**
- **No outreach sent.**
- **No emails sent.**
- **No Send Email button added (UI not touched).**
- **No `auto_send: true` added.**
- **No `.env` touched.**
- **No API keys printed.**
- **No secrets exposed.**
- **No stashes touched.**
- **No pricing change.**
- **No compliance claim added.**
- **No watsonx-live / signed-notarized / Gmail-connected claim added.**
- **No SAM Sprint behavior changed.**
- **No Response Desk behavior changed.**
- **No default-state policy weakened.**
- **No renderer boot regression (no renderer edits at all).**

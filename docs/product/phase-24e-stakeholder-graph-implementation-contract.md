# Phase 24E — Stakeholder Graph UI Implementation Contract

**Date:** 2026-06-08
**Branch:** `docs/phase-24e-stakeholder-graph-contract`
**Base:** `main @ 7fc16dc` (post-PR #85).
**Companion audit:** `docs/audits/phase-24e-stakeholder-graph-backend-ipc-readiness-audit.md`.
**Companion sample data:** `docs/product/phase-24e-stakeholder-graph-sample-data-contract.md`.
**Companion acceptance criteria:** `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md`.
**Posture:** Implementation contract for a later runtime agent. Docs-only. **No runtime change in this PR.**

---

## A. Phase 24E implementation target

Implement a **buyer-visible Stakeholder Graph UI** that reads from the existing `window.sd.govcon.stakeholders({ opp, extras })` IPC bridge (see audit §2) and renders the returned graph as a FAR-aware, role-labelled reference surface.

**Hard constraints (carried from the mission directive):**
- No backend rewrite. The Phase 24E PR may NOT edit `services/**`, `api/**`, `main.js`, or `preload.js`.
- No send / submit / upload behavior. No Send Email, Submit Bid, Submit Quote, Export-and-submit, or portal-upload control.
- No improper CO/COR outreach copy. No agency-portal submission. No autonomous submission.
- No new buyer-facing pricing copy. If pricing is referenced, it cites `docs/product/pricing-source-of-truth.md`.
- No Phase 24B (Audit Log) or Phase 24C (NAICS profile) regression.
- No Phase 24D (Past Performance / Capability Statement) collision — Phase 24E PR opens **after** Phase 24D merges, so the renderer surface around `#gc-pp`, `#gc-cs`, `#gc-ppf` will already exist; Phase 24E reads and respects that layout.

**One-line product purpose:** *"Show the operator who the stakeholders are around an opportunity — agency, program office, incumbent, prime/sub partners, internal owner — with FAR-aware posture labels and explicit restricted-communication-window warnings. Never act."*

---

## B. Stakeholder Graph UI contract

### B.1 Required UI fields per stakeholder node

Each rendered node must surface, at minimum:

| Field | Source | Notes |
|---|---|---|
| `role` | `node.role` (backend) | Plain-text label, e.g. "Contracting officer (CO)". |
| `organization / agency / office / company` | `node.label` (backend) | Default is role-only ("Public-record FPDS award (if any)"); operator may have entered a real name through `extras.partners`. |
| `stakeholderType` | `node.category` (backend) | One of the **5 backend categories** + **1 synthetic UI category** (see §B.2). |
| `opportunityOrAccountRelationship` | from `graph.opportunityId` | E.g., "Linked to MOCK-A (SOL-A-001)". For account/agency rollup, "Across N opportunities at this agency". |
| `influenceContext / roleContext` | from `node.instructions` (backend) | Verbatim instruction string from `buildStakeholderGraph`. |
| `allowedEngagementPosture` | `node.posture` + `graph.postureLabels[node.posture]` (backend) | Read both fields. Show posture color and posture label. |
| `prohibitedEngagementWarning` | UI-derived | When `node.posture === 'restricted'` OR `graph.inRestrictedWindow === true` for `category === 'contracting_office'`, show a prominent warning row: "Restricted communication window — official Q&A only." |
| `lastUpdated` | UI-derived | Use the same `gc-dd-last-updated` chip pattern as Phase 22B sections. Default `Last updated: Not yet`. |
| `evidence/source note` | UI-derived | Static line: "Backend-derived from solicitation record. Operator must verify against the live SAM.gov posting." |
| `demo/sample label` | UI-derived | When the row is sample content, render the visible `SAMPLE` chip (Phase 22B pattern). |

### B.2 Stakeholder types

The 5 backend categories (canonical):

1. `contracting_office` → backend role examples: "Contracting officer (CO)", "Contract specialist"
2. `program_office` → backend role examples: "Program / mission office", "Small Business Specialist (SBS)"
3. `incumbent` → backend role: "Likely incumbent"
4. `partner_prime_or_sub` → backend role: "Potential teaming partner" or operator-named partner
5. `industry_day` → backend role: "Industry-day / Sources-Sought respondents"

The **synthetic UI-only category** (renderer-side aggregation; **not** in the backend graph):

6. `internal_owner` → role examples: "Internal capture owner", "Proposal manager (you)", "BD lead (you)"

The UI must render the operator's COR contact, end-user contact, or government-side technical lead under the existing `program_office` category — there is **no separate `cor` category** in the backend graph; CORs roll up under the program office posture model with `restricted` enforcement in active windows.

Backend audit §6.2 documents the synthetic-node pattern for `internal_owner`. The Phase 24E test contract requires the `synthetic: true` marker so synthetic nodes can never be sent back through a backend-expecting code path.

### B.3 Required views

| View | Source data | Composition |
|---|---|---|
| **Account/agency stakeholder map** | Loop `window.sd.govcon.opportunities.list()` → call `stakeholders({ opp })` per record → group by `opp.agency`. | Renderer-side aggregation. No backend change. |
| **Opportunity stakeholder map** | One call: `window.sd.govcon.stakeholders({ opp: selectedOpp })`. | Direct render of `graph.nodes`. |
| **Teaming/prime relationship map** | Filter `graph.nodes.filter(n => n.category === 'partner_prime_or_sub' \|\| n.category === 'industry_day')`. | Subset render. |
| **Internal owner map** | Synthesize from `window.sd.govcon.profile.get()` (existing IPC; pursuit-profile owner fields). | Synthetic nodes only. Never sent to backend. |
| **Risk / ethics warning rail** | When `graph.inRestrictedWindow === true`, render a horizontal banner above the per-opportunity map. | Pure renderer affordance. |

### B.4 Required actions (read-only by default)

| Action | Allowed? | Notes |
|---|---|---|
| View stakeholder relationships | ✅ Yes | The default read-only behavior. |
| Add local stakeholder note | ✅ Yes, **local-only** | Persist via electron-store under a new key, e.g., `govcon.stakeholderNotes`, gated by a small IPC adapter the Phase 24E PR adds if needed. **Never transmitted; never uploaded.** Document the new IPC if you add it. |
| Classify a stakeholder role | ⚠️ Only via existing backend categories | The UI must NOT invent new posture values. If a future need for additional categories arises, it is a backend extension, not a UI hack. |
| Link a stakeholder to opportunity / account | ✅ Yes, **local-only** | Done by storing the operator's note under the opportunity's `id`. No new outbound network. |
| Export internal-review notes | ⚠️ Local-only | If exported, use the same local Markdown export pattern as Phase 22F Submission Readiness (`gc-pkg-export`) — no portal upload, no email transport. |
| Send outreach | ❌ Never | The Stakeholder Graph surface adds no Send Email, no Submit Bid, no Submit Quote, no "Export and submit" control. |
| Agency portal submission | ❌ Never | No upload to SAM.gov / PIEE / eBuy / GSA from this surface. |

### B.5 Required empty state

When no opportunity is selected, no agency is selected, and no operator-entered stakeholder note exists, render this **verbatim** empty-state message:

> Map agency, prime, vendor, and internal stakeholders to plan compliant capture actions. SourceDeck does not contact or submit to stakeholders.

---

## C. Required compliance language

The Stakeholder Graph parent section MUST include this disclaimer **verbatim** in its top-of-section copy:

> Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes.

Additionally, the parent section MUST include the backend-supplied `graph.safetyNote` verbatim (one line in a muted footer slot at the bottom of the map view). That backend string is:

> SourceDeck does not draft or send outreach to contracting officers, contracting specialists, or CORs. Communications during a restricted communication window must be routed through the official mechanism named in the solicitation. Pre-RFP capability conversations with Small Business Specialists or program offices are appropriate when the agency permits them; respect industry-day formats and source-sought response windows. See FAR 3.104 (procurement integrity) and the solicitation's Section L communication instructions before initiating any contact.

---

## D. Prohibited UI copy

The Phase 24E PR must NOT introduce any of the following phrases into the buyer-facing UI **or** into the sample data:

| Forbidden phrase | Why |
|---|---|
| "Contact CO" | Implies outreach permission; backend posture is `restricted`. |
| "Email COR" | Same. |
| "Influence buyer" | Procurement-integrity violation framing. |
| "Submit to agency" | Implies SourceDeck submits; SourceDeck does not. |
| "Send to contracting officer" | Same. |
| "Guaranteed award" | No outcome guarantee is claimed anywhere. |
| "Preferred relationship" | Implies pre-decisional bias. |
| "Backchannel" | Procurement-integrity violation framing. |
| "Lobby this office" | Procurement-integrity violation framing. |
| "Circumvent competition" | Procurement-integrity violation framing. |
| "Portal upload" (positive claim) | Allowed only in negative-assertion copy ("No portal upload"). |
| "Agency submission complete" | Implies portal interaction. |

The Phase 24E test contract (`docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md` §UI-12) regression-guards each of the 12 phrases above.

---

## E. Placement in GovCon Capture OS

The Stakeholder Graph section MUST be placed near (in this order of proximity preference) the existing buyer-workflow surfaces:

1. **Agency Targeting Insights** (Phase 22B Operating Rhythm Panel D)
2. **Pre-RFP Intelligence** (Phase 22B Operating Rhythm Panel C)
3. **Opportunity Qualification / Capture Command Center** (Phase 22B Capture CC)
4. **Prime Partner Finder** (Phase 22E `#gc-ppf`)
5. **Submission Readiness Gate** (Phase 22F `#gc-sub-gate`)

Recommended anchor: a new sibling `<section id="gc-stakeholder-graph">` placed **inside the `#tab-govcon` pane**, positioned between `#gc-ppf` (Prime Partner Finder, Phase 22E) and `#gc-sub-gate` (Submission Readiness, Phase 22F). This places the stakeholder map at the natural pivot point in the GovCon capture journey: after the operator has identified primes/subs, before they finalize the submission readiness check.

**Must NOT** bury the surface under a "Show all tools" toggle. **Must NOT** demote the surface to a generic-tools nav group.

### E.1 Surfaces that MUST remain intact

- ✅ Phase 22B Operating Rhythm parent (`#gc-operating-rhythm`) + 5 panels (Daily Capture Rhythm, Deadline & Q&A Calendar, Pre-RFP Intelligence, Agency Targeting Insights, **Audit Log**).
- ✅ Phase 24B Audit Log panel (`#gc-audit-log`) + `gcAuditRefresh()` IPC wiring.
- ✅ Phase 24B profile-driven SAM NAICS loader (`gcLoadTargetingNaics()`) + Phase 24C profile-driven NAICS filter dropdown (`gcRenderNaicsFilter()`).
- ✅ Phase 24D Past Performance / Capability Statement / Prime Partner Finder surfaces (already on `main` from PR sequence #80-onward).
- ✅ Response Desk import-first surface + `auto_send: false` posture.
- ✅ SAM Sprint Free=1 NAICS / paid=many entitlement.
- ✅ System Readiness / `sysflow` removal (Phase 21F).
- ✅ Phase 20G `.btn-gold` cool-gold + 900/899 px responsive breakpoint.
- ✅ Phase 23C GovCon-first default-active tab (`tab-govcon`).

---

## F. Copy rules (regression guards)

| Pattern | Allowed? | Notes |
|---|---|---|
| `Send Email` (button label) | ❌ No | Same posture as Response Desk and Submission Readiness. |
| `Submit Bid` / `Submit Quote` (button label) | ❌ No | Same posture. |
| `Export and submit` (combined verb) | ❌ No | Export alone is OK if local-Markdown-only; "and submit" is forbidden. |
| `upload to SAM` / `upload to PIEE` / `upload to eBuy` / `upload to GSA` (positive claim) | ❌ No | Allowed only in negative-assertion copy ("No portal upload"). |
| `auto_send: true` / `auto_submit: true` (anywhere in renderer code) | ❌ No | Existing global regression guard. |
| `guaranteed award` / `guaranteed revenue` (positive claim) | ❌ No | Allowed only in negative-assertion copy. |
| FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized (positive claim) | ❌ No | Same. |
| `$79` / `$349` / `$999` (active buyer-facing pricing) | ❌ No | Deprecated. If pricing is referenced anywhere in the panel, it cites `docs/product/pricing-source-of-truth.md` V3. |
| Synthetic UI category `internal_owner` carries `synthetic: true` flag | ✅ Required | Test contract asserts. |
| `SAMPLE` chip on every operator-loaded sample row | ✅ Required | Matches Phase 22B pattern. |

---

## G. Recommended renderer architecture (advisory; not binding)

These suggestions help the Phase 24E runtime agent ship a small surgical patch. They are **not** the only viable architecture.

- One new top-level handler `gcLoadStakeholderGraph({ oppId })` that calls `window.sd.govcon.stakeholders({ opp: resolvedOpp })`.
- One renderer function `gcRenderStakeholderGraph(graph)` that takes a `graph` payload and writes to a `#gc-stakeholder-graph` container.
- One synthetic-node helper `gcSyntheticInternalOwner(profile)` that returns `{ ..., synthetic: true }`.
- Hard-coded posture color mapping in CSS only (so the test contract can assert the color tokens, not the JS literal):
  - `posture-restricted` → red/oxblood
  - `posture-reference_only` → muted
  - `posture-research_target` → blue (info)
  - `posture-outreach_candidate` → brass-gold
  - `posture-engagement_candidate` → green (with a `"IF allowed"` qualifier badge)
- A `gcRenderStakeholderEmptyState()` that prints the verbatim empty-state copy from §B.5.
- Audit-log hook: every render call should emit one `audit-log` event (event type: `STAKEHOLDER_GRAPH_VIEWED`) so the Phase 24B Audit Log panel can show it. **Existing IPC; no new handler needed.**

---

## H. Acceptance criteria

See companion `docs/product/phase-24e-stakeholder-graph-ui-acceptance-criteria.md` for the test contract that the Phase 24E PR must satisfy.

## I. Sample data

See companion `docs/product/phase-24e-stakeholder-graph-sample-data-contract.md` for the safe sample stakeholder records the Phase 24E PR may ship in the panel's default state.

## J. Out-of-scope for Phase 24E

- Live person-identification (no real CO/COR name lookup against any external service).
- Email/phone discovery (no Apollo-style enrichment against the agency directory).
- Posture-change automation (operator cannot override `restricted` posture from the UI).
- Multi-tenant stakeholder sync (no server-side persistence; single workspace only).
- Outreach drafting from the stakeholder map (that lives in Outreach OS; the Stakeholder Graph is a **reference surface only**).

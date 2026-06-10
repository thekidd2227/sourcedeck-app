# Phase 25J — Enterprise Onboarding & Support Matrix

**Date:** 2026-06-09
**Companion:** `phase-25j-enterprise-pricing-recommendation.md` §8, `phase-25j-enterprise-quote-sheet-draft.md` §3.

---

## 1. Onboarding SKU matrix

| SKU | One-time fee | Audience | Duration | Deliverables |
|---|---|---|---|---|
| **Self-Install** | $1,497 | Solo / small operator | Async | Install documentation + setup walkthrough access + Core workflow templates. User-led configuration. |
| **Guided** | $3,497 | 1–3 users | 2–3 weeks | Self-Install plus guided GovCon Operating Profile setup, SAM / API onboarding support, basic workflow testing, walkthrough and handoff. |
| **Enterprise Onboarding** | **$7,497** | Team 5 | 4 weeks | Guided plus 2 live workshops (kickoff + governance), shared Capture Command Center setup, vendor workflow setup, Calendar import, proposal-section state machine baseline, Submission Readiness Gate calibration, hand-off to dedicated rep. |
| **Capture Team Deployment** | **$9,997** | Capture Team 10 | 6 weeks | Enterprise Onboarding plus role-separation configuration (basic tenant policy), 4 live workshops, FAR Reference workflow integration, multi-client switching setup, runbook documentation per pursuit phase. |
| **Multi-Office Deployment (baseline)** | **$14,997** | GovCon Enterprise 25 | 8–10 weeks | Capture Team Deployment plus per-office Pursuit Profile partitioning, standard governance reporting setup, vendor partition by region, 6 live workshops, runbook documentation per office, optional quarterly workflow review setup. |
| **Multi-Office Deployment (extended)** | **$24,997+** | Enterprise Command | 10–14+ weeks | Multi-Office baseline plus custom workflow design, custom tenant policy (key custody, retention, BCDR posture), custom AI provider routing, Tier 3 architecture engagement setup, dedicated rep + quarterly review included. Scope-dependent. |

## 2. Onboarding phases (used for every plan above Guided)

| Phase | Week | Deliverable |
|---|---|---|
| Discovery | 1 | Scope confirmation, role inventory, current pursuit list, governance requirements |
| Setup | 2 | Pursuit Profile(s) configured, API keys onboarded, workflow templates instantiated |
| Workshop 1 — Capture | 3 | Live training on Capture Command Center + Solicitation Workspace + FAR Reference |
| Workshop 2 — Proposal | 4 | Live training on Proposal Workspace + Word/PDF export + Submission Readiness Gate |
| Workshop 3 — Governance (Enterprise tiers only) | 5–6 | Role separation, audit log expectations, tenant policy walkthrough |
| Pilot pursuits | 6–8 | Customer runs 2–3 real pursuits with operator shadowing |
| Hand-off | 8–10 | Runbook delivered, rep transition, quarterly review schedule confirmed |
| Quarterly review | Q+1 | Workflow check-in, scope expansion review, renewal posture confirmation |

## 3. Support tier matrix

| Tier | Response SLA | Channel | Included with | Notes |
|---|---|---|---|---|
| Self-serve | Best-effort | Help/FAQ + manual | All tiers | Phase 25E.4 surface |
| Operator Tier 1 | Business-day | Operator email | GovCon Operator and above | Pilot operator handles |
| Priority Operator | Same-business-day | Operator email + scheduled call | Operator Plus, Team 5, Capture Team 10 | Higher priority on same operator queue |
| Dedicated Rep | Same-business-day | Named ARCG rep + scheduled call + Slack channel (where authorized) | Capture Team 10, Enterprise 25, Enterprise Command | One named ARCG point of contact per account |
| Tier 2 Engineering | 48-hour | Operator escalates only | All tiers (escalation only) | Product defects + credential boundary + RC blockers |
| Tier 3 Architecture | Scheduled | Quarterly review session | Enterprise Command (included), add-on for Enterprise 25 | Roadmap input, workflow design, integration planning |

## 4. Optional add-on services

| Service | Price | Audience |
|---|---|---|
| Additional onboarding workshop | $2,500/session | Any tier needing a make-up workshop or special-topic deep dive |
| Quarterly workflow review | $1,500/session | Capture Team 10, Enterprise 25 (add-on); included in Enterprise Command |
| Admin training | $1,000/session | Customer's IT admin or governance lead |
| Proposal workflow setup | $3,500 one-time | Customer-specific proposal-section state machine outside the default Phase 25E.2 13-section model |
| Vendor/subcontractor workflow setup | $3,500 one-time | Customer-specific Vendor Quote Room + Subcontractor Bench configuration |

## 5. Onboarding-included matrix (which onboarding SKU is included with which plan)

| Plan | Bundled onboarding | Operator's flexibility |
|---|---|---|
| Solo Capture | Self-Install ($1,497) bundled at operator discretion | Optional Guided upgrade |
| GovCon Operator | Self-Install ($1,497) bundled at operator discretion | Optional Guided upgrade |
| Operator Plus | Guided ($3,497) bundled at operator discretion | Optional Enterprise Onboarding upgrade |
| Team 5 | **Enterprise Onboarding ($7,497) included** | Not optional |
| Capture Team 10 | **Capture Team Deployment ($9,997) included** | Not optional |
| GovCon Enterprise 25 | **Multi-Office Deployment baseline ($14,997) included** | Not optional |
| Enterprise Command | **Multi-Office Deployment extended ($24,997+) included** | Custom scope |

## 6. Why setup fees are quote-led (not published)

The setup-fee schedule is **operator-managed only**. Reasons:

1. **Scope variance** — A Team 5 customer with 50 NAICS codes and 12 active pursuits costs more to onboard than a Team 5 customer with 3 NAICS codes and 2 active pursuits. A fixed published number misleads either way.
2. **Bundle flexibility** — The operator may absorb the setup fee into year 1 of an annual commitment to close a deal. A fixed published number removes that lever.
3. **Multi-year discount** — A 3-year commitment may earn a setup-fee waiver. The operator can't offer this if the number is public.
4. **Customer education** — A customer who hasn't been through scoping doesn't know what onboarding actually includes. Publishing a number causes them to compare it to half-price "fast onboarding" claims from competitors. The operator's scoping call frames what the customer is actually buying.

## 7. Renewal-time onboarding

If a customer expands during their annual term (adding users, adding an office, upgrading from Team 5 to Capture Team 10), the **delta onboarding fee** applies:

| Expansion | Onboarding fee |
|---|---|
| Add 1–3 standard users mid-term | None |
| Add 4+ standard users mid-term | Pro-rated workshop ($2,500 each, capped at $7,500) |
| Add 1 power user mid-term | None |
| Add 2+ power users mid-term | Pro-rated workshop ($2,500 each, capped at $5,000) |
| Add 1 office mid-term | Workshop + governance review ($5,000) |
| Plan upgrade (Team 5 → Capture Team 10) | Delta of bundled onboarding fees ($9,997 − $7,497 = $2,500) |
| Plan upgrade (Capture Team 10 → Enterprise 25) | Delta of bundled onboarding fees ($14,997 − $9,997 = $5,000) |
| Plan upgrade (Enterprise 25 → Enterprise Command) | Custom (scope-dependent) |

Mid-cycle expansion may be back-prorated to the renewal date if the customer prefers (operator's discretion).

## 8. Onboarding-fee bundling levers (operator discretion)

| Lever | When to use |
|---|---|
| Bundle setup into year 1 of annual | Close a deal where the customer is committed but cash-flow-sensitive in year 1 |
| Waive 50% of setup for 2-year commit | Multi-year close where customer is hesitant |
| Waive 100% of setup for 3-year commit | Strategic multi-year close; ARCG approval required |
| Defer setup to month 4 | Customer needs time to allocate budget |
| Bill setup in two installments (50% on signature, 50% on go-live) | Customer cash-flow constraint, scope is straightforward |

Each lever requires ARCG sign-off; **the operator does not publish a multi-year discount table.**

## 9. Hand-off after onboarding

When onboarding completes, the customer transitions from the onboarding ARCG specialist to:

| Plan | Post-onboarding contact |
|---|---|
| Solo Capture / GovCon Operator / Operator Plus | Pilot operator (Tier 1) |
| Team 5 | Pilot operator (Tier 1) + Priority queue |
| Capture Team 10 | **Named dedicated rep** + Priority queue |
| GovCon Enterprise 25 | Named dedicated rep + Priority queue + quarterly review (optional) |
| Enterprise Command | Named dedicated rep + quarterly review (included) + Tier 3 architecture (included) |

The hand-off includes:
- Customer runbook (per-pursuit workflow documentation)
- Audit log baseline snapshot
- AI provider usage baseline
- Submission Readiness Gate calibration snapshot
- Renewal-date placeholder in the operator's pilot tracker

## 10. Onboarding metrics (operator-tracked)

| Metric | Target |
|---|---|
| Time-to-first-pursuit (kickoff → first pursuit added) | ≤ 14 days |
| Time-to-first-Submission-Readiness-Gate-run | ≤ 30 days |
| Time-to-first-Internal-Review-Export | ≤ 45 days |
| Customer-reported satisfaction (post-onboarding) | ≥ 8/10 |
| Pursuit volume in month 3 vs month 1 | ≥ 1.5× |

These metrics are internal; they should not appear in customer-facing materials.

---

## Signature

This is the recommended onboarding and support matrix for Phase 25J. The pricing source-of-truth is unchanged. Bundled-onboarding amounts are operator-managed and not published. Multi-year discount levers require ARCG sign-off per deal.

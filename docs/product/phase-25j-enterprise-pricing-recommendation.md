# Phase 25J — SourceDeck Enterprise Pricing Recommendation

**Date:** 2026-06-09
**Status:** Recommendation, not approved. Pricing source-of-truth (`docs/product/pricing-source-of-truth.md`) is **unchanged** by this phase. Owner approval required before any source-of-truth update.
**Companion docs:** `phase-25j-website-enterprise-pricing-alignment.md`, `phase-25j-enterprise-onboarding-support-matrix.md`, `phase-25j-enterprise-quote-sheet-draft.md`.

---

## 1. Executive recommendation

Add a **public Team 5 tier** at $1,997/mo (or $19,970/yr) between Operator Plus and Enterprise. Keep Enterprise as a custom-quote tier. Build an **internal quote sheet** that exposes specific deal sizes for capture teams of 6–10, 11–25, and 26+ users (multi-office), but do **not** publish those internal tiers as fixed line items on the website. Reason: enterprise pricing is signal-rich; publishing exact numbers strips the operator's ability to scope work to the customer.

Setup fees scale from Self-Install at $1,497 to Multi-Office Deployment at $24,997+. Add-on standard user is $249/mo; capture/proposal power user is $399/mo; additional office is $997/mo; additional onboarding workshop is $2,500/session.

This phase **ships docs only**. No source-of-truth change. No website change. No Stripe / payment / checkout change. No deploy.

## 2. Current approved pricing baseline (unchanged)

From `docs/product/pricing-source-of-truth.md` (Phase 22A-P V3, authoritative):

| Tier | Monthly | Annual | Audience |
|---|---|---|---|
| **Solo Capture** | **$149/mo** | $1,490/yr | Solo operators, 1–3 pursuits |
| **GovCon Operator** | **$499/mo** | **$4,990/yr** | Up to 3 users |
| **Operator Plus** | **$997/mo** | **$9,970/yr** | Up to 5 users |
| **Enterprise** | Custom | Custom | Private deployment, security review, custom workflows |

Implementation services (one-time): Self-Install $1,497 · Guided $3,497 · DFY $5,997.

V2 deprecated amounts ($79/$349/$999 subscription, $997/$2,497/$4,997 implementation) and V1 legacy Price IDs ($49/$149 monthly) remain grandfathered server-side only — never re-exposed in UI. See pricing-source-of-truth §3.

## 3. Why enterprise pricing is needed

Three buyer signals make enterprise tier necessary:

1. **Capture teams of 3+ users** generate compound value from Phase 22B–22G shared workspace surfaces (Solicitation Workspace, Compliance Matrix, Vendor Quote Room, Past Performance Library, Stakeholder Graph, Submission Readiness Gate). A 5-user capture team running 8–15 concurrent pursuits gets materially more value from shared state than five solo users running one pursuit each.

2. **Multi-office GovCon organizations** need governance: per-office Pursuit Profiles, vendor partition by region, role separation between capture / proposal / contracts / pricing. None of those are billable as per-seat add-ons; they're operating-model concerns.

3. **Phase 25H Calendar module** and **Phase 25I FAR Reference + Word/PDF export** materially raise the team-collaboration value. A capture team coordinating Q&A deadlines, site visits, vendor follow-ups, and proposal-section work across a shared calendar is operating at a different tier than a solo operator with a single pursuit.

The pricing-source-of-truth V3 already says "Enterprise — Custom." This phase recommends what "Custom" should look like in practice, without publishing the deal-size math externally.

## 4. Pricing philosophy

Enterprise pricing **must not** be priced as seats only. The eight inputs that drive a SourceDeck enterprise quote are:

| # | Input | Why it matters |
|---|---|---|
| 1 | Number of users | Direct labor cost; storage; support load |
| 2 | Number of offices | Tenant partitioning, role separation, governance overhead |
| 3 | Capture/proposal volume | Active pursuits × time-on-platform × AI cost |
| 4 | Onboarding complexity | Custom workflow build, data migration, SOP integration |
| 5 | Support requirements | Tier 1/2/3 expectation, response SLA, dedicated rep |
| 6 | Governance/security expectations | Tenant policy, audit log requirements, retention rules, key custody |
| 7 | Number of active pursuits / proposals | Phase 22B–G surfaces (Capture Command Center, Solicitation Workspace, Submission Readiness Gate) cap utility by pursuit volume |
| 8 | Vendor/subcontractor workflow complexity | Vendor Quote Room intake, subcontractor sourcing, prime-partner finder usage |

A 3-user shop running 1 pursuit/month is structurally different from a 3-user shop running 15 pursuits/month. The internal quote sheet (§7) gives the operator scope to read those signals and quote accordingly.

## 5. Public pricing table (recommended)

| Tier | Users | Monthly | Annual | Audience |
|---|---|---|---|---|
| Solo Capture | 1 user | **$149/mo** | $1,490/yr | Solo operator, 1–3 pursuits |
| GovCon Operator | 1–2 users | **$499/mo** | **$4,990/yr** | Owner + 1 capture / proposal collaborator |
| Operator Plus | up to 3 users | **$997/mo** | **$9,970/yr** | Small capture team running multiple concurrent pursuits |
| **Team 5** | up to 5 users | **starts at $1,997/mo** | **starts at $19,970/yr** | GovCon office with capture + proposal + pricing roles |
| Enterprise | custom | custom | custom | Custom deployment, multi-office, governance scope |

**Three changes from the current published baseline:**
1. **GovCon Operator** is repositioned to "1–2 users" instead of "up to 3 users." Phase 22A-P V3 currently says "up to 3 users." That positioning compressed Operator Plus (also up to 5 users per current SoT). Reframing Operator at 1–2 makes room for the new Team 5 tier at 3–5 users.
2. **Operator Plus** is repositioned to "up to 3 users" (was up to 5 per SoT).
3. **New Team 5 tier** at $1,997/mo or $19,970/yr (starts at).

**Note for the owner:** items #1 and #2 are repositioning, not price changes. The amounts ($499/$997) hold. They require an explicit owner approval before the source-of-truth doc reflects them, because the existing tier-audience mapping is referenced by `test/govcon-pricing-positioning.test.js` and several Phase 22 audit docs.

## 6. Internal quote-sheet table (recommended — NOT for public site)

| Plan | Users | Offices | Monthly | Annual | Setup fee |
|---|---|---|---|---|---|
| **Team 5** | 3–5 users | 1 office | **$1,997/mo** | **$19,970/yr** | **$7,497** |
| **Capture Team 10** | 6–10 users | 1–2 offices | **$3,997/mo** | **$39,970/yr** | **$9,997** |
| **GovCon Enterprise 25** | 11–25 users | 1–3 offices | **starts at $6,997/mo** | **starts at $69,970/yr** | **$14,997** |
| **Enterprise Command** | 26+ users | multi-office | **custom** | **custom** | **$24,997+** |

| Add-on | Price |
|---|---|
| Additional standard user (above plan cap) | **$249/user/mo** |
| Additional capture / proposal power user | **$399/user/mo** |
| Additional office / location | **$997/mo** |
| Additional onboarding workshop | **$2,500/session** |

## 7. User and office add-ons

| Add-on | Definition | Price |
|---|---|---|
| Standard user | View, comment, contribute to assigned pursuits. No global admin. | $249/user/mo |
| Capture / proposal power user | Cross-pursuit edit rights, AI provider usage, Submission Readiness Gate run, Internal Review Export create. | $399/user/mo |
| Additional office | Separate Pursuit Profile, vendor partition, role-separation set. | $997/mo |
| Additional onboarding workshop | 4-hour live workshop, scheduled within 30 days. | $2,500/session |

**Annual discount logic:**
- Annual saves ~17% vs monthly (matches the published Solo / Operator / Operator Plus ratio).
- Annual aligns to the federal procurement budget cycle (FY ends Sep 30).

## 8. Onboarding and implementation pricing

See `phase-25j-enterprise-onboarding-support-matrix.md` for the full matrix. Summary:

| SKU | One-time fee | Audience |
|---|---|---|
| Self-Install | $1,497 | Solo / small operator |
| Guided | $3,497 | 1–3 users |
| Enterprise Onboarding (Team 5) | $7,497 | 3–5 users |
| Capture Team Deployment (Team 10) | $9,997 | 6–10 users |
| Multi-Office Deployment | $14,997–$24,997+ | 11+ users, multi-office |

Plus optional quarterly workflow review, optional admin training, optional proposal workflow setup, optional vendor/subcontractor workflow setup. Detail in the matrix doc.

## 9. Support package options

| Package | Response SLA | Channel | Included in |
|---|---|---|---|
| Self-serve | Best-effort | Help/FAQ + manual | All tiers |
| Tier 1 operator support | Business-day | Operator email | GovCon Operator and above |
| Priority operator support | Same-business-day | Operator email + scheduled call | Operator Plus and above |
| Dedicated rep | Same-business-day | Named rep + scheduled call + Slack channel where authorized | Team 10 and above |
| Tier 2 engineering | 48-hour | Operator escalates only | All tiers, escalation-only |
| Tier 3 architecture | Scheduled | Quarterly review session | Enterprise Command (included) |

## 10. Feature-value justification by tier

| Phase 22–25 feature | Solo Capture | GovCon Operator | Operator Plus | Team 5 | Capture Team 10 | Enterprise 25 | Enterprise Command |
|---|---|---|---|---|---|---|---|
| SAM Sprint | ✅ 1 NAICS | ✅ Multi-NAICS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitation Workspace (Phase 22C) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compliance Matrix (Phase 22C) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Past Performance Library (Phase 22E) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Capability Statement Studio (Phase 22E) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vendor Quote Room (Phase 22D) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pricing Worksheet (Phase 22D) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Prime Partner Finder (Phase 22E) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stakeholder Graph (Phase 24E) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submission Readiness Gate (Phase 22F) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submission Package Export | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Proposal Workspace + Markdown export (Phase 25E.2) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Proposal Workspace Word + PDF export (Phase 25I) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar module + Today's Work Plan (Phase 25H) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAR Reference + AI FAQ (Phase 25I) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAR Compliance Review (Phase 25I) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-client switching (Phase 22 OS+) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Help / FAQ + 4th-grade manual (Phase 25E.4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit Log (Phase 24B) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI provider/key controls (Phase 24L) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tenant policy / role separation | — | — | — | — | ✅ basic | ✅ standard | ✅ custom |
| Dedicated rep | — | — | — | — | ✅ | ✅ | ✅ |
| Quarterly workflow review | — | — | — | — | optional | optional | ✅ included |
| Multi-office partitioning | — | — | — | — | 1–2 | 1–3 | unlimited |
| Tier 3 architecture support | — | — | — | — | — | optional | ✅ included |

## 11. Buyer segment analysis

| # | Segment | Likely roles | Strongest features | Recommended plan |
|---|---|---|---|---|
| 1 | **Solo contractor** | Owner does everything | SAM Sprint, Daily Rhythm, Calendar, Help/FAQ | Solo Capture |
| 2 | **Owner + assistant** | Owner + admin/biz-dev | Capture Command Center, Outreach Drafts, Solicitation Workspace, FAR FAQ | GovCon Operator |
| 3 | **3-person capture team** | Capture lead + proposal writer + biz-dev | Above + Past Performance Library + Capability Studio + Pricing Worksheet + Submission Readiness | Operator Plus |
| 4 | **5-person GovCon office** | Capture + proposal manager + 1–2 writers + pricing analyst | Above + Stakeholder Graph + multi-client switching + Submission Package Export + shared Calendar | Team 5 |
| 5 | **10-person capture/proposal team** | Capture director + proposal manager + 2–3 writers + pricing + past-performance lead + contracts | Above + dedicated rep + Workflow Review (optional) + FAR Compliance Review at scale | Capture Team 10 |
| 6 | **11–25 user enterprise team** | Multi-discipline GovCon office: capture, proposal, pricing, contracts, BD | Above + tenant policy + multi-office partitioning + governance reporting | GovCon Enterprise 25 |
| 7 | **26+ multi-office org** | Distributed GovCon org with corporate parent + multi-office field teams | Above + Tier 3 architecture + custom workflows + key custody + retention policy | Enterprise Command |

Each segment carries pricing sensitivity, onboarding complexity, and support expectations documented in `phase-25j-website-enterprise-pricing-alignment.md` and `phase-25j-enterprise-onboarding-support-matrix.md`.

## 12. Website display recommendation

Public pricing card should display **five tiers**:

```
Solo Capture — $149/mo
GovCon Operator — $499/mo or $4,990/yr
Operator Plus — $997/mo or $9,970/yr
Team 5 — starts at $1,997/mo or $19,970/yr
Enterprise — custom
```

**Do NOT publish on the public site:**
- Specific Capture Team 10 / Enterprise 25 / Enterprise Command line items.
- Specific setup-fee amounts.
- Specific add-on user pricing ($249, $399).
- Specific add-on office pricing ($997/mo).
- Annual discount math.

Those are sales-led conversations; publishing them strips operator latitude to scope to the customer. See `phase-25j-website-enterprise-pricing-alignment.md` §3 for the full "do not publish" list.

## 13. Sales / quote positioning

| Stage | Action |
|---|---|
| Lead capture | Website Request Access form / Quote form |
| Qualification call | 30-min call: confirm users, offices, pursuit volume, vendor workflow, governance ask |
| Quote | Use internal quote sheet (§6) to scope; never copy/paste line items from the quote sheet into the customer email — the operator describes plan + scope + setup, then proposes one number |
| Approval | Operator signs; ARCG countersigns |
| Onboarding | Schedule per the matrix in `phase-25j-enterprise-onboarding-support-matrix.md` |
| Renewal | 90 days before renewal: operator confirms users, offices, pursuit volume; price adjusts if scope materially changed |

## 14. Risks of underpricing

| Risk | Likely cost |
|---|---|
| Team 5 priced at Operator Plus level ($997/mo) | $1,000/mo per team customer × 12 customers = $144,000/yr in left-on-table revenue |
| No setup fee on Team 5 | $7,497 × every new Team 5 = unrecovered onboarding labor |
| Add-on user priced too cheap | Customer expands to 15 users at $99/user, revenue caps at $1,485/mo — half of what a Capture Team 10 would have priced |
| Multi-office priced as "free" | Operator absorbs governance + partitioning cost without compensation |
| Enterprise Command published with a specific number | Operator loses scoping latitude; deals fail to close because the customer compares to a published number that does not reflect their scope |

## 15. Risks of overcomplicating pricing

| Risk | Likely cost |
|---|---|
| Eight public tiers on the website | Decision paralysis; conversion drops; customers fall back to GovCon Operator and never expand |
| Per-seat math published with multiple modifiers | Customers do the math, find a number they like, ignore the operator's scope conversation |
| Setup fees published as a fixed grid | Operator can't bundle setup into the annual to close a deal |
| Add-on user pricing exposed publicly | Customers buy fewer power-user seats than they should and complain about feature gates |
| Annual / monthly ratio published as a discount | Customers expect the discount everywhere; the operator loses leverage on multi-year deals |

## 16. What NOT to publish publicly

- ❌ Capture Team 10 / GovCon Enterprise 25 / Enterprise Command numbers.
- ❌ Setup fee grid ($7,497 / $9,997 / $14,997 / $24,997+).
- ❌ Add-on user prices ($249 / $399).
- ❌ Additional office price ($997/mo).
- ❌ Onboarding workshop price ($2,500).
- ❌ Annual savings math (~17% off).
- ❌ Multi-year discount commitments.
- ❌ Pilot-to-enterprise conversion offer (§9 of `phase-25j-enterprise-quote-sheet-draft.md`).

All of the above live in the operator's quote sheet (`docs/sales/phase-25j-enterprise-quote-sheet-draft.md`) and are surfaced only after a qualification call.

## 17. Final recommended model

**Public site display (5 tiers):**

```
Solo Capture — $149/mo
GovCon Operator — $499/mo or $4,990/yr
Operator Plus — $997/mo or $9,970/yr
Team 5 — starts at $1,997/mo or $19,970/yr
Enterprise — custom
```

**Internal quote sheet (4 tiers + add-ons):**

```
Team 5 — 3–5 users — $1,997/mo or $19,970/yr — $7,497 setup
Capture Team 10 — 6–10 users — $3,997/mo or $39,970/yr — $9,997 setup
GovCon Enterprise 25 — 11–25 users — starts at $6,997/mo or $69,970/yr — $14,997 setup
Enterprise Command — 26+ / multi-office — custom — $24,997+ setup

Additional standard user — $249/user/mo
Additional power user — $399/user/mo
Additional office — $997/mo
Additional onboarding workshop — $2,500/session
```

**Implementation matrix (one-time):**

```
Self-Install — $1,497
Guided — $3,497
Enterprise Onboarding — $7,497
Capture Team Deployment — $9,997
Multi-Office Deployment — $14,997–$24,997+
```

## 18. Items requiring owner approval before source-of-truth update

| # | Decision | Reason |
|---|---|---|
| 1 | Confirm Team 5 tier addition at $1,997/mo or $19,970/yr (starts at) | New public tier above Operator Plus |
| 2 | Confirm GovCon Operator repositioning from "up to 3 users" → "1–2 users" | Phase 22A-P V3 source-of-truth currently says "up to 3 users" |
| 3 | Confirm Operator Plus repositioning from "up to 5 users" → "up to 3 users" | Phase 22A-P V3 source-of-truth currently says "up to 5 users" |
| 4 | Confirm setup-fee schedule ($1,497 → $24,997+) is operator-managed only (not published) | Aligns with §16 do-not-publish list |
| 5 | Confirm add-on user prices ($249 / $399) are operator-managed only | Aligns with §16 do-not-publish list |
| 6 | Confirm add-on office price ($997/mo) is operator-managed only | Aligns with §16 do-not-publish list |
| 7 | Confirm pilot-to-enterprise conversion offer is ARCG-approval-required | Avoid undisciplined discount creep |
| 8 | Confirm `test/govcon-pricing-positioning.test.js` and Phase 22A audit doc references to "up to 3 users" / "up to 5 users" will be updated **together** in a follow-up phase | Test integrity |

Until items 1–3 receive owner approval, `docs/product/pricing-source-of-truth.md` continues to say "Operator up to 3, Plus up to 5." This phase makes the recommendation; it does not change the source of truth.

---

## Signature

This is a pricing recommendation. The pricing source-of-truth is unchanged. The website is unchanged. The Stripe configuration is unchanged. Owner review + approval determines whether items 1–8 in §18 advance to a source-of-truth update phase.

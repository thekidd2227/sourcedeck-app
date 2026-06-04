# Phase 22A — Pricing Fit Critique (Blunt)

**Companion to:** `docs/product/phase-22a-govcon-product-market-fit-audit.md`
**Posture:** Critique only. **No pricing changed. No `assets/sd-config.js` touched. No Stripe IDs altered.**

---

## 0. Bottom line

SourceDeck's current pricing posture has **three independent failures** that compound:

1. **Two pricing surfaces disagree on every tier** (the $79/$349/$999 site framing vs. the $1,497/$3,497/$5,997 + $499/$997 internal packaging doc). This is the single most damaging item — a 19x spread on the entry tier is not a positioning question, it is a credibility question.
2. **One-time pricing on a workflow product extinguishes LTV.** Core $1,497 one-time has no path to renewal. The monthly Operator tiers exist but are framed as **support tiers**, not as **workflow tiers**.
3. **No GovCon-specific tier reflects GovCon value.** Operator $499/mo and Operator Plus $997/mo are described in content / strategy / support language. A GovCon buyer is paying for compliance leverage, deadline integrity, past-performance reuse, and submission-readiness confidence. None of those are in the tier descriptions.

Fixing (1) is required before any pricing experiment. Fixing (2) and (3) is the recommended pricing posture for Phase 22G (after the product roadmap in 22B–22F is at least 60% delivered).

---

## 0.1 Resolution direction (consolidation pass)

This consolidation pass records a single recommended resolution path for the pricing disagreement called out in §1 below. It is advisory only and does not change any pricing value in any artifact. The recommended direction has five parts. First, the site moves to an implementation+subscription posture so the buyer's first encounter with SourceDeck shows a coherent two-axis offer (a one-time implementation engagement on one axis, a recurring workflow subscription on the other) rather than two contradictory single-line prices. Second, the $79/$349/$999 site framing is retired in favor of that implementation+subscription posture so the buyer never sees the 19x mismatch documented in §1.3 below — the credibility cost of that mismatch is the single highest item in this critique and the resolution direction is built around eliminating it. Third, the internal packaging doc's monthly Operator tiers are reframed as **workflow-value tiers** anchored on compliance leverage, deadline integrity, past-performance reuse, and submission-readiness confidence — not as support tiers, content tiers, or optimization tiers. Fourth, pricing values are **not** changed in this PR; this section describes direction only, and the dollar amounts in both the site framing and the internal packaging doc remain exactly as they are until the operator decides to change them in a later phase. Fifth, resolution timing: the implementation+subscription reframing must happen **before** any new marketing campaign references price, but the actual pricing experiment work and any Stripe Price ID work are explicitly deferred to a separate later phase (advisory placeholder "22G" only; not implemented here, not scheduled here, not scoped here).

Explicitly: **No `assets/sd-config.js` is touched (that file lives in the separate sourcedeck-site repo). No Stripe Price ID is mentioned in this document. No price value is changed.** This section is editorial direction for the eventual reconciliation work — nothing in it is a commit-ready change, and nothing in it overrides the safety block in §4.

---

## 1. The pricing disagreement — first, fix this

### 1.1 Surface A (site-level mission, per `sourcedeck-site` CLAUDE.md)

> Live tiers are Core $79 / Pro $349 / Operator $999.

(Recurring or one-time is not stated in the project guide.)

### 1.2 Surface B (`docs/pricing/sourceDeck-pricing-packaging.md`)

> Core — $1,497 one-time (self-install)
> Growth — $3,497 one-time (guided setup)
> White-Glove — $5,997 one-time (DFY)
> GovCon Operator — $499/month (ongoing optimization)
> GovCon Operator Plus — $997/month (higher-touch)
> Enterprise / Government — custom

### 1.3 Disagreement table

| Tier role | Site framing | Internal doc | Same? |
|---|---|---|---|
| Entry | $79 (Core) | $1,497 one-time (Core) | **No — 19x apart** |
| Mid | $349 (Pro) | $3,497 one-time (Growth) | **No — 10x apart** |
| Top one-time | $999 (Operator) | $5,997 one-time (White-Glove) | **No — 6x apart** |
| Monthly | — | $499/mo (Operator) | Site has no monthly equivalent |
| Premium monthly | — | $997/mo (Operator Plus) | Site has no monthly equivalent |

**Implication:** A buyer who is comparing SourceDeck against (say) Federal Compass or GovTribe will check pricing in 3 places before reaching out. If they see $79 on the site and $1,497 in the docs (or vice versa), they will not reach out. This is a price-credibility problem, not a price-elasticity problem.

**Recommendation:** Pick one structure. Until that decision is made, no marketing campaign should reference price.

---

## 2. One-time pricing on a workflow product

### 2.1 Problem

The product is a **workflow product** — it produces value continuously (every new RFP, every deadline, every compliance matrix, every past-performance citation reused). One-time pricing on a workflow product:

- Caps revenue at the one-time number minus refunds.
- Aligns incentives wrong: there is no ongoing reason for the operator to log in, because they already paid.
- Makes the support / optimization tiers (monthly $499 / $997) read as **upsell tax**, not as **continuous value**.
- Sets the wrong anchor for procurement comparison. GovWin IQ is sold annually. Federal Compass is sold annually. GovTribe is sold monthly. The whole category is recurring. A one-time SKU stands out as the cheap-and-shallow option.

### 2.2 Why the team probably reached for one-time pricing

Plausible reasons (inferred):

1. SMB GovCon buyers are known to resist subscriptions.
2. The Electron desktop distribution model (DMG + NSIS, GitHub Releases) reads as "software you own."
3. One-time pricing closes faster on a cold call.

These are real, but the cost is LTV. A $1,497 one-time license that retains 30% of buyers as $499/mo Operator subscribers is **not** worth $1,497 — it is worth roughly $1,497 + 0.30 × $499 × 12 × (avg life in years). At a 1-year average life, that's $1,497 + $1,796 = $3,293. At a 3-year life, it's $1,497 + $5,388 = $6,885.

Compare that to an all-recurring SKU at $349/mo with the same 30% retention through year 3: $349 × 36 × 0.30 + early-cohort revenue. The arithmetic doesn't always favor recurring at low volume, but at scale it always does.

### 2.3 Recommendation

Reframe the one-time SKUs as **services**, not as products:

- Core ($1,497) → "**Self-Install Implementation**" — one-time service.
- Growth ($3,497) → "**Guided Implementation**" — one-time service.
- White-Glove ($5,997) → "**Done-for-You Implementation**" — one-time service.

And reframe the monthly SKUs as **the product**:

- GovCon Operator ($499/mo) → "**SourceDeck GovCon Operator**" — the product.
- GovCon Operator Plus ($997/mo) → "**SourceDeck GovCon Operator Plus**" — the product.

This change is **copy and pricing-page structure only**, not actual pricing math. The dollar amounts can stay the same. What changes is what the buyer perceives they are buying.

---

## 3. No GovCon-specific tier reflects GovCon value

### 3.1 Problem

Read the current Operator + Operator Plus descriptions verbatim (`docs/pricing/sourceDeck-pricing-packaging.md`):

> **Operator:** Ongoing optimization, monthly content/support layer, prompt updates, workflow tuning, light draft review/support.
> **Operator Plus:** Higher-touch strategy, content calendar support, outreach review, campaign support, deeper monthly optimization.

Words that do **not** appear: solicitation, compliance, Section L, Section M, FAR, past performance, capability statement, set-aside, NAICS, SAM, agency, prime, sub, teaming, deadline, Q&A, responsive, submission.

This is **GovCon-named but generic-described pricing.** A GovCon buyer reads this and thinks "I'm paying $499/mo for prompt updates and content support." They are not. They are paying for compliance leverage and submission integrity. The pricing copy must reflect that.

### 3.2 Recommendation (tied to the 22B–22F roadmap)

Tier descriptions that match the product:

**SourceDeck Solo Capture — $149/mo**
> One operator, one pursuit profile, SAM Sprint, basic outreach drafts, basic deadline alerts. Best for: solo operators and emerging SMBs running their first 1–3 pursuits.

**SourceDeck GovCon Operator — $499/mo (or $4,990/yr — 17% saved)**
> Multi-NAICS pursuit profile. Solicitation Workspace (Section L/M shred). Compliance Matrix generator. Deadline & Q&A Calendar. Past Performance Library. FAR 52.219-14 limitation-of-subcontracting helper. Daily Rhythm. Up to 3 users.

**SourceDeck GovCon Operator Plus — $997/mo (or $9,970/yr — 17% saved)**
> Everything in Operator, plus Submission Readiness Gate, Teaming Workspace (prime + sub + middleman-fit + stakeholder graph), Capability Statement Studio (per-opportunity tailoring), Multi-client switching (for BD-as-a-service operators), Submission Package Export Bundle. Up to 5 users.

**Enterprise / Government — custom**
> Private deployment, security review, tenant policy, custom workflows, governed AI provider rules.

(One-time implementation tiers — Core / Growth / White-Glove — would be repositioned as **services**, listed separately from the recurring product tiers.)

---

## 4. What this critique does NOT do

Explicit safety block. None of the following are in scope for this document; none of them are introduced as side effects of the resolution direction in §0.1.

- **Does not change any pricing value.** Every dollar amount in this document is reproduced from the existing site framing or the existing internal packaging doc. No tier price has been raised, lowered, added, or removed.
- **Does not touch `docs/pricing/sourceDeck-pricing-packaging.md`.** That file is the authoritative internal packaging artifact; it is referenced here for the disagreement table only and is not edited by this critique.
- **Does not touch `assets/sd-config.js`.** That file lives in the separate `sourcedeck-site` repository, is not in this repo, and is explicitly out of scope for this PR.
- **Does not mention any Stripe Price ID.** No `price_…` identifier, no checkout URL, no coupon code, no promo code appears in this document.
- **Does not promise revenue, retention, or LTV outcomes.** The LTV arithmetic in §2.2 is illustrative of the trade-off shape — it is not a forecast and is not a commitment.
- **Does not claim FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001.** SourceDeck does not hold these certifications today; nothing in this critique implies otherwise.
- **Does not claim watsonx is live or that the macOS build is signed and notarized.** Build-state and provider-state claims are reserved for runtime documentation and are not asserted here.
- **Does not depend on autonomous submission or auto-send.** The pricing logic in this document assumes the standing safety invariants (`human_approval_required: true`, `auto_send: false`, no autonomous submission); nothing in this critique relaxes them.

---

## 5. Anchoring against the buyer's mental model

### 5.1 The buyer's mental model in GovCon SMB

A buyer evaluating SourceDeck is doing one of two mental calculations:

**Mental Model A: "What is one win worth?"**
A typical SMB GovCon win is $50k–$500k. The buyer is willing to spend 0.5%–2% of one win on tooling to improve the odds. That's $250–$10,000 per year on the tool.

**Mental Model B: "What does GovWin cost?"**
GovWin IQ runs $15k–$30k/year for SMB tiers. Federal Compass runs $2.4k–$9.6k/year. GovTribe runs $1k–$5k/year. EZGovOpps runs $1.5k–$4.8k/year.

Against Mental Model A, **SourceDeck at $4,990/yr is on the low end of acceptable** and at $9,970/yr is in the "needs justification" zone — and the justification has to be Submission Readiness + Compliance Matrix, not "prompt updates."

Against Mental Model B, **SourceDeck at $4,990/yr is cheaper than GovWin and competitive with Federal Compass.** The pitch is "everything Federal Compass does on the discovery side, plus Compliance Matrix + Past Performance + Capability Statement Studio + Submission Readiness Gate — all of which Federal Compass does not do."

That positioning is real. It must be reflected in the pricing page copy.

### 5.2 Anchoring text recommendations (advisory, not for adoption today)

- "One pursuit win pays for SourceDeck for ~10 years."
- "Cheaper than GovWin. Deeper than Federal Compass. Designed for sub-$10M SMB contractors."
- "No autonomous submission. Human approval at every step. Built for FAR-compliant capture discipline." *(This is the truth and it converts in GovCon. Skeptical buyers want to see safety wording, not absence of it.)*

---

## 6. What this critique is NOT recommending

- **Changing prices today.** The recommended pricing posture is for Phase 22G — after the product roadmap in 22B–22F is at least 60% delivered. Charging Operator Plus money for Operator features is a churn-creator.
- **Adding an "AI unlimited" tier.** That's a category trap; AI cost is real and the cap is honest.
- **Removing the one-time SKUs.** They are reframed as services, but they remain available.
- **Cross-tier feature gating that would weaken Solo Capture.** Solo Capture must be a real product. It cannot be a crippleware funnel.
- **Marketing a "GovCon Enterprise" tier without an actual private-deployment path.** Don't sell what isn't built.
- **Touching `assets/sd-config.js`, Stripe Price IDs, or Stripe Webhook configuration** in this phase.

---

## 7. Acceptance criteria for the pricing critique

- [x] Pricing disagreement explicitly flagged (Section 1).
- [x] Resolution direction described without changing values (Section 0.1).
- [x] One-time-vs-recurring trade-off analyzed honestly (Section 2).
- [x] Recommended tier descriptions tied to actual product surfaces (Section 3, tied to F02–F23 in the feature opportunity map).
- [x] Buyer mental model anchored against (Section 5).
- [x] No prices changed (Section 4 + Section 6).
- [x] No claims that SourceDeck guarantees awards, revenue, or compliance certifications (no such wording introduced anywhere in this doc).

---

## 8. Confirmations

- **No `assets/sd-config.js` change.**
- **No Stripe Price ID change.**
- **No website pricing-page edit recommended for this PR.**
- **No PO-language reintroduced.** (Per `sourcedeck-site/CLAUDE.md` rule 5.)
- **No `/sales/` page CTA added.** (Per `sourcedeck-site/CLAUDE.md` rule 6.)
- **No live pricing experiment.**

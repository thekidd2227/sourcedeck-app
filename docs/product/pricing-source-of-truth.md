# SourceDeck Pricing — Source of Truth

**Status:** Authoritative. **Phase 22A-P (2026-06).**
**Supersedes (for source-of-truth purposes):** any earlier pricing surface — public site $79 / $349 / $999, app-repo `docs/pricing/sourceDeck-pricing-packaging.md` historical baseline, app-repo `docs/pricing/sourceDeck-pricing-revaluation-2026.md` historical baseline. Those files remain in the repo as historical/baseline context. This file is the single source of truth that any new buyer-facing material (site, sales deck, quote, invoice) must align to going forward.

**Scope:** Docs only. **Does not edit payment processing. Does not edit Stripe. Does not edit checkout. Does not touch the website repo.** Website alignment is a later phase that runs in `sourcedeck-site`.

---

## 1. Approved pricing structure (V3)

### Recurring SaaS (the product)

| Tier | Monthly | Annual | Audience |
|---|---|---|---|
| **Solo Capture** | **$149 / month** | $1,490 / year | Solo operators and emerging SMBs running their first 1–3 pursuits |
| **GovCon Operator** | **$499 / month** | **$4,990 / year** | Active SMB primes and capture teams running multiple pursuits (up to 3 users) |
| **Operator Plus** | **$997 / month** | **$9,970 / year** | BD-as-a-service operators and proposal-managed shops (up to 5 users) |
| **Enterprise** | **Custom** | Custom | Private deployment, security review, tenant policy, custom workflows, governed AI provider rules |

Annual SKUs are ~17% saved versus monthly. Annual matches the federal procurement budget cycle.

### Implementation / service SKUs (one-time, optional)

| SKU | One-time | Replaces (V2) |
|---|---|---|
| **Self-Install Implementation** | **$1,497** | (V2 Core $997) |
| **Guided Implementation** | **$3,497** | (V2 Growth $2,497) |
| **DFY Implementation** | **$5,997** | (V2 White-Glove $4,997) |

Implementation SKUs are **services**, not the product. A buyer can purchase the recurring product without any service tier; a buyer who already has a dedicated capture manager does not need Guided or DFY.

---

## 2. Tier-to-product-surface mapping

These are the buyer-visible product surfaces a buyer at each tier should expect to use. They reflect Phase 22B–22G surfaces that have shipped on `main`.

### Solo Capture — $149 / month

- 1 user, 1 Pursuit Profile (1 NAICS — matches SAM Sprint Free entitlement)
- SAM Sprint (Free entitlement scope: 1 NAICS)
- Daily Rhythm tab
- Basic outreach drafts (human approval required, never auto-sent)
- Basic deadline alerts

### GovCon Operator — $499 / month

- Up to 3 users
- Multi-NAICS Pursuit Profile (paid SAM Sprint entitlement)
- **Solicitation Workspace** (Section L / M / B / C / H / K shred — Phase 22C)
- **Compliance Matrix generator** (per-requirement, human-approved — Phase 22C)
- **Past Performance Library** (reusable citations + per-opportunity tailoring — Phase 22E)
- **Deadline & Q&A Calendar** (Q&A windows + amendment alerts)
- **Capability Statement Studio** (per-opportunity tailoring — Phase 22E)
- Pre-RFP Intel cards (Sources Sought / RFI / Industry Day history)
- FAR 52.219-14 limitation-of-subcontracting helper (advisory only)
- GovCon Capture Command Center (Phase 22B)
- Vendor Quote Room (Phase 22D)
- All outreach is draft-only — never auto-sent.

### Operator Plus — $997 / month

- Up to 5 users
- Everything in GovCon Operator, plus:
- **Submission Readiness Gate** (red / yellow / green readiness score — never auto-submits — Phase 22F)
- **Submission Package Export Bundle** (final volumes + signed Section K + manifest)
- **Teaming Workspace** (Prime Partner Finder + Subcontractor Bench + Middleman-Fit Detector + Stakeholder Graph synthesized per opportunity)
- **Multi-client switching** (per-client Pursuit Profile + PP Library + capability statements + deadlines + outreach log)
- Vendor pricing worksheet (Phase 22D)
- Vendor rate-card drafter (advisory)

### Enterprise — Custom

- Private deployment
- Security review (no compliance-certification claim attached — see §5)
- Tenant policy / multi-tenant data partitioning
- Custom workflows
- Governed AI provider rules

### Implementation services

- **Self-Install ($1,497)**: install documentation + setup walkthrough access + Core workflow templates. User-led configuration.
- **Guided ($3,497)**: Self-Install plus guided GovCon Operating Profile setup, SAM / API onboarding support, basic workflow testing, walkthrough and handoff.
- **DFY ($5,997)**: full done-for-you implementation against the buyer's pursuit pipeline — business profile setup, capability statement review, NAICS / PSC / certification setup, SAM / API / AI credential onboarding support, Capture Suite setup, Outreach Agent setup, Prime Partner Finder setup, Premium Content setup, QA and handoff. DFY does **not** transfer decision authority to SourceDeck — operators still review and approve outreach, content, capture, pricing, proposal, and pursuit decisions.

---

## 3. Deprecated pricing surfaces

The following surfaces are **stale** for buyer-facing use going forward, except where explicitly retained as archived historical context:

### Public site V2 (sourcedeck-site `/pricing/index.html`, `assets/sd-config.js`, `assets/sd-i18n-dict.js`)

| V2 surface | V2 amount | V3 disposition |
|---|---|---|
| Solo (subscription) | $79 / seat / mo | **Stale.** Repositioned as Solo Capture $149 / month. |
| Team (subscription) | $349 / seat / mo | **Stale.** Repositioned as GovCon Operator $499 / month. |
| Enterprise (subscription) | From $999 / seat / mo | **Stale.** Repositioned as Operator Plus $997 / month; "Enterprise" is now a custom-quote tier above Operator Plus. |
| Core (implementation) | $997 one-time | **Stale.** Repositioned as Self-Install Implementation $1,497. |
| Growth (implementation) | $2,497 one-time | **Stale.** Repositioned as Guided Implementation $3,497. |
| White-Glove (implementation) | $4,997 one-time | **Stale.** Repositioned as DFY Implementation $5,997. |
| V1 legacy Price IDs | $49 / $149 / mo | **Grandfathered only.** Retained server-side in Stripe `STRIPE_PRICES_LEGACY` for existing subscriptions; not re-exposed in UI. |

**Operator action (in the website repo, not here):** site alignment to V3, including new Stripe Product / Price ID creation and `sd-config.js` updates, runs in a separate phase against the `sourcedeck-site` repo after the correct website remote is confirmed. Until that runs, the public site continues to display V2 amounts and existing checkouts continue to bill V2 prices. The transitional state is documented; it is not concealed.

### App-repo historical baselines (kept, not deleted)

- `docs/pricing/sourceDeck-pricing-packaging.md` — historical baseline; protected by `test/govcon-pricing-positioning.test.js` which enforces specific section structure and Operator $499/month copy. Not edited in this phase. Read it as the structural baseline; read **this** source-of-truth doc as the authoritative pricing.
- `docs/pricing/sourceDeck-pricing-revaluation-2026.md` — historical baseline; same disposition. Recurring tiers ($499 / $997 monthly + Enterprise custom) carry forward intact; the one-time tier amounts in that doc ($1,497 / $3,497 / $5,997) carry forward intact and are confirmed by V3. The Solo Capture $149 / month tier is **new** in V3 and is not in the historical baseline.

### Stale references inside historical audits

- `docs/audits/phase-22g-govcon-buyer-demo-qa.md` §2.10 references "selling at $999/month." That audit predates this source-of-truth; the reference is historical context and is **not** the approved pricing. Any new buyer demo / QA pass must cite **this** file, not §2.10 of that audit.
- `docs/product/phase-22a-govcon-product-market-fit-audit.md`, `docs/product/phase-22a-pricing-fit-critique.md`, `docs/release-notes/phase-22a-govcon-product-strategy.md`, `docs/product/phase-22a-reddit-forum-research-notes.md` reference V2 site pricing and the historical disagreement. Those files are the **Phase 22A audit record**. They flag the disagreement; this file is the **resolution**.

---

## 4. Positioning rationale

SourceDeck is **not** a generic lead tool, not a SAM.gov wrapper, not a prompt pack. Price must reflect the GovCon capture value the product actually delivers on `main` today:

- **Solicitation Workspace** — Section L / M / B / C / H / K shred bound to the actual RFP.
- **Compliance Matrix generator** — per-requirement, human-approved, the single most-cited compliance loss-driver for SMB primes.
- **Vendor Quote Room** — vendor sourcing, vendor needs, vendor pricing worksheet.
- **Past Performance Library** — reusable citations, per-opportunity tailoring.
- **Capability Statement Studio** — per-opportunity tailoring.
- **Submission Readiness Gate** — red / yellow / green readiness score; pre-submission "are we responsive?" advisory; never auto-submits.
- **Submission Package Export Bundle** — final volumes + signed Section K + manifest as a portable artifact.
- **Teaming Workspace** — Prime Partner Finder + Subcontractor Bench + Middleman-Fit Detector + Stakeholder Graph synthesized per opportunity.
- **GovCon Capture Command Center** + **Daily Rhythm** + **Deadline & Q&A Calendar** + **Pre-RFP Intel**.

That delivered surface is materially more valuable than any generic CRM, any SAM.gov wrapper, or any prompt library. V3 pricing reflects the actual delivered value.

One-time SKUs (Self-Install / Guided / DFY) support implementation. They do **not** replace the subscription. A buyer who purchases DFY still subscribes monthly or annually to the product.

### Mental-model anchors

- Typical SMB GovCon win is $50k–$500k. Willingness to spend on tooling is 0.5%–2% of one win, i.e., $250–$10,000 / year.
  - Solo Capture $149 / month = $1,788 / year → ~0.4% of a $500k win.
  - GovCon Operator $499 / month = $5,988 / year (or $4,990 annual) → ~1% of a $500k win.
  - Operator Plus $997 / month = $11,964 / year (or $9,970 annual) → ~2% of a $500k win; the justification is Submission Readiness + Teaming Workspace + Multi-client.
- Against the category: GovWin IQ runs $15k–$30k / year for SMB; Federal Compass $2.4k–$9.6k / year; GovTribe $1k–$5k / year; EZGovOpps $1.5k–$4.8k / year. V3 sits between Federal Compass and GovWin, with depth Federal Compass does not have (Compliance Matrix, Submission Readiness).

---

## 5. What this pricing does not claim

- **No guaranteed contract awards.** SourceDeck does not win contracts; it organizes pursuit workflows.
- **No guaranteed revenue.** No guaranteed outreach success.
- **No compliance certifications** — FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, ISO 27001, CUI — none are verified. Enterprise tier custom pricing reflects governance scoping work, not a certification claim.
- **No autonomous submission** to SAM, PIEE, eBuy, GSA, or any agency portal. Every output is advisory; every send / submit / quote is operator-initiated.
- **No "unlimited AI."** AI cost is real and is included within documented tier caps.
- **No live Gmail / live-inbox claim.** Response Desk import is local / manual until inbox integration is connected.
- **No watsonx-live claim.** watsonx and creative connectors are positioned as planned premium architecture where not yet implemented.
- **No signed/notarized claim** — Apple notarization and macOS signing are not asserted as part of V3 pricing positioning. Signing state is documented separately under `npm run release:mac-signing-readiness`.
- **No PO-based payment.** Invoice flow is: request → ARCG issues invoice → buyer pays via ACH / wire / check.

---

## 6. Repo alignment rule

| Concern | Source of truth |
|---|---|
| **Approved SourceDeck pricing (this repo, sourcedeck-app)** | **This file** (`docs/product/pricing-source-of-truth.md`). |
| Historical baseline (do not delete) | `docs/pricing/sourceDeck-pricing-packaging.md` (test-protected), `docs/pricing/sourceDeck-pricing-revaluation-2026.md`. |
| Public website pricing (sourcedeck-site) | **Not edited from this repo.** Site alignment to V3 is a later, separate phase running in `sourcedeck-site` against the correct website remote. Until then, the site continues to display V2 amounts; the transitional state is openly documented in §3 of this file. |
| Stripe Products / Prices | **Operator-managed in the Stripe dashboard.** New Price IDs at V3 amounts ($149 / $499 / $997 monthly + $1,490 / $4,990 / $9,970 annual) must be created in Stripe before site alignment can flip self-serve checkout to V3. V1 / V2 legacy Price IDs remain valid for grandfathered subs. |
| Quote / invoice flow | Continues to use existing `/quote/operator/` and `/quote/pro/` interim pages until site alignment phase. CTAs are sales-led; no auto-payment is added. |

---

## 7. Acceptance criteria for Phase 22A-P (this phase)

- [x] `docs/product/pricing-source-of-truth.md` created (this file) with V3 approved structure, V2 deprecation table, and repo-alignment rule.
- [x] `docs/product/phase-22a-pricing-fit-critique.md` updated with the resolution outcome (V3 chosen).
- [x] `docs/release-notes/phase-22a-pricing-source-of-truth.md` created.
- [x] No edits to `sourcedeck.html` (verified — runtime contains no active visible pricing copy).
- [x] No edits to `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `package.json`, `.env`, or the website repo.
- [x] No edits to `docs/pricing/sourceDeck-pricing-packaging.md` (protected by `test/govcon-pricing-positioning.test.js`).
- [x] No edits to `docs/pricing/sourceDeck-pricing-revaluation-2026.md` (historical baseline).
- [x] No Stripe Price ID rotation. No checkout. No payment processing change.
- [x] No deploy. No outreach. No emails. No bid / quote / proposal submission.
- [x] No compliance certification claim added.
- [x] All Phase 22B–22G runtime surfaces and tests remain intact.

---

## 8. Next phase

**Phase 22B and beyond** may proceed only after this pricing source-of-truth doc lands on `main`. The Phase 22B–22G surfaces are already shipped; what this phase resolves is the pricing-credibility blocker the Phase 22A audit flagged. Once `main` has this file, any new pricing-referencing material (sales deck, demo script, sample-customer case study, vendor outreach) must cite **this file** as the authority.

A separate **website alignment phase** runs in `sourcedeck-site` against the correct website remote. It is out of scope for this app-repo PR.

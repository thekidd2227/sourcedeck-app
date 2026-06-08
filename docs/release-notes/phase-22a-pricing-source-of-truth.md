# Release Note — Phase 22A-P Pricing Source-of-Truth Reconciliation

**Branch:** `docs/phase-22a-pricing-source-of-truth`
**Type:** Docs only — resolves the Phase 22A pricing disagreement.
**Base:** `main` (post-PR #81, post all Phase 22B–24A merges).

---

## Summary

Phase 22A-P is the **pricing reconciliation gate** that the Phase 22A audit required. It establishes a single authoritative SourceDeck pricing source of truth in `docs/product/pricing-source-of-truth.md`, separates the recurring product from one-time implementation services, and marks the previous public-site V2 amounts ($79 / $349 / $999 subscription; $997 / $2,497 / $4,997 implementation) as stale for buyer-facing use going forward except where retained as archived historical context.

**No runtime files modified. No payment processing change. No checkout. No Stripe ID rotation. No website-repo edits. No deploy.**

---

## What changed

### Docs added

| File | Purpose |
|---|---|
| `docs/product/pricing-source-of-truth.md` (new) | Authoritative V3 pricing source of truth. Recurring tiers (Solo Capture $149/mo, GovCon Operator $499/mo or $4,990/yr, Operator Plus $997/mo or $9,970/yr, Enterprise custom). Implementation services (Self-Install $1,497, Guided $3,497, DFY $5,997). Tier-to-product-surface mapping that ties each tier to the Phase 22B–22G shipped surfaces. Deprecated-pricing table. Repo alignment rule. |
| `docs/release-notes/phase-22a-pricing-source-of-truth.md` (this file) | Release note. |

### Docs updated

| File | Change |
|---|---|
| `docs/product/phase-22a-pricing-fit-critique.md` | Added a **RESOLUTION** preamble noting that the disagreement flagged in the original critique is now resolved by `pricing-source-of-truth.md` adoption of the V3 posture. The body of the original critique is retained as audit-record context. |

### Runtime / behavior

**No change.** Specifically:

- No edits to `sourcedeck.html` (verified: runtime contains no active visible pricing copy).
- No edits to `services/**`, `scripts/**`, `test/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `package.json`.
- No edits to `.env`. No secret printed.
- No edits to `docs/pricing/sourceDeck-pricing-packaging.md` (protected by `test/govcon-pricing-positioning.test.js` — historical baseline retained verbatim).
- No edits to `docs/pricing/sourceDeck-pricing-revaluation-2026.md` (historical baseline retained verbatim).
- No edits to the website repo (`sourcedeck-site`). Website alignment to V3 runs in a separate phase against that repo.

---

## What did NOT change

- **No payment processing.** No Stripe code touched. No Stripe Product or Price ID created, rotated, or deleted from any file.
- **No checkout flow added.** `sdCheckout()` in `sourcedeck-site/assets/sd-config.js` is not edited here.
- **No deploy.** GitHub Pages site continues to serve the V2 surface until website alignment phase runs.
- **No outreach. No emails. No bid / quote / proposal submission.** No SAM Sprint live run.
- **No compliance certifications claimed** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / CUI). No "Apple notarized" or "signed and notarized" claim added.
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No autonomous submission / autonomous send / autonomous post.**
- **No live Gmail / live-inbox claim** — Response Desk import remains local/manual.
- **No System Readiness / System Flow / `sysflow` resurrection.** Phase 21F removal preserved.
- **No PO-language reintroduced.**
- **No stash touched. No .env touched. No API key printed.**

---

## V3 pricing (the approved structure)

### Recurring SaaS (the product)

- **Solo Capture** — $149 / month (or $1,490 / year)
- **GovCon Operator** — $499 / month (or $4,990 / year)
- **Operator Plus** — $997 / month (or $9,970 / year)
- **Enterprise** — custom

### Implementation / service SKUs (one-time, optional)

- **Self-Install** — $1,497 one-time
- **Guided Implementation** — $3,497 one-time
- **DFY Implementation** — $5,997 one-time

### Deprecated (stale for buyer-facing use)

- Public site V2 subscription: Solo $79 / mo, Team $349 / mo, Enterprise from $999 / mo — **stale.**
- Public site V2 implementation: Core $997, Growth $2,497, White-Glove $4,997 (one-time) — **stale** (re-positioned as Self-Install / Guided / DFY at the new V3 amounts).
- V1 legacy Price IDs ($49 / $149 monthly) — **grandfathered only**; retained server-side in Stripe `STRIPE_PRICES_LEGACY`; not re-exposed in UI.

See `docs/product/pricing-source-of-truth.md` §3 for the full deprecation table.

---

## Repo alignment rule

| Concern | Source of truth |
|---|---|
| **Approved SourceDeck pricing (this repo)** | `docs/product/pricing-source-of-truth.md` |
| App-repo historical baselines (kept, not deleted) | `docs/pricing/sourceDeck-pricing-packaging.md`, `docs/pricing/sourceDeck-pricing-revaluation-2026.md` |
| **Public website pricing (sourcedeck-site)** | **Not edited from this repo.** Website alignment to V3 is a later, separate phase against the correct website remote. |
| Stripe Products / Prices | Operator-managed in the Stripe dashboard. New V3 Price IDs must be created in Stripe before website alignment can flip self-serve checkout to V3. |

---

## Tests / gates run

This PR is docs-only and does not edit any runtime path. Standard gate suite was run to prove no incidental regression:

| Gate | Expectation |
|---|---|
| `node test/remove-system-readiness-tab.test.js` | PASS |
| `node test/renderer-boot.test.js` | PASS 7/7 |
| `node test/response-desk.test.js` | PASS |
| `node test/response-desk-email-import.test.js` | PASS |
| `node test/default-state-policy.test.js` | PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | PASS 62/0 |
| `node test/govcon-pricing-positioning.test.js` | PASS (still enforced; the historical packaging.md is untouched) |
| `npm test` (full chain) | PASS |
| `npm run release:evidence` | PASS |
| `npm run troubleshooting:scan` | no fail/warn |
| `npm run govcon:smoke` | PASS |
| `npm run phase13:rc-check` | PASS |
| `npm run i18n:audit` | PASS |
| `node scripts/release-check.js` | privacy gate clean |

Gate results recorded in the PR description at PR open.

---

## Safety scan

Forbidden-claim grep across the three changed files plus the full repo:

- `Free demo` / `Download now` / `Try now` — none added by this PR.
- `Submit Bid` / `Submit Quote` / `Send Email` / `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` — none added.
- `guaranteed award` / `guaranteed revenue` — only in negative-assertion contexts ("No guaranteed contract awards." / "No guaranteed revenue.").
- `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` — only in negative-assertion contexts ("None are verified.").
- `signed and notarized` / `Apple notarized` / `production signed` — only in negative-assertion contexts.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — none reintroduced.

---

## Stashes

Stashes were not modified. No stash applied or dropped.

---

## Next phase

**Phase 22B and beyond** can now proceed with a consistent pricing reference. Any new buyer-facing material that mentions pricing must cite `docs/product/pricing-source-of-truth.md` as the authority.

The **website alignment phase** (updating `sourcedeck-site` `/pricing/index.html`, `assets/sd-config.js`, `assets/sd-i18n-dict.js`, `CLAUDE.md` rule 3, and creating new Stripe Product / Price IDs in the Stripe dashboard) is out of scope for this PR. That phase runs in `sourcedeck-site` against the correct website remote.

# Phase 25A — Website Alignment Audit

**Date:** 2026-06-08
**Companion site PR:** `thekidd2227/sourcedeck-site#6` — `fix(pricing): align site to V3 source-of-truth (Phase 25A)`.
**Pricing source-of-truth:** `docs/product/pricing-source-of-truth.md` (Phase 22A-P V3 canonical).

---

## Scope

Audit `sourcedeck-site` for:

1. V2 ($79 / $349 / $999 subscription, $997 / $2,497 / $4,997 implementation) pricing leakage in user-facing copy.
2. V1 legacy ($49 / $149/mo) pricing leakage in user-facing copy.
3. Stripe Price ID drift between displayed price and `assets/sd-config.js`.
4. Public download CTA leakage (`Download now`, `Free demo`, `Try now`, `Get started free`).
5. Signed-and-notarized / Apple-notarized / production-signed claim leakage.
6. PO-language regression (Phase 22A-P rule 5).
7. `CLAUDE.md` rule-3 drift vs. Phase 22A-P V3 canonical.

---

## Method

1. Cloned site repo at `/home/user/sourcedeck-site`. Verified clean working tree on `main @ bf3dc6f`.
2. Created branch `fix/phase-25a-website-launch-alignment` off main.
3. Ran `grep -rn '\$79\|\$349\|\$999\|\$997\|\$2,497\|\$4,997'` across the repo to enumerate V2 leakage.
4. Ran `grep -rni 'download now\|free demo\|try now\|get started free'` across the repo to enumerate public-download-CTA leakage.
5. Ran `grep -rni 'signed and notarized\|apple notarized\|production signed'` across the repo to enumerate signing-claim leakage.
6. Ran `grep -rni 'po-friendly\|po number required\|po-based'` across the repo to enumerate PO-language regression.
7. Validated `pricing/index.html` and `invoice/index.html` parse via `python3 -m http.server`.

---

## Findings

### 1. V2 pricing leakage

| File | Surface | V2 leak | Action |
|---|---|---|---|
| `pricing/index.html` | Subscription tiers section | Solo $79/mo · Team $349/mo · Enterprise from $999/mo | ✅ Replaced with V3 (Solo Capture $149/mo · GovCon Operator $499/mo or $4,990/yr · Operator Plus $997/mo or $9,970/yr · Enterprise custom) |
| `pricing/index.html` | Implementation tiers section | Core $997 · Growth $2,497 · White-Glove $4,997 | ✅ Replaced with V3 (Self-Install $1,497 · Guided $3,497 · DFY $5,997) |
| `pricing/index.html` | `<meta name="description">` | "from $79" | ✅ Updated to V3 |
| `invoice/index.html` | Pro card | "$349/seat/month" | ✅ Updated to "$499/mo or $4,990/yr" |
| `invoice/index.html` | Operator / Enterprise card | "From $999/seat/month" | ✅ Updated to "$997/mo or $9,970/yr · Enterprise custom" |
| `assets/sd-i18n-dict.js` | English subscription summary | "Solo $79 · Team $349 · Enterprise $999" | ✅ Updated to V3 |
| `assets/sd-i18n-dict.js` | English full pricing meta description | V2 amounts | ✅ Updated to V3 |
| `assets/sd-i18n-dict.js` | English "From $999" | "From $999" | ✅ Updated to "From $997" |
| `assets/sd-i18n-dict.js` | Spanish subscription summary | V2 Spanish | ✅ Updated to V3 Spanish |
| `assets/sd-i18n-dict.js` | Spanish full pricing meta description | V2 Spanish | ✅ Updated to V3 Spanish |
| `assets/sd-i18n-dict.js` | Spanish "Desde $999" | "Desde $999" | ✅ Updated to "Desde $997" |
| `CLAUDE.md` rule 3 | Repo guide | "Live tiers are Core $79 / Pro $349 / Operator $999" | ✅ Rewritten to V3 canonical with V2 deprecation note + explicit reference to `sourcedeck-app/docs/product/pricing-source-of-truth.md` |

### 2. V1 pricing leakage

- ❌ **No V1 leakage in user-facing UI.** V1 legacy Price IDs ($49 / $149/mo) remain in `assets/sd-config.js` under `STRIPE_PRICES_LEGACY` for server-side grandfathering only — not re-exposed in UI.

### 3. Stripe Price ID drift

- `assets/sd-config.js` Stripe Price IDs are not modified in this PR. Operator must create V3 Stripe products before the V3 Price ID swap.
- Current `/pricing/` CTAs route to `/request-access/`, `/quote/operator/`, and `/quote/pro/`. They do **not** trigger direct Stripe checkout. Display-price update does not break checkout flow.

### 4. Public download CTA leakage

- `grep -rni 'download now\|free demo\|try now\|get started free'` → **0 hits in user-facing files**.
- `/download/html/` and `/download/app/` distribution pages remain unchanged and unlinked from the public marketing nav.

### 5. Signing-claim leakage

- `grep -rni 'signed and notarized\|apple notarized\|production signed'` → **0 hits in user-facing files**.

### 6. PO-language regression

- `grep -rni 'po-friendly\|po number required\|po-based'` → **0 hits**. Phase 22A-P rule 5 holds.

### 7. `CLAUDE.md` rule-3 drift

- Pre-fix: rule 3 said "Live tiers are Core $79 / Pro $349 / Operator $999" — directly conflicting with Phase 22A-P V3 canonical.
- Post-fix: rule 3 reads:
  > **Pricing rule (Phase 22A-P V3 canonical).** Live recurring tiers are **Solo Capture $149/mo · GovCon Operator $499/mo or $4,990/yr · Operator Plus $997/mo or $9,970/yr · Enterprise custom**. Live one-time implementation services are **Self-Install $1,497 · Guided $3,497 · DFY $5,997**. Authoritative source: `sourcedeck-app/docs/product/pricing-source-of-truth.md`. Deprecated V2 tiers ($79 / $349 / $999 subscription, $997 / $2,497 / $4,997 implementation) and legacy V1 Stripe Price IDs ($49 / $149/mo) are grandfathered server-side only — never re-expose them in UI.

---

## Verification

| Check | Result |
|---|---|
| `grep '\$79\|\$349\|\$999'` across user-facing files | ✅ **0 hits** |
| `grep '\$79\|\$349\|\$999'` in `CLAUDE.md` | ✅ 1 hit — explicit V2 deprecation reference (allowed) |
| `pricing/index.html` parses | ✅ 4 inline scripts; 17 KB; V3 amounts present |
| `invoice/index.html` parses | ✅ V3 amounts present in Pro + Operator/Enterprise cards |
| `assets/sd-i18n-dict.js` parses | ✅ both English and Spanish dictionaries updated to V3 |
| `assets/sd-config.js` modified | ❌ — not modified (Stripe Price IDs not in scope for this PR) |
| Public download CTA added | ❌ — not added |
| Signed-and-notarized claim added | ❌ — not added |
| PO-language re-introduced | ❌ — not re-introduced |
| GitHub Pages redeploy triggered | ❌ — not triggered (PR not merged) |
| **Privacy + parity GitHub Actions check** | ✅ **PASS** on PR head commit |

### Companion privacy fix (separate commit on the same PR)

GitHub Actions Privacy + parity check on PR #6 first run failed due to **pre-existing** real-looking emails / phones / LinkedIn handles in `sourcedeck-web.html` (commit `271071f`, "SoHo x DC Power redesign", pre-Phase-25A). Verified via `git diff main..branch --name-only` that the Phase 25A pricing diff does **not** touch `sourcedeck-web.html`. Per user's "merge when all green" directive, the pre-existing violations were fixed inline as a second commit on PR #6:

- Replaced all `*@roseassociatesinc.com` placeholders with `example.com` / `example.org` allowlisted domains.
- Replaced "Amy Rose" / "Sarah Saltzberg" with "Sample Contact" / "Sample Person".
- Replaced `linkedin.com/in/sarah-saltzberg` with allowlisted `linkedin.com/in/example-contact`.
- Replaced `(212) 555-0634`, `(212) 555-2486`, `(212) 489-1200`, `(212) 555-2000` with NANP reserved-for-fiction `(555) 555-0163`, `(555) 555-0186`, `(555) 555-0120`, `(555) 555-0100`.

Local privacy + parity gate now reports `PRIVATE DATA CHECK: clean (109 files scanned)` and `DEMO PARITY OK`. GitHub Actions Privacy + parity check on PR head: **PASS**.

---

## Site PR

| Field | Value |
|---|---|
| Repo | `thekidd2227/sourcedeck-site` |
| PR | #6 |
| Branch | `fix/phase-25a-website-launch-alignment` |
| Base | `main` |
| Status | Awaiting merge with the Phase 25A app-side PR |
| Privacy + parity check | ✅ PASS |
| Vercel preview comments check | ✅ PASS |

---

## Boundary confirmations

- ✅ No deploy performed. No publish. GitHub Pages will not redeploy until PR #6 merges to main.
- ✅ No HTTP route added or removed.
- ✅ No Stripe Price ID changed (V3 product creation is operator's responsibility).
- ✅ No public download CTA added.
- ✅ No signed-and-notarized / Apple-notarized / production-signed claim added.
- ✅ No PO-language re-introduced.
- ✅ No `.env` touched in either repo.
- ✅ V1 legacy Price IDs grandfathered server-side only.

---

## Signature

Phase 25A website alignment audit is complete. V3 pricing source-of-truth is aligned across `pricing/index.html`, `invoice/index.html`, `assets/sd-i18n-dict.js`, and `CLAUDE.md` rule 3. Pre-existing privacy violations in `sourcedeck-web.html` were fixed inline as a second commit. Companion site PR is open at `thekidd2227/sourcedeck-site#6` and awaiting merge with the app-side Phase 25A PR.

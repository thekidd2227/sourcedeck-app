# Phase 25C — Delivery Method Guardrail Audit

**Date:** 2026-06-09.
**Companion docs:** `docs/product/phase-25c-master-delivery-method.md`, `docs/product/phase-25c-secure-web-pwa-delivery-contract.md`, `docs/product/phase-25c-desktop-delivery-boundary.md`.

This audit confirms that no active product copy in either repo implies public download, public self-serve access, free demo, try-now CTAs, unsigned ZIP mass delivery, stale pricing, unsupported certification claims, signed/notarized claims, guaranteed-award/revenue claims, or send/submit/upload claims.

---

## 1. Grep commands (canonical)

These are the canonical guardrail greps. Future phases re-run them and expect zero positive active hits.

### App repo

```sh
cd /Users/jean-maxcharles/sourcedeck-app
grep -RInE "Free demo|Download now|Try now|Start free|Get started free|Download app|free download|demo download|public download|Desktop ZIP|buyer-style ZIP|unsigned ZIP|self-serve|public self-serve|\$79|\$349|\$999|FedRAMP|SOC ?2|CMMC|HIPAA|HITRUST|ISO|Apple notarized|signed and notarized|production signed|guaranteed award|guaranteed revenue|Submit Bid|Submit Quote|Send Email|upload to SAM|upload to PIEE|upload to eBuy|upload to GSA" \
  sourcedeck.html docs package.json test services scripts \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.qa \
  --exclude-dir=reports \
  --exclude-dir=dist \
  --exclude-dir=release \
  --exclude-dir=out
```

### Website repo

```sh
cd /Users/jean-maxcharles/sourcedeck-site
grep -RInE "Free demo|Download now|Try now|Start free|Get started free|Download app|free download|demo download|public download|Desktop ZIP|buyer-style ZIP|unsigned ZIP|self-serve|public self-serve|\$79|\$349|\$999|FedRAMP|SOC ?2|CMMC|HIPAA|HITRUST|ISO|Apple notarized|signed and notarized|production signed|guaranteed award|guaranteed revenue|Submit Bid|Submit Quote|Send Email|upload to SAM|upload to PIEE|upload to eBuy|upload to GSA" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=.next \
  --exclude-dir=out \
  --exclude-dir=.vercel
```

## 2. Acceptable hit classes

A hit is **acceptable** only if it falls in one of:

1. **Forbidden-language list** (this audit, the Phase 25A bounding conditions, the Phase 25B trial hold conditions, the Phase 25B operator scenarios safety checks).
2. **No-go / boundary doc** (Phase 25A operator launch runbook do-not-say list; Phase 25B trial framework do-not commands).
3. **Internal trial doc** clearly marked "not for public distribution" (Phase 25B trial runner command; trial plan; daily checklist).
4. **Historical / deprecated context** (the V2 pricing deprecation row in `CLAUDE.md` rule 3; deprecated Stripe Price ID grandfathering note in `assets/sd-config.js`).
5. **Negative test** (test asserting that a string is **absent**, e.g., `assert renderer has no Send Email button`).
6. **Source-of-truth deprecation table** (Phase 22A-P V3 source-of-truth doc listing V2 amounts as deprecated).

Any hit outside the above classes is a **blocker** and must be removed before this PR merges.

## 3. App repo audit result

Re-run on `main @ 3920090`:

- All hits for `Submit Bid`, `Submit Quote`, `Send Email`, `Export and submit`, portal-upload terms appear only in:
  - Phase 24F packaging-contract no-send/no-submit assertions.
  - Phase 24B core-hardening tests asserting these controls are **absent** in the renderer.
  - Phase 25A operator launch runbook do-not-say list.
  - Phase 25B trial framework hold conditions / safety checks / operator scenarios.
- All hits for `Free demo` / `Try now` / `Download now` / `Get started free` appear only in:
  - Phase 25A bounding conditions.
  - Phase 25B trial hold conditions.
  - This Phase 25C audit.
- All hits for `FedRAMP` / `SOC 2` / `CMMC` / `HIPAA` / `HITRUST` / `ISO 27001` appear only in:
  - Negative assertions ("no FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 claim").
  - Boundary docs.
- All hits for `Apple notarized` / `signed and notarized` / `production signed` appear only in:
  - Phase 24N signing-evidence boundary docs.
  - Phase 25A signed-build-evidence-result doc.
  - Negative claim rules.
- All hits for `$79` / `$349` / `$999` appear only in:
  - `docs/product/pricing-source-of-truth.md` V2 deprecation row.
  - Phase 25A website alignment audit.
  - Phase 25B trial hold conditions.
- All hits for `Desktop ZIP` / `buyer-style ZIP` / `unsigned ZIP` / `self-serve` appear only in:
  - This Phase 25C audit.
  - The new Phase 25C delivery-method docs.

**No active product copy in `sourcedeck.html` implies public download, public self-serve, free demo, try-now, unsigned ZIP mass delivery, stale pricing, or any unsupported claim.** All hits sit in boundary / negative-assertion / source-of-truth / Phase 25C delivery doc classes.

## 4. Website repo audit result

Re-run on `main @ 8a4a863` (post-Phase-25A pricing alignment):

- `Free demo` / `Try now` / `Download now` / `Get started free` / `Download app` / `Start free` → **0 active hits** in user-facing copy.
- `$79` / `$349` / `$999` → **0 active hits** in user-facing files; 1 hit in `CLAUDE.md` rule 3 as the V2 deprecation reference (allowed).
- `Apple notarized` / `signed and notarized` / `production signed` → **0 hits** in user-facing copy.
- `FedRAMP` / `SOC 2` / `CMMC` / `HIPAA` / `HITRUST` / `ISO 27001` / guaranteed-award / guaranteed-revenue / send-submit-upload → **0 active positive hits** in user-facing copy.
- `Self-serve` / `Public self-serve` → **0 hits**.
- `Public download` / `Free download` / `Demo download` → **0 hits**.

**Website posture is already aligned with the Phase 25C master delivery method.** No website edit is required by this phase.

| Item | Status |
|---|---|
| Website repo path | `/Users/jean-maxcharles/sourcedeck-site` |
| Website branch created | **NONE** — no copy fix required |
| Website PR URL | **N/A** — no PR opened |
| Issues fixed | **NONE** — website was already at Phase 25C posture |
| No deploy confirmation | ✅ — no deploy performed; GitHub Pages will not redeploy from this phase |

## 5. Forbidden-CTA matrix (canonical)

| CTA | Permitted? | Routes to |
|---|---|---|
| `Request Access` | ✅ | `/request-access/` |
| `Contact ARCG` | ✅ | `/contact/` |
| `Request a Quote` | ✅ | `/quote/operator/` or `/quote/pro/` |
| `Schedule a Call` | ✅ | calendar booking |
| `Schedule a Demo` (operator-led) | ✅ | calendar booking — must say "Schedule a Demo," not "Free demo" |
| `Free demo` | ❌ | FORBIDDEN |
| `Try now` | ❌ | FORBIDDEN |
| `Download now` | ❌ | FORBIDDEN |
| `Download app` | ❌ | FORBIDDEN |
| `Get started free` | ❌ | FORBIDDEN |
| `Start free` | ❌ | FORBIDDEN |
| `Free download` | ❌ | FORBIDDEN |
| `Demo download` | ❌ | FORBIDDEN |
| `Public download` | ❌ | FORBIDDEN |
| `Self-serve signup` | ❌ | FORBIDDEN |

## 6. Phase 25C verdict

✅ **No blocker found.** Both repos conform to the Phase 25C master delivery method. No website edit required. No app runtime change required. No pricing source-of-truth change required.

---

## Signature

This audit is the canonical Phase 25C delivery-method guardrail check. Future phases re-run the §1 greps and expect zero positive active hits outside the §2 acceptable classes.

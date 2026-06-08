# Phase 24J-PREP — Public Release No-Go Boundaries

**Date:** 2026-06-08
**Posture:** Docs only. Governs what may and may not be claimed/released at each stage. **No runtime / pricing / website change.**
**Companions:** `docs/audits/phase-24j-final-rc-evidence-binder.md`, `docs/product/phase-24f-release-candidate-packaging-contract.md`.

---

## 1. Controlled buyer demo

**Status: GO** — after Phase 24I merges **and** the final RC hardening §3 gate suite passes on current `main`.

Conditions:
- Sample/demo data only; no live private data.
- No live SAM run unless explicitly dry-run and authorized.
- Operator can clearly state the no-send / no-submit boundary.
- SAM API key (if used) is configured in Settings only.

## 2. Limited paid pilot

**Status: GO** — after **all** of:
- Phase 24I merged.
- Final RC hardening merged (full gate suite green on current `main`).
- Onboarding / support docs accepted (`phase-24j-limited-paid-pilot-handoff.md`, `phase-24f-support-onboarding-contract.md`).
- Buyer receives a clear **no-send / no-submit / no-upload** boundary.
- **No public signing / notarization claims** are made (unsigned dev build posture).

## 3. Public signed macOS release

**Status: NO-GO** — remains NO-GO unless **all** of:
- Apple signing / notarization readiness passes.
- Release evidence references signed / notarized artifacts.
- `npm run release:evidence:strict` exits 0, **if** that script is available.
- All public claims are evidence-backed.

Current state: `scripts/release-check.js` reports macOS signing/notarization **not configured** in this environment. Do **not** claim "signed and notarized", "Apple notarized", or "production signed" for current builds.

## 4. Present-tense watsonx live claim

**Status: NO-GO** — remains NO-GO unless **all** of:
- watsonx runtime evidence is `verified_ready`.
- Evidence is redacted / presence-only (no secrets, no raw payloads).
- Claim copy is approved.

Until then, use future/conditional framing only; do not state a present-tense "watsonx is live" claim.

## 5. Website / public marketing

**Status: SEPARATE** — handled in the `sourcedeck-site` repo, not this repo. Constraints when it proceeds:
- No "free demo" / "download now" / "try now" claims.
- **Request-access / contact posture only.**
- No unsupported compliance claims (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- No stale pricing (`$79` / `$349` / `$999`); align to `docs/product/pricing-source-of-truth.md`.
- No autonomous-submission / award-guarantee language.

---

## Summary matrix

| Stage | Status | Gate |
|---|---|---|
| Controlled buyer demo | **GO** (conditional) | Phase 24I + final RC gates pass |
| Limited paid pilot | **GO** (conditional) | 24I + RC hardening merged + onboarding accepted + boundary communicated + no signing claims |
| Public signed macOS release | **NO-GO** | signing/notarization evidence required |
| Present-tense watsonx live claim | **NO-GO** | `verified_ready` evidence required |
| Website / public marketing | **SEPARATE** | `sourcedeck-site` phase; request-access posture |

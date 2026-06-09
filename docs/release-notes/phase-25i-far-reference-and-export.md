# Phase 25I — FAR Reference + Proposal Export

**Phase:** 25I — GovCon FAR Reference + FAR AI FAQ + Compliance Upload Review + Proposal Export DOCX/PDF.
**Date:** 2026-06-09.
**Branch:** `feat/phase-25i-far-reference-and-export` (stacked on `feat/phase-25h-calendar-module`).
**Base:** `main @ d34b6e1` + Phase 25H commit `c532164`.
**Companion contract:** `docs/product/phase-25i-far-reference-contract.md`.
**Companion FAQ contract:** `docs/product/phase-25i-far-ai-faq-source-grounding.md`.
**Companion upload boundary:** `docs/product/phase-25i-far-upload-review-boundary.md`.
**Companion export contract:** `docs/product/phase-25i-proposal-export-contract.md`.
**Companion audit:** `docs/audits/phase-25i-far-reference-safety-audit.md`.

---

## What this phase delivered

A new **FAR Reference** section inside the GovCon workspace plus two additional Proposal Workspace export formats (Word + PDF).

### FAR Reference (4 panels inside GovCon)

| Panel | Purpose |
|---|---|
| **FAR Browse · Reference Links** | Search input + `Open FAR on Acquisition.gov` + `Regulations Search` deep-links. acquisition.gov is the source of truth — SourceDeck does not ship a versioned local FAR cache. |
| **FAR AI FAQ** | Question + context + pasted FAR source text. Source-grounded prompt routes through the user-configured AI provider (Phase 24L credential boundary). Refuses to fabricate FAR text when no source is provided. Citations panel extracts `FAR Part/Subpart/Section` references. |
| **FAR Compliance Review (Upload)** | File picker (.txt/.md extract locally; .pdf/.docx/.png/.jpg/.webp → paste-text fallback). Review-type selector with 6 canonical reviews. Advisory-only output with 5 mandatory sections. |
| **Saved FAR Notes** | Local list of `far-faq` notes saved via "Copy as Internal Note" in the FAQ panel. Each note carries link fields for solicitation / proposal section / compliance matrix row / vendor agreement. |

### Proposal Workspace export

Phase 25E.2's existing Markdown export is preserved. Phase 25I adds two more buttons:

| Button | Implementation |
|---|---|
| Export Internal Review Draft (Word) | `Blob` with `application/msword` MIME + `.doc` extension. Word/Office/LibreOffice opens it correctly. Zero-dependency. |
| Export Internal Review Draft (PDF) | New window with print-styled HTML + `window.print()`. Operator picks "Save as PDF" in the browser dialog. Zero-dependency. |

Both exports cover all 13 canonical Phase 25E.2 sections and carry the canonical Phase 25A disclaimer in the body.

## What did NOT change

- Phase 25A no-send / no-submit / no-upload posture (verified).
- Phase 25C master delivery method.
- Phase 25D approved brand mark.
- Phase 25E.2 Proposal Workspace 13-section schema, 5-state status machine, and Markdown export.
- Phase 25F Outreach defaults + GovCon section nav + buyer-safe navigation sentinel.
- Phase 25H Calendar module (this PR is stacked on top of it).
- `package.json` dependencies. **Zero new dependencies added.** Phase 25I ships entirely from the inline renderer + the existing AI bridge.
- `services/**`, `scripts/**`, `main.js`, `preload.js`.
- Pricing source-of-truth.
- The Phase 23C "every commercial nav button + pane remains in the DOM" invariant.

## No legal advice. No certified compliance. No new mandatory API key.

Every FAR AI panel reproduces the canonical safety language:

> SourceDeck provides internal review support only. This is not legal advice. Verify against the current solicitation and acquisition.gov FAR text before relying on it.

The compliance review prompt explicitly forbids `certified compliant` / `legally sufficient` / `FAR certified` phrasing and mandates advisory-only language (`appears aligned` / `potential issue` / `requires review`).

Phase 25I does not introduce a new mandatory FAR-specific API key. The FAR AI FAQ uses the same user-configured AI provider key (OpenAI / Anthropic / IBM) that powers the existing Phase 24L surfaces.

## Test / gate results

| Command | Result |
|---|---|
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy clean; signing env MISSING (expected) |
| 4 Phase 25I sentinels (34 assertions) | ✅ all PASS |
| Phase 25H sentinels (preserved) | ✅ 38/38 PASS |
| Phase 25F sentinel (preserved) | ✅ 8/8 PASS |

## Safety / boundary confirmations

- ✅ No tabs/panes removed; no `data-tab` IDs renamed.
- ✅ No `<section>` IDs renamed; new section `gc-far-reference` is additive.
- ✅ No Send Email / Submit Bid / Submit Quote / portal-upload control introduced.
- ✅ No signed/notarized / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `certified compliant` / `legally sufficient` / `FAR certified` / `agency-ready` / `final proposal` claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying email or string in the renderer.
- ✅ No `.env` / payment / Stripe / checkout / services / scripts / website / pricing-source change.
- ✅ **Zero new dependencies** in `package.json`.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / media / `.qa/` committed.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method preserved.
- ✅ Phase 25D approved brand mark preserved.
- ✅ Phase 25E.1 – 25E.8 invariants preserved.
- ✅ Phase 25F invariants preserved.
- ✅ Phase 25H invariants preserved (this PR stacks on top of Phase 25H).

## Status

Unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

## Next operator action after merge

```sh
cd ~/sourcedeck-app
git checkout main && git pull origin main
rm -rf dist
npm run pack:mac
bash ~/sd-day0-refresh.sh
```

The new bundle boots with Phase 25H Calendar + Phase 25I FAR Reference active. Restart Day 0 GUI checks against the refreshed bundle.

---

## Signature

Phase 25I closes the FAR-knowledge gap inside GovCon and gives operators Word + PDF exports for downstream review. acquisition.gov is the source of truth. No legal advice. No certified compliance. No new mandatory API key. Zero new dependencies. Phase 25A no-send/no-submit/no-upload posture extends verbatim.

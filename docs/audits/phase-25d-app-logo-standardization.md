# Phase 25D — App Renderer Logo Standardization Audit

**Date:** 2026-06-09
**Repo:** `thekidd2227/sourcedeck-app`
**Branch:** `fix/phase-25d-approved-logo-standardization`
**Base:** `main @ 3920090` (post-PR #99 — Phase 25B 7-day internal trial).
**Companion site PR:** `thekidd2227/sourcedeck-site#7` — `fix(brand): standardize approved SourceDeck logo`.

---

## 1. Approved canonical asset

| Asset | Role |
|---|---|
| `sourcedeck-mark.svg` (added at repo root) | Approved canonical SourceDeck mark — dark stone tile + four gold chevron quadrants converging on a center void. ViewBox 200×200. Copied from `sourcedeck-site/assets/sourcedeck-mark.svg` so both repos use byte-identical brand artwork. |

Placed at the repo root next to `sourcedeck.html` so the Electron renderer can load it via a relative `file://` URL (`<img src="sourcedeck-mark.svg">`), consistent with how the prior broken reference (`<img src="sourcedeck-logo.png">`) was resolved.

## 2. Pre-Phase-25D inventory

Renderer-side `grep` for old logo / `S` icon patterns:

| File | Line | Pre-fix pattern | Action |
|---|---|---|---|
| `sourcedeck.html` | 744 | `<div class="logo-mark"><img src="sourcedeck-logo.png" alt="SourceDeck" onerror="this.parentElement.textContent='S'"></div>` — referenced a `sourcedeck-logo.png` that does not exist in the repo, so the renderer relied on the `onerror='S'` fallback (showing a textual `S` to the user). | Replaced with `<div class="logo-mark"><img src="sourcedeck-mark.svg" alt="SourceDeck logo"></div>`. |
| `sourcedeck.html` | 101 | `.logo-mark img{... object-position:17% center}` (designed to crop the old horizontal wordmark PNG so only the "S" portion showed inside the 40×40 box) | Updated to `object-fit:contain` so the square approved mark renders correctly inside the existing 40×40 frame. |

No other renderer surface displayed a SourceDeck logo. The setup wizard, splash, and tab nav use icon-style inline SVGs (functional icons, not brand logos) — those are unchanged.

## 3. Out-of-scope brand-logo references (intentionally untouched)

| Location | Why untouched |
|---|---|
| `sourcedeck.html:8844` — `const logoInstr='IMPORTANT: If the user has configured a brand logo, ...'` | Instruction text for the AI-assisted capability statement generator. Refers to **user-configured** branding, not the SourceDeck brand. Out of scope. |
| `sourcedeck.html:10133` — `brand: JSON.parse(localStorage.getItem('arcg_brand')\|\|'{"name":"","accent":"#1A6FA8","logo":"","website":"","senderName":""}')` | Reads a per-operator brand profile from `localStorage`. The `logo` field is a user-configured asset path, not the SourceDeck app's own logo. Out of scope. |
| `build/icon-1024.png`, `build/icon-source.jpg` | `electron-builder` desktop bundle icon inputs (consumed only at packaging time by `npm run pack:mac` / `npm run build:mac`). These produce the macOS app-bundle icon (`SourceDeck.app/Contents/Resources/icon.icns`). They are out of scope for the renderer-side logo standardization, and replacing them requires the operator's macOS toolchain to regenerate the `.icns` artifact. **Recommended for a follow-up phase** when the operator's local Mac is available to rerun electron-builder. |

## 4. Verification

| Check | Result |
|---|---|
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 — inline `<script>` blocks all still parse. |
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 — Setup Wizard invariants preserved. |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 — renderer-polish invariants preserved. |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 — core hardening invariants preserved. |
| `npm test` (full chain, ~60 sentinel tests) | ✅ exit 0 |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected unsigned-dev posture) |
| `grep ">S<" sourcedeck.html` | ✅ 0 hits |
| `grep "textContent='S'" sourcedeck.html` | ✅ 0 hits |
| `grep "sourcedeck-logo" sourcedeck.html` | ✅ 0 hits |
| `grep "sourcedeck-mark.svg" sourcedeck.html` | ✅ 1 hit (the new approved-mark reference at line 744) |

## 5. No runtime behavior change

The renderer's behavior is unchanged. The Electron `loadFile('sourcedeck.html')` entry point continues to load the same DOM tree; only the topbar logo `<img>` source attribute and one CSS rule changed. No event handlers, no `localStorage` keys, no IPC bridges, no credential surfaces are affected.

## 6. Safety / boundary preservation

- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / portal-upload control introduced.
- ✅ No `signed and notarized` / `Apple notarized` / `production signed` claim introduced.
- ✅ No `FedRAMP` / `SOC 2` / `CMMC` / `HIPAA` / `HITRUST` / `ISO 27001` claim introduced.
- ✅ No `guaranteed award` / `guaranteed revenue` claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` / public download CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No `.env` change.
- ✅ No `package.json` change.
- ✅ No `services/**` runtime change.
- ✅ No `scripts/**` change.
- ✅ No `test/**` change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved.
- ✅ Phase 25C master delivery method invariants preserved.

## 7. Companion site PR

`thekidd2227/sourcedeck-site#7` standardizes the same approved mark across the website (`index.html`, `index-new.html`, `m/index.html`, `sourcedeck-web.html`, `assets/social/capture.html`, `variants/founder-agency.html`). Together, the two PRs ensure the SourceDeck brand mark is consistent everywhere a buyer or operator would see it.

---

## Signature

Phase 25D app-side renderer logo standardization is complete. The approved gold geometric mark (`sourcedeck-mark.svg`) is now used in the topbar logo. The broken `sourcedeck-logo.png` reference and the `onerror='S'` fallback are removed. All sentinel tests, `govcon:smoke`, `troubleshooting:scan`, and `release-check.js` pass.

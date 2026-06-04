# Release Note — Phase 20F Troubleshooting + Release Evidence Visual System

**Branch:** `feat/phase-20f-troubleshooting-release-evidence-visual-system`
**Type:** Visible polish — **scoped to the shared in-app readiness banner inner ledger only**.
**Base:** `main @ a8305b0` (Phase 20E onboarding + settings + AI readiness polish merged).

## Summary

Phase 20F applies SourceDeck Civic Atelier "diagnostic ledger" polish to the **inner readiness-item ledger** (`.wr-*` rules) of the shared `.workspace-readiness` banner. The banner is rendered from a single template inside the Command Center, Dashboard, GovCon, and Settings tabs; polishing its inner ledger lights up the diagnostic-finding experience consistently wherever the banner appears. Container-level rules from Phases 20D and 20E are preserved verbatim. Diagnostic logic, release-evidence generation, signing/notarization probes, watsonx readiness probe behavior, and every finding/severity/copy string are unchanged. The CLI report templates (`reports/troubleshooting/*.md`, `reports/release-evidence/*.{md,json}`) are not part of the renderer and were not touched.

## What changed (visible)

- **Banner hairlines** — `.wr-head` border bottom and `.wr-item` border top retinted to Civic Atelier brass (`rgba(176,138,60,0.18)` and `rgba(176,138,60,0.10)`).
- **Sub-text and per-item descriptions** — `.wr-sub` and `.wr-desc` contrast raised off `--muted` onto `--sd-text-secondary` (civic-ledger feel).
- **Per-finding label** — `.wr-label` typography swapped from default Instrument Sans 12px bold to Cormorant Garamond italic 13.5px weight-600 (editorial finding title per the roadmap goal "Cormorant italic finding titles").
- **Oxblood severity rule** — `.wr-badge.critical` retinted from generic red (`var(--redl)` / `var(--red)` / `var(--redb)`) to a Civic Atelier oxblood treatment (`rgba(110,31,44,0.16)` background / `#E5B0B8` rose-pink text / `rgba(110,31,44,0.55)` border). Derived from `--sd-deep-oxblood` `#6E1F2C`.
- **Brass-light info badge** — `.wr-badge.info` retinted from saturated blue (`#60a5fa`) to brass-light (`var(--sd-brass-gold-light)`) on a brass-tint background, matching the Civic Atelier "no saturated SaaS blue" direction.

## What did NOT change

- **No `--gold` / `--gold2` / `--goldb` / `--purple` global repoint.** `.btn-gold` renders identically to `main @ a8305b0` on every screen.
- **No `.workspace-readiness` container restyle.** The shared container rule keeps its default cool-gold/blue gradient on Command Center and Dashboard; the Phase 20D `#tab-govcon` and Phase 20E `#tab-settings` overrides remain in force.
- **No `.wr-title` change.** The banner's panel-level Syne title is unchanged.
- **No `.wr-badge.warning` change.** Warning stays amber — per the Civic Atelier direction, oxblood is critical-only.
- **No finding / severity / readiness copy change.** All readiness item labels, descriptions, badges, and remediation text are unchanged. `troubleshooting:scan` and `release:evidence` outputs are byte-identical to `main @ a8305b0` (text content unchanged including warning / critical / info counts and severity strings).
- **No diagnostic / release / signing / notarization / watsonx logic change.**
- **No body markup edited.** No `<div>`, `<button>`, `<span>`, `<input>`, `<form>`, `<a>` change.
- **No inline `style="…"` attribute changed.** `#ibm-output`, `#watsonx-readiness-state`, `#watsonx-readiness-remediation` retain their inline styles verbatim.
- **No JavaScript edited.** `watsonxReadinessCheck()`, `wrEscape()`, readiness rendering helpers, IBM mode probes — behavior identical.
- **No CLI report templates touched.** `scripts/troubleshooting-scan.mjs`, `scripts/release-evidence-summary.mjs`, and the markdown templates they emit under `reports/**` are unchanged.
- **No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, `reports/`, or `.env` change.**
- **No claims / pricing / watsonx / signing / publishing / Vercel / GOVCON external / ARCGSystems / ChartNav / sourcedeck-site / Buffer change.**
- **No new features. No removed features. No relabeled controls.**

## Cool-gold preservation (operator-required regression guard)

The Phase 20C / 20D / 20E / 20F operator regression guard — `.btn-gold` must remain cool gold everywhere — is preserved verbatim. The Phase 20F block contains no `.btn-gold` selector and does not redeclare `--gold`, `--gold2`, `--goldb`, or `--goldl`. Cool gold renders identically on every screen.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed / notarized claim, any compliance claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001), guaranteed-outcome or unlimited-AI language, or auto-send / auto-submit copy. None were added in 20F. The readiness banner and its findings retain their honest "presence/status/remediation" pattern.

## Stashes

Stashes were not modified. The old SoHo×DC stash was not applied, popped, or dropped. The GovCon Capture OS stash was not touched.

## Files changed

- `sourcedeck.html` — +39 / −0 (one additive scoped CSS block, appended at the end of the main `<style>` immediately after the Phase 20E block).
- `docs/audits/phase-20f-troubleshooting-release-evidence-visual-system-audit.md` (new).
- `docs/release-notes/phase-20f-troubleshooting-release-evidence-visual-system.md` (this file).

## Tests run

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Results recorded in the PR description.

## Screenshots

**Operator-required before merge.** This environment cannot drive the Electron renderer (no Playwright/Puppeteer, no headless Electron, no GUI). The PR is opened as a **draft** to enforce the screenshot gate. The 10-row required-frame checklist (including the readiness-copy verification row 7, `.btn-gold` regression guard row 8, and CLI-report regression guard row 10) lives in `docs/audits/phase-20f-troubleshooting-release-evidence-visual-system-audit.md` § Screenshot QA.

## Next phase

**Phase 20G — Responsive QA + Demo Polish** (re-verifies all breakpoints, tunes responsive collapse, finalizes the demo-flow screenshot set). 20G lands only after 20F screenshots are reviewed and rows 7 / 8 / 10 are confirmed pass.

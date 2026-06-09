# Phase 25E — Buyer Product Cleanup

**Phase:** 25E — Buyer Navigation Simplification + Proposal Workspace + Help/FAQ + Pilot Tracker.
**Date:** 2026-06-09.
**Branch:** `feat/phase-25e-buyer-product-cleanup`.
**Base:** `main @ 4572950` (post-PR #102 — Phase 25E.1).
**Companion audit:** `docs/audits/phase-25e-buyer-product-cleanup-audit.md`.

---

## What this phase delivered

Phase 25E.2 through 25E.7, shipping together as one PR per operator instruction ("go in order; merge when all are completed").

| Sub-phase | Commit | Sentinel | One-line summary |
|---|---|---|---|
| 25E.2 | `611a4c1` | `phase-25e-proposal-workspace.test.js` 14/14 | Execution → Proposal Workspace with 13 sections + 5-state status machine. |
| 25E.3 | `3654af4` | `phase-25e3-airtable-user-facing-copy.test.js` 9/9 | Airtable user-facing copy retired; Settings PAT framed as optional legacy. |
| 25E.4 | `50a02d1` | `phase-25e-help-faq-manual.test.js` 8/8 | In-app Help/FAQ (180 items) + 4th-grade user manual. |
| 25E.5 | `129b72d` | `phase-25e-pilot-tracker.test.js` 13/13 | Client Delivery → Pilot Tracker rebuild surfacing Phase 25B trial state. |
| 25E.6 | `194cbf9` | `phase-25e-daily-ops-defaults.test.js` 6/6 | Daily Ops empty-state invariant + Automation Config framed as optional. |
| 25E.7 | `9ef2968` | `phase-25e-leads-workspace.test.js` 7/7 | Lead nav consolidation: Create Lead + AI Lead Builder folded into Leads. |

Phase 25E.1 (default-collapse "Other business tools" + missing Phase 25D logo sentinel) shipped separately as PR #102 and is already on `main @ 4572950`.

## Headline buyer-facing improvements

1. **Cold-open nav shows only what the buyer needs.** GovCon Capture OS + Help / FAQ are always visible. The remaining 17 commercial-mode tabs sit behind one click on "Other business tools".
2. **Proposal Workspace replaces the locked Execution teaser.** Section-by-section drafting with explicit approval gates. No "Generate Full Proposal" one-click control. SourceDeck never submits the proposal; the buyer always handles external action.
3. **Pilot Tracker replaces Client Delivery OS.** Surfaces the Phase 25B 7-day trial state (current day, setup completion, open issues by severity, go/no-go decision, next action). Tied directly to the operator's pilot framework.
4. **Help / FAQ + 4th-grade manual.** 180 plain-English Q&A items in-app, mirrored by `docs/manuals/sourcedeck-user-manual-4th-grade.md`. Reading level held to ~4th grade so buyers do not need a dictionary.
5. **Airtable is no longer presented as a required dependency.** Primary CTAs use neutral CRM language; the Settings PAT field is explicitly qualified as optional legacy integration.
6. **Settings Automation Config is honest.** Make.com / Instantly / Assessment Webhook fields are labeled "(optional)" and placeholders read "leave blank to skip".
7. **Leads is one workspace.** Create Lead and AI Lead Builder sidebar entries are folded into the Leads pane as in-pane buttons. Underlying panes remain in DOM (Phase 23C invariant).
8. **Daily Operating Rhythm cold-open is clean.** Zero founder/internal PROD-01..05 defaults — now guarded by sentinel test.

## What did NOT change

- Phase 25A no-send / no-submit / no-upload posture (verified by sentinels and the audit-doc safety scan).
- Phase 25C master delivery method.
- Phase 25D approved brand mark.
- Pricing source-of-truth (`docs/product/pricing-source-of-truth.md`).
- `package.json` aside from the new test wiring.
- `services/**`, `scripts/**`, `main.js`, `preload.js`.
- The Phase 23C "every commercial nav button + pane remains in the DOM" invariant.
- The first-run-safety white-label invariant (no operator-identifying string in the renderer).
- Stripe / payment / checkout configuration.
- Website (`sourcedeck-site`) — Phase 25D site changes already merged; no further site change in this PR.

## Test / gate results

| Command | Result |
|---|---|
| `npm test` (full chain, ~60 sentinels) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected unsigned-dev posture) |
| All seven Phase 25E sub-phase sentinels | ✅ 65 assertions, 65 PASS |
| `first-run-safety.test.js` | ✅ 7/7 PASS — white-label invariant preserved |
| `renderer-airtable-migration.test.js` | ✅ 12/12 PASS — credential-routing invariant preserved |
| `remove-system-readiness-tab.test.js` | ✅ 9/9 PASS — Phase 24A system-flow removal preserved |
| `govcon-primary-navigation.test.js` | ✅ 23/23 PASS — Phase 23C nav invariant preserved |

## Safety / boundary confirmations

- ✅ No tabs/panes removed from the DOM.
- ✅ No `data-tab` IDs renamed.
- ✅ No `Send Email` / `Submit Bid` / `Submit Quote` / portal-upload control introduced.
- ✅ No `signed and notarized` / `Apple notarized` / `production signed` / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying string in the renderer.
- ✅ No `.env` change.
- ✅ Stashes untouched.
- ✅ No payment / Stripe / checkout change.
- ✅ No `services/**`, `scripts/**` runtime change.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ No website change.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / media / `.qa/` committed.
- ✅ All Phase 24-series surfaces preserved.
- ✅ Phase 25A bounding conditions preserved.
- ✅ Phase 25B 7-day internal trial framework preserved (and surfaced via Pilot Tracker).
- ✅ Phase 25C master delivery method invariants preserved.
- ✅ Phase 25D approved brand mark preserved.
- ✅ Phase 25E.1 buyer-nav default-collapsed preserved.

## Status

Unchanged from Phase 25A: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**. Public signed release remains NO-GO. Phase 25C delivery model preserved.

## Next operator action

1. Merge this PR.
2. On your Mac, rebuild the bundle so the .app picks up the renderer changes:
   ```sh
   cd ~/sourcedeck-app
   git checkout main && git pull origin main
   rm -rf dist
   npm run pack:mac
   bash ~/sd-day0-refresh.sh
   ```
3. Re-run Day 0 GUI checks on the refreshed bundle. The renderer should now boot with the collapsed sidebar, the Help / FAQ tab in the always-on Help section, the Proposal Workspace at the renamed Execution tab, and the Pilot Tracker at the renamed Client Delivery tab.

## Future phases reserved

Items from the original mission deferred to future phases:

- **Phase 25F (provisional)** — Pipeline rebuild that wires Leads / GovCon / Proposal Workspace approval gates with explicit Won / Lost / Submitted-outside-SourceDeck state.
- **Phase 25G (provisional)** — Local-CRM data layer replacing the Airtable storage path entirely (25E.3 was copy-only; this would be the actual data-layer swap).
- **Phase 25F+/H** — Live AI section drafting integration for Proposal Workspace (25E.2 ships the boundary contract + UI; live AI is a separate phase with its own credential boundary + provider routing).
- **Phase 25F+/I** — Approved-mark electron-builder bundle icon (`.icns`) regeneration. Requires the operator's local Mac toolchain.

---

## Signature

Phase 25E ships the buyer-facing product cleanup that turns SourceDeck from a founder/internal ops dashboard into a buyer-ready GovCon Capture OS. Decomposition into 7 sub-phases kept each step focused and reviewable. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

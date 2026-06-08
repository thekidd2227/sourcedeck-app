# Release Note — Phase 24C GovCon Core Follow-Up Fixes

**Branch:** `fix/phase-24c-govcon-core-followups`
**Type:** Bug fix + UI hardening — closes two of three deferred items from Phase 24B; documents the third as deferred to Phase 24C-2 per mission's explicit defer clause.
**Base:** `main @ e098d6a` (post-PR #84 — GovCon core hardening).

## Summary

Phase 24C is the focused follow-up to Phase 24B:

1. **Fixed:** `test/govcon-opportunity-outreach.test.js` 27/28 → **28/28**. Root cause was a wall-clock vs injectable-clock mismatch in `services/govcon/email-compliance.js#activeSolicitation()` that mis-classified test-fixture deadlines as past when the test ran with a frozen `nowFn` different from real `Date.now()`. The active-solicitation guard now correctly fires under deterministic-time testing without weakening the production safety boundary.

2. **Fixed:** GovCon NAICS filter dropdown converted to profile-driven render. The 14 hardcoded operator-specific NAICS `<option>` entries in `sourcedeck.html:2033-2039` are gone; the dropdown ships with only the `All NAICS` sentinel and is populated at runtime by `gcRenderNaicsFilter()` from `window.APPROVED_NAICS` (the profile-driven cache populated by Phase 24B's `gcLoadTargetingNaics()`). Empty profile surfaces a disabled `Configure NAICS in Settings → GovCon Targeting` prompt.

3. **Deferred to Phase 24C-2:** AI prompt-builder NAICS parameterization (`sourcedeck.html:4624-4642`, `:6853-6871`). The mission explicitly authorizes deferral when the change becomes structurally larger than the focused-fix shape — the two prompt blocks live in synchronous template literals and require async profile load + de-duplication + synthetic-fixture comparison. Documented for follow-up.

## What changed

### `services/govcon/email-compliance.js`

- `activeSolicitation(opportunity, nowMs)` accepts an optional `nowMs` parameter (defaults to `Date.now()` when omitted). When provided, the deadline comparison `due > cmp` uses the injected clock.
- `draftOfficialEmail(input)` accepts an optional `input.nowMs` and forwards it to `activeSolicitation()`. Default behavior unchanged.

### `services/govcon/opportunity-outreach.js`

- `buildDraft()` passes `nowMs: now()` (the agent's injectable clock) to `draftOfficialEmail()`. The agent's `now()` already threads through the scan/score/draft pipeline; this extends it into the email-compliance layer.

### `sourcedeck.html`

- `<select id="gc-naics-filter">` reduced to just `<option value="">All NAICS</option>` plus a static comment documenting that the dropdown is profile-driven.
- New `gcRenderNaicsFilter()` function in the renderer's script block, exposed on `window`. Idempotent (safe to re-run when the targeting profile is updated).
- `DOMContentLoaded` chain updated: `gcLoadTargetingNaics().then(() => gcRenderNaicsFilter())` so the dropdown is populated as soon as the cache is hot.

### `test/govcon-core-hardening.test.js`

- Extended from 12 → **15 checks** with three Phase 24C additions:
  - `gc-naics-filter` ships only the `All NAICS` entry (no hardcoded operator-specific `<option>` entries).
  - `gcRenderNaicsFilter()` reads from `window.APPROVED_NAICS` and surfaces the configure prompt when empty.
  - `DOMContentLoaded` chains `gcRenderNaicsFilter` after `gcLoadTargetingNaics`.

### Docs added

- `docs/product/phase-24c-govcon-core-followups.md` — product narrative, root-cause analysis, deferral rationale.
- `docs/release-notes/phase-24c-govcon-core-followups.md` (this file).

## What did NOT change

- **No backend rewrite.** Only the email-compliance + opportunity-outreach minor threading change.
- **No new IPC handler. No `preload.js` change. No `main.js` change.**
- **No payment / Stripe / checkout / pricing change.** `docs/product/pricing-source-of-truth.md` unchanged.
- **No website-repo edit.**
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA / any agency portal.
- **No live integration invented.** No SAM / Apollo / Airtable / OpenAI / Claude / watsonx call.
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed). **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No live Gmail / live-inbox claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F removal preserved).
- **No PO-language reintroduced. No deprecated $79 / $349 / $999 in active app UI.**
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-opportunity-outreach.test.js` | ✅ **PASS 28/28** (was 27/28 carried across PRs #82, #83, #84) |
| `node test/govcon-email-compliance.test.js` | ✅ PASS |
| `node test/govcon-core.test.js` | ✅ PASS 27/27 |
| `node test/govcon-core-hardening.test.js` | ✅ **PASS 15/15** (was 12/12) |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-operating-rhythm.test.js` | ✅ PASS 23/23 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-demo-polish.test.js` | ✅ PASS 27/27 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `npm test` (full chain) | ✅ **PASS — exit 0** (previously carried over 27/28 failure; now fully green) |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Migration notes

- **No data migration required.**
- **Electron startup unchanged.** Renderer boots; every inline `<script>` parses; `window.sd` bridge unchanged.
- **Existing users with a configured GovCon targeting profile:** NAICS filter dropdown populates from their profile.
- **Existing users without a configured GovCon targeting profile:** dropdown shows the explicit `Configure NAICS in Settings → GovCon Targeting` prompt instead of silently using one operator's NAICS list.
- **Behavior under real wall clock unchanged.** The `nowMs` parameter is optional and defaults to `Date.now()`, so production calls behave identically.

## Stashes

Untouched.

## Next phase recommendation

- **Phase 24C-2** — AI prompt-builder NAICS parameterization (deferred per mission's explicit defer clause). Requires async profile load + de-duplication of the two prompt blocks + synthetic-fixture comparison to verify prompt clarity isn't degraded.
- **Phase 24D** — Past Performance Library + Capability Statement Studio buyer-visible UI (backend exists; IPC wired; UI is the missing piece).
- **Phase 24E** — Stakeholder Graph UI surface (backend exists; IPC wired; UI is the missing piece).

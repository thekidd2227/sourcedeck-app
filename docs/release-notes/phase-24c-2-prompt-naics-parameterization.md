# Release Note — Phase 24C-2 AI Prompt-Builder NAICS Parameterization

**Branch:** `fix/phase-24c-2-prompt-naics-parameterization`
**Type:** Bug fix + product hardening — removes the last operator-specific hardcoded NAICS list from active prompt-builder scaffolding.
**Base:** `main @ a4fc8b6` (post-PR #89 — Phase 24E runtime; post-PR #88 — Phase 24F-PREP RC docs).
**Closes:** the last Phase 24C deferred item.

## Summary

Two near-identical AI Lead Generator prompt-builder template literals in `sourcedeck.html` (around lines 4835 and 7056) embedded a 10-line hardcoded NAICS list of one operator's specific business model. This PR replaces both blocks with a single `${gcPromptNaicsContext()}` substitution that reads from the user-editable GovCon targeting profile (Phase 24B/24C) and falls back to the neutral phrase `the configured target NAICS categories` when the profile is empty. **No live integration touched. No backend rewrite. No payment / pricing / website change. No send / submit / upload behavior added.**

## What changed

### Runtime (`sourcedeck.html`)

- Added `gcPromptNaicsContext()` renderer helper (~17 lines) next to existing Phase 24B/24C targeting helpers. Reads `window.APPROVED_NAICS`; returns either a deduplicated bullet list or the neutral fallback phrase.
- Replaced the 10-line operator-specific NAICS bullet list (`- 531311 — Residential Property Managers / - 531312 — … / - 561210 — … / - 561720 — … / - 238220 — … / - 238210 — … / - 561320 — … / - 561311 — … / - 541611 — … / - 541614 — …`) with `${gcPromptNaicsContext()}` substitution in both prompt blocks.
- Reworded inline NAICS-code references in prompt examples to be code-neutral (e.g., `→ 531311/531312` → `<use the description of each configured NAICS as your mapping guide>`; `"matches 531311 — residential property manager, 3000+ units NYC portfolio"` → `"matches <configured NAICS code> — <one-line operator-targeting fit>"`).
- Renamed six rule headings from "approved NAICS / clusters" to "configured NAICS / clusters" to match the parameterized model.

### Test added

`test/govcon-prompt-naics-parameterization.test.js` — **16 checks** including **synthetic fixture comparison** (empty profile → neutral fallback; populated + dirty profile → deduplicated trimmed bullet list).

### `package.json`

- Appends `&& node test/govcon-prompt-naics-parameterization.test.js` to the existing `npm test` chain.

### Docs added

- `docs/product/phase-24c-2-prompt-naics-parameterization.md` — product narrative + synthetic fixture results + migration notes.
- `docs/release-notes/phase-24c-2-prompt-naics-parameterization.md` — this file.

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No new IPC handler.** Helper reads existing `window.APPROVED_NAICS` cache.
- **No website-repo edit.** No payment / Stripe / checkout / pricing change. No `docs/product/pricing-source-of-truth.md` edit.
- **No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control added. No `auto_send: true` / `auto_submit: true`.**
- **No autonomous submission** to SAM / PIEE / eBuy / GSA.
- **No live integration invented.** No live SAM run. No live AI provider call. No live Apollo call. No live Airtable call.
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No live Gmail / live-inbox claim.**
- **No System Readiness / `sysflow` resurrection** (Phase 21F preserved).
- **No deprecated $79 / $349 / $999 reintroduced** as active app UI.
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**
- **No Phase 24B / 24C / 24D / 24E / 24F surface regressed.**

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-prompt-naics-parameterization.test.js` (new) | ✅ **PASS 16/16** |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/govcon-opportunity-outreach.test.js` | ✅ PASS 28/28 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-polish.test.js` | ✅ PASS 27/27 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/govcon-past-performance-prime.test.js` | ✅ PASS |
| `node test/govcon-vendor-pricing.test.js` | ✅ PASS |
| `node test/govcon-solicitation-workspace.test.js` | ✅ PASS |
| `node test/govcon-capture-command-center.test.js` | ✅ PASS |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| **`npm test` (full chain — 57 tests)** | ✅ **exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Migration

- **No data migration required.**
- **Electron startup unchanged.** Renderer boots; every inline `<script>` still parses.
- **Existing users with a configured profile:** the Lead Generator prompt now uses their configured NAICS codes.
- **Existing users without a configured profile:** the prompt substitutes the neutral phrase `the configured target NAICS categories`. Operator populates their profile via Settings → GovCon Targeting before running the Lead Generator flow.

## Stashes

Untouched.

## Next recommended phases

1. **Stakeholder Graph live wire-up** — connect Phase 24E `gcLoadStakeholderGraph()` to the Capture Command Center opportunity-selection flow (~10 lines).
2. **Buyer demo refresh** — update `docs/demo/phase-23f-govcon-demo-shot-list.md` to feature the now-complete capture journey.
3. **Final RC hardening** using the Phase 24F-PREP release-candidate docs (PR #88).
4. *(Optional follow-up)* **Phase 24C-3** — Prime Partner Finder NAICS dropdown fallback (`sourcedeck.html:12207`) — same one-operator pattern; ~3-line change.

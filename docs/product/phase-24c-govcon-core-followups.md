# Phase 24C — GovCon Core Follow-Up Fixes

**Date:** 2026-06-08
**Branch:** `fix/phase-24c-govcon-core-followups`
**Base:** `main @ e098d6a` (post-PR #84 — GovCon core hardening).

## Purpose

Phase 24B closed the high-leverage gaps in the GovCon core (removed hardcoded `APPROVED_NAICS`; added the buyer-visible audit log surface). Phase 24C is the focused follow-up that closes the three deferred items, in priority order. **No buyer-facing feature change. No backend rewrite. No live integration touched.**

## What was fixed

### 1. ✅ `test/govcon-opportunity-outreach.test.js` 27/28 → **28/28**

**Root cause (not a test bug — a real product bug exposed by deterministic-time testing):**
`services/govcon/email-compliance.js#activeSolicitation()` used `Date.now()` (wall clock) to compare against an opportunity's `responseDeadline`. The MOCK-A test fixture sets the deadline at `agent.nowFn() + 5 days`, where `nowFn` is frozen at `2026-06-01`. The test process runs at the real wall clock (`2026-06-08` and later), so `due > Date.now()` evaluated to `false`, `activeSolicitation()` returned `false`, the active-solicitation guard didn't fire, and the agent drafted an unrestricted outreach instead of returning a Q&A-only draft.

Fix:
- `email-compliance.js#activeSolicitation()` accepts an optional `nowMs` parameter (defaults to `Date.now()` when omitted).
- `email-compliance.js#draftOfficialEmail()` accepts an optional `input.nowMs` and forwards it.
- `opportunity-outreach.js#buildDraft()` threads the agent's injectable `now()` into `draftOfficialEmail()`.

This preserves the safety boundary (active-solicitation deadline still gates direct outreach; default behavior under real wall clock is unchanged) and makes the deadline comparison correct under deterministic-time tests.

Result: `node test/govcon-opportunity-outreach.test.js` → **28/28 PASS** (was 27/28 across PRs #82, #83, #84).

### 2. ✅ GovCon NAICS filter dropdown converted to profile-driven render

**Before:** `sourcedeck.html:2033-2039` shipped 14 hardcoded operator-specific NAICS `<option>` entries (`541611`, `541614`, `541512`, `541519`, `561210`, `561720`, `238320`, `561110`, `541612`, `561311`, `561320`, `541613`, `541990`, `518210`) as static markup.

**After:**
- The `<select id="gc-naics-filter">` ships with only the `All NAICS` sentinel option.
- New `gcRenderNaicsFilter()` renderer-side helper populates the dropdown from `window.APPROVED_NAICS` (the profile-driven cache populated by Phase 24B's `gcLoadTargetingNaics()`).
- Empty-profile state surfaces a disabled prompt: `Configure NAICS in Settings → GovCon Targeting`. No silent default to a baked-in operator list.
- `DOMContentLoaded` chains `gcLoadTargetingNaics().then(gcRenderNaicsFilter)` so the dropdown is populated as soon as the targeting profile is read from the main process.

Regression-guarded by three new checks in `test/govcon-core-hardening.test.js`:
- `gc-naics-filter` ships only the `All NAICS` entry (no hardcoded `<option>` for 14 specific NAICS codes).
- `gcRenderNaicsFilter()` reads from `window.APPROVED_NAICS` and surfaces the configure prompt when empty.
- `DOMContentLoaded` chains `gcRenderNaicsFilter` after `gcLoadTargetingNaics`.

### 3. ⏸️ AI prompt-builder NAICS parameterization — **deferred to Phase 24C-2**

**Why deferred (per mission's explicit "stop if risky/unclear" clause):**

`sourcedeck.html:4624-4642` and `sourcedeck.html:6853-6871` contain two near-identical 19-line blocks of operator-specific Lead Generator prompt scaffolding ("PRIORITY INDUSTRIES" + "APPROVED NAICS / SERVICE CLUSTERS (BINDING)" + "NAICS TARGETING RULES (BINDING)"). The blocks live inside synchronous template literals built at click time.

Parameterizing them safely requires:
1. **Async profile load** from `window.sd.govcon.getTargeting()` before each prompt build (the prompt-builder code paths are currently synchronous).
2. **De-duplication** of the two blocks (or accept the duplication and parameterize in both places).
3. **Substitution strategy** for the empty-profile case — the mission specifies "the configured target NAICS categories" as the neutral wording, but the prompt currently includes detailed industry descriptors ("property management", "HVAC", "staffing", etc.) and exclusion examples ("law firms, marketing agencies, SaaS"). Replacing both with generic wording risks degrading the AI's discrimination boundary.
4. **Synthetic fixture comparison** to verify the rewritten prompts still contain GovCon targeting context, NAICS context, human-review boundary, and no auto-outreach/send/submit wording.

The mission explicitly authorizes deferral: *"If this step becomes risky or unclear: stop after Step 3, document prompt-builder parameterization as deferred to Phase 24C-2, do not half-patch prompts."*

This is the prudent call. The blocks are documented in `docs/product/phase-24b-govcon-core-hardening.md` §1.10 and in this doc as Phase 24C-2 follow-up. **The blocks describe one operator's commercial Lead Generator business model**, not GovCon capture flow — buyer-facing GovCon workflows (SAM search, compliance matrix, solicitation analysis, etc.) do not reference these prompt blocks. Risk of leaving them in place is bounded to "Lead Generator output is calibrated to one operator's industries."

## Safety boundaries preserved

- ✅ **Human-review boundary preserved.** The `requiresApproval: true` / `sendingEnabled: false` / `reviewNotice` shape returned by `draftOfficialEmail` is unchanged.
- ✅ **Draft-only behavior preserved.** Active-solicitation opportunities still get `blocked: true` + Q&A-only draft. The fix corrects when the block fires; it does not weaken the block.
- ✅ **No send / no-submit posture preserved.** No new send/submit code path. The outreach service surface still has no `agent.send`, `agent.sendEmail`, `agent.dispatch`.
- ✅ **Phase 24B profile-driven SAM NAICS loader preserved.** `gcLoadTargetingNaics()` and the empty-profile guard are untouched.
- ✅ **Phase 24B Audit Log panel preserved.** `#gc-audit-log` and `gcAuditRefresh()` untouched.
- ✅ **Pricing source-of-truth preserved.** `docs/product/pricing-source-of-truth.md` not edited. No deprecated `$79 / $349 / $999` reintroduced.
- ✅ **System Readiness / `sysflow` removal preserved** (Phase 21F).
- ✅ **FAR-aware stakeholder language preserved.**
- ✅ **No improper outreach to CO/COR.** The fix actually strengthens this — MOCK-A's active-solicitation case now correctly blocks direct outreach in the deterministic-time test path.

## Tests / gates

| Gate | Result |
|---|---|
| `node test/govcon-opportunity-outreach.test.js` | ✅ **PASS 28/28** (was 27/28) |
| `node test/govcon-email-compliance.test.js` | ✅ PASS |
| `node test/govcon-core.test.js` | ✅ PASS 27/27 |
| `node test/govcon-core-hardening.test.js` | ✅ **PASS 15/15** (was 12/12; +3 new dropdown checks) |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-operating-rhythm.test.js` | ✅ PASS 23/23 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-demo-delivery-polish.test.js` | ✅ PASS 26/26 |
| `node test/govcon-demo-polish.test.js` | ✅ PASS 27/27 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/remove-system-readiness-tab.test.js` | ✅ PASS 9/9 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `npm test` (full chain, all 55 tests) | ✅ **PASS — exit 0** |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

## Files changed

| File | Lines | Change |
|---|---|---|
| `services/govcon/email-compliance.js` | ~6 | `activeSolicitation(opp, nowMs)` accepts optional clock; `draftOfficialEmail()` accepts and forwards `input.nowMs` |
| `services/govcon/opportunity-outreach.js` | ~3 | `buildDraft()` threads `now()` into `draftOfficialEmail()` |
| `sourcedeck.html` | ~50 | NAICS filter dropdown reduced to sentinel `All NAICS`; new `gcRenderNaicsFilter()`; DOMContentLoaded chain |
| `test/govcon-core-hardening.test.js` | +50 | +3 dropdown checks (Phase 24C extension); now 15/15 |
| `docs/product/phase-24c-govcon-core-followups.md` | this file | Product narrative |
| `docs/release-notes/phase-24c-govcon-core-followups.md` | ~130 | Release note |

## What did NOT change

- **No live integration touched.** No SAM call, no Apollo, no Airtable, no OpenAI/Claude/watsonx.
- **No payment / Stripe / checkout / pricing change.** `docs/product/pricing-source-of-truth.md` unchanged.
- **No website-repo edit.**
- **No `auto_send: true` / `auto_submit: true`.** No Send Email / Submit Bid / Submit Quote / "Export and submit" / portal-upload control added.
- **No live SAM Sprint run, no outreach drafted/sent/queued, no bid/quote/proposal submission.**
- **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- **No System Readiness / `sysflow` resurrection.**
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**

## Safety scan

Forbidden-claim grep across changed files plus the rest of the runtime/tests/docs/services/scripts/package.json:

- `Free demo` / `Download now` / `Try now` / `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` / `package submitted` / `bid submitted` / `quote submitted` / `upload to SAM` / `upload to PIEE` / `upload to eBuy` / `upload to GSA` / `SourceDeck submits` / `files into SAM.gov` — only in negative-assertion contexts (forbidden-pattern lists, "no Send Email surface" comments, "does not submit" guards).
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — only in negative-assertion contexts.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — none reintroduced.
- `$79` / `$349` / `$999` — only in historical/deprecated audit docs and pricing source-of-truth deprecation table; no active app UI stale pricing.

## Migration notes

- **No data migration required.**
- **Electron startup unchanged.** Renderer boots; every inline `<script>` parses; `window.sd` bridge unchanged.
- **Existing users with a configured profile:** NAICS filter dropdown populates from their profile.
- **Existing users without a configured profile:** dropdown shows the "Configure NAICS in Settings → GovCon Targeting" prompt instead of silently using one operator's NAICS list.

## Manual QA steps

1. Launch the desktop app cold. Open the **GovCon** tab.
2. Inspect the NAICS filter dropdown above the GovCon pipeline. **If no targeting profile is configured:** expect only `All NAICS` and a disabled `Configure NAICS in Settings → GovCon Targeting` prompt. **If a targeting profile is configured:** expect `All NAICS` followed by the operator's NAICS codes from the profile.
3. Update the targeting profile via Settings → GovCon Targeting and reload — the dropdown should reflect the new codes.
4. Verify no operator-specific NAICS (`541611`, `541614`, `541512`, etc.) appears in the dropdown HTML as a static option.
5. Run the existing GovCon flow with an active-solicitation opportunity (e.g., MOCK-A in test fixtures) — verify the outreach status is `Needs Review` and the draft contains a Q&A-only artifact, not direct outreach.
6. Verify the audit log panel and SAM URL builders from Phase 24B still work.

## Remaining gaps / next phases

| Phase | Scope |
|---|---|
| **Phase 24C-2** | Parameterize AI prompt-builder NAICS examples (`sourcedeck.html:4624-4642`, `:6853-6871`) from the targeting profile. Requires async profile load + de-duplication + synthetic-fixture comparison. Out of scope for this PR per mission's explicit defer clause. |
| **Phase 24D** | Past Performance Library + Capability Statement Studio buyer-visible UI surfaces. Backend exists (`services/govcon/past-performance.js`, `services/govcon/capability-statement-extractor.js`); IPC wired (`window.sd.govcon.pastPerformance.{list,save,remove,match}`); UI is the missing piece. |
| **Phase 24E** | Stakeholder Graph UI surface. Backend exists (`services/govcon/stakeholder-graph.js`, 179 lines, FAR-aware posture labels); IPC wired (`window.sd.govcon.stakeholders`); UI is the missing piece. |

## Confirmations

- **`.env` not touched. No API key printed. No secret exposed.**
- **Stashes untouched.**
- **Electron app startup unchanged.**
- **No website-repo edit. No payment / Stripe / checkout change. No deploy.**
- **No live SAM run. No outreach drafted, sent, or queued. No bid/quote/proposal submission.**
- **No videos / screenshots / `.qa/` committed.**

# Phase 24C-2 — AI Prompt-Builder NAICS Parameterization

**Date:** 2026-06-08
**Branch:** `fix/phase-24c-2-prompt-naics-parameterization`
**Base:** `main @ a4fc8b6` (post-PR #89 — Phase 24E runtime; post-PR #88 — Phase 24F-PREP RC docs; post-PR #87 — Phase 24E-PREP; post-PR #86 — Phase 24D).
**Closes:** the last Phase 24C deferred item (`docs/product/phase-24c-govcon-core-followups.md` §3).

## Purpose

Two near-identical AI prompt-builder template literals in `sourcedeck.html` (around lines 4835 and 7056) still embedded a 10-line hardcoded NAICS list of one operator's specific business model (real-estate / facility maintenance / staffing). Phase 24C-2 replaces both blocks with a single `${gcPromptNaicsContext()}` substitution that reads from the user-editable GovCon targeting profile and falls back to the neutral phrase `the configured target NAICS categories` when the profile is empty.

This is the last remaining one-operator NAICS embedding in active prompt scaffolding. The dropdown fallback in `loadUserNaics()` (line 12207, Phase 24D Prime Partner Finder NAICS selector — `['541512', '541611', '541330', '561210']`) is also operator-specific but is **out of scope for this PR** — it belongs to the Phase 24D shipped surface and is a UI dropdown affordance, not prompt-builder copy. Documented as a Phase 24C-3 follow-up.

## What was changed

### Runtime (`sourcedeck.html`)

**Added (1 helper):**

```js
function gcPromptNaicsContext() {
  const raw = (typeof window !== 'undefined' && Array.isArray(window.APPROVED_NAICS))
    ? window.APPROVED_NAICS : [];
  const uniq = Array.from(new Set(raw.map(String).map(s => s.trim()).filter(Boolean)));
  if (!uniq.length) return 'the configured target NAICS categories';
  return uniq.map(c => '- ' + c).join('\n');
}
```

Placed next to the existing Phase 24B/24C `gcLoadTargetingNaics()` / `gcRenderNaicsFilter()` helpers, exposed on `window.gcPromptNaicsContext`. Pure renderer helper — no network call, no AI provider call, no IPC.

**Removed (twice; both prompt blocks were near-identical duplicates):**

- The 10-line `- 531311 — Residential Property Managers / - 531312 — Nonresidential Property Managers / - 561210 — Facilities Support Services / - 561720 — Janitorial Services / - 238220 — Plumbing, Heating, and Air-Conditioning Contractors / - 238210 — Electrical Contractors / - 561320 — Temporary Help Services / - 561311 — Employment Placement Agencies / - 541611 — Administrative Management Consulting / - 541614 — Process, Physical Distribution, and Logistics Consulting` enumerated bullet list.

**Replaced with:**

```
${gcPromptNaicsContext()}
```

**Inline NAICS-code references in prompt examples reworded to be code-neutral:**

| Before (operator-specific) | After (profile-neutral) |
|---|---|
| `(e.g. "property management company managing 50+ units" → 531311/531312, "commercial janitorial service" → 561720, "temp staffing agency" → 561320)` | `(use the description of each configured NAICS as your mapping guide)` |
| `Only property management operations (531311 / 531312) are in scope. A pure listing/sales brokerage (NAICS 531210) is out of scope even if it shares a parent brand with a PM arm; in that case target the PM arm specifically.` | `when a business shares a parent brand with an in-scope NAICS-aligned arm and an out-of-scope arm (for example, a parent brand with one in-scope subsidiary and one out-of-scope subsidiary), target only the in-scope arm whose direct operation matches the configured NAICS. A pure out-of-scope brokerage, listing/sales firm, or other line of business outside the configured NAICS is out of scope even if it shares a brand.` |
| `"matches 531311 — residential property manager, 3000+ units NYC portfolio"` | `"matches <configured NAICS code> — <one-line operator-targeting fit>"` |
| Six rule headings referencing `approved NAICS / clusters` | Renamed to `configured NAICS / clusters` to match the parameterized model |

### Test added

`test/govcon-prompt-naics-parameterization.test.js` — 16 checks:

1. Legacy operator-specific NAICS bullet list removed from active prompt scaffolding.
2. `gcPromptNaicsContext()` helper exists and is exposed on `window`.
3. **Synthetic fixture comparison** — eval the helper with `APPROVED_NAICS = []` and assert the neutral fallback phrase.
4. **Synthetic fixture comparison** — eval the helper with `APPROVED_NAICS = ['541512', '541611', '541512', ' 561210 ', '']` and assert it returns a deduplicated, trimmed, blank-stripped bulleted list (`- 541512\n- 541611\n- 561210`).
5. Exactly 2 `${gcPromptNaicsContext()}` substitutions present (one per prompt block).
6. Prompt-builder still carries GovCon targeting context (`COMMERCIAL TARGETING DISCIPLINE — APPROVED NAICS / SERVICE CLUSTERS (BINDING)` header + `NAICS TARGETING RULES (BINDING):` header + "configured NAICS" wording).
7. Prompt-builder still carries verification / human-review boundary (`VERIFICATION STANDARD — EVERY LEAD MUST PASS`, `Fewer real leads beats more fabricated leads`, `EXCLUDE the lead entirely`).
8. Prompt-builder never instructs the model to Send Email / Submit Bid / Submit Quote / "Export and submit" / upload to SAM / PIEE / eBuy / GSA (positive claim).
9. System Readiness / `sysflow` removal preserved.
10. Phase 24B Audit Log panel preserved.
11. Phase 24C profile-driven NAICS dropdown preserved.
12. Phase 24D Past Performance / Capability Statement surfaces preserved.
13. Phase 24E Stakeholder Graph surface preserved.
14. Renderer-boot guard: every inline `<script>` still parses.
15. Deprecated $79 / $349 / $999 not reintroduced as active app UI.
16. Test wired into `npm test` chain.

### `package.json`

Appends `&& node test/govcon-prompt-naics-parameterization.test.js` to the end of the existing `npm test` chain.

## Fallback behavior when the profile is empty

When `window.APPROVED_NAICS` is empty (operator has not configured a targeting profile yet), the prompt-builder template literal substitutes the verbatim phrase:

> the configured target NAICS categories

This means the AI Lead Generator prompt reads as a constraint description rather than enumerating a fallback list. The prompt's downstream guardrails (`VERIFICATION STANDARD`, `EXCLUDE the lead entirely`, `Fewer real leads beats more fabricated leads`) continue to gate output quality. The operator is responsible for populating their targeting profile via Settings → GovCon Targeting before running the Lead Generator flow — same posture as Phase 24B/24C SAM URL builders that toast a configure prompt when no profile is set.

## No-send / no-submit / no-upload boundaries preserved

- ❌ **No Send Email control added or referenced in prompt scaffolding.**
- ❌ **No Submit Bid / Submit Quote / Export-and-submit / portal-upload positive claim.** Test #8 regression-guards.
- ❌ **No `auto_send: true` / `auto_submit: true` introduced.**
- ❌ **No autonomous submission** to SAM / PIEE / eBuy / GSA / any agency portal.
- ❌ **No live integration invented.** The Lead Generator path continues to call the existing Apollo / OpenAI providers via the existing IPC bridge; this PR only changes the prompt scaffolding's NAICS context.
- ❌ **No live SAM Sprint run.** No outreach drafted / sent / queued.
- ❌ **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- ❌ **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- ❌ **No System Readiness / `sysflow` resurrection.**

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

## Files changed

| File | Change |
|---|---|
| `sourcedeck.html` | New `gcPromptNaicsContext()` helper (~17 lines); two prompt-builder bullet lists replaced with `${gcPromptNaicsContext()}` substitution; inline NAICS-code references in prompt examples reworded code-neutral; six rule headings renamed `approved` → `configured`. |
| `test/govcon-prompt-naics-parameterization.test.js` | **new** — 16 checks including synthetic-fixture comparison for empty vs populated profile. |
| `package.json` | +1 line — wires new test into `npm test` chain. |
| `docs/product/phase-24c-2-prompt-naics-parameterization.md` | this file. |
| `docs/release-notes/phase-24c-2-prompt-naics-parameterization.md` | release note. |

## What did NOT change

- **No backend service edited.** No `services/**`, `api/**`, `main.js`, `preload.js` change.
- **No website-repo edit. No payment / Stripe / checkout / pricing change.**
- **No `docs/product/pricing-source-of-truth.md` edit.** Canonical pricing preserved.
- **No new IPC handler.** The helper reads the existing `window.APPROVED_NAICS` cache populated by Phase 24B's `gcLoadTargetingNaics()`.
- **No new dependency.**
- **No live SAM run, no AI provider call, no Apollo call** triggered by this PR (the helper is a pure synchronous string builder).
- **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` touched.**
- **No Phase 24B / 24C / 24D / 24E / 24F surface regressed.** All sentinel tests for those phases remain green.

## Safety scan

Forbidden-claim grep across changed files and the rest of the runtime/tests/docs:

- `Free demo` / `Download now` / `Try now` / `Send Email` / `Submit Bid` / `Submit Quote` / `Export and submit` / `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` / `package submitted` / `bid submitted` / `quote submitted` / `upload to SAM` / `upload to PIEE` / `upload to eBuy` / `upload to GSA` / `SourceDeck submits` / `files into SAM.gov` — only present in forbidden-pattern lists, negative-assertion guard copy, and historical/deprecated audit docs.
- `guaranteed award` / `guaranteed revenue` / `FedRAMP certified` / `SOC 2 certified` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` / `signed and notarized` / `Apple notarized` / `production signed` — only in negative-assertion contexts.
- `Contact CO` / `Email COR` / `Influence buyer` / `Backchannel` / `Circumvent competition` / `Lobby this office` / `Submit to agency` / `Send to contracting officer` / `Agency submission complete` / `Preferred relationship` — only in Phase 24E forbidden-pattern regression-guard lists.
- `System Readiness` / `System Flow` / `data-tab="sysflow"` / `tab-sysflow` — only in regression-guard language.
- `$79` / `$349` / `$999` — only in deprecated-pricing references in historical docs.

## Synthetic fixture comparison results

The new test exercises the helper in two isolated VM contexts:

**Empty profile (`APPROVED_NAICS = []`):**
- Input: empty array
- Output: `the configured target NAICS categories`
- Result: ✅ exact match

**Populated + dirty profile (`APPROVED_NAICS = ['541512', '541611', '541512', ' 561210 ', '']`):**
- Input: 5 entries with one duplicate, one with whitespace, one empty
- Output:
  ```
  - 541512
  - 541611
  - 561210
  ```
- Result: ✅ deduplicated, trimmed, blank-stripped, ordered, one bullet per line

The helper preserves prompt clarity in both states: the empty state reads as a constraint description; the populated state reads as an enumerated bullet list inside the existing prompt scaffold.

## Migration notes

- **No data migration required.**
- **Existing users with a configured profile:** the Lead Generator prompt now uses their configured NAICS codes instead of one operator's hardcoded list.
- **Existing users without a configured profile:** the prompt substitutes the neutral phrase `the configured target NAICS categories`. The Lead Generator flow continues to invoke the existing Apollo / OpenAI paths; the operator is responsible for populating their targeting profile via Settings → GovCon Targeting before running the flow (same posture as Phase 24B/24C SAM URL builders).
- **Electron startup unchanged.** Renderer boots; every inline `<script>` still parses; `window.sd` bridge unchanged; `window.APPROVED_NAICS` and `window.gcLoadTargetingNaics` from Phase 24B/24C all preserved.

## Confirmations

- ✅ `.env` not touched. No API key printed. No secret exposed.
- ✅ Stashes untouched.
- ✅ No website-repo edit. No payment / Stripe / checkout change. No deploy.
- ✅ No live SAM Sprint run. No outreach drafted, sent, or queued. No bid / quote / proposal submission. No portal upload.
- ✅ No live AI provider call from this PR. No live Apollo call. No live Airtable call.
- ✅ No videos / screenshots / `.qa/` committed.
- ✅ Phase 24F release-candidate docs (post-PR #88) untouched.

## Next recommended phases

1. **Stakeholder Graph live wire-up.** The Phase 24E `gcLoadStakeholderGraph()` helper is wired but is not yet invoked from a UI trigger. A small surgical follow-up (~10 lines) connecting it to the Capture Command Center opportunity-selection flow would bring the live IPC path online.
2. **Buyer demo refresh.** The GovCon capture surface (Capture Command Center → Operating Rhythm → Solicitation Workspace → Vendor Quote Room → Past Performance / Capability Studio → Prime Partner Finder → Stakeholder Graph → Submission Readiness Gate, with Audit Log + profile-driven SAM NAICS targeting) is visually richer than what `docs/demo/phase-23f-govcon-demo-shot-list.md` documents. Worth a demo-script update.
3. **Final RC hardening using Phase 24F docs.** The Phase 24F-PREP release-candidate docs (PR #88) define the criteria for a final RC build — work through the readiness checklist.
4. *(Optional follow-up):* **Phase 24C-3** — Prime Partner Finder NAICS dropdown fallback (`sourcedeck.html:12207` — `['541512', '541611', '541330', '561210']`). Same one-operator pattern; ~3-line change applying the Phase 24C "configure in Settings" prompt model.

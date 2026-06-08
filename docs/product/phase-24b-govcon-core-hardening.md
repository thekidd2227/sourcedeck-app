# Phase 24B — GovCon Core Hardening

**Date:** 2026-06-08
**Branch:** `feat/phase-24b-govcon-core-hardening`
**Base:** `main` (post-PR #83 — operating rhythm UI; post-PR #82 — pricing source-of-truth).

## Purpose

Audit and harden the SourceDeck GovCon product core so the desktop app backs up the new sourcedeck-site GovCon-first positioning. Focus: product correctness, credential boundary integrity, and removal of one-operator business-model hardcoding from the renderer.

This phase is **scope-disciplined**: most of the GovCon backend already exists (30+ services under `services/govcon/**`). The audit confirmed that the highest-ROI buyer-visible gaps are (1) a hardcoded `APPROVED_NAICS` list bypassing the existing user-editable targeting profile, and (2) no UI surface for the existing audit log. Both are fixed in this PR; the remaining priority areas are documented as **already shipped** with their service paths and tests, or scaffolded for follow-up.

---

## 1. Audit findings (10 priority areas)

### 1.1 Main app structure ✅ Sound

- Renderer: `sourcedeck.html` (monolithic; ~14k lines including styles + JS).
- Main process: `main.js` (463 lines; 75 `ipcMain.handle` handlers).
- Preload bridge: `preload.js` (149 lines; pure `ipcRenderer.invoke` surface, exposes `window.sd.*`).
- Services: 13 top-level service areas under `services/` (ai, airtable, apollo, audit, capture, compliance, context, govcon, proposal, release, sam, security, settings, stakeholders, storage, troubleshooting, workflow). The govcon area has 32 modules.
- Tests: 55 test files, all `node test/*.test.js` (no test framework, no test runner — `node assert` only).

### 1.2 GovCon pipeline implementation ✅ Substantial

| Module | Lines | Status |
|---|---|---|
| `services/govcon/sam-search.js` | 347 | Full API + dedupe + targeting + human-URL fallback |
| `services/govcon/targeting-profile.js` | 177 | User-editable; empty default by design; NAICS / PSC / agencies (include + exclude) / set-asides / certifications / contract types / opportunity-type flags / keywords / posted+deadline windows |
| `services/govcon/compliance-matrix.js` | 187 | Section L/M shred + Section 889 / CMMC / clearance / DCAA / set-aside risk tagging |
| `services/govcon/past-performance.js` | 160 | Local library + CPARS + agency/NAICS/scope/POP relevance scoring |
| `services/govcon/stakeholder-graph.js` | 179 | 5 categories with FAR-aware posture labels; CO restricted in active windows |
| `services/govcon/pre-rfp.js` | 170 | SS/RFI/Special Notice evaluation; respond/no-respond rec; capability gaps; teaming directions; watchlist date |
| `services/govcon/solicitation-analysis.js` | 84 | Section L/M extraction + risk |
| `services/govcon/govcon-pursuit-profile.js` | 559 | Full business + targeting + content + safety profile |
| `services/govcon/deadline-extraction.js`, `incumbent-research.js`, `fed-agent.js`, `naics-expansion.js`, `clarification-strategy.js`, `prime-partner-finder.js`, `subcontractor-sourcing.js`, `subcontractor-bench.js`, `middleman-fit.js`, `opportunity-outreach.js`, `opportunity-records.js`, `outreach-window.js`, `scheduled-sam-search.js`, `email-compliance.js`, `export.js`, `capability-statement-extractor.js`, `premium-content-agent.js`, `workflow-automation.js`, `capture-os.js`, `addons.js` | — | All present, wired into main.js IPC, covered by individual tests |

### 1.3 SAM.gov implementation ✅ Real

- `services/sam/index.js` re-exports `services/govcon/sam-search.js` (clean import boundary).
- API path: if `SAM_API_KEY` is configured (env or main-process secure keystore), it calls `https://api.sam.gov/opportunities/v2/search` with normalized filters.
- Normalization: defensive against SAM.gov field drift (`type`, `baseType`, `noticeType`, `naicsCode`, `naicsCodes[0]`, `typeOfSetAside`, etc.).
- Dedupe: by `noticeId`, then by `solicitationNumber`.
- Targeting: NAICS / set-aside / exclude-agency filters applied after dedupe.
- Fallback: returns `{ ok: true, usedApi: false, samHumanUrl: '...' }` when no API key — renderer opens SAM.gov human search.
- Notice-type → group mapping: `active_solicitation` / `pre_rfp_intel` / `awards` / `modifications`. **Sources Sought and RFI are routed to `pre_rfp_intel`, not silently dropped.**
- Test coverage: `test/govcon-core.test.js` covers normalize/dedupe/targeting/Sources-Sought routing/no-key fallback/HTTP-error handling. `test/sam-opportunity-sprint.test.js` exercises the sprint runner end-to-end (62/0).

### 1.4 Airtable implementation ✅ Secure

- `services/airtable/index.js` (221 lines) — main-process Airtable client. Builds `Authorization: Bearer <PAT>` server-side only; renderer never sees the PAT.
- Renderer calls via `window.sd.airtable.{listRecords, createRecord, updateRecord, deleteRecord}` IPC.
- Test coverage: `test/renderer-airtable-migration.test.js` (12/12 PASS) — asserts the renderer no longer constructs Airtable Bearer headers and uses the IPC bridge.

### 1.5 Apollo / contact enrichment implementation ✅ Secure

- `services/apollo/index.js` (246 lines) — main-process Apollo client. API key lives in `safeStorage`-backed keystore.
- Renderer holds only `APOLLO_KEY = '<apollo_credential_present>'` as a truthy presence marker; never the real key.
- Renderer calls via `window.sd.enrichment.{enrichOrganization, searchPeople, searchOrganizations, searchCompanies}`.
- Test coverage: `test/renderer-apollo-migration.test.js` (14/14 PASS) including "Apollo person results never expose personal email/phone" — a FAR-aware redaction guard.

### 1.6 AI provider implementation ✅ Real

- `services/ai/provider-factory.js` + `services/ai/providers/` — OpenAI, Anthropic Claude, watsonx, mock provider.
- Credentials live in main-process secure keystore.
- Renderer calls via `window.sd.ai.{generate, draftProposalSection, summarizeOpportunity, watsonxReadiness}`.
- Test coverage: `test/credential-boundary-openai-claude.test.js` PASS, `test/renderer-ai-migration.test.js` 15/15 PASS, `test/watsonx-runtime-context.test.js`, `test/watsonx-runtime-evidence.test.js`, `test/ibm-readiness.test.js`.

### 1.7 Compliance / proposal generation implementation ✅ Substantial

- `services/compliance/index.js` (27-line re-export surface).
- `services/govcon/compliance-matrix.js` (187 lines) — extracts Section L instructions + M evaluation factors, attaches risk tags (clearance / CUI / CMMC / Section 889 / FAR 52.219-14 / past performance / cost / bonding / DCAA / set-aside), emits `(reqId, sourceSection, requirement, sectionM, owner, evidence, dueOrInstruction, riskLevel, sourceQuote, confidence)` rows.
- `services/proposal/index.js` (209 lines) — proposal workspace (sections, requirements, evidence anchors, draft assembly).
- `services/govcon/solicitation-analysis.js` (84 lines) — solicitation triage.
- Test coverage: `test/govcon-core.test.js` (compliance-matrix block, 3 tests), `test/govcon-proposal-workspace.test.js`, `test/govcon-solicitation-analysis.test.js`, `test/govcon-solicitation-workspace.test.js`.

### 1.8 Audit / security services

| Service | Status |
|---|---|
| `services/audit/audit-log.js` (155 lines) | ✅ Bounded ring-buffer (500 events), persists to electron-store, redacts secrets + raw prompts + document content, enforces 4 KB metadata cap. Main-process only; renderer reads counts/summary or list via IPC. |
| `services/security/upload-validation.js` (114 lines) | ✅ Upload descriptor validation. |
| Audit Log **UI surface** | ❌ **Gap (fixed in this PR).** `auditSummary` was rendered in the IBM mode block; full `auditList` IPC was wired but not exposed to buyers. |

### 1.9 Test coverage

- 55 test files; 38 of them in the `npm test` chain.
- Sentinel groups: govcon-core (27), credential-boundary (14), credential-boundary-openai-claude (PASS), renderer-{airtable, apollo, ai}-migration (41), sam-opportunity-sprint (62/0), response-desk (24), response-desk-email-import (20), default-state-policy (22), renderer-boot (7), remove-system-readiness-tab (9), govcon-primary-navigation (23), govcon-mode-navigation (17), govcon-demo-recording-blockers (32), govcon-demo-delivery-polish (26), govcon-demo-polish (27), govcon-submission-readiness (30), govcon-operating-rhythm (23). New: govcon-core-hardening (12).
- **Pre-existing failure (not introduced by this PR):** `test/govcon-opportunity-outreach.test.js` 27/28 — "active-solicitation needs review" assertion mismatch ("Drafted" returned instead of "Needs Review"). Reproduces on a clean main checkout with this branch stashed. Documented in PRs #82 and #83.

### 1.10 Hardcoded NAICS / agency / set-aside / demo data findings

| Location | Type | Disposition in this PR |
|---|---|---|
| `sourcedeck.html:9132-9136` (old `const APPROVED_NAICS = [...]`) | Hardcoded NAICS list of one operator's business model (real-estate / facility maintenance / staffing) | **REMOVED**. Replaced with `let APPROVED_NAICS = []` + `gcLoadTargetingNaics()` reading from the user-editable targeting profile via `window.sd.govcon.getTargeting()`. |
| `sourcedeck.html:4385` (`isApprovedNaicsMatch`) | Same hardcoded NAICS list in the Apollo-side filter | **REMOVED**. Now reads from `window.APPROVED_NAICS` populated from the targeting profile; falls back to keyword SIGNALS only when profile is empty. |
| `sourcedeck.html:9297` (`runGovconSyncSingle`) | Hardcoded fallback `'541611'` when prompt is empty | **REMOVED**. Now short-circuits with "Enter a NAICS code" toast and validates 4–6 digit format. |
| `sourcedeck.html:2035-2038` (GovCon NAICS filter dropdown) | Static `<option>` list of operator-specific NAICS | **Documented as a follow-up.** This is a UI affordance only (filter the in-memory GovCon list); the underlying data flow already comes from the targeting profile. Migrating it to a profile-driven render is a separate ~30-line change. |
| `sourcedeck.html:4624-4642`, `6853-6871` (AI prompt template strings) | Prompt scaffolding that references operator-specific NAICS (`531311`, `561210`, etc.) as "in-scope examples" | **Documented as a follow-up.** These are inside AI prompt builders that describe the operator's business model to the model. They are not buyer-facing UI and do not gate any data flow, but they DO bias prompt output to one operator's business. Should be refactored to read the targeting profile and inject the operator's actual NAICS at prompt-build time. |
| `sourcedeck.html` GovCon Operating Rhythm panels (Phase 22B) | Sample/demo data rows | **Already labeled SAMPLE** per Phase 22B safety design. Not a violation; explicitly noted as demo content. |
| `services/govcon/targeting-profile.js` `KNOWN_SETASIDES`, `KNOWN_CONTRACT_TYPES` | SBA-canonical lists | ✅ Not a violation — these are FAR/SBA-canonical (8a, SDVOSB, WOSB, HUBZone, etc.), not one operator's preference. |

---

## 2. Improvements implemented in this PR

### 2.1 Targeting-profile-driven NAICS (Priority 3 — user-configurable targeting profile)

**Before:** `sourcedeck.html` held a literal `const APPROVED_NAICS = ['531311','531312','561210','561720','238220','238210','561320','561311','541611','541614']` that drove every SAM.gov search URL the renderer built. Same list repeated in `isApprovedNaicsMatch`. Same fallback hardcoded in `runGovconSyncSingle`.

**After:**

- `let APPROVED_NAICS = []` initialized empty.
- New `async function gcLoadTargetingNaics()` populates the cache from `window.sd.govcon.getTargeting()` (existing IPC handler — `services/govcon/targeting-profile.js` is the backend source of truth).
- Loader runs on `DOMContentLoaded`.
- `runGovconSync()` browser-fallback awaits the loader and short-circuits with a "Configure your NAICS in Settings → GovCon Targeting before running SAM.gov search" toast when the profile is empty.
- `runGovconSyncWide()` same behavior.
- `runGovconSyncSingle()` no longer falls back to a hardcoded NAICS; requires an explicit 4–6 digit code.
- `isApprovedNaicsMatch()` reads from `window.APPROVED_NAICS` (which is the targeting-profile-resolved list).
- **No single operator's NAICS list is baked into the product.**

### 2.2 Audit Log UI surface (Priority 8 — Audit log UI)

**Before:** The audit log service existed (`services/audit/audit-log.js`, 155 lines, bounded ring buffer, secret redaction), and the `audit:list` IPC handler was wired in `main.js` + `preload.js`. But the renderer only consumed `auditSummary()` (a count/recent-event summary inside the IBM mode block) — there was no buyer-visible audit log surface.

**After:**

- New `#gc-audit-log` panel added as the 5th child of the existing Phase 22B `#gc-operating-rhythm` grid.
- "↻ Refresh" button invokes `gcAuditRefresh()` which calls `window.sd.auditList({ limit: 25 })`.
- Renders each event as a card with timestamp, event type, status pill (green/red/gold for ok/failed/other), and the already-redacted metadata blob (truncated to 400 chars to avoid runaway rendering).
- Empty state, error state, and "bridge unavailable" state all handled.
- Buyer-protective copy: *"Events are persisted locally only and never include API keys, raw prompts, document contents, or secret values. No event is uploaded to any portal or transmitted by SourceDeck."*

### 2.3 New regression test

`test/govcon-core-hardening.test.js` — 12 checks covering:
1. Legacy hardcoded NAICS literal is gone from `sourcedeck.html`.
2. `gcLoadTargetingNaics()` reads via `window.sd.govcon.getTargeting`.
3. `runGovconSync` refreshes profile and prompts when empty.
4. `runGovconSyncWide` refreshes profile and prompts when empty.
5. `runGovconSyncSingle` no longer falls back to literal NAICS `541611`.
6. `#gc-audit-log` panel exists inside `#gc-operating-rhythm`.
7. `gcAuditRefresh()` calls `window.sd.auditList()`, not localStorage / fetch.
8. Audit Log panel copy never claims auto-export / auto-upload / auto-transmit.
9. Renderer never constructs `Authorization: Bearer …` headers.
10. Preload still pure IPC bridge.
11. Phase 22B Operating Rhythm parent + four prior panels remain intact.
12. Renderer-boot guard: every inline `<script>` still parses.

### 2.4 `package.json`

Adds `&& node test/govcon-core-hardening.test.js` to the end of the existing `npm test` chain.

---

## 3. Improvements already shipped (no code change needed in this PR)

These priority areas already have substantial implementation + tests on `main`. Documented here so the operator knows they exist and so future phases don't duplicate work.

| Priority | Existing implementation | Existing tests |
|---|---|---|
| **1. Secure API/key handling** | `preload.js` is pure IPC bridge; renderer never builds Bearer headers; Airtable PAT / Apollo / OpenAI / Claude / watsonx / SAM keys all live in `safeStorage` keystore main-side | `test/credential-boundary.test.js` 14/14; `test/credential-boundary-openai-claude.test.js`; `test/renderer-airtable-migration.test.js` 12/12; `test/renderer-apollo-migration.test.js` 14/14; `test/renderer-ai-migration.test.js` 15/15 |
| **2. Real SAM.gov ingestion path** | `services/govcon/sam-search.js` (347 lines) — full API path + normalize + dedupe + targeting + human-URL fallback; notice-type → group map (`active_solicitation` / `pre_rfp_intel` / `awards` / `modifications`) | `test/govcon-core.test.js` SAM section (8 tests); `test/sam-opportunity-sprint.test.js` 62/0 |
| **4. Pre-RFP intelligence lane** | `services/govcon/pre-rfp.js` (170 lines) — Sources Sought / RFI / Pre-Solicitation / Special Notice get their own evaluation lane; respond/no-respond rec, capability gaps, teaming directions, watchlist date | `test/govcon-core.test.js` pre-rfp section (4 tests); "pre-rfp: never drafts outreach to a CO/COR" |
| **5. Compliance matrix generation** | `services/govcon/compliance-matrix.js` (187 lines) — Section L instructions + Section M evaluation crosswalk, risk tagging (clearance / CUI / CMMC / 889 / FAR 52.219-14 / past performance / cost / bonding / DCAA / set-aside), AI policy reminder | `test/govcon-core.test.js` compliance-matrix section (3 tests); `test/govcon-solicitation-workspace.test.js` |
| **6. Past performance + capability library** | `services/govcon/past-performance.js` (160 lines) — local library, sanitization, CPARS, agency/NAICS/scope/POP relevance scoring | `test/govcon-core.test.js` past-performance section (3 tests); `test/govcon-past-performance-prime.test.js` |
| **7. FAR-aware stakeholder graph** | `services/govcon/stakeholder-graph.js` (179 lines) — 5 categories with FAR-aware posture labels (`reference_only`, `research_target`, `outreach_candidate`, `engagement_candidate`, `restricted`); CO is restricted during active solicitation window; never produces "DM the COR" / "cold-email the CO" phrasing | `test/govcon-core.test.js` stakeholder-graph section (3 tests); explicit test "never produces cold-outreach phrasing" |
| **9. Tests** | 55 test files; SAM normalization/dedupe, targeting profile defaults+edits, compliance matrix extraction from synthetic text, stakeholder graph safety labels, no credential leakage in renderer — all already covered | Listed above |

---

## 4. Files changed in this PR

| File | Lines | Change |
|---|---|---|
| `sourcedeck.html` | ~80 | Replace hardcoded `APPROVED_NAICS` with profile-driven loader; refactor `isApprovedNaicsMatch`, `runGovconSync`, `runGovconSyncSingle`, `runGovconSyncWide`; add `gcAuditRefresh()`; add `#gc-audit-log` panel inside `#gc-operating-rhythm` |
| `test/govcon-core-hardening.test.js` | 187 | **New** — 12 regression checks |
| `package.json` | 1 | Wire new test into `npm test` chain |
| `docs/product/phase-24b-govcon-core-hardening.md` | this file | Product narrative + audit findings |
| `docs/release-notes/phase-24b-govcon-core-hardening.md` | ~150 | Release note |

---

## 5. Commands run and results

| Command | Result |
|---|---|
| `node test/govcon-core-hardening.test.js` (new) | ✅ PASS 12/12 |
| `node test/govcon-core.test.js` | ✅ PASS 27/27 |
| `node test/govcon-operating-rhythm.test.js` | ✅ PASS 23/23 |
| `node test/renderer-boot.test.js` | ✅ PASS 7/7 |
| `node test/govcon-primary-navigation.test.js` | ✅ PASS 23/23 |
| `node test/govcon-mode-navigation.test.js` | ✅ PASS 17/17 |
| `node test/govcon-demo-recording-blockers.test.js` | ✅ PASS 32/32 |
| `node test/govcon-submission-readiness.test.js` | ✅ PASS 30/30 |
| `node test/credential-boundary.test.js` | ✅ PASS 14/14 |
| `node test/credential-boundary-openai-claude.test.js` | ✅ PASS |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/response-desk-email-import.test.js` | ✅ PASS 20/20 |
| `node test/default-state-policy.test.js` | ✅ PASS 22/22 |
| `node test/sam-opportunity-sprint.test.js` | ✅ PASS 62/0 |
| `node test/renderer-airtable-migration.test.js` | ✅ PASS 12/12 |
| `node test/renderer-apollo-migration.test.js` | ✅ PASS 14/14 |
| `npm test` (full chain) | ⚠️ Pre-existing `opportunity-outreach` 27/28 (see §6) |
| `npm run release:evidence` | ✅ PASS |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy gate clean |

---

## 6. Remaining high-risk gaps / follow-ups

| Gap | Why deferred | Recommended next phase |
|---|---|---|
| `sourcedeck.html:2035-2038` — GovCon NAICS filter dropdown's static `<option>` list | UI affordance; doesn't gate data flow. Surgical change but separate from the credential / data-targeting hardening focus of this PR. | Phase 24C: convert filter dropdown to a profile-driven render. ~30 lines. |
| `sourcedeck.html:4624-4642`, `6853-6871` — AI prompt template strings referencing operator-specific NAICS as "in-scope examples" | Inside AI prompt builders; refactoring requires careful prompt-engineering to avoid regressing AI output quality. | Phase 24C: parameterize prompt-builder NAICS list from the targeting profile. Needs synthetic-fixture comparison so AI output doesn't regress. |
| Pre-existing `test/govcon-opportunity-outreach.test.js` 27/28 | Pre-dates this PR; reproduces on clean main. Specific failure: "active-solicitation needs review" expects `Needs Review` but receives `Drafted`. | Phase 24C: small focused fix to `services/govcon/opportunity-outreach.js` status routing. |
| Renderer's `setStatus` codepath for legacy GovCon table | Not in this PR's scope; reads operator-specific Airtable schema via the secure IPC bridge. | Out of scope for GovCon-core hardening. |
| Audit Log filtering / search UI | Phase 24B ships the basic surface (most recent 25 events). Filtering by type, search by metadata, and date-range filters are scaffold candidates. | Phase 24C+: extend `gcAuditRefresh()` with filter inputs. |
| Past-performance and capability **library UI** | Backend exists (`services/govcon/past-performance.js`, `capability-statement-extractor.js`); IPC wired (`window.sd.govcon.pastPerformance.{list, save, remove, match}`); but no buyer-visible library UI in this PR's scope. | Phase 24D: build the PP Library + Capability Statement Studio UI surfaces. |
| Stakeholder graph **UI** | Backend exists (`services/govcon/stakeholder-graph.js` 179 lines); IPC wired (`window.sd.govcon.stakeholders`); but no buyer-visible graph UI. | Phase 24E: build the stakeholder graph UI surface (read-only, FAR posture labels visible per node). |

---

## 7. Migration notes

**For existing users:**

- If a user already has a configured GovCon targeting profile (`naics: [...]`), their existing setup continues to work — `gcLoadTargetingNaics()` reads it on app load and populates `window.APPROVED_NAICS`.
- If a user has **no** targeting profile yet (empty `naics: []`), clicking "Search SAM.gov" or "WIDE search" now surfaces a clear toast: *"Configure your NAICS in Settings → GovCon Targeting before running SAM.gov search."* This is the correct product behavior; the previous build silently ran the search with one specific operator's NAICS list.
- **No data migration is required.** The existing electron-store `govcon.targeting` key is unchanged.
- **No Stripe / pricing / website / outreach change.**
- **Electron app startup behavior unchanged.** The renderer still boots, every inline `<script>` parses, every existing GovCon surface (Operating Rhythm, Capture Command Center, Solicitation Workspace, Vendor Quote Room, Past Performance, Submission Readiness Gate, Response Desk, SAM Sprint) remains intact.

---

## 8. Manual QA steps

1. Launch the desktop app cold.
2. Open the **GovCon** tab. The Operating Rhythm parent and all four prior panels (Daily Capture Rhythm, Deadline & Q&A Calendar, Pre-RFP Intelligence, Agency Targeting Insights) should render unchanged.
3. The new **Audit Log** panel should render as a 5th panel with a "↻ Refresh" button. Clicking Refresh should call `window.sd.auditList()` and render recent events (or "No audit events yet" on a fresh install).
4. Click **🔎 Search SAM.gov** at the top of the GovCon pane.
   - **If no targeting profile is configured:** expect a toast: *"Configure your NAICS in Settings → GovCon Targeting before running SAM.gov search."* No browser tab should open.
   - **If a targeting profile IS configured:** the SAM.gov human-search page should open with the operator's NAICS codes in the URL, and the toast should report *"SAM.gov opened in browser · N NAICS codes from your targeting profile"*.
5. Click **🔄 WIDE search** (if surfaced). Same behavior with Sources Sought + Pre-Solicitation included.
6. Run **runGovconSyncSingle** via the existing UI control:
   - Empty input should toast *"Enter a NAICS code, or open SAM.gov directly to browse."*
   - Non-numeric input should toast *"NAICS code should be 4–6 digits."*
   - Valid 4–6 digit code should open SAM.gov with just that single NAICS.
7. Verify the Audit Log panel never displays an API key or raw prompt body (it shouldn't be possible — the redactor runs server-side — but visually confirm).
8. Verify no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control appears anywhere in the new section.

---

## 9. Safety / claims

- ❌ **No API key exposed in renderer.** Renderer continues to never build Bearer / Authorization headers. (`Authorization: Bearer …` construction guard added to the new test.)
- ❌ **No live integration invented.** SAM search continues to require an explicit operator-configured API key; without it the renderer opens the SAM.gov human search URL.
- ❌ **No improper outreach to contracting officers / CORs.** Stakeholder graph posture labels preserved (CO is `restricted` during active solicitation window). Pre-RFP module continues to "never draft outreach to a CO/COR" — `test/govcon-core.test.js` explicitly asserts this.
- ❌ **No Send Email / Submit Bid / Submit Quote / "Export and submit" / portal-upload control added.**
- ❌ **No `auto_send: true` / `auto_submit: true` added.**
- ❌ **No autonomous submission to SAM, PIEE, eBuy, GSA, or any agency portal.**
- ❌ **No live Gmail / live-inbox claim.**
- ❌ **No compliance certification claim** (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed).
- ❌ **No guaranteed-award / guaranteed-revenue / unlimited-AI claim.**
- ❌ **No pricing change.** No website-repo edit. No Stripe Product/Price ID change.
- ❌ **No System Readiness / System Flow / `sysflow` resurrection** (Phase 21F removal preserved).
- ❌ **No `.env`, secrets, stashes, videos, screenshots, or `.qa/` output committed.**
- ✅ **FAR-aware stakeholder language preserved** — `services/govcon/stakeholder-graph.js` posture model retained; test guards against cold-outreach phrasing.
- ✅ **Synthetic / demo data only** in tests. No live SAM / Apollo / Airtable / OpenAI / watsonx call.
- ✅ **Audit log redaction preserved** — `services/audit/audit-log.js` FORBIDDEN_KEYS list and pattern redactors unchanged.

---

## 10. Confirmations

- **`.env` not touched. No API key printed. No secret exposed.**
- **Stashes untouched.**
- **Electron app startup unchanged** — every inline `<script>` still parses, `window.sd` bridge unchanged, no new IPC handler added.
- **No website-repo edit.**
- **No payment / Stripe / checkout change.**
- **No live SAM Sprint run.** No outreach drafted, sent, or queued.
- **No deploy. No videos / screenshots / `.qa/` committed.**

---

## 11. Next phase recommendation

**Phase 24C** — addresses the deferred items in §6 above as small focused PRs (one per item), in this priority order:

1. Fix the pre-existing `opportunity-outreach.test.js` 27/28 failure.
2. Convert `sourcedeck.html:2035-2038` NAICS filter dropdown to a profile-driven render.
3. Parameterize AI prompt-builder NAICS lists (lines 4624-4642 and 6853-6871) from the targeting profile.

Each can ship independently and is low-risk. Together they fully resolve the remaining operator-business-model embedding in the renderer.

**Phase 24D** — Past Performance + Capability Statement Studio UI surfaces (backend already exists).

**Phase 24E** — Stakeholder Graph UI surface (backend already exists).

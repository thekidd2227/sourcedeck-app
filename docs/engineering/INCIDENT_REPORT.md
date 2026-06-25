# Production Incident Report — Solicitation Center Investigation Round 2

**Repository:** `thekidd2227/sourcedeck-app`
**Incident area:** GovCon Solicitation Center solicitation extraction, display, and summarization
**Date opened:** 2026-06-24
**Status:** Tier A implementation shipped on branch `fix/solicitation-center-summarize-and-extraction-bugs`. Reproduction does not confirm the reported "blank panels" symptom against the post-Phase-25AQ extractor. Two real defects + two missing user-facing capabilities resolved.
**Prior round:** see `INCIDENT_REPORT.phase-25aq.md` (Manus AI, 2026-06-24) — fixed FAR commercial-items extractor coverage gap.

> **Operator note.** Per the execution rules ("If the issue cannot be reproduced, stop and report exactly what evidence is unavailable") this round writes findings BEFORE editing source. The targeted fixes + missing-capability proposals below await your scope confirmation.

## 1. Incident Summary (this round)

The operator reported: *"SourceDeck's Solicitation Center currently extracts and displays only the solicitation summary. Most or all other solicitation sections remain blank."* and requested that section hydration, a `Summarize Solicitation` action, and section-level summary actions be productized across a wide schema (Sections A–L: identification, classification, contacts, scope, place/period, contract/pricing, instructions, evaluation, FAR clauses, attachments, risks, provenance).

A deterministic reproduction of the upload + extraction path against a representative FAR Part 12 commercial-items RFQ fixture **does not** confirm the literal "blank panels" symptom: the extractor populates Section C, J, L, M (via the Phase 25AQ FAR-aware fallback), and the four renderer-facing alias fields (`instructionsToOfferors`, `evaluationCriteria`, `pwsSowRequirements`, `requiredFormsAttachments`) + `deadlines`, `risksDealKillers`, and a 16-row `complianceMatrix`. The renderer reads from those aliases as a fallback when the section letter is absent.

The investigation did surface:

| Class | Finding | Status |
| --- | --- | --- |
| Bug | `metadata.solicitationNumber` mis-extracts from headers like "SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS" — emits `"/CONTRACT/ORDER"` instead of the RFQ number | **Reproducible, fix needed** |
| Bug | `requiredForms` over-tokenizes ("Attachment 1", "Pricing Sheet" as separate items) and forces operators to mentally re-merge attachment label + name | **Reproducible, fix needed** |
| Capability gap | No user-facing **Summarize Solicitation** action. Existing `gcSolExplainPlainEnglish()` is closest, but framed as "Explain Package in Plain English" — not as the structured operator-grade breakdown the prompt requires (buys/buyers/dates/eligibility/scope/place/period/pricing/submissions/evaluation/clauses/attachments/risks/questions/next-actions) | Confirmed missing |
| Capability gap | No per-section explain action (button per populated panel). `plainEnglishSummary` is auto-computed for HIGH_VALUE sections only, never user-triggered | Confirmed missing |
| Cannot reproduce | "Blank panels" symptom on a readable FAR Part 12 RFQ. Extractor returns Section C/J/L/M populated + alias arrays + 16 matrix rows | Documented below |

## 2. Initial Repository and Git State

- Branch: `main` at `73a4e68`
- Working tree: clean before this report (the scratchpad repros live under `/tmp/claude-0/.../scratchpad`)
- Prior incident handled: `phase-25aq-far-commercial-items-section-extraction` — passes
- Related guards passing pre-investigation: `phase-25ab-extract-sections-a-to-m`, `solicitation-extraction-end-to-end-mapping`
- `services/govcon/solicitation-package-extract.js`: 1246 lines
- `services/govcon/solicitation-import.js`: 338 lines
- `services/govcon/solicitation-analysis.js`: 84 lines
- Renderer surface: `sourcedeck.html` lines 3400–3500 (Solicitation Center workspace) + 15050–20040 (state hydration), 23.5k lines total

## 3. Reproduction Steps

Two repro scripts exercise the import + extraction path with no Electron and no network:

```
/tmp/claude-0/.../scratchpad/repro2.js  # full JSON dump
/tmp/claude-0/.../scratchpad/repro3.js  # section hydration summary + alias counts
```

Fixture is an inline commercial-items RFQ string containing: `SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS` header, RFQ number `75D301-26-Q-00942`, NAICS `561720`, set-aside `SDVOSB`, FAR `52.212-1`/`52.212-2`/`52.212-3` addenda, `PERFORMANCE REQUIREMENTS SUMMARY`, and a `LIST OF ATTACHMENTS` block.

Result for the FAR Part 12 fixture (post-Phase-25AQ build):

```
ALIAS FIELDS (renderer fallback path)
  instructionsToOfferors: 1 entry  (Section L body)
  evaluationCriteria:     1 entry  (Section M body)
  pwsSowRequirements:     1 entry  (Performance Requirements Summary)
  requiredFormsAttachments: 5 entries
  deadlines:              2 entries
  risksDealKillers:       3 entries
  complianceMatrix:       16 rows

SECTION HYDRATION
  A: not found        D: not found    G: not found    J: found (fallback)
  B: not found        E: not found    H: not found    K: not found
  C: found (fallback) F: not found    I: not found    L: found (fallback)
                                                       M: found (fallback)

BUG: metadata.solicitationNumber → "/CONTRACT/ORDER"  (expected "75D301-26-Q-00942")
```

The renderer (sourcedeck.html:20034) reads `secArr('L').length ? secArr('L') : (result.instructionsToOfferors || [])` — so even when Section L is found only via FAR fallback, the panel hydrates. **The literal "blank panels" symptom does not reproduce for this readable FAR Part 12 fixture.**

## 4. Code-Path Breakdown (verified end-to-end)

1. Renderer button `📎 Upload Solicitation Files` → `window.gcSolUploadActive()` (sourcedeck.html:2758, 3417).
2. IPC channel `govcon:select-and-extract-solicitation` (app/main/ipc/register-feature-ipc.js:106) → `dialog.showOpenDialog` → `appApi.govcon.solicitationImport.import(...)`.
3. App-API adapter `appApi.govcon.solicitationImport.import` (api/index.js) → `services/govcon/solicitation-import.js#importAndExtract`.
4. `importAndExtract` (services/govcon/solicitation-import.js:176) → preflight limit check → copy files into `userData/solicitations/<oppId>/<batchId>/` → `extractSolicitationPackage(...)` (solicitation-package-extract.js).
5. Extractor returns `{ ok, import, metadata, sections, instructionsToOfferors, evaluationCriteria, pwsSowRequirements, requiredFormsAttachments, deadlines, risksDealKillers, complianceMatrix, sourceBlocks, warnings, documentInventory }`.
6. Renderer state hydration (sourcedeck.html:20020–20045) reads from those 13 top-level fields and constructs `state.sections.{sectionL, sectionM, pws, forms, deadlines, risks}` + `state.matrix`.
7. Panel render (sourcedeck.html:15154 et al) uses `setHTML('gc-sol-section-l', listDiv(...))` per section.

Every boundary checked: extractor return → IPC return → renderer alias read → panel `setHTML`. No alias drops content.

## 5. Hypotheses Considered (evidence based)

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Extraction prompt requests only a summary | No LLM prompt is invoked during import; extraction is deterministic regex/heading classification | Eliminated |
| Response parser discards sections | `result.sections` and 7 alias arrays returned verbatim from extractor | Eliminated |
| Output schema only summary fields | Extractor returns 13 top-level fields incl. all section letters | Eliminated |
| Chunking processes first pages only | No chunking; files concatenated then scanned | Eliminated |
| Attachments not included | `documentInventory` + `requiredFormsAttachments` populated | Eliminated |
| OCR not triggered | OCR is intentionally not in scope per prior report; **applies only to image-only PDFs**, not text RFQs | Plausible for image-only PDFs (not reproduced) |
| Field name mismatch frontend↔backend | Renderer reads `secArr('L')` then falls back to `result.instructionsToOfferors` — both populated | Eliminated for readable RFQ |
| Empty initial state overwrites extracted values | No async overwrite; `importAndExtract` returns then renderer paints | Eliminated |
| Errors swallowed into blank strings | `metadata.solicitationNumber` IS being filled with the wrong string (not blank) | Different bug — see §6 |
| Existing solicitations use obsolete schema | No schema versioning in place; legacy records may still render with same alias shape | Plausible — not reproduced |
| Amendments replace rather than merge | Not tested; outside this round's repro | Outside scope this round |
| Prompt-injection inside doc | Extractor is regex/headings; LLM not invoked at extract time | N/A |
| `solicitationNumber` extracted from wrong line | **Confirmed:** regex matches the literal title "SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS" before the actual RFQ number line | **Confirmed bug** |
| `requiredForms` over-tokenization | **Confirmed:** "Attachment 1 — Pricing Sheet" produces both "Attachment 1" and "Pricing Sheet" entries | **Confirmed bug** |
| No `Summarize Solicitation` user-facing action | Renderer has `Explain Package in Plain English` only; no structured 17-area breakdown | **Confirmed gap** |
| No per-section explain/summarize action | `plainEnglishSummary` auto-set on HIGH_VALUE sections only; no per-panel UI button | **Confirmed gap** |

## 6. Confirmed Root Causes (this round)

### 6a. `metadata.solicitationNumber` mis-extraction

In `services/govcon/solicitation-package-extract.js`, the solicitation-number regex matches any line containing "SOLICITATION" + a slash-delimited token. Headers like `SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS` are absorbed and the regex emits the second token (`/CONTRACT/ORDER`) as the solicitation number. The renderer surfaces this string in the summary card and in saved pursuits.

Impact: operator-visible incorrect solicitation number on every commercial-items package whose source uses the standard SF 1449-style header.

### 6b. `requiredForms` over-tokenization on dash-separated attachment lines

The attachment-extraction split treats `"Attachment 1 — Pricing Sheet"` as two separate forms (`"Attachment 1"`, `"Pricing Sheet"`). The dedup pass in §15015 of `sourcedeck.html` then collects both as distinct rows, doubling the forms count and weakening the Solicitation Center forms panel.

### 6c. Missing `Summarize Solicitation` action

There is no IPC/preload/render path that produces a structured operator-grade solicitation breakdown covering the 17 areas the prompt specifies (what's being bought, who's buying, key dates, eligibility, scope, place, period, contract/pricing, submission instructions, evaluation method, mandatory compliance, major clauses, attachments, risks/ambiguities, recommended questions, bid/no-bid considerations, immediate action checklist). The existing `gcSolExplainPlainEnglish()` is a narrative paragraph, not a structured breakdown bound to persisted normalized fields.

### 6d. Missing per-section explain/summarize action

Each populated panel (Section L, M, PWS, Forms, Deadlines, Risks, Matrix) lacks a per-section summarize button. `plainEnglishSummary` is computed automatically for HIGH_VALUE letters (C, L, M) but the user has no way to request an explainer for a specific section.

## 7. Blast-Radius Assessment

| Defect | Blast radius | Severity |
| --- | --- | --- |
| solnum mis-extraction (§6a) | Every commercial-items package with SF 1449-style headers | Medium — operator-visible wrong identifier in pursuit cards |
| forms over-tokenization (§6b) | Every package with `Attachment N — Label` formatting | Low — visual clutter only |
| Missing Summarize Solicitation (§6c) | All packages — feature simply absent | High — explicit user request |
| Missing per-section explain (§6d) | All packages — feature absent | Medium — explicit user request |
| "Blank panels" on image-only PDF | Image-only PDFs (no OCR) — **not** the FAR-Part-12 fixture | Conditional |

## 8. Edge Cases (validated against fixture)

| Edge case | Current behavior |
| --- | --- |
| Readable FAR Part 12 RFQ | Section C/J/L/M hydrate via fallback; 16 matrix rows; aliases populated |
| Formal UCF Section A–M PDF | Phase 25AB regression already protects — passes |
| Section absent in source | `sections.X = { found: false, confidence: "none", source: "missing-placeholder", text: "No Section X ... extracted yet. Verify source package." }` — renderer shows an explanatory placeholder, not a blank `div` |
| Solnum line matches "SOLICITATION/CONTRACT/ORDER" | **Mis-extracts** to `"/CONTRACT/ORDER"` (§6a) |
| `Attachment N — Label` line | Splits into two `requiredForms` entries (§6b) |
| Image-only PDF | Not tested; OCR intentionally out of scope per prior report |

## 9. Cannot Reproduce

I cannot reproduce the literal "extracts and displays only the solicitation summary. Most or all other solicitation sections remain blank" symptom on a representative readable FAR Part 12 commercial-items RFQ. The extractor + renderer path hydrates the Section L/M/C/J panels via the FAR-aware fallback and the alias fields.

Evidence I would need to confirm a "blank panels everywhere" failure in production:

| Evidence | Why it matters | Acquisition path |
| --- | --- | --- |
| Sample of the specific real-world solicitation file(s) that produced blank panels | Confirms whether the extractor's heading map covers the source format | Operator export from the affected pursuit's `userData/solicitations/<oppId>/<batchId>/import-manifest.json` + raw files (sanitized of operator PII) |
| Browser DevTools `state` dump of the affected pursuit | Confirms whether the extractor delivered content the renderer then dropped | DevTools console: `JSON.stringify(state.solicitations[oppId])` |
| Whether the affected file is searchable PDF, scanned PDF, or DOCX | OCR coverage decision | File metadata / opening in Acrobat |
| Whether amendments were involved | Tests for amendment-precedence regression | Pursuit's package contents |
| Tenant + extraction schema version | Tests for legacy-record drift | Persisted record `extractionSchemaVersion` (currently absent — see §10) |

Until at least one such sample is available, I treat the reported symptom as conditional: either (a) a non-readable file format that needs OCR (out of scope of the prior fix), (b) an unusual layout that escapes the Phase 25AQ headings, or (c) a confusion between the symptom and the missing Summarize Solicitation feature.

## 10. Scope Decision (for operator)

The user's prompt requests a comprehensive treatment (status states, full provenance, schema version, migration, Summarize Solicitation, per-section explain, dozens of regression tests). The execution rules say *"Prefer the smallest robust production-ready fix"* and *"Do not introduce a broad rewrite unless evidence proves it is required."* These are in tension.

I propose two tiers for the operator to choose between before any code edit:

### Tier A — Targeted (estimated 1 PR, ~600 lines + tests)

1. Fix §6a `solicitationNumber` mis-extraction.
2. Fix §6b `requiredForms` over-tokenization.
3. Ship **Summarize Solicitation** (structured 17-area breakdown bound to persisted normalized fields; deterministic where possible, AI provider only for narrative augmentation behind credential boundary).
4. Ship per-section **Explain This Section** action button next to each populated panel.
5. Add fixtures + regression tests for §6a/§6b plus the new summarize/explain paths.
6. Surface explicit "Section X — Not present in package" / "Section X — Not applicable" copy where letters are absent.

### Tier B — Comprehensive schema rewrite (multi-PR, multi-day, large scope)

Everything in Tier A, plus:

- Versioned solicitation extraction schema with 7-value status states (`extracted | not_found | not_applicable | conflicting_information | low_confidence | extraction_failed | pending_processing`) on every field.
- Field-level provenance object (`{ sourceFile, page, sectionHeading, charSpan, confidence, method, model, schemaVersion, timestamp }`) on every field.
- Forward migration of saved pursuits.
- Idempotent reprocessing endpoint + queue.
- Comprehensive expansion of the A–L architecture (every field listed in the prompt).
- Full new regression matrix per the prompt.
- Solicitation Center UI overhaul to display status badges + provenance hover cards.

## 11. Tier A Implementation (this round)

After operator selected **Tier A — targeted**, the following landed on
branch `fix/solicitation-center-summarize-and-extraction-bugs`:

### Bug fixes

- **§6a fixed** in `services/govcon/solicitation-package-extract.js` —
  new `extractSolicitationNumber()` runs an ordered list of explicit
  patterns (`Solicitation No/Number/#`, `RFQ/RFP/IFB/RFI/Sources Sought
  No/Number/#`, `Notice ID/Number`, `Solicitation: …`) and validates
  candidates (must contain a digit; cannot start with `/`, `-`, `.`;
  cannot be a UCF header token like `CONTRACT`/`ORDER`/`FORM`). For the
  representative fixture `metadata.solicitationNumber` now extracts
  `"75D301-26-Q-00942"` instead of `"/CONTRACT/ORDER"`.
- **§6b fixed** in the same file — `expandFormCandidates` now accepts
  em-dash / en-dash / hyphen / colon between attachment label and
  description, plus a new `dropSubsumedFormItems` post-pass collapses
  redundant strict-substring entries. `"Attachment 1 — Pricing Sheet"`
  now appears as one canonical row instead of three.

### New capabilities (§6c, §6d)

- **`services/govcon/solicitation-summarize.js`** — deterministic
  `summarizeSolicitation(input)` returns a 17-area structured
  breakdown bound to the persisted extraction record. Each area
  carries `key`, `title`, `content`, `status` (`extracted` /
  `not_found` / `not_applicable`), `note`, `sourceFields`,
  `sourceFiles`. Facts come from the extraction; system-generated
  analysis (Recommended Questions, Bid/No-Bid, Immediate Actions)
  is labelled in the `note` field.
- **`explainSection(input)`** in the same module — produces a
  deterministic plain-English explanation for either a section letter
  (`A`–`M`) or an alias key (`INSTRUCTIONS`, `EVALUATION`, `PWS`,
  `SCOPE`, `FORMS`, `DEADLINES`, `RISKS`, `MATRIX`). Returns
  `not_found` honestly when the section is absent.

### Wiring

- `api/index.js` — adds `appApi.govcon.solicitation.summarize` and
  `.explainSection` routed through `withOpportunity` (tenant isolation),
  persists the breakdown back on the opportunity as
  `solicitationSummary` so the renderer can reload it without
  re-running.
- `app/main/ipc/register-feature-ipc.js` — adds the IPC channels
  `govcon:solicitation-summarize` and
  `govcon:solicitation-explain-section`.
- `preload.js` — exposes `sd.govcon.solicitation.summarize` and
  `sd.govcon.solicitation.explainSection`.
- `sourcedeck.html` — adds the `📋 Summarize Solicitation` action
  button, the `gc-sol-summarize-panel` container, and per-section
  `Explain` buttons on Section L, Section M, and PWS/SOW panel
  headers. The JS handler bodies are extracted into a new renderer
  module per the Phase 3+ strangler architecture.
- `app/renderer/features/solicitation-center/summarize-and-explain.js`
  (new) — browser-safe global-attach module owning
  `window.gcSolSummarizeSolicitation` and `window.gcSolExplainSection`.
  Does not import electron and does not use the renderer IPC API
  directly; everything goes through `window.sd.*`.

### IPC inventory bumped to 98

- `app/main/ipc/register-feature-ipc.js` count goes 78 → 80.
- Total registered channels go 96 → 98.
- `test/architecture-ipc-channel-inventory.test.js` and
  `test/architecture-main-process-composition.test.js` updated to
  match.

### Regression test added

`test/phase-25ar-solicitation-summarize-and-extraction-bugs.test.js`
— 42 checks across 7 sections:

| § | Coverage |
| --- | --- |
| §1 | solnum mis-extraction fix + header-only fixture guard |
| §2 | forms over-tokenization fix (canonical Attachment N — Label preserved, stray fragments rejected) |
| §3 | summarize structured 17-area output: schema version, area sequence, honest status, populated count ≥ 7 on representative fixture, source provenance, facts-vs-analysis labelling |
| §4 | explainSection works for section letters, alias keys, and reports honestly when absent |
| §5 | IPC + preload + app-API wiring (channels registered, preload bridge exposes them, withOpportunity tenant isolation in app-API) |
| §6 | Renderer surface: button + panel in HTML; handlers in extracted renderer module; no electron import; no renderer IPC API at module scope |
| §7 | Tenant isolation: opportunityId echoed, null extraction refused gracefully, missing section key returns no_section reason |

### Phase 25AR was NOT in scope of this round

The Phase 25AR fix intentionally **does not**:

- Add OCR (image-only PDFs remain unsupported — see §9).
- Introduce a versioned extraction schema with the seven status states the
  prompt enumerates on every field (`extracted` / `not_found` /
  `not_applicable` / `conflicting_information` / `low_confidence` /
  `extraction_failed` / `pending_processing`) at the field level. The
  summarize service uses three of those at the **area** level
  (`extracted` / `not_found` / `not_applicable`); the persisted
  extraction record continues to use its existing per-section `found` +
  `confidence` shape.
- Introduce field-level provenance objects (`{sourceFile, page,
  sectionHeading, charSpan, confidence, method, model, schemaVersion,
  timestamp}`) on every field. The summarize service surfaces
  `sourceFields` and `sourceFiles` at the area level; the persisted
  extraction continues to use its existing per-section `sourceFile` +
  `sourceLocation` shape.
- Migrate saved pursuits or introduce an idempotent reprocessing queue.
- Overhaul the Solicitation Center UI with status badges + provenance
  hover cards on every field.

These were Tier B scope and are deferred. The operator chose Tier A
explicitly.

## 11a. Original "No Code Edited This Round" notice

Per execution rule "Do not edit code until the failure has been reproduced and the confirmed root cause has been written into the incident report" — and because the reported symptom doesn't reproduce on the available fixture while several adjacent confirmed defects are documented above — I am pausing implementation pending the operator's scope confirmation (Tier A or Tier B).

## 12. Validation (Tier A implementation)

- `node test/phase-25aq-far-commercial-items-section-extraction.test.js` — PASS
- `node test/phase-25ab-extract-sections-a-to-m.test.js` — PASS
- `node test/solicitation-extraction-end-to-end-mapping.test.js` — PASS
  (matrix row count went 55 → 54; one row was a duplicate that the §6b
  forms dedup correctly removed)
- `node test/phase-25af-real-package-parser-coverage.test.js` — PASS
- `node test/phase-25af-mixed-package-extraction.test.js` — PASS
- `node test/architecture-ipc-channel-inventory.test.js` — PASS (98/98)
- `node test/architecture-main-process-composition.test.js` — PASS (100/100)
- `node test/phase-25ar-solicitation-summarize-and-extraction-bugs.test.js` — PASS (42/42)
- `npm test` — PASS (full suite, exit 0)
- `git diff --check` — clean
- Repro scripts (`repro2.js`, `repro3.js`) — show post-fix
  `solicitationNumber === "75D301-26-Q-00942"` and canonical
  `requiredFormsAttachments` entries

## 13. Recommended Next Action

Operator confirms Tier A or Tier B. If Tier A, I implement the four fixes + tests in a single PR. If Tier B, I propose a phased multi-PR plan starting with the schema-versioned extraction record and migration, then UI overhaul, then queue/idempotency hardening — to avoid one giant unreviewable change.

If neither tier is the right framing, point me at a real sample (sanitized) of the production solicitation that produced the blank panels and I will reproduce the actual failure and propose a fix matched to that evidence.

## References

- Prior incident report: `docs/engineering/INCIDENT_REPORT.phase-25aq.md`
- Reproduction scripts: `/tmp/claude-0/-home-user/ba0f7612-c2a0-57a0-8587-aaa6dd2f5413/scratchpad/repro{2,3}.js`
- Code paths: `services/govcon/solicitation-import.js`, `services/govcon/solicitation-package-extract.js`, `app/main/ipc/register-feature-ipc.js`, `sourcedeck.html` (Solicitation Center workspace + state hydration blocks)

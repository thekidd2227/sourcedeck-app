# SourceDeck Solicitation Center Production Incident Report

**Author:** Manus AI  
**Repository:** `thekidd2227/sourcedeck-app`  
**Incident area:** GovCon Solicitation Center  
**Date:** 2026-06-23  
**Status:** Fixed locally, validation passed, pending commit at time of report creation.

## 1. Incident Summary

The Solicitation Center had two linked production failures. First, saved pursuits did not reliably appear in the **Linked saved pursuit** dropdown inside Solicitation Center, and selecting a saved pursuit did not reliably establish the active solicitation context used by requirement extraction. Second, the **Extract Requirements** workflow could produce empty Solicitation Center sections when the user expected saved pursuit context or uploaded solicitation context to feed the extraction panels.

The incident was treated as a production debugging issue, not a cosmetic UI defect. The investigation traced the actual renderer wiring, saved-pursuit selector hook, upload-result loader, local extraction service, and source-material collector. The confirmed live defect was a broken Solicitation Center selector configuration plus an explicitly disabled linked-source collector. The upload parser and renderer had already gained binary/noise protection in the prior repair, and the current validation confirmed that readable uploaded solicitations populate Solicitation Center panels correctly through the local import path.

| Symptom | Confirmed production impact | Fix status |
|---|---:|---|
| Saved pursuits missing from Solicitation Center dropdown | High | Fixed |
| Dropdown `onchange` called an undefined handler | High | Fixed |
| Saved-pursuit text extraction always returned empty | High | Fixed |
| Uploaded readable files not mapping into sections | Covered by existing import path and validation | Validated |
| Binary PDF garbage entering Required Forms | Previously fixed; revalidated | Validated |

## 2. Reproduction Steps

The saved-pursuit selector defect was reproduced deterministically with the strengthened static regression test:

```bash
cd /home/ubuntu/sourcedeck-app
node test/phase-25v-saved-pursuits-solicitation-linkage.test.js
```

Before the fix, the strengthened test failed because the Solicitation Center hook did not populate `#gc-sol-opp-select`, and the markup referenced `gcSolSelect(this.value)` without a matching `window.gcSolSelect` handler. This directly matched the user-facing report that saved pursuits did not appear or link correctly in Solicitation Center.

The uploaded-extraction behavior was verified through the deterministic local-extraction regression:

```bash
cd /home/ubuntu/sourcedeck-app
node test/phase-25an-browser-handoff-local-extraction.test.js
```

This test exercises the native file-picker path, local file copy/import path, supported file parsers, section mapping, metadata mapping, Required Forms cleanup, matrix rows, and renderer population. After the fix set, the test passed all 47 checks, confirming the uploaded solicitation path still maps readable PDF, DOCX, XLSX, TXT, CSV, and ZIP-derived text into Solicitation Center panels.

## 3. Code-Path Breakdown

The relevant execution path starts in `sourcedeck.html`, because the app uses a large Electron renderer file for Solicitation Center UI orchestration. The saved-pursuit dropdown is rendered as `#gc-sol-opp-select` in the Solicitation Center markup. The tab hook `window.gcV25SolHook(tabId)` is responsible for pulling saved/pursuing opportunities, filling configured selectors, and keeping `activeSolicitation` state synchronized.

| Path | File | Responsibility | Incident finding |
|---|---|---|---|
| Solicitation Center selector | `sourcedeck.html` | Displays linked saved pursuit dropdown | Markup existed but hook config did not populate it. |
| Saved-pursuit tab hook | `sourcedeck.html` | Populates tab-specific selectors from saved opportunities | Solicitation tab used `sel: null`, so the live dropdown stayed empty. |
| Selector handler | `sourcedeck.html` | Handles selection changes | Markup called `gcSolSelect(this.value)`, but no handler existed. |
| Source collector | `sourcedeck.html` | Builds source text from linked saved pursuit/source materials | Function returned immediately with `''`, making saved-pursuit extraction impossible. |
| Upload importer | `services/govcon/solicitation-import.js` | Selects files, normalizes import result | Passed validation for supported file types. |
| Package extractor | `services/govcon/solicitation-package-extract.js` | Parses and classifies solicitation text | Passed validation for section mapping and binary/noise exclusion. |
| Renderer loader | `sourcedeck.html` | Loads normalized extraction result into panels | Passed validation after prior loader hardening. |

## 4. Root-Cause Analysis

The incident had two confirmed root causes.

First, **the Solicitation Center saved-pursuit selector was not wired into the shared saved-pursuit hook**. The live hook configuration for the `solicitation` tab had `sel: null`, even though the page contained `#gc-sol-opp-select`. As a result, saved pursuits loaded for other tabs could be absent from Solicitation Center. The UI element existed, but the data-binding layer did not target it.

Second, **the saved-pursuit selector referenced `gcSolSelect(this.value)`, but the renderer did not define `window.gcSolSelect`**. A user selecting a saved pursuit could therefore fail to update the active solicitation context. This is exactly the kind of defect that looks like “the dropdown/link is not working” because the UI may display but the state transition never runs.

A third contributing issue was confirmed in the linked-source extraction path: **`window.gcW25CollectSourceText` returned `''` at the top of the function** under a “retired” comment. That made `Extract Requirements` unable to use saved-pursuit source materials or saved opportunity metadata. The extraction button therefore had no usable text when the user expected saved pursuit context to feed the Solicitation Center.

## 5. Failure Explanation

The failure occurs because the Solicitation Center had a visible control without a live data path. The saved pursuit dropdown existed in markup, but `gcV25SolHook('solicitation')` did not fill it. When a user did manage to select a value, the `onchange` attribute invoked `gcSolSelect`, which was not defined. Even when active solicitation context existed elsewhere, the linked-source collector had been disabled with an early `return ''`, so `Extract Requirements` could not build a text payload from the linked saved pursuit.

In operational terms, the app had **three disconnected layers**: the visible selector, the active-solicitation state, and the extraction source collector. The fix reconnects those layers without broad rewrites.

## 6. Blast-Radius Assessment

The primary blast radius was limited to Solicitation Center linkage and saved-pursuit-driven extraction. The upload extraction path shares the Solicitation Center renderer but does not rely on `gcW25CollectSourceText` when a structured uploaded extraction state already exists. That path was validated independently.

| Area | Risk before fix | Risk after fix |
|---|---|---|
| Solicitation Center saved pursuit dropdown | Saved pursuits may not appear | Hook fills `#gc-sol-opp-select`. |
| Saved pursuit selection | Active solicitation may not update | `window.gcSolSelect` delegates to existing `gcV25SelectSolicitation`. |
| Extract Requirements from linked pursuit | Collector always returned empty | Collector now gathers sanitized source materials and selected opportunity metadata. |
| Vendors/Pricing/Prime Partners selectors | No direct regression expected | Existing selector handlers preserved. |
| Upload extraction | Previously repaired and separately tested | Validation still passes. |
| Required Forms sanitation | Previously repaired and separately tested | Validation still passes. |

## 7. Edge-Case Analysis

The fix preserves existing guardrails. It does not re-enable unsafe automatic SAM.gov fetching, does not submit anything externally, and does not weaken app-shell/source-material sanitation. The collector still rejects SourceDeck UI/app-shell text via `_w25LooksLikeBadSource`. It also continues to sanitize persisted source materials before use.

| Edge case | Handling |
|---|---|
| No saved pursuits exist | Dropdown remains in `— Not linked —` state. |
| User selects no pursuit | Active solicitation becomes empty; extraction requires upload or source text. |
| Saved pursuit has only metadata but no full solicitation document | Collector can provide limited metadata context, but it will not invent missing Section L/M/PWS language. |
| Uploaded solicitation is scanned/image-only PDF | Existing importer does not OCR; it blocks garbage and requires review/upload of readable material. |
| Persisted sourceMaterials contain app UI text | Existing bad-source guards reject it. |
| Other tab selectors | Existing vendor/pricing/prime partner behavior remains unchanged. |

## 8. Files Changed

| File | Purpose |
|---|---|
| `sourcedeck.html` | Rewired Solicitation Center saved-pursuit dropdown, added `gcSolSelect`, exposed saved-pursuit map to linked extraction, and restored sanitized linked-source collection. |
| `test/phase-25v-saved-pursuits-solicitation-linkage.test.js` | Strengthened regression assertions for the live Solicitation Center selector wiring and onchange handler. |
| `docs/engineering/incident-root-cause-notes.md` | Investigation notes recorded before code editing. |
| `docs/engineering/INCIDENT_REPORT.md` | Final production incident report. |

## 9. Production-Ready Fix

The production fix is intentionally small. The Solicitation Center tab hook now targets `#gc-sol-opp-select` for the `solicitation` and `solicitation-attachments` tabs. The renderer now defines `window.gcSolSelect` and delegates to the existing `gcV25SelectSolicitation(id)` state transition, preserving the existing saved-pursuit persistence flow.

The saved-pursuit hook also exposes the current saved-pursuit list/map to `window.gcW25Saved` and `window.gcW25SavedMap`, allowing the linked-source collector to access the selected pursuit without duplicating opportunity-loading logic. Finally, the early `return ''` in `gcW25CollectSourceText` was removed, restoring the sanitized source-material collection path and adding selected opportunity metadata as a limited fallback.

## 10. Regression Tests Added or Updated

The saved-pursuit linkage test was strengthened to fail on the exact production wiring defect:

```bash
node test/phase-25v-saved-pursuits-solicitation-linkage.test.js
```

The test now asserts that `gcV25SolHook` populates `#gc-sol-opp-select`, that `window.gcSolSelect` exists, and that the selector markup calls the defined handler. Existing upload extraction regressions already cover section panel population for readable uploaded files and were rerun as part of validation.

## 11. Validation Results

The following validation suite passed after the fix:

```bash
node --check services/govcon/solicitation-package-extract.js
node --check services/govcon/solicitation-import.js
node test/phase-25v-saved-pursuits-solicitation-linkage.test.js
node test/phase-25an-browser-handoff-local-extraction.test.js
node test/phase-25w-solicitation-workspace-source-intake.test.js
node test/phase-25ae-required-forms-sanitized.test.js
node test/renderer-boot.test.js
node test/solicitation-extraction-end-to-end-mapping.test.js
```

The focused results confirmed 5/5 saved-pursuit linkage checks, 47/47 browser handoff/local extraction checks, 5/5 Solicitation Center source-intake checks, renderer boot safety, Required Forms sanitation, and end-to-end solicitation extraction mapping.

## 12. Remaining Risks

The remaining risk is not a wiring defect; it is input quality. If a saved pursuit contains only high-level opportunity metadata and no actual solicitation text, SourceDeck can only extract limited context. It should not invent Section L, Section M, PWS/SOW, deadlines, or required forms that are not present in the source material. Likewise, scanned/image-only PDFs still require OCR support or user-provided readable files. The current fix correctly blocks garbage and preserves honest empty states.

A second residual risk is the large monolithic renderer file. The incident was caused by a visible control being disconnected from its tab hook and handler. This pattern can recur while large sections of state, UI, and business logic remain in one HTML file. Future hardening should extract Solicitation Center state and saved-pursuit linkage into testable modules.

## 13. Rollback Instructions

If this fix needs to be rolled back, revert the commit that contains this report and the `sourcedeck.html` selector/source-collector changes:

```bash
cd ~/sourcedeck-app
git pull origin main
git log --oneline -5
git revert <commit_sha>
npm run refresh:buyer-trial
```

Rollback restores the previous behavior, including the known broken Solicitation Center saved-pursuit dropdown and disabled linked-source collector. Rollback should therefore only be used if a more severe regression is discovered.

## 14. Operator Rebuild Command

After the fix is committed and pushed, rebuild the buyer trial package on the Mac with:

```bash
cd ~/sourcedeck-app && git pull origin main && npm run refresh:buyer-trial
```

If launch verification is slow on first run, use:

```bash
cd ~/sourcedeck-app && git pull origin main && POLL_SECONDS=45 npm run refresh:buyer-trial
```

## References

No external references were used. Evidence came from repository source inspection, deterministic local tests, and local validation output.

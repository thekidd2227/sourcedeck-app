# Production Incident Report — Solicitation Center FAR Section Extraction

**Author:** Manus AI

**Repository:** `thekidd2227/sourcedeck-app`

**Incident area:** GovCon Solicitation Center solicitation extraction and display

**Date:** 2026-06-24

**Status:** Fixed locally, regression-protected, and validation passed.

## 1. Incident Summary

The Solicitation Center was showing the uploaded pursuit metadata and **Solicitation Summary**, but FAR-relevant downstream sections such as **Section L — Instructions to Offerors**, **Section M — Evaluation Criteria**, **PWS / SOW Requirements**, **Required Forms / Attachments**, **Deadlines**, **Risks / Deal Killers**, and **Compliance Matrix** could remain blank for a real-world commercial-items solicitation. The user-facing effect was that SourceDeck appeared to extract only the summary while leaving the sections that drive proposal execution empty.

The issue was handled as a critical production incident. The investigation traced the actual upload, import, extraction, classification, renderer loading, and Solicitation Center panel-render paths. The confirmed defect was not in the visible panel renderer. The renderer displayed the extraction object honestly. The failure originated in the extractor’s section-classification strategy: it recognized formal Uniform Contract Format headers like `SECTION L` and `SECTION M`, but it did not promote common FAR commercial-items headings such as `ADDENDUM TO FAR 52.212-1`, `ADDENDUM TO FAR 52.212-2`, `PERFORMANCE REQUIREMENTS SUMMARY`, or `FAR 52.212-3` into the corresponding Solicitation Center sections.

| Symptom | Confirmed production impact | Fix status |
|---|---:|---|
| Summary metadata populated while FAR panels remained blank | High | Fixed |
| Commercial-items solicitations without formal `SECTION L/M/C` headings under-hydrated panels | High | Fixed |
| FAR 52.212-1 instructions not displayed as Section L | High | Fixed |
| FAR 52.212-2 evaluation text not displayed as Section M | High | Fixed |
| Performance Requirements Summary not reliably displayed as scope/PWS | High | Fixed |
| FAR 52.212-3 reps/certs and attachments not promoted to forms/K context | Medium | Fixed |
| Formal UCF section extraction | Regression risk | Protected and validated |

## 2. Reproduction Steps

The production defect was reproduced with a deterministic local fixture that models a realistic FAR Part 12 / commercial-items solicitation. The fixture intentionally avoids formal UCF headings such as `SECTION L`, `SECTION M`, and `SECTION C`, because many SAM.gov packages use FAR provision headings and addenda instead.

```bash
cd /home/ubuntu/sourcedeck-app
node tmp_repro_far_summary_only.js
```

Before the fix, the reproduction showed that metadata and partial high-value fallback data could be detected, but section hydration was incomplete. The specific failure class was that FAR provision/addendum blocks were not treated as section-equivalent source blocks. As a result, the Solicitation Center could truthfully render blank placeholders for sections that were present in the solicitation package but not in formal UCF header format.

The regression protection added for this incident is now the durable reproduction command:

```bash
cd /home/ubuntu/sourcedeck-app
node test/phase-25aq-far-commercial-items-section-extraction.test.js
```

This test imports a commercial-items solicitation fixture containing `ADDENDUM TO FAR 52.212-1`, `ADDENDUM TO FAR 52.212-2`, `PERFORMANCE REQUIREMENTS SUMMARY`, `FAR 52.212-3`, and attachment lines. It asserts that SourceDeck hydrates Section L, Section M, scope/PWS, reps/certs, required forms, deadlines, and compliance matrix rows.

## 3. Code-Path Breakdown

The affected execution path starts when the user uploads or imports solicitation files into the Electron app. The upload/import path copies the selected local files into the app-controlled import area, extracts readable text, normalizes metadata, classifies solicitation sections, creates aliases for panels such as required forms and deadlines, then stores the normalized object for the renderer to display.

| Path | File | Responsibility | Incident finding |
|---|---|---|---|
| Upload/import orchestration | `services/govcon/solicitation-import.js` | Copies local solicitation files, calls extractor, persists normalized import result | No root cause found; handoff shape was correct. |
| Package text extraction | `services/govcon/solicitation-package-extract.js` | Extracts readable text from TXT/PDF/DOCX/XLSX/CSV/ZIP and rejects app-shell/noise text | Text extraction path worked for readable files. |
| Section classification | `services/govcon/solicitation-package-extract.js` | Maps extracted text into Sections A–M and alias buckets | Confirmed root cause: FAR addendum headings were not promoted to section-equivalent blocks. |
| Panel aliases | `services/govcon/solicitation-package-extract.js` | Builds instructions, evaluation, scope, forms, deadlines, risks, and compliance rows | Partial fallback existed, but it was line-based and did not preserve full FAR blocks as section content. |
| Solicitation Center loader | `sourcedeck.html` | Loads structured extraction object into active Solicitation Center state | No root cause found; it displays the object it receives. |
| Solicitation Center panel render | `sourcedeck.html` | Renders summary, sections, forms, deadlines, risks, and matrix | No root cause found; blank placeholders were expected when extractor did not hydrate sections. |

## 4. Root-Cause Analysis

The confirmed root cause was **a classifier coverage gap in `services/govcon/solicitation-package-extract.js`**. The extractor’s first pass relied on formal UCF section markers through `sectionRegex(letter)`, which detects patterns such as `SECTION L`, `L.`, and `PART ... SECTION L`. Its fallback pass recognized useful requirement lines for buckets such as instructions, evaluation, scope, forms, deadlines, and risks, but it did not preserve common FAR commercial-items blocks as canonical Section L, Section M, Section C, Section J, or Section K equivalents.

The practical result was that a solicitation could contain the necessary proposal instructions and evaluation criteria while still producing empty Solicitation Center section panels. For example, `ADDENDUM TO FAR 52.212-1` is the commercial-items instruction provision that should feed **Section L / Instructions to Offerors** behavior. `ADDENDUM TO FAR 52.212-2` should feed **Section M / Evaluation Criteria** behavior. `PERFORMANCE REQUIREMENTS SUMMARY`, `PERFORMANCE WORK STATEMENT`, `STATEMENT OF WORK`, and similar headings should feed the scope/PWS panel. The previous classifier did not consistently hydrate those panels from these headings when formal section letters were absent.

Several incorrect hypotheses were eliminated with code-path evidence. The renderer was not dropping populated sections; it rendered placeholders because the extractor returned missing section objects. The import service was not losing the payload; it passed the normalized extractor result into persistence and renderer state. The issue was also not caused by SAM.gov metadata, because the deterministic local fixture reproduced the failure without network access or portal state.

## 5. Failure Explanation

The failure occurs because FAR commercial-items packages do not always use formal UCF section labels. SourceDeck expected section labels for complete Section A–M hydration, while real solicitations often express the same procurement meaning through FAR provisions and addenda. The previous fallback was useful for aliases and compliance rows, but it was **too line-oriented** to capture a complete FAR block and too narrow to populate section-equivalent panel content.

In operational terms, the system had the source text, but the classification layer did not translate the procurement structure into the UI’s section model. The Solicitation Center was therefore not lying or crashing; it was showing an honest but incomplete extraction object. The production defect was that the extractor’s mental model of solicitation structure was narrower than the FAR commercial-items format used by the uploaded solicitation.

## 6. Blast-Radius Assessment

The blast radius was centered on solicitation packages that are readable but do not use formal UCF Section L/M/C/J/K headers. This includes many RFQs and simplified acquisitions using FAR Part 12 commercial-items provisions. Formal UCF packages were less affected because the first-pass section regex already recognized their headers.

| Area | Risk before fix | Risk after fix |
|---|---|---|
| Commercial-items RFQs using FAR 52.212-1 | Instructions could remain blank or incomplete | FAR addendum block hydrates Section L. |
| Commercial-items RFQs using FAR 52.212-2 | Evaluation criteria could remain blank or incomplete | FAR addendum block hydrates Section M. |
| Packages using Performance Requirements Summary/PWS/SOW headings | Scope panel could be blank or metadata-thin | Scope block hydrates Section C/PWS behavior. |
| Packages using FAR 52.212-3 reps/certs | Reps/certs might only appear as a loose forms alias | FAR block hydrates Section K when no formal K exists. |
| Required forms and attachments | Attachment lines could be detected but not section-promoted | Attachment headings and lines feed forms/J aliases. |
| Formal UCF Section A–M packages | Regression risk from broader fallback | Protected by existing `phase-25ab` test and validated. |
| Renderer/security boundaries | Potential risk if fix touched renderer/import IPC | Not touched; fix stayed in extractor classification. |

## 7. Edge-Case Analysis

The fix intentionally avoids inventing missing requirements. It only promotes text that appears under recognizable FAR/addendum/procurement headings or under existing high-value fallback buckets. It does not call external services, does not submit anything to SAM.gov, does not weaken app-shell filtering, and does not change authentication, authorization, credentials, preload, IPC, upload, parsing, or persistence boundaries.

| Edge case | Handling |
|---|---|
| Formal Section L/M/C headings exist | Formal extracted package text still wins before fallback. |
| FAR addendum headings exist without formal section letters | FAR-aware block scanner captures the heading and nearby body text. |
| Scanned/image-only PDF has no readable text | Existing readable-text limitation remains; OCR is not introduced by this fix. |
| Generic requirement lines appear in a formal UCF fixture | Generic fallback remains limited to C/L/M to prevent false-positive Section I/H/J/K hydration. |
| Contract clauses appear under explicit clauses heading | Precise FAR-aware block mapping can hydrate Section I. |
| Attachments appear as standalone lines | They continue to feed Required Forms/Attachments aliases and compliance rows. |
| App-shell or raw markup text appears in source | Existing `looksLikeRawMarkup` and body-classification guards are preserved. |

## 8. Files Changed

| File | Purpose |
|---|---|
| `services/govcon/solicitation-package-extract.js` | Added FAR-aware block scanning for commercial-items headings and section-equivalent hydration while preserving existing formal-section priority. |
| `test/phase-25aq-far-commercial-items-section-extraction.test.js` | Added deterministic regression test for FAR commercial-items solicitation packages without formal UCF section headings. |
| `package.json` | Added the new regression test to the standard `npm test` sequence. |
| `docs/engineering/INCIDENT_REPORT.md` | Final incident report and production handoff. |

## 9. Production-Ready Fix

The production fix is deliberately small and placed at the extractor layer where the defect originates. The patch adds a FAR-aware block scanner that recognizes procurement headings commonly used in commercial-items solicitations. It captures the heading and following body lines until the next known solicitation heading, preserving enough context for the Solicitation Center to display meaningful section content.

The scanner promotes the following block families when formal UCF sections are absent:

| Source heading pattern | Hydrated Solicitation Center section |
|---|---|
| `ADDENDUM TO FAR 52.212-1`, `FAR 52.212-1`, `FAR 52.215-1`, `Instructions to Offerors/Quoters` | Section L — Instructions to Offerors |
| `ADDENDUM TO FAR 52.212-2`, `Evaluation Factors`, `Basis for Award` | Section M — Evaluation Criteria |
| `Performance Requirements Summary`, `Performance Work Statement`, `Statement of Work`, `Scope of Work` | Section C / PWS-SOW Requirements |
| `List of Attachments`, `Required Forms`, `Pricing Sheet`, `Wage Determination` | Section J / Required Forms and Attachments aliases |
| `FAR 52.212-3`, `Representations and Certifications` | Section K — Reps and Certs |
| `Special Contract Requirements`, `Security Requirements`, `Limitations on Subcontracting` | Section H — Special Contract Requirements |
| `Contract Clauses`, `FAR/DFARS Clauses`, explicit FAR/DFARS clause headings | Section I — Contract Clauses |

The implementation preserves existing behavior by keeping formal extracted package text as the highest-confidence source. The precise FAR-aware block match runs before generic line fallback. Generic fallback remains limited to the previously intended high-value C/L/M panels so it does not create false-positive Sections H/I/J/K from unrelated requirement lines.

## 10. Regression Tests Added

A new regression test was added:

```bash
node test/phase-25aq-far-commercial-items-section-extraction.test.js
```

The test imports a deterministic FAR commercial-items solicitation fixture through `services/govcon/solicitation-import.js`, not a mocked renderer-only path. It verifies that the normalized extraction object contains the expected section hydration and alias outputs:

| Assertion area | Protected behavior |
|---|---|
| Section L | FAR 52.212-1 addendum body appears in Instructions panel. |
| Section M | FAR 52.212-2 addendum body appears in Evaluation Criteria panel. |
| Section C/PWS | Performance Requirements Summary appears as actual work scope. |
| Section K | FAR 52.212-3 reps/certs text hydrates the reps/certs section. |
| Required Forms | Attachment 1 Price Schedule and Attachment 2 Wage Determination are extracted. |
| Deadlines | Quote due line remains available as a deadline alias. |
| Compliance Matrix | Submission and scope requirements become compliance rows. |

The existing `phase-25ab-extract-sections-a-to-m.test.js` also protected against an over-broad intermediate fallback. During validation, it caught that generic risk-population could falsely hydrate Section I. The fix was narrowed so formal-section compatibility remains intact.

## 11. Validation Results

The following validations passed after the final fix:

```bash
cd /home/ubuntu/sourcedeck-app
node -c services/govcon/solicitation-package-extract.js
node test/phase-25ab-extract-sections-a-to-m.test.js
node test/phase-25aq-far-commercial-items-section-extraction.test.js
node test/phase-25af-fallback-requirements-classifier.test.js
node test/solicitation-extraction-end-to-end-mapping.test.js
npm test
npm run pack:mac
npm run release:check
```

| Validation | Result |
|---|---:|
| Extractor syntax check | PASS |
| Existing formal A–M section regression | PASS |
| New FAR commercial-items regression | PASS |
| Existing fallback classifier regression | PASS |
| Solicitation extraction end-to-end mapping | PASS |
| Full standard `npm test` suite | PASS, exit status `0` |
| Unsigned macOS package build via `npm run pack:mac` | PASS |
| Release check / packaged asar inspection | PASS with expected local macOS signing warnings |

`npm run release:check` reported that macOS signing and notarization environment variables are missing and that `codesign` is unavailable in this Linux sandbox. Those are expected local development warnings. The release check found the packaged `app.asar` and confirmed required shipped files were present.

## 12. Remaining Risks

Readable-text quality remains the main residual risk. If the uploaded package is scanned/image-only or otherwise lacks extractable text, SourceDeck still cannot extract sections without OCR support or user-provided readable files. This fix does not add OCR, and that is intentional because the incident root cause was classifier coverage, not image parsing.

Another residual risk is solicitation variability. FAR commercial-items headings are now covered for the most important operational sections, but agencies can still use unusual local templates, attachments-only packages, or table-heavy PDFs that require additional fixture-driven hardening. Future improvements should expand the fixture library with real sanitized examples across RFQ, RFP, IFB, combined synopsis/solicitation, amendments, and attachments.

A third risk is that the UI still contains a planned “summary/explain” behavior that should be productized as a user-selectable breakdown action for every populated section. The extractor now supplies better section material, but a full interactive per-section summary button across every possible FAR/UCF section is a separate UI/workflow enhancement unless already covered by existing `plainEnglishSummary` and explanation actions.

## 13. Rollback Instructions

If this fix needs to be rolled back, revert the commit containing the extractor change, the new regression test, the package script update, and this report:

```bash
cd ~/sourcedeck-app
git pull origin main
git log --oneline -5
git revert <commit_sha>
npm test
npm run pack:mac
npm run release:check
```

Rollback will restore the previous classifier behavior. That means formal UCF section extraction will continue to work, but FAR commercial-items solicitations without formal section headers may again populate summary metadata while leaving key Solicitation Center panels blank.

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

No external references were required. Evidence came from repository source inspection, deterministic local reproduction, extractor/renderer code-path tracing, test failure analysis, and local validation output.

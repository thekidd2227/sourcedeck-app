# Phase 25L.2 — Solicitation Key Details Extraction Contract

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L.2 (Proposal Workspace · Solicitation Intake + Extraction)
**Companion:**
- `docs/product/phase-25l-buyer-workflow-cleanup-contract.md`
- `docs/product/phase-25l-calendar-email-settings-boundary.md`

---

## 1. Mission

Give the Proposal Workspace a first-class intake surface for solicitations / RFQs / RFPs. Once a solicitation is loaded (uploaded file or pasted text), the extractor runs **locally in the renderer** and produces a structured **5-category FAR-aligned breakdown**. Each category becomes a clickable section workspace where the user can author that proposal section from the extracted context.

## 2. Intake surface

Anchor: `#pw-solicitation-intake` inside the `tab-execution` pane, immediately under the "Internal review only" disclaimer.

Controls:

| Button                              | Handler                       | Behavior                                                                                   |
|-------------------------------------|-------------------------------|--------------------------------------------------------------------------------------------|
| 📎 Upload Solicitation / RFQ / RFP   | `pwSolOpenFilePicker()`        | Opens a native file picker accepting `.pdf .docx .txt .md`.                                |
| 📋 Paste Solicitation Text          | `pwSolTogglePasteArea()`       | Toggles the paste textarea (`#pw-sol-paste-text`).                                         |
| 🔎 Extract Key Details              | `pwSolExtractKeyDetails()`     | Runs the heuristic extractor over the loaded text and renders the 5 category cards.        |
| ⊘ Clear Uploaded Solicitation       | `pwSolClearUploaded()`         | Confirms with the user, then resets the intake + extraction state (non-finalized only).    |

Linked pursuit / GovCon record id input: `#pw-sol-link-pursuit` (optional; persisted with the extraction state).

### 2.1 File handling

- `.txt` and `.md` — read directly via `FileReader.readAsText`.
- `.pdf` and `.docx` — accepted by the file picker but **not parsed in this build**. The intake panel surfaces a toast and steers the user to the Paste Solicitation Text fallback. The Phase 25L.2 boundary is explicit: SourceDeck does not pretend an extraction succeeded for a file format it cannot parse.

### 2.2 No automatic external action

- The intake surface never sends, submits, or uploads. The file is read in-renderer; no network call is made.
- The CUI / PHI / source-selection material warning is displayed verbatim: *"Do not upload classified, CUI, PHI, or sensitive source-selection material unless you are authorized and your configured AI provider is approved."*

## 3. Extraction contract — 5 FAR-aligned categories

| # | Category id                    | Title                                       | FAR reference (advisory)          |
|---|--------------------------------|---------------------------------------------|-----------------------------------|
| 1 | `metadata-summary`             | Solicitation Metadata & Summary             | FAR Part 15 / FAR Part 12         |
| 2 | `place-of-performance`         | Place of Performance                        | FAR 52.215-6                      |
| 3 | `subcontractor-id-prep`        | Subcontractor ID & Proposal Prep            | FAR Subpart 19.7                  |
| 4 | `compliance-submission`        | Compliance & Submission Requirements        | FAR 15.204 · FAR 52.212-1         |
| 5 | `site-visit-logistics`         | Site Visit Details & Logistics              | FAR 52.237-1                      |

FAR references are **guidance only**. SourceDeck does not provide legal advice and does not claim compliance certification.

### 3.1 Extracted fields per category

**`metadata-summary`** — `title`, `agency`, `solicitationNumber`, `summary`, `mainTasks[]`, `objectives[]`, `deliverables[]`, `assumptions[]`, `technicalRequirements[]`, `performanceStandards[]`, `complianceCriteria[]`, `locations[]`, `timelines[]`, `deadlines[]`, `ambiguities[]`.

**`place-of-performance`** — `primaryAddress`, `alternateLocations[]`, `geographicRestrictions[]`, `workMode` (`On-site` / `Off-site / remote` / `Hybrid`), `clauseReferences[]`, `facilityNames[]`, `ambiguityFlags[]`.

**`subcontractor-id-prep`** — `qualifications[]`, `technicalSpecs[]`, `materialsEquipment[]`, `complianceRequirements[]`, `evaluationCriteria[]`, `subcontractingOpportunities[]`, `smallBusinessParticipation[]`, `subcontractorSections[]`, `draftingSteps[]`.

**`compliance-submission`** — `submissionDeadlines[]`, `formattingRequirements[]`, `mandatoryAttachments[]`, `pointsOfContact[]`, `complianceChecklist[]`, `penalties[]`, `milestoneDependencies[]`, `dateInconsistencies[]`.

**`site-visit-logistics`** — `siteVisitDates[]`, `rsvpDeadlines[]`, `duration`, `siteVisitPoc[]`, `siteAddresses[]`, `frequencyVolume`, `securitySafety[]`, `attendanceRequirements[]`, `specialClauses[]`.

### 3.2 Ambiguity flags

A top-level `ambiguities[]` array carries human-readable warnings when an expected field cannot be confidently identified. Typical entries:
- *"Title could not be identified — confirm manually."*
- *"Issuing agency could not be identified — confirm manually."*
- *"Solicitation number not detected — confirm manually."*
- *"No explicit deadlines detected — verify all dates."*
- *"Place of Performance address not detected — confirm manually."*
- *"No site visit detected — confirm whether one is required."*

The intake panel renders these in an amber warning block (`#pw-extraction-ambiguity`) above the section editor.

### 3.3 Heuristic, not AI

Phase 25L.2 ships a **regex / keyword heuristic** extractor. The extractor:
- Looks for explicit headings (`TITLE:`, `AGENCY:`, `Solicitation Number:`, `Place of Performance:`, `Submission Deadlines:`, etc.).
- Falls back to keyword-anchored patterns (`Department of …`, `RFQ #`, `Section L`, etc.).
- Captures the first paragraph as the purpose summary when no explicit `Summary:` heading is present.
- Conservative-by-default: when uncertain, emits an ambiguity flag instead of guessing.

An AI-backed extraction path is **out of scope for Phase 25L.2**. The hook exists (`pwSolDraftCategory()` / `pwSolRetryWithNotes()`) and the boundary is fixed: AI integration must respect the **single-section rule** (never generates a full proposal), the **user-approval gate** (every status change requires an explicit click), and the **no-send / no-submit / no-upload** posture.

## 4. Section workspace (per category)

When the user clicks a category card, the section workspace renders below the card grid (`#pw-extraction-editor`). It contains:

- The extracted fields for that category, rendered as labeled rows / bulleted lists.
- A notes textarea (`#pw-sol-notes`) for section-specific guidance.
- A draft textarea (`#pw-sol-draft`) for the user-authored or AI-assisted section text.
- A status pill displaying one of: **Not Started · Drafted · Approved · Needs Revision · Finalized**.

Action buttons (each carries a `data-pw-sol-action` attribute for downstream test coverage):

| Button                | `data-pw-sol-action`     | Effect                                                                                                |
|-----------------------|--------------------------|-------------------------------------------------------------------------------------------------------|
| 🪄 Draft this section  | `draft-this-section`     | Routes to `pwSolDraftCategory()`. Disabled unless an AI provider key is configured.                   |
| Mark as Drafted       | `mark-drafted`           | Sets status to `drafted`.                                                                             |
| ✓ Approve             | `approve`                | Sets status to `approved`.                                                                            |
| ↻ Needs revision      | `needs-revision`         | Sets status to `needs-revision`.                                                                      |
| ↻ Retry with notes    | `retry-with-notes`       | Re-runs `pwSolDraftCategory()` using the current notes as additional context.                         |
| 🔒 User Finalize      | `finalize`               | Locks the section. Notes + draft become read-only until reset.                                        |
| ⊘ Reset section       | `reset-section`          | Returns the section to `not-started`.                                                                 |

Autosave: notes + draft inputs debounce (400ms) into the state store. Typing in either field promotes a `not-started` section to `drafted` automatically.

## 5. Persistence

- electron-store key: `proposalWorkspace.solExtraction` (via `window.sd.storeGet / storeSet`).
- localStorage fallback key: `sd.proposalWorkspace.solExtraction.v1`.
- State shape:
  ```
  {
    rawText, fileName, fileMime, linkedPursuitId, extractedAt,
    extracted: { [categoryId]: { ...fields } },
    ambiguities: [],
    activeCategory: null | string,
    categories: { [categoryId]: { status, notes, draft, updatedAt } }
  }
  ```
- `Clear Uploaded Solicitation` confirms before reset and never deletes finalized sections without explicit user consent (finalized status is preserved through extraction resets).

## 6. Safety invariants preserved

- No portal upload (SAM.gov, PIEE, eBuy, GSA, acquisition.gov, agency portals)
- No email send / no email transmission
- No vendor / agency auto-contact
- No bid / quote / proposal submission
- No legal advice / no compliance certification claim
- No one-click full-proposal generation
- No `Send Email` / `Submit Bid` / `Submit Quote` / `Submit Proposal` control
- Phase 25A no-send/no-submit/no-upload posture preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved (pre-25L commercial nav buttons remain in DOM)

## 7. Tests

`test/phase-25l-proposal-solicitation-upload-extraction.test.js` (18 checks):

- Solicitation Intake panel + every input + every button + every action attribute is present.
- Accepted file types include `.pdf .docx .txt .md`.
- CUI / PHI / source-selection material warning is present.
- 5 FAR-aligned categories are registered in the renderer's `CATEGORIES` table with the exact titles and ids.
- FAR references are advisory only; the no-legal-advice / no-compliance-certification disclaimer is present.
- Section workspace exposes Draft / Mark Drafted / Approve / Needs Revision / Retry with Notes / Finalize / Reset.
- Public `window.pwSol*` handlers are defined.
- `extractKeyDetails()` runs in a vm sandbox over a realistic sample solicitation and successfully extracts title, agency, solicitation number, summary, main tasks, objectives, deliverables, place-of-performance address, subcontracting opportunities, submission deadlines, points of contact, and site visit dates.
- Phase 25L.2 surfaces contain no affirmative submission / legal-advice / certified-compliance claims (negations are explicitly allowed).

## 8. Out of scope for Phase 25L.2

- Subcontractor research workflow (Place-of-Performance linkage, 50-mile radius, Hunter.io enrichment trigger) → **Phase 25L.3**.
- Incumbents & Awards research workflow (FSD link, AI research prompt) → **Phase 25L.3**.
- Live AI integration of `pwSolDraftCategory()` / `pwSolRetryWithNotes()` → follow-up phase. The boundary is fixed; the integration must respect the single-section rule.
- PDF / DOCX parsing in the renderer — deferred. Paste-text fallback is the current intake path for non-text formats.

---

## Signature

Phase 25L.2 turns the Proposal Workspace into a true solicitation-driven authoring surface. The user loads the RFQ / RFP, runs Extract Key Details, then drafts each FAR-aligned section from the extracted context — one section at a time, with the user-approval gate intact and SourceDeck never submitting, sending, or uploading on their behalf.

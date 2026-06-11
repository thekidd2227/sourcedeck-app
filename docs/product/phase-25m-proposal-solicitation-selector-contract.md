# Phase 25M — Proposal Workspace Solicitation Selector Contract

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Give Proposal Workspace a single intake surface that handles all three solicitation origins:

1. **SAM.gov imported** — opportunities saved via the GovCon Pipeline (Phase 25M, see `phase-25m-sam-pipeline-contract.md`).
2. **Manually uploaded** — `.pdf` / `.docx` / `.txt` / `.md`.
3. **Pasted text** — raw RFQ / RFP body pasted directly.

Once a solicitation is selected, Extract Key Details runs locally and renders **6 FAR-aligned sections** with per-section Notes · Draft · Approve · Needs revision · Retry with notes controls.

## 2. Intake surface

Anchor: `#pw-solicitation-intake` inside `#tab-execution` (above the Phase 25E.2 13-section nav rail).

Controls:

| Button                         | `data-pw-sol-action` | Handler                          |
|--------------------------------|----------------------|----------------------------------|
| 📎 Upload Solicitation / RFQ / RFP | `upload`             | `pwSolOpenFilePicker()`           |
| 📋 Paste Solicitation Text     | `paste`              | `pwSolTogglePasteArea()`          |
| 🔎 Extract Key Details         | `extract`            | `pwSolExtractKeyDetails()`        |
| ⊘ Clear selected solicitation  | `clear`              | `pwSolClearSelected()`            |

Selector `<select id="pw-sol-selector">` lists:
- `optgroup label="SAM.gov imported"` (populated from `sd.govcon.opportunities.list()`, filtered by `source === 'SAM.gov'`).
- `optgroup label="Uploaded / pasted"` (populated from `_state.records[]`).

Per-record metadata surface:
- `#pw-sol-current-source` shows `SAM.gov` / `Upload` / `Paste`.
- `#pw-sol-current-status` shows `not started` / `imported` / `extracted` / `drafting` / `reviewed`.

Empty state:

> *No solicitation selected. Search SAM.gov, upload a solicitation, or paste solicitation text to begin.*

## 3. File handling

- `.txt` / `.md` are read directly via `FileReader.readAsText()`.
- `.pdf` / `.docx` are accepted by the file picker as a **file attachment** but the user is steered to the paste-text fallback for structured extraction. Toast: *"File attached locally. Paste solicitation text to extract details in this build."*

## 4. Extraction — 6 FAR-aligned sections

| # | Category id                 | Title                                       | FAR reference (advisory)   |
|---|-----------------------------|---------------------------------------------|----------------------------|
| 1 | `metadata-summary`          | Solicitation Metadata & Summary             | FAR Part 15 / Part 12      |
| 2 | `scope-of-work`             | Scope of Work                               | FAR Part 15                |
| 3 | `place-of-performance`      | Place of Performance                        | FAR 52.215-6               |
| 4 | `subcontractor-prep`        | Subcontractor ID & Proposal Prep            | FAR Subpart 19.7           |
| 5 | `compliance-submission`     | Compliance & Submission Requirements        | FAR 15.204 · FAR 52.212-1  |
| 6 | `site-visit-logistics`      | Site Visit Details & Logistics              | FAR 52.237-1               |

FAR references are **advisory only**. SourceDeck does not provide legal advice and does not claim compliance certification.

Each section card renders:
- Extracted bullet fields.
- `<details>` collapsible Notes + Draft + actions.
- Status pill (`Not Started` / `Drafted` / `Approved` / `Needs Revision` / `Finalized`).

### 4.1 Per-section actions

| Button                | `data-pw-sol-section-action` |
|-----------------------|-------------------------------|
| 🪄 Draft this section | `draft`                       |
| ✓ Approve             | `approve`                     |
| ↻ Needs revision      | `needs-revision`              |
| ↻ Retry with notes    | `retry-with-notes`            |

All four route through `window.pwSolSectionAction(sectionId, action)`. Notes + Draft fields autosave (input → debounced state write).

## 5. Persistence

- electron-store key: `proposalWorkspace.solicitationIntake`
- localStorage fallback: `sd.proposalWorkspace.solicitationIntake.v1`
- State shape: `{ records: [{ id, source, fileName, title, rawText, status, extracted, sections, ... }], activeId }`

SAM.gov-imported records are owned by `sd.govcon.opportunities` — the selector treats them as read-through entries (id prefixed `sam:`) and does not duplicate them into local storage.

## 6. Dashboard intake card

A new **"Start a pursuit"** card lands at the head of the Dashboard launchpad grid. Three buttons:

| Button                          | `data-dash-start-action` | Destination                                      |
|---------------------------------|--------------------------|--------------------------------------------------|
| 🔎 Search SAM.gov               | `search-sam`             | GovCon Pipeline                                  |
| 📎 Upload Solicitation / RFQ / RFP | `upload-solicitation`    | Proposal Workspace → opens file picker            |
| 📋 Paste Solicitation Text      | `paste-solicitation`     | Proposal Workspace → opens paste textarea         |

## 7. Boundaries preserved

- Local-only extraction.
- No portal upload, no email send, no bid submission.
- No one-click full proposal generation.
- FAR references advisory only.

## 8. Tests

- `test/phase-25m-proposal-solicitation-selector.test.js`

`npm test` → 64 PASS suites, 0 FAIL.

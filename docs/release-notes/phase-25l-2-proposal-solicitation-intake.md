# Phase 25L.2 — Proposal Workspace Solicitation Intake · Release Note

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L.2 (Proposal Workspace · Solicitation Intake + Extraction)
**Stacked on:** Phase 25L.1 (`fix/phase-25l-1-buyer-workflow-cleanup`)

---

## What ships

1. **Solicitation Intake panel** at the top of the Proposal Workspace pane:
   - 📎 Upload Solicitation / RFQ / RFP (`.pdf .docx .txt .md`)
   - 📋 Paste Solicitation Text
   - 🔎 Extract Key Details
   - ⊘ Clear Uploaded Solicitation
   - Linked pursuit / GovCon record id input
2. **Local heuristic extractor** that runs in the renderer and produces a **5-category FAR-aligned breakdown**:
   - Solicitation Metadata & Summary (FAR Part 15 / FAR Part 12)
   - Place of Performance (FAR 52.215-6)
   - Subcontractor ID & Proposal Prep (FAR Subpart 19.7)
   - Compliance & Submission Requirements (FAR 15.204 · FAR 52.212-1)
   - Site Visit Details & Logistics (FAR 52.237-1)
3. **Per-category section workspace** with notes, draft, status pill, and the full state machine: **Not Started · Drafted · Approved · Needs Revision · Finalized**. Action buttons:
   - 🪄 Draft this section (requires AI provider key)
   - Mark as Drafted
   - ✓ Approve
   - ↻ Needs revision
   - ↻ Retry with notes (re-runs draft with updated notes)
   - 🔒 User Finalize
   - ⊘ Reset section
4. **Ambiguity / high-risk flag block** that surfaces conservative "could not be identified — confirm manually" warnings instead of guessing.
5. **Persistence** via `proposalWorkspace.solExtraction` (electron-store) with a localStorage fallback (`sd.proposalWorkspace.solExtraction.v1`). Autosave on notes + draft input (400ms debounce).

## What does NOT ship in 25L.2

- **Subcontractor research workflow** (Place-of-Performance linkage, 50-mile radius, Hunter.io enrichment trigger, vendor output table) → **Phase 25L.3**.
- **Incumbents & Awards research workflow** (FSD link, AI research prompt, confidence/verification) → **Phase 25L.3**.
- **Live AI integration** of `pwSolDraftCategory()` / `pwSolRetryWithNotes()` — the UI surface, boundary, and credential check are in place; the live AI provider call is deferred to a follow-up phase to keep the boundary clean.
- **PDF / DOCX in-renderer parsing** — accepted by the file picker but the user is steered to the paste-text fallback. SourceDeck does not pretend an extraction succeeded for a file format it cannot parse.

## Safety

- No `.env` touched
- No secrets printed
- No new paid dependencies
- No deploy / public release / public download
- No live SAM run
- No email sending
- No vendor / agency auto-contact
- No bid / quote / proposal submission
- No portal upload (SAM.gov, PIEE, eBuy, GSA, acquisition.gov, agency portals)
- No calendar provider upload / sync
- No Google / Microsoft / iCloud password or OAuth request
- No pricing source change
- No checkout / payment change
- No legal advice or certified-compliance claim — FAR references are advisory only
- No one-click full-proposal generation
- Phase 25A no-send / no-submit / no-upload boundary preserved
- Phase 25C master delivery method preserved
- Phase 23C reachability invariant preserved

## Tests

- `test/phase-25l-proposal-solicitation-upload-extraction.test.js` — 18 checks. Panel + every input + every action surface; 5-category registration; FAR advisory copy; per-category workspace controls; public window.* handlers; vm-sandboxed end-to-end extractor test over a realistic sample solicitation (asserts title, agency, sol#, summary, main tasks, objectives, deliverables, Place of Performance, subcontracting opportunities, submission deadlines, points of contact, site visit dates); no affirmative submission / legal-advice / certified-compliance claims.
- Wired into `npm test`.
- Full suite: 59 PASS, 0 FAIL on the working tree.

## Operator next step

Merge Phase 25L.2 after Phase 25L.1, then proceed to Phase 25L.3 (Subcontractor + Incumbents/Awards workflows). Day 0 trial-package regeneration should wait until all three sub-PRs and the Phase 25I-recovery PR land on `main`.

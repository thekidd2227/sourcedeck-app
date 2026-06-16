# Phase 25V — Capability Statement Studio Contract

## Placement
Capability Statement Studio moved out of GovCon → Past Performance into the
**Proposal Workspace** pane (`#tab-execution`) as a focused card
(`#pw-capability-studio`). It is no longer buried in the congested Past
Performance section.

## Purpose
Help the user build a capability statement for a selected agency / opportunity.
The fields are statement-building inputs:

- Target agency (`gc-cs-f-agency`)
- Target opportunity / solicitation number (`gc-cs-f-sol`)
- Target NAICS (`gc-cs-f-naics`)
- Certifications / set-asides (`gc-cs-f-certs`)
- Company / contact summary (`gc-cs-f-company`)
- Core competencies / capabilities (`gc-cs-f-core`)
- Differentiators (`gc-cs-f-diff`)
- Past performance highlights (`gc-cs-f-pp-select`, from the library)
- Optional pasted capability text (local, offline parse — no upload)

## Output: Capability Statement Preview
The old "Tailored Capability Statement Outline (draft)" is renamed to
**Capability Statement Preview** and the build button to **Build Capability
Statement**. Clicking it (`gcCsBuildOutline`) renders a real preview into
`#gc-cs-outline` containing:

- Target agency / opportunity / NAICS
- Certifications / set-asides
- Company / contact summary
- Core competencies (bulleted)
- Differentiators (bulleted)
- Relevant past performance (from selected library records)
- **Closing / fit statement** synthesized from the operator-supplied fields
- Internal-review disclaimer

### Export
**Export Capability Statement (draft, local)** (`gcCsExportPreview`) downloads
the built preview as a local `.txt` draft. Download only — no send, no upload,
no submission.

## Blank by default
Fields are blank for a fresh user (placeholders only). SAMPLE values
(`Sample Agency`, `SAMPLE-SOL-DEMO-0001`, `sample core capability`,
`sample differentiator`) exist only inside the explicit demo loader, never as
default field values.

## Boundaries
Internal review draft only. SourceDeck does not send, submit, upload, or
certify capability statement content.

# Release Notes — Phase 25AE: Extraction Display Runtime Repair

Phase 25AE cleans up the solicitation extraction runtime without redesigning SourceDeck or changing SAM.gov search behavior.

## Fixed

- Removed the duplicate visible SAM.gov key-missing warning. The clear Setup / Settings -> API Keys instruction card remains.
- Converted DOCX Word XML into readable text before display.
- Prevented raw XML/code from appearing in Required Forms / Attachments.
- Improved Required Forms / Attachments to show real attachment names, forms, exhibits, wage determinations, QASP, pricing sheets, SF forms, amendments, or a clean missing-state message.
- Improved Compliance Matrix rows so they require real extracted requirement text and useful source/evidence/risk fields.
- Improved Section L, Section M, PWS/SOW, Section J, and solicitation summary display when readable text exists.
- Added missing-section placeholders instead of demo/sample or raw text dumps.
- Added action-level loading states for search, package download, refresh, send-to-center, extraction, explanation, preview, and save-copy actions.

## Safety

- No `.env` changes.
- No secrets printed.
- No raw SAM.gov key display.
- No `api_key` URL exposure in renderer-visible output.
- No SAM.gov key storage change.
- No SAM.gov search/filter behavior change beyond duplicate warning cleanup.
- No auto mass download or download on app launch.
- No email sending, auto-contact, bid/quote/proposal submission, or portal upload.
- No pricing source or checkout/payment changes.

## Verification

Added and wired:

- `phase-25ae-single-sam-key-warning`
- `phase-25ae-docx-readable-extraction`
- `phase-25ae-required-forms-sanitized`
- `phase-25ae-compliance-matrix-quality`
- `phase-25ae-section-display-extraction`
- `phase-25ae-action-loading-indicators`

Regression gates, `npm test`, GovCon smoke, troubleshooting scan, and release check were run. The release check retained the existing local unsigned-artifact warning only.

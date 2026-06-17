# Phase 25AB — Solicitation Package Download

## Summary

- Downloads every SAM.gov `resourceLinks` attachment for a selected/saved opportunity.
- Creates a local SourceDeck solicitation package and ZIP under app userData.
- Extracts ZIP resources locally when possible.
- Adds package actions to Find Opportunities and Saved Pursuits.
- Adds Attachments panel actions in Solicitation Center.
- Routes real downloaded packages into Extract Requirements.
- Adds Uniform Contract Format Sections A-M extraction and plain-English explanation.
- Removes the visible Paste Solicitation Text primary flow and Source Materials label.

## Safety

- No `.env` changes.
- No raw SAM.gov key in renderer-visible URLs, manifests, logs, docs, or exports.
- No auto package downloads on app launch.
- No mass downloads across all opportunities.
- No portal upload, email send, auto-contact, bid submission, quote submission, proposal submission, or pricing source change.

## Verification

New tests:

- `test/phase-25ab-sam-package-download-all.test.js`
- `test/phase-25ab-sam-package-manifest.test.js`
- `test/phase-25ab-attachments-panel.test.js`
- `test/phase-25ab-solicitation-center-package-intake.test.js`
- `test/phase-25ab-extract-sections-a-to-m.test.js`
- `test/phase-25ab-plain-english-explanation.test.js`
- `test/phase-25ab-remove-paste-and-source-materials.test.js`
- `test/phase-25ab-no-sample-output-for-real-package.test.js`
- `test/phase-25ab-uploaded-rfp-rfq-support.test.js`

# Phase 25AB — Solicitation Package Download Contract

## SAM.gov Attachment Behavior

SAM.gov opportunities may expose a description link, a `resourceLinks` array, a public `uiLink`, and API `links.self`. SourceDeck does not assume SAM.gov provides one ZIP. For a selected or saved opportunity, SourceDeck attempts every safe URL in `resourceLinks` and optionally fetches the description through the credential boundary.

## User Action Boundary

Downloads happen only when the user clicks **Download Solicitation Package** or **Refresh Package** for a selected/saved opportunity. SourceDeck does not download attachments on app launch and does not mass-download attachments across search results.

## Local Storage

Packages are stored under Electron user data:

`app.getPath('userData')/govcon/solicitations/{noticeId}/`

Each package folder contains:

- `package.json`
- `attachments/`
- `extracted/`
- `source/`
- `sourcedeck-package.zip`

The manifest stores downloaded/failed counts, file metadata, safe URLs, local paths, and errors with secrets redacted. It never stores a raw SAM.gov API key or key-bearing URL.

## Download Policy

- Zero resource links: show “No attachments listed by SAM.gov for this notice.”
- One ZIP: download ZIP, extract supported entries locally, and keep both original and extracted files.
- Multiple files: attempt every listed link sequentially, deduplicate names, and build a local SourceDeck ZIP.
- Partial failure: continue remaining downloads and show failed file names plus safe error reasons.

## Storage Estimate

Metadata and manifest files are small, usually under 100 KB. Attachments drive storage usage. A typical solicitation package may range from 1 MB to 100 MB depending on PDFs, spreadsheets, and exhibits. SourceDeck does not download all attachments by default across opportunities.

## Safety

No portal upload, no email send, no bid/quote/proposal submission, no agency/vendor auto-contact, and no API key exposure in DOM, logs, docs, exports, or visible URLs.

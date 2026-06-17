# Phase 25AB — Package Download + Extraction Architecture Audit

## Architecture Result

Phase 25AB adds two local services:

- `services/govcon/sam-package-download.js`
- `services/govcon/solicitation-package-extract.js`

The downloader lives behind the main-process credential boundary and stores packages under Electron `userData`. The renderer receives only safe package summaries. The extractor reads local manifests/files and produces deterministic A-M sections, metadata, warnings, and compliance-matrix starter rows.

## IPC Boundary

Added IPC/preload methods:

- `govcon:download-solicitation-package`
- `govcon:extract-solicitation-package`
- `govcon:explain-solicitation-package`
- `govcon:open-solicitation-package-folder`

The local folder opener validates that paths are inside `userData/govcon/solicitations`.

## Secrets Boundary

The SAM.gov key is appended only inside service code for `api.sam.gov` requests. Manifest `safeUrl` and `originalUrl` are key-stripped. Errors are redacted. Renderer code does not build keyed URLs.

## Source Material Boundary

The old user-facing **Source Materials** language is replaced by **Attachments** and **Solicitation Package**. Backend source fetch helpers remain only as compatibility/fallback paths.

## Parser Boundary

No fragile native dependency was added. Text/CSV/HTML/JSON/XML/RTF are parsed directly. ZIP is handled locally with a small Node ZIP reader/writer. PDF/DOC/DOCX/XLS/XLSX are stored with an honest limitation until a safe parser is introduced.

## Tests

Phase 25AB adds tests for all-resourceLinks download, manifest safety, attachments panel, package intake, A-M extraction, plain-English explanation, removed paste/source labels, no sample output for real packages, and upload type support.

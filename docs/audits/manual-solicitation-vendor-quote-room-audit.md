# Manual Solicitation Intake and Vendor Quote Room Audit

## Executive conclusion

Proposal Workspace had two upload architectures. Its old renderer-only path accepted a PDF extension, created a local record, assigned `rawText = ''`, and later passed that empty value to `pwSolExtractKeyDetails()`. The canonical Electron path already routed selected local files through `govcon:select-and-extract-solicitation`, `solicitation-import.js`, and `solicitation-package-extract.js`. All Upload Solicitation controls now use that canonical main-process intake.

Automatic SAM.gov solicitation-file downloading remains removed. SourceDeck may fetch notice metadata and open a sanitized `sam.gov` URL, but it does not fetch attachment bytes, monitor Downloads, or retrieve agency-portal files.

## Exact failed code path

1. `#pw-sol-file` accepted `.pdf` in the renderer.
2. `pwSolOnFileChosen()` only used `FileReader.readAsText()` for TXT/MD/CSV.
3. A PDF entered the binary branch, which stored a Proposal Workspace record with `rawText = ''` and `stored-text-extraction-unavailable`.
4. `pwSolExtractKeyDetails()` called the renderer heuristic `extract(rec.rawText)`.
5. `rawText.trim().length` was zero, no fields populated, and the record failed with the generic stored/no-text message.

The PDF was therefore stored but never passed to the main-process PDF parser. Changing the error copy would not have repaired extraction.

## Canonical replacement

`pwSolOpenFilePicker()` now invokes `window.sd.govcon.selectAndExtractSolicitation()`. The narrow preload bridge reaches the IPC handler, native multi-select picker, transactional preflight, controlled userData copy, and local extraction service. The renderer receives only normalized extraction output and internal source identifiers.

One shared service constant defines `MAX_SOLICITATION_DOCUMENTS = 5`. The user-facing contract and preload expose the same limit. The main handler rejects more than five direct selections; import preflight counts supported logical documents inside ZIPs before creating directories, copying, extracting, or persisting. Unsupported/executable archive entries are reported and are not silently counted as supported documents.

Supported initial formats are PDF, DOCX, XLSX, CSV, TXT, XML, and ZIP containing those document formats. DOC and XLS are not advertised because the prior printable-string fallback is not sufficiently safe or faithful to claim format support.

## Extraction and data integrity

Each logical document returns an inventory record containing source ID, safe filename, type, hash where available, page/sheet counts, status, extracted character count, parser, OCR status, warnings, internal storage ID, classification, and amendment number. Native-text PDFs are parsed locally; an unreadable image-only PDF reports: `This PDF appears to be scanned and requires OCR.` XML DTD/entity declarations are rejected to prevent XXE. ZIP paths, nesting, compression methods, file count, and expansion size are bounded.

Successful documents survive a partial batch failure. The batch response says `Extraction processed — review required.` Source blocks and compliance rows retain filename/location, exact excerpt, extraction method, confidence, and review status. Original requirements are not silently overwritten.

## Security boundaries

- Imported bytes stay below `app.getPath('userData')/govcon/imported-solicitations/...`.
- No external input path or credential is returned to renderer state.
- Renderer code cannot read arbitrary files or receive credentials.
- HTML/app-shell content, unsafe XML, traversal, nested archives, and unsupported entries are rejected.
- Search/ranking accepts provider-supplied, source-backed facts only; candidates without identity, website, and source URLs are discarded.
- Email generation is draft-first. Search and draft actions cannot send.
- Sending requires approved status, one recipient per message, an exact final count confirmation, a configured main-process provider, duplicate-send protection, and failure cutoff.

## Vendor Quote Room integration

The workspace now contains Scope Coverage, Vendor Candidates, Outreach Queue, Quote Tracker, and Vendor Comparison surfaces plus the requested operational actions. The service layer:

- maps every source-backed compliance row to capability, location, credential, evidence, allocation, risk, and coverage status;
- leaves unresolved scope visible;
- generates a tailored vetting checklist;
- generates ten place- and capability-specific searches with a 50-mile radius;
- merges duplicate provider results, preserves source URLs and verification state, and explains every scoring category;
- drafts one individualized message per vendor with sender identity, three risk-driven questions, qualification requests, and a quote deadline before the proposal deadline;
- blocks sending when sender identity, approval, exact confirmation, or a secure provider is missing.

## Known limitation

This repository has no production Gmail, Outlook, SMTP, or transactional vendor-email transport abstraction. The workflow service supports an injected provider and is covered with a mock provider, but the installed UI intentionally blocks Send Approved Outreach until a secure main-process provider and designated test account are configured. No live vendor email is sent during validation.

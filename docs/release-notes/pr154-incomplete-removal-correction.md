# Release notes — Eradicate remaining SAM solicitation download paths

**Branch:** `fix/pr154-eradicate-sam-download-remnants`

## What changed

PR #154 was supposed to remove SourceDeck's automatic SAM.gov solicitation
download / attachment-link-retrieval feature, but its merge left the feature in
place on `main` (only the underlying service file was deleted, which also left
the API failing to load). This change completes the removal correctly:

- The automatic notice/package/attachment retrieval is gone from every layer —
  IPC, preload bridge, API wiring, the deleted service, and the renderer.
- Every retrieval/download control is removed: Download SAM.gov Package, Download
  Solicitation Package, Fetch SAM.gov Notice, Extract Downloaded Solicitation,
  View Attachments, Refresh Source Details, Send Package to Solicitation Center,
  and the attachment/resource-link list.
- The retired functions behind them are **deleted entirely** — no inert aliases
  or no-op stubs remain.
- Attachment/resource links are no longer normalized, returned, stored, or
  rendered anywhere.

## The workflow now

1. **Search SAM.gov** and save pursuits.
2. **Open Official SAM.gov Listing** opens the official opportunity page in your
   browser (canonical page only — never pulls attachment links).
3. Download any files you need in your own browser, then **Upload Solicitation
   Files** to import up to five local documents; SourceDeck extracts them
   locally into the Solicitation Center.

## Preserved

SAM search; saved pursuits (View Details / Mark Pursue / Unpursue / Archive /
Delete); Open Official SAM.gov Listing; the safe external opener; manual upload
of up to five documents (PDF/DOCX/XLSX/CSV/TXT/XML/ZIP) with local extraction;
Solicitation Center (Section L/M, PWS/SOW, forms, deadlines, risks); Compliance
Matrix; Proposal Workspace; Vendor Quote Room; vendor capability mapping; vendor
search strategy; draft outreach; approval/send safeguards; pricing, vendors,
past performance, prime partners, leads, calendar, content.

## Verification

A new source-scanning regression test fails if any forbidden retrieval/download
identifier, label, data-action, or `resourceLinks` reference survives in shipped
source. The fresh app.asar contains zero forbidden tokens, and the packaged
build (launched from `dist`) confirms at runtime: the retrieval bridge is absent,
no download buttons exist, Open Official SAM.gov Listing and Upload Solicitation
Files are present, and injecting app-shell text renders no dump. `npm test`
(175/176; the one failure is a pre-existing font/CSS check), `govcon:smoke`,
`troubleshooting:scan`, and `release-check` all pass.

# Release notes — Remove automatic SAM.gov solicitation download

**Branch:** `remove/sam-solicitation-download-retrieval-only`

## What changed

SourceDeck no longer downloads SAM.gov solicitation packages or retrieves
attachment/resource links automatically. That entire feature — Download SAM.gov
Package, Download Solicitation Package, Fetch SAM.gov Notice, Extract Downloaded
Solicitation, Send Package to Solicitation Center, the attachment/resource-link
list, package preview/viewer, and every IPC/preload/service path behind them —
is permanently removed.

The workflow is now explicit and local:

1. **Search SAM.gov** and save pursuits (unchanged).
2. **Open Official SAM.gov Listing** opens the official opportunity page in your
   browser (canonical page only — it never pulls attachment links).
3. Download any files you need in your own browser, then click **Upload
   Solicitation Files** to import up to five local documents. SourceDeck extracts
   them locally and maps them into the Solicitation Center.

## What is preserved

SAM.gov search; saved pursuits (Mark Pursue / Unpursue / Archive / View Details /
Delete); Open Official SAM.gov Listing; the safe external-browser opener; manual
upload of up to five solicitation documents (PDF, DOCX, XLSX, CSV, TXT, XML, ZIP)
with local extraction; Solicitation Center (Section L/M, PWS/SOW, forms,
deadlines, risks); Compliance Matrix; Proposal Workspace; Vendor Quote Room;
vendor capability mapping; vendor search strategy; draft outreach; approval/send
safeguards; pricing, vendors, past performance, prime partners, leads, calendar,
and content.

## Why

Removing the automatic retrieval eliminates the remote-content path that fed the
recurring app-shell/UI text dump. Combined with the render-time guard already in
place, the dump no longer appears: SourceDeck ingests solicitation content only
from files you explicitly upload.

## Verification

Reproduced in the installed Buyer Trial app via CDP: the retrieval bridge is
absent at runtime, no download/fetch buttons exist, "Open Official SAM.gov
Listing" and "Upload Solicitation Files" are present, search/upload remain wired,
and injecting app-shell text into Vendor Quote Room state still renders no dump.
New regression test `test/remove-sam-solicitation-download-retrieval.test.js`
(23 checks) plus the updated suite, `govcon:smoke`, `troubleshooting:scan`, and
`release-check` all pass (the only failing suite test,
`phase-24d-buyer-surface-tightening`, is a pre-existing font/CSS check unrelated
to this change).

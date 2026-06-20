# Remove SAM.gov solicitation-package download feature

The SAM.gov solicitation-package **download / in-app extraction** capability has
been removed entirely. SourceDeck no longer downloads, imports, parses, previews,
or renders solicitation packages, and there is no "Solicitation Center" surface.

## Supported workflow

> SourceDeck helps users identify and organize SAM.gov opportunities and opens the
> official SAM.gov listing. Solicitation files are obtained directly from SAM.gov
> by the user.

1. Search SAM.gov.
2. Review opportunity metadata.
3. Save or pursue the opportunity.
4. Open the official SAM.gov source page (**Open on SAM.gov**).
5. The user obtains documents directly from SAM.gov, outside SourceDeck.

## What was removed
- Buttons/menus: Download SAM.gov Package, Send Package to Solicitation Center,
  Extract Requirements, View / Extract Downloaded Solicitation, package preview,
  the right-side file viewer, the "Clear contaminated source cache" control, and
  the Solicitation Center tab/section.
- Services: `solicitation-package-extract.js`, `solicitation-file-utils.js`,
  `solicitation-import.js`, `sam-body-classifier.js`, `package-file-validator.js`,
  `sam-notice-fetch.js` (plus the previously-retired remote downloader/fetcher).
- IPC channels: `govcon:select-and-extract-solicitation`, `govcon:sam-fetch-notice`,
  `govcon:open-external-safe` (and the older package download/extract/preview/
  validate channels). Preload bridges `selectAndExtractSolicitation`,
  `samFetchNotice`, `openExternalSafe`.
- Persisted state: `sd.govcon.solWorkspace.v1`, `sd.govcon.sourceMaterials.v1`,
  `sd.govcon.sourceMaterialQuarantine.v1` (removed by a one-time idempotent
  migration that does not touch credentials, saved pursuits, profile, vendors,
  pricing, past performance, or settings).

## What remains
SAM.gov opportunity search, opportunity metadata, save/pursue/unpursue/delete,
Open on SAM.gov, the Proposal Workspace, Vendors, Pricing, Past Performance,
Prime Partners, Submission Readiness, and FAR Reference.

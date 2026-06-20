# Audit — PR #154 incomplete-removal correction

**Branch:** `fix/pr154-eradicate-sam-download-remnants`
**Starting main SHA:** `b0932d3562b7f755fe3c253f1f5ad404577f3200` (the PR #154 squash merge)
**Date:** 2026-06-20

## Why PR #154 was incomplete

PR #154 claimed to remove the automatic SAM.gov solicitation download /
attachment-link-retrieval feature, but its squash merge (`b0932d3`) landed an
**inconsistent tree**: it committed the *service deletion*
(`services/govcon/sam-notice-fetch.js`) and the *new test file*, but **none of
the renderer / preload / main / api edits were applied**. A clean
`git reset --hard origin/main` at `b0932d3` therefore still contained the entire
feature — and a **dangling `require('../services/govcon/sam-notice-fetch')`** in
`api/index.js` that made the API module fail to load (`node -e "require('./api/index.js')"`
threw `Cannot find module`). The PR also left every retired function as an inert
alias / no-op rather than deleting it.

### Exact remnants found on clean origin/main (`b0932d3`)

- `main.js`: `ipcMain.handle('govcon:sam-fetch-notice', …)` present.
- `preload.js`: `samFetchNotice` bridge present.
- `api/index.js`: `require('../services/govcon/sam-notice-fetch')` + `samNoticeFetch` instantiation + `sam.fetchNotice` wiring present, but the required file was deleted → module load crash.
- `sourcedeck.html`: dashboard + Find-tab **Download SAM.gov Package**; saved-pursuit **Fetch SAM.gov Notice**, **Extract Downloaded Solicitation**, **View Attachments**, **Refresh Source Details**, **Send Package to Solicitation Center**; SAM-result **Download Solicitation Package**; functions `gcABDownloadPackage`, `gcTabSamDownloadPackage`, `gcW25ViewAttachments`, `gcW25RefreshSource`, `gcW25SendToWorkspace`, `gcW25FetchDescription`, `gcW25OpenResource`, `gcW25ImportResource`, `gcW25OpenNotice`, `gcABViewAttachment`, `gcABOpenLocalPackageFolder`, `gcACSaveLocalCopy`, `gcABExtractAttachment`; `samFetchNotice` calls; resource-link retrieval/rendering; and obsolete "downloaded package" copy.
- `services/govcon/sam-search.js` + `govcon-index-db.js`: normalized/stored `resourceLinks`.

## What this correction does

**Backend** — deleted `govcon:sam-fetch-notice` (main.js), `samFetchNotice`
(preload.js), the `sam-notice-fetch` require/instantiation and `sam.fetchNotice`
wiring (api/index.js). `api/index.js` now loads cleanly.

**Renderer** — *deleted entirely* (not aliased / not no-op'd): `gcABDownloadPackage`,
`gcTabSamDownloadPackage`, `gcW25ViewAttachments`, `gcW25RefreshSource`,
`gcW25SendToWorkspace`, `gcW25UseInWorkspace`, `gcW25OpenNotice`,
`gcW25FetchDescription`, `gcW25OpenResource`, `gcW25ImportResource`,
`gcABViewAttachment`, `gcABOpenLocalPackageFolder`, `gcACSaveLocalCopy`,
`gcABExtractAttachment`. Removed all their buttons, data-actions, toasts, the
resource-link list, and the retired file-viewer "Open folder" call. Added one
canonical `gcOpenOfficialSamListing(id)` (opens `sam.gov/opp/<noticeId>/view`
only — no fetch, no resource links) and renamed the manual importer to
`gcUploadSolicitationFiles`. Scrubbed every download/fetch/"downloaded package"
copy string.

**State** — removed `resourceLinks` normalization/return from `sam-search.js` and
the `resourceLinksJson` write in `govcon-index-db.js`. (`resourceLinks` was never
read back, so no migration of existing rows is required; the field simply stops
being written.)

## Preserved manual-upload architecture

`Search SAM.gov` → save pursuit → **Open Official SAM.gov Listing** (canonical
page only) → user downloads in their own browser → **Upload Solicitation Files**
(native multi-file picker, ≤5 docs, copied into userData, extracted locally) →
Solicitation Center panels → Vendor Quote Room inputs. Preserved: SAM search,
saved pursuits (View Details / Mark Pursue / Unpursue / Archive / Delete), the
safe external opener, `selectAndExtractSolicitation`, the five-document limit,
PDF/DOCX/XLSX/CSV/TXT/XML/ZIP parsing, Section L/M, PWS/SOW, forms, deadlines,
risks, Compliance Matrix, Proposal Workspace, Vendor Quote Room, vendor
mapping/search/outreach/approval-send, pricing, past performance, prime partners.

## Source scan

Zero forbidden retrieval/download identifiers, labels, data-actions, or
`resourceLinks` remain in production source (`sourcedeck.html`, `main.js`,
`preload.js`, `api/**`, `services/**`) — enforced by
`test/remove-sam-solicitation-download-retrieval.test.js` (30 checks), which
scans the actual source text (catching comments, aliases, and no-op stubs).

## ASAR scan (fresh unsigned x64 dir build)

All forbidden identifiers/labels = **0** in `app.asar`; `Open Official SAM.gov
Listing` and `Upload Solicitation Files` present. ASAR sha256
`06e998abe6dd136bc6c1435ed36e451154be7c026a253a4d7801ad8d83044c07`.

## Packaged runtime result (launched from `dist`, not the Buyer Trial app)

CDP on the running branch build:
`samFetchNotice` → `undefined`; `samSearch` / `openExternalSafe` /
`selectAndExtractSolicitation` → `function`; `gcOpenOfficialSamListing` /
`gcUploadSolicitationFiles` → `function`; download/fetch buttons in DOM →
`false`; `Upload Solicitation Files` + `Open Official SAM.gov Listing` labels
present; inject app-shell into Vendor Quote Room state → render → markers →
`false` (no dump). Only console message is the benign `app-update.yml` ENOENT
(electron-updater on an unsigned dir build). Screenshot:
`assets/pr154-correction/pr154-correction-branch.png`.

## Tests

- `remove-sam-solicitation-download-retrieval.test.js` — rewritten to scan real
  source (30 checks).
- Updated to the new behavior: `phase-25y-sam-source-open`,
  `phase-25an-browser-handoff-local-extraction`, `phase-25m-dashboard-govcon-ux-cleanup`,
  `phase-25m-proposal-solicitation-selector`, `phase-25n-govcon-tab-pages`,
  `phase-25n-govcon-copy-cleanup`, `phase-25s-sam-open-source`,
  `phase-25v-saved-pursuits-solicitation-linkage`,
  `phase-25w-solicitation-workspace-source-intake`,
  `phase-25x-first-impression-workflow`,
  `phase-25y-solicitation-extract-real-source`,
  `phase-25al-render-sink-and-clean-display-scope`, `govcon-solicitation-workspace`.
- Branch sweep: **175 pass / 1 fail**. The single failure
  (`phase-24d-buyer-surface-tightening` — Inter Tight font/CSS) reproduces
  identically (8/13) on untouched origin/main `b0932d3`; unrelated to this change.
- `govcon:smoke` 0 failures; `troubleshooting:scan` clean; `release-check` pass.

## Remaining caveats

- Build is unsigned (no Developer ID); release-check emits local-dev warnings
  only. Public release requires `npm run release:mac-signing-readiness:strict`.
- `phase-24d-buyer-surface-tightening` remains pre-existing-failing (font/CSS).
- A few historical code comments in preserved services still mention the old
  "sam-package-download.js" by name (documentation only — no live code).
- The Buyer Trial application was **not** replaced (per instructions); only the
  `dist` build was launched for verification.

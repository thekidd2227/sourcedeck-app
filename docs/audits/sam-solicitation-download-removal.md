# Audit — Remove automatic SAM.gov solicitation download / attachment-link retrieval

**Branch:** `remove/sam-solicitation-download-retrieval-only`
**Starting main SHA:** `6c4dc5e0e6db4d38015dcaacae61da9dccb2a677`
**Date:** 2026-06-20

## Objective

Permanently remove **only** the automatic SAM.gov solicitation download /
attachment-link-retrieval feature, preserving SAM.gov search, saved pursuits,
Open Official SAM.gov Listing (canonical page only), and manual local file
upload + extraction. Then prove whether the removal stops the app-shell dump.

## What was removed

**Backend (retrieval source):**
- `main.js` — IPC handler `govcon:sam-fetch-notice` (the notice/attachment-link fetch).
- `preload.js` — `samFetchNotice` bridge.
- `api/index.js` — `appApi.govcon.sam.fetchNotice` wiring + the `sam-notice-fetch` require/instantiation.
- `services/govcon/sam-notice-fetch.js` — **deleted** (retrieval-only service).

**Renderer (`sourcedeck.html`):**
- Buttons removed: Download SAM.gov Package (dashboard + Find tab), Download
  Solicitation Package (fresh search rows), Fetch SAM.gov Notice (saved pursuit +
  source panel), Extract Downloaded Solicitation, Send Package to Solicitation
  Center, View Attachments, Refresh Source Details, and the resource-link
  ("Open" attachment) list.
- `gcABDownloadPackage` rewritten to a thin alias of the new canonical-listing
  opener; the description/resource fetch + import stubs (`gcW25FetchDescription`,
  `gcW25OpenResource`, `gcW25ImportResource`), the local-package viewers
  (`gcABViewAttachment`, `gcABOpenLocalPackageFolder`, `gcACSaveLocalCopy`,
  `gcABExtractAttachment`), `gcW25ViewAttachments`, `gcW25RefreshSource`, and
  `gcTabSamDownloadPackage` are neutralized to inert no-ops (open the canonical
  listing or guide to upload; no retrieval, no `samFetchNotice`, no
  `resourceLinks`).
- All user-facing copy/toasts scrubbed of Download/Fetch/Downloaded/"package
  download" wording and redirected to "Upload Solicitation Files".

## What was preserved

SAM.gov opportunity search; saved pursuits (Mark Pursue / Unpursue / Archive /
View Details / Delete); **Open Official SAM.gov Listing** (canonical
`sam.gov/opp/<noticeId>/view` only, via the key-stripping `open-external-safe`
opener); the generic safe external-browser opener; **manual upload of up to five
local solicitation documents** via the native picker
(`select-and-extract-solicitation` → `importAndExtract`); local extraction;
Solicitation Center (Section L/M, PWS/SOW, forms, deadlines, risks), Compliance
Matrix, Proposal Workspace, Vendor Quote Room, vendor capability mapping, vendor
search strategy, draft outreach, approval/send safeguards; pricing, vendors,
past performance, prime partners, leads, calendar, content.

## Labels

- Manual upload label is exactly **"Upload Solicitation Files"** (dashboard, Find
  tab, Proposal Workspace, saved-pursuit row, source panel). No
  Download/Fetch/Downloaded/Package wording in any manual-upload control.
- Official browser action labeled **"Open Official SAM.gov Listing"**; opens only
  the canonical opportunity page (never retrieves attachment/resource links).

## Did removal stop the app-shell dump?

**The retrieval-borne contamination source is eliminated, and the dump does not
appear at runtime.** Two complementary layers now hold:

1. **Source removed (this change).** The app-shell dump originated from remote
   text/HTML that the fetch path ingested into solicitation/vendor state
   (`samFetchNotice` metadata + `resourceLinks`, and the retired
   description/resource imports). With every automatic retrieval path removed,
   SourceDeck no longer ingests any remote bytes/links into renderable state — so
   the retrieval-borne vector is closed at the source.
2. **Sink guarded (PR #153, already on main and included here).** The Vendor
   Quote Room render boundary (`sdRenderShield` / `rowBad` / per-cell `cell()`)
   plus load-time `gcVqrQuarantineState()` block any residual app-shell text from
   rendering.

### Runtime proof (CDP, exact installed Buyer Trial bundle)

```
samFetchNotice bridge:        undefined   (retrieval removed)
samSearch / openExternalSafe / selectAndExtractSolicitation: function (preserved)
gcOpenOfficialSamListing / gcUploadSolicitationFiles:        function (new actions)
download/fetch buttons in DOM: false
"Upload Solicitation Files" label: present
"Open Official SAM.gov Listing" label: present
inject app-shell into vendorQuoteWorkflow.v1 → render → markers in coverage: false (no dump)
```

Installed ASAR (hash-verified equal to the fresh build):
`76c08377382f5f95e66786d48b3740b3e54194922c0495283946c0193e46abe1`.
Screenshot: `assets/sam-download-removal/removal-installed.png`.

## Tests

- New `test/remove-sam-solicitation-download-retrieval.test.js` (23 checks):
  asserts the backend retrieval is gone, no download/fetch buttons or forbidden
  labels remain, Open Official SAM.gov Listing is canonical-only, the manual
  upload label is exactly "Upload Solicitation Files", and the preserved surfaces
  (search, open-external-safe, select-and-extract, importAndExtract) remain.
- Deleted `test/phase-25am-fetch-only-notice.test.js` (tested the removed
  service/feature).
- Updated `phase-25an`, `phase-25m-dashboard`, `phase-25m-proposal-selector`,
  `phase-25n`, `phase-25w`, `phase-25y-sam-source-open`,
  `phase-25y-solicitation-extract-real-source`, and `govcon-solicitation-workspace`
  to the new behavior.
- Branch sweep: **175 pass / 1 fail**; the single failure
  (`phase-24d-buyer-surface-tightening`, Inter Tight font/CSS) reproduces on the
  untouched parent and is unrelated to this change.
- `govcon:smoke` 0 failures; `troubleshooting:scan` clean; `release-check` pass
  (local unsigned-build warnings only).

## Files changed

`main.js`, `preload.js`, `api/index.js`, `sourcedeck.html`, `package.json`,
deleted `services/govcon/sam-notice-fetch.js` and
`test/phase-25am-fetch-only-notice.test.js`, added
`test/remove-sam-solicitation-download-retrieval.test.js` + docs.

# Phase 25AD — Saved Pursuit + Right-side File Viewer (Release Notes)

**Status:** runtime repair · file-aware preview · lifecycle controls
**Surface:** Saved Pursuits (GovCon) + Solicitation Center
**Boundary:** all new IPCs validate paths and never expose the SAM.gov key

## What's new for the user

- **View Details survives a package download.** Opening the details panel and then downloading the solicitation package no longer collapses the panel. Every saved pursuit row keeps its full action set.
- **Unpursue** moves a row back from *pursuing* to *saved* without touching local files.
- **Delete Saved Pursuit** asks for confirmation and removes the row from SourceDeck. **Local downloaded package files are not removed by default.**
- **Right-side attached file viewer.** Clicking *View* on any downloaded attachment opens the file inside SourceDeck in a docked right-side panel — never a separate browser or OS window. The left content stays usable. Click *Close* to dismiss; click *Open Local File* to launch the original in your default app.
- **Inline preview supports** plain text (TXT/CSV/JSON/XML/HTML/MD/RTF/LOG), images (PNG/JPG/JPEG/WEBP/GIF/BMP), and PDFs. Office documents fall back gracefully and surface the extracted-text snippet when available.
- **After download**, the "Attachments listed by SAM.gov" block disappears. Each downloaded file row now also shows size and source chips, so the local-package view is the source of truth.
- **View Attachments** scrolls to the local files block if a package exists, or surfaces a clear "Download Solicitation Package" toast if not.
- **Send Package to Solicitation Center** passes the local manifest. Extraction runs against the downloaded files, not a stale upload state.

## Safety

- No `.env*` changes. No secret printing. No deploy / publish / GitHub release.
- No auto-run SAM.gov search on app launch.
- Only the explicitly selected pursuit downloads its package, only on user action.
- No auto-contact / Send Email / Submit Bid|Quote|Proposal.
- No upload to SAM.gov / PIEE / eBuy / GSA / agency portals / email / website / calendar / social.
- No raw SAM.gov api key exposed in DOM, logs, docs, exports, or visible URLs.
- New preview IPC validates every file path against `userData/govcon/solicitations` and refuses anything outside it (max preview size 8 MB).
- Phase 25AA-TIGHTEN-2 keyword behavior preserved verbatim — no widening of the haystack, no false positives.
- Pricing source-of-truth, Stripe/payment/checkout, NAICS Finder, Saved NAICS Profiles, and result-count selector untouched.

## Tests

Six focused suites, 40/40 assertions PASS:

```
node test/phase-25ad-view-details-after-download.test.js
node test/phase-25ad-saved-pursuit-unpursue-delete.test.js
node test/phase-25ad-right-side-file-viewer.test.js
node test/phase-25ad-local-package-files-display.test.js
node test/phase-25ad-send-package-to-solicitation-center.test.js
node test/phase-25ad-keyword-tighten-regression.test.js
```

Plus all targeted regressions (Phase 25AC, 25AB, 25AA-TIGHTEN-2, 25R, 25Q, core hardening, renderer boot) and the full `npm test`, `npm run govcon:smoke`, and `npm run troubleshooting:scan` gates.

## Manual smoke (post-merge)

1. Open a saved pursuit and click **View Details** → panel expands.
2. Click **Download Solicitation Package** → panel stays open; downloaded files appear; "Attachments listed by SAM.gov" disappears.
3. Click **View** on a downloaded file → right-side viewer opens with text/image/PDF inline.
4. Click **Open Local File** → file opens in the default app.
5. Click **Close** → viewer slides away; left content remains usable.
6. Click **Unpursue** → status badge flips to *saved*.
7. Click **Delete Saved Pursuit** → confirm → row disappears; local files remain.
8. Click **Send Package to Solicitation Center** → Solicitation Center loads the same package and runs extraction over local files.
9. Search `janitorial` → no boiler/fan-coil/furniture/cable/frame rows appear.

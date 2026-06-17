# Phase 25AD — Saved Pursuit + Right-side File Viewer · Runtime Audit

**Branch:** `fix/phase-25ad-saved-pursuit-viewer-runtime`
**Scope:** Saved-pursuit details survivability, Unpursue + Delete lifecycle, attached right-side file viewer, clean local-package file display, Solicitation Center handoff over local manifest, keyword tighten regression guard.

---

## What was broken

| # | Defect (from the user's session) | Root cause |
|---|----------------------------------|-----------|
| 1 | After downloading a solicitation package, **View Details** stopped responding reliably. | `renderSavedPursuits()` rebuilt the whole table after every download, which collapsed the open source-row. The renderer never tracked which rows the user had opened. |
| 2 | Saved pursuits had no explicit **Unpursue** or **Delete** controls. | Only `userStatus: 'saved' / 'pursuing' / 'archived'` existed. There was no IPC to remove the underlying row. |
| 3 | Downloaded attachments rendered, but the inline preview was just a small box inside the saved-pursuit row. | Phase 25AC item 3 deliberately shipped a tiny `<aside data-gc-ac-preview-pane>` inline. The mission explicitly retires it. |
| 4 | After download, the "Attachments listed by SAM.gov" block stayed visible and cluttered the row. | Phase 25AC already gated this block behind `!sm.package`; Phase 25AD preserves and tests it. |
| 5 | "Send Package to Solicitation Center" sometimes inherited a stale upload failure. | The Solicitation Center renderer also calls `renderSourcePanel`, which now reads the local manifest the same way the saved-pursuit view does. `gcW25SendToWorkspace` only invokes `gcABExtractPackageToCenter` when a package is present. |

## What changed

### Renderer ([sourcedeck.html](sourcedeck.html))

- `window.gcW25OpenRows` — per-id open-state set; `_renderRow` honors it so a full table re-render does not collapse an open panel.
- `renderSavedPursuits()` — after rebuilding the table, re-populates any rows in `gcW25OpenRows`.
- Saved pursuit row gains two new actions: `data-gc-saved-action="unpursue"` and `data-gc-saved-action="delete"`.
- `window.gcW25Unpursue(id)` — flips `userStatus` back to `saved` via `window.sd.govcon.opportunities.upsert`. Local package files are untouched.
- `window.gcW25DeleteSavedPursuit(id)` — confirms with `window.confirm()`, then calls `window.sd.govcon.opportunities.remove(id)`. The confirmation copy explicitly notes that local package files remain.
- `window.gcW25ViewAttachments(id)` — replaces the previous direct toggle. Expands the panel, scrolls to the local package summary block, or shows a "download first" toast when no package exists.
- The inline `<aside data-gc-ac-preview-pane>` block (Phase 25AC item 3) is retired from `renderSourcePanel`; the right-side viewer becomes the only preview surface.
- `window.gcACPreviewFile(id, idx)` — repurposed to populate the right-side viewer via the new credential-boundary IPC `window.sd.govcon.previewPackageFile`. Supports text, image, PDF inline preview; falls back to extracted-text snippet or a clear "Open Local File" message for unsupported types.
- Right-side viewer DOM at body root: `#sd-right-file-viewer` / `-title` / `-meta` / `-body` / `-close` / `-open-local`. Position-fixed to the right edge of the SourceDeck app shell; capped at `46vw` so the left content stays usable.
- Each downloaded file row now shows file-size and source chips alongside the existing fileName, status, View, Extract Text, Include/Exclude, and Open Local File controls.

### Credential boundary

- `services/govcon/opportunity-records.js` — new `remove(idOrIdentity)` method removes the matching row and reports `{ ok, removedId }` or `{ ok:false, reason:'not_found' }`.
- `api/index.js` — `appApi.govcon.opportunities.remove(id)` routes to the service.
- `main.js`:
  - `ipcMain.handle('govcon:opportunities-remove', …)` — wired through `appApi`.
  - `ipcMain.handle('govcon:preview-package-file', …)` — validates the requested path against `app.getPath('userData')/govcon/solicitations`, refuses anything outside with `invalid_file_path`, caps preview at 8 MB, returns one of `{kind:'text'}`, `{kind:'image'}`, `{kind:'pdf'}`, or `{kind:'fallback'}`.
- `preload.js` — exposes `window.sd.govcon.opportunities.remove(id)` and `window.sd.govcon.previewPackageFile(payload)`.

## Tests (`test/phase-25ad-*.test.js`)

| File | Asserts |
|------|---------|
| `phase-25ad-view-details-after-download.test.js` | open-state set is initialized; row carries every action button; toggle records + clears state; `renderSavedPursuits` restores open panels after re-render. |
| `phase-25ad-saved-pursuit-unpursue-delete.test.js` | Unpursue + Delete buttons exist; renderer wires through the boundary; preload + main.js register `govcon:opportunities-remove`; `opportunity-records.remove(id)` removes only the matching row and reports `not_found` for unknown ids. |
| `phase-25ad-right-side-file-viewer.test.js` | viewer DOM lives at body root with all documented ids; position:fixed; right:0; helpers exposed; Close + Open Local File wired; inline aside retired; `gcACPreviewFile` calls `previewPackageFile`; all four kind branches present; main.js refuses out-of-root paths. |
| `phase-25ad-local-package-files-display.test.js` | SAM listing gated behind `!sm.package`; file row carries size/source chips; every file row has View/Extract/Include/Exclude/Open Local File; no `[object Object]` in active renderer; View Attachments expands + scrolls or shows the "download first" toast. |
| `phase-25ad-send-package-to-solicitation-center.test.js` | `gcW25SendToWorkspace` selects the pursuit; workspace renderer shares the local-manifest panel; extraction is gated on `sm.package`; api routes to the service; service produces file-aware rows. |
| `phase-25ad-keyword-tighten-regression.test.js` | `_samMatchesKeyword` still delegates to `_samKeywordMatchReason`; "keyword matched by SAM.gov full-text" copy stays retired; haystack still excludes agency/NAICS/classification; cache stays `govcon-cache.json`; no `better-sqlite3` dep reintroduced. |

All six suites pass: **40/40** assertions.

## Gates that ran

- `npm test` → exit 0 (full suite, including the six new Phase 25AD files)
- `npm run govcon:smoke` → `passes: 47 / failures: 0` · `PASS`
- `npm run troubleshooting:scan` → `no fail/warn findings`
- `node scripts/release-check.js` → privacy gate ✓; macOS signing warnings expected in dev
- Targeted regressions: Phase 25AC (10/10), 25AB (5 suites), 25AA-TIGHTEN-2 (11/11), 25R, 25Q, govcon-final-runtime-polish, renderer-boot, govcon-core-hardening — all PASS.

## Safety scan

`grep -RInE` across the documented denylist found only acceptable hits:

- `SAM.gov key:` strings are renderer status labels (presence-only).
- `api_key=` only appears inside main-process services that append it on the URL **outside the renderer**, plus regex patterns in scanners.
- `[object Object]` only appears inside historical comments documenting the urlLabel guard.
- Retired phrases like "keyword matched by SAM.gov full-text", Paste/Source Materials, Submit Bid/Quote, Send Email, etc. show up only in negative tests asserting their absence.

No active runtime offender. No `.env`, stashes, pricing, Stripe/payment, website, dist, release, out, .qa, or reports paths were touched.

## Forbidden surface (untouched)

- `.env*`, stashes, deploy/publish/release pipelines.
- Auto-run SAM.gov search on app launch.
- Mass-download of attachments across all opportunities (only the explicitly selected pursuit's package downloads).
- Auto-contact / Send Email / Submit Bid|Quote|Proposal.
- Upload to SAM.gov / PIEE / eBuy / GSA / acquisition.gov / agency portals / email / website / calendar / social.
- Raw SAM.gov api key in DOM/logs/docs/exports.
- Pricing source-of-truth, Stripe, checkout, payment.
- NAICS Finder, Saved NAICS Profiles, result-count selector — preserved.
- Existing package download service, Open SAM.gov Notice, Download Solicitation Package, Send Package to Solicitation Center, manifest storage under `userData` — preserved.

# Phase 25AG — Solicitation Package Viewer: freeze / wrong-file fix

**Type:** P0 runtime safety repair

## What was broken

Clicking **Download Solicitation Package** or a View action could fill the
right-side viewer with raw SourceDeck app-shell text/CSS/HTML and freeze the
app, instead of showing the selected downloaded attachment.

## What changed

- **Download never auto-opens the viewer.** Downloading only fetches files,
  updates the package manifest/status, and shows a toast. The viewer opens
  only when you click **View** on a specific downloaded attachment.
- **Preview is restricted to your solicitation package storage.** Only files
  under `userData/govcon/solicitations/` can be previewed. Repo/app files
  (`sourcedeck.html`, `package.json`, `.env*`, `dist/`, `release/`, …),
  remote URLs, `file://` URLs, and symlink escapes are refused with a safe
  message.
- **App-shell guard.** If the selected content looks like the SourceDeck app
  shell, the viewer blocks it with a clear message instead of rendering it.
- **Safe rendering.** File text is shown via `textContent` only — never raw
  `innerHTML`, never `srcdoc`/`iframe`/`webview`. PDFs use a bounded object
  embed; **Open Local File** stays a separate explicit action.
- **Size cap.** Inline text preview is capped at 250 KB and truncated with a
  note; oversized files are not loaded into the viewer, so the renderer can no
  longer freeze on huge blobs.

## Safety

No `.env` changes, no secrets printed, no SAM key/`api_key` exposure, no SAM
search/filter/index changes, no new features, no auto contact/bid/quote/
submit/upload, no pricing/payment/checkout changes, no deploy/release.

## Verify after merge

Rebuild the app package, refresh the Day 0 package, then click **Download
Solicitation Package** and confirm no viewer opens until you click a file's
**View** button — and that View shows the attachment (or a safe fallback),
never the app shell.

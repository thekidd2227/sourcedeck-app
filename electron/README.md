# `/electron/` — Electron-specific shell boundary

This directory marks the **target home** for everything that is
genuinely Electron-only. Today the Electron entry points still live at
the repo root (`main.js`, `preload.js`, `sourcedeck.html`,
`chartnav-integration.js`) so we don't break the existing app
startup or the `electron-builder` packaging contract documented in
`package.json` (`build.files`).

The migration is staged. **Do not move files yet.** This README
documents what belongs here and the order to move things in.

## What stays Electron-only (lives or will live here)

- **`main.js`** — Electron main-process entry. App lifecycle,
  `BrowserWindow`, IPC registration, `safeStorage`, `autoUpdater`.
- **`preload.js`** — `contextBridge` surface that exposes
  `window.sd` to the renderer.
- **`sourcedeck.html`** — current monolithic renderer. Will be
  replaced by `/web/` over time; for the desktop shell, this
  remains the offline-capable single-file UI.
- **`chartnav-integration.js`** — desktop ChartNav telemetry shim.
- **Native menu, native notifications, file dialogs, deep
  protocol handlers (`sourcedeck://`), local-file open, offline
  cache, autoUpdater wiring** — all desktop-only.
- **Local `safeStorage`-backed credential adapter** lives in
  `services/settings/credentials.js` (`createSafeStorageCredentialStore`)
  and is constructed in `main.js`. The web/server tier will use a
  different adapter (`VaultAdapter` placeholder is in the same file).

## What does NOT belong here

Anything that a future web app or backend API would also need:
- Opportunity discovery, normalization, dedupe → `services/sam/`
- Targeting profile → `services/settings/targeting-profile.js`
- Compliance matrix → `services/compliance/`
- Stakeholder graph → `services/stakeholders/`
- Capture (pre-RFP, past-performance) → `services/capture/`
- Proposal drafting → `services/proposal/`
- Audit log → `services/audit/`
- AI providers → `services/ai/`
- Storage providers → `services/storage/`
- App-API adapter → `api/`

## Migration sequencing (do not skip)

1. **Now (this commit):** new shared services + `/api/` adapter
   built; existing `main.js`/`preload.js` keep working.
2. **Next:** migrate `main.js` IPC handlers to call the
   `/api/createAppApi` adapter instead of importing services
   directly. The IPC shape stays the same; only the call site moves.
3. **Then:** move `main.js`, `preload.js`, `sourcedeck.html`,
   `chartnav-integration.js` into `/electron/` and update
   `package.json -> build.files` in lock-step. Run
   `npm run release:check` after the move to confirm the asar still
   contains the required files.
4. **Then:** stand up the `/web/` placeholder app (Vite + React or
   plain TypeScript ESM) consuming the same `/api/createAppApi`.
5. **Then:** introduce a thin Express/Fastify server in
   `/api/server/` that hosts `createAppApi` over HTTP, wired with
   per-tenant credentials.
6. **Finally:** the renderer's direct-fetch / Bearer-header paths
   to Airtable / Apollo / OpenAI / Anthropic are removed; they all
   route through the API adapter.

See `docs/architecture-web-first-roadmap.md` for the full plan.

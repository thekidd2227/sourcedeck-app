# Incident — GovCon release smoke reported 12 false IPC-handler failures

**Date:** 2026-06-24
**Trigger:** `npm run refresh:buyer-trial` aborted at the `npm run govcon:smoke` gate.
**Severity:** Release-blocking (buyer-trial rebuild stopped). **No production-runtime defect.**

## Symptom

`npm run govcon:smoke` reported 12 failures, all in section 2 `[ipc handlers]`:

```
ipcMain handles govcon:sam-search
ipcMain handles govcon:opportunities-favorite
ipcMain handles govcon:deadlines-extract
ipcMain handles govcon:subcontractors-source
ipcMain handles govcon:incumbent-research
ipcMain handles govcon:solicitation-analyze
ipcMain handles govcon:clarifications-generate
ipcMain handles govcon:proposal-workspace
ipcMain handles govcon:exports-create
ipcMain handles credentials:status
ipcMain handles credentials:set
ipcMain handles credentials:remove
```

The `[preload surface]`, `[app-api surface]`, and `[credential boundary]` sections all
passed. Only the static scan for `ipcMain.handle('<channel>')` literals failed.

## Root cause — smoke-scanner drift, NOT runtime registration (condition B)

The Phase 2 architecture migration (`c3c00fb`, "migrate IPC registration modules")
moved every `ipcMain.handle(...)` call **out of `main.js`** and into the composition
root's modular registrars:

- `app/main/bootstrap.js` — composition root; calls `registerCoreIpc` + `registerFeatureIpc`.
- `app/main/ipc/register-feature-ipc.js` — hosts all 12 channels above (lines 71, 194,
  201, 203, 204, 205, 206, 209, 214, 239, 240, 245).

`main.js` is now a thin entry point with **zero** `ipcMain.handle(...)` calls
(`createAppApi(...)` → `bootstrap(...)`). The old release smoke still scanned the
literal text of `main.js` for each channel, so after the migration it found none of
them and emitted 12 false failures. The application itself was never broken: every
channel is registered through the real startup path
(`main.js` → `bootstrap` → `registerFeatureIpc` → `appApi.*`).

### Proof the handlers exist and run (traced end-to-end, all 12)

`renderer → preload (ipcRenderer.invoke) → channel → register-feature-ipc handler → appApi method → sanitized response`

| Channel | preload (preload.js) | handler (register-feature-ipc.js) | service (api/index.js) |
|---|---|---|---|
| govcon:sam-search | `samSearch` L49 | L71 | `govcon.sam.search` |
| govcon:opportunities-favorite | `favorite` L93 | L194 | `govcon.opportunities.favorite` |
| govcon:deadlines-extract | `extract` L100 | L201 | `govcon.deadlines.extract` |
| govcon:subcontractors-source | `source` L104 | L203 | `govcon.subcontractors.source` |
| govcon:incumbent-research | `research` L107 | L204 | `govcon.incumbent.research` |
| govcon:solicitation-analyze | `analyze` L110 | L205 | `govcon.solicitation.analyze` |
| govcon:clarifications-generate | `generate` L113 | L206 | `govcon.clarifications.generate` |
| govcon:proposal-workspace | `workspace` L129 | L214 | `govcon.proposal.workspace` |
| govcon:exports-create | `create` L120 | L209 | `govcon.exports.create` |
| credentials:status | `status` L152 | L239 | `credentials.status` → `summarizePresence` (presence-only) |
| credentials:set | `set` L153 | L240 | `credentials.set` (main-process only) |
| credentials:remove | `remove` L154 | L245 | `credentials.remove` (main-process only) |

Pre-existing regression tests already prove this at runtime:
`test/architecture-main-process-composition.test.js` (section 10 invokes the real
`bootstrap` with a fake `ipcMain` and asserts 78 feature + 18 core = 96 channels
register) and `test/architecture-ipc-channel-inventory.test.js` (exact 96-channel set,
no duplicates).

### Second occurrence — same root cause in the refresh script

The first `refresh:buyer-trial` re-run cleared the smoke gate and **successfully
packaged** the macOS app (electron-builder, `dist/mac/SourceDeck.app/Contents/Resources/app.asar`
produced), then aborted at a post-build guard in
`scripts/refresh-buyer-trial-package.sh:63`:

```
grep -q "govcon:sam-fetch-links" main.js || { echo "ERROR: Fetch Links IPC missing"; exit 1; }
```

`govcon:sam-fetch-links` was migrated to `register-feature-ipc.js:74` in Phase 2 and no
longer appears in `main.js` (0 hits) — the identical stale-scan defect, in the refresh
script's own release guard. Fixed to scan the modular registrar.

## Fix

1. **Smoke detector aligned with the modular architecture** (commit `5990363`,
   "fix(release): align govcon smoke with ipc composition root"). The smoke now:
   - reads `app/main/ipc/register-feature-ipc.js` for the 12 channel literals, and
   - additionally asserts `main.js` delegates through the composition root
     (`registerFeatureIpc` present in `bootstrap.js`) **and** contains no inline
     `ipcMain.handle(...)`.
   The checks were not weakened to string-presence shortcuts; the gate still fails if a
   channel literal is absent from the real registrar or if the delegation contract breaks.

2. **New anti-drift regression test** — `test/govcon-release-smoke-detection.test.js`
   (wired into `npm test`). It ties the release gate to reality so this class of drift
   cannot recur silently:
   - each of the 12 release-critical channels is **registered at runtime** by
     `registerFeatureIpc` (a genuinely missing handler still fails, loudly);
   - the smoke script reads the modular registrar, not `main.js`;
   - every channel the smoke statically requires is also runtime-registered (anti-drift lock);
   - `main.js` hosts none of them (migration stays complete);
   - `preload.js` exposes an `ipcRenderer.invoke` for each (full renderer→main path).

## Security implications

None weakened. The SAM.gov key is still read only inside the main process
(`api/index.js:97`, `credentials.get('sam-gov')`); `credentials:status` returns
presence/metadata via `summarizePresence` (no values); `credentials:set/remove` remain
main-process controlled; preload builds no `Authorization`/`Bearer`/`x-api-key` headers
and never calls a raw `credentials.get`. KILL irreversibility, RED_RESTRICTED draft
blocking, human-review requirements, export secret-stripping, and license enforcement
are unchanged.

## Files changed

- `scripts/govcon-release-smoke.mjs` — smoke detector aligned with composition root (commit `5990363`).
- `scripts/refresh-buyer-trial-package.sh` — post-build Fetch Links IPC guard re-pointed
  from `main.js` to `app/main/ipc/register-feature-ipc.js` (same root cause, second site).
- `test/govcon-release-smoke-detection.test.js` — **new** anti-drift regression guard
  (covers both the smoke detector and the refresh-script guard).
- `package.json` — wired the new test into the `test` chain.
- `docs/engineering/incident-govcon-ipc-release-smoke-drift.md` — this report.

## Validation run (all green)

`git diff --check` clean · `npm run license:check` 9/9 · `npm run govcon:smoke` 48/0 ·
`node --test test/phase-25aq-far-commercial-items-section-extraction.test.js` pass ·
`architecture-main-process-composition` 100/0 · `architecture-ipc-channel-inventory` 9/0 ·
`credential-boundary` 14/14 · `credential-boundary-openai-claude` pass · `govcon-export` pass ·
`govcon-core` 27/27 · `govcon-core-hardening` 15/15 · `architecture-boundary` 22/22 ·
`architecture-packaging-runtime-modules` 4/4 · `govcon-release-smoke-detection` 55/0 ·
`npm test` (full suite) exit 0 · `troubleshooting:scan` exit 0 · `release:check` exit 0
(dev-env unsigned warning only) · `distribution:check` exit 0 (presence-only).

## Rebuild outcome — buyer-trial package regenerated (exit 0)

`npm run refresh:buyer-trial` completed past the previous GovCon smoke failure and
through the full gate chain (license → smoke 48/0 → troubleshooting 0 critical/high →
release-check → distribution → `pack:mac`), packaged the app, installed it, verified the
installed `app.asar` SHA-256 equals the fresh build, and launched the app
("PASS: SourceDeck started successfully").

- **Built commit:** `feb3534`
- **Installed app:** `~/Desktop/SourceDeck Buyer Trial Package/02 App/SourceDeck.app`
- **Buyer ZIP:** `~/Desktop/SourceDeck Buyer Trial Package.zip` (98 MB)
- **app.asar SHA-256:** `f2a6fef4367b281555cc902ec910473d918620212fdb2ccaa4ec8f4b1fa8f67a`
- **Package audit:** no `.env`, no test fixtures, no `.git`, no secret-shaped key/token
  values in the packaged source (1490 asar entries, allowlist-limited); packaged
  `app/main/ipc/register-feature-ipc.js` matches HEAD byte-for-byte; packaged `main.js`
  hosts 0 `ipcMain.handle(...)`. App bundle id `app.sourcedeck.lcc`. Ad-hoc signed
  (Developer ID not configured in this environment — expected for a local buyer trial).

## Remaining dependency vulnerabilities (not force-fixed — by policy)

`npm audit`: 12 vulnerabilities (1 low, 1 moderate, 10 high), **all** in the build-time
tooling tree — `electron-builder` → `app-builder-lib` / `dmg-builder` /
`electron-builder-squirrel-windows`, plus transitive `tmp` (<0.2.6, path traversal).
These are `devDependencies` used only to package the app; none ship in the runtime
bundle (build `files` is limited to `main.js`, `preload.js`, `sourcedeck.html`,
`app/**`, `services/**`, `api/**`). `npm audit fix --force` would bump `electron-builder`
24.13.3 → 26.x — a forbidden breaking framework upgrade during a release repair. Left
in place for a separate, deliberate tooling-upgrade change.

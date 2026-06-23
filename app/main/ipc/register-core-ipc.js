// app/main/ipc/register-core-ipc.js
//
// Phase 1 — strangler-pattern scaffold for the core IPC surface.
//
// In Phase 1, all `ipcMain.handle(...)` registrations remain in main.js
// because ~11 static-analysis tests (credential-boundary.test.js,
// first-run-safety.test.js, govcon-core.test.js,
// phase-25aa-storage-safety.test.js, phase-25aa-index-settings.test.js,
// phase-25ab-uploaded-rfp-rfq-support.test.js,
// phase-25an-browser-handoff-local-extraction.test.js,
// chartnav-integration.test.js, govcon-operating-profile-completeness.test.js,
// phase-25aa-sam-filter-params.test.js, credential-boundary-openai-claude.test.js)
// pin `main.js` content via `fs.readFileSync('../main.js')` and regex over
// the literal `ipcMain.handle('channel-name', ...)` calls plus the
// `appApi.foo.bar()` routing pattern.
//
// To keep that contract while still introducing the composition-root
// architecture, this module exists as the documented intent for Phase 2
// migration. It currently accepts the same dependency bag the IPC
// handlers in main.js consume so a Phase 2 patch can move handlers here
// one bucket at a time without changing main.js's public shape.
//
// Phase 2 will:
//   1. Migrate core (non-GovCon) handlers here: store-key, get-key,
//      delete-key, store-get, store-set, ai-provider-status,
//      storage-provider-status, context-get, context-set,
//      guard-sensitive-action, validate-upload, ai-generate,
//      storage-test-put, audit-summary, license:*.
//   2. Update the affected static-analysis tests to read from
//      `app/main/ipc/register-core-ipc.js` as the new source of truth
//      (the assertions are about layout, not behavior).
//   3. Leave the renderer untouched — IPC channel names and contracts
//      are byte-for-byte identical.
//
// Until Phase 2 lands this function is intentionally a no-op so calling
// it is safe. The dependency bag is validated only to surface
// integration mistakes (forgotten dependency injection) early.

'use strict';

function registerCoreIpc(deps){
  if (!deps || typeof deps !== 'object') {
    throw new Error('registerCoreIpc: deps bag is required');
  }
  // Phase 1: no registrations performed here. See main.js for the
  // current canonical core IPC surface. See ADR-0001 for the migration
  // plan that moves them into this module in Phase 2.
  return { phase: 1, registered: [] };
}

module.exports = { registerCoreIpc };

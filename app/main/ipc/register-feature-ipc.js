// app/main/ipc/register-feature-ipc.js
//
// Phase 1 — strangler-pattern scaffold for the feature IPC surface.
//
// Like `register-core-ipc.js`, this module is currently a no-op because
// Phase 1's strict scope-control rule preserves main.js as the canonical
// IPC registration site (~11 static-analysis tests pin main.js content).
//
// Phase 2 will migrate the feature-side handlers here in three buckets:
//   1. govcon:*  (the largest bucket — see main.js lines ~318–487)
//   2. audit:list, credentials:*, airtable:*, enrichment:*, ai:*
//   3. The two `open-external` channels (the generic one + the
//      `govcon:open-external-safe` variant) and the
//      `govcon:select-and-extract-solicitation` IPC.
//
// The sanitizers (`sanitizeOutreachConfig`, `sanitizeOutreachDraftInput`,
// `sanitizeSamFilters`) will move into `app/main/ipc/sanitizers.js` as a
// Phase 2 sub-step so this module can stay focused on registration only.
//
// Every IPC channel name and argument/return contract is preserved
// across phases. The renderer must not know either phase happened.

'use strict';

function registerFeatureIpc(deps){
  if (!deps || typeof deps !== 'object') {
    throw new Error('registerFeatureIpc: deps bag is required');
  }
  // Phase 1: no registrations performed here. See main.js for the
  // current canonical feature IPC surface (govcon:*, audit:list,
  // credentials:*, airtable:*, enrichment:*, ai:*). See ADR-0001 for
  // the migration plan.
  return { phase: 1, registered: [] };
}

module.exports = { registerFeatureIpc };

// test/architecture-ipc-channel-inventory.test.js
//
// Phase 2 IPC migration safety net.
//
// This test inventories every IPC channel registered by the main-process
// composition root (via `app/main/ipc/register-{core,feature}-ipc.js`)
// and asserts the full set is EXACTLY the same one main.js owned
// before Phase 2 (96 channels). It is the single regression guard for
// the migration: if anyone adds, renames, or drops a channel without
// updating this list AND the corresponding preload entry, the test
// fails loudly.
//
// The test uses a fake ipcMain.handle that records calls — no Electron
// runtime is started.

'use strict';

const assert = require('assert');
const path   = require('path');

const ROOT = path.resolve(__dirname, '..');

// Pre-Phase-2 channel set inventoried from main.js@b7ef4651
// (the commit immediately preceding this PR). Sorted alphabetically
// for diff readability.
const EXPECTED_CHANNELS = [
  'ai-generate',
  'ai-provider-status',
  'ai:draft-proposal-section',
  'ai:generate',
  'ai:summarize-opportunity',
  'ai:watsonx-readiness',
  'airtable:create',
  'airtable:delete',
  'airtable:list',
  'airtable:update',
  'audit-summary',
  'audit:list',
  'context-get',
  'context-set',
  'credentials:remove',
  'credentials:set',
  'credentials:status',
  'delete-key',
  'enrichment:enrich-org',
  'enrichment:search-companies',
  'enrichment:search-orgs',
  'enrichment:search-people',
  'get-key',
  'govcon:capability-statement-extract',
  'govcon:clarifications-generate',
  'govcon:communications-draft-email',
  'govcon:compliance-matrix',
  'govcon:content-generate',
  'govcon:deadlines-approve',
  'govcon:deadlines-extract',
  'govcon:exports-create',
  'govcon:get-user-data-path',
  'govcon:incumbent-research',
  'govcon:index-clear',
  'govcon:index-run-now',
  'govcon:index-search',
  'govcon:index-settings-get',
  'govcon:index-settings-save',
  'govcon:index-status',
  'govcon:open-external-safe',
  'govcon:opportunities-favorite',
  'govcon:opportunities-favorites',
  'govcon:opportunities-get',
  'govcon:opportunities-list',
  'govcon:opportunities-remove',
  'govcon:opportunities-upsert',
  'govcon:outreach-export',
  'govcon:outreach-generate-draft',
  'govcon:outreach-scan',
  'govcon:outreach-set-status',
  'govcon:past-performance-list',
  'govcon:past-performance-match',
  'govcon:past-performance-remove',
  'govcon:past-performance-save',
  'govcon:pre-rfp-evaluate',
  'govcon:primes-draft',
  'govcon:primes-find',
  'govcon:primes-find-live',
  'govcon:primes-memo',
  'govcon:profile-completeness',
  'govcon:profile-get',
  'govcon:profile-reset',
  'govcon:profile-save',
  'govcon:proposal-cost-volume',
  'govcon:proposal-workspace',
  'govcon:relationship-strategy',
  'govcon:sam-fetch-links',
  'govcon:sam-search',
  'govcon:scheduled-searches-history',
  'govcon:scheduled-searches-list',
  'govcon:scheduled-searches-run',
  'govcon:scheduled-searches-save',
  'govcon:select-and-extract-solicitation',
  'govcon:solicitation-analyze',
  'govcon:solicitation-explain-section',
  'govcon:solicitation-summarize',
  'govcon:stakeholders-for-opp',
  'govcon:subcontractors-source',
  'govcon:targeting-get',
  'govcon:targeting-reset',
  'govcon:targeting-set',
  'govcon:vendor-draft-outreach',
  'govcon:vendor-quote-analyze',
  'govcon:vendor-rank-candidates',
  'govcon:vendor-search-strategy',
  'govcon:vendor-send-approved',
  'guard-sensitive-action',
  'license:activate',
  'license:deactivate',
  'license:status',
  'license:validate',
  'open-external',
  'storage-provider-status',
  'storage-test-put',
  'store-get',
  'store-key',
  'store-set',
  'validate-upload'
];

function makeRecordingIpcMain(){
  const handled = [];
  return {
    handled,
    handle(channel /*, fn */){
      if (typeof channel !== 'string' || !channel) {
        throw new Error('ipcMain.handle: channel must be a non-empty string');
      }
      handled.push(channel);
    }
  };
}

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if (cond) { pass += 1; console.log('  ✅', label); return; }
  fail += 1;
  console.log('  ❌', label, detail ? '→ ' + detail : '');
}

console.log('\n=== Phase 2 — IPC channel inventory ===\n');

const { registerCoreIpc }    = require(path.join(ROOT, 'app/main/ipc/register-core-ipc'));
const { registerFeatureIpc } = require(path.join(ROOT, 'app/main/ipc/register-feature-ipc'));

const noop = () => {};

// Run both registrars against a recording fake ipcMain.
const coreIpc = makeRecordingIpcMain();
const coreResult = registerCoreIpc({
  ipcMain: coreIpc,
  safeStorage: {},
  store: { get: noop, set: noop, delete: noop },
  audit: { append: noop, summary: noop },
  AUDIT_TYPES: {},
  context: { get: noop, set: noop, guardSensitiveAction: noop },
  licensing: { status: noop, activate: noop, validate: noop, deactivate: noop },
  loadConfig: noop, getAiProviderStatus: noop, getStorageProviderStatus: noop,
  createAiProvider: noop, createStorage: noop, validateUpload: noop
});
ok('registerCoreIpc returns phase:2', coreResult && coreResult.phase === 2);
ok('registerCoreIpc.registered matches what fake ipcMain saw',
   JSON.stringify(coreResult.registered) === JSON.stringify(coreIpc.handled));

const featIpc = makeRecordingIpcMain();
const featResult = registerFeatureIpc({
  ipcMain: featIpc,
  shell: { openExternal: noop },
  dialog: { showOpenDialog: noop },
  appApi: { govcon: {}, audit: {}, credentials: {}, airtable: {}, enrichment: {}, ai: {} },
  getUserDataPath: () => '/tmp'
});
ok('registerFeatureIpc returns phase:2', featResult && featResult.phase === 2);
ok('registerFeatureIpc.registered matches what fake ipcMain saw',
   JSON.stringify(featResult.registered) === JSON.stringify(featIpc.handled));

// Combine + sort + compare to expected set.
const actual   = coreIpc.handled.concat(featIpc.handled).slice().sort();
const expected = EXPECTED_CHANNELS.slice().sort();

const missing = expected.filter(c => !actual.includes(c));
const extra   = actual.filter(c => !expected.includes(c));

ok('every expected channel is registered',
   missing.length === 0,
   missing.length ? 'missing: ' + missing.join(', ') : '');
ok('no extra channels are registered',
   extra.length === 0,
   extra.length ? 'extra: ' + extra.join(', ') : '');
ok('total registered channels = 98 (Phase-2 96 + Phase-25AR summarize/explain)',
   actual.length === 98,
   'got ' + actual.length);
ok('no duplicate channel registrations',
   new Set(actual).size === actual.length,
   'duplicates: ' + actual.filter((c, i) => actual.indexOf(c) !== i).join(', '));

// Symmetry check: deep-equal the sorted lists.
try {
  assert.deepStrictEqual(actual, expected);
  ok('full sorted channel list deep-equals the canonical pre-Phase-2 set', true);
} catch (err) {
  ok('full sorted channel list deep-equals the canonical pre-Phase-2 set', false, err.message);
}

console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

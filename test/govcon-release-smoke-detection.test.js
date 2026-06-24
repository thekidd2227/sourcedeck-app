// test/govcon-release-smoke-detection.test.js
//
// Regression guard for the GovCon release smoke *detector* itself.
//
// Incident (2026-06-24): the Phase 2 IPC migration moved every
// `ipcMain.handle(...)` registration out of main.js into
// `app/main/ipc/register-feature-ipc.js`. The release smoke
// (scripts/govcon-release-smoke.mjs) still scanned main.js for the
// channel literals, so it reported 12 false "ipcMain handles ..."
// failures and blocked `npm run refresh:buyer-trial` — even though the
// handlers were present, wired, and registered through the real
// startup path. The application was never broken; the *detector* was
// stale (root cause: smoke-scanner drift, not runtime registration).
//
// This test ties the release smoke to the real modular architecture so
// the same drift cannot recur silently:
//
//   1. The 12 release-critical channels are registered at runtime by
//      registerFeatureIpc (recording ipcMain) — a genuinely MISSING
//      handler still fails here, loudly.
//   2. The smoke script reads register-feature-ipc.js (the composition
//      root's feature registrar) for those channels — NOT main.js.
//   3. Every channel the smoke statically requires is actually emitted
//      by the registrar, so the static gate and the runtime surface
//      cannot drift apart.
//   4. main.js hosts none of them as ipcMain.handle(...) — the migration
//      stays complete; the old stale-scan target is locked out.
//   5. preload.js exposes an ipcRenderer.invoke for each channel — the
//      full renderer→main path is intact.
//
// No Electron runtime is started. Plain-node test style to match the
// repository's other static-architecture tests.

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// The exact 12 channels the GovCon release smoke gates on (section 2 of
// scripts/govcon-release-smoke.mjs). These are the channels whose false
// failures blocked the buyer-trial rebuild.
const RELEASE_CRITICAL_CHANNELS = [
  'govcon:sam-search',
  'govcon:opportunities-favorite',
  'govcon:deadlines-extract',
  'govcon:subcontractors-source',
  'govcon:incumbent-research',
  'govcon:solicitation-analyze',
  'govcon:clarifications-generate',
  'govcon:proposal-workspace',
  'govcon:exports-create',
  'credentials:status',
  'credentials:set',
  'credentials:remove'
];

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if (cond) { pass += 1; console.log('  ✅', label); return; }
  fail += 1;
  console.log('  ❌', label, detail ? '→ ' + detail : '');
}

console.log('\n=== GovCon release smoke — detector alignment guard ===\n');

// ── 1. Runtime: the registrar actually registers each channel ──────────
function makeRecordingIpcMain(){
  const handled = [];
  return { handled, handle(channel){ handled.push(channel); } };
}

let registered = [];
try {
  const { registerFeatureIpc } = require(path.join(ROOT, 'app/main/ipc/register-feature-ipc'));
  const noop = () => {};
  const fake = makeRecordingIpcMain();
  const result = registerFeatureIpc({
    ipcMain: fake,
    shell: { openExternal: noop },
    dialog: { showOpenDialog: noop },
    appApi: { govcon: {}, audit: {}, credentials: {}, airtable: {}, enrichment: {}, ai: {} },
    getUserDataPath: () => '/tmp'
  });
  registered = (result && result.registered) || fake.handled;
  ok('registerFeatureIpc invokable and returns a registered inventory',
     Array.isArray(registered) && registered.length > 0, String(registered.length));
  ok('registered inventory matches what ipcMain.handle actually saw',
     JSON.stringify(registered.slice().sort()) === JSON.stringify(fake.handled.slice().sort()));
} catch (err) {
  ok('registerFeatureIpc invokable with deps bag', false, err.message);
}

for (const ch of RELEASE_CRITICAL_CHANNELS) {
  ok(`runtime registers '${ch}'`, registered.includes(ch));
}
// A genuinely missing handler must surface as a missing registration —
// prove the assertion above has teeth by confirming the set is unique.
ok('no duplicate runtime registration of release-critical channels',
   new Set(registered).size === registered.length,
   'dupes: ' + registered.filter((c, i) => registered.indexOf(c) !== i).join(', '));

// ── 2/3. The smoke script scans the modular registrar, not main.js ─────
const smokeSrc = fs.readFileSync(path.join(ROOT, 'scripts/govcon-release-smoke.mjs'), 'utf8');

ok("smoke reads app/main/ipc/register-feature-ipc.js for the ipc-handler section",
   /read\(\s*['"]app\/main\/ipc\/register-feature-ipc\.js['"]\s*\)/.test(smokeSrc));
ok('smoke ipc-handler check targets the feature registrar source (featureIpc), not mainjs',
   /featureIpc\.includes\(/.test(smokeSrc) &&
   !/feature IPC handles[\s\S]*mainjs\.includes\(/.test(smokeSrc));
ok('smoke still asserts main.js delegates through the composition root (registerFeatureIpc + no inline handles)',
   /registerFeatureIpc/.test(smokeSrc) && /\.test\(mainjs\)/.test(smokeSrc));

// Every release-critical channel literal the smoke gates on must be
// present in the actual registrar source (what the static scan reads)
// AND in the runtime registration set. This is the anti-drift lock.
const featureSrc = fs.readFileSync(path.join(ROOT, 'app/main/ipc/register-feature-ipc.js'), 'utf8');
for (const ch of RELEASE_CRITICAL_CHANNELS) {
  const literal = featureSrc.includes("'" + ch + "'") || featureSrc.includes('"' + ch + '"');
  ok(`smoke-scanned source contains literal '${ch}' AND runtime registers it`,
     literal && registered.includes(ch));
}

// ── 4. The migration stays complete: main.js hosts none of them ────────
const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
ok('main.js contains no ipcMain.handle(...) at all (migration complete)',
   !/ipcMain\.handle\(/.test(mainSrc));
for (const ch of RELEASE_CRITICAL_CHANNELS) {
  ok(`main.js does NOT host a handle('${ch}') (old stale-scan target locked out)`,
     !new RegExp(`ipcMain\\.handle\\(\\s*['"]${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(mainSrc));
}

// ── 5. preload exposes a renderer→main path for each channel ───────────
const preloadSrc = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
for (const ch of RELEASE_CRITICAL_CHANNELS) {
  ok(`preload exposes ipcRenderer.invoke('${ch}', ...)`,
     new RegExp(`invoke\\(\\s*['"]${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(preloadSrc));
}

console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

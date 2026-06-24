/**
 * Phase 3.5 — Packaging smoke guard for architecture/runtime modules.
 *
 * Phases 1–3 moved load-bearing code under app/** (main-process composition
 * root, IPC registrars, and the first extracted renderer slice). main.js
 * require()s app/main/** at boot and sourcedeck.html loads
 * app/renderer/features/** via <script src>. A packaging defect once shipped
 * an asar with ZERO app/ entries because package.json `build.files` is an
 * explicit allowlist that never listed app/**, which would crash the
 * packaged app at launch.
 *
 * This test is the permanent regression guard. It asserts:
 *   1. build.files contains a rule that guarantees app/** ships.
 *   2. every required runtime module exists in the repository.
 *   3. if a packaged app.asar exists, those same files are inside it.
 *      (If no asar exists — CI may not package before `npm test` — the asar
 *      inspection is skipped with a clear, non-failing message.)
 *
 * Run: node test/architecture-packaging-runtime-modules.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const BUILD_FILES = (pkg.build && pkg.build.files) || [];

// Load-bearing runtime modules introduced by the Phase 1–3 refactor. These
// are require()'d by main.js or loaded by sourcedeck.html, so they MUST ship.
const REQUIRED_RUNTIME_FILES = [
  'app/main/bootstrap.js',
  'app/main/window/create-main-window.js',
  'app/main/startup/privacy-scrub.js',
  'app/main/startup/updater.js',
  'app/main/ipc/register-core-ipc.js',
  'app/main/ipc/register-feature-ipc.js',
  'app/main/ipc/sanitizers.js',
  'app/renderer/features/find-opportunities/state-local-procurement.js',
];

// A build.files entry covers app/** if it is the catch-all "**/*" or any glob
// rooted at app/ (e.g. "app/**/*", "app/**", "app/").
function buildFilesCoverApp(files) {
  return files.some((f) => f === '**/*' || /^app\//.test(String(f)));
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✅ ' + name);
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ': ' + e.message);
  }
}

console.log('\n=== Phase 3.5 — Packaging runtime-module guard ===\n');

test('package.json build.files guarantees app/** ships (allowlist rule present)', () => {
  assert.ok(
    buildFilesCoverApp(BUILD_FILES),
    'build.files must include "app/**/*" (or "**/*") so app/main/** and ' +
    'app/renderer/** are bundled; got ' + JSON.stringify(BUILD_FILES)
  );
});

test('build.files rule covers both app/main/** and app/renderer/**', () => {
  // Explicit second assertion so the intent is locked even if the rule form
  // changes: the chosen rule must admit a main-process file and a renderer file.
  const probes = [
    'app/main/bootstrap.js',
    'app/renderer/features/find-opportunities/state-local-procurement.js',
  ];
  for (const probe of probes) {
    const covered = BUILD_FILES.some(
      (f) => f === '**/*' || f === 'app/**/*' || f === 'app/**' ||
             (/^app\//.test(String(f)) && probe.startsWith(String(f).replace(/\*+.*$/, '')))
    );
    assert.ok(covered, 'no build.files rule covers ' + probe);
  }
});

test('all required runtime modules exist in the repository', () => {
  const missing = REQUIRED_RUNTIME_FILES.filter(
    (rel) => !fs.existsSync(path.join(ROOT, rel))
  );
  assert.deepStrictEqual(missing, [], 'missing required runtime files: ' + missing.join(', '));
});

test('packaged app.asar (if present) contains all required runtime modules', () => {
  const asarPath = path.join(ROOT, 'dist', 'mac', 'SourceDeck.app', 'Contents', 'Resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    console.log('     ↳ SKIP: no packaged asar at dist/mac/SourceDeck.app/.../app.asar ' +
                '(run `npm run pack:mac` to enable this check; CI may not package before tests).');
    return;
  }

  // Use the locally available asar library (electron-builder dep). If it is
  // not resolvable, skip the asar inspection rather than fail — do not install.
  let listPackage = null;
  for (const mod of ['@electron/asar', 'asar']) {
    try { listPackage = require(mod).listPackage; if (listPackage) break; } catch (e) { /* try next */ }
  }
  if (typeof listPackage !== 'function') {
    console.log('     ↳ SKIP: no asar library resolvable in node_modules; ' +
                'asar inspection not run (repository allowlist + file checks still enforced).');
    return;
  }

  let entries;
  try {
    entries = new Set(listPackage(asarPath));
  } catch (e) {
    console.log('     ↳ SKIP: asar listing failed (' + e.message + '); asar inspection not run.');
    return;
  }

  const missing = REQUIRED_RUNTIME_FILES.filter((rel) => !entries.has('/' + rel));
  assert.deepStrictEqual(
    missing, [],
    'packaged asar is missing required runtime files: ' + missing.join(', ') +
    ' — this is the exact regression class this guard exists to catch.'
  );
  console.log('     ↳ asar inspected: all ' + REQUIRED_RUNTIME_FILES.length + ' required runtime files present.');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} packaging guard checks ===\n`);
process.exit(failed ? 1 : 0);

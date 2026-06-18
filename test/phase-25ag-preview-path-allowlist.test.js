/**
 * Phase 25AG — Preview path allowlist (wrong-file freeze repair).
 *
 * The right-side viewer must only ever preview files that live inside the
 * canonical solicitations package root under userData. This test exercises
 * the pure guard the main-process IPC handler is built on, plus asserts the
 * handler wiring in main.js.
 *
 * Run:  node test/phase-25ag-preview-path-allowlist.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const guard = require(path.join(ROOT, 'services/govcon/solicitation-preview-guard.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AG — Preview path allowlist ===\n');

const USERDATA = path.join(os.tmpdir(), 'sd-25ag-userdata');
const PKG_ROOT = guard.solicitationsRoot(USERDATA);

test('accepts a file under userData/govcon/solicitations', () => {
  const target = path.join(PKG_ROOT, 'NOTICE123', 'attachments', 'rfp.txt');
  const r = guard.assertSafePreviewRequest({ filePath: target, root: PKG_ROOT });
  assert.ok(r.ok, 'a real package file must be accepted: ' + JSON.stringify(r));
  assert.strictEqual(r.extension, '.txt');
});

test('rejects the repo sourcedeck.html', () => {
  const r = guard.assertSafePreviewRequest({ filePath: path.join(ROOT, 'sourcedeck.html'), root: PKG_ROOT });
  assert.ok(!r.ok, 'sourcedeck.html must be rejected');
  assert.strictEqual(r.reason, 'outside_package_root');
});

test('rejects the repo package.json', () => {
  const r = guard.assertSafePreviewRequest({ filePath: path.join(ROOT, 'package.json'), root: PKG_ROOT });
  assert.ok(!r.ok, 'repo package.json must be rejected');
});

test('rejects .env-like paths', () => {
  ['.env', '.env.local', '.env.production'].forEach(name => {
    const r = guard.assertSafePreviewRequest({ filePath: path.join(ROOT, name), root: PKG_ROOT });
    assert.ok(!r.ok, name + ' must be rejected');
  });
});

test('rejects remote URLs', () => {
  ['https://example.com/x.pdf', 'http://10.0.0.1/a.txt'].forEach(u => {
    const r = guard.assertSafePreviewRequest({ filePath: u, root: PKG_ROOT });
    assert.ok(!r.ok, u + ' must be rejected');
    assert.strictEqual(r.reason, 'remote_url');
  });
});

test('rejects file:// URLs', () => {
  const r = guard.assertSafePreviewRequest({ filePath: 'file:///etc/passwd', root: PKG_ROOT });
  assert.ok(!r.ok, 'file:// URL must be rejected');
  assert.ok(r.reason === 'file_url' || r.reason === 'remote_url');
});

test('rejects empty/missing path', () => {
  assert.ok(!guard.assertSafePreviewRequest({ filePath: '', root: PKG_ROOT }).ok);
  assert.ok(!guard.assertSafePreviewRequest({ filePath: null, root: PKG_ROOT }).ok);
});

test('rejects path traversal that escapes the root', () => {
  const escape = path.join(PKG_ROOT, 'NOTICE123', '..', '..', '..', 'sourcedeck.html');
  const r = guard.assertSafePreviewRequest({ filePath: escape, root: PKG_ROOT });
  assert.ok(!r.ok, 'traversal that lands outside root must be rejected');
});

test('rejects the package root directory itself (not a file path leaf)', () => {
  const r = guard.assertSafePreviewRequest({ filePath: PKG_ROOT, root: PKG_ROOT });
  assert.ok(!r.ok, 'the root itself is not a previewable file');
});

test('realpath containment helper rejects a symlink escape', () => {
  // realRoot/real file inside → allowed; realTarget outside → blocked.
  assert.ok(guard.isRealpathInsideRoot(PKG_ROOT, path.join(PKG_ROOT, 'N', 'a.txt')));
  assert.ok(!guard.isRealpathInsideRoot(PKG_ROOT, path.join(ROOT, 'sourcedeck.html')));
});

test('realpath escape is actually blocked end-to-end via a symlink', () => {
  // Build a package root with a symlink pointing at the repo sourcedeck.html.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ag-sym-'));
  const realRoot = guard.solicitationsRoot(base);
  const pkgDir = path.join(realRoot, 'NOTICE9');
  fs.mkdirSync(pkgDir, { recursive: true });
  const link = path.join(pkgDir, 'evil.txt');
  let symlinkWorked = true;
  try { fs.symlinkSync(path.join(ROOT, 'sourcedeck.html'), link); }
  catch (_) { symlinkWorked = false; }
  if (!symlinkWorked) { console.log('     (symlink unsupported on this platform — skipped)'); return; }
  // Lexical gate passes (link is inside root) …
  const gate = guard.assertSafePreviewRequest({ filePath: link, root: realRoot });
  assert.ok(gate.ok, 'symlink path lexically resolves inside root');
  // … but realpath of the link lands outside the root.
  const realTarget = fs.realpathSync(link);
  const realRootResolved = fs.realpathSync(realRoot);
  assert.ok(!guard.isRealpathInsideRoot(realRootResolved, realTarget),
    'realpath of the symlink must be detected as outside the package root');
});

test('main.js IPC handler enforces realpath + guard module', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert.ok(/ipcMain\.handle\('govcon:preview-package-file'/.test(main), 'preview IPC handler missing');
  assert.ok(/appApi\.govcon\.packages\.previewGuard/.test(main),
    'main.js must reach the guard via appApi (architecture boundary preserved)');
  // main.js must NOT import services/govcon/* directly (credential boundary).
  assert.ok(!/require\(['"]\.\/services\/govcon\//.test(main),
    'main.js must not import services/govcon/* directly');
  assert.ok(/fs\.promises\.realpath/.test(main), 'main.js must realpath-resolve before serving a preview');
  assert.ok(/isRealpathInsideRoot/.test(main), 'main.js must enforce realpath containment');
  assert.ok(/getPath\('userData'\)/.test(main), 'main.js must anchor the root at userData');
});

console.log('\n' + (failed ? '❌ ' + failed + ' failed, ' : '✅ ') + passed + ' passed\n');
process.exit(failed ? 1 : 0);

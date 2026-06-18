// Phase 25AG · Preview path allowlist
// ──────────────────────────────────────────────────────────────────────
// The preview handler must only serve files inside
// app.getPath('userData') + /govcon/solicitations. Everything else —
// the repo root, sourcedeck.html, package.json, .env, dist/, release/,
// node_modules/, remote URLs, and file:// URLs — must be refused.

const fs = require('fs');
const path = require('path');

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Preview path allowlist');

// ── Approved root is the canonical solicitations directory ──────────
assert(/path\.join\(app\.getPath\('userData'\), 'govcon', 'solicitations'\)/.test(mainSrc),
  'Approved root resolves to userData/govcon/solicitations');

// ── realpath is used to resolve both root and target ────────────────
assert(/fs\.promises\.realpath\(rootRaw\)/.test(mainSrc),
  'realpath is resolved on the approved root (symlink safety)');
assert(/fs\.promises\.realpath\(filePath\)/.test(mainSrc),
  'realpath is resolved on the requested file (symlink safety)');

// ── Allowlist check uses path.relative + ..-prefix rejection ────────
assert(/path\.relative\(approvedRoot, target\)/.test(mainSrc),
  'Allowlist uses path.relative(approvedRoot, target)');
assert(/rel\.startsWith\('\.\.'\)/.test(mainSrc),
  'Allowlist rejects paths whose relative form starts with ..');
assert(/path\.isAbsolute\(rel\)/.test(mainSrc),
  'Allowlist rejects paths whose relative form is absolute (different volume)');

// ── Remote URL / file:// scheme rejection happens BEFORE path resolution
assert(/\^\[a-z\]\[a-z0-9\+\.-\]\*:\\\/\\\//.test(mainSrc),
  'Remote URL-shaped inputs are refused with remote_url_refused');
assert(/reason: 'remote_url_refused'/.test(mainSrc),
  'remote_url_refused fallback reason is wired');

// ── no_file_path early-out remains ───────────────────────────────────
assert(/reason: 'no_file_path'/.test(mainSrc),
  'Empty filePath → no_file_path');

// ── invalid_file_path fallback wired ────────────────────────────────
assert(/reason: 'invalid_file_path'/.test(mainSrc),
  'invalid_file_path fallback reason is wired');

// ── file_unreadable / not_a_file / read_failed fallbacks are wired ──
['file_unreadable', 'not_a_file', 'read_failed'].forEach(reason => {
  assert(new RegExp("reason: '" + reason + "'").test(mainSrc),
    reason + ' fallback reason is wired');
});

// ── Renderer-side: only filePath is sent through previewPackageFile,
//    not a packageId/fileId/manifest URL ─────────────────────────────
const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
assert(/previewPackageFile\(\{ filePath:/.test(html),
  'Renderer only passes { filePath } to the preview IPC');
assert(!/previewPackageFile\(\{ url:|previewPackageFile\(\{ remoteUrl:/.test(html),
  'Renderer never passes a URL or remoteUrl to the preview IPC');

console.log(process.exitCode ? 'Phase 25AG · path allowlist: FAILED' : 'Phase 25AG · path allowlist: OK');

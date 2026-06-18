// Phase 25AG · Preview size limit
// ──────────────────────────────────────────────────────────────────────
// Two caps:
//   - MAX_BYTES (hard, 8 MB)         — never read past this; fallback too_large
//   - MAX_TEXT_PREVIEW_CHARS (200K) — truncate text for inline render
//
// This test pins both numbers and the truncation contract.

const fs = require('fs');
const path = require('path');

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · Preview size limit');

// ── Hard byte cap ───────────────────────────────────────────────────
const maxBytesMatch = mainSrc.match(/const MAX_BYTES = (\d+) \* 1024 \* 1024/);
assert(maxBytesMatch && parseInt(maxBytesMatch[1], 10) === 8,
  'MAX_BYTES = 8 MiB hard cap is in place (got ' + (maxBytesMatch && maxBytesMatch[1]) + ')');

// Files over hard cap → fallback too_large, no read, no payload.
assert(/if \(stat\.size > MAX_BYTES\)[\s\S]{0,300}reason: 'too_large'/.test(mainSrc),
  'Over-hard-cap files return fallback too_large');
assert(/if \(stat\.size > MAX_BYTES\)[\s\S]{0,300}canOpenLocalFile: true/.test(mainSrc),
  'too_large fallback includes canOpenLocalFile: true');
// Confirm we do NOT readFile when over the hard cap (the return must
// fire BEFORE any readFile call).
const handlerStart = mainSrc.indexOf("ipcMain.handle('govcon:preview-package-file'");
const handlerEnd = mainSrc.indexOf('});\n', handlerStart);
const handlerBody = mainSrc.slice(handlerStart, handlerEnd);
const overCapIdx = handlerBody.indexOf('if (stat.size > MAX_BYTES)');
const firstReadIdx = handlerBody.indexOf('fs.promises.readFile');
assert(overCapIdx > 0 && firstReadIdx > overCapIdx,
  'Over-hard-cap branch returns BEFORE any fs.readFile call');

// ── Soft text cap ───────────────────────────────────────────────────
const softMatch = mainSrc.match(/const MAX_TEXT_PREVIEW_CHARS = (\d+)/);
assert(softMatch, 'MAX_TEXT_PREVIEW_CHARS is defined');
const softCap = softMatch ? parseInt(softMatch[1], 10) : 0;
assert(softCap >= 100000 && softCap <= 250000,
  'MAX_TEXT_PREVIEW_CHARS is between 100K and 250K characters (got ' + softCap + ')');

// Truncated text payload contract:
//   - truncated: true
//   - text: raw.slice(0, MAX_TEXT_PREVIEW_CHARS)
//   - limitation: 'truncated_for_preview'
//   - message: explains
//   - charCount: full length (so the renderer can show original size)
['truncated', 'charCount', "limitation = 'truncated_for_preview'", "Preview truncated for performance"].forEach(s => {
  assert(mainSrc.indexOf(s) >= 0,
    'Truncated payload carries: ' + s);
});

console.log(process.exitCode ? 'Phase 25AG · size limit: FAILED' : 'Phase 25AG · size limit: OK');

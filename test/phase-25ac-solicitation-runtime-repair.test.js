/**
 * Phase 25AC — Solicitation runtime repair regression test.
 *
 * Covers the 7 scope items the user mission named (in scope order):
 *   1. [object Object] attachment labels are sanitized
 *      (urlLabel + inline extraction inside renderSourcePanel).
 *   2. The "Attachments listed by SAM.gov" block is hidden once a
 *      local solicitation package has been downloaded.
 *   3. The right-side in-app file preview pane scaffold exists
 *      (data-gc-ac-preview-pane / gcACPreviewFile wiring).
 *   4. The user can choose an external download location via the
 *      Save copy to… button (renderer + preload + IPC + main.js
 *      handler). The canonical SourceDeck userData package is
 *      explicitly NOT moved.
 *   5. Extraction is file-aware — unsupported / unreadable / corrupt
 *      files do NOT fail the whole package. Each per-file error is
 *      caught and surfaced as a `status: 'failed'` row + warning.
 *   6. DOCX extraction is documented as a future scaling item (no
 *      new native dep added). Asserted by the absence of a new
 *      DOCX-extracting native dep in package.json.
 *   7. Keyword false positives stay blocked — every visible keyword
 *      row must carry a verified match reason (via the Phase 25AA-
 *      TIGHTEN-2 `_samKeywordMatchReason` gate that this PR
 *      preserves).
 *
 * Static; never executes the renderer; never touches the network.
 *
 * Run:  node test/phase-25ac-solicitation-runtime-repair.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AC — Solicitation runtime repair ===\n');

// ───────────────── Item 1 — [object Object] attachment labels ─────────────────

test('item 1: urlLabel handles object-shaped resource links (no [object Object])', () => {
  // Extract urlLabel from the renderer and exercise it in a sandbox.
  // The function spans multiple lines after Phase 25AC; match until the
  // closing brace that ends the function (next blank line + `  function `).
  const m = HTML.match(/function urlLabel\(u\)\{[\s\S]*?\n  \}\n/);
  assert.ok(m, 'urlLabel function not found in renderer');
  const sandbox = { URL };
  vm.createContext(sandbox);
  vm.runInContext('var urlLabel; ' + m[0] + '; this.urlLabel = urlLabel;', sandbox);
  // String URL still works.
  assert.strictEqual(sandbox.urlLabel('https://example.gov/path/file.pdf'), 'file.pdf');
  // Object with explicit name field.
  assert.strictEqual(sandbox.urlLabel({ name: 'Attachment-A.pdf', href: 'https://example.gov/x' }), 'Attachment-A.pdf');
  // Object with url-only (label falls back to URL leaf).
  assert.strictEqual(sandbox.urlLabel({ href: 'https://example.gov/sol/intake.zip' }), 'intake.zip');
  // Empty object → empty string, NEVER "[object Object]".
  assert.strictEqual(sandbox.urlLabel({}), '');
  // Literal "[object Object]" string → empty.
  assert.strictEqual(sandbox.urlLabel('[object Object]'), '');
  // null / undefined → empty.
  assert.strictEqual(sandbox.urlLabel(null), '');
  assert.strictEqual(sandbox.urlLabel(undefined), '');
});

test('item 1: renderSourcePanel extracts safe href from object-shaped resource links', () => {
  // The Phase 25AC inline guard inside the SAM-listing loop pulls
  // u.href/url/link/uri when u is an object so the `imported` check and
  // downstream rendering never see [object Object].
  assert.ok(/Phase 25AC item 1 — extract the safe URL from object-shaped/.test(HTML),
    'Phase 25AC item 1 inline guard comment missing');
  assert.ok(/var uLink = \(u && typeof u === 'object'\) \? \(u\.href \|\| u\.url \|\| u\.link \|\| u\.uri \|\| ''\) : u;/.test(HTML),
    'safe-URL inline extraction missing inside SAM listing loop');
});

// ───────────────── Item 2 — Hide SAM listing once package exists ─────────────────

test('item 2: SAM attachment listing is hidden when a local package exists', () => {
  // The renderer wraps the "Attachments listed by SAM.gov" block in
  // `if (!sm.package)` so once a local package has been downloaded the
  // block is not rendered.
  assert.ok(/Phase 25AC item 2 — once the local solicitation package has been/.test(HTML),
    'Phase 25AC item 2 comment missing');
  // The wrapping condition is present.
  assert.ok(/if \(!sm\.package\) \{\s*\n\s*parts\.push\('<div data-gc-ac-sam-listing="true"/.test(HTML),
    'wrapper `if (!sm.package)` around the SAM listing block is missing');
  // The header copy is preserved (the user did not ask us to change copy).
  assert.ok(/Attachments listed by SAM\.gov \(/.test(HTML),
    'SAM listing header copy unexpectedly removed');
});

// ───────────────── Item 3 — In-app preview pane ─────────────────

test('item 3: right-side in-app file preview pane scaffold exists', () => {
  // The aside element with data-gc-ac-preview-pane is injected after the
  // package summary.
  assert.ok(/data-gc-ac-preview-pane="true"/.test(HTML),
    '<aside data-gc-ac-preview-pane="true"> scaffold missing');
  // The preview body container is present.
  assert.ok(/data-gc-ac-preview-body="true"/.test(HTML),
    '[data-gc-ac-preview-body] container missing');
  // The populator is exposed for the View action.
  assert.ok(/window\.gcACPreviewFile\s*=\s*function/.test(HTML),
    'window.gcACPreviewFile populator missing');
  // The existing View button now triggers the preview.
  assert.ok(/if \(typeof window\.gcACPreviewFile === 'function'\) window\.gcACPreviewFile\(id, idx\);/.test(HTML),
    'gcABViewAttachment must call gcACPreviewFile when defined');
});

// ───────────────── Item 4 — External save copy ─────────────────

test('item 4: renderer Save copy to… button + handler wiring', () => {
  assert.ok(/data-gc-ac-save-copy="true"/.test(HTML),
    'Save copy to… button (data-gc-ac-save-copy) missing in renderer');
  assert.ok(/onclick="gcACSaveLocalCopy\(/.test(HTML),
    'Save copy to… button must wire to gcACSaveLocalCopy()');
  assert.ok(/window\.gcACSaveLocalCopy\s*=\s*async function/.test(HTML),
    'window.gcACSaveLocalCopy renderer handler missing');
  assert.ok(/window\.sd\.govcon\.savePackageCopy/.test(HTML),
    'renderer handler must invoke window.sd.govcon.savePackageCopy through the credential boundary');
});

test('item 4: preload exposes savePackageCopy through the credential boundary', () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.ok(/savePackageCopy:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('govcon:save-package-copy', payload\)/.test(preload),
    'preload must expose savePackageCopy via govcon:save-package-copy');
});

test('item 4: main.js IPC handler refuses paths outside the canonical solicitations root', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert.ok(/ipcMain\.handle\('govcon:save-package-copy'/.test(main),
    'main.js must register the govcon:save-package-copy IPC handler');
  // Source-path is restricted to the canonical solicitations root.
  assert.ok(/govcon[\\\\\/]+solicitations/.test(main) || /'solicitations'/.test(main),
    'IPC handler must scope source path to the canonical solicitations root');
  // The handler must use showSaveDialog (so the user picks the destination),
  // not write to a fixed external path.
  assert.ok(/dialog\.showSaveDialog/.test(main),
    'IPC handler must use dialog.showSaveDialog');
  // Canonical package is NOT moved (handler returns canonicalPath unchanged).
  assert.ok(/canonicalPath:\s*target/.test(main),
    'IPC handler must surface the canonical package path unchanged in the response');
});

// ───────────────── Item 5 — File-aware extraction ─────────────────

test('item 5: extractSolicitationPackage wraps each file in try/catch (file-aware)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'services', 'govcon', 'solicitation-package-extract.js'), 'utf8');
  assert.ok(/Phase 25AC item 5 — file-aware extraction\./.test(src),
    'extraction module must carry the Phase 25AC item 5 comment marking the try/catch wrapper');
  // The per-file loop now uses try/catch with a failed-row fallback.
  assert.ok(/for \(const file of files\) \{\s*\n\s*try \{/.test(src),
    'extraction loop must wrap each file in try/catch');
  assert.ok(/extractionStatus: 'failed'/.test(src),
    'extraction module must emit `extractionStatus: \'failed\'` for caught errors');
  assert.ok(/Extraction error — file skipped/.test(src),
    'warnings line for failed file must explain the skip');
  // Warnings array distinguishes metadata-only vs failed.
  assert.ok(/extractionStatus === 'metadata-only'/.test(src),
    'warnings must surface metadata-only files');
  assert.ok(/extractionStatus === 'failed'/.test(src),
    'warnings must surface failed-extraction files');
});

// ───────────────── Item 6 — DOCX extraction policy ─────────────────

test('item 6: no new native dependency added for DOCX extraction (deferred)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  // Phase 25AC defers DOCX extraction; no new docx-extracting native
  // dep may sneak in under this PR.
  assert.ok(!deps['mammoth'], 'mammoth dep must NOT be added in this PR');
  assert.ok(!deps['docx'], 'docx dep must NOT be added in this PR');
  assert.ok(!deps['better-sqlite3'], 'better-sqlite3 must still NOT be a dep (Phase 25AA-TIGHTEN-2 honesty)');
});

// ───────────────── Item 7 — Keyword false-positive gate preserved ─────────────────

test('item 7: keyword filter still gates rows without a verified match reason', () => {
  // _samKeywordMatchReason and _samMatchesKeyword must still be exposed
  // (they are the gate Phase 25AA-TIGHTEN-2 introduced and this PR
  // preserves verbatim).
  assert.ok(/window\.gcSamKeywordMatchReason\s*=\s*_samKeywordMatchReason/.test(HTML),
    'window.gcSamKeywordMatchReason gate missing');
  assert.ok(/window\.gcSamMatchesKeyword\s*=\s*_samMatchesKeyword/.test(HTML),
    'window.gcSamMatchesKeyword gate missing');
  // _samMatchesKeyword delegates to _samKeywordMatchReason (verified-reason
  // gate). This is the line that makes item 7 enforceable.
  assert.ok(/return _samKeywordMatchReason\(r, keyword\) !== null;/.test(HTML),
    '_samMatchesKeyword must delegate to _samKeywordMatchReason so rows without a reason are hidden');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AC checks ===');
if (failed > 0) process.exit(1);

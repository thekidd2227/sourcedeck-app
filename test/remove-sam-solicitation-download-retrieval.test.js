'use strict';

// Eradication test — the automatic SAM.gov solicitation download /
// attachment-link-retrieval feature must be COMPLETELY gone from shipped
// production source (renderer + main + preload + api + services). This test
// scans the actual source text (so it catches comments, aliases, and no-op
// stubs — not just labels) and fails if any forbidden remnant survives. It
// also proves the manual upload + canonical-listing workflow is intact and that
// every inline renderer <script> still parses.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Collect shipped production source (never tests/docs/node_modules/dist) ──
function listJs(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJs(p));
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const PROD_FILES = [
  path.join(ROOT, 'sourcedeck.html'),
  path.join(ROOT, 'main.js'),
  path.join(ROOT, 'preload.js'),
  ...listJs(path.join(ROOT, 'api')),
  ...listJs(path.join(ROOT, 'services'))
];
const SOURCES = PROD_FILES.map(f => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }));
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

let passed = 0;
function check(label, cond) { assert.ok(cond, label); passed += 1; console.log('  ✓ ' + label); }

console.log('\n=== Eradicate SAM.gov download / attachment-link retrieval ===\n');

// ── 1. Forbidden remnants must NOT appear anywhere in production source ──
const FORBIDDEN = [
  'govcon:sam-fetch-notice', 'samFetchNotice', 'sam-notice-fetch', 'fetchNotice',
  'Download SAM.gov Package', 'Download Solicitation Package', 'Fetch SAM.gov Notice',
  'Extract Downloaded Solicitation', 'View Attachments', 'Refresh Source Details',
  'Send Package to Solicitation Center',
  'gcABDownloadPackage', 'gcTabSamDownloadPackage', 'gcW25ViewAttachments',
  'gcW25RefreshSource', 'gcW25SendToWorkspace', 'gcW25UseInWorkspace',
  'gcW25FetchDescription', 'gcW25OpenResource', 'gcW25ImportResource', 'gcW25OpenNotice',
  'gcExtractDownloadedSolicitation', 'gcABViewAttachment', 'gcABOpenLocalPackageFolder',
  'gcACSaveLocalCopy', 'gcABExtractAttachment',
  'packageManifest',
  // User-facing copy that tells the user SourceDeck downloads/fetches packages.
  'download a saved SAM.gov package', 'download a package', 'download its SAM.gov package',
  'Download a SAM.gov package', 'Download the solicitation package', 'downloaded package',
  're-download',
  'data-gc-find-action="download-package"', 'data-dash-start-action="download-package"',
  'data-gc-sam-fresh-action="download-package"',
  'data-gc-saved-action="fetch-notice"', 'data-gc-saved-action="extract-downloaded"',
  'data-gc-saved-action="view-attachments"', 'data-gc-saved-action="refresh-source"',
  'data-gc-saved-action="send-to-solicitation-center"'
];
const violations = [];
for (const tok of FORBIDDEN) {
  for (const s of SOURCES) {
    if (s.text.indexOf(tok) >= 0) violations.push(tok + '  →  ' + s.file);
  }
}
check('no forbidden download/retrieval remnant in production source\n     ' + (violations.join('\n     ') || '(none)'),
  violations.length === 0);

// ── 2. Backend retrieval wiring removed; api loads ──────────────────────
check('main.js: no govcon:sam-fetch-notice IPC handler', MAIN.indexOf("ipcMain.handle('govcon:sam-fetch-notice'") < 0);
check('preload.js: no samFetchNotice bridge', !/samFetchNotice\s*:/.test(PRELOAD));
check('services/govcon/sam-notice-fetch.js is deleted', !fs.existsSync(path.join(ROOT, 'services', 'govcon', 'sam-notice-fetch.js')));
check('api/index.js loads without the deleted service', (() => { delete require.cache[require.resolve('../api/index.js')]; require('../api/index.js'); return true; })());

// ── 3. No retired automatic-download function is left as an alias / no-op ──
const RETIRED_FNS = [
  'gcABDownloadPackage', 'gcTabSamDownloadPackage', 'gcW25ViewAttachments', 'gcW25RefreshSource',
  'gcW25SendToWorkspace', 'gcW25UseInWorkspace', 'gcW25OpenNotice', 'gcW25FetchDescription',
  'gcW25OpenResource', 'gcW25ImportResource', 'gcABViewAttachment', 'gcABOpenLocalPackageFolder',
  'gcACSaveLocalCopy', 'gcABExtractAttachment', 'gcExtractDownloadedSolicitation'
];
for (const fn of RETIRED_FNS) {
  check('retired function fully deleted (no definition): ' + fn,
    HTML.indexOf('window.' + fn + ' =') < 0 && HTML.indexOf('function ' + fn + '(') < 0);
}

// ── 4. Preserved: canonical-listing + manual upload + search + pursuits ──
check('Open Official SAM.gov Listing button exists', HTML.indexOf('Open Official SAM.gov Listing') >= 0);
check('gcOpenOfficialSamListing exists and is canonical-only', (() => {
  const i = HTML.indexOf('window.gcOpenOfficialSamListing = async function');
  if (i < 0) return false;
  const body = HTML.slice(i, i + 700);
  return /sam\.gov\/opp\/'\s*\+\s*encodeURIComponent\(noticeId\)/.test(body) && body.indexOf('samFetchNotice') < 0 && body.indexOf('resourceLinks') < 0;
})());
check('manual-upload label is exactly "Upload Solicitation Files"', HTML.indexOf('Upload Solicitation Files') >= 0);
check('gcUploadSolicitationFiles exists and uses the native picker', (() => {
  const i = HTML.indexOf('window.gcUploadSolicitationFiles = async function');
  if (i < 0) return false;
  return /selectAndExtractSolicitation/.test(HTML.slice(i, i + 1600));
})());
check('SAM.gov search IPC + bridge preserved', MAIN.indexOf("ipcMain.handle('govcon:sam-search'") >= 0 && /samSearch\s*:/.test(PRELOAD));
check('explicit Fetch Links bridge preserved as metadata-only path',
  MAIN.indexOf("ipcMain.handle('govcon:sam-fetch-links'") >= 0
  && /fetchLinks\s*:/.test(PRELOAD)
  && HTML.indexOf('data-gc-saved-action="fetch-links"') >= 0
  && HTML.indexOf('No files downloaded') >= 0);
check('saved pursuits preserved (View Details / Mark Pursue / Unpursue / Archive / Delete)',
  /gcW25ViewDetails/.test(HTML) && /gcTabSamMarkPursue/.test(HTML) && /gcW25Unpursue/.test(HTML) && /gcTabSamArchive/.test(HTML) && /gcW25DeleteSavedPursuit/.test(HTML));
check('open-external-safe + select-and-extract IPC/bridge preserved',
  MAIN.indexOf("ipcMain.handle('govcon:open-external-safe'") >= 0
  && MAIN.indexOf("ipcMain.handle('govcon:select-and-extract-solicitation'") >= 0
  && /openExternalSafe\s*:/.test(PRELOAD) && /selectAndExtractSolicitation\s*:/.test(PRELOAD));
check('five-document upload limit remains', /maxSolicitationDocuments:\s*5/.test(PRELOAD));
check('local import + extraction services preserved', fs.existsSync(path.join(ROOT, 'services', 'govcon', 'solicitation-import.js')) && fs.existsSync(path.join(ROOT, 'services', 'govcon', 'solicitation-package-extract.js')));

// ── 5. Every inline renderer <script> still parses ──────────────────────
const blocks = HTML.match(/<script>[\s\S]*?<\/script>/g) || [];
let parsedBlocks = 0;
for (let i = 0; i < blocks.length; i++) {
  const code = blocks[i].replace(/^<script>/, '').replace(/<\/script>$/, '');
  try { new vm.Script(code, { filename: 'block-' + i + '.js' }); parsedBlocks += 1; }
  catch (e) { assert.fail('inline <script> block ' + i + ' failed to parse: ' + e.message); }
}
check('every inline renderer <script> parses (' + parsedBlocks + ' blocks)', parsedBlocks === blocks.length && parsedBlocks > 0);

console.log('\n=== PASS — ' + passed + ' checks ===\n');

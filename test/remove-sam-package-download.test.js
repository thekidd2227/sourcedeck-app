'use strict';

// Removal regression — the SAM.gov solicitation-package download / Solicitation
// Center extraction feature must not exist in production source. This reads the
// ACTUAL shipped files (not git history) and fails if any forbidden user-facing
// string, function, IPC channel, preload bridge, service, or persisted-state key
// reappears. It also proves the kept SAM workflow (search, saved pursuits,
// Open on SAM.gov) is intact.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const html = read('sourcedeck.html');
const main = read('main.js');
const preload = read('preload.js');
const api = read('api/index.js');
const ALL = html + '\n' + main + '\n' + preload + '\n' + api;

let pass = 0;
function ok(cond, msg) { assert.ok(cond, msg); pass += 1; console.log('  ✓ ' + msg); }

console.log('\n=== Removal regression — SAM solicitation-package download feature ===\n');

// ── Forbidden user-facing strings ──────────────────────────────────────
const FORBIDDEN_TEXT = [
  'Download SAM.gov Package',
  'Download Solicitation Package',
  'Send Package to Solicitation Center',
  'Extract Downloaded Solicitation',
  'Extract Requirements',
  'Solicitation Center',
  'Clear contaminated source cache'
];
for (const t of FORBIDDEN_TEXT) {
  ok(ALL.indexOf(t) < 0, 'no production reference to user-facing string: "' + t + '"');
}

// ── Forbidden executable identifiers ───────────────────────────────────
const FORBIDDEN_IDENT = [
  'gcABDownloadPackage', 'gcABExtractPackageToCenter', 'gcExtractDownloadedSolicitation',
  'gcSolLoadExtractionResult', 'gcSolExtract', 'gcSolExplainPlainEnglish', 'mapPackageExtraction',
  'renderSourcePanel', 'gcW25SendToWorkspace', 'gcW25RenderWorkspaceSource', 'gcW25CollectSourceText',
  'sdClearSourceCache', 'gcCaptureSolicitationPlaceholder', 'gcTabSamDownloadPackage',
  'sd-right-file-viewer', 'buildSampleSolWorkspace'
];
for (const id of FORBIDDEN_IDENT) {
  ok(ALL.indexOf(id) < 0, 'no production reference to identifier: ' + id);
}

// ── Forbidden IPC channels (both sides) ────────────────────────────────
const FORBIDDEN_IPC = [
  'govcon:download-solicitation-package', 'govcon:extract-solicitation-package',
  'govcon:validate-package-files', 'govcon:preview-package-file', 'govcon:explain-solicitation-package',
  'govcon:select-and-extract-solicitation', 'govcon:sam-fetch-notice', 'govcon:open-external-safe',
  'govcon:save-package-copy', 'govcon:open-solicitation-package-folder'
];
for (const ch of FORBIDDEN_IPC) {
  ok(main.indexOf(ch) < 0, 'main.js: no IPC handler for ' + ch);
  ok(preload.indexOf(ch) < 0, 'preload.js: no IPC bridge for ' + ch);
}

// ── Forbidden preload bridges + api surfaces ───────────────────────────
for (const m of ['selectAndExtractSolicitation', 'samFetchNotice', 'openExternalSafe']) {
  ok(preload.indexOf(m) < 0, 'preload.js: bridge "' + m + '" removed');
}
ok(api.indexOf('solicitationImport') < 0 && api.indexOf('fetchNotice') < 0, 'api/index.js: package/notice surfaces removed');

// ── Deleted services must not exist on disk ────────────────────────────
const GONE = [
  'services/govcon/solicitation-package-extract.js', 'services/govcon/solicitation-file-utils.js',
  'services/govcon/solicitation-import.js', 'services/govcon/sam-body-classifier.js',
  'services/govcon/package-file-validator.js', 'services/govcon/sam-notice-fetch.js',
  'services/govcon/sam-package-download.js', 'services/govcon/sam-source-fetch.js'
];
for (const f of GONE) {
  ok(!fs.existsSync(path.join(ROOT, f)), 'service file deleted: ' + f);
}

// ── Persisted-state keys for the feature must not be written/read ──────
for (const k of ['sd.govcon.solWorkspace.v1', 'sd.govcon.sourceMaterials.v1', 'sd.govcon.sourceMaterialQuarantine.v1']) {
  // Allowed only inside the one-time removal migration's REMOVE list.
  const occurrences = html.split(k).length - 1;
  const migrationHas = html.indexOf("'" + k + "'") >= 0 && html.indexOf('solPackageRemoval') >= 0;
  ok(occurrences === 0 || migrationHas, 'state key only referenced by the removal migration (if at all): ' + k);
}
ok(html.indexOf('sd.govcon.solPackageRemoval.v1') >= 0, 'one-time removal migration is present');

// ── Kept workflow is intact ────────────────────────────────────────────
ok(main.indexOf("ipcMain.handle('govcon:sam-search'") >= 0, 'KEPT: SAM.gov search IPC');
ok(main.indexOf("ipcMain.handle('open-external'") >= 0, 'KEPT: open-external IPC (Open on SAM.gov)');
ok(main.indexOf("ipcMain.handle('govcon:opportunities-upsert'") >= 0, 'KEPT: saved pursuits (opportunities) IPC');
ok(html.indexOf('window.gcOpenExternal') >= 0, 'KEPT: gcOpenExternal helper');
ok(html.indexOf('window.gcSavedOpenOnSam') >= 0, 'KEPT: Open on SAM.gov for saved pursuits');
ok(/gcTabSearchSam/.test(html), 'KEPT: SAM search renderer');
for (const tab of ['find-opportunities', 'saved-pursuits', 'vendors', 'pricing']) {
  ok(html.indexOf('data-gc-tab="' + tab + '"') >= 0, 'KEPT: GovCon sub-tab ' + tab);
}
ok(html.indexOf('data-gc-tab="solicitation"') < 0, 'REMOVED: Solicitation Center sub-tab');

// ── Every inline <script> block still parses (no ReferenceError on boot) ─
const scripts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let mm;
while ((mm = re.exec(html))) { if (mm[1].trim()) scripts.push(mm[1]); }
let parsed = 0;
for (const src of scripts) { new vm.Script(src); parsed += 1; }
ok(parsed === scripts.length && parsed > 5, 'all ' + parsed + ' inline <script> blocks parse');

console.log('\nAll removal-regression assertions passed (' + pass + ' checks).\n');

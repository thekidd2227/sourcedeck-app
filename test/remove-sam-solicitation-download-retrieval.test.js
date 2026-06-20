'use strict';

// Removal phase — permanently remove the automatic SAM.gov solicitation
// download / attachment-link-retrieval feature, while preserving SAM.gov
// search, saved pursuits, Open Official SAM.gov Listing (canonical page only),
// and manual local file upload + extraction.
//
// Proves:
//   1. No automatic retrieval remains in the backend (IPC / preload / api /
//      service) — govcon:sam-fetch-notice, samFetchNotice, fetchNotice, and
//      services/govcon/sam-notice-fetch.js are gone.
//   2. No download/fetch/extract-downloaded/send-package buttons remain in the
//      renderer, and no user-facing button label uses Download/Fetch/Downloaded.
//   3. Open Official SAM.gov Listing exists and opens ONLY the canonical page
//      (no samFetchNotice, no resource-link retrieval).
//   4. Manual upload is preserved and labeled exactly "Upload Solicitation
//      Files"; the local picker + extraction service stay wired.
//   5. Preserved surfaces remain: SAM.gov search, open-external-safe,
//      select-and-extract-solicitation, importAndExtract.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const preloadJs = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
const apiJs = fs.readFileSync(path.join(ROOT, 'api', 'index.js'), 'utf8');

let passed = 0;
function check(label, cond) { assert.ok(cond, label); passed += 1; console.log('  ✓ ' + label); }

function extractFn(source, anchor) {
  const start = source.indexOf(anchor);
  assert(start >= 0, 'function not found: ' + anchor);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', esc = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return source.slice(start, source.indexOf(';', i) + 1); }
  }
  throw new Error('unterminated: ' + anchor);
}

console.log('\n=== Removal — SAM.gov solicitation download / attachment retrieval ===\n');

// ── 1. Backend retrieval removed ───────────────────────────────────────
check('1a. main.js has no govcon:sam-fetch-notice IPC handler', mainJs.indexOf("ipcMain.handle('govcon:sam-fetch-notice'") < 0);
check('1b. preload.js exposes no samFetchNotice bridge', !/samFetchNotice\s*:/.test(preloadJs));
check('1c. api/index.js exposes no sam.fetchNotice', !/fetchNotice\s*:/.test(apiJs) && apiJs.indexOf("require('../services/govcon/sam-notice-fetch')") < 0);
check('1d. sam-notice-fetch.js service is deleted', !fs.existsSync(path.join(ROOT, 'services', 'govcon', 'sam-notice-fetch.js')));
check('1e. renderer never calls samFetchNotice', html.indexOf('samFetchNotice') < 0);

// ── 2. Renderer download/fetch buttons removed ─────────────────────────
check('2a. no "Download Solicitation Package" / "Download SAM.gov Package" buttons',
  html.indexOf('Download Solicitation Package') < 0 && html.indexOf('Download SAM.gov Package') < 0);
check('2b. no "Fetch SAM.gov Notice" button', html.indexOf('Fetch SAM.gov Notice') < 0);
check('2c. no "Extract Downloaded Solicitation" button', html.indexOf('Extract Downloaded Solicitation') < 0);
check('2d. no "Send Package to Solicitation Center" button', html.indexOf('Send Package to Solicitation Center') < 0);
check('2e. removed data-actions are gone',
  !/data-(?:dash-start|gc-find|gc-sam-fresh)-action="download-package"/.test(html)
  && !/data-gc-saved-action="(?:fetch-notice|extract-downloaded|send-to-solicitation-center|view-attachments|refresh-source)"/.test(html));

// User-facing button labels must not use the forbidden words.
const buttonLabels = (html.match(/>[^<>]*<\/button>/g) || []).map(s => s.slice(1, -9));
const forbidden = /\b(Download|Fetch|Downloaded)\b/;
const offending = buttonLabels.filter(l => forbidden.test(l) && /(SAM|Solicitation|Package|Notice|Attachment)/i.test(l));
check('2f. no manual/solicitation button label uses Download/Fetch/Downloaded', offending.length === 0);

// ── 3. Open Official SAM.gov Listing is canonical-only ─────────────────
check('3a. Open Official SAM.gov Listing button exists', html.indexOf('Open Official SAM.gov Listing') >= 0);
const openFn = extractFn(html, 'window.gcOpenOfficialSamListing = async function(id)');
check('3b. opens canonical sam.gov/opp/<id>/view', /sam\.gov\/opp\/'\s*\+\s*encodeURIComponent\(noticeId\)/.test(openFn));
check('3c. performs NO retrieval (no samFetchNotice, no resourceLinks)', !/samFetchNotice/.test(openFn) && !/resourceLinks/.test(openFn));
check('3d. routes through the safe external opener', /gcOpenExternal/.test(openFn));

// ── 4. Manual upload preserved + exact label ───────────────────────────
check('4a. manual-upload label is exactly "Upload Solicitation Files"', html.indexOf('Upload Solicitation Files') >= 0);
check('4b. upload handler gcUploadSolicitationFiles exists', /window\.gcUploadSolicitationFiles\s*=\s*async function/.test(html));
const uploadFn = extractFn(html, 'window.gcUploadSolicitationFiles = async function(id)');
check('4c. upload uses the native local picker (selectAndExtractSolicitation)', /selectAndExtractSolicitation/.test(uploadFn));

// ── 5. Preserved surfaces remain ───────────────────────────────────────
check('5a. SAM.gov search IPC preserved', mainJs.indexOf("ipcMain.handle('govcon:sam-search'") >= 0 && /samSearch\s*:/.test(preloadJs));
check('5b. open-external-safe IPC + bridge preserved', mainJs.indexOf("ipcMain.handle('govcon:open-external-safe'") >= 0 && /openExternalSafe\s*:/.test(preloadJs));
check('5c. select-and-extract-solicitation IPC + bridge preserved',
  mainJs.indexOf("ipcMain.handle('govcon:select-and-extract-solicitation'") >= 0 && /selectAndExtractSolicitation\s*:/.test(preloadJs));
check('5d. local import + extraction service preserved',
  fs.existsSync(path.join(ROOT, 'services', 'govcon', 'solicitation-import.js'))
  && fs.existsSync(path.join(ROOT, 'services', 'govcon', 'solicitation-package-extract.js'))
  && /importAndExtract/.test(apiJs));
check('5e. api still loads with the retrieval service removed', (() => { delete require.cache[require.resolve('../api/index.js')]; require('../api/index.js'); return true; })());

console.log('\nAll removal assertions passed (' + passed + ' checks).\n');

/**
 * Phase 25Y — Open SAM.gov Notice / View Source works + safe fallbacks.
 * Run:  node test/phase-25y-sam-source-open.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
// Phase 2: IPC handlers moved to app/main/ipc/register-feature-ipc.js.
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(ROOT, 'app/main/ipc/register-feature-ipc.js'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — SAM source open ===\n');

test('robust external opener exists with IPC → window.open → Copy Link', () => {
  assert.ok(/window\.gcOpenExternal = async function/.test(HTML), 'gcOpenExternal present');
  const fn = HTML.slice(HTML.indexOf('window.gcOpenExternal = async function'), HTML.indexOf('window.gcOpenExternal = async function') + 1400);
  assert.ok(/window\.sd\.openExternal/.test(fn), 'prefers openExternal bridge');
  assert.ok(/window\.open\(/.test(fn), 'falls back to window.open');
  assert.ok(/clipboard\.writeText/.test(fn), 'falls back to Copy Link');
  assert.ok(/Opening /.test(fn), 'shows opening status');
});

test('openExternal IPC bridge is wired (preload + main) and refuses key URLs', () => {
  assert.ok(/openExternal:\s*\(url\)\s*=>\s*ipcRenderer\.invoke\('open-external'/.test(PRELOAD), 'preload bridge present');
  assert.ok(/ipcMain\.handle\('open-external'/.test(MAIN), 'main handler present');
  assert.ok(/refused_credential_url/.test(MAIN), 'main refuses credential URLs');
  assert.ok(/shell\.openExternal/.test(MAIN), 'uses shell.openExternal');
});

test('Open Official SAM.gov Listing on saved pursuits + search rows; no download/fetch retrieval', () => {
  // Removal phase — automatic notice/package/attachment retrieval is gone. Find
  // Opportunities/Saved Pursuits are discovery-only: canonical browser-open plus
  // metadata-only Fetch Links. Local upload is owned by Solicitation Center.
  assert.ok(/gcOpenOfficialSamListing\(/.test(HTML), 'saved pursuit Open Official SAM.gov Listing action');
  assert.ok(/gcTabSamOpenSource\(/.test(HTML), 'search row open-listing');
  assert.ok(!/data-gc-saved-action="upload-solicitation-files"|data-gc-extract-btn/.test(HTML), 'no upload action in discovery surfaces');
  assert.ok(!/Open in SAM\.gov|Open SAM\.gov Notice|Fetch SAM\.gov Notice|Download SAM\.gov Package|Download Solicitation Package|Extract Downloaded Solicitation|Send Package to Solicitation/.test(HTML),
    'no download/fetch/extract-downloaded/send-package buttons remain');
});

test('saved pursuit open handlers are id-keyed; upload handler is Solicitation Center-owned', () => {
  assert.ok(!/onclick="if\(o\.sourceUrl\)/.test(HTML), 'no out-of-scope o reference');
  assert.ok(/gcOpenOfficialSamListing\(\\?'/.test(HTML) || /gcOpenOfficialSamListing\('/.test(HTML), 'Open Listing handler takes an id');
  assert.ok(/window\.gcUploadSolicitationFiles = async function\(id, opts\)/.test(HTML), 'upload handler remains available to Solicitation Center');
});

test('canonical browser-open routes through gcOpenExternal (no silent fail)', () => {
  const openFn = HTML.slice(HTML.indexOf('window.gcOpenOfficialSamListing = async function'), HTML.indexOf('window.gcOpenOfficialSamListing = async function') + 900);
  assert.ok(/gcOpenExternal/.test(openFn), 'Open Listing uses robust opener');
});

test('no api_key-bearing URL is ever opened', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcOpenExternal = async function'), HTML.indexOf('window.gcOpenExternal = async function') + 1400);
  assert.ok(/api_key|apikey/.test(fn) && /Refused to open/.test(fn), 'refuses key-bearing URLs');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y sam-source-open checks ===\n`);
process.exit(failed ? 1 : 0);

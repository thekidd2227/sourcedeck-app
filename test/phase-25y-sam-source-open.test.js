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
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
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

test('single browser-open (Fetch) on saved pursuits + Open SAM.gov Source on search rows', () => {
  // Phase 25AN — the duplicate "Open SAM.gov Notice" button is removed. The
  // saved-pursuit row keeps one browser-open action (Fetch SAM.gov Notice →
  // gcABDownloadPackage) plus the local Extract action. The SAM SEARCH rows
  // still expose "Open SAM.gov Source" (a different surface).
  assert.ok(/gcABDownloadPackage\(/.test(HTML), 'saved pursuit Fetch SAM.gov Notice action');
  assert.ok(/gcExtractDownloadedSolicitation\(/.test(HTML), 'saved pursuit Extract Downloaded Solicitation action');
  assert.ok(/gcTabSamOpenSource\(/.test(HTML), 'search row open-source');
  assert.ok(!/Open in SAM\.gov|Open SAM\.gov Notice/.test(HTML), 'duplicate open-notice button removed');
});

test('saved pursuit Fetch / Extract handlers are id-keyed, not out-of-scope', () => {
  // The old bug: onclick="if(o.sourceUrl)..." referenced an out-of-scope `o`.
  assert.ok(!/onclick="if\(o\.sourceUrl\)/.test(HTML), 'no out-of-scope o reference');
  assert.ok(/gcABDownloadPackage\(\\?'/.test(HTML) || /gcABDownloadPackage\('/.test(HTML), 'Fetch handler takes an id');
  assert.ok(/gcExtractDownloadedSolicitation\(\\?'/.test(HTML) || /gcExtractDownloadedSolicitation\('/.test(HTML), 'Extract handler takes an id');
});

test('browser-open action routes through gcOpenExternal (no silent fail)', () => {
  // Fetch SAM.gov Notice (gcABDownloadPackage) is the single browser-open and
  // routes through the robust gcOpenExternal helper.
  const fetchFn = HTML.slice(HTML.indexOf('window.gcABDownloadPackage = async function'), HTML.indexOf('window.gcABDownloadPackage = async function') + 900);
  assert.ok(/gcOpenExternal/.test(fetchFn), 'Fetch uses robust opener');
});

test('no api_key-bearing URL is ever opened', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcOpenExternal = async function'), HTML.indexOf('window.gcOpenExternal = async function') + 1400);
  assert.ok(/api_key|apikey/.test(fn) && /Refused to open/.test(fn), 'refuses key-bearing URLs');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y sam-source-open checks ===\n`);
process.exit(failed ? 1 : 0);

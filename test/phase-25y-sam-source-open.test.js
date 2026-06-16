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

test('Open SAM.gov Notice exists on saved pursuits + search rows', () => {
  assert.ok(/gcW25OpenNotice\(/.test(HTML), 'saved pursuit open-notice');
  assert.ok(/gcTabSamOpenSource\(/.test(HTML), 'search row open-source');
  assert.ok(/Open SAM\.gov Notice/.test(HTML), 'Open SAM.gov Notice label');
});

test('saved pursuit View Source / open handler is id-keyed, not out-of-scope', () => {
  // The old bug: onclick="if(o.sourceUrl)..." referenced an out-of-scope `o`.
  assert.ok(!/onclick="if\(o\.sourceUrl\)/.test(HTML), 'no out-of-scope o reference');
  assert.ok(/gcW25OpenNotice\(\\?'/.test(HTML) || /gcW25OpenNotice\('/.test(HTML), 'open handler takes an id');
});

test('open handlers route through gcOpenExternal (no silent fail)', () => {
  const notice = HTML.slice(HTML.indexOf('window.gcW25OpenNotice = async function'), HTML.indexOf('window.gcW25OpenNotice = async function') + 700);
  assert.ok(/gcOpenExternal/.test(notice), 'open notice uses robust opener');
});

test('no api_key-bearing URL is ever opened', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcOpenExternal = async function'), HTML.indexOf('window.gcOpenExternal = async function') + 1400);
  assert.ok(/api_key|apikey/.test(fn) && /Refused to open/.test(fn), 'refuses key-bearing URLs');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y sam-source-open checks ===\n`);
process.exit(failed ? 1 : 0);

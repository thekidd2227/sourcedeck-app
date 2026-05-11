/**
 * Renderer Airtable migration tests.
 *
 * Static guarantees that prove the renderer no longer talks to
 * api.airtable.com directly and no longer builds a Bearer header
 * with the Airtable PAT. All scans run against the shipped
 * sourcedeck.html.
 *
 * Run:  node test/renderer-airtable-migration.test.js
 */

'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}
async function asyncTest(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

console.log('\n── renderer Airtable surface ──');

test('no direct fetch(\'https://api.airtable.com/...\') calls remain', () => {
  const re = /\bfetch\s*\(\s*['"`]https:\/\/api\.airtable\.com/;
  const hits = HTML.match(new RegExp(re.source, 'g')) || [];
  assert.strictEqual(hits.length, 0,
    `expected 0 direct airtable fetch sites, found ${hits.length}`);
});

test('no Airtable PAT Bearer header build remains in renderer', () => {
  // Match: 'Bearer '+AT_PAT  OR  Bearer ${AT_PAT}  OR  Authorization: Bearer ' + AT_PAT
  const re = /['"`]Bearer\s+['"`]?\s*\+\s*AT_PAT|Bearer\s*\$\{\s*AT_PAT\s*\}/;
  const hits = HTML.match(new RegExp(re.source, 'g')) || [];
  assert.strictEqual(hits.length, 0,
    `expected 0 AT_PAT Bearer-header builds, found ${hits.length}`);
});

test('every renderer Airtable URL is now wrapped by sdAirtableFetch', () => {
  // Find every line that mentions api.airtable.com. The URL must be
  // either inline-fetched via sdAirtableFetch on the same line, OR
  // assigned to a variable that is dispatched via sdAirtableFetch
  // within the next ~10 lines.
  const lines = HTML.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/https?:\/\/api\.airtable\.com/.test(line)) continue;
    // Skip helper internals + comments.
    if (/_sdAirtableFakeResponse|_sdAirtableQueryFromUrl|api\.airtable\.com routes through/.test(line)) continue;
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    // Inline call?
    if (/sdAirtableFetch\s*\(|sdAirtableList\s*\(|sdAirtableCreate\s*\(|sdAirtableUpdate\s*\(|sdAirtableDelete\s*\(/.test(line)) continue;
    // URL-assignment? Look for sdAirtableFetch dispatch within the next 10 lines.
    let dispatched = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 11); j++) {
      if (/sdAirtableFetch\s*\(/.test(lines[j])) { dispatched = true; break; }
      // If we hit a `fetch(url` or another non-airtable assignment, stop.
      if (/\bfetch\s*\(/.test(lines[j]) && !/sdAirtableFetch/.test(lines[j])) break;
    }
    assert.ok(dispatched,
      `line ${i + 1} references api.airtable.com without a sdAirtableFetch dispatch within 10 lines:\n  ${line.trim().slice(0, 200)}`);
  }
});

test('sdAirtableFetch helper exists with the expected surface', () => {
  assert.ok(/function\s+sdAirtableFetch\s*\(\s*url\s*,\s*opts/.test(HTML),
    'sdAirtableFetch(url, opts) helper missing');
  assert.ok(/async function sdAirtableList/.test(HTML), 'sdAirtableList missing');
  assert.ok(/async function sdAirtableCreate/.test(HTML), 'sdAirtableCreate missing');
  assert.ok(/async function sdAirtableUpdate/.test(HTML), 'sdAirtableUpdate missing');
  assert.ok(/async function sdAirtableDelete/.test(HTML), 'sdAirtableDelete missing');
});

test('helper dispatches to window.sd.airtable.* (not direct fetch)', () => {
  // Within the helper's body, only window.sd.airtable.* calls exist
  // for the IPC dispatch. We don't allow any literal "fetch(" inside it.
  const helperStart = HTML.indexOf('async function sdAirtableFetch');
  assert.ok(helperStart > -1, 'helper not found');
  // Find matching closing brace by walking forward.
  let depth = 0, i = helperStart;
  while (i < HTML.length) {
    const ch = HTML[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  const body = HTML.slice(helperStart, i + 1);
  assert.ok(/window\.sd\.airtable\.listRecords/.test(body));
  assert.ok(/window\.sd\.airtable\.createRecord/.test(body));
  assert.ok(/window\.sd\.airtable\.updateRecord/.test(body));
  assert.ok(/window\.sd\.airtable\.deleteRecord/.test(body));
  assert.ok(!/\bfetch\s*\(/.test(body), 'helper body must not call raw fetch()');
});

test('AT_PAT presence flag is populated from credential adapter, not localStorage', () => {
  assert.ok(/window\.sd\.credentials\.status/.test(HTML),
    'renderer must read credential presence from window.sd.credentials.status');
  assert.ok(/AT_PAT\s*=\s*['"]<airtable_credential_present>['"]/.test(HTML),
    'AT_PAT must be set to a presence marker, not a real value');
  assert.ok(!/localStorage\.getItem\(['"]lcc_AT_PAT_OVERRIDE['"]\)\s*\|\|\s*['"]['"]/.test(HTML),
    'lcc_AT_PAT_OVERRIDE fallback must be removed (now goes through credentials)');
});

test('Settings saveSettings() routes Airtable PAT to safe credentials, not localStorage', () => {
  // Look for the saveSettings function block; assert it calls
  // window.sd.credentials.set('airtable', ...) and explicitly skips
  // writing AT_PAT_OVERRIDE to localStorage.
  const ss = HTML.match(/async function saveSettings\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ss, 'saveSettings function not found');
  const body = ss[0];
  assert.ok(/window\.sd\.credentials\.set\(\s*['"]airtable['"]/.test(body),
    'saveSettings must call window.sd.credentials.set("airtable", ...)');
  // Must NOT write lcc_AT_PAT_OVERRIDE to localStorage.
  assert.ok(!/localStorage\.setItem\(\s*['"]lcc_AT_PAT_OVERRIDE['"]/.test(body),
    'saveSettings must not write lcc_AT_PAT_OVERRIDE to localStorage');
});

test('one-time migration: legacy lcc_AT_PAT_OVERRIDE is moved to safeStorage and cleared', () => {
  const ls = HTML.match(/function loadSettings\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ls, 'loadSettings function not found');
  const body = ls[0];
  assert.ok(/legacyAt\s*=\s*localStorage\.getItem\('lcc_AT_PAT_OVERRIDE'\)/.test(body),
    'loadSettings must read any legacy lcc_AT_PAT_OVERRIDE for one-time migration');
  assert.ok(/localStorage\.removeItem\('lcc_AT_PAT_OVERRIDE'\)/.test(body),
    'loadSettings must remove lcc_AT_PAT_OVERRIDE after migrating to safeStorage');
});

console.log('\n── boundary surface (regression check) ──');

test('preload still exposes window.sd.airtable.{list,create,update,delete}', () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  for (const k of ['airtable:list', 'airtable:create', 'airtable:update', 'airtable:delete']) {
    assert.ok(preload.includes(k), `preload missing channel ${k}`);
  }
  for (const k of ['listRecords', 'createRecord', 'updateRecord', 'deleteRecord']) {
    assert.ok(preload.includes(k), `preload missing window.sd.airtable.${k}`);
  }
});

test('main.js airtable handlers route through appApi (regression)', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  for (const ch of ['airtable:list', 'airtable:create', 'airtable:update', 'airtable:delete']) {
    const re = new RegExp(`ipcMain\\.handle\\('${ch.replace(/[\.\-:]/g, '\\$&')}'\\s*,[\\s\\S]{0,200}?appApi\\.airtable\\.`);
    assert.ok(re.test(main), `IPC handler "${ch}" must route through appApi.airtable.*`);
  }
});

console.log('\n── end-to-end airtable wrapper still works ──');

asyncTest('airtable service: missing credential returns no_credential gracefully', async () => {
  const credSurface = require('../services/settings/credentials');
  const { createAirtableService } = require('../services/airtable');
  const credentials = credSurface.createMemoryCredentialStore();
  const svc = createAirtableService({
    credentials,
    fetchFn: async () => { throw new Error('should not be called'); }
  });
  const r = await svc.listRecords({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'no_credential');
});

asyncTest('airtable service: list/create/update/delete preserve expected response shape', async () => {
  const credSurface = require('../services/settings/credentials');
  const { createAirtableService } = require('../services/airtable');
  const credentials = credSurface.createMemoryCredentialStore();
  await credentials.set('airtable', 'patSYNTHETIC_TEST_VALUE');

  const responses = {
    GET:    { ok: true, status: 200, json: async () => ({ records: [{ id: 'rec1', fields: { Name: 'A' } }] }) },
    POST:   { ok: true, status: 200, json: async () => ({ records: [{ id: 'rec2', createdTime: 'now', fields: {} }] }) },
    PATCH:  { ok: true, status: 200, json: async () => ({ id: 'rec3', fields: { x: 1 } }) },
    DELETE: { ok: true, status: 200, json: async () => ({ id: 'rec4', deleted: true }) }
  };
  const svc = createAirtableService({
    credentials,
    fetchFn: async (_url, opts) => responses[(opts && opts.method) || 'GET']
  });
  const list   = await svc.listRecords({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789' });
  const create = await svc.createRecord({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789', fields: { x: 1 } });
  const upd    = await svc.updateRecord({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789', recordId: 'rec01234567890123', fields: { y: 2 } });
  const del    = await svc.deleteRecord({ baseId: 'app1234567890123456', tableRef: 'tblOK0123456789', recordId: 'rec01234567890123' });
  assert.ok(list.ok && Array.isArray(list.body.records));
  assert.ok(create.ok && Array.isArray(create.body.records));
  assert.ok(upd.ok && upd.body.id === 'rec3');
  assert.ok(del.ok && del.body.deleted === true);
});

// ── runner ──────────────────────────────────────────────────────────
(async () => {
  await new Promise(r => setTimeout(r, 50));
  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} renderer-airtable-migration tests ===`
    : `=== FAIL — ${failed}/${total} renderer-airtable-migration tests failed ===`);
  if (failed > 0) process.exit(1);
})();

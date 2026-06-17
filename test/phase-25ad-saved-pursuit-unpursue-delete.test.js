/**
 * Phase 25AD — Saved Pursuit lifecycle: Unpursue + Delete Saved Pursuit.
 *
 * Confirms:
 *   - Row renders Unpursue + Delete buttons.
 *   - Renderer wires both to the credential boundary.
 *   - preload + main.js expose `govcon:opportunities-remove`.
 *   - opportunity-records.remove(id) removes the matching row and
 *     leaves the rest of the store intact.
 *   - Delete asks for confirmation before invoking the IPC.
 *   - Delete copy explicitly states local package files are not removed.
 *
 * Run:  node test/phase-25ad-saved-pursuit-unpursue-delete.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AD — Unpursue + Delete Saved Pursuit ===\n');

// ───── Renderer ─────

test('saved pursuit row exposes the Unpursue button', () => {
  assert.ok(/data-gc-saved-action="unpursue"/.test(HTML),
    'Unpursue button (data-gc-saved-action="unpursue") missing');
  assert.ok(/onclick="gcW25Unpursue\(/.test(HTML),
    'Unpursue button must invoke gcW25Unpursue()');
});

test('saved pursuit row exposes the Delete Saved Pursuit button', () => {
  assert.ok(/data-gc-saved-action="delete"/.test(HTML),
    'Delete button (data-gc-saved-action="delete") missing');
  assert.ok(/onclick="gcW25DeleteSavedPursuit\(/.test(HTML),
    'Delete button must invoke gcW25DeleteSavedPursuit()');
});

test('gcW25Unpursue rewrites userStatus to "saved" through the boundary', () => {
  assert.ok(/window\.gcW25Unpursue = async function/.test(HTML),
    'window.gcW25Unpursue handler missing');
  assert.ok(/userStatus: 'saved'/.test(HTML),
    'Unpursue must set userStatus to "saved"');
  assert.ok(/window\.sd\.govcon\.opportunities\.upsert/.test(HTML),
    'Unpursue must persist through window.sd.govcon.opportunities.upsert');
});

test('gcW25DeleteSavedPursuit confirms, then routes through the credential boundary', () => {
  assert.ok(/window\.gcW25DeleteSavedPursuit = async function/.test(HTML),
    'window.gcW25DeleteSavedPursuit handler missing');
  // Confirmation prompt is shown before any IPC.
  assert.ok(/window\.confirm\(prompt\)/.test(HTML),
    'Delete must call window.confirm() before deleting');
  // Confirmation copy explicitly notes that local files stay.
  assert.ok(/Local downloaded package files will remain unless you also clear the package folder\./.test(HTML),
    'confirmation copy must state local package files are not removed');
  // The IPC call goes through window.sd.govcon.opportunities.remove.
  assert.ok(/window\.sd\.govcon\.opportunities\.remove/.test(HTML),
    'Delete must call window.sd.govcon.opportunities.remove');
  // Post-delete toast reiterates the file-safety contract.
  assert.ok(/Saved pursuit deleted\. Local package files were not removed\./.test(HTML),
    'post-delete toast must reiterate that local package files are not removed');
});

// ───── preload + main.js wiring ─────

test('preload exposes opportunities.remove through the credential boundary', () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.ok(/remove:\s*\(id\)\s*=>\s*ipcRenderer\.invoke\('govcon:opportunities-remove', id\)/.test(preload),
    'preload must expose opportunities.remove via govcon:opportunities-remove');
});

test('main.js registers the opportunities-remove IPC handler', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert.ok(/ipcMain\.handle\('govcon:opportunities-remove'/.test(main),
    'main.js must register govcon:opportunities-remove handler');
  assert.ok(/appApi\.govcon\.opportunities\.remove\(id\)/.test(main),
    'IPC handler must call appApi.govcon.opportunities.remove(id)');
});

// ───── opportunity-records.remove ─────

test('opportunity-records.remove(id) removes the matching row only', () => {
  const fakeStore = (() => {
    let bag = {};
    return {
      get: (k) => bag[k],
      set: (k, v) => { bag[k] = v; },
      _bag: () => bag
    };
  })();
  const svc = require(path.join(ROOT, 'services', 'govcon', 'opportunity-records.js'))
    .createOpportunityRecordService(fakeStore, () => 1700000000000);
  svc.upsert({ id: 'opp-a', title: 'A', userStatus: 'saved' });
  svc.upsert({ id: 'opp-b', title: 'B', userStatus: 'pursuing' });
  svc.upsert({ id: 'opp-c', title: 'C', userStatus: 'saved' });
  assert.strictEqual(svc.list().length, 3, 'pre-state: 3 rows');
  const res = svc.remove('opp-b');
  assert.ok(res && res.ok, 'remove must report ok');
  assert.strictEqual(res.removedId, 'opp-b', 'remove must report the removed id');
  const after = svc.list();
  assert.strictEqual(after.length, 2, 'post-state: 2 rows');
  assert.ok(after.find(r => r.id === 'opp-a'), 'opp-a still present');
  assert.ok(after.find(r => r.id === 'opp-c'), 'opp-c still present');
  assert.ok(!after.find(r => r.id === 'opp-b'), 'opp-b removed');
});

test('opportunity-records.remove(missingId) reports not_found and does not mutate', () => {
  const fakeStore = (() => {
    let bag = {};
    return { get: (k) => bag[k], set: (k, v) => { bag[k] = v; } };
  })();
  const svc = require(path.join(ROOT, 'services', 'govcon', 'opportunity-records.js'))
    .createOpportunityRecordService(fakeStore, () => 1700000000000);
  svc.upsert({ id: 'opp-x', title: 'X' });
  const res = svc.remove('does-not-exist');
  assert.ok(res && res.ok === false, 'remove must report ok:false');
  assert.strictEqual(res.reason, 'not_found', 'reason must be not_found');
  assert.strictEqual(svc.list().length, 1, 'store must be unchanged');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD Unpursue/Delete checks ===');
if (failed > 0) process.exit(1);

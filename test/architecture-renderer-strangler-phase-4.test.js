/**
 * Phase 4 — Renderer strangler, second extracted slice (Pilot Tracker).
 *
 * Phase 3 extracted the State & Local procurement slice. Phase 4 extracts the
 * Phase 25E.5 Pilot Tracker (a local-only, self-contained trial-tracking panel)
 * out of sourcedeck.html into a dedicated browser-safe module. This test locks
 * the second slice and the strangler invariants:
 *
 *   - the extracted module exists and HTML references it via <script src>;
 *   - HTML no longer contains the moved helper bodies;
 *   - the module attaches the same renderer-facing window.* surface
 *     (ptOnDayChange, ptSaveDebounced) and behaves identically;
 *   - persistence still goes through the window.sd.storeSet preload bridge
 *     (contract unchanged) with a localStorage fallback;
 *   - the renderer module imports no electron / IPC primitives;
 *   - main.js still registers zero ipcMain.handle.
 *
 * Run: node test/architecture-renderer-strangler-phase-4.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

const SLICE_REL = 'app/renderer/features/pilot-tracker/pilot-tracker.js';
const SLICE_ABS = path.join(ROOT, SLICE_REL);

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(() => { passed++; console.log('  ✅ ' + name); },
                    (e) => { failed++; console.log('  ❌ ' + name + ': ' + e.message); });
    }
    passed++; console.log('  ✅ ' + name);
    return Promise.resolve();
  } catch (e) {
    failed++; console.log('  ❌ ' + name + ': ' + e.message);
    return Promise.resolve();
  }
}

function makeEl(id) {
  return { id, value: '', textContent: '', style: {} };
}

// Boot the Pilot Tracker module the way the Electron renderer would, with a
// minimal DOM + storage harness. setTimeout runs synchronously so the boot
// and the debounced save are observable without real timers.
function loadSlice(opts = {}) {
  const ids = [
    'pt-day-select', 'pt-trial-day', 'pt-day-note', 'pt-setup-state', 'pt-setup-detail',
    'pt-issues-critical', 'pt-issues-high', 'pt-issues-medium', 'pt-issues-low',
    'pt-issue-count', 'pt-gng-select', 'pt-gng-score', 'pt-next-action'
  ];
  const els = {};
  ids.forEach((id) => { els[id] = makeEl(id); });
  const store = {};
  const localStore = Object.assign({}, opts.localStorage || {});
  const storeSetCalls = [];
  const ctx = {
    document: {
      readyState: 'complete',
      getElementById(id) { return els[id] || null; },
      addEventListener() {}
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
      setItem(k, v) { localStore[k] = String(v); }
    },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
    Promise, console, JSON, Number, String, parseInt, isNaN, Date
  };
  ctx.window = ctx;
  if (opts.withBridge) {
    ctx.sd = { storeGet() { return Promise.resolve(null); },
               storeSet(k, v) { storeSetCalls.push({ k, v }); return Promise.resolve(true); } };
    ctx.window.sd = ctx.sd;
  }
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SLICE_ABS, 'utf8'), ctx, { filename: SLICE_REL });
  return { ctx, els, localStore, storeSetCalls };
}

console.log('\n=== Phase 4 — Renderer strangler (Pilot Tracker slice) ===\n');

const tests = [];

tests.push(test('extracted module exists at the canonical path', () => {
  assert.ok(fs.existsSync(SLICE_ABS), SLICE_REL + ' must exist');
}));

tests.push(test('sourcedeck.html loads the module via a local <script src>', () => {
  assert.ok(HTML.includes('<script src="' + SLICE_REL + '"></script>'),
    'sourcedeck.html must reference the extracted module via <script src>');
}));

tests.push(test('sourcedeck.html no longer contains the moved helper bodies', () => {
  assert.ok(!/window\.ptOnDayChange\s*=\s*function/.test(HTML), 'ptOnDayChange body must not remain inline');
  assert.ok(!/window\.ptSaveDebounced\s*=\s*function/.test(HTML), 'ptSaveDebounced body must not remain inline');
  assert.ok(!/function\s+renderPilotTracker/.test(HTML), 'renderPilotTracker body must not remain inline');
  assert.ok(!/sd\.pilotTracker\.v1/.test(HTML), 'pilot tracker storage key must not remain inline in HTML');
}));

tests.push(test('Pilot Tracker markup + handlers remain in HTML (UI unchanged)', () => {
  assert.ok(/id="pt-day-select"[^>]*onchange="ptOnDayChange\(\)"/.test(HTML), 'pt-day-select must still call ptOnDayChange()');
  assert.ok(/oninput="ptSaveDebounced\(\)"/.test(HTML), 'pt inputs must still call ptSaveDebounced()');
  assert.ok(/id="pt-gng-select"/.test(HTML) && /id="pt-issue-count"/.test(HTML), 'pilot tracker pane ids must remain');
}));

tests.push(test('sourcedeck.html line count reflects the extraction (no re-inline)', () => {
  const lines = HTML.split('\n').length;
  assert.ok(lines < 23450, 'sourcedeck.html should be smaller after extraction, got ' + lines);
}));

tests.push(test('module attaches the renderer-facing window.* surface (names unchanged)', () => {
  const { ctx } = loadSlice();
  assert.strictEqual(typeof ctx.ptOnDayChange, 'function', 'ptOnDayChange must be exposed');
  assert.strictEqual(typeof ctx.ptSaveDebounced, 'function', 'ptSaveDebounced must be exposed');
}));

tests.push(test('ptOnDayChange updates trial day, clamps range, and persists (localStorage fallback)', () => {
  const { ctx, els, localStore } = loadSlice();
  els['pt-day-select'].value = '3';
  ctx.ptOnDayChange();
  assert.strictEqual(els['pt-trial-day'].textContent, 'Day 3', 'day KPI should reflect selection');
  const saved = JSON.parse(localStore['sd.pilotTracker.v1']);
  assert.strictEqual(saved.day, 3, 'state should persist day=3 to localStorage');

  els['pt-day-select'].value = '9'; // out of range
  ctx.ptOnDayChange();
  assert.strictEqual(JSON.parse(localStore['sd.pilotTracker.v1']).day, 0, 'out-of-range day should clamp to 0');
}));

tests.push(test('ptSaveDebounced persists issue counts and renders auto-forced STOP on open criticals', () => {
  const { ctx, els, localStore } = loadSlice();
  els['pt-issues-critical'].value = '2';
  els['pt-gng-select'].value = 'ready';
  ctx.ptSaveDebounced();
  const saved = JSON.parse(localStore['sd.pilotTracker.v1']);
  assert.strictEqual(saved.issuesCritical, 2, 'critical count should persist');
  assert.strictEqual(saved.gng, 'ready', 'gng selection should persist');
  assert.strictEqual(els['pt-issue-count'].textContent, '2', 'issue count KPI should total 2');
  assert.strictEqual(els['pt-gng-score'].textContent, 'STOP', 'open criticals must auto-force STOP');
}));

tests.push(test('persistence still uses the window.sd.storeSet preload bridge when present', () => {
  const { ctx, storeSetCalls } = loadSlice({ withBridge: true });
  ctx.ptOnDayChange(); // triggers save(), which calls window.sd.storeSet synchronously before awaiting
  assert.ok(storeSetCalls.length >= 1, 'save() must call window.sd.storeSet');
  assert.strictEqual(storeSetCalls[0].k, 'pilotTracker', 'bridge key must be unchanged ("pilotTracker")');
}));

tests.push(test('module loads prior state from localStorage on boot', async () => {
  const seed = JSON.stringify({ day: 5, issuesHigh: 1, gng: 'needs-fixes' });
  const { els } = loadSlice({ localStorage: { 'sd.pilotTracker.v1': seed } });
  // boot() runs load().then(render); load() is async, so render is queued on a
  // microtask. Flush pending microtasks before asserting the restored state.
  await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(els['pt-trial-day'].textContent, 'Day 5', 'boot should restore persisted day');
}));

tests.push(test('the renderer slice does not import electron or touch IPC directly', () => {
  const src = fs.readFileSync(SLICE_ABS, 'utf8');
  assert.ok(!/require\(\s*['"]electron['"]\s*\)/.test(src), 'must not require("electron")');
  assert.ok(!/from\s+['"]electron['"]/.test(src), 'must not import from electron');
  assert.ok(!/\bipcMain\b/.test(src), 'must not reference ipcMain');
  assert.ok(!/\bipcRenderer\b/.test(src), 'must not use ipcRenderer directly (use the preload sd.* bridge)');
}));

tests.push(test('main.js still registers zero IPC handlers (Phase 1/2 intact)', () => {
  const count = (MAIN.match(/ipcMain\.handle/g) || []).length;
  assert.strictEqual(count, 0, 'main.js must not regain ipcMain.handle bodies, found ' + count);
}));

Promise.all(tests).then(() => {
  console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 4 renderer strangler checks ===\n`);
  process.exit(failed ? 1 : 0);
});

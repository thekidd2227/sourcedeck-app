/**
 * Phase 5 — Renderer strangler, third extracted slice (GovCon section scroll).
 *
 * Phase 3 extracted State & Local procurement; Phase 4 extracted the Pilot
 * Tracker. Phase 5 extracts the Phase 25F GovCon section-navigation helper — a
 * pure-browser, network-free smooth-scroll/active-pill utility — out of
 * sourcedeck.html into a dedicated browser-safe module. This test locks the
 * third slice and the strangler invariants:
 *
 *   - the extracted module exists and HTML references it via <script src>;
 *   - HTML no longer contains the moved helper body;
 *   - the module attaches the same renderer-facing window.gcScrollTo global
 *     and behaves identically (preventDefault, smooth scroll, active-pill
 *     highlighting, missing-target no-op);
 *   - the renderer module imports no electron / IPC primitives;
 *   - main.js still registers zero ipcMain.handle;
 *   - the packaging guard pins the new module.
 *
 * Run: node test/architecture-renderer-strangler-phase-5.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const GUARD = fs.readFileSync(path.join(ROOT, 'test/architecture-packaging-runtime-modules.test.js'), 'utf8');

const SLICE_REL = 'app/renderer/features/navigation/section-scroll.js';
const SLICE_ABS = path.join(ROOT, SLICE_REL);

const ACTIVE_BG = 'rgba(176,138,60,0.10)';
const INACTIVE_BG = 'rgba(255,255,255,0.04)';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

function makePill(href) {
  return { _href: href, style: {}, getAttribute(k) { return k === 'href' ? this._href : null; } };
}

// Load the module the way the Electron renderer would, with a minimal DOM
// harness. The IIFE only touches the DOM when gcScrollTo() is called, so the
// harness wires getElementById/querySelectorAll for the call-time behavior.
function loadSlice(opts = {}) {
  const pills = opts.pills || [];
  const target = opts.target || null;
  const scrollCalls = [];
  const ctx = {
    document: {
      getElementById(id) { return (target && id === opts.targetId) ? target : null; },
      querySelectorAll(sel) { return sel === '.gc-section-pill' ? pills : []; }
    },
    Array, console
  };
  ctx.window = ctx;
  if (target) target.scrollIntoView = function (o) { scrollCalls.push(o || null); };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SLICE_ABS, 'utf8'), ctx, { filename: SLICE_REL });
  return { ctx, scrollCalls };
}

console.log('\n=== Phase 5 — Renderer strangler (GovCon section scroll slice) ===\n');

test('extracted module exists at the canonical path', () => {
  assert.ok(fs.existsSync(SLICE_ABS), SLICE_REL + ' must exist');
});

test('sourcedeck.html loads the module via a local <script src>', () => {
  assert.ok(HTML.includes('<script src="' + SLICE_REL + '"></script>'),
    'sourcedeck.html must reference the extracted module via <script src>');
});

test('sourcedeck.html no longer contains the moved helper body', () => {
  assert.ok(!/window\.gcScrollTo\s*=\s*function/.test(HTML), 'gcScrollTo body must not remain inline');
  assert.ok(!/gc-section-pill/.test(HTML), 'the .gc-section-pill query (moved logic) must not remain inline');
});

test('markup still invokes window.gcScrollTo (renderer-facing name unchanged)', () => {
  assert.ok(/onclick="[^"]*gcScrollTo\(event\s*,/.test(HTML), 'a markup handler must still call gcScrollTo(event, ...)');
});

test('sourcedeck.html line count reflects the extraction (no re-inline)', () => {
  const lines = HTML.split('\n').length;
  assert.ok(lines < 23340, 'sourcedeck.html should be smaller after extraction, got ' + lines);
});

test('module attaches the renderer-facing window.gcScrollTo surface', () => {
  const { ctx } = loadSlice();
  assert.strictEqual(typeof ctx.gcScrollTo, 'function', 'gcScrollTo must be exposed on window');
});

test('gcScrollTo prevents default, smooth-scrolls the target, and highlights the active pill', () => {
  const pillA = makePill('#sec-a');
  const pillB = makePill('#sec-b');
  const target = {};
  let prevented = false;
  const { ctx, scrollCalls } = loadSlice({ pills: [pillA, pillB], target, targetId: 'sec-a' });
  ctx.gcScrollTo({ preventDefault() { prevented = true; } }, 'sec-a');
  assert.strictEqual(prevented, true, 'preventDefault must be called when an event is passed');
  // Note: assert per-property — the options object is created in the vm realm,
  // so deepStrictEqual would fail the cross-realm prototype check.
  assert.strictEqual(scrollCalls.length, 1, 'target.scrollIntoView must be called exactly once');
  assert.strictEqual(scrollCalls[0] && scrollCalls[0].behavior, 'smooth', 'must smooth-scroll');
  assert.strictEqual(scrollCalls[0] && scrollCalls[0].block, 'start', 'must align to start');
  assert.strictEqual(pillA.style.background, ACTIVE_BG, 'matching pill must get the active background');
  assert.strictEqual(pillB.style.background, INACTIVE_BG, 'non-matching pill must get the inactive background');
});

test('gcScrollTo is a safe no-op when the target is missing', () => {
  const { ctx, scrollCalls } = loadSlice({ pills: [], target: null, targetId: 'nope' });
  assert.doesNotThrow(() => ctx.gcScrollTo(null, 'missing'), 'missing target must not throw (and no event is fine)');
  assert.strictEqual(scrollCalls.length, 0, 'no scroll should happen for a missing target');
});

test('the renderer slice does not import electron or touch IPC directly', () => {
  const src = fs.readFileSync(SLICE_ABS, 'utf8');
  assert.ok(!/require\(\s*['"]electron['"]\s*\)/.test(src), 'must not require("electron")');
  assert.ok(!/from\s+['"]electron['"]/.test(src), 'must not import from electron');
  assert.ok(!/\bipcMain\b/.test(src), 'must not reference ipcMain');
  assert.ok(!/\bipcRenderer\b/.test(src), 'must not use ipcRenderer directly');
});

test('main.js still registers zero IPC handlers (Phase 1/2 intact)', () => {
  const count = (MAIN.match(/ipcMain\.handle/g) || []).length;
  assert.strictEqual(count, 0, 'main.js must not regain ipcMain.handle bodies, found ' + count);
});

test('packaging guard pins the new module', () => {
  assert.ok(GUARD.includes(SLICE_REL), 'architecture-packaging-runtime-modules.test.js must list ' + SLICE_REL);
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 5 renderer strangler checks ===\n`);
process.exit(failed ? 1 : 0);

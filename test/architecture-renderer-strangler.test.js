/**
 * Phase 3 — Renderer strangler architecture lock (first slice).
 *
 * Phase 1 split the main-process composition root; Phase 2 migrated IPC
 * registration into app/main/ipc/. Phase 3 begins extracting the oversized
 * sourcedeck.html renderer one contained feature slice at a time. This test
 * locks the first slice — the Find Opportunities "State & Local procurement"
 * panel — and the invariants the strangler must keep:
 *
 *   - the extracted renderer module exists and owns the moved logic;
 *   - sourcedeck.html loads it via a local <script src> and no longer holds
 *     the moved helper bodies (no duplication, real extraction);
 *   - the module attaches the same renderer-facing window.* surface;
 *   - main.js still registers zero IPC handlers (Phase 1/2 not regressed);
 *   - app/main/ipc/ still owns IPC registration;
 *   - no renderer module imports electron directly.
 *
 * Run: node test/architecture-renderer-strangler.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

const SLICE_REL = 'app/renderer/features/find-opportunities/state-local-procurement.js';
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

// Load the renderer slice in a minimal browser-like sandbox, exactly the way
// the Electron renderer would when it pulls the module via <script src>.
function loadSlice() {
  const elements = {};
  const openCalls = [];
  const ctx = {
    document: {
      readyState: 'complete',
      getElementById(id) { return elements[id] || null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout(fn) { return 0; }, // do not auto-run boot in this harness
    Promise,
    console
  };
  ctx.window = ctx;
  ctx.window.open = function(url, target, features) { openCalls.push({ url, target, features }); return {}; };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SLICE_ABS, 'utf8'), ctx, { filename: SLICE_REL });
  return { ctx, openCalls };
}

console.log('\n=== Phase 3 — Renderer strangler architecture lock ===\n');

const tests = [];

tests.push(test('extracted renderer module exists at the canonical path', () => {
  assert.ok(fs.existsSync(SLICE_ABS), SLICE_REL + ' must exist');
}));

tests.push(test('sourcedeck.html loads the module via a local <script src>', () => {
  assert.ok(HTML.includes('<script src="' + SLICE_REL + '"></script>'),
    'sourcedeck.html must reference the extracted module via <script src>');
}));

tests.push(test('sourcedeck.html no longer contains the moved helper bodies', () => {
  assert.ok(!/SD_STATE_PORTALS\s*=/.test(HTML), 'SD_STATE_PORTALS data must not remain inline in HTML');
  assert.ok(!/window\.sdSwitchOppMode\s*=\s*function/.test(HTML), 'sdSwitchOppMode body must not remain inline');
  assert.ok(!/window\.sdRenderStatePortal\s*=\s*function/.test(HTML), 'sdRenderStatePortal body must not remain inline');
  assert.ok(!/window\.sdOpenExternal\s*=\s*function/.test(HTML), 'sdOpenExternal body must not remain inline');
}));

tests.push(test('sourcedeck.html line count reflects the extraction (no re-inline)', () => {
  const lines = HTML.split('\n').length;
  // Pre-extraction the file was 23,706 lines with the inline slice. The lock
  // guards against the slice being re-inlined (which would jump back to ~23.7k).
  assert.ok(lines < 23600, 'sourcedeck.html should be smaller after extraction, got ' + lines);
}));

tests.push(test('module attaches the renderer-facing window.* surface (names unchanged)', () => {
  const { ctx } = loadSlice();
  for (const name of ['sdSwitchOppMode', 'sdRenderStatePortal', 'sdOpenSelectedStatePortal', 'sdOpenExternal']) {
    assert.strictEqual(typeof ctx[name], 'function', name + ' must be exposed as a function');
  }
  assert.ok(Array.isArray(ctx.SD_STATE_PORTALS), 'SD_STATE_PORTALS must be an array');
}));

tests.push(test('portal catalog still includes all 50 states plus DC', () => {
  const { ctx } = loadSlice();
  const codes = ctx.SD_STATE_PORTALS.map(p => p.code);
  assert.strictEqual(codes.length, 51, 'expected 51 entries (50 states + DC)');
  assert.ok(codes.includes('DC'), 'DC must be present');
  const expected = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  for (const c of expected) assert.ok(codes.includes(c), 'missing state ' + c);
}));

tests.push(test('unsafe javascript: URLs are not opened directly by the module', async () => {
  const { ctx, openCalls } = loadSlice();
  const ok = await ctx.sdOpenExternal('javascript:alert(1)');
  assert.strictEqual(ok, false, 'unsafe URL must resolve false');
  assert.strictEqual(openCalls.length, 0, 'window.open must not be called for an unsafe URL');
}));

tests.push(test('upload handoff still targets the existing extraction workflow surface', () => {
  // The upload control lives in HTML markup and must hand off to the existing
  // gcSolUploadActive() pipeline (never the undefined ingestSolicitationFile).
  assert.ok(/id="sl-upload-solicitation-btn"[\s\S]*gcSolUploadActive\(\)/.test(HTML),
    'State & Local upload button must call gcSolUploadActive()');
  const panel = HTML.match(/<div id="sl-statelocal-panel"[\s\S]*?<\/div><!-- \/sl-statelocal-panel -->/)[0];
  assert.ok(!/ingestSolicitationFile/.test(panel), 'panel must not call undefined ingestSolicitationFile');
}));

tests.push(test('tab-restore hook stays in HTML and restores persisted source mode', () => {
  assert.ok(/id === 'find-opportunities'[\s\S]*sdSwitchOppMode[\s\S]*sd\.govcon\.findOppMode/.test(HTML),
    'gcTabSwitch must restore the Federal/State & Local source mode via sdSwitchOppMode');
}));

tests.push(test('the renderer slice does not import electron or touch IPC directly', () => {
  const src = fs.readFileSync(SLICE_ABS, 'utf8');
  assert.ok(!/require\(\s*['"]electron['"]\s*\)/.test(src), 'renderer module must not require("electron")');
  assert.ok(!/from\s+['"]electron['"]/.test(src), 'renderer module must not import from electron');
  assert.ok(!/\bipcMain\b/.test(src), 'renderer module must not reference ipcMain');
  assert.ok(!/\bipcRenderer\b/.test(src), 'renderer module must not use ipcRenderer directly (use the preload sd.* bridge)');
}));

tests.push(test('no renderer module under app/renderer/** imports electron directly', () => {
  const base = path.join(ROOT, 'app/renderer');
  const offenders = [];
  (function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      if (!ent.name.endsWith('.js')) continue;
      const s = fs.readFileSync(p, 'utf8');
      if (/require\(\s*['"]electron['"]\s*\)/.test(s) || /from\s+['"]electron['"]/.test(s)) {
        offenders.push(path.relative(ROOT, p));
      }
    }
  })(base);
  assert.deepStrictEqual(offenders, [], 'renderer modules must not import electron: ' + offenders.join(', '));
}));

tests.push(test('main.js still registers zero IPC handlers (Phase 1/2 intact)', () => {
  const count = (MAIN.match(/ipcMain\.handle/g) || []).length;
  assert.strictEqual(count, 0, 'main.js must not regain ipcMain.handle bodies, found ' + count);
}));

tests.push(test('app/main/ipc/ still owns IPC registration', () => {
  for (const f of ['register-core-ipc.js', 'register-feature-ipc.js']) {
    const p = path.join(ROOT, 'app/main/ipc', f);
    assert.ok(fs.existsSync(p), 'app/main/ipc/' + f + ' must exist');
    assert.ok(/ipcMain\.handle/.test(fs.readFileSync(p, 'utf8')), f + ' must own ipcMain.handle registrations');
  }
}));

// Strangler progression — one slice per phase. As each renderer slice is
// extracted, add it here; every listed slice must be a real module that
// sourcedeck.html loads via <script src>. This is the running inventory of the
// one-slice-at-a-time renderer strangler.
tests.push(test('all extracted renderer slices exist and are referenced by HTML', () => {
  const EXTRACTED_SLICES = [
    'app/renderer/features/find-opportunities/state-local-procurement.js', // Phase 3
    'app/renderer/features/pilot-tracker/pilot-tracker.js',                // Phase 4
    'app/renderer/features/navigation/section-scroll.js',                  // Phase 5
    'app/renderer/features/file-viewer/file-viewer.js',                    // Phase 6
    'app/renderer/features/todays-work-plan/todays-work-plan.js',          // Phase 7
  ];
  for (const rel of EXTRACTED_SLICES) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), 'extracted slice missing on disk: ' + rel);
    assert.ok(HTML.includes('<script src="' + rel + '"></script>'),
      'sourcedeck.html must load extracted slice via <script src>: ' + rel);
  }
}));

Promise.all(tests).then(() => {
  console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 3 renderer strangler checks ===\n`);
  process.exit(failed ? 1 : 0);
});

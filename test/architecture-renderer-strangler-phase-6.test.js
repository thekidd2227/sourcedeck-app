/**
 * Phase 6 — Renderer strangler, fourth extracted slice (file viewer open/close).
 *
 * Phases 3–5 extracted State & Local procurement, the Pilot Tracker, and the
 * section-scroll helper. Phase 6 extracts the Phase 25AD right-side file-viewer
 * open/close UI helper — pure show/hide DOM behavior — out of sourcedeck.html
 * into a dedicated browser-safe module. This test locks the fourth slice and
 * the strangler invariants:
 *
 *   - the extracted module exists and HTML references it via <script src>;
 *   - HTML no longer contains the moved open/close bodies;
 *   - the module attaches the same window.sdRightFileViewerOpen/Close globals;
 *   - open + close reproduce the exact DOM/display/class/text effects;
 *   - missing viewer / missing sub-elements preserve the no-crash/no-op behavior;
 *   - the module contains no upload/extraction/parsing/IPC/storage/GovCon logic;
 *   - no renderer module imports electron directly;
 *   - main.js still registers zero ipcMain.handle;
 *   - the packaging guard pins the new module.
 *
 * Run: node test/architecture-renderer-strangler-phase-6.test.js
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

const SLICE_REL = 'app/renderer/features/file-viewer/file-viewer.js';
const SLICE_ABS = path.join(ROOT, SLICE_REL);
const SRC = fs.readFileSync(SLICE_ABS, 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

function makeEl() {
  return {
    hidden: undefined,
    textContent: undefined,
    innerHTML: undefined,
    _attrs: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
    addEventListener(ev, fn) { (this._handlers || (this._handlers = {}))[ev] = fn; }
  };
}

// Load the module the way the renderer would: the IIFE runs immediately and
// reads the viewer element at load. opts.noViewer omits it to exercise the
// early-return no-op path; opts.noSubEls omits title/meta/body.
function loadSlice(opts = {}) {
  const els = {};
  if (!opts.noViewer) {
    els['sd-right-file-viewer'] = makeEl();
    els['sd-right-file-viewer-close'] = makeEl();
    els['sd-right-file-viewer-open-local'] = makeEl();
    if (!opts.noSubEls) {
      els['sd-right-file-viewer-title'] = makeEl();
      els['sd-right-file-viewer-meta'] = makeEl();
      els['sd-right-file-viewer-body'] = makeEl();
    }
  }
  const ctx = {
    document: { getElementById(id) { return els[id] || null; } },
    console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: SLICE_REL });
  return { ctx, els };
}

console.log('\n=== Phase 6 — Renderer strangler (file viewer open/close slice) ===\n');

test('extracted module exists at the canonical path', () => {
  assert.ok(fs.existsSync(SLICE_ABS), SLICE_REL + ' must exist');
});

test('sourcedeck.html loads the module via a local <script src>', () => {
  assert.ok(HTML.includes('<script src="' + SLICE_REL + '"></script>'),
    'sourcedeck.html must reference the extracted module via <script src>');
});

test('sourcedeck.html no longer contains the moved open/close bodies', () => {
  assert.ok(!/window\.sdRightFileViewerOpen\s*=\s*function/.test(HTML), 'open body must not remain inline');
  assert.ok(!/window\.sdRightFileViewerClose\s*=\s*function/.test(HTML), 'close body must not remain inline');
});

test('viewer markup + consumers remain in HTML (UI/behavior unchanged)', () => {
  assert.ok(/id="sd-right-file-viewer"/.test(HTML), 'viewer <aside> markup must remain in HTML');
  assert.ok(/window\.sdRightFileViewerOpen\(\)/.test(HTML), 'existing consumers must still call sdRightFileViewerOpen()');
});

test('sourcedeck.html line count reflects the extraction (no re-inline)', () => {
  const lines = HTML.split('\n').length;
  assert.ok(lines < 23300, 'sourcedeck.html should be smaller after extraction, got ' + lines);
});

test('module attaches the renderer-facing window.* surface (names unchanged)', () => {
  const { ctx } = loadSlice();
  assert.strictEqual(typeof ctx.sdRightFileViewerOpen, 'function', 'sdRightFileViewerOpen must be exposed');
  assert.strictEqual(typeof ctx.sdRightFileViewerClose, 'function', 'sdRightFileViewerClose must be exposed');
});

test('open() reproduces the exact show effects', () => {
  const { ctx, els } = loadSlice();
  ctx.sdRightFileViewerOpen();
  const v = els['sd-right-file-viewer'];
  assert.strictEqual(v.hidden, false, 'open must unhide the viewer');
  assert.strictEqual(v.getAttribute('aria-hidden'), 'false', 'open must set aria-hidden=false');
  assert.strictEqual(v.classList.contains('is-open'), true, 'open must add .is-open');
  assert.strictEqual(v.getAttribute('data-open'), 'true', 'open must set data-open=true');
});

test('close() reproduces the exact hide + reset effects', () => {
  const { ctx, els } = loadSlice();
  const v = els['sd-right-file-viewer'];
  // Simulate an open viewer that had per-file state attached.
  ctx.sdRightFileViewerOpen();
  v.setAttribute('data-current-pursuit-id', 'p1');
  v.setAttribute('data-current-file-index', '2');
  ctx.sdRightFileViewerClose();
  assert.strictEqual(v.hidden, true, 'close must hide the viewer');
  assert.strictEqual(v.getAttribute('aria-hidden'), 'true', 'close must set aria-hidden=true');
  assert.strictEqual(v.classList.contains('is-open'), false, 'close must remove .is-open');
  assert.strictEqual(v.getAttribute('data-open'), null, 'close must remove data-open');
  assert.strictEqual(v.getAttribute('data-current-pursuit-id'), null, 'close must clear current pursuit id');
  assert.strictEqual(v.getAttribute('data-current-file-index'), null, 'close must clear current file index');
  assert.strictEqual(els['sd-right-file-viewer-title'].textContent, 'No file selected', 'close resets title');
  assert.strictEqual(els['sd-right-file-viewer-meta'].textContent, '', 'close clears meta');
  assert.ok(/Upload solicitation files to inspect extracted content/.test(els['sd-right-file-viewer-body'].innerHTML),
    'close resets body to the default placeholder copy');
});

test('close() is a safe no-op-ish when sub-elements are absent (no crash)', () => {
  const { ctx, els } = loadSlice({ noSubEls: true });
  assert.doesNotThrow(() => ctx.sdRightFileViewerClose(), 'missing title/meta/body must not throw');
  assert.strictEqual(els['sd-right-file-viewer'].hidden, true, 'viewer still hides without sub-elements');
});

test('absent viewer element preserves the early-return no-op (no globals, no crash)', () => {
  const { ctx } = loadSlice({ noViewer: true });
  assert.strictEqual(typeof ctx.sdRightFileViewerOpen, 'undefined', 'no open global when viewer is absent');
  assert.strictEqual(typeof ctx.sdRightFileViewerClose, 'undefined', 'no close global when viewer is absent');
});

test('the module contains no upload/extraction/parsing/IPC/storage/GovCon logic', () => {
  // Scan CODE only — strip comments and string literals so static placeholder
  // copy (e.g. "Upload solicitation files to inspect extracted content") is not
  // mistaken for upload/extraction logic.
  const code = SRC
    .replace(/\/\*[\s\S]*?\*\//g, ' ')        // block comments
    .replace(/\/\/[^\n]*/g, ' ')              // line comments
    .replace(/'(?:\\.|[^'\\])*'/g, "''")      // single-quoted strings
    .replace(/"(?:\\.|[^"\\])*"/g, '""')      // double-quoted strings
    .replace(/`(?:\\.|[^`\\])*`/g, '``');     // template strings
  const forbidden = [
    /require\(\s*['"]electron['"]\s*\)/, /from\s+['"]electron['"]/,
    /\bipcMain\b/, /\bipcRenderer\b/, /window\.sd\./, /\.invoke\(/,
    /\blocalStorage\b/, /\bsessionStorage\b/, /\bfetch\s*\(/,
    /\bupload/i, /\bextract/i, /\bparse/i, /\bcredential/i, /\blicens/i,
    /downloadPackage/i, /samSearch/i, /\bcompliance/i
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(code), 'file-viewer module code must not contain ' + re);
  }
});

test('main.js still registers zero IPC handlers (Phase 1/2 intact)', () => {
  const count = (MAIN.match(/ipcMain\.handle/g) || []).length;
  assert.strictEqual(count, 0, 'main.js must not regain ipcMain.handle bodies, found ' + count);
});

test('packaging guard pins the new module', () => {
  assert.ok(GUARD.includes(SLICE_REL), 'architecture-packaging-runtime-modules.test.js must list ' + SLICE_REL);
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 6 renderer strangler checks ===\n`);
process.exit(failed ? 1 : 0);

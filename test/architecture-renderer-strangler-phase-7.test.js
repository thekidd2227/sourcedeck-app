/**
 * Phase 7 — Renderer strangler, fifth extracted slice (Today's Work Plan).
 *
 * Phases 3–6 extracted State & Local procurement, the Pilot Tracker, the
 * section-scroll helper, and the file-viewer open/close helper. Phase 7
 * extracts the Phase 25H "Today's Work Plan integration" — a read-only mirror
 * that renders today's calendar events into the Daily Operating Rhythm pane —
 * out of sourcedeck.html into a dedicated browser-safe module. This test locks
 * the fifth slice and the strangler invariants:
 *
 *   - the extracted module exists and HTML references it via <script src>;
 *   - HTML no longer contains the moved helper body;
 *   - the module attaches the same window.calRenderTodayWorkPlan global;
 *   - render reproduces the empty-state and event-list DOM effects;
 *   - reads window.__sdCalendar first, then the sd.calendar.v1 localStorage
 *     fallback — read only, no writes, no shape change;
 *   - missing #do-checklist host preserves the no-crash/no-op behavior;
 *   - the module contains no IPC/provider/upload/extraction/storage-write/GovCon
 *     business logic;
 *   - no renderer module imports electron directly;
 *   - main.js still registers zero ipcMain.handle;
 *   - the packaging guard pins the new module.
 *
 * Run: node test/architecture-renderer-strangler-phase-7.test.js
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

const SLICE_REL = 'app/renderer/features/todays-work-plan/todays-work-plan.js';
const SLICE_ABS = path.join(ROOT, SLICE_REL);
const SRC = fs.readFileSync(SLICE_ABS, 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

// Today's ISO date, computed exactly as the module does, so seeded events are
// deterministic regardless of the run date.
function todayIso() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// Load the module in a minimal DOM harness. setTimeout runs synchronously so
// boot()'s render is observable; opts control the host element, the optional
// window.__sdCalendar global, and the localStorage fallback.
function loadSlice(opts = {}) {
  const host = opts.noHost ? null : { innerHTML: '' };
  const localStore = Object.assign({}, opts.localStorage || {});
  const ctx = {
    document: {
      readyState: 'complete',
      getElementById(id) { return (id === 'do-checklist') ? host : null; },
      addEventListener() {}
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
      setItem(k, v) { localStore[k] = String(v); }
    },
    setTimeout(fn) { fn(); return 0; },
    Date, Array, JSON, String, console
  };
  ctx.window = ctx;
  if (opts.calendar) ctx.window.__sdCalendar = opts.calendar;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: SLICE_REL });
  return { ctx, host, localStore };
}

console.log('\n=== Phase 7 — Renderer strangler (Today\'s Work Plan slice) ===\n');

test('extracted module exists at the canonical path', () => {
  assert.ok(fs.existsSync(SLICE_ABS), SLICE_REL + ' must exist');
});

test('sourcedeck.html loads the module via a local <script src>', () => {
  assert.ok(HTML.includes('<script src="' + SLICE_REL + '"></script>'),
    'sourcedeck.html must reference the extracted module via <script src>');
});

test('sourcedeck.html no longer contains the moved helper body', () => {
  assert.ok(!/function\s+renderTodayWorkPlan/.test(HTML), 'renderTodayWorkPlan body must not remain inline');
  assert.ok(!/window\.calRenderTodayWorkPlan\s*=\s*renderTodayWorkPlan/.test(HTML), 'global assignment must not remain inline');
});

test('Daily Ops #do-checklist host markup remains in HTML (UI unchanged)', () => {
  assert.ok(/id="do-checklist"/.test(HTML), 'the #do-checklist host must remain in HTML');
});

test('sourcedeck.html line count reflects the extraction (no re-inline)', () => {
  const lines = HTML.split('\n').length;
  assert.ok(lines < 23260, 'sourcedeck.html should be smaller after extraction, got ' + lines);
});

test('module attaches the renderer-facing window.calRenderTodayWorkPlan surface', () => {
  const { ctx } = loadSlice();
  assert.strictEqual(typeof ctx.calRenderTodayWorkPlan, 'function', 'calRenderTodayWorkPlan must be exposed on window');
});

test('renders the neutral empty state when there are no events for today', () => {
  const { host } = loadSlice();
  assert.ok(/data-phase-25h="today-work-plan-empty"/.test(host.innerHTML), 'empty-state marker expected');
  assert.ok(/No calendar events for today/.test(host.innerHTML), 'empty-state copy expected');
  assert.ok(/openTab\('calendar'\)/.test(host.innerHTML), 'empty-state must link to the Calendar tab');
});

test('renders today\'s events from window.__sdCalendar (preferred source)', () => {
  const iso = todayIso();
  const calendar = { getState() { return { events: [
    { date: iso, title: 'Kickoff <call>', start: '09:00', end: '10:00', taskType: 'meeting', status: 'scheduled' },
    { date: '1999-01-01', title: 'Old', start: '08:00' }
  ] }; } };
  const { host } = loadSlice({ calendar });
  assert.ok(/data-phase-25h="today-work-plan-list"/.test(host.innerHTML), 'event-list marker expected');
  assert.ok(/Kickoff &lt;call&gt;/.test(host.innerHTML), 'title must render HTML-escaped');
  assert.ok(/meeting/.test(host.innerHTML) && /scheduled/.test(host.innerHTML), 'taskType + status must render');
  assert.ok(!/Old/.test(host.innerHTML), 'events for other dates must be filtered out');
});

test('falls back to the sd.calendar.v1 localStorage source (read-only)', () => {
  const iso = todayIso();
  const seed = JSON.stringify({ events: [{ date: iso, title: 'Local event', allDay: true }] });
  const { host, localStore } = loadSlice({ localStorage: { 'sd.calendar.v1': seed } });
  assert.ok(/Local event/.test(host.innerHTML), 'must render events from the localStorage fallback');
  assert.ok(/All day/.test(host.innerHTML), 'all-day formatting preserved');
  // Read-only: the module must not have written anything back.
  assert.strictEqual(Object.keys(localStore).length, 1, 'module must not write new storage keys');
  assert.strictEqual(localStore['sd.calendar.v1'], seed, 'module must not mutate the stored calendar payload');
});

test('missing #do-checklist host preserves the no-crash/no-op behavior', () => {
  assert.doesNotThrow(() => loadSlice({ noHost: true }), 'absent host must not throw at boot/render');
});

test('the module contains no IPC/provider/upload/extraction/storage-write/GovCon logic', () => {
  // Scan CODE only — strip comments and string literals so static UI copy is
  // not mistaken for logic.
  const code = SRC
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    // Neutralize the benign stdlib JSON.parse/stringify of the read-only
    // localStorage fallback so the generic "parse" check still catches any
    // document-parsing logic without flagging standard JSON handling.
    .replace(/JSON\.(parse|stringify)/g, 'JSON_X');
  const forbidden = [
    /require\(\s*['"]electron['"]\s*\)/, /from\s+['"]electron['"]/,
    /\bipcMain\b/, /\bipcRenderer\b/, /window\.sd\./, /\.invoke\(/,
    /\bfetch\s*\(/, /XMLHttpRequest/,
    /setItem\s*\(/, /removeItem\s*\(/,                 // no storage writes
    /\bupload/i, /\bextract/i, /\bparse(?!d\b)/i,      // allow the local "parsed" var
    /samSearch/i, /\bcompliance/i, /\bscoring/i, /credential/i, /\blicens/i
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(code), 'module code must not contain ' + re);
  }
});

test('main.js still registers zero IPC handlers (Phase 1/2 intact)', () => {
  const count = (MAIN.match(/ipcMain\.handle/g) || []).length;
  assert.strictEqual(count, 0, 'main.js must not regain ipcMain.handle bodies, found ' + count);
});

test('packaging guard pins the new module', () => {
  assert.ok(GUARD.includes(SLICE_REL), 'architecture-packaging-runtime-modules.test.js must list ' + SLICE_REL);
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 7 renderer strangler checks ===\n`);
process.exit(failed ? 1 : 0);

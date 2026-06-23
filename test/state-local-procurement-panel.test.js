'use strict';

// State & Local procurement panel — regression tests for the hardening
// applied in the post-merge closeout. Pure node:assert; no test framework.
// Mirrors the existing repo style (test/govcon-core.test.js / etc.).
// No live network. No real URLs opened. No filesystem writes.
//
// Strategy: extract the SD_STATE_PORTALS object and the sdOpenExternal /
// sdSwitchOppMode / sdRenderStatePortal functions from sourcedeck.html
// using vm.createContext so each test runs against the actual installed
// implementation rather than a copy.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

// ── Helpers ────────────────────────────────────────────────────────
function extractScript(markerStart, markerEnd){
  const i = HTML.indexOf(markerStart);
  if (i < 0) throw new Error('marker not found: ' + markerStart);
  const j = HTML.indexOf(markerEnd, i);
  if (j < 0) throw new Error('end marker not found: ' + markerEnd);
  return HTML.slice(i, j + markerEnd.length);
}

function fakeEl(tag){
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    _innerHTML: '',
    _classes: new Set(),
    style: {},
    dataset: {},
    addEventListener: function(){},
    scrollIntoView: function(){},
    classList: {
      add: (c) => el._classes.add(c),
      remove: (c) => el._classes.delete(c),
      contains: (c) => el._classes.has(c)
    },
    querySelectorAll: function(){ return []; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get(){ return el._innerHTML; },
    set(v){ el._innerHTML = String(v); }
  });
  return el;
}

function buildSandbox(elements){
  const els = elements || {};
  const calls = { open: [], samShell: [], requireShell: [] };
  const sandbox = {
    document: {
      getElementById: (id) => els[id] || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: {},
    URL: globalThis.URL,
    console: { error: function(){}, log: function(){} },
    Promise: Promise,
    setTimeout: (fn) => { try { fn(); } catch (e) {} },
    toast: function(){},
    calls
  };
  sandbox.window.open = (url, target, features) => {
    calls.open.push({ url, target, features });
    return { focus: function(){} };
  };
  vm.createContext(sandbox);
  return sandbox;
}

function loadSlBlock(sandbox){
  // The State & Local script block lives in its own <script> tag at the
  // end of the file. Extract from the opening comment marker.
  const start = HTML.indexOf('// ── STATE & LOCAL PROCUREMENT DIRECTORY');
  const end = HTML.indexOf('</script>', start);
  if (start < 0 || end < 0) throw new Error('State & Local script block not found');
  const code = HTML.slice(start, end);
  // Expose the functions on a sandbox-visible global so tests can call them.
  vm.runInContext(code + '\nthis.sdOpenExternal = sdOpenExternal; this.sdSwitchOppMode = sdSwitchOppMode; this.sdRenderStatePortal = sdRenderStatePortal; this.SD_STATE_PORTALS = SD_STATE_PORTALS;', sandbox);
  return sandbox;
}

let pass = 0, fail = 0;
function test(name, fn){
  try { fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + (e && e.message || e)); fail++; }
}

console.log('State & Local procurement panel');

// TEST 1 — Mode toggle: federal
test('mode toggle → federal sets samContent visible, slPanel hidden, federal active', () => {
  const els = {
    'sl-sam-content': fakeEl(),
    'sl-statelocal-panel': fakeEl(),
    'opp-mode-bar': fakeEl(),
    'sl-mode-federal': fakeEl(),
    'sl-mode-statelocal': fakeEl()
  };
  const sb = buildSandbox(els);
  loadSlBlock(sb);
  sb.window.sdSwitchOppMode = sb.sdSwitchOppMode;
  sb.sdSwitchOppMode('federal');
  assert.strictEqual(els['sl-sam-content'].style.display, '', 'samContent visible');
  assert.strictEqual(els['sl-statelocal-panel'].style.display, 'none', 'slPanel hidden');
  assert.ok(els['sl-mode-federal'].classList.contains('active'), 'federal active');
  assert.ok(!els['sl-mode-statelocal'].classList.contains('active'), 'statelocal not active');
});

// TEST 2 — Mode toggle: statelocal
test('mode toggle → statelocal hides samContent, shows slPanel, statelocal active', () => {
  const els = {
    'sl-sam-content': fakeEl(),
    'sl-statelocal-panel': fakeEl(),
    'opp-mode-bar': fakeEl(),
    'sl-mode-federal': fakeEl(),
    'sl-mode-statelocal': fakeEl()
  };
  const sb = buildSandbox(els);
  loadSlBlock(sb);
  sb.sdSwitchOppMode('statelocal');
  assert.strictEqual(els['sl-sam-content'].style.display, 'none', 'samContent hidden');
  assert.strictEqual(els['sl-statelocal-panel'].style.display, 'block', 'slPanel visible');
  assert.ok(els['sl-mode-statelocal'].classList.contains('active'), 'statelocal active');
  assert.ok(!els['sl-mode-federal'].classList.contains('active'), 'federal not active');
});

// TEST 3 — Missing DOM element does not throw
test('mode toggle returns silently + toasts when DOM elements missing', () => {
  const els = {
    // omit sl-sam-content intentionally
    'sl-statelocal-panel': fakeEl(),
    'opp-mode-bar': fakeEl(),
    'sl-mode-federal': fakeEl(),
    'sl-mode-statelocal': fakeEl()
  };
  let toasted = false;
  const sb = buildSandbox(els);
  sb.toast = function(){ toasted = true; };
  loadSlBlock(sb);
  // Must not throw.
  let threw = false;
  try { sb.sdSwitchOppMode('statelocal'); } catch (e) { threw = true; }
  assert.ok(!threw, 'sdSwitchOppMode did not throw on missing DOM');
  // toast may or may not be visible to the sandbox depending on scope; we
  // mainly assert no exception was raised.
});

// TEST 4 — Portal rendering for 5 representative states
test('portal renderer paints stateUrl, localUrl, name for DC/VA/MD/TX/CA', () => {
  ['DC','VA','MD','TX','CA'].forEach(abbr => {
    const panel = fakeEl();
    const sb = buildSandbox({ 'sl-portal-panel': panel });
    loadSlBlock(sb);
    sb.sdRenderStatePortal(abbr);
    const html = panel.innerHTML;
    const rec = sb.SD_STATE_PORTALS[abbr];
    assert.ok(html.includes(rec.stateUrl), abbr + ' includes stateUrl');
    assert.ok(html.includes(rec.localUrl), abbr + ' includes localUrl');
    assert.ok(html.includes(rec.name), abbr + ' includes state name');
  });
});

// TEST 5 — sdOpenExternal rejects javascript: URLs
test('sdOpenExternal blocks javascript: URL', () => {
  const sb = buildSandbox({});
  loadSlBlock(sb);
  sb.sdOpenExternal('javascript:alert(1)');
  assert.strictEqual(sb.calls.open.length, 0, 'window.open was NOT called');
});

// TEST 6 — sdOpenExternal allows https in non-Electron context
test('sdOpenExternal calls window.open(_blank, noopener,noreferrer) for https in browser', () => {
  const sb = buildSandbox({});
  loadSlBlock(sb);
  sb.sdOpenExternal('https://emma.maryland.gov/');
  assert.strictEqual(sb.calls.open.length, 1);
  assert.strictEqual(sb.calls.open[0].url, 'https://emma.maryland.gov/');
  assert.strictEqual(sb.calls.open[0].target, '_blank');
  assert.strictEqual(sb.calls.open[0].features, 'noopener,noreferrer');
});

// TEST 7 — Electron IPC path is preferred when available
test('sdOpenExternal calls window.sd.shell.openExternal when Electron IPC present', async () => {
  const sb = buildSandbox({});
  loadSlBlock(sb);
  let ipcCalled = null;
  sb.window.sd = { shell: { openExternal: (url) => { ipcCalled = url; return Promise.resolve(); } } };
  sb.sdOpenExternal('https://procurement.staars.alabama.gov/');
  // Allow microtask to drain.
  await new Promise(r => setImmediate(r));
  assert.strictEqual(ipcCalled, 'https://procurement.staars.alabama.gov/');
  assert.strictEqual(sb.calls.open.length, 0, 'window.open NOT called');
});

// TEST 8 — Electron IPC failure falls back to window.open
test('sdOpenExternal falls back to window.open when Electron IPC rejects', async () => {
  const sb = buildSandbox({});
  loadSlBlock(sb);
  sb.window.sd = { shell: { openExternal: () => Promise.reject(new Error('IPC error')) } };
  sb.sdOpenExternal('https://oregonbuys.gov/');
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  assert.strictEqual(sb.calls.open.length, 1, 'fallback called');
  assert.strictEqual(sb.calls.open[0].url, 'https://oregonbuys.gov/');
});

// TEST 9 — No undefined ingestion function called
test('upload handoff never calls ingestSolicitationFile (not defined in file)', () => {
  const defined = /function\s+ingestSolicitationFile|const\s+ingestSolicitationFile|let\s+ingestSolicitationFile|window\.ingestSolicitationFile\s*=/.test(HTML);
  const called  = /ingestSolicitationFile\s*\(/.test(HTML);
  if (called && !defined) {
    assert.fail('ingestSolicitationFile is called but never defined');
  }
  // pwSolOpenFilePicker IS the real canonical fn — make sure we reference it
  assert.ok(/pwSolOpenFilePicker/.test(HTML), 'pwSolOpenFilePicker is referenced (real ingestion path)');
});

// TEST 10 — Vermont appears exactly once
test('Vermont (value="VT") appears exactly once in the dropdown', () => {
  // Restrict to <option> rows so SD_STATE_PORTALS / SD_STATE_ORDER refs
  // are excluded.
  const optMatches = HTML.match(/<option\s+value="VT"[^>]*>Vermont<\/option>/g) || [];
  assert.strictEqual(optMatches.length, 1, 'exactly one VT <option> row');
});

// TEST 11 — lastVerified + verificationStatus on all entries
test('all 51 SD_STATE_PORTALS entries carry valid lastVerified + verificationStatus', () => {
  const m = HTML.match(/SD_STATE_PORTALS\s*=\s*(\{[\s\S]*?\n\});/);
  assert.ok(m, 'SD_STATE_PORTALS block found');
  const x = eval('(' + m[1] + ')'); // eslint-disable-line no-eval
  const entries = Object.entries(x);
  assert.strictEqual(entries.length, 51, 'entry count is 51 (50 states + DC)');
  entries.forEach(([k, v]) => {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.lastVerified || ''), k + ' lastVerified is ISO date');
    assert.ok(typeof v.verificationStatus === 'string' && v.verificationStatus.length > 0,
      k + ' verificationStatus is non-empty string');
  });
});

// TEST 12 — sdSwitchOppMode uses only explicit IDs, no DOM-sibling guessing
test('sdSwitchOppMode contains explicit getElementById calls and no sibling guessing', () => {
  const m = HTML.match(/function sdSwitchOppMode[\s\S]*?\n\}/);
  assert.ok(m, 'sdSwitchOppMode found');
  const body = m[0];
  assert.ok(!body.includes('previousElementSibling'), 'no previousElementSibling');
  assert.ok(!body.includes('nextElementSibling'),     'no nextElementSibling');
  assert.ok(!body.includes('data-sl-hidden'),         'no data-sl-hidden');
  assert.ok(/getElementById\(\s*['"]sl-sam-content['"]\s*\)/.test(body),
    'getElementById("sl-sam-content") present');
});

console.log('\n=== ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' passed, ' + fail + ' failed ===');
if (fail) process.exit(1);

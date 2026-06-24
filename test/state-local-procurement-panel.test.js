/**
 * Phase 25AL — State & Local procurement portal panel regression tests.
 *
 * Static + isolated renderer-script assertions. These tests guard the hardening
 * requirements that prevent a repeat of undefined upload handlers, brittle DOM
 * sibling guessing, duplicate Vermont dropdown entries, unsafe external links,
 * and unverified portal data without metadata.
 *
 * Run: node test/state-local-procurement-panel.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
// Phase 3 renderer strangler: the State & Local renderer slice now lives in a
// dedicated module instead of an inline <script> in sourcedeck.html. The
// behavioral assertions below are unchanged; only the source of the renderer
// code moved, so the loaders read the module file. Markup-based assertions
// (dropdown, upload button, tab-restore hook) still read from HTML.
const MODULE_PATH = path.join(ROOT, 'app/renderer/features/find-opportunities/state-local-procurement.js');
const MODULE_SRC = fs.readFileSync(MODULE_PATH, 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        console.log('  ✅ ' + name);
      }, (e) => {
        failed++;
        console.log('  ❌ ' + name + ': ' + e.message);
      });
    }
    passed++;
    console.log('  ✅ ' + name);
    return Promise.resolve();
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ': ' + e.message);
    return Promise.resolve();
  }
}

function extractPhase25ALScript() {
  assert.ok(/\/\* Phase 25AL/.test(MODULE_SRC), 'Phase 25AL module marker missing');
  return MODULE_SRC;
}

function makeElement(id) {
  return {
    id,
    style: {},
    attributes: {},
    classList: {
      values: new Set(),
      add(v) { this.values.add(v); },
      remove(v) { this.values.delete(v); },
      contains(v) { return this.values.has(v); }
    },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] || ''; },
    innerHTML: '',
    value: ''
  };
}

function bootRenderer(options = {}) {
  const elements = {};
  const buttons = [makeElement('sl-mode-federal'), makeElement('sl-mode-state-local')];
  buttons[0].attributes['data-sl-opp-mode'] = 'federal';
  buttons[1].attributes['data-sl-opp-mode'] = 'state-local';
  if (!options.missingPanels) {
    elements['sl-sam-content'] = makeElement('sl-sam-content');
    elements['sl-statelocal-panel'] = makeElement('sl-statelocal-panel');
    elements['sl-state-select'] = makeElement('sl-state-select');
    elements['sl-state-select'].value = 'VA';
    elements['sl-portal-render'] = makeElement('sl-portal-render');
  }
  const localStore = {};
  const toastCalls = [];
  const openCalls = [];
  const context = {
    window: {},
    document: {
      readyState: 'complete',
      getElementById(id) { return elements[id] || null; },
      querySelectorAll(selector) { return selector === '[data-sl-opp-mode]' ? buttons : []; },
      addEventListener() {}
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
      setItem(k, v) { localStore[k] = String(v); }
    },
    setTimeout(fn) { fn(); },
    Promise,
    console
  };
  context.window = context;
  context.window.toast = function(message, level) { toastCalls.push({ message, level }); };
  context.window.open = function(url, target, features) { openCalls.push({ url, target, features }); return { closed: false }; };
  vm.createContext(context);
  vm.runInContext(extractPhase25ALScript(), context, { filename: 'phase25al.js' });
  return { context, elements, buttons, localStore, toastCalls, openCalls };
}

function getSelectBody() {
  const m = HTML.match(/<select[^>]*id="sl-state-select"[\s\S]*?<\/select>/);
  assert.ok(m, 'State dropdown missing');
  return m[0];
}

function getSwitchFunctionText() {
  const m = MODULE_SRC.match(/window\.sdSwitchOppMode\s*=\s*function\(mode\)\{[\s\S]*?\n  \};/);
  assert.ok(m, 'sdSwitchOppMode function missing');
  return m[0];
}

console.log('\n=== Phase 25AL — State & Local procurement panel ===\n');

const tests = [];

tests.push(test('Federal mode toggle shows #sl-sam-content and hides #sl-statelocal-panel', () => {
  const { context, elements } = bootRenderer();
  context.sdSwitchOppMode('federal');
  assert.strictEqual(elements['sl-sam-content'].style.display, '', 'Federal mode should show SAM/Federal content');
  assert.strictEqual(elements['sl-statelocal-panel'].style.display, 'none', 'Federal mode should hide State & Local panel');
}));

tests.push(test('State & Local mode toggle hides #sl-sam-content and shows #sl-statelocal-panel', () => {
  const { context, elements } = bootRenderer();
  context.sdSwitchOppMode('state-local');
  assert.strictEqual(elements['sl-sam-content'].style.display, 'none', 'State & Local mode should hide SAM/Federal content');
  assert.strictEqual(elements['sl-statelocal-panel'].style.display, '', 'State & Local mode should show panel');
}));

tests.push(test('Missing DOM elements are handled gracefully with a warning toast and false return', () => {
  const { context, toastCalls } = bootRenderer({ missingPanels: true });
  const ok = context.sdSwitchOppMode('state-local');
  assert.strictEqual(ok, false, 'missing panels should return false');
  assert.ok(toastCalls.some(t => /unavailable/i.test(t.message)), 'missing panels should produce a warning toast');
}));

tests.push(test('Portal renderer paints stateUrl, localUrl, and name for DC/VA/MD/TX/CA', () => {
  const { context, elements } = bootRenderer();
  for (const code of ['DC', 'VA', 'MD', 'TX', 'CA']) {
    assert.strictEqual(context.sdRenderStatePortal(code), true, code + ' should render');
    const entry = context.SD_STATE_PORTALS.find(p => p.code === code);
    const rendered = elements['sl-portal-render'].innerHTML;
    assert.ok(rendered.includes(entry.name), code + ' name missing from render');
    assert.ok(rendered.includes(entry.stateUrl), code + ' stateUrl missing from render');
    assert.ok(rendered.includes(entry.localUrl), code + ' localUrl missing from render');
  }
}));

tests.push(test('sdOpenExternal blocks javascript: URLs', async () => {
  const { context, openCalls, toastCalls } = bootRenderer();
  const ok = await context.sdOpenExternal('javascript:alert(1)');
  assert.strictEqual(ok, false, 'unsafe javascript URL should be blocked');
  assert.strictEqual(openCalls.length, 0, 'window.open must not be called for javascript URL');
  assert.ok(toastCalls.some(t => /blocked unsafe/i.test(t.message)), 'blocked unsafe URL should warn');
}));

tests.push(test('sdOpenExternal uses window.open(_blank, noopener,noreferrer) in browser fallback', async () => {
  const { context, openCalls } = bootRenderer();
  const ok = await context.sdOpenExternal('https://example.com/procurement');
  assert.strictEqual(ok, true, 'browser fallback should return true');
  assert.deepStrictEqual(openCalls[0], {
    url: 'https://example.com/procurement',
    target: '_blank',
    features: 'noopener,noreferrer'
  });
}));

tests.push(test('sdOpenExternal calls window.sd.shell.openExternal when Electron IPC is present', async () => {
  const { context, openCalls } = bootRenderer();
  const ipcCalls = [];
  context.sd = { shell: { openExternal(url) { ipcCalls.push(url); return Promise.resolve(true); } } };
  const ok = await context.sdOpenExternal('https://example.com/state');
  assert.strictEqual(ok, true, 'Electron IPC open should resolve true');
  assert.deepStrictEqual(ipcCalls, ['https://example.com/state']);
  assert.strictEqual(openCalls.length, 0, 'browser fallback should not run on successful IPC open');
}));

tests.push(test('sdOpenExternal falls back to window.open when Electron IPC rejects', async () => {
  const { context, openCalls } = bootRenderer();
  context.sd = { shell: { openExternal() { return Promise.reject(new Error('ipc failed')); } } };
  const ok = await context.sdOpenExternal('https://example.com/local');
  assert.strictEqual(ok, true, 'rejected IPC should still fall back to browser open');
  assert.strictEqual(openCalls.length, 1, 'browser fallback should run once');
  assert.strictEqual(openCalls[0].features, 'noopener,noreferrer');
}));

tests.push(test('Upload handoff uses gcSolUploadActive and never ingestSolicitationFile', () => {
  assert.ok(/id="sl-upload-solicitation-btn"[\s\S]*gcSolUploadActive\(\)/.test(HTML), 'State & Local upload button must call gcSolUploadActive()');
  const panel = HTML.match(/<div id="sl-statelocal-panel"[\s\S]*?<\/div><!-- \/sl-statelocal-panel -->/)[0];
  assert.ok(!/ingestSolicitationFile/.test(panel), 'State & Local panel must not call undefined ingestSolicitationFile');
}));

tests.push(test('Vermont value="VT" appears exactly once in the state dropdown', () => {
  const select = getSelectBody();
  const vtMatches = select.match(/<option\s+value="VT"/g) || [];
  assert.strictEqual(vtMatches.length, 1, 'Vermont option must appear exactly once in dropdown');
}));

tests.push(test('All 51 SD_STATE_PORTALS entries include lastVerified and verificationStatus', () => {
  const { context } = bootRenderer();
  const portals = context.SD_STATE_PORTALS;
  assert.strictEqual(portals.length, 51, 'portal array must contain 50 states + DC');
  for (const p of portals) {
    assert.ok(p.code && /^[A-Z]{2}$/.test(p.code), 'invalid state code for ' + JSON.stringify(p));
    assert.ok(p.name, 'portal entry missing name for ' + p.code);
    assert.ok(/^https?:\/\//.test(p.stateUrl), 'portal entry missing valid stateUrl for ' + p.code);
    assert.ok(/^https?:\/\//.test(p.localUrl), 'portal entry missing valid localUrl for ' + p.code);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.lastVerified), 'portal entry missing date lastVerified for ' + p.code);
    assert.strictEqual(p.verificationStatus, 'unverified-seed', 'portal entry verificationStatus should be unverified-seed for ' + p.code);
  }
}));

tests.push(test('sdSwitchOppMode uses explicit getElementById calls and no DOM sibling guessing', () => {
  const fn = getSwitchFunctionText();
  assert.ok(/document\.getElementById\('sl-sam-content'\)/.test(fn), 'sdSwitchOppMode must explicitly read #sl-sam-content');
  assert.ok(/document\.getElementById\('sl-statelocal-panel'\)/.test(fn), 'sdSwitchOppMode must explicitly read #sl-statelocal-panel');
  assert.ok(!/previousElementSibling|nextElementSibling|parentElement|children\s*\[|nextSibling|previousSibling/.test(fn), 'sdSwitchOppMode must not guess DOM siblings');
}));

tests.push(test('Find Opportunities tab restores persisted source mode on tab switch', () => {
  assert.ok(/id === 'find-opportunities'[\s\S]*sdSwitchOppMode[\s\S]*sd\.govcon\.findOppMode/.test(HTML), 'gcTabSwitch must restore the Federal/State & Local source mode');
}));

Promise.all(tests).then(() => {
  console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25AL checks ===\n`);
  process.exit(failed ? 1 : 0);
});

/**
 * Renderer boot regression tests.
 *
 * Guards against the boot failure found in post-PR #52 macOS visual QA:
 *
 *   1. A malformed inline toast() call in sourcedeck.html
 *      (`...'Save error','+(r.ok?'ok':'err')`) produced
 *      "SyntaxError: missing ) after argument list", which discarded the
 *      ENTIRE 4787-9599 inline <script> block — leaving openTab,
 *      renderDashboard, ARCG_OS, etc. undefined and navigation dead.
 *
 *   2. services/default-state-policy.js declared a top-level `const _api`
 *      that collided with services/response-desk.js's `const _api` when
 *      both load as classic <script> in the same global scope
 *      ("Identifier '_api' has already been declared").
 *
 * These checks are static + VM-based; they never execute renderer/app code
 * or touch the network, so they are safe in CI.
 *
 * Run:  node test/renderer-boot.test.js
 * Exits non-zero on any failure so `npm test` fails.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Renderer boot — static parse + namespace safety ===\n');

// 1. Every inline <script> (without src=) must parse.
test('every inline <script> block parses with new vm.Script', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 1, 'no inline scripts found');
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 2. The two classic renderer service scripts must load, in browser order,
//    into ONE shared global without a redeclaration collision.
test('response-desk.js + default-state-policy.js load without global collision', () => {
  const ctx = vm.createContext({ window: {}, console, globalThis: {} });
  const order = ['services/response-desk.js', 'services/default-state-policy.js'];
  for (const rel of order) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // Each classic <script> gets a fresh CommonJS shim but SHARES the global
    // lexical scope — exactly how the browser evaluates them.
    ctx.module = { exports: {} };
    ctx.exports = ctx.module.exports;
    vm.runInContext(code, ctx, { filename: rel });
  }
  // 3. Both intended renderer namespaces must be attached.
  assert.ok(ctx.window.SDResponseDesk, 'window.SDResponseDesk missing');
  assert.ok(ctx.window.SDDefaultState, 'window.SDDefaultState missing');
});

// 3b. Confirm the unique internal identifier rename is in place (defensive:
//     ensures the collision cannot silently reappear).
test('default-state-policy.js no longer declares a colliding top-level const _api', () => {
  const code = fs.readFileSync(path.join(ROOT, 'services/default-state-policy.js'), 'utf8');
  assert.ok(!/^\s*const\s+_api\s*=/m.test(code),
    'default-state-policy.js still declares top-level `const _api`');
  assert.ok(/const\s+_defaultStateApi\s*=/.test(code),
    'expected unique `_defaultStateApi` identifier not found');
});

// 4. The exact malformed toast syntax must be gone.
test('malformed toast(...) syntax is removed from sourcedeck.html', () => {
  assert.ok(!HTML.includes("toast(r.ok?'CRM updated: '+rid:'Save error','+"),
    'malformed toast call still present');
  // and the corrected form is present
  assert.ok(HTML.includes("toast(r.ok?'CRM updated: '+rid:'Save error',r.ok?'ok':'err')"),
    'corrected toast call not found');
});

// 5. Core renderer entry points still exist in source (the block that was
//    being discarded defines these).
test('core renderer functions remain defined in sourcedeck.html', () => {
  for (const sym of ['function openTab', 'function bindNav', 'function renderActivityFeed', 'const ARCG_OS']) {
    assert.ok(HTML.includes(sym), 'missing renderer symbol: ' + sym);
  }
});

// 6. Protected strings must remain (no regression in guarded features).
test('protected feature strings remain intact', () => {
  assert.ok(HTML.includes('Response Desk'), 'Response Desk label missing');
  assert.ok(HTML.includes('Free users: 1 NAICS'), 'SAM Free=1 NAICS copy missing');
  assert.ok(HTML.includes('Phase 20G guard'), 'Phase 20G guard comment missing');
  const rd = fs.readFileSync(path.join(ROOT, 'services/response-desk.js'), 'utf8');
  assert.ok(rd.includes('human_approval_required'), 'human_approval_required missing');
  assert.ok(rd.includes('auto_send'), 'auto_send missing');
});

// 7. No Send Email / auto-send surface introduced in the Response Desk pane.
test('no Send Email / auto-send button introduced', () => {
  const pane = (HTML.match(/<div class="tab-pane" id="tab-reply">[\s\S]*?<\/div>\s*<!--/i) || [HTML])[0];
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'a "Send Email" button is present');
  assert.ok(!/onclick="[^"]*autoSend/i.test(HTML), 'an autoSend handler is present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} renderer-boot checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 21D — Response Desk Email Import Workflow.
 *
 * Static-source assertions on the renderer (sourcedeck.html) verifying:
 *   - import-first UI surface (Import Email + Paste Reply Manually actions)
 *   - manual import detail fields (From / Subject / Received)
 *   - no Send Email surface, no auto-send
 *   - explicit manual/local import language (no live Gmail / inbox claim)
 *   - no fake Gmail connection IDs or message IDs
 *   - protected human-approval / draft-only language preserved
 *   - navigation cleanup: "AI Generate" → "AI Lead Builder",
 *     "System Flow" → "System Readiness"
 *   - the existing renderer-boot test still passes (called as a guard)
 *
 * Run: node test/response-desk-email-import.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

// Slice the Response Desk pane to scan its region tightly.
const PANE_START = HTML.indexOf('<div class="tab-pane" id="tab-reply">');
const PANE_END = PANE_START >= 0
  ? HTML.indexOf('<!-- ═══', PANE_START + 1)
  : HTML.length;
const PANE = PANE_START >= 0 ? HTML.slice(PANE_START, PANE_END) : '';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

console.log('\n── Response Desk: import-first workflow ──');

test('Response Desk pane region exists in sourcedeck.html', () => {
  assert.ok(PANE_START > 0, '#tab-reply pane not found');
  assert.ok(PANE.length > 1000, 'pane region too small to be the rendered Response Desk');
});

test('1. Response Desk pane contains "Import Email" action', () => {
  assert.ok(/Import Email/.test(PANE), 'Import Email action missing from Response Desk pane');
  assert.ok(/onclick="rdOpenImport\(/i.test(PANE), 'Import Email button must wire to rdOpenImport()');
});

test('2. Response Desk pane contains "Paste Reply Manually" fallback action', () => {
  assert.ok(/Paste Reply Manually/.test(PANE), 'Paste Reply Manually fallback action missing');
  assert.ok(/onclick="rdFocusPaste\(/i.test(PANE), 'fallback must wire to rdFocusPaste()');
});

test('3. Import Email does not create a Send Email button', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(PANE), 'Send Email button surfaced in Response Desk pane');
  assert.ok(!/onclick="[^"]*sendEmail\(/i.test(HTML), 'sendEmail handler exists');
  assert.ok(!/onclick="[^"]*autoSend\(/i.test(HTML), 'autoSend handler exists');
});

test('4. Response Desk still surfaces "human approval" and "draft-only" language', () => {
  assert.ok(/Human approval required/i.test(PANE), 'Human approval required label missing');
  assert.ok(/Draft only — not sent/i.test(PANE), 'Draft only — not sent text missing');
  assert.ok(/never auto[- ]?sends/i.test(PANE), 'never auto-sends language missing');
});

test('5. Manual import fields exist (From / Subject / Received)', () => {
  assert.ok(/id="ra-from"/.test(PANE), 'From field (id="ra-from") missing');
  assert.ok(/id="ra-subject"/.test(PANE), 'Subject field (id="ra-subject") missing');
  assert.ok(/id="ra-received"/.test(PANE), 'Received field (id="ra-received") missing');
});

test('5b. Imported-email detail card exists and is hidden by default', () => {
  assert.ok(/id="rd-import-detail"[^>]*style="[^"]*display:none/.test(PANE),
    'rd-import-detail must default to display:none and only reveal on Import Email click');
});

test('6. analyzeReply consumes imported metadata into the analysis input', () => {
  // The renderer must read From / Subject / Received and fold them into
  // contextNotes so the deterministic classifier sees the imported email
  // context. Asserted by checking that analyzeReply pulls those IDs.
  const fn = HTML.slice(HTML.indexOf('async function analyzeReply()'),
                        HTML.indexOf('async function analyzeReply()') + 4000);
  assert.ok(/getElementById\(['"]ra-from['"]\)/.test(fn),    'analyzeReply does not read ra-from');
  assert.ok(/getElementById\(['"]ra-subject['"]\)/.test(fn), 'analyzeReply does not read ra-subject');
  assert.ok(/getElementById\(['"]ra-received['"]\)/.test(fn),'analyzeReply does not read ra-received');
  assert.ok(/contextNotes|importedMeta/.test(fn),            'analyzeReply does not compose imported metadata into context');
});

test('7. No fake Gmail connection ID appears in user-facing markup', () => {
  const userMarkup = HTML.slice(0, HTML.indexOf('<script>'));
  assert.ok(!/Gmail Connection.*\b8125092\b/i.test(userMarkup), 'fake Gmail Connection ID present');
  assert.ok(!/\b8125092\b/.test(userMarkup), 'literal 8125092 still in user-facing markup');
});

test('8. No fake message_id / thread_id literal in user-facing markup', () => {
  const userMarkup = HTML.slice(0, HTML.indexOf('<script>'));
  assert.ok(!/message_id:\s*["'][^"']+["']/i.test(userMarkup), 'fake message_id literal present');
  assert.ok(!/thread_id:\s*["'][^"']+["']/i.test(userMarkup),  'fake thread_id literal present');
});

test('9. No auto_send: true anywhere in the Response Desk path', () => {
  const rd = fs.readFileSync(path.join(ROOT, 'services/response-desk.js'), 'utf8');
  assert.ok(!/auto_send\s*:\s*true/i.test(rd),   'service module sets auto_send: true');
  assert.ok(!/auto_send\s*:\s*true/i.test(HTML), 'renderer sets auto_send: true');
  assert.ok(/auto_send\s*:\s*false/.test(rd),    'service module must explicitly set auto_send: false');
});

test('10. No Send Email text exists as a button/action anywhere', () => {
  assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML), 'Send Email button present somewhere');
  assert.ok(!/onclick="[^"]*sendReply\(/i.test(HTML),    'sendReply handler exists');
  assert.ok(!/onclick="[^"]*dispatchReply\(/i.test(HTML),'dispatchReply handler exists');
});

test('11. UI says manual/local import mode (no live inbox claim)', () => {
  assert.ok(/Import Email is local\/manual until inbox integration is connected|Manual import: paste|Live inbox connection is not configured/i.test(PANE),
    'Response Desk pane must declare manual/local import mode');
});

test('11b. No "Gmail connected" / "live inbox connected" claim anywhere', () => {
  assert.ok(!/Gmail connected/i.test(HTML),       'Gmail connected claim present');
  assert.ok(!/live inbox connected/i.test(HTML),  'live inbox connected claim present');
  assert.ok(!/Gmail\s+(?:live|integration\s+(?:live|active|connected))/i.test(HTML),
    'Gmail live/integration claim present');
});

console.log('\n── Navigation cleanup ──');

test('12. "AI Generate" nav label is gone; renamed to a concrete workflow', () => {
  // The nav button text must not be the vague "AI Generate".
  assert.ok(!/>\s*AI Generate\s*</.test(HTML),
    'AI Generate vague nav label still present — rename to a concrete workflow (e.g., AI Lead Builder)');
  // A concrete replacement label must be present.
  assert.ok(/>\s*AI Lead Builder\s*</.test(HTML),
    'AI Lead Builder concrete nav label not found');
});

test('13. System Flow / System Readiness tab removed from primary nav (Phase 21F)', () => {
  // Phase 21F removed the internal readiness tab entirely (it had no
  // buyer-facing purpose). The nav button and pane must both be gone.
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML),
    'sysflow nav button still present — should be removed');
  assert.ok(!/id="tab-sysflow"/.test(HTML),
    'tab-sysflow pane still present — should be removed');
});

test('14. Renderer boot test still passes', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'test/renderer-boot.test.js')], { encoding: 'utf8' });
  assert.ok(/PASS — \d+\/\d+ renderer-boot checks/.test(out),
    'renderer-boot test no longer passes:\n' + out.slice(-400));
});

console.log('\n── Phase 21D safety guards ──');

test('Source label exists and updates on Import / Paste', () => {
  assert.ok(/id="rd-source-label"/.test(PANE), 'rd-source-label element missing');
  assert.ok(/function rdSetSource/.test(HTML), 'rdSetSource() handler missing');
});

test('clearRA() clears the new import fields', () => {
  const clr = HTML.slice(HTML.indexOf('function clearRA()'),
                         HTML.indexOf('function clearRA()') + 2800);
  for (const id of ['ra-from', 'ra-subject', 'ra-received']) {
    assert.ok(clr.includes("'" + id + "'"), 'clearRA does not clear ' + id);
  }
  assert.ok(/rd-import-detail/.test(clr), 'clearRA must hide rd-import-detail');
});

test('No fake operator IDs reintroduced in user-facing markup', () => {
  const userMarkup = HTML.slice(0, HTML.indexOf('<script>'));
  for (const bad of ['appXXXXXXXXXXXXXXX', 'ti5tlit9s9ir0sr1vha7vqjyemcuvlnq',
                     'jpu2xjxufd8x7yt3qnsk9ntxd0ns77jk']) {
    assert.ok(!userMarkup.includes(bad), 'fake operator ID reintroduced: ' + bad);
  }
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} response-desk-email-import tests ===`
  : `=== FAIL — ${failed}/${total} response-desk-email-import tests failed ===`);
if (failed > 0) process.exit(1);

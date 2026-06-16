/**
 * Phase 25X — Solicitation deadline / timer.
 *
 * Asserts timing fields are stored on save, displayed as advisory timers,
 * and that a missing deadline can be entered manually (no guessing).
 *
 * Run:  node test/phase-25x-solicitation-timer.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — Solicitation timer ===\n');

test('saved pursuit stores timing fields on save', () => {
  const up = HTML.slice(HTML.indexOf('async function _samUpsert('), HTML.indexOf('async function _samUpsert(') + 3500);
  for (const f of ['responseDeadline:', 'questionDeadline:', 'siteVisitDeadline:', 'userAddedQuestionDeadline:', 'savedAt:', 'lastRefreshedAt:']) {
    assert.ok(up.indexOf(f) >= 0, 'missing timing field on save: ' + f);
  }
});

test('saved pursuit row shows an advisory timer', () => {
  assert.ok(/_savedTimerText\(/.test(HTML), 'saved-row timer helper present');
  assert.ok(/Questions due /.test(HTML), 'questions-due timer text');
  assert.ok(/Proposal due /.test(HTML), 'proposal-due timer text');
  assert.ok(/Deadline not found — add manually/.test(HTML), 'missing-deadline message');
});

test('first impression page exposes editable deadline fields + timer', () => {
  for (const id of ['gc-fi-response-deadline', 'gc-fi-question-deadline', 'gc-fi-sitevisit-deadline', 'gc-fi-timezone', 'gc-fi-timers']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'missing field: ' + id);
  }
  assert.ok(/gcFiSaveDeadlines/.test(HTML), 'deadline save handler present');
});

test('missing deadline → manual entry, timezone handled honestly', () => {
  assert.ok(/Deadline not found — add manually below\./.test(HTML), 'manual-entry prompt present');
  assert.ok(/timezone not stated/.test(HTML), 'timezone-not-stated honesty present');
  assert.ok(/Advisory until verified against the solicitation\./.test(HTML), 'advisory-until-verified note present');
});

test('timer does not guess — only renders parsed deadlines', () => {
  // renderTimers builds lines only from parsed dates; otherwise shows the
  // "not found" message rather than fabricating a deadline.
  assert.ok(/function renderTimers\(\)/.test(HTML), 'renderTimers present');
  assert.ok(/parseDate\(/.test(HTML), 'parses dates before showing a timer');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X solicitation-timer checks ===\n`);
process.exit(failed ? 1 : 0);

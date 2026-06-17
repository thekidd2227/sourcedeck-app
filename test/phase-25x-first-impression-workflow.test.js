/**
 * Phase 25X — Make the Right First Impression workflow.
 *
 * Asserts the page lives under Proposal Workspace (not a sidebar item),
 * exposes source selection, generate/draft controls, output controls, and
 * has no send/auto-contact surface.
 *
 * Run:  node test/phase-25x-first-impression-workflow.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — First Impression workflow ===\n');

test('Make the Right First Impression lives under Proposal Workspace', () => {
  const exec = HTML.slice(HTML.indexOf('id="tab-execution"'), HTML.indexOf('id="tab-execution"') + 120000);
  assert.ok(/id="pw-first-impression"/.test(exec), 'first impression card inside Proposal Workspace');
  assert.ok(/Make the Right First Impression/.test(exec), 'title present in pane');
});

test('not a main sidebar clutter item', () => {
  assert.ok(!/data-tab="first-impression"/.test(HTML), 'no first-impression sidebar tab');
  assert.ok(!/data-tab="firstimpression"/.test(HTML), 'no firstimpression sidebar tab');
  assert.ok(!/class="nav-btn"[^>]*First Impression/.test(HTML), 'no sidebar nav button for first impression');
});

test('saved pursuit + solicitation shortcuts open it', () => {
  assert.ok(/gcFiOpenFor\(/.test(HTML), 'gcFiOpenFor shortcut present');
  assert.ok(/Make First Impression/.test(HTML), 'Make First Impression shortcut label present');
  assert.ok(/window\.gcFiOpenFor = async function/.test(HTML), 'shortcut opens Proposal Workspace + loads solicitation');
  assert.ok(/openTab\('execution'\)/.test(HTML), 'shortcut routes to Proposal Workspace');
});

test('selected solicitation loads + source selection exists', () => {
  assert.ok(/id="gc-fi-sol-select"/.test(HTML), 'saved pursuit source selector present');
  assert.ok(/gcFiSelectSolicitation/.test(HTML), 'selection loads solicitation');
  assert.ok(/id="gc-fi-text"/.test(HTML), 'local notes text area present');
  assert.ok(/Download the solicitation package or add local notes before generating questions\./.test(HTML), 'no-source guidance present');
});

test('generate + draft controls exist', () => {
  assert.ok(/Generate 3 Clarification Questions/.test(HTML), 'generate questions button');
  assert.ok(/gcFiGenerateQuestions/.test(HTML), 'generate questions handler');
  assert.ok(/Draft COR Email/.test(HTML), 'draft COR email button');
  assert.ok(/gcFiDraftEmail/.test(HTML), 'draft email handler');
});

test('output controls exist (copy/save/review/reset)', () => {
  for (const [label, fn] of [['Copy Questions','gcFiCopyQuestions'],['Copy Email','gcFiCopyEmail'],['Save Draft Locally','gcFiSave'],['Mark Reviewed','gcFiMarkReviewed'],['Reset Draft','gcFiReset']]) {
    assert.ok(HTML.indexOf(label) >= 0, 'missing control label: ' + label);
    assert.ok(HTML.indexOf(fn) >= 0, 'missing handler: ' + fn);
  }
});

test('no Send button / no auto-contact', () => {
  const card = HTML.slice(HTML.indexOf('id="pw-first-impression"'), HTML.indexOf('id="pw-first-impression"') + 9000);
  assert.ok(!/>Send Email</.test(card), 'no Send Email button in first impression');
  assert.ok(!/>Send</.test(card), 'no Send button in first impression');
  assert.ok(/SourceDeck does not send email/.test(HTML), 'no-send footer present');
  assert.ok(!/auto-?contact/i.test(card) || /does not/i.test(card), 'no auto-contact claim');
});

test('concise footer, no heavy Human Review panel in the card', () => {
  const start = HTML.indexOf('id="pw-first-impression"');
  const card = HTML.slice(start, HTML.indexOf('class="grid-2"', start));
  assert.ok(!/Human Review Required/.test(card), 'no heavy Human Review Required panel in card');
  assert.ok(/Draft only\. SourceDeck does not send email\. Verify solicitation communication rules before contacting the COR\./.test(card), 'concise footer present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X first-impression-workflow checks ===\n`);
process.exit(failed ? 1 : 0);

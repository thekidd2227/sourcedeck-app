/**
 * Phase 25Y — Award intelligence links to a saved pursuit.
 * Run:  node test/phase-25y-awards-linked-to-pursuit.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Awards linked to pursuit ===\n');

test('saved award intelligence records a linked pursuit id', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcCaSaveIntel = function'), HTML.indexOf('window.gcCaSaveIntel = function') + 900);
  assert.ok(/linkedPursuitId/.test(fn), 'records linkedPursuitId');
  assert.ok(/sd\.govcon\.activeSolicitation\.v1/.test(fn), 'links to the active solicitation');
  assert.ok(/sd\.govcon\.awardIntel\.v1/.test(HTML), 'persists award intel locally');
});

test('Award / Incumbent Clues helper matches pursuit metadata', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcCaCluesHtml = function'), HTML.indexOf('window.gcCaCluesHtml = function') + 1600);
  assert.ok(/linkedPursuitId === opp\.id/.test(fn), 'matches by linked pursuit id');
  assert.ok(/naics|agency|sol/.test(fn), 'also matches by naics/agency/sol');
  assert.ok(/No award\/incumbent data linked yet\. Search Contract Awards\./.test(fn), 'no-clue fallback');
});

test('clues surfaced in saved pursuit source panel', () => {
  assert.ok(/gcCaCluesHtml\(o\)/.test(HTML), 'clues rendered in source panel');
  assert.ok(/Award \/ Incumbent Clues/.test(HTML), 'award clues label present');
});

test('clues are verify-on-source, not asserted as fact', () => {
  const fn = HTML.slice(HTML.indexOf('window.gcCaCluesHtml = function'), HTML.indexOf('window.gcCaCluesHtml = function') + 1600);
  assert.ok(/verify on source/.test(fn), 'clue rows carry verify-on-source');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y awards-linked-to-pursuit checks ===\n`);
process.exit(failed ? 1 : 0);

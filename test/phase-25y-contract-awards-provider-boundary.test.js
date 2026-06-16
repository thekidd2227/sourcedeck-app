/**
 * Phase 25Y — Contract Awards provider boundary (honest, no fabrication).
 * Run:  node test/phase-25y-contract-awards-provider-boundary.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Contract Awards provider boundary ===\n');

test('provider configured check exists', () => {
  assert.ok(/function awardProviderConfigured\(\)/.test(HTML), 'awardProviderConfigured present');
  assert.ok(/window\.sd\.govcon\.awardsSearch/.test(HTML), 'looks for an awards bridge');
});

test('no provider → honest message, no fake results', () => {
  const run = HTML.slice(HTML.indexOf('window.gcCaRunSearch = async function'), HTML.indexOf('window.gcCaRunSearch = async function') + 1000);
  assert.ok(/No contract-award data provider configured/.test(HTML), 'no-provider message present');
  assert.ok(/awardProviderConfigured\(\)/.test(run), 'run checks provider first');
  // never injects hardcoded award rows
  assert.ok(!/_caRows\s*=\s*\[\{/.test(HTML), 'no hardcoded award rows');
});

test('pasted award data can be structured; requires awardee or contract #', () => {
  const pr = HTML.slice(HTML.indexOf('function parseAwards('), HTML.indexOf('function parseAwards(') + 1600);
  assert.ok(/if \(!awardee && !contract\) continue/.test(pr), 'never invents an award without identity');
  assert.ok(/awardee|recipient|contractor/.test(pr), 'maps awardee fields');
});

test('award source links are key-safe', () => {
  const pr = HTML.slice(HTML.indexOf('function parseAwards('), HTML.indexOf('function parseAwards(') + 1600);
  assert.ok(/!\/api_key\/i\.test\(link\)/.test(pr), 'drops api_key-bearing links');
});

test('no raw key leaks in awards module', () => {
  assert.ok(!/api_key=[A-Za-z0-9]{6,}/.test(HTML), 'no raw key literal');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y contract-awards-provider-boundary checks ===\n`);
process.exit(failed ? 1 : 0);

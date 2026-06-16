/**
 * Phase 25X — Web Intel provider boundary.
 *
 * Asserts that without a web-capable provider, SourceDeck shows a search-plan
 * / copy-prompt fallback and never fabricates live results; and that the
 * prompt template enforces active-only, title+URL, verify-on-source rules.
 *
 * Run:  node test/phase-25x-web-intel-provider-boundary.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — Web Intel provider boundary ===\n');

test('web-capability is checked through the AI provider boundary', () => {
  assert.ok(/function providerWebCapable\(\)/.test(HTML), 'provider capability check present');
  assert.ok(/sd\.aiProviderStatus/.test(HTML), 'reads AI provider status');
  // 'local' deterministic provider is NOT treated as web-capable.
  assert.ok(/st\.provider !== 'local'/.test(HTML), 'local provider excluded from web capability');
});

test('no web provider → search-plan / copy-prompt fallback, no fake results', () => {
  const run = HTML.slice(HTML.indexOf('window.gcWiRunSearch = async function'), HTML.indexOf('window.gcWiRunSearch = async function') + 1200);
  assert.ok(/No web-search provider configured\./.test(HTML), 'no-provider message present');
  assert.ok(/cannot verify live web opportunities until a web-capable provider is connected/.test(HTML), 'honest provider message');
  assert.ok(/gcWiGenerateSearchPlan\(\)/.test(run), 'falls back to a search plan');
  // No fabricated rows are injected when there is no provider.
  assert.ok(!/_wiRows\s*=\s*\[\{/.test(HTML), 'no hardcoded fabricated result rows');
});

test('live path goes through sd.ai.generate (credential boundary)', () => {
  const run = HTML.slice(HTML.indexOf('window.gcWiRunSearch = async function'), HTML.indexOf('window.gcWiRunSearch = async function') + 1600);
  assert.ok(/window\.sd\.ai\.generate/.test(run), 'live path uses the AI provider boundary');
});

test('prompt template enforces active-only + verify-on-source + no fabrication', () => {
  const bp = HTML.slice(HTML.indexOf('function buildPrompt('), HTML.indexOf('function buildPrompt(') + 2600);
  assert.ok(/ACTIVE or FUTURE/.test(bp), 'active/future only');
  assert.ok(/Exclude expired, awarded, or cancelled/.test(bp), 'excludes expired/awarded/cancelled');
  assert.ok(/title and a working source URL/.test(bp), 'requires title + URL');
  assert.ok(/VERIFY ON SOURCE/.test(bp), 'deadlines verify-on-source');
  assert.ok(/Never fabricate solicitation numbers, agencies, or deadlines/.test(bp), 'no fabrication rule');
  assert.ok(/inaccessible/.test(bp), 'inaccessible/blocked report required');
});

test('no login scraping / bypass claims (negative posture only)', () => {
  // "scrape"/"login" only appear in forbidding/negative copy. Assert there is
  // no POSITIVE bypass/scrape claim, and the explicit no-scrape posture exists.
  assert.ok(!/we (scrape|bypass)|bypasses login|logs in automatically|scrapes login-protected/i.test(HTML), 'no positive login-scrape/bypass claim');
  assert.ok(/no login bypass/i.test(HTML) || /Do not scrape login-protected/.test(HTML), 'explicit no-scrape posture present');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X web-intel-provider-boundary checks ===\n`);
process.exit(failed ? 1 : 0);

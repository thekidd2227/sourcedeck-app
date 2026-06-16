/**
 * Phase 25X — COR email + clarification question draft boundaries.
 *
 * Asserts the COR email uses the company profile (not hardcoded ARCG),
 * includes the 3 questions, does not overclaim, and never sends.
 *
 * Run:  node test/phase-25x-cor-email-draft.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25X — COR email draft ===\n');

test('email uses company profile from Settings, prefilled when available', () => {
  assert.ok(/gcFiLoadProfile/.test(HTML), 'profile loader present');
  assert.ok(/sd\.govcon\.profile\.get/.test(HTML), 'reads company profile from operating profile');
  for (const id of ['gc-fi-company', 'gc-fi-certs', 'gc-fi-capability', 'gc-fi-contact', 'gc-fi-email', 'gc-fi-phone']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'missing company field: ' + id);
  }
});

test('ARCG is only a placeholder, never a hardcoded value', () => {
  // ARCG may appear as placeholder text but must not be assigned as a default value.
  assert.ok(!/value="ARCG/.test(HTML), 'ARCG must not be a hardcoded field value');
  assert.ok(/ARCG appears only as demo placeholder text until you set your own profile\./.test(HTML), 'ARCG placeholder-only note present');
  // The profile loader only fills empty fields (does not override / inject ARCG).
  assert.ok(/if \(el && !el\.value && val\) el\.value = val/.test(HTML), 'profile loader fills only empty fields');
});

test('email includes the 3 clarification questions', () => {
  const fn = HTML.slice(HTML.indexOf('function buildEmail('), HTML.indexOf('function buildEmail(') + 1800);
  assert.ok(/qs\.forEach/.test(fn), 'email iterates the questions');
  assert.ok(/clarification on the following/.test(fn), 'email frames the questions');
});

test('email does not overclaim / claim award entitlement', () => {
  const fn = HTML.slice(HTML.indexOf('function buildEmail('), HTML.indexOf('function buildEmail(') + 1800);
  assert.ok(!/guaranteed award|entitled to award|will win|best qualified|most qualified/i.test(fn), 'no overclaim language');
  assert.ok(/interested in submitting a proposal/.test(fn), 'states interest, not entitlement');
});

test('no send — draft only', () => {
  assert.ok(!/gcFiSendEmail|sendCorEmail|\.sendMail\(/.test(HTML), 'no send function');
  assert.ok(/SourceDeck does not send email/.test(HTML), 'no-send copy present');
});

test('questions carry question/why/source/risk and never fabricate citations', () => {
  const an = HTML.slice(HTML.indexOf('function analyze('), HTML.indexOf('function analyze(') + 2600);
  assert.ok(/risk:/.test(an), 'risk level present');
  assert.ok(/why:/.test(an), 'why-it-matters present');
  assert.ok(/source section not identified/.test(an), 'honest fallback when source not identified');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25X cor-email-draft checks ===\n`);
process.exit(failed ? 1 : 0);

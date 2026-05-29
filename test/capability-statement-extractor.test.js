/**
 * Capability statement extractor tests.
 * Pure node assert. Synthetic text only. Run:
 *   node test/capability-statement-extractor.test.js
 */
'use strict';
const assert = require('assert');
const ext = require('../services/govcon/capability-statement-extractor');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); }
}

const SAMPLE = [
  'Acme Federal Solutions LLC — Capability Statement',
  'Legal Name: Acme Federal Solutions LLC',
  'UEI: ABC123DEF456    CAGE Code: 1AB2C',
  'NAICS: 541512 541611 561210',
  'PSC: D310 R425',
  'Certifications: SDVOSB, HUBZone, 8(a)',
  'Core Services:',
  '- Tier 1/2 help desk',
  '- Cloud migration',
  '- Cybersecurity assessments',
  'Differentiators:',
  '- 24/7 CONUS coverage',
  '- 99.7% SLA track record',
  'Past Performance:',
  '- VA help desk, 3 years, Very Good CPARS'
].join('\n');

console.log('\n── capability statement extractor ──');

test('extracts UEI and CAGE from labeled text', () => {
  const ids = ext.extractBusinessIdentifiers(SAMPLE);
  assert.strictEqual(ids.uei, 'ABC123DEF456');
  assert.strictEqual(ids.cage, '1AB2C');
});

test('normalizes NAICS codes', () => {
  const naics = ext.normalizeNaicsCodes(SAMPLE);
  assert.ok(naics.includes('541512') && naics.includes('541611') && naics.includes('561210'));
});

test('normalizes PSC codes', () => {
  const psc = ext.normalizePscCodes(SAMPLE);
  assert.ok(psc.includes('D310'), 'expected D310 in ' + psc.join(','));
});

test('detects certifications', () => {
  const certs = ext.detectCertifications(SAMPLE);
  assert.ok(certs.includes('SDVOSB') && certs.includes('HUBZone') && certs.includes('8(a)'));
});

test('extracts services and differentiators', () => {
  const services = ext.extractServices(SAMPLE);
  const diffs = ext.extractDifferentiators(SAMPLE);
  assert.ok(services.length >= 2, 'services: ' + services.length);
  assert.ok(diffs.some(d => /24\/7|SLA/i.test(d)), 'diffs: ' + diffs.join('|'));
});

test('full extraction is candidate-only and never verified', () => {
  const r = ext.extractCapabilityStatementFields(SAMPLE);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.verified, false, 'must never be verified');
  assert.strictEqual(r.requiresApproval, true, 'must require approval');
  assert.ok(r.candidates && r.candidates.uei === 'ABC123DEF456');
  assert.ok(r.confidence && typeof r.confidence.uei === 'string');
  assert.match(r.note, /not verified|approve/i);
});

test('empty input returns ok:false without throwing', () => {
  const r = ext.extractCapabilityStatementFields('');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'no_text');
});

test('confidenceLabel reflects evidence strength', () => {
  assert.strictEqual(ext.confidenceLabel('X', 'labeled'), 'high');
  assert.strictEqual(ext.confidenceLabel('X', 'pattern'), 'medium');
  assert.strictEqual(ext.confidenceLabel('', 'labeled'), 'none');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} capability-statement-extractor tests ===`
  : `=== FAIL — ${failed}/${total} capability-statement-extractor tests failed ===`);
if (failed > 0) process.exit(1);

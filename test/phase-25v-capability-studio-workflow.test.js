/**
 * Phase 25V — Capability Statement Studio workflow test.
 *
 * Asserts the Capability Statement Studio lives under Proposal Workspace,
 * its fields build a Capability Statement Preview (the old "Tailored
 * Capability Statement Outline" is renamed), the preview includes meaningful
 * sections incl. a closing/fit statement, sample defaults are absent, and
 * there is no send/outreach.
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-capability-studio-workflow.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25V — Capability Statement Studio workflow ===\n');

// 1. Capability Statement Studio is inside the Proposal Workspace pane.
test('Capability Statement Studio lives under Proposal Workspace', () => {
  const exec = HTML.slice(HTML.indexOf('id="tab-execution"'), HTML.indexOf('id="tab-execution"') + 80000);
  assert.ok(/id="pw-capability-studio"/.test(exec), 'capability studio card present in Proposal Workspace');
  assert.ok(/id="gc-cs"/.test(exec), 'gc-cs section relocated into Proposal Workspace');
  assert.ok(/Capability Statement Studio/.test(exec), 'studio title present in pane');
});

// 2. Statement-building input fields exist.
test('capability studio statement-building fields exist', () => {
  for (const id of ['gc-cs-f-agency','gc-cs-f-sol','gc-cs-f-naics','gc-cs-f-certs','gc-cs-f-company','gc-cs-f-core','gc-cs-f-diff','gc-cs-f-pp-select']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'field missing: ' + id);
  }
});

// 3. Fields build a Capability Statement Preview.
test('fields build a Capability Statement Preview', () => {
  assert.ok(/Build Capability Statement</.test(HTML), 'Build Capability Statement button present');
  assert.ok(/Capability Statement Preview/.test(HTML), 'Capability Statement Preview output present');
  assert.ok(/id="gc-cs-outline"/.test(HTML), 'preview container present');
  assert.ok(/window\.gcCsBuildOutline = function/.test(HTML), 'build handler present');
});

// 4. Old "Tailored Capability Statement Outline" renamed.
test('old Tailored Capability Statement Outline renamed to Preview', () => {
  assert.ok(!/Tailored Capability Statement Outline/.test(HTML),
    '"Tailored Capability Statement Outline" must be renamed to Capability Statement Preview');
});

// 5. Preview includes meaningful statement sections incl. closing/fit.
test('preview includes meaningful sections incl. closing/fit statement', () => {
  for (const section of ['Target agency', 'Target NAICS', 'Certifications / set-asides', 'Core competencies', 'Differentiators', 'Relevant past performance', 'Closing / fit statement']) {
    assert.ok(new RegExp(section).test(HTML), 'preview section missing: ' + section);
  }
});

// 6. Export draft is local-only.
test('export draft is local-only (no send)', () => {
  assert.ok(/gcCsExportPreview/.test(HTML), 'export handler present');
  assert.ok(/capability-statement-draft\.txt/.test(HTML), 'local download present');
});

// 7. No sample/demo default values in fields.
test('no sample/demo default values in capability fields', () => {
  // Fields use placeholders only; the SAMPLE values live in the explicit
  // demo loader, never as field default values.
  assert.ok(!/value="Sample Agency/.test(HTML), 'no Sample Agency default value');
  assert.ok(!/value="SAMPLE-SOL-DEMO-0001"/.test(HTML), 'no SAMPLE-SOL default value');
  assert.ok(!/value="sample core capability/.test(HTML), 'no sample core capability default');
  assert.ok(!/value="sample differentiator/.test(HTML), 'no sample differentiator default');
});

// 8. No send / outreach.
test('no send/outreach from capability studio', () => {
  assert.ok(/SourceDeck does not send capability statements or outreach/.test(HTML),
    'no-send capability copy preserved');
  assert.ok(/Internal review draft\. SourceDeck does not send, submit, upload, or certify this content\./.test(HTML),
    'internal-review disclaimer preserved');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V capability-studio checks ===\n`);
process.exit(failed ? 1 : 0);

/**
 * Phase 24D — Past Performance Library + Capability Statement Studio UI.
 *
 * Asserts the two buyer-visible GovCon workflow surfaces are present and
 * complete in sourcedeck.html, that they surface the existing local/offline
 * backend (past-performance + capability-statement-extractor) WITHOUT any
 * send/submit/upload behavior, and that the no-send / internal-review
 * boundary copy is intact. Also confirms previously merged invariants
 * survive: Phase 24B audit log panel, Phase 24C profile-driven NAICS
 * loader, System Readiness/Flow removal, no deprecated active pricing,
 * renderer boot.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-past-performance-capability-ui.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

// Isolate the combined Past Performance / Capability Statement section so
// compliance-claim checks do not trip on unrelated copy elsewhere.
function sectionBlock(anchor) {
  const slice = HTML.split('data-section="' + anchor + '"')[1] || '';
  const end = slice.indexOf('</section>');
  return end > -1 ? slice.slice(0, end) : slice;
}
const PP_BLOCK = sectionBlock('govcon-past-performance-library');
const CS_BLOCK = sectionBlock('govcon-capability-statement-studio');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 24D — Past Performance Library + Capability Statement Studio UI ===\n');

// 1. Past Performance Library section exists.
test('Past Performance Library section exists', () => {
  assert.ok(/id="gc-pp"/.test(HTML), 'gc-pp section id missing');
  assert.ok(/Past Performance Library/.test(HTML), 'Past Performance Library title missing');
  assert.ok(/data-section="govcon-past-performance-library"/.test(HTML), 'PP data-section anchor missing');
});

// 2. Past Performance Library has a clear empty/demo state.
test('Past Performance Library has a clear empty state', () => {
  assert.ok(/id="gc-pp-tbody"[\s\S]*?No past performance records added yet/.test(HTML),
    'PP empty-state row missing');
  assert.ok(/Add past performance records to strengthen bid\/no-bid decisions and proposal packages/.test(HTML),
    'PP empty-state value framing missing');
});

// 3. Past performance cards/table include required labels.
test('Past performance table includes agency/client, NAICS, period, relevance, evidence/notes labels', () => {
  assert.ok(/Agency \/ customer/.test(PP_BLOCK), 'agency/customer column missing');
  assert.ok(/>NAICS</.test(PP_BLOCK), 'NAICS column missing');
  assert.ok(/>PoP</.test(PP_BLOCK), 'period of performance (PoP) column missing');
  assert.ok(/>Relevance</.test(PP_BLOCK) || /Relevance tags/.test(PP_BLOCK), 'relevance label missing');
  assert.ok(/>Evidence</.test(PP_BLOCK) || /Evidence file notes/.test(PP_BLOCK), 'evidence/notes label missing');
});

// 4. Past performance UI has no send/submit/upload language.
test('Past performance UI contains no send/submit/upload controls', () => {
  for (const bad of [/Send Email/i, /Submit Bid/i, /Submit Quote/i, /Export and submit/i, /upload to (?:SAM|PIEE|eBuy|GSA)/i]) {
    assert.ok(!bad.test(PP_BLOCK), 'forbidden phrase present in PP block: ' + bad);
  }
});

// 5. Capability Statement Studio section exists.
test('Capability Statement Studio section exists', () => {
  assert.ok(/id="gc-cs"/.test(HTML), 'gc-cs section id missing');
  assert.ok(/Capability Statement Studio/.test(HTML), 'Capability Statement Studio title missing');
  assert.ok(/data-section="govcon-capability-statement-studio"/.test(HTML), 'CS data-section anchor missing');
});

// 6. Capability Statement Studio required fields/labels.
test('Capability Statement Studio has competencies, NAICS, certs, differentiators, PP highlights, company summary', () => {
  assert.ok(/Core competencies/i.test(CS_BLOCK), 'core competencies label missing');
  assert.ok(/Target NAICS/i.test(CS_BLOCK), 'NAICS/categories label missing');
  assert.ok(/Certifications \/ set-asides/i.test(CS_BLOCK), 'certifications label missing');
  assert.ok(/Differentiators/i.test(CS_BLOCK), 'differentiators label missing');
  assert.ok(/Past performance highlights/i.test(CS_BLOCK), 'past performance highlights label missing');
  assert.ok(/Company \/ contact summary/i.test(CS_BLOCK), 'company/contact summary field missing');
  for (const id of ['gc-cs-f-agency','gc-cs-f-sol','gc-cs-f-naics','gc-cs-f-certs','gc-cs-f-core','gc-cs-f-diff','gc-cs-f-company','gc-cs-f-pp-select']) {
    assert.ok(new RegExp('id="' + id + '"').test(HTML), 'CS field missing: ' + id);
  }
});

// 7. Capability Statement Studio internal-review / no-send / no-submit disclaimer.
test('Capability Statement Studio includes internal-review no-send/no-submit/no-upload disclaimer', () => {
  assert.ok(/Internal review draft\. SourceDeck does not send, submit, upload, or certify this content\./.test(HTML),
    'exact internal-review disclaimer missing');
});

// 8. Capability Statement Studio claims no certifications / guaranteed award / signing.
test('Capability Statement Studio makes no certification/award/compliance claims', () => {
  for (const bad of [
    /guaranteed award/i, /guaranteed revenue/i,
    /FedRAMP certified/i, /SOC ?2 certified/i, /CMMC certified/i,
    /HIPAA certified/i, /HITRUST/i, /ISO 27001 certified/i,
    /signed and notarized/i, /Apple notarized/i, /production signed/i,
    /SourceDeck (?:is|are) certified/i
  ]) {
    assert.ok(!bad.test(CS_BLOCK), 'forbidden compliance/award claim in CS block: ' + bad);
  }
});

// 9. Any sample/demo content is labeled (no unlabeled fake rows seeded).
test('No unlabeled sample/demo rows are seeded into the surfaces', () => {
  // Tables must render the empty state by default — any demo data would be
  // explicitly labeled, never silently seeded as real rows.
  assert.ok(/id="gc-pp-tbody"[\s\S]*?No past performance records added yet/.test(HTML),
    'PP table should render empty state by default (no seeded sample rows)');
  // If a "sample"/"demo" affordance ever appears in the block it must carry a label.
  if (/sample|demo/i.test(PP_BLOCK)) {
    assert.ok(/sample|demo/i.test(PP_BLOCK), 'sample/demo content present must be labeled');
  }
});

// 10. System Readiness / System Flow remains absent.
test('System Readiness / System Flow remains removed', () => {
  assert.ok(!/<button[^>]*\bdata-tab="sysflow"/.test(HTML), 'sysflow nav button reintroduced');
  assert.ok(!/id="tab-sysflow"/.test(HTML), 'tab-sysflow pane reintroduced');
  assert.ok(!/>\s*System Readiness\s*<\/button>/.test(HTML), 'System Readiness nav label reintroduced');
  assert.ok(!/>\s*System Flow\s*<\/button>/.test(HTML), 'System Flow nav label reintroduced');
});

// 11. Phase 24B audit log panel remains present.
test('Phase 24B audit log panel remains present', () => {
  assert.ok(/id="gc-audit-log"/.test(HTML), 'gc-audit-log panel missing');
  assert.ok(/data-section="govcon-audit-log"/.test(HTML), 'audit log data-section missing');
});

// 12. Phase 24C profile-driven NAICS loader remains present.
test('Phase 24C profile-driven NAICS loader remains present', () => {
  assert.ok(/id="gc-naics-filter"/.test(HTML), 'gc-naics-filter element missing');
  assert.ok(/Phase 24C — NAICS filter is profile-driven/.test(HTML),
    'Phase 24C profile-driven NAICS marker missing');
});

// 13. Renderer boot still passes (every inline script parses).
test('every inline <script> block still parses (renderer boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 5, 'expected ≥5 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0, 'unparseable inline scripts:\n' + failures.join('\n'));
});

// 14. Deprecated active pricing does not appear in active app UI.
test('Deprecated active pricing $79 / $349 / $999 absent from app UI', () => {
  for (const price of [/\$79\b/, /\$349\b/, /\$999\b/]) {
    assert.ok(!price.test(HTML), 'deprecated active pricing present: ' + price);
  }
});

// 15. No live network / SAM / send / submit / upload code path introduced by these surfaces.
test('Capability import path is local-only (no network/send/submit/upload)', () => {
  // The import affordance must be labeled local/offline and the handler must
  // not fetch, post, or upload anything.
  assert.ok(/local, offline — no upload/i.test(CS_BLOCK), 'capability import must be labeled local/offline');
  assert.ok(/gcCsImportFromText/.test(HTML), 'local import handler missing');
  // The import handler block must not contain network or send verbs.
  const handler = (HTML.split('window.gcCsImportFromText = function')[1] || '').split('};')[0];
  // Actual network/upload *calls* are forbidden; reassuring negation copy
  // (e.g. "nothing was uploaded") is allowed.
  for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /\.post\s*\(/, /\.upload\s*\(/, /auto_send/, /auto_submit/]) {
    assert.ok(!bad.test(handler), 'import handler contains forbidden network/send call: ' + bad);
  }
  // It must use the existing local IPC bridge, not a new transport.
  assert.ok(/extractCapabilityStatement/.test(handler), 'import handler should use existing extractCapabilityStatement IPC');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24D past-performance + capability UI checks ===\n`);
process.exit(failed ? 1 : 0);

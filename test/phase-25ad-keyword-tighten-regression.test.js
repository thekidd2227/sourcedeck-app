/**
 * Phase 25AD — Keyword tighten regression.
 *
 * Phase 25AA-TIGHTEN-2 narrowed the SAM.gov keyword haystack to verified
 * text fields (title / solicitationNumber / noticeId / description) and
 * added a per-row "match reason". Phase 25AD makes no UI changes to the
 * keyword logic; this regression test makes sure none of that wiring
 * accidentally slipped during the Saved Pursuit / Right-side Viewer work.
 *
 * Asserts:
 *   - _samKeywordMatchReason + _samMatchesKeyword still exist and the
 *     match-reason gate is wired up (delegation).
 *   - The active runtime never references the "keyword matched by SAM.gov
 *     full-text" copy that this tighten retired.
 *   - The SAM haystack still excludes agency / NAICS / classification
 *     fields (the source of the original false positives).
 *   - The cache filename remains the JSON variant — better-sqlite3 was
 *     never adopted.
 *
 * Run:  node test/phase-25ad-keyword-tighten-regression.test.js
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

console.log('\n=== Phase 25AD — Keyword tighten regression ===\n');

test('_samKeywordMatchReason + _samMatchesKeyword still exposed on window', () => {
  assert.ok(/window\.gcSamKeywordMatchReason\s*=\s*_samKeywordMatchReason/.test(HTML),
    'window.gcSamKeywordMatchReason must still be exposed');
  assert.ok(/window\.gcSamMatchesKeyword\s*=\s*_samMatchesKeyword/.test(HTML),
    'window.gcSamMatchesKeyword must still be exposed');
});

test('_samMatchesKeyword still delegates to _samKeywordMatchReason', () => {
  assert.ok(/return _samKeywordMatchReason\(r, keyword\) !== null;/.test(HTML),
    '_samMatchesKeyword must delegate to _samKeywordMatchReason');
});

test('runtime does not advertise the retired "keyword matched by SAM.gov full-text" copy', () => {
  // The phrase was removed when the keyword haystack tightened. Any
  // active surface that re-introduces it would re-enable the false
  // positives we just fixed.
  assert.ok(!/keyword matched by SAM\.gov full-text/.test(HTML),
    'removed "keyword matched by SAM.gov full-text" copy must not return');
});

test('SAM haystack stays narrow — no agency / NAICS / classification re-entry', () => {
  // _samRowHaystack must NOT reference agency / naics / classification.
  // We re-extract the function body and assert that those property names
  // do not appear anywhere inside it.
  const m = HTML.match(/function _samRowHaystack\(r\)\{[\s\S]*?\n  \}/);
  assert.ok(m, '_samRowHaystack function must be present');
  const body = m[0];
  assert.ok(!/r\.agency/i.test(body), '_samRowHaystack must NOT include r.agency');
  assert.ok(!/r\.naics/i.test(body),  '_samRowHaystack must NOT include r.naics');
  assert.ok(!/r\.classificationCode/i.test(body),
    '_samRowHaystack must NOT include r.classificationCode');
});

test('local cache backend stays JSON (no better-sqlite3 dep reintroduced)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  assert.ok(!deps['better-sqlite3'], 'better-sqlite3 dep must NOT be added');
  const dbSrc = fs.readFileSync(path.join(ROOT, 'services', 'govcon', 'govcon-index-db.js'), 'utf8');
  assert.ok(/'govcon-cache\.json'/.test(dbSrc),
    'govcon-cache.json filename must still be honest');
  assert.ok(/storageEngine: 'json'/.test(dbSrc),
    'cache state must still carry storageEngine: json');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD keyword regression checks ===');
if (failed > 0) process.exit(1);

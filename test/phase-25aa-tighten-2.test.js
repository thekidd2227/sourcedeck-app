/**
 * Phase 25AA-TIGHTEN-2 — Cache backend honesty + false keyword blocker.
 *
 * The two P0 bugs the mission targets:
 *   1. Phase 25AA cache was named `govcon-cache.sqlite` but the active
 *      backend is JSON (no `better-sqlite3` dependency exists). This
 *      assertion file enforces the rename to `govcon-cache.json` and
 *      asserts a backend/schemaVersion marker exists in the cache root.
 *   2. Keyword search returned unrelated rows (e.g. searching
 *      "janitorial" surfaced boiler testing / fan coil / furniture).
 *      Root cause: the keyword haystack included agency name, NAICS
 *      code/description, and classification code. The new
 *      `_samKeywordMatchReason()` only allows title / solicitationNumber
 *      / noticeId / description text to justify a visible row. This
 *      file evaluates the function via vm.Script against known fixtures.
 *
 * Static; never executes the renderer; never touches the network.
 *
 * Run:  node test/phase-25aa-tighten-2.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AA-TIGHTEN-2 — cache honesty + keyword strictness ===\n');

// ───────────────── Part A — Cache backend honesty ─────────────────

test('govcon-index-db: cache filename is govcon-cache.json (not .sqlite)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'services', 'govcon', 'govcon-index-db.js'), 'utf8');
  assert.ok(/govcon-cache\.json/.test(src),
    'govcon-index-db.js must reference govcon-cache.json');
  assert.ok(!/govcon-cache\.sqlite/.test(src),
    'govcon-index-db.js must NOT reference the misleading .sqlite filename');
  assert.ok(/const BACKEND = 'json'/.test(src),
    'govcon-index-db.js must declare BACKEND constant equal to json');
});

test('govcon-index-db: emptyState carries schemaVersion + backend marker', () => {
  // Spin up the DB against a tmp userData dir and assert the on-disk state.
  const { createGovconIndexDb } = require(path.join(ROOT, 'services', 'govcon', 'govcon-index-db'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25aa-tighten-2-'));
  const db = createGovconIndexDb({ userDataPath: dir });
  const schema = db.ensureSchema();
  assert.strictEqual(path.basename(schema.dbPath), 'govcon-cache.json',
    'dbPath basename must be govcon-cache.json');
  const onDisk = JSON.parse(fs.readFileSync(schema.dbPath, 'utf8'));
  assert.strictEqual(onDisk.backend, 'json', 'cache root must carry backend: "json"');
  assert.strictEqual(onDisk.schemaVersion, 1, 'cache root must carry schemaVersion: 1');
  assert.strictEqual(onDisk.storageEngine, 'json',
    'cache root storageEngine must equal "json" (no "jsonl-fallback" mislabel)');
  assert.ok(typeof onDisk.createdAt === 'string' && onDisk.createdAt.length > 0,
    'cache root must carry createdAt');
  assert.ok(typeof onDisk.updatedAt === 'string' && onDisk.updatedAt.length > 0,
    'cache root must carry updatedAt');
});

test('no active code claims SQLite/FTS is implemented (better-sqlite3 not in package.json)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  assert.ok(!allDeps['better-sqlite3'],
    'better-sqlite3 must NOT be in dependencies (no SQLite implementation present)');
});

test('docs name the cache govcon-cache.json (no active .sqlite claim)', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'docs', 'product', 'phase-25aa-govcon-local-index-contract.md'), 'utf8');
  const audit = fs.readFileSync(path.join(ROOT, 'docs', 'audits', 'phase-25aa-govcon-index-architecture-audit.md'), 'utf8');
  assert.ok(/govcon-cache\.json/.test(contract),
    'contract doc must reference govcon-cache.json');
  assert.ok(/govcon-cache\.json/.test(audit),
    'audit doc must reference govcon-cache.json');
  // Each doc should describe the JSON backend honestly.
  assert.ok(/local JSON-backed GovCon metadata cache/i.test(contract),
    'contract must say "local JSON-backed GovCon metadata cache"');
  assert.ok(/JSON-backed cache file/i.test(audit) || /JSON-backed/i.test(audit),
    'audit must say JSON-backed cache');
  // Neither doc may actively claim SQLite is implemented today.
  assert.ok(!/SQLite implemented/i.test(contract),
    'contract must not claim SQLite is implemented');
  assert.ok(!/FTS implemented/i.test(audit),
    'audit must not claim FTS is implemented');
});

// ───────────────── Part B — Keyword false-positive blocker ─────────────────

// Extract the keyword-related helpers and evaluate them in a sandbox.
function loadKeywordFns(){
  // Pull the GovCon tab IIFE block where _samKeywordMatchReason lives.
  const start = HTML.indexOf('function _samRowHaystack');
  const end   = HTML.indexOf('window.gcSamMatchesKeyword');
  if (start < 0 || end < 0) throw new Error('keyword helper block not found');
  const slice = HTML.slice(start, end + 200);
  // Provide _samKwTokens + _SAM_KW_GENERIC stubs so the helpers stand alone.
  const sandbox = {
    window: {},
    _samKwTokens: function(s){ return String(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); },
    _SAM_KW_GENERIC: {}
  };
  vm.createContext(sandbox);
  vm.runInContext('var _samRowHaystack, _samKeywordMatchReason, _samMatchesKeyword;\n' + slice + '\nwindow._samKeywordMatchReason = _samKeywordMatchReason;\nwindow._samMatchesKeyword = _samMatchesKeyword;', sandbox);
  return sandbox.window;
}

const KW = loadKeywordFns();

// Fixtures the user mission explicitly named.
const FIXTURES = {
  janitorial: { noticeId: 'N-A', solicitationNumber: 'SA-A', title: 'Janitorial Services - Regional Facilities', naicsCode: '561720', agency: 'Some Federal Agency' },
  boiler:     { noticeId: 'N-B', solicitationNumber: 'SA-B', title: 'Boiler testing and recertification', naicsCode: '561720', agency: 'Some Federal Agency' },
  fancoil:    { noticeId: 'N-C', solicitationNumber: 'SA-C', title: 'Fan coil unit replacement', naicsCode: '561720', agency: 'Some Federal Agency' },
  furniture:  { noticeId: 'N-D', solicitationNumber: 'SA-D', title: 'Office furniture supply', naicsCode: '337214', agency: 'Some Federal Agency' },
  cable:      { noticeId: 'N-E', solicitationNumber: 'SA-E', title: 'Cable assembly procurement', naicsCode: '335929', agency: 'Some Federal Agency' },
  frame:      { noticeId: 'N-F', solicitationNumber: 'SA-F', title: 'Frame assembly fabrication', naicsCode: '332710', agency: 'Some Federal Agency' },
  descMatch:  { noticeId: 'N-G', solicitationNumber: 'SA-G', title: 'Facilities support contract', naicsCode: '561210', agency: 'Some Federal Agency', descriptionText: 'Provide janitorial services across multiple buildings.' },
  solMatch:   { noticeId: 'N-H', solicitationNumber: 'JANITORIAL-2026-001', title: 'Combined Facilities IDIQ', naicsCode: '561210', agency: 'Some Federal Agency' }
};

test('keyword "janitorial" HIDES unrelated rows (no agency/NAICS-text false positives)', () => {
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.boiler,    'janitorial'), null, 'boiler must be hidden');
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.fancoil,   'janitorial'), null, 'fan coil must be hidden');
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.furniture, 'janitorial'), null, 'furniture must be hidden');
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.cable,     'janitorial'), null, 'cable assembly must be hidden');
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.frame,     'janitorial'), null, 'frame assembly must be hidden');
});

test('keyword "janitorial" SHOWS rows whose title contains janitorial', () => {
  const reason = KW._samKeywordMatchReason(FIXTURES.janitorial, 'janitorial');
  assert.ok(reason && /^Matched title:/.test(reason),
    'janitorial title row must produce a title match reason; got: ' + reason);
});

test('keyword match reasons cover title / description / solicitation #', () => {
  const t = KW._samKeywordMatchReason(FIXTURES.janitorial, 'janitorial');
  const d = KW._samKeywordMatchReason(FIXTURES.descMatch,  'janitorial');
  const s = KW._samKeywordMatchReason(FIXTURES.solMatch,   'janitorial');
  assert.ok(/^Matched title:/.test(t),                 'title reason expected; got: ' + t);
  assert.ok(/^Matched description:/.test(d),           'description reason expected; got: ' + d);
  assert.ok(/^Matched solicitation #:/.test(s),        'solicitation # reason expected; got: ' + s);
});

test('agency name alone does NOT qualify as a keyword match', () => {
  // Build a fixture where the keyword appears ONLY in the agency string.
  const r = { noticeId: 'N-Z', solicitationNumber: 'SA-Z', title: 'Combined office support', naicsCode: '561210', agency: 'Janitorial Services Agency' };
  assert.strictEqual(KW._samKeywordMatchReason(r, 'janitorial'), null,
    'agency-name-only matches must NOT pass the haystack');
});

test('NAICS code-only does NOT qualify as a keyword match', () => {
  // Title is unrelated; row carries NAICS 561720 (which is "Janitorial Services" in NAICS taxonomy).
  // The new haystack does NOT include NAICS text, so this row must be hidden.
  assert.strictEqual(KW._samKeywordMatchReason(FIXTURES.boiler, 'janitorial'), null,
    'NAICS-code-only matches must NOT pass the haystack');
});

test('no keyword => every row returns "No keyword filter"', () => {
  for (const k of Object.keys(FIXTURES)){
    assert.strictEqual(KW._samKeywordMatchReason(FIXTURES[k], ''), 'No keyword filter',
      'empty keyword must return "No keyword filter" for ' + k);
  }
});

test('helpers are exposed for renderer/UI consumers', () => {
  assert.ok(/window\.gcSamKeywordMatchReason\s*=\s*_samKeywordMatchReason/.test(HTML),
    'window.gcSamKeywordMatchReason exposure missing');
  assert.ok(/window\.gcSamMatchesKeyword\s*=\s*_samMatchesKeyword/.test(HTML),
    'window.gcSamMatchesKeyword exposure missing');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AA-TIGHTEN-2 checks ===');
if (failed > 0) process.exit(1);

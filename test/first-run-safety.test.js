/**
 * First-run safety tests.
 *
 * Proves that the shipping bundle, parsed as flat text and as JS literals,
 * contains no owner-identifying data and no populated seed arrays. These
 * are static guarantees — they hold regardless of what a fresh user does
 * at runtime.
 *
 * Run:  node test/first-run-safety.test.js
 *
 * Exits non-zero on any failure so `npm test` fails.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const SHIPPED = pkg.build && pkg.build.files ? pkg.build.files : [];

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== First-run privacy safety — static checks ===\n');

// 1. No owner brand/identity strings in any shipped file.
const BLOCKED = [
  'ARCG Systems', 'arcgsystems.com', 'digiarcgsystems', '@arcg.ai',
  'Jean-Max Charles', 'jeanmaxc', 'arivergroup',
  '(212) 663-6215', '(718) 320-3300', '555-906-3676',
  'khackett@robertehill.com', 'amarks@maxwellkates.com',
  'askai@harlempm.com', 'fvillalta@almarealty.com',
  'info@apartmentstaffing.com', 'info@centuryny.com',
  'denise@elhmgmt.com', 'office@bluehillrealty.com',
  'info@hendersonproperties.com',
  'Maxwell-Kates', 'Riverbay Corporation', 'Alma Realty Corp',
  'HPM Property Management', 'Henderson Properties',
  'Blue Hill Realty', 'ELH Mgmt LLC',
  'Premier Placements', 'Century Management', 'Robert E. Hill'
];

function readAllShipped() {
  const out = [];
  for (const rel of SHIPPED) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) continue;
    let text = fs.readFileSync(abs, 'utf8');
    // Honor the same ignore markers as scripts/release-check.js so the
    // blocklist-as-data in main.js (scrubStoredData) doesn't flag itself.
    text = text.replace(/\/\/\s*privacy-check:ignore-start[\s\S]*?\/\/\s*privacy-check:ignore-end/g, '');
    out.push({ rel, text });
  }
  return out;
}

test('no shipped file contains an owner-identifying string', () => {
  const files = readAllShipped();
  const offenders = [];
  for (const f of files) {
    for (const b of BLOCKED) {
      if (f.text.includes(b)) offenders.push(`${f.rel} contains "${b}"`);
    }
  }
  assert.strictEqual(offenders.length, 0, 'Found:\n' + offenders.join('\n'));
});

// 2. MOCK_LEADS must be empty.
test('MOCK_LEADS is an empty array in shipping source', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
  const m = html.match(/const\s+MOCK_LEADS\s*=\s*\[([\s\S]*?)\];/m);
  assert(m, 'MOCK_LEADS declaration missing');
  const body = m[1].trim();
  assert(!/\{[\s\S]*?fields[\s\S]*?\}/.test(body),
    'MOCK_LEADS has populated lead entries');
});

// 3. PROMPT_LIBRARY must be empty.
test('PROMPT_LIBRARY is an empty object in shipping source', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
  const m = html.match(/const\s+PROMPT_LIBRARY\s*=\s*\{([\s\S]*?)\};/m);
  assert(m, 'PROMPT_LIBRARY declaration missing');
  const body = m[1].trim();
  assert(!/"[A-Za-z ]+":\s*\{/.test(body),
    'PROMPT_LIBRARY has populated topic entries');
});

// 4. arcg_brand localStorage default must have empty name.
test('default brand object has empty name', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
  const m = html.match(/localStorage\.getItem\('arcg_brand'\)\s*\|\|\s*'([^']+)'/);
  assert(m, 'brand default literal not found');
  const obj = JSON.parse(m[1]);
  assert.strictEqual((obj.name || '').trim(), '',
    'brand default has a pre-set owner name: ' + JSON.stringify(obj.name));
});

// 5. main.js ships the first-run privacy scrub.
test('main.js contains the privacy scrub entrypoint', () => {
  const js = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert(js.includes('scrubStoredData'), 'scrubStoredData() not present');
  assert(js.includes('OWNER_STRING_BLOCKLIST'), 'OWNER_STRING_BLOCKLIST not present');
});

// 6. Demo fixtures are NOT in the shipped files list.
test('demo/fixtures.json is NOT bundled into the packaged app', () => {
  const shipped = (pkg.build && pkg.build.files) || [];
  const mentions = shipped.some(p => p.startsWith('demo/') || p.includes('fixtures.json'));
  assert.strictEqual(mentions, false, 'demo/ is included in build.files — remove it');
});

// 7. Package author is neutral.
test('package.json author is neutral', () => {
  assert.strictEqual(pkg.author, 'SourceDeck', 'package.json author is owner-specific');
});

console.log('\n' + (failed === 0 ? '✅' : '❌') + ' ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed === 0 ? 0 : 1);

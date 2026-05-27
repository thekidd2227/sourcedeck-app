#!/usr/bin/env node

// scripts/audit-i18n.mjs
// Verifies the inline i18n dictionary in sourcedeck.html is healthy.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HTML = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { console.log('  ✅ ' + msg); passed++; }
  else      { console.log('  ❌ ' + msg); failed++; }
}

console.log('=== i18n audit for sourcedeck-app ===\n');

// 1. Spanish dictionary exists
const dictMatch = HTML.match(/var SD_ES\s*=\s*\{([\s\S]*?)\};/);
assert(!!dictMatch, 'Spanish dictionary (SD_ES) exists in sourcedeck.html');

// 2. Count entries
let entries = 0;
if (dictMatch) {
  const kvs = dictMatch[1].match(/'[^']+'\s*:\s*'[^']*'/g) || [];
  entries = kvs.length;
}
assert(entries >= 100, 'Dictionary has >= 100 entries (found ' + entries + ')');
assert(entries >= 150, 'Dictionary has >= 150 entries — good coverage (found ' + entries + ')');

// 3. Language switcher exists
assert(/id="sd-lang-switcher"/.test(HTML), 'Language switcher element exists');
assert(/aria-label="Language"/.test(HTML), 'Language switcher has aria-label');
assert(/data-lang="en"/.test(HTML), 'EN button exists');
assert(/data-lang="es"/.test(HTML), 'ES button exists');

// 4. Storage key is 'site.language'
assert(/site\.language/.test(HTML), 'Storage key is site.language');

// 5. No credential localStorage writes reintroduced
assert(!/localStorage\.setItem\s*\(\s*['"`]lcc_OPENAI_KEY/.test(HTML),
  'No localStorage.setItem for lcc_OPENAI_KEY');
assert(!/localStorage\.setItem\s*\(\s*['"`]lcc_CLAUDE_KEY/.test(HTML),
  'No localStorage.setItem for lcc_CLAUDE_KEY');

// 6. No direct API fetch with raw keys
assert(!/Authorization.*Bearer.*OPENAI_KEY/.test(HTML),
  'No fetch with Bearer + OPENAI_KEY');
assert(!/x-api-key.*CLAUDE_KEY/.test(HTML),
  'No fetch with x-api-key + CLAUDE_KEY');
assert(!/anthropic-dangerous-direct-browser-access/.test(HTML),
  'No anthropic-dangerous-direct-browser-access header');

// 7. Key coverage spot-checks
const MUST_HAVE = [
  'Dashboard', 'Settings', 'Pipeline', 'Leads', 'Revenue',
  'Command Center', 'GovCon', 'Opportunities',
  'Save', 'Cancel', 'Delete', 'Search', 'Filter',
  'Status', 'Name', 'Email', 'Company', 'Industry'
];
for (const k of MUST_HAVE) {
  const re = new RegExp("'" + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'\\s*:");
  assert(re.test(dictMatch ? dictMatch[1] : ''), 'Key "' + k + '" has Spanish translation');
}

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' i18n audit checks ===');
if (failed > 0) process.exit(1);

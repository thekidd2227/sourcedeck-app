'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const files = [
  'services/govcon/govcon-index-db.js',
  'services/govcon/govcon-index.js',
  'services/govcon/sam-search.js',
  'main.js',
  'preload.js',
  'sourcedeck.html'
];
const src = files.map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');

assert.ok(/app\.getPath\('userData'\).*|userDataPath: app\.getPath\('userData'\)/s.test(src), 'DB path is userData, not repo');
assert.ok(!/api_key=[A-Za-z0-9_-]{8,}/.test(src), 'no raw api_key values');
const executable = files.filter(f => f !== 'sourcedeck.html').map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
assert.ok(!/Submit Bid|Submit Quote|auto-contact|automatically contact|upload to SAM|upload to PIEE|upload to eBuy|upload to GSA/i.test(executable), 'no forbidden auto-submit/contact/upload behavior added');
assert.ok(/does not download all attachments/i.test(src), 'no mass attachment download by default');
assert.ok(/stripKey/.test(src), 'source URLs are key-stripped before storage');
console.log('Phase 25AA storage safety: OK');

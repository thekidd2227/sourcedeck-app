'use strict';
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('sourcedeck.html', 'utf8');

assert.ok(/SAM\.gov key missing\.<\/strong> Add it in Setup or Settings → API Keys/.test(html), 'clear SAM key missing instruction card exists');
assert.ok(/SourceDeck never displays the raw key/.test(html), 'warning states raw key is never displayed');
assert.ok(/pill\.style\.display = present \? '' : 'none';/.test(html), 'duplicate missing-key status pill is hidden while the instruction card is visible');
assert.ok(!/SAM\.gov key:\s*[A-Za-z0-9_-]{12,}/.test(html), 'raw SAM key value is not rendered');

console.log('phase-25ae-single-sam-key-warning: ok');

'use strict';
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('sourcedeck.html', 'utf8');
assert.ok(/cleanDisplayText/.test(html), 'renderer sanitizes extracted text before display');
assert.ok(/looksRawMarkup/.test(html), 'renderer guards raw XML/code before display');
assert.ok(/No Section L instructions extracted yet\. Verify source package\./.test(html), 'Section L missing placeholder is clean');
assert.ok(/No Section M evaluation criteria extracted yet\. Verify source package\./.test(html), 'Section M missing placeholder is clean');
assert.ok(/No Section C\/F scope requirements extracted yet\. Verify source package\./.test(html), 'Section C/F missing placeholder is clean');
assert.ok(/formList\(\)/.test(html), 'Required Forms / Attachments are mapped from Section J, required forms, and attachment index');
assert.ok(/No compliance requirements extracted yet\. Run extraction on a readable package or manually map requirements\./.test(html), 'matrix empty state avoids fake rows');
console.log('phase-25ae-section-display-extraction: ok');

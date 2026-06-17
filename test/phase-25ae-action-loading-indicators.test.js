'use strict';
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('sourcedeck.html', 'utf8');
assert.ok(/window\.sdSetActionBusy/.test(html), 'busy helper exists');
assert.ok(/window\.sdClearActionBusy/.test(html), 'busy clear helper exists');
for (const label of ['Searching...', 'Downloading package...', 'Refreshing...', 'Sending...', 'Extracting...', 'Explaining...', 'Loading preview...', 'Saving copy...']) {
  assert.ok(html.includes(label), 'missing busy label: ' + label);
}
assert.ok(/btn\.disabled = true/.test(html), 'buttons disabled while running');
assert.ok(/btn\.disabled = false/.test(html), 'buttons re-enabled after action');
assert.ok(/Working in background\. This may take a moment\./.test(html), 'background status toast exists');
assert.ok(/finally \{[\s\S]*sdClearActionBusy/.test(html), 'busy states clear in finally blocks');
console.log('phase-25ae-action-loading-indicators: ok');

const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('sourcedeck.html', 'utf8');

assert.ok(!/Paste Solicitation Text/.test(html), 'runtime paste solicitation text label removed');
assert.ok(!/Source Materials/.test(html), 'runtime Source Materials label removed');
assert.ok(/Attachments/.test(html), 'Attachments label replaces old source wording');
assert.ok(/Solicitation Package/.test(html), 'Solicitation Package language exists');
assert.ok(/Text paste intake is deprecated/.test(html), 'legacy paste handler is deprecated rather than primary runtime flow');
console.log('phase-25ab-remove-paste-and-source-materials: ok');

const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('sourcedeck.html', 'utf8');
const preload = fs.readFileSync('preload.js', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');
const api = fs.readFileSync('api/index.js', 'utf8');

assert.ok(/Solicitation Center/.test(html), 'visible Solicitation Center naming exists');
assert.ok(/gcABExtractPackageToCenter/.test(html), 'downloaded package feeds Solicitation Center extraction');
assert.ok(/downloadSolicitationPackage/.test(preload + api), 'package download API exposed');
assert.ok(/extractSolicitationPackage/.test(preload + api + main), 'package extraction API exposed');
assert.ok(/Select a downloaded SAM\.gov package/.test(html) || /downloaded SAM\.gov package/.test(html), 'saved/downloaded package intake copy exists');
assert.ok(!/Paste Solicitation Text/.test(html), 'paste solicitation UI is not visible by label');
assert.ok(!/Source Materials/.test(html), 'old Source Materials UI label removed');
console.log('phase-25ab-solicitation-center-package-intake: ok');

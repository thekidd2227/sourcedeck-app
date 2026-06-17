const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('sourcedeck.html', 'utf8');
const svc = fs.readFileSync('services/govcon/solicitation-package-extract.js', 'utf8');

assert.ok(/realPackage:\s*true/.test(svc), 'real package extraction flagged as real');
assert.ok(/sample:\s*false/.test(svc), 'real package extraction is not sample/demo');
assert.ok(/No Section \$\{letter\}.*Verify source package/.test(svc), 'missing-section placeholder points user to source package');
const packageRegion = (html.match(/window\.gcABExtractPackageToCenter[\s\S]{0,2600}/) || [''])[0];
assert.ok(!/Sample — Demo Only|SAMPLE solicitation/.test(packageRegion), 'real package extraction path does not show sample/demo output');
console.log('phase-25ab-no-sample-output-for-real-package: ok');

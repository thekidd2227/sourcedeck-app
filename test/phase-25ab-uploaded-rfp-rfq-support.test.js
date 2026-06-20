const assert = require('assert');
const fs = require('fs');
const { acceptedUploadTypes } = require('../services/govcon/solicitation-package-extract');
const html = fs.readFileSync('sourcedeck.html', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');
const types = acceptedUploadTypes();

['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.xml', '.zip'].forEach((ext) => {
  assert.ok(types.includes(ext), `${ext} accepted by service contract`);
  assert.ok(main.includes(`'${ext.slice(1)}'`), `${ext} accepted by canonical native picker`);
});
assert.ok(/Stored, text extraction not available yet/.test(html + fs.readFileSync('services/govcon/solicitation-package-extract.js', 'utf8')), 'unsupported parser limitation is explicit');
assert.ok(!/>\s*(?:Submit Bid|Submit Quote|Send Email|Upload to SAM|Upload to PIEE)\s*</i.test(html), 'no forbidden submit/send/upload controls introduced');
console.log('phase-25ab-uploaded-rfp-rfq-support: ok');

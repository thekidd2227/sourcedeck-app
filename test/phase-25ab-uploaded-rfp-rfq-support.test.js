const assert = require('assert');
const fs = require('fs');
const { acceptedUploadTypes } = require('../services/govcon/solicitation-package-extract');
const html = fs.readFileSync('sourcedeck.html', 'utf8');
const types = acceptedUploadTypes();

['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip'].forEach((ext) => {
  assert.ok(types.includes(ext), `${ext} accepted by service contract`);
  assert.ok(html.includes(ext), `${ext} accepted by upload UI`);
});
assert.ok(/Stored, text extraction not available yet/.test(html + fs.readFileSync('services/govcon/solicitation-package-extract.js', 'utf8')), 'unsupported parser limitation is explicit');
assert.ok(!/>\s*(?:Submit Bid|Submit Quote|Send Email|Upload to SAM|Upload to PIEE)\s*</i.test(html), 'no forbidden submit/send/upload controls introduced');
console.log('phase-25ab-uploaded-rfp-rfq-support: ok');

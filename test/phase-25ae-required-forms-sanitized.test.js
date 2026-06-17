'use strict';
const assert = require('assert');
const extract = require('../services/govcon/solicitation-package-extract');

const cleaned = extract._cleanExtractedText('<w:document xmlns:w="x"><w:p><w:r><w:t>Attachment 1 - QASP</w:t></w:r></w:p></w:document>');
assert.ok(/Attachment 1 - QASP/.test(cleaned), 'XML text content survives cleaning');
assert.ok(!/w:document|xmlns|<w:/.test(cleaned), 'raw Office XML is removed');

(async () => {
  const result = await extract.extractSolicitationPackage({
    title: 'Test',
    files: [
      { fileName: 'Attachment 1 - QASP.txt', localPath: __filename, status: 'downloaded' },
      { fileName: 'SF 1449.pdf', localPath: __filename, status: 'downloaded' }
    ]
  });
  assert.ok(result.metadata.attachmentsIndex.some(f => /QASP/.test(f.fileName)), 'attachment names appear in manifest index');
  assert.ok(result.metadata.requiredForms.some(f => /QASP|SF 1449/.test(f)), 'required forms include real attachment/form names');
  assert.ok(!JSON.stringify(result.metadata.requiredForms).includes('w:document'), 'required forms never include raw XML');
  console.log('phase-25ae-required-forms-sanitized: ok');
})().catch(err => { console.error(err); process.exit(1); });

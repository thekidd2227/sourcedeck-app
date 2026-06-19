'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const extract = require('../services/govcon/solicitation-package-extract');
// Phase 25AN — the remote downloader was retired; build the test DOCX with the
// local stored-zip fixture helper instead of the deleted downloader's _createZip.
const fx = require('./fixtures-25af');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ae-docx-'));
  const docxPath = path.join(dir, 'solicitation.docx');
  const xml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:p><w:r><w:t>SECTION C Performance Work Statement</w:t></w:r></w:p>
    <w:p><w:r><w:t>The contractor shall provide janitorial services.</w:t></w:r></w:p>
    <w:p><w:r><w:t>SECTION L Instructions to Offerors</w:t></w:r></w:p>
    <w:p><w:r><w:t>Offerors must submit a technical approach.</w:t></w:r></w:p>
    <w:p><w:r><w:t>SECTION M Evaluation Factors</w:t></w:r></w:p>
    <w:p><w:r><w:t>The Government will evaluate past performance.</w:t></w:r></w:p>
  </w:body></w:document>`;
  fs.writeFileSync(docxPath, fx.buildStoredZip([{ name: 'word/document.xml', data: Buffer.from(xml, 'utf8') }]));
  const result = await extract.extractSolicitationPackage({
    files: [{ fileName: 'solicitation.docx', localPath: docxPath, status: 'downloaded' }],
    packagePath: dir
  });
  const joined = JSON.stringify(result);
  assert.strictEqual(result.ok, true);
  assert.ok(/janitorial services/.test(joined), 'readable DOCX text extracted');
  assert.ok(result.sections.C.found, 'Section C detected');
  assert.ok(result.sections.L.found, 'Section L detected');
  assert.ok(result.sections.M.found, 'Section M detected');
  assert.ok(!/w:document|xmlns/.test(result.sections.C.text + result.sections.L.text + result.sections.M.text), 'raw Office XML removed from user-facing sections');
  console.log('phase-25ae-docx-readable-extraction: ok');
})().catch(err => { console.error(err); process.exit(1); });

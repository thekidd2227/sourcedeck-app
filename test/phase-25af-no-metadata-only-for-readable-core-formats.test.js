'use strict';

// Phase 25AF — acceptance guard. A readable PDF/DOCX/XLSX must NEVER fall back
// to `metadata-only`. metadata-only is reserved for corrupt/unsupported files.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const extract = require('../services/govcon/solicitation-package-extract');
const fx = require('./fixtures-25af');

(async () => {
  const dir = fx.tmpDir('guard');
  const tmpRoot = path.join(dir, 'extracted');
  fs.mkdirSync(tmpRoot, { recursive: true });

  const docxPath = path.join(dir, 'a.docx');
  fs.writeFileSync(docxPath, fx.buildDocx(['SECTION C The contractor shall perform the work.']));
  const docx = await extract._extractFileText({ fileName: 'a.docx', localPath: docxPath }, tmpRoot);
  assert.notEqual(docx.extractionStatus, 'metadata-only', 'readable DOCX is not metadata-only');

  const pdfPath = path.join(dir, 'a.pdf');
  fs.writeFileSync(pdfPath, fx.buildPdf(['SECTION L Instructions to offerors.'], true));
  const pdf = await extract._extractFileText({ fileName: 'a.pdf', localPath: pdfPath }, tmpRoot);
  assert.notEqual(pdf.extractionStatus, 'metadata-only', 'readable PDF is not metadata-only');

  const xlsxPath = path.join(dir, 'a.xlsx');
  fs.writeFileSync(xlsxPath, fx.buildXlsx('S1', [['CLIN', 'Price'], ['0001', { n: 10 }]]));
  const xlsx = await extract._extractFileText({ fileName: 'a.xlsx', localPath: xlsxPath }, tmpRoot);
  assert.notEqual(xlsx.extractionStatus, 'metadata-only', 'readable XLSX is not metadata-only');

  // Corrupt/unsupported files ARE allowed to be metadata-only.
  const badPath = path.join(dir, 'broken.pdf');
  fs.writeFileSync(badPath, Buffer.from('not a pdf', 'latin1'));
  const bad = await extract._extractFileText({ fileName: 'broken.pdf', localPath: badPath }, tmpRoot);
  assert.equal(bad.extractionStatus, 'metadata-only', 'corrupt PDF may be metadata-only');

  const unsupportedPath = path.join(dir, 'image.png');
  fs.writeFileSync(unsupportedPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const unsupported = await extract._extractFileText({ fileName: 'image.png', localPath: unsupportedPath }, tmpRoot);
  assert.equal(unsupported.extractionStatus, 'metadata-only', 'unsupported format may be metadata-only');

  console.log('phase-25af-no-metadata-only-for-readable-core-formats: ok');
})().catch(err => { console.error(err); process.exit(1); });

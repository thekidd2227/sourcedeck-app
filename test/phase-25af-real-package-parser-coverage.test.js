'use strict';

// Phase 25AF — parser coverage for real-world GovCon attachment formats.
// These fixtures are produced with built-in zlib only and must yield readable
// text (not metadata-only) for PDF / DOCX / XLSX / TXT / ZIP children.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const extract = require('../services/govcon/solicitation-package-extract');
const fx = require('./fixtures-25af');

(async () => {
  const dir = fx.tmpDir('parser');
  const tmpRoot = path.join(dir, 'extracted');
  fs.mkdirSync(tmpRoot, { recursive: true });

  // --- TXT ---
  const txtPath = path.join(dir, 'instructions.txt');
  fs.writeFileSync(txtPath, 'SECTION L Instructions to Offerors\nOfferors must submit a technical volume.');
  const txt = await extract._extractFileText({ fileName: 'instructions.txt', localPath: txtPath }, tmpRoot);
  assert.equal(txt.extractionStatus, 'text', 'TXT extracts as text');
  assert.ok(/Instructions to Offerors/.test(txt.text), 'TXT content present');

  // --- DOCX ---
  const docxPath = path.join(dir, 'sow.docx');
  fs.writeFileSync(docxPath, fx.buildDocx([
    'SECTION C Performance Work Statement',
    'The contractor shall provide janitorial services at the facility.'
  ]));
  const docx = await extract._extractFileText({ fileName: 'sow.docx', localPath: docxPath }, tmpRoot);
  assert.equal(docx.extractionStatus, 'text', 'DOCX extracts as text');
  assert.ok(/Performance Work Statement/.test(docx.text), 'DOCX content present');
  assert.ok(!/w:document|xmlns|<w:t/.test(docx.text), 'DOCX text has no raw Office XML');

  // --- PDF (uncompressed content stream) ---
  const pdfPath = path.join(dir, 'rfp.pdf');
  fs.writeFileSync(pdfPath, fx.buildPdf([
    'SECTION M Evaluation Factors for Award',
    'The Government will evaluate technical approach and past performance.'
  ], false));
  const pdf = await extract._extractFileText({ fileName: 'rfp.pdf', localPath: pdfPath }, tmpRoot);
  assert.ok(pdf.extractionStatus === 'text' || pdf.extractionStatus === 'partial', 'PDF extracts readable text');
  assert.ok(/Evaluation Factors/.test(pdf.text), 'PDF content present (uncompressed)');
  assert.ok(pdf.pages >= 1, 'PDF page count detected');

  // --- PDF (FlateDecode content stream) ---
  const pdfzPath = path.join(dir, 'rfp-compressed.pdf');
  fs.writeFileSync(pdfzPath, fx.buildPdf(['SECTION L Compressed stream instructions to offerors.'], true));
  const pdfz = await extract._extractFileText({ fileName: 'rfp-compressed.pdf', localPath: pdfzPath }, tmpRoot);
  assert.ok(/instructions to offerors/i.test(pdfz.text), 'PDF FlateDecode content extracted');

  // --- XLSX ---
  const xlsxPath = path.join(dir, 'pricing.xlsx');
  fs.writeFileSync(xlsxPath, fx.buildXlsx('Pricing', [
    ['CLIN', 'Description', 'Qty', 'Unit'],
    ['0001', 'Custodial Services Base Year', { n: 12 }, 'Months']
  ]));
  const xlsx = await extract._extractFileText({ fileName: 'pricing.xlsx', localPath: xlsxPath }, tmpRoot);
  assert.equal(xlsx.extractionStatus, 'text', 'XLSX extracts as text');
  assert.ok(/CLIN/.test(xlsx.text) && /Custodial Services/.test(xlsx.text), 'XLSX rows present');
  assert.ok(/Pricing/.test(xlsx.text), 'XLSX sheet name present');
  assert.ok(xlsx.sheets.length >= 1, 'XLSX sheet metadata present');

  // --- ZIP (recursive children) ---
  const zipPath = path.join(dir, 'package.zip');
  fs.writeFileSync(zipPath, fx.buildStoredZip([
    { name: 'readme.txt', data: 'SECTION F Deliveries and performance schedule.' },
    { name: 'nested-sow.docx', data: fx.buildDocx(['The contractor shall deliver monthly reports.']) },
    { name: 'nested-pricing.xlsx', data: fx.buildXlsx('Sheet1', [['CLIN', 'Price'], ['0001', { n: 1000 }]]) }
  ]));
  const zip = await extract._extractFileText({ fileName: 'package.zip', localPath: zipPath }, tmpRoot);
  assert.equal(zip.extractionStatus, 'text', 'ZIP aggregate text extracted');
  assert.ok(/Deliveries and performance/.test(zip.text), 'ZIP child TXT extracted');
  assert.ok(/monthly reports/.test(zip.text), 'ZIP child DOCX extracted');
  assert.ok(/CLIN/.test(zip.text), 'ZIP child XLSX extracted');

  // --- Corrupt file does not fail the package ---
  const badPath = path.join(dir, 'broken.pdf');
  fs.writeFileSync(badPath, Buffer.from('%PDF-1.4 this is not a real pdf body at all', 'latin1'));
  const bad = await extract._extractFileText({ fileName: 'broken.pdf', localPath: badPath }, tmpRoot);
  assert.ok(bad.extractionStatus === 'metadata-only', 'unreadable PDF is metadata-only, not a crash');
  assert.ok((bad.warnings || []).length >= 1, 'unreadable PDF carries a warning');

  console.log('phase-25af-real-package-parser-coverage: ok');
})().catch(err => { console.error(err); process.exit(1); });

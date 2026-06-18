'use strict';

// Phase 25AF — a realistic mixed package (PDF + DOCX + XLSX + TXT) must produce
// non-empty fullText, populate formal sections, surface CLIN/pricing candidates,
// and report per-file warnings.

const assert = require('assert');
const fs = require('fs');
const extract = require('../services/govcon/solicitation-package-extract');
const fx = require('./fixtures-25af');

(async () => {
  const { manifest } = fx.buildPackage('mixed', [
    { name: 'rfp.pdf', data: fx.buildPdf([
      'SECTION L Instructions to Offerors',
      'Offerors must submit a technical proposal no later than the response date.',
      'SECTION M Evaluation Factors for Award',
      'The Government will evaluate technical approach and past performance.'
    ], true) },
    { name: 'pws.docx', data: fx.buildDocx([
      'SECTION C Performance Work Statement',
      'The contractor shall provide custodial services across all buildings.'
    ]) },
    { name: 'pricing.xlsx', data: fx.buildXlsx('CLIN Pricing', [
      ['CLIN', 'Description', 'Quantity', 'Unit Price'],
      ['0001', 'Custodial Base Year', { n: 12 }, { n: 5000 }]
    ]) },
    { name: 'cover.txt', data: 'Solicitation Number: TEST-mixed\nSECTION A Solicitation Contract Form' },
    { name: 'scanned.pdf', data: Buffer.from('%PDF-1.4\n% no extractable text operators here\n%%EOF', 'latin1') }
  ]);

  const ex = await extract.extractSolicitationPackage({ manifest });
  assert.equal(ex.ok, true, 'extraction ok');
  assert.ok(ex.fullText && ex.fullText.length > 50, 'aggregate fullText is non-empty');

  assert.ok(ex.sections.C.found && /custodial/i.test(ex.sections.C.text), 'Section C populated from DOCX');
  assert.ok(ex.sections.L.found && /Offerors must submit/i.test(ex.sections.L.text), 'Section L populated from PDF');
  assert.ok(ex.sections.M.found && /evaluate/i.test(ex.sections.M.text), 'Section M populated from PDF');

  // CLIN / pricing rows from XLSX reach metadata candidates
  const pricingJoined = JSON.stringify(ex.metadata.pricingClinTable || []);
  assert.ok(/CLIN|Custodial Base Year|Unit Price/i.test(pricingJoined), 'pricing/CLIN rows surfaced from XLSX');

  // sourceBlocks retain per-file attribution
  assert.ok(ex.sourceBlocks.some(b => /pricing\.xlsx/.test(b.fileName)), 'sourceBlocks include the XLSX');
  assert.ok(ex.sourceBlocks.some(b => /pws\.docx/.test(b.fileName)), 'sourceBlocks include the DOCX');

  // per-file warning for the unreadable PDF, package still succeeds
  assert.ok(ex.warnings.some(w => /scanned\.pdf/.test(w)), 'unreadable file produces a per-file warning');
  assert.ok(ex.files.length === 5, 'all files reported');

  console.log('phase-25af-mixed-package-extraction: ok');
})().catch(err => { console.error(err); process.exit(1); });

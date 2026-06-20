'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fx = require('./fixtures-25af');
const importer = require('../services/govcon/solicitation-import');

(async () => {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-five-source-'));
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-five-user-'));
  const files = [
    ['section-l.pdf', fx.buildPdf(['SECTION L Instructions to Offerors', 'Offerors must submit Volume I by email no later than June 30, 2026.'], true)],
    ['pws.docx', fx.buildDocx(['SECTION C Performance Work Statement', 'Task 1. The contractor shall provide licensed HVAC technicians within 50 miles of Richmond Virginia.', 'Task 2. The contractor shall supply service vehicles and diagnostic equipment.'])],
    ['pricing.xlsx', fx.buildXlsx('CLIN Pricing', [['CLIN', 'Description', 'Quantity', 'Unit'], ['0001', 'HVAC preventive maintenance base year', { n: 12 }, 'month']])],
    ['clauses.xml', '<?xml version="1.0"?><solicitation><clause>FAR 52.219-14 Limitations on Subcontracting</clause><form>SF 1449 required</form></solicitation>'],
    ['amendment.txt', 'Amendment Number 0001\nThe revised proposal deadline is June 30, 2026. Offerors must acknowledge this amendment.']
  ].map(([name, data]) => { const p = path.join(source, name); fs.writeFileSync(p, data); return p; });

  const result = await importer.importAndExtract({ filePaths: files, userDataPath: userData, timestamp: 'five', opportunity: { id: 'opp-five' } });
  assert.equal(result.ok, true);
  assert.equal(result.import.sourceFileCount, 5, 'five accepted');
  assert.equal(result.documentInventory.length, 5, 'five inventory records');
  assert.equal(result.documentInventory.filter(x => ['extracted', 'extracted_with_warnings'].includes(x.extractionStatus)).length, 5, 'five parsed');
  assert.ok(result.sections.L.found && /submit Volume I/i.test(result.sections.L.text), 'Section L from PDF');
  assert.ok(result.sections.C.found && /HVAC technicians/i.test(result.sections.C.text), 'PWS from DOCX');
  assert.ok(result.metadata.pricingClinTable.some(x => /CLIN|HVAC/i.test(String(x))), 'pricing from XLSX');
  assert.ok(result.requiredFormsAttachments.some(x => /SF 1449/i.test(x.text)), 'forms from XML');
  assert.ok(result.deadlines.some(x => /June 30, 2026/i.test(x.text)), 'revised deadline from TXT');
  assert.ok(result.complianceMatrix.length > 0 && result.complianceMatrix.every(r => r.sourceDocument || r.sourceFile || r.source), 'source-backed compliance matrix');
  assert.ok(!JSON.stringify(result).includes('<solicitation>'), 'no raw XML');
  assert.ok(!JSON.stringify(result).includes('SourceDeck GovCon Pipeline'), 'no app shell');
  assert.equal(result.import.extractionMessage, 'Extraction processed — review required.');

  const before = fs.readdirSync(userData).sort();
  const six = Array.from({ length: 6 }, (_, i) => { const p = path.join(source, `six-${i}.txt`); fs.writeFileSync(p, `Task ${i}: contractor shall perform service.`); return p; });
  const rejected = await importer.importAndExtract({ filePaths: six, userDataPath: userData, timestamp: 'six' });
  assert.equal(rejected.ok, false); assert.equal(rejected.reason, 'document_limit_exceeded'); assert.equal(rejected.stateChanged, false);
  assert.equal(rejected.message, 'Select up to 5 solicitation documents per upload.');
  assert.deepEqual(fs.readdirSync(userData).sort(), before, 'six rejected before storage change');

  const scanned = path.join(source, 'scanned.pdf'); fs.writeFileSync(scanned, Buffer.from('%PDF-1.4\n%%EOF'));
  const partial = await importer.importAndExtract({ filePaths: [files[4], scanned], userDataPath: userData, timestamp: 'partial' });
  assert.equal(partial.ok, true); assert.equal(partial.import.partialSuccess, true); assert.equal(partial.import.successfulFileCount, 1); assert.equal(partial.import.failedFileCount, 1);
  assert.ok(partial.documentInventory.some(x => x.extractionStatus === 'ocr_required'));
  console.log('manual-solicitation-five-document-vendor-workflow: ok');
})().catch(e => { console.error(e); process.exit(1); });

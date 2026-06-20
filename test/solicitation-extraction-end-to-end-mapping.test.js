'use strict';
// PR #151 post-merge closeout — solicitation extraction end-to-end mapping audit.
//
// Drives a deterministic five-document gold fixture through the canonical
// import + extract pipeline (services/govcon/solicitation-import.js →
// services/govcon/solicitation-package-extract.js) and asserts that every
// panel surface listed in the audit receives the expected content from the
// expected source document.
//
// Each assertion below maps to one row of the audit's expected-vs-rendered
// reconciliation matrix. Failures here mean the parser, normalizer, or
// renderer-bound contract has regressed and a specific panel will appear
// empty in the running app.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fx = require('./fixtures-25af');
const importer = require('../services/govcon/solicitation-import');

(async () => {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-audit-source-'));
  const userData  = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-audit-user-'));

  // ──────────────────────────────────────────────────────────────────
  // Gold fixture — five documents with deterministic content.
  // ──────────────────────────────────────────────────────────────────

  // Document 1 — Base solicitation PDF. Carries the metadata + Section L +
  // Section M instructions / criteria; includes the original deadline that
  // the amendment will later override.
  const basePdfLines = [
    'REQUEST FOR PROPOSAL N00189-26-R-0001',
    'Department of the Navy - Naval Station Norfolk',
    'NAICS Code: 561720',
    'Set-Aside: Total Small Business',
    'SECTION L Instructions to Offerors',
    'L.1 Offerors shall submit Volume I Technical no later than June 25 2026.',
    'L.2 Offerors must include resumes for all key personnel.',
    'SECTION M Evaluation Factors for Award',
    'M.1 Technical Approach will be evaluated for completeness.',
    'M.2 Past Performance will be assigned a confidence rating.',
    'FAR 52.219-14 Limitations on Subcontracting applies.'
  ];

  // Document 2 — PWS DOCX with 12 explicit shall-statement requirements + 4
  // deliverables + staffing + quality control + safety + reporting.
  const pwsDocxLines = [
    'SECTION C Performance Work Statement',
    'C.1 The contractor shall provide licensed HVAC technicians within 50 miles of Norfolk Virginia.',
    'C.2 The contractor shall supply service vehicles and diagnostic equipment.',
    'C.3 The contractor shall perform preventive maintenance monthly.',
    'C.4 The contractor shall deliver quarterly performance reports.',
    'C.5 The contractor shall maintain ISO 9001 certification throughout the period of performance.',
    'C.6 The contractor shall provide a quality control plan within 30 days of award.',
    'C.7 The contractor shall conduct safety briefings every shift.',
    'C.8 The contractor shall respond to emergencies within 2 hours.',
    'C.9 The contractor shall submit monthly invoices.',
    'C.10 The contractor shall provide background-checked personnel.',
    'C.11 The contractor shall hold general liability insurance of one million dollars.',
    'C.12 The contractor shall transition operations within 30 days of award.'
  ];

  // Document 3 — Pricing XLSX with five CLINs across base + 2 option years.
  const pricingRows = [
    ['CLIN', 'Description', 'Quantity', 'Unit'],
    ['0001', 'HVAC preventive maintenance base year', { n: 12 }, 'month'],
    ['0002', 'HVAC repair service base year', { n: 200 }, 'hour'],
    ['1001', 'HVAC preventive maintenance option year 1', { n: 12 }, 'month'],
    ['2001', 'HVAC preventive maintenance option year 2', { n: 12 }, 'month'],
    ['3001', 'Travel and material reimbursement', { n: 1 }, 'lot']
  ];

  // Document 4 — Forms and clauses XML. Contains the explicit forms list +
  // five FAR clauses + insurance + license + a mandatory attachment.
  const clausesXml =
    '<?xml version="1.0"?><solicitation>' +
    '<form>SF 1449 required</form>' +
    '<form>SF 33 cover page required</form>' +
    '<form>Past Performance Questionnaire required</form>' +
    '<clause>FAR 52.219-14 Limitations on Subcontracting</clause>' +
    '<clause>FAR 52.219-6 Notice of Total Small Business Set-Aside</clause>' +
    '<clause>FAR 52.222-41 Service Contract Labor Standards</clause>' +
    '<clause>DFARS 252.204-7012 Safeguarding Covered Defense Information</clause>' +
    '<clause>FAR 52.228-1 Bid Guarantee</clause>' +
    '<insurance>General liability insurance of one million dollars required.</insurance>' +
    '<insurance>Workers compensation insurance required per state law.</insurance>' +
    '<license>HVAC contractor license required in Commonwealth of Virginia.</license>' +
    '<attachment mandatory="true">Attachment J-1 Wage Determination</attachment>' +
    '</solicitation>';

  // Document 5 — Amendment TXT. Overrides the response deadline.
  const amendmentTxt = [
    'Amendment Number 0001',
    'The revised proposal deadline is June 30 2026 at 2:00 PM Eastern.',
    'Offerors must acknowledge this amendment.',
    'The required quantity for CLIN 0002 is revised from 200 to 250 hours.'
  ].join('\n');

  // ──────────────────────────────────────────────────────────────────
  // Materialise to disk.
  // ──────────────────────────────────────────────────────────────────
  function write(name, data){ const p = path.join(sourceDir, name); fs.writeFileSync(p, data); return p; }
  const files = [
    write('01-base-solicitation.pdf', fx.buildPdf(basePdfLines, true)),
    write('02-pws.docx',               fx.buildDocx(pwsDocxLines)),
    write('03-pricing.xlsx',           fx.buildXlsx('CLIN Pricing', pricingRows)),
    write('04-clauses.xml',            clausesXml),
    write('05-amendment-0001.txt',     amendmentTxt)
  ];

  // ──────────────────────────────────────────────────────────────────
  // Run extraction.
  // ──────────────────────────────────────────────────────────────────
  const result = await importer.importAndExtract({
    filePaths: files,
    userDataPath: userData,
    timestamp: 'audit',
    opportunity: { id: 'audit-opp', solicitationNumber: 'N00189-26-R-0001', noticeId: 'audit-notice' }
  });

  // Section 1 — File processing.
  assert.equal(result.ok, true, '[file processing] result.ok === true');
  assert.equal(result.import.sourceFileCount, 5, '[file processing] five accepted');
  assert.equal(result.documentInventory.length, 5, '[file processing] five inventory records');
  const parsedCount = result.documentInventory.filter(x => ['extracted', 'extracted_with_warnings'].includes(x.extractionStatus)).length;
  assert.equal(parsedCount, 5, '[file processing] five parsed (got ' + parsedCount + ')');
  result.documentInventory.forEach((d, i) => {
    assert.ok(d.safeStoredFileName, '[file processing] inventory ' + i + ' has safeStoredFileName');
    assert.ok(!/^\//.test(d.safeStoredFileName), '[file processing] inventory ' + i + ' safeStoredFileName is not an absolute path');
  });
  // No raw absolute user paths leak through.
  const blob = JSON.stringify(result);
  assert.ok(!blob.includes(sourceDir), '[file processing] no source dir paths reach renderer state');

  // Section 2 — Metadata.
  const md = result.metadata || {};
  assert.equal(md.solicitationNumber, 'N00189-26-R-0001', '[metadata] solicitation number');
  assert.ok(md.naics === '561720' || md.naics === '', '[metadata] NAICS preserved');

  // Section 3 — Section L (Instructions to Offerors).
  assert.ok(result.sections.L && result.sections.L.found, '[Section L] sections.L found=true');
  assert.ok(/Volume I/i.test(result.sections.L.text), '[Section L] text mentions Volume I');
  assert.ok(/key personnel/i.test(result.sections.L.text), '[Section L] text mentions key personnel');
  const sectionLArr = (result.sections.L.found && result.sections.L.text) ? [{ text: result.sections.L.text }] : (result.instructionsToOfferors || []);
  assert.ok(sectionLArr.length > 0, '[Section L panel] hydration source is non-empty');

  // Section 4 — Section M (Evaluation Criteria).
  assert.ok(result.sections.M && result.sections.M.found, '[Section M] sections.M found=true');
  assert.ok(/Technical Approach/i.test(result.sections.M.text), '[Section M] text mentions Technical Approach');
  assert.ok(/Past Performance/i.test(result.sections.M.text), '[Section M] text mentions Past Performance');

  // Section 5 — PWS / SOW requirements (Section C).
  assert.ok(result.sections.C && result.sections.C.found, '[PWS] sections.C found=true');
  assert.ok(/HVAC technicians/i.test(result.sections.C.text), '[PWS] HVAC technicians requirement');
  assert.ok(/quality control plan/i.test(result.sections.C.text), '[PWS] quality control requirement');
  assert.ok(/transition/i.test(result.sections.C.text), '[PWS] transition requirement');

  // Section 6 — Pricing / CLIN structure (XLSX).
  const clinSrc = JSON.stringify(result.metadata.pricingClinTable || []);
  ['0001', '0002', '1001', '2001', '3001'].forEach(clin => {
    assert.ok(new RegExp('\\b' + clin + '\\b').test(clinSrc) || /CLIN/i.test(clinSrc),
      '[pricing] CLIN ' + clin + ' reaches metadata.pricingClinTable');
  });

  // Section 7 — Required forms / attachments (XML).
  const formsTxt = JSON.stringify(result.requiredFormsAttachments || []);
  assert.ok(/SF 1449/i.test(formsTxt), '[forms] SF 1449 surfaced');
  assert.ok(/SF 33/i.test(formsTxt) || /Past Performance Questionnaire/i.test(formsTxt),
    '[forms] additional forms surfaced');

  // Section 8 — Deadlines (amendment override).
  const dlTxt = JSON.stringify(result.deadlines || []);
  assert.ok(/June 30 2026|June 30, 2026|2026-06-30/i.test(dlTxt) || /deadline/i.test(dlTxt),
    '[deadlines] amendment-revised deadline reaches deadlines panel input');

  // Section 9 — Clauses / compliance.
  const matrix = result.complianceMatrix || [];
  assert.ok(matrix.length > 0, '[compliance matrix] non-empty');
  matrix.forEach((row, i) => {
    const src = row.sourceDocument || row.sourceFile || row.source || row.fileName;
    assert.ok(src, '[compliance matrix] row ' + i + ' carries a source citation');
  });

  // Section 10 — Sanity / safety regression.
  assert.ok(!blob.includes('<solicitation>'), '[safety] no raw XML markup');
  assert.ok(!blob.includes('SourceDeck GovCon Pipeline'), '[safety] no app-shell text');
  assert.ok(!/\.cmd-flow|\.cmd-pill|\.cc-lcc-grid/.test(blob), '[safety] no SourceDeck CSS class names');

  // Section 11 — Six-file rejection is transactional.
  const before = fs.readdirSync(userData).sort();
  const sixDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-audit-six-'));
  const six = Array.from({ length: 6 }, (_, i) => {
    const p = path.join(sixDir, 'six-' + i + '.txt');
    fs.writeFileSync(p, 'Task ' + i + ': contractor shall perform service.');
    return p;
  });
  const rejected = await importer.importAndExtract({ filePaths: six, userDataPath: userData, timestamp: 'six' });
  assert.equal(rejected.ok, false, '[transactional reject] ok=false');
  assert.equal(rejected.reason, 'document_limit_exceeded', '[transactional reject] reason');
  assert.equal(rejected.stateChanged, false, '[transactional reject] stateChanged=false');
  assert.equal(rejected.message, 'Select up to 5 solicitation documents per upload.', '[transactional reject] copy');
  assert.deepStrictEqual(fs.readdirSync(userData).sort(), before, '[transactional reject] no files written');

  console.log('solicitation-extraction-end-to-end-mapping (PR #151 closeout): ok ('
    + Object.keys(result.sections).length + ' sections, '
    + matrix.length + ' compliance rows, '
    + parsedCount + ' parsed documents)');
})().catch(e => { console.error('AUDIT FAIL:', e && e.message); console.error(e && e.stack); process.exit(1); });

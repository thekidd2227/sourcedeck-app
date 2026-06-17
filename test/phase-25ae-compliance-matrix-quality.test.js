'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const extract = require('../services/govcon/solicitation-package-extract');

(async () => {
  const text = [
    'SECTION L Instructions to Offerors',
    'Offerors must submit a technical approach narrative.',
    'Offerors shall include completed SF 1449.',
    'SECTION M Evaluation Factors',
    'The Government will evaluate past performance.',
    'SECTION C Performance Work Statement',
    'The contractor shall provide a staffing plan.'
  ].join('\n');
  const sections = extract._classifySections(text);
  const metadata = extract._extractMetadata(text, {}, [{ fileName: 'SF 1449.pdf', source: 'package' }]);
  assert.ok(sections.L.found && sections.M.found && sections.C.found, 'sections available for matrix source');
  assert.ok(metadata.requiredForms.some(x => /SF 1449/.test(x)), 'specific form extracted');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ae-matrix-'));
  const source = path.join(dir, 'matrix-source.txt');
  fs.writeFileSync(source, text);
  const full = await extract.extractSolicitationPackage({
    files: [{ fileName: 'matrix-source.txt', localPath: source, status: 'downloaded' }],
    packagePath: dir
  });

  assert.ok(Array.isArray(full.complianceMatrixStarter), 'matrix array exists');
  assert.ok(full.complianceMatrixStarter.length >= 3, 'real requirements generate matrix rows');
  assert.ok(full.complianceMatrixStarter.every(r => r.id && r.source && r.sectionPageFile && (r.requirementText || r.requirement) && (r.evidenceNeeded || r.evidence) && r.status && r.risk), 'matrix rows carry required fields');
  assert.ok(full.complianceMatrixStarter.some(r => /Technical approach narrative/.test(r.evidenceNeeded || r.evidence)), 'evidence needed is specific when possible');
  assert.ok(!full.complianceMatrixStarter.some(r => /^Required Forms$/i.test(r.requirementText || r.requirement || '')), 'no fake repeated Required Forms rows');
  console.log('phase-25ae-compliance-matrix-quality: ok');
})().catch(err => { console.error(err); process.exit(1); });

'use strict';

// Phase 25AF — the compliance matrix must be built from real extracted
// requirement text, carry source attribution, avoid generic filler rows, and
// fall back to inferred requirements when formal sections are missing.

const assert = require('assert');
const extract = require('../services/govcon/solicitation-package-extract');
const fx = require('./fixtures-25af');

(async () => {
  // Formal-sections package.
  const formal = fx.buildPackage('cm-formal', [
    { name: 'rfp.docx', data: fx.buildDocx([
      'SECTION L Instructions to Offerors',
      'Offerors must submit a technical approach narrative.',
      'Offerors shall include completed SF 1449.',
      'SECTION M Evaluation Factors',
      'The Government will evaluate past performance.',
      'SECTION C Performance Work Statement',
      'The contractor shall provide a staffing plan.'
    ]) }
  ]);
  const ex = await extract.extractSolicitationPackage({ manifest: formal.manifest });
  const matrix = ex.complianceMatrixStarter;
  assert.ok(Array.isArray(matrix) && matrix.length >= 3, 'matrix has real rows');
  assert.ok(matrix.every(r => r.id && r.source && r.sectionPageFile && (r.requirementText || r.requirement) && (r.evidenceNeeded || r.evidence) && r.status && r.risk), 'rows carry required fields');
  assert.ok(matrix.every(r => 'sourceFile' in r && 'sourceLocation' in r), 'rows carry source attribution fields');
  assert.ok(!matrix.some(r => /^Required Forms$/i.test(r.requirementText || r.requirement || '')), 'no generic Required Forms filler rows');
  // no duplicate requirement text within same source
  const keys = matrix.map(r => (r.source + '|' + (r.requirementText || '')).toLowerCase());
  assert.equal(keys.length, new Set(keys).size, 'no duplicate matrix rows');

  // Fallback package (no formal headers) must still yield rows from inferred requirements.
  const fallback = fx.buildPackage('cm-fallback', [
    { name: 'rfq.txt', data: [
      'Quoters must submit a technical proposal no later than the deadline.',
      'The contractor shall provide custodial services.',
      'The Government will evaluate best value tradeoff.',
      'Offerors shall include a completed SF 1449.'
    ].join('\n') }
  ]);
  const exf = await extract.extractSolicitationPackage({ manifest: fallback.manifest });
  assert.ok(exf.complianceMatrixStarter.length >= 1, 'fallback requirements still build matrix rows');
  assert.ok(exf.complianceMatrixStarter.some(r => /inferred/i.test(r.source)), 'fallback rows are labelled as inferred');
  assert.ok(exf.complianceMatrixStarter.some(r => r.sourceFile && /rfq\.txt/.test(r.sourceFile)), 'fallback rows retain source file');

  // Honest empty state when there are no requirements at all.
  const empty = fx.buildPackage('cm-empty', [
    { name: 'note.txt', data: 'The weather is nice. Lunch at noon.' }
  ]);
  const exe = await extract.extractSolicitationPackage({ manifest: empty.manifest });
  assert.equal(exe.complianceMatrixStarter.length, 0, 'no requirements => honest empty matrix');

  console.log('phase-25af-compliance-matrix-from-real-requirements: ok');
})().catch(err => { console.error(err); process.exit(1); });

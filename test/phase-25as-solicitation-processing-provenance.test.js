'use strict';

const assert = require('assert');
const { summarizeSolicitation, STATUS } = require('../services/govcon/solicitation-summarize');

function fixture() {
  const sections = {};
  'ABCDEFGHIJKLM'.split('').forEach(letter => {
    sections[letter] = { letter, found: false, text: '', title: `Section ${letter}` };
  });
  return {
    import: { opportunityId: 'opp-status-provenance' },
    metadata: {
      title: 'Metadata-only extraction fixture',
      pointOfContact: [{
        name: 'Contracting Officer',
        sourceFile: 'cover-sheet.pdf',
        sourceLocation: 'Page 1'
      }],
      pricingClinTable: [{
        clin: '0001',
        description: 'Base services',
        sourceFile: 'pricing.xlsx',
        sourceLocation: 'Pricing row 2'
      }]
    },
    sections,
    instructionsToOfferors: [],
    evaluationCriteria: [],
    pwsSowRequirements: [],
    requiredFormsAttachments: [],
    deadlines: [],
    risksDealKillers: [],
    complianceMatrix: []
  };
}

const allMetadataOnly = fixture();
allMetadataOnly.documentInventory = [
  { originalFileName: 'scan-a.pdf', extractionStatus: 'metadata-only' },
  { originalFileName: 'scan-b.pdf', extractionStatus: 'metadata-only' }
];
const failed = summarizeSolicitation({ extraction: allMetadataOnly, opportunityId: 'opp-status-provenance' });
assert.equal(failed.processingStatus, STATUS.EXTRACTION_FAILED,
  'all metadata-only documents must not be reported as extracted');

const mixed = fixture();
mixed.documentInventory = [
  { originalFileName: 'readable.txt', extractionStatus: 'extracted' },
  { originalFileName: 'scan.pdf', extractionStatus: 'metadata-only' }
];
const partial = summarizeSolicitation({ extraction: mixed, opportunityId: 'opp-status-provenance' });
assert.equal(partial.processingStatus, STATUS.LOW_CONFIDENCE,
  'mixed readable and metadata-only documents must be low confidence');
assert.ok(partial.sourceFiles.includes('pricing.xlsx'),
  'top-level provenance must include metadata pricing sources');
assert.ok(partial.sourceFiles.includes('cover-sheet.pdf'),
  'top-level provenance must include metadata contact sources');
assert.ok(partial.sourceReferences.some(ref =>
  ref.sourceFile === 'pricing.xlsx' && ref.sourceLocation === 'Pricing row 2'));
assert.ok(partial.sourceReferences.some(ref =>
  ref.sourceFile === 'cover-sheet.pdf' && ref.sourceLocation === 'Page 1'));

console.log('phase-25as-solicitation-processing-provenance: ok');

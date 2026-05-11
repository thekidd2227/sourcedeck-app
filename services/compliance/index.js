// services/compliance/index.js
//
// Compliance-matrix service surface.
//
// Re-exports the heuristic generator that currently lives in
// services/govcon/compliance-matrix.js. Stable contract:
//
//   const { generateComplianceMatrix } = require('services/compliance');
//   const out = generateComplianceMatrix(solicitationText);
//   // out.rows[i] = { reqId, sourceSection, requirement, sectionM,
//   //                 owner, evidence, dueOrInstruction, riskLevel,
//   //                 riskTag, sourceQuote, confidence }
//
// Platform-neutral: pure text-in / data-out. No PDF parsing here.
// A pdf-extract worker can run before this and pass the extracted
// text through.

'use strict';

const impl = require('../govcon/compliance-matrix');

module.exports = {
  generateComplianceMatrix: impl.generateComplianceMatrix,
  // exported for unit-test introspection
  classifyRisk:             impl.classifyRisk,
  extractSectionMap:        impl.extractSectionMap
};

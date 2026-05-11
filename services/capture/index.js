// services/capture/index.js
//
// Capture-workflow service. Handles the post-intake stages of a
// pursued opportunity: pre-RFP intelligence, past-performance
// matching, capture-action timeline.
//
// Pure data layer; no DOM, no Electron, no network.

'use strict';

const preRfp          = require('../govcon/pre-rfp');
const pastPerformance = require('../govcon/past-performance');

module.exports = {
  // Pre-RFP intelligence (Sources Sought / RFI)
  evaluatePreRfp:                preRfp.evaluatePreRfp,
  isPreRfp:                      preRfp.isPreRfp,
  PRE_RFP_NOTICE_TYPES:          preRfp.PRE_RFP_NOTICE_TYPES,

  // Past-performance library + relevance scoring
  createPastPerformanceService:  pastPerformance.createPastPerformanceService,
  sanitizePastPerformanceProject: pastPerformance.sanitizeProject,
  pastPerformanceRelevance:       pastPerformance.relevanceScore
};

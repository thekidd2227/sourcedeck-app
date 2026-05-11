// services/stakeholders/index.js
//
// FAR-aware stakeholder graph service.
//
// Re-exports the model that currently lives in
// services/govcon/stakeholder-graph.js.
//
// Procurement-safe categories ONLY. The implementation strips any
// node whose label or instructions contains banned phrasing
// ("cold email/call/outreach", "DM the CO/COR"). The contracting
// office is always posture=restricted in an active solicitation
// communication window.
//
// SourceDeck supports capture research; it does NOT bypass
// procurement-rule communication windows.

'use strict';

const impl = require('../govcon/stakeholder-graph');

module.exports = {
  buildStakeholderGraph:  impl.buildStakeholderGraph,
  isInRestrictedWindow:   impl.isInRestrictedWindow,
  POSTURE_LABELS:         impl.POSTURE_LABELS,
  POSTURE_BY_CATEGORY:    impl.POSTURE_BY_CATEGORY,
  SAFETY_NOTE:            impl.SAFETY_NOTE
};

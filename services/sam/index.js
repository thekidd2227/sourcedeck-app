// services/sam/index.js
//
// SAM.gov opportunity-search service surface.
//
// Re-exports the implementation that currently lives in
// services/govcon/sam-search.js. New callers (the /api adapter, a
// future web server) should import from services/sam directly so
// the implementation can later move under this directory without
// any further import-path churn.
//
// Platform-neutral: no DOM access, no Electron imports, no globals.

'use strict';

const impl = require('../govcon/sam-search');

module.exports = {
  createSamSearchService:  impl.createSamSearchService,
  normalizeSamRecord:      impl.normalizeSamRecord,
  dedupe:                  impl.dedupe,
  applyTargeting:          impl.applyTargeting,
  buildSamHumanUrl:        impl.buildSamHumanUrl,
  NOTICE_TYPE_TO_GROUP:    impl.NOTICE_TYPE_TO_GROUP
};

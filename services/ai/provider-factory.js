// services/ai/provider-factory.js
// Selects the AI provider implementation based on config. Default is
// always local — IBM watsonx is opt-in via AI_PROVIDER=watsonx and
// requires complete config. If config is missing in production we
// still return the watsonx adapter (in disabled state) so callers can
// surface the missing-vars list to the user; we do NOT silently fall
// through to local in that case.

'use strict';
const { createLocalProvider }   = require('./providers/local');
const { createWatsonxProvider } = require('./providers/watsonx');
const { loadConfig, watsonxStatus } = require('../config');

function createAiProvider(cfg, deps) {
  cfg = cfg || loadConfig();
  if (cfg.aiProvider === 'watsonx') {
    return createWatsonxProvider(cfg.watsonx, deps);
  }
  return createLocalProvider();
}

/** Status snapshot the renderer can safely receive (no secrets). */
function getAiProviderStatus(cfg) {
  cfg = cfg || loadConfig();
  if (cfg.aiProvider === 'watsonx') {
    return watsonxStatus(cfg);
  }
  return {
    provider:   'local',
    target:     'local',
    configured: true,
    missing:    [],
    modelId:    'local-deterministic-v1'
  };
}

module.exports = { createAiProvider, getAiProviderStatus };

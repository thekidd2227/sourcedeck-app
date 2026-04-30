// services/config.js
// Environment / runtime config for SourceDeck IBM-readiness layer.
// Pure, dependency-free. Reads process.env. Returns presence flags +
// missing-var lists only — never echoes secret values.

'use strict';

function loadConfig(env) {
  env = env || process.env;
  const aiProvider      = (env.AI_PROVIDER      || 'local').toLowerCase();
  const storageProvider = (env.STORAGE_PROVIDER || 'local').toLowerCase();

  const watsonx = {
    apiKey:    env.WATSONX_API_KEY    || null,
    projectId: env.WATSONX_PROJECT_ID || null,
    spaceId:   env.WATSONX_SPACE_ID   || null,
    url:       env.WATSONX_URL        || 'https://us-south.ml.cloud.ibm.com',
    modelId:   env.WATSONX_MODEL_ID   || 'ibm/granite-13b-chat-v2'
  };

  const ibmCos = {
    endpoint:           env.IBM_COS_ENDPOINT           || null,
    bucket:             env.IBM_COS_BUCKET             || null,
    region:             env.IBM_COS_REGION             || 'us-south',
    accessKeyId:        env.IBM_COS_ACCESS_KEY_ID      || null,
    secretAccessKey:    env.IBM_COS_SECRET_ACCESS_KEY  || null,
    serviceInstanceId:  env.IBM_COS_SERVICE_INSTANCE_ID|| null
  };

  return {
    appEnv:          env.APP_ENV || env.NODE_ENV || 'development',
    aiProvider, storageProvider,
    watsonx, ibmCos
  };
}

/** Returns { configured: bool, missing: string[] } — never includes secret values. */
function watsonxStatus(cfg) {
  cfg = cfg || loadConfig();
  const missing = [];
  if (!cfg.watsonx.apiKey)                              missing.push('WATSONX_API_KEY');
  if (!cfg.watsonx.projectId && !cfg.watsonx.spaceId)   missing.push('WATSONX_PROJECT_ID (or WATSONX_SPACE_ID)');
  if (!cfg.watsonx.url)                                 missing.push('WATSONX_URL');
  if (!cfg.watsonx.modelId)                             missing.push('WATSONX_MODEL_ID');
  return {
    provider:   cfg.aiProvider,
    target:     'watsonx',
    configured: missing.length === 0,
    missing,
    url:        cfg.watsonx.url,
    modelId:    cfg.watsonx.modelId,
    projectId:  cfg.watsonx.projectId ? 'set' : null,
    spaceId:    cfg.watsonx.spaceId   ? 'set' : null
  };
}

/** Returns { configured: bool, missing: string[] } — never includes secret values. */
function ibmCosStatus(cfg) {
  cfg = cfg || loadConfig();
  const missing = [];
  if (!cfg.ibmCos.endpoint)         missing.push('IBM_COS_ENDPOINT');
  if (!cfg.ibmCos.bucket)           missing.push('IBM_COS_BUCKET');
  if (!cfg.ibmCos.region)           missing.push('IBM_COS_REGION');
  if (!cfg.ibmCos.accessKeyId)      missing.push('IBM_COS_ACCESS_KEY_ID');
  if (!cfg.ibmCos.secretAccessKey)  missing.push('IBM_COS_SECRET_ACCESS_KEY');
  return {
    provider:   cfg.storageProvider,
    target:     'ibm-cos',
    configured: missing.length === 0,
    missing,
    endpoint:   cfg.ibmCos.endpoint,
    bucket:     cfg.ibmCos.bucket,
    region:     cfg.ibmCos.region
  };
}

module.exports = { loadConfig, watsonxStatus, ibmCosStatus };

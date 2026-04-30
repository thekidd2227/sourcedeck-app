// services/storage/storage-factory.js
'use strict';

const { createLocalStore }      = require('./providers/local-store');
const { createIbmCosProvider }  = require('./providers/ibm-cos');
const { loadConfig, ibmCosStatus } = require('../config');

function createStorage(cfg, store, deps) {
  cfg = cfg || loadConfig();
  if (cfg.storageProvider === 'ibm-cos') {
    return createIbmCosProvider(cfg.ibmCos, deps);
  }
  return createLocalStore(store);
}

function getStorageProviderStatus(cfg) {
  cfg = cfg || loadConfig();
  if (cfg.storageProvider === 'ibm-cos') return ibmCosStatus(cfg);
  return {
    provider:   'local',
    target:     'local',
    configured: true,
    missing:    [],
    bucket:     'electron-store'
  };
}

module.exports = { createStorage, getStorageProviderStatus };
